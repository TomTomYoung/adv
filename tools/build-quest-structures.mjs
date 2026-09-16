import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const read=async f=>JSON.parse(await fs.readFile(path.join(root,f),'utf8'));
const write=async(f,v)=>fs.writeFile(path.join(root,f),JSON.stringify(v,null,2)+'\n');
const ref=ref=>({ref}),eq=(left,right)=>({op:'eq',left,right}),and=(...args)=>({op:'and',args});
const say=text=>({op:'say',text});
const game=await read('data/game.json');
const rows=(await fs.readFile(path.join(root,'authoring/quests.txt'),'utf8')).split('\n').filter(l=>l&&!l.startsWith('#')).map(l=>l.split('|'));
const specs=[];
for(let n=1;n<=5;n++)specs.push(...(await import(`../authoring/structures-${n}.mjs`)).default);
specs.push(...(await import('../authoring/structures-additional.mjs')).default);
if(new Set(specs.map(s=>s.number)).size!==specs.length||specs.filter(s=>s.number<=100).length!==100)throw Error('Each original quest needs its own authored progression');
const quests=[];
for(const file of game.files.quests){
 const q=await read(file),spec=specs.find(s=>s.number===q.number);
 if(!spec){quests.push(q);continue;}
 const id=q.id,row=rows[q.number-1],replace=v=>JSON.parse(JSON.stringify(v).replaceAll('__Q__',id));
 const state=k=>`flags.flow.${id}.${k}`,sid=n=>`${id}.flow.${n}`;
 const nodes=new Map(spec.nodes.map(n=>[n.id,n]));
 if(nodes.size!==spec.nodes.length||!nodes.has('entry'))throw Error(`${id}: missing/duplicate entry`);
 const words=row?{a:row[4],b:row[5],truth:row[3],brief:row[2]}:{};
 const prose=t=>t.replace(/\$(a|b|truth|brief)\b/g,(_,k)=>words[k]??'');
 const render=t=>Array.isArray(t)?t.flatMap(render):typeof t==='string'?(t?[say(prose(t))]:[]):[{op:'if',condition:replace(t.when),then:render(t.yes),else:render(t.no)}];
 Object.assign(q.outcomes,Object.fromEntries(Object.entries(spec.endings??{}).map(([k,o])=>[k,{gold:45+q.region*12,xp:45+q.region*6,...o}])));
 if(q.number<=100)for(const [key,out] of Object.entries(q.outcomes)){
  const action=spec.nodes.flatMap(n=>n.options).find(o=>o.to===`@${key}`);
  if(action)out.label=prose(action.text);
 }
 const go=to=>{const end=to.startsWith('@');if(!(end?q.outcomes[to.slice(1)]:nodes.has(to)))throw Error(`${id}: missing destination ${to}`);return [{op:'jump',script:sid(end?`end.${to.slice(1)}`:to)}];};
 const keys=new Set(['node']);
 for(const n of spec.nodes){
  const options=n.options.map(o=>{
   for(const k of Object.keys(o.set??{}))keys.add(k);
   const terms=[];
   if(o.when!==undefined)terms.push(replace(o.when));
   for(const k of o.need??[])terms.push(eq(ref(state(k)),true));
   for(const [k,v] of Object.entries(o.cost??{}))terms.push(k==='gold'?{op:'gte',left:ref('gold'),right:v}:{op:'has_item',item:k,count:v});
   const effects=[...Object.entries(o.cost??{}).map(([k,v])=>k==='gold'?{op:'gold.change',amount:-v}:{op:'item.take',item:k,count:v}),...Object.entries(o.set??{}).map(([k,v])=>({op:'set',target:state(k),value:replace(v)})),...(o.textAfter?render(o.textAfter):[]),...(o.commands??[]).map(replace),...go(o.to)];
   const encounter=o.combat===true?`${q.number%10===0?'boss':'guard'}_${q.region}`:o.combat;
   const commands=encounter?[{op:'battle.start',encounter,on_win:effects,on_escape:[...render(o.escapeText??'退路へ戻った。勝利を前提とした作業や支払いはまだ行っていない。'),...(o.escape?go(o.escape):[])],on_lose:[...render(o.lossText??'救助班に運び出された。現場へ戻れば、直前の作業から再開できる。'),...(o.loss?go(o.loss):[])]}]:effects;
   const prerequisite=(o.need??[]).map(k=>spec.nodes.flatMap(n=>n.options).find(o=>o.set?.[k]===true)?.text).filter(Boolean);
   const requirement=[o.requirement,...prerequisite.map(t=>`先に「${prose(t)}」`),...Object.entries(o.cost??{}).map(([k,v])=>`${{gold:'G',rope:'縄',ration:'野営糧食',potion:'傷薬',torch:'松明'}[k]??k} ${v}消費`),...(encounter?['戦闘（支払い・作業確定は勝利時）']:[])].filter(Boolean).join('・');
   return {id:o.id,text:prose(o.text),...(terms.length?{condition:and(...terms)}:{}),...(o.visible!==undefined?{visibleWhen:replace(o.visible)}:{}),requirement,commands};
  });
  options.push({id:'pause',text:'ここで中断し、同じ場面から再開する',commands:[]});
  q.scripts[sid(n.id)]={commands:[{op:'set',target:state('node'),value:n.id},...render(n.text),{op:'choice',options}]};
 }
 for(const [key,out] of Object.entries(q.outcomes)){
  q.scripts[sid(`end.${key}`)]={commands:[{op:'if',condition:eq(ref(`quests.${id}.stage`),'active'),then:[...render(out.text),...(['informed','contract','compromise'].includes(key)?[{op:'add',target:`vars.${key}`,value:1}]:[]),{op:'quest.complete',quest:id,outcome:key},...(q.number===100?[{op:'ending.set',title:{informed:'道を次へ渡す者',contract:'迷宮の鍵を持つ者',compromise:'灯を守って帰る者'}[key]??out.label,text:out.text}]:[])],else:[]}]};
 }
 // Legacy scripts are immutable: saved VM frame indices still address the old arrays.
 // Quest event sources select the entry script. Older active quests keep their route.
 q.scripts[sid('visit')]={commands:[{op:'if',condition:eq(ref(`quests.${id}.stage`),'completed'),then:[{op:'switch',value:ref(`quests.${id}.outcome`),cases:Object.entries(q.outcomes).map(([k,o])=>({equals:k,commands:[say(o.text),...(spec.aftermath?render(spec.aftermath):[])]})),default:[]}],else:[{op:'if',condition:eq(ref(`flags.legacyQuestRoutes.${id}`),true),then:[{op:'jump',script:`${id}.visit`}],else:[{op:'switch',value:ref(state('node')),cases:spec.nodes.map(n=>({equals:n.id,commands:go(n.id)})),default:go('entry')}]}]}]};
 q.type='authored_progression';q.unlockHint=q.unlockHint.replace('手掛かりを二つ集めて判断します。','');
 q.model.progression=spec.progression;q.model.flowVersion=2;q.model.entryScript=sid('visit');
 delete q.model.dramaticQuestion;
 q.model.conflict={request:q.brief,progression:spec.progression};
 for(const agent of q.model.agents)if(agent.id==='client')agent.goal=q.brief;
 if(q.model.world.history)q.model.world.history=q.model.world.history.filter(e=>e.id!=='e2');
 q.model.graph=replace(spec.nodes);q.model.narrative.units=spec.nodes.map(n=>({id:n.id,script:sid(n.id)}));q.model.beats=q.model.narrative.units;
 q.model.reveal={...q.model.reveal,gate:null,window:'個別の場面・行為・当事者の応答に沿って開示する',retroactiveTargets:spec.nodes.filter(n=>JSON.stringify(n.text).includes('$')).map(n=>n.id),earlyDiscovery:'原稿の各選択で定義。二地点の回収は要求しない',missedProof:'その場で得た情報と選んだ行為が、次の場面を決める'};
 q.model.stateRegistry=[...keys].map(k=>({path:state(k),meaning:k==='node'?'現在の場面。中断・逃走・敗北後の再開位置':`各場面に明記した ${k} の行為・合意の記録`,writer:spec.nodes.filter(n=>n.options.some(o=>Object.hasOwn(o.set??{},k))).map(n=>n.id),scope:'quest',lifetime:'保存して後続場面で参照'}));
 q.model.choiceContract={progression:spec.progression,resources:'明記した資材・金のみ消費。戦闘付き作業は勝利まで消費しない',residue:'完了後の結末・各場面で得た合意と行為を保持'};
 await write(file,q);quests.push(q);
}
game.version='1.3.2';
for(const migration of Object.values(game.migrations))migration.legacyQuestRouting=true;
game.migrations['1.3.1']={actors:Object.keys(await read('data/actors.json')),quests:quests.map(q=>q.id),scenarioRevision:true,preserveRecords:true,legacyQuestRouting:true};
await write('data/game.json',game);
console.log(`Individual progressions: ${specs.length} revised quests; ${quests.reduce((n,q)=>n+(q.model.graph?.length??0),0)} playable scenes`);
