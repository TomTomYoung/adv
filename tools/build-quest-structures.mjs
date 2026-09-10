import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const read=async f=>JSON.parse(await fs.readFile(path.join(root,f),'utf8'));
const write=async(f,v)=>fs.writeFile(path.join(root,f),JSON.stringify(v,null,2)+'\n');
const ref=ref=>({ref}),eq=(left,right)=>({op:'eq',left,right}),and=(...args)=>({op:'and',args});
const say=text=>({op:'say',text});
const game=await read('data/game.json');
const maps=Object.fromEntries(await Promise.all(game.files.maps.map(async f=>{const m=await read(f);return [m.id,m];})));
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
 // Only map dispatch is switched. Already active older quests finish on their old route.
 q.scripts[sid('visit')]={commands:[{op:'if',condition:eq(ref(`quests.${id}.stage`),'completed'),then:[{op:'switch',value:ref(`quests.${id}.outcome`),cases:Object.entries(q.outcomes).map(([k,o])=>({equals:k,commands:[say(o.text),...(spec.aftermath?render(spec.aftermath):[])]})),default:[]}],else:[{op:'if',condition:eq(ref(`flags.legacyQuestRoutes.${id}`),true),then:[{op:'jump',script:`${id}.visit`}],else:[{op:'switch',value:ref(state('node')),cases:spec.nodes.map(n=>({equals:n.id,commands:go(n.id)})),default:go('entry')}]}]}]};
 const hub=q.locations.find(l=>l.role==='decision');maps[hub.map].objects.find(o=>o.id===hub.object).script=sid('visit');
 for(const loc of q.locations.filter(l=>l.role!=='decision')){
  const obj=maps[loc.map].objects.find(o=>o.id===loc.object);
  obj.condition=and(eq(ref(`quests.${id}.stage`),'active'),eq(ref(`flags.legacyQuestRoutes.${id}`),true));
 }
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
for(const m of Object.values(maps))await write(`data/maps/${m.id}.json`,m);
game.version='1.3.2';
for(const migration of Object.values(game.migrations))migration.legacyQuestRouting=true;
game.migrations['1.3.1']={actors:Object.keys(await read('data/actors.json')),quests:quests.map(q=>q.id),scenarioRevision:true,preserveRecords:true,legacyQuestRouting:true};
await write('data/game.json',game);
// Generate the catalog from final data, including new outcomes and current labels.
const catalog=['# シナリオ一覧','',`全${quests.length}本・${quests.reduce((n,q)=>n+Object.keys(q.outcomes).length,0)}結末。1.3.2。更新日: 2026-09-10。`, '',
 '既存100本の進行を個別に再実装し、追加篇10本も改稿しました。各依頼の場面・行為・接続先を下に記載します。作者向けのため真相と結末を含みます。','',
 '設計基準: [ゲームシナリオモデル v1.0](https://app.notion.com/p/v1-0-3d7c3c1966b381818a0fcb62493abcc3)。詳細は [SCENARIO_DESIGN](SCENARIO_DESIGN.md) を参照してください。','',
 '町で受注し、追跡欄の地点を調べて開始します。中断後は同じ場所から続けられ、完了後は結果だけを再読できます。旧版で進行中の依頼は旧経路を完了できます。','',
 'q100は元のq001〜q099の完了で解放します。追加100本の完了数では代用できません。場面内の移動は本文と選択で表し、NPCは自動で戦闘隊へ加入しません。',''];
for(const q of quests){
 const graph=q.model.graph??[];
 catalog.push(`## ${q.id} ${q.title}`,'',`依頼人: ${q.client}。地域: ${q.region}。${q.unlockHint}`,'',`概要: ${q.brief}`,'',
  `実装: [シナリオJSON](../data/quests/${q.id}.json)。場面 ${graph.length}、結末 ${Object.keys(q.outcomes).length}。${q.model.sourceDraft?`原稿: [Notion](${q.model.sourceDraft})。`:''}`,'',
  `真相と人物: ${q.model.world.truth}`,'');
 for(const [k,o] of Object.entries(q.outcomes))catalog.push(`${k} — ${o.label}（${o.gold}G / ${o.xp}EXP）: ${o.text}`,'');
 catalog.push(`進行: ${q.model.progression??'各場面の行為と応答に沿って進む。以下が実際の接続先です。'}`,'');
 for(const n of graph)catalog.push(`- ${n.id}: ${n.options.map(o=>`${o.text} → ${o.to}${o.when||o.need?.length?'（条件あり）':''}${o.combat?'［戦闘］':''}`).join(' / ')}`);
 catalog.push('');
}
await fs.writeFile(path.join(root,'doc/QUEST_CATALOG.md'),catalog.join('\n'));
console.log(`Individual progressions: ${specs.length} revised quests; ${quests.reduce((n,q)=>n+(q.model.graph?.length??0),0)} playable scenes`);
