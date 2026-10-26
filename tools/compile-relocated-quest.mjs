import {story,O,set,see,ref,eq,and,or} from '../authoring/story-kit.mjs';
import {connectWorld} from '../authoring/world-story-kit.mjs';
const done=id=>eq(ref(`quests.${id}.stage`),'completed');
const prose=text=>typeof text==='string'?[{op:'narrate',text}]:Array.isArray(text)?text.flatMap(prose):[{op:'if',condition:text.when,then:prose(text.yes),else:prose(text.no)}];
export function compileRelocatedQuest(first,x,{prefix,eventPrefix,settlement,settlementName,board,boardName,source,stage,scope,preserveAcceptedRoute=false,battle='boss_4'}){
 const q=structuredClone(first),id=q.id,sid=node=>`${id}.${prefix}.${node}`;
 // Keep payment and combat local; the next explicit action begins the trip.
 for(const n of [...x.nodes])for(const a of n.options){const target=x.nodes.find(t=>t.id===a.to);if(target&&target.place!==n.place&&(a.cost||a.combat)){const ready=`${n.id}_${a.id}_ready`,travel={...a,id:'continue',text:'準備した相手・品物と目的地へ向かう'};delete travel.cost;delete travel.combat;delete travel.when;delete travel.visible;x.nodes.push({id:ready,place:n.place,text:a.combat?'戦いに勝利し、先へ進む道が開いた。次の場所まで歩いて確かめる。':'必要な道具を使って準備を整えた。ここから目的地まで運ぶ。',options:[travel]});a.to=ready;a.effects=a.preparation??[];delete a.depart;delete a.companions;}}
 const s=story(q.number,Object.fromEntries(Object.entries(x.places).map(([key,p])=>[key,p.name])),[]);
 s.enum('resolution','pending',['pending',...Object.keys(q.outcomes)],'現地で実行した解決方法');s.bool('finished',false,'現地の結果を確認して依頼を終えた');
 for(const [key,value] of Object.entries(x.flags))s.bool(key,value,key);
 for(const [key,r] of Object.entries(x.registry??{}))s.story.registry[key]=r;
 for(const [key,e] of Object.entries(x.entities))s.entity(key,e.holder,null,{kind:e.kind});
 s.fact('truth',q.model.reveal.newInformation);
 for(const n of x.nodes)s.node(n.id,n.place,[],n.text,n.options.map(a=>O(a.id,a.text,a.to,[...(a.effects??[]),...(a.to.startsWith('@')?[set('resolution',a.to.slice(1)),set('finished')]:[])],{when:a.when??true,...(a.cost?{cost:a.cost}:{}),once:false})));
 const route=connectWorld(s,Object.fromEntries(Object.entries(x.places).map(([key,p])=>[key,p.world])),1);
 for(const n of x.nodes)for(const a of n.options){
  const target=x.nodes.find(t=>t.id===a.to),action=s.story.actions[`${n.id}_${a.id}`];
  if(typeof target?.text==='string'&&target.text.includes(q.model.reveal.newInformation))action.effects.push(see('truth',target.place));
  if(target&&target.place!==n.place)route(`${n.id}_${a.id}`,target.place,{companions:a.companions??[],depart:a.depart??[],arrive:action.effects});
  else if(a.depart?.length)throw Error(`${id}/${n.id}/${a.id}: departure effects require a journey`);
 }
 for(const [key,o] of Object.entries(q.outcomes)){
  const places=x.nodes.filter(n=>n.options.some(a=>a.to==='@'+key)).map(n=>n.place);
  s.end(key,o.label,o.text,and(s.is('resolution',key),s.is('finished'),or(...[...new Set(places)].map(p=>s.is('partyAt',p)))));
 }
 s.done();
 // Keep old scripts intact when accepted saves retain their original routes.
 q.scripts=preserveAcceptedRoute?q.scripts:Object.fromEntries(Object.entries(q.scripts).filter(([key])=>!key.startsWith(id+'.')));
 for(const n of x.nodes){
  const options=n.options.map(a=>{
   const action=`${n.id}_${a.id}`,definition=s.story.actions[action];
   const commands=definition.journey?[{op:'story.journey',quest:id,action}]:[{op:'story.action',quest:id,action},...(a.textAfter?prose(a.textAfter):[]),{op:'jump',script:sid(a.to.startsWith('@')?'end.'+a.to.slice(1):a.to)}];
   if(a.combat&&definition.journey)throw Error('Combat and departure must be separate choices');
   const resultCommands=result=>[{op:'set',target:`flags.relocatedBattleResult.${id}`,value:result}];
   const failure=result=>[...resultCommands(result),...prose(result==='lose'?`救助班に${settlementName}へ運び出された。現場へ戻って同行者と合流し、撤退の結果を報告する。`:'戦いから撤退した。勝利の報告にはせず、同行者と次の行動を相談する。'),...(result==='escape'?[{op:'jump',script:sid(n.id)}]:[])];
   return {id:a.id,text:a.text,storyAction:{quest:id,action},...(a.when?{condition:a.when}:{}),...(a.visible?{visibleWhen:a.visible}:{}),requirement:a.combat?(a.recordBattleResult?'戦闘。勝利・撤退・敗北に応じて続きが変わる。':'戦闘。作業・報酬は勝利後に確定する。'):a.cost?Object.entries(a.cost).map(([k,v])=>`${k} ${v}消費`).join(' / '):'',commands:a.combat?[{op:'battle.start',encounter:typeof a.combat==='string'?a.combat:battle,on_win:a.recordBattleResult?[...resultCommands('win'),...commands]:commands,on_escape:a.recordBattleResult?failure('escape'):[...prose('戦いを切り上げた。作業は確定していない。現場で再開できる。'),...(preserveAcceptedRoute?[{op:'jump',script:sid(n.id)}]:[])],on_lose:a.recordBattleResult?failure('lose'):prose(`救助班に${settlementName}へ運び出された。現場へ戻れば直前の作業から再開できる。`)}]:commands};
  });
  q.scripts[sid(n.id)]={storyQuest:id,commands:[{op:'story.scene',quest:id,scene:n.id},...prose(n.text),{op:'choice',options}]};
 }
 for(const key of Object.keys(q.outcomes))q.scripts[sid('end.'+key)]={commands:[...prose(q.outcomes[key].text),{op:'add',target:'vars.'+key,value:1},{op:'quest.complete',quest:id,outcome:key}]};
 q.scripts[sid('visit')]={commands:[{op:'if',condition:done(id),then:[{op:'switch',value:ref(`quests.${id}.outcome`),cases:Object.entries(q.outcomes).map(([key,o])=>({equals:key,commands:prose(o.text)})),default:[]}],else:[{op:'story.init',quest:id},{op:'switch',value:ref(`stories.${id}.scene`),cases:x.nodes.map(n=>({equals:n.id,commands:[{op:'jump',script:sid(n.id)}]})),default:[{op:'jump',script:sid('entry')}]}]}]};
 const investigations=first.events.filter(e=>e.trigger==='action');
 q.events=[...investigations,...Object.entries(x.places).filter(([,p])=>p.world.kind==='dungeon').map(([key,p])=>({id:`${id}_${eventPrefix}_${key}`,title:p.name,trigger:'interact',kind:'decision',role:key==='entry'?'decision':key,interactionRange:'here',safe:true,visibleWhen:or(eq(ref(`quests.${id}.stage`),'active'),done(id)),script:sid('visit'),points:[{dungeon:p.world.dungeon,map:p.world.map,x:p.world.x,y:p.world.y}]}))];
 if(preserveAcceptedRoute){
  const legacy=eq(ref(`flags.legacyStoryRoutes.${id}`),true);
  for(const e of q.events)e.visibleWhen=and(e.visibleWhen,{op:'not',arg:legacy});
  q.events=[...first.events.map(e=>e.trigger==='action'?structuredClone(e):({...structuredClone(e),visibleWhen:and(e.visibleWhen,legacy)})),...q.events.filter(e=>e.trigger!=='action')];
  q.scripts[sid('visit')].commands=[{op:'if',condition:legacy,then:[{op:'jump',script:first.model.entryScript??id+'.visit'}],else:q.scripts[sid('visit')].commands}];
 }
 q.locations=preserveAcceptedRoute?structuredClone(first.locations):[];q.story=s.story;q.settlement=settlement;q.receptionLocations=[board];q.unlockHint=first.unlockHint+` ${boardName}で受注し、現場まで歩いて進める。`;
 q.model={...q.model,standard:{id:'game-scenario-model',version:'1.2b',source:'doc/scenarios/SCENARIO_MODEL_V12B.md',adapter:'adv-story-state/1',scope:'既存本文の現場・保持者・到着条件の接続。全文改稿は含めない。'},entryScript:sid('visit'),source,edition:{id:'e2',revision:1,inherits:'e1'},narrative:{...q.model.narrative,units:x.nodes.map(n=>({id:n.id,script:sid(n.id)}))},graph:x.nodes.map(n=>({id:n.id,place:n.place,text:n.text,options:n.options.map(a=>({id:a.id,text:a.text,to:a.to,action:`${n.id}_${a.id}`}))})),relocation:{stage,settlement,saveRevision:2,scope}};
 if(preserveAcceptedRoute)q.model.preserveAcceptedRoute=true;
 return q;
}
