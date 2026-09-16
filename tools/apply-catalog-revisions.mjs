import fs from 'node:fs/promises';
import path from 'node:path';
import drafts from '../authoring/catalog-q011-q020.mjs';

// Compile each authored graph without changing any shipped .flow VM arrays.
export async function applyCatalogRevisions(root){
 const read=async f=>JSON.parse(await fs.readFile(path.join(root,f),'utf8'));
 const write=async(f,v)=>fs.writeFile(path.join(root,f),JSON.stringify(v,null,2)+'\n');
 const ref=ref=>({ref}),eq=(left,right)=>({op:'eq',left,right}),and=(...args)=>({op:'and',args}),or=(...args)=>({op:'or',args}),say=text=>({op:'say',text});
 for(const draft of drafts){
  const id=draft.id,q=await read(`data/quests/${id}.json`),s=JSON.parse(JSON.stringify(draft).replaceAll('__Q__',id));
  const state=k=>`flags.flow.${id}.${k}`,sid=n=>`${id}.catalog1.${n}`,nodes=new Map(s.nodes.map(n=>[n.id,n]));
  const current=eq(ref(state('catalogRevision')),1),legacy=and({op:'not',arg:current},or({op:'exists',value:ref(state('node'))},eq(ref(`flags.legacyQuestRoutes.${id}`),true),eq(ref(`quests.${id}.stage`),'completed')));
  if(nodes.size!==s.nodes.length||!nodes.has('entry'))throw Error(`${id}: duplicate or missing scene`);
  q.legacyOutcomes??=structuredClone(q.outcomes);
  q.brief=s.brief;q.outcomes=s.outcomes;
  const render=t=>Array.isArray(t)?t.flatMap(render):typeof t==='string'?[say(t)]:[{op:'if',condition:t.when,then:render(t.yes),else:render(t.no??'')}];
  const jump=to=>{const name=to.startsWith('@')?`end.${to.slice(1)}`:to;if(!(to.startsWith('@')?q.outcomes[to.slice(1)]:nodes.has(to)))throw Error(`${id}: unknown target ${to}`);return {op:'jump',script:sid(name)};};
  const initial={catalogRevision:1,...s.initial},keys=new Set(Object.keys(initial));
  for(const n of s.nodes){
   const ids=new Set();
   const options=n.options.map(o=>{
    if(ids.has(o.id)||!o.id)throw Error(`${id}/${n.id}: duplicate or missing choice`);ids.add(o.id);
    for(const k of Object.keys(o.set??{}))if(!keys.has(k))throw Error(`${id}/${n.id}: no initial value for ${k}`);
    const terms=[...(o.when!==undefined?[o.when]:[]),...(o.need??[]).map(k=>eq(ref(state(k)),true)),...Object.entries(o.cost??{}).map(([k,v])=>k==='gold'?{op:'gte',left:ref('gold'),right:v}:{op:'has_item',item:k,count:v})];
    const effects=[...Object.entries(o.cost??{}).map(([k,v])=>k==='gold'?{op:'gold.change',amount:-v}:{op:'item.take',item:k,count:v}),...Object.entries(o.set??{}).map(([k,v])=>({op:'set',target:state(k),value:v})),...(o.textAfter?render(o.textAfter):[]),jump(o.to)];
    const encounter=o.combat===true?`${q.number%10===0?'boss':'guard'}_${q.region}`:o.combat;
    const commands=encounter?[{op:'battle.start',encounter,on_win:effects,on_escape:[say('退路へ戻った。戦闘後に予定していた作業は、まだ成立していない。')],on_lose:[say('救助班に運び出された。現場へ戻ると直前の場面から再開できる。')]}]:effects;
    const requirement=[o.requirement,...Object.entries(o.cost??{}).map(([k,v])=>`${{gold:'G',rope:'縄'}[k]??k} ${v}消費`),...(encounter?['戦闘（作業と支払いは勝利時に確定）']:[])].filter(Boolean).join('・');
    return {id:o.id,text:o.text,...(terms.length?{condition:and(...terms)}:{}),requirement,commands};
   });
   options.push({id:'pause',text:'ここで中断し、同じ場面から再開する',commands:[]});
   q.scripts[sid(n.id)]={commands:[{op:'set',target:state('node'),value:n.id},...render(n.text),{op:'choice',options}]};
  }
  q.scripts[sid('start')]={commands:[...Object.entries(initial).map(([k,value])=>({op:'set',target:state(k),value})),jump('entry')]};
  for(const [key,out] of Object.entries(q.outcomes))q.scripts[sid(`end.${key}`)]={commands:[{op:'if',condition:eq(ref(`quests.${id}.stage`),'active'),then:[{op:'quest.complete',quest:id,outcome:key},...(['informed','contract','compromise'].includes(key)?[{op:'add',target:`vars.${key}`,value:1}]:[]),say(out.text)],else:[]}]};
  q.scripts[sid('visit')]={commands:[{op:'if',condition:legacy,then:[{op:'jump',script:`${id}.flow.visit`}],else:[{op:'if',condition:eq(ref(`quests.${id}.stage`),'completed'),then:[{op:'switch',value:ref(`quests.${id}.outcome`),cases:Object.entries(q.outcomes).map(([k,o])=>({equals:k,commands:[say(o.text)]})),default:[]}],else:[{op:'switch',value:ref(state('node')),cases:s.nodes.map(n=>({equals:n.id,commands:[jump(n.id)]})),default:[{op:'jump',script:sid('start')}]}]}]}]};
  q.model={...q.model,progression:s.progression,entryScript:sid('visit'),catalogRevision:1,progressionUpgrade:{current,legacyEntryScript:`${id}.flow.visit`},
   world:{...q.model.world,truth:s.past,history:[{id:'fixed_0',text:s.past}],authoringNotes:s.authoringNotes},agents:s.agents,
   conflict:{request:s.brief,progression:s.progression},audience:{...q.model.audience,initialHypothesis:s.brief},
   reveal:{...q.model.reveal,newInformation:s.past,gate:null,window:'各場面の観察と行為を経た時点でのみ開示する',retroactiveTargets:s.nodes.map(n=>n.id)},
   graph:s.nodes,narrative:{...q.model.narrative,units:s.nodes.map(n=>({id:n.id,script:sid(n.id)}))},beats:s.nodes.map(n=>({id:n.id,script:sid(n.id)})),
   stateRegistry:[{path:state('node'),initial:'entry',meaning:'現在の再開場面',writer:s.nodes.map(n=>n.id),scope:'quest',lifetime:'保存して後続場面で参照'},...Object.entries(initial).map(([k,v])=>({path:state(k),initial:v,meaning:k==='catalogRevision'?'カタログ反映後の進行を識別する版':`原稿に明記した ${k} の事実・行為・所在`,writer:s.nodes.filter(n=>n.options.some(o=>Object.hasOwn(o.set??{},k))).map(n=>n.id),scope:'quest',lifetime:'保存・中断・完了後まで保持'}))],
   choiceContract:{progression:s.progression,resources:'各選択に明記した縄・金のみ消費。戦闘付き作業は勝利時に確定する',residue:'調査・同意・搬送・精算・引継ぎを分けて保存し、結末条件を検査する'}};
  await write(`data/quests/${id}.json`,q);
 }
}
