import test from 'node:test';
import assert from 'node:assert/strict';
import {projectGame} from '../src/application/projection.js';
import {data,go,drain} from './machine-helpers.mjs';
import {previousQ079,q079Routes,q079LegacyScene,q079Engine,q079AcceptedEngine,loadQ079,chooseQ079,departQ079,arriveQ079,resolveQ079,returnQ079AfterLoss,restartLedgerArtFixtures} from '../tools/restart-ledger-art-fixtures.mjs';
const story=g=>g.state.stories.q079,values=g=>story(g).values;

test('q079 changes only two timing sentences, with no cast, state, route, reward or revision changes',()=>{
 const q=structuredClone(data.quests.q079);assert.equal(q.story.revision,1);assert.equal(q.model.edition.revision,1);assert.deepEqual(q.story,previousQ079.story);
 assert.deepEqual(q.outcomes,previousQ079.outcomes);assert.ok(Object.values(q.story.scenes).every(s=>s.cast.length===0));assert.ok(Object.values(q.story.entities).every(e=>e.kind!=='person'&&!e.character));
 for(const a of Object.values(q.story.actions))if(a.journey)assert.deepEqual(a.journey.companions,[]);
 for(const id of ['restarted','small']){const n=q.model.graph.find(n=>n.id===id),now=n.text,old=previousQ079.model.graph.find(n=>n.id===id).text;assert.notEqual(now,old);n.text=old;let count=0;
  const restore=x=>{if(!x||typeof x!=='object')return;for(const k of Object.keys(x))if(x[k]===now){x[k]=old;count++;}else restore(x[k]);};restore(q.scripts);assert.equal(count,1);
 }assert.deepEqual(q,previousQ079);
});

test('q079 all seven current and accepted paths match the complete acyclic choice graphs',()=>{
 function paths(graph){const out=[],nodes=new Map(graph.map(n=>[n.id,n]));const visit=(id,path,seen)=>{assert.ok(!seen.has(id));for(const o of nodes.get(id).options){const next=[...path,o.id];if(o.to.startsWith('@'))out.push({path:next,outcome:o.to.slice(1)});else visit(o.to,next,new Set([...seen,id]));}};visit('entry',[],new Set());return out.map(JSON.stringify).sort();}
 assert.equal(q079Routes.length,7);assert.deepEqual(paths(data.quests.q079.model.graph),q079Routes.map(({path,outcome})=>JSON.stringify({path,outcome})).sort());
 assert.deepEqual(paths(data.previousQuestRoutes.q079.model.graph),q079Routes.map(({accepted:path,outcome})=>JSON.stringify({path,outcome})).sort());
});

test('q079 five scenes, four journeys and nine actions resume through text, choice, combat and completion',()=>{
 const scenes=new Set(),journeys=new Set(),actions=new Set(),phases=new Set();
 const observe=g=>{const raw=g.save(),h=loadQ079(raw);assert.equal(g.save(),raw);const a=projectGame(g).dialog,b=projectGame(h).dialog;assert.equal(b?.text,a?.text);assert.deepEqual(b?.options,a?.options);
  phases.add(g.state.battle?'battle':g.state.journey?'journey':g.state.quests.q079.stage==='completed'?'completed':g.state.waiting?.type);
  if(story(g).scene)scenes.add(story(g).scene);if(b?.scene)assert.deepEqual(b.scene.cast,[]);
  if(g.state.journey){journeys.add(g.state.journey.action);assert.equal(story(g).scene,null);assert.equal(b?.scene,undefined);assert.equal(h.dispatch({type:'story.resume',quest:'q079'}),false);arriveQ079(h);}
 };
 for(const legacy of [false,true])for(const route of q079Routes){const g=q079Engine({legacy});observe(g);for(const id of route.path){actions.add(story(g).scene+'_'+id);assert.ok(g.dispatch({type:'choose',id}));observe(g);drain(g);observe(g);if(g.state.battle){resolveQ079(g,'win');observe(g);}if(g.state.journey){const a=g.data.quests.q079.story.actions[g.state.journey.action];go(g,g.data.quests.q079.story.worldPlaces[a.journey.to]);observe(g);drain(g);observe(g);}}assert.equal(g.state.quests.q079.outcome,route.outcome);}
 assert.equal(scenes.size,5);assert.equal(journeys.size,4);assert.equal(actions.size,9);assert.deepEqual([...actions].sort(),Object.keys(data.quests.q079.story.actions).sort());for(const phase of ['text','choice','journey','battle','completed'])assert.ok(phases.has(phase),phase);
});

test('q079 observing the hundredth test and checking capacity leave the board in place until shutdown departure',()=>{
 for(const legacy of [false,true])for(const first of ['test','storage']){
  let g=q079Engine({legacy});chooseQ079(g,first);assert.equal(values(g).hundredthObserved,first==='test');assert.equal(values(g).recordBoardAt,'entry');assert.equal(values(g).shutdown,false);assert.equal(values(g).backupVerified,false);
  departQ079(g,'shutdown');assert.equal(values(g).shutdown,true);assert.equal(values(g).recordBoardAt,'party');assert.equal(values(g).backupAt,'archive_place');assert.equal(values(g).backupVerified,false);assert.equal(values(g).cleared,false);
  g=loadQ079(g.save());arriveQ079(g);assert.equal(values(g).backupVerified,true);assert.equal(values(g).recordBoardAt,'party');assert.equal(values(g).shutdown,true);assert.equal(values(g).saved,false);assert.equal(values(g).cleared,false);
 }
});

test('q079 erasure occurs after verified backup and restart commits only when the board is returned at finish',()=>{
 for(const legacy of [false,true])for(const first of ['test','storage']){
  let g=q079Engine({legacy});chooseQ079(g,first);chooseQ079(g,'shutdown');assert.equal(values(g).backupVerified,true);
  departQ079(g,'clear');assert.equal(values(g).cleared,true);assert.equal(values(g).recordBoardAt,'party');assert.equal(values(g).shutdown,true);assert.equal(values(g).saved,false);
  g=loadQ079(g.save());arriveQ079(g);assert.equal(story(g).scene,'restarted');assert.equal(values(g).recordBoardAt,'party');assert.equal(values(g).shutdown,true);assert.equal(values(g).saved,false);assert.equal(values(g).finished,false);
  chooseQ079(g,'finish');assert.equal(values(g).recordBoardAt,'entry');assert.equal(values(g).backupAt,'archive_place');assert.equal(values(g).saved,true);assert.equal(values(g).shutdown,false);assert.equal(values(g).smallRunning,false);assert.equal(g.state.quests.q079.outcome,'informed');
 }
});

test('q079 direct fallback preserves the untouched board and cannot invent backup verification or replacement',()=>{
 for(const legacy of [false,true])for(const first of ['test','storage']){
  let g=q079Engine({legacy});chooseQ079(g,first);departQ079(g,'small');assert.equal(values(g).shutdown,true);assert.equal(values(g).recordBoardAt,'entry');assert.equal(values(g).smallRunning,false);
  g=loadQ079(g.save());arriveQ079(g);assert.equal(values(g).smallRunning,false);assert.equal(values(g).finished,false);assert.equal(values(g).backupVerified,false);assert.equal(values(g).cleared,false);
  chooseQ079(g,'finish');assert.equal(values(g).smallRunning,true);assert.equal(values(g).shutdown,true);assert.equal(values(g).recordBoardAt,'entry');assert.equal(values(g).saved,false);assert.equal(values(g).backupVerified,false);
 }
});

test('q079 archived fallback deposits the original board at departure but does not erase it or complete replacement',()=>{
 for(const legacy of [false,true])for(const first of ['test','storage']){
  let g=q079Engine({legacy});chooseQ079(g,first);chooseQ079(g,'shutdown');departQ079(g,'replace');assert.equal(values(g).recordBoardAt,'archive_place');assert.equal(values(g).backupVerified,true);assert.equal(values(g).cleared,false);assert.equal(values(g).smallRunning,false);
  g=loadQ079(g.save());arriveQ079(g);assert.equal(values(g).recordBoardAt,'archive_place');assert.equal(values(g).smallRunning,false);assert.equal(values(g).finished,false);chooseQ079(g,'finish');
  assert.equal(values(g).shutdown,true);assert.equal(values(g).smallRunning,true);assert.equal(values(g).cleared,false);assert.equal(values(g).saved,false);assert.equal(values(g).backupAt,'archive_place');
 }
});

test('q079 bypass remains the existing non-escapable battle; defeat can retry or choose verified restart',()=>{
 for(const legacy of [false,true])for(const retry of [false,true]){
  const old=q079Engine({legacy});chooseQ079(old,'bypass',{combat:'pending'});const g=loadQ079(old.save());assert.equal(g.state.battle.encounter,'boss_8');assert.equal(g.data.encounters.boss_8.escape,false);
  const s=structuredClone(story(g));assert.equal(g.dispatch({type:'battle',action:'escape'}),false);assert.deepEqual(story(g),s);assert.equal(values(g).bypassed,false);assert.equal(values(g).finished,false);loadQ079(g.save());
  resolveQ079(g,'lose');assert.equal(g.state.mode,'town');assert.equal(g.state.quests.q079.stage,'active');assert.equal(values(g).resolution,'pending');assert.equal(values(g).recordBoardAt,'entry');loadQ079(g.save());returnQ079AfterLoss(g);
  for(const id of retry?['bypass']:q079Routes[0].path)chooseQ079(g,id);assert.equal(g.state.quests.q079.outcome,retry?'contract':'informed');assert.equal(values(g).bypassed,retry);assert.equal(values(g).saved,!retry);
 }
});

test('q079 every journey preserves board, backup and shutdown flags through retreat and defeat',()=>{
 const seen=new Set();for(const legacy of [false,true])for(const route of q079Routes.filter(r=>r.outcome!=='contract')){
  const g=q079Engine({legacy});for(const id of route.path){assert.ok(g.dispatch({type:'choose',id}));drain(g);if(g.state.journey){const key=legacy+'/'+g.state.journey.action;if(!seen.has(key)){seen.add(key);const raw=g.save();for(const interruption of ['mark','defeat']){
   const h=loadQ079(raw);if(h.state.mode==='town')go(h,{kind:'dungeon',dungeon:'region_8',map:'region_8_f1',x:1,y:1});assert.ok(h.state.journey);const s=structuredClone(story(h)),j=structuredClone(h.state.journey);
   if(interruption==='mark')assert.ok(h.dispatch({type:'retreat'}));else h.defeat();drain(h);assert.equal(h.state.mode,'town');assert.deepEqual(story(h),s);assert.deepEqual(h.state.journey,j);
   const resumed=loadQ079(h.save());assert.equal(resumed.dispatch({type:'story.resume',quest:'q079'}),false);arriveQ079(resumed);assert.equal(values(resumed).finished,false);assert.equal(values(resumed).shutdown,true);assert.equal(values(resumed).backupAt,'archive_place');
  }}arriveQ079(g);}}
 }assert.equal(seen.size,8);
});

test('q079 all seven routes in current, previous and accepted saves award the unchanged outcome exactly once',()=>{
 const scenes=new Set();for(const generation of ['current','previous','accepted'])for(const route of q079Routes){
  const accepted=generation==='accepted',g=loadQ079(accepted?q079AcceptedEngine().save():q079Engine({legacy:generation==='previous'}).save()),reward=data.quests.q079.outcomes[route.outcome],gold=g.state.gold;let awards=0,total=0;const award=g.award.bind(g);g.award=(gp,xp,who)=>{total+=gp;if(gp===reward.gold&&xp===reward.xp)awards++;return award(gp,xp,who);};
  for(const id of accepted?route.accepted:route.path){assert.equal(awards,0);if(accepted){scenes.add(q079LegacyScene(g));loadQ079(g.save());assert.ok(g.dispatch({type:'choose',id}));loadQ079(g.save());drain(g);if(g.state.battle){loadQ079(g.save());resolveQ079(g,'win');}assert.equal(g.state.stories.q079,undefined);assert.equal(g.state.journey,null);assert.equal(projectGame(g).dialog?.scene,undefined);}else chooseQ079(g,id);}
  assert.equal(g.state.quests.q079.outcome,route.outcome);assert.equal(awards,1);assert.equal(g.state.gold,gold+total);const raw=g.save();assert.throws(()=>g.complete('q079',route.outcome));assert.equal(g.save(),raw);assert.equal(g.accept('q079'),false);g.run(data.quests.q079.model.entryScript);drain(g);assert.equal(awards,1);loadQ079(g.save());
 }assert.deepEqual([...scenes].sort(),['archive','entry','full']);
});

test('q079 malformed old and current saves are rejected atomically',()=>{
 const g=q079Engine(),before=g.save();for(const raw of [before,q079Engine({legacy:true}).save()])for(const mutate of [s=>s.stories.q079.values.recordBoardAt='nowhere',s=>s.stories.q079.values.backupAt='nobody',s=>s.stories.q079.values.shutdown=1,s=>delete s.stories.q079.values.saved,s=>s.stories.q079.revision=2,s=>s.stories.q079.events.push('unwritten'),s=>(s.flags.legacyStoryRoutes??={}).q079=true]){const bad=JSON.parse(raw);mutate(bad.state);assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),before);}
});

test('q079 27 browser checkpoints distinguish observation, board custody, old text, defeat and accepted scenes',async()=>{
 const {fixtures,outcomes}=await restartLedgerArtFixtures();assert.equal(fixtures.length,27);assert.equal(outcomes.length,3);assert.equal(new Set(fixtures.map(f=>f.scene+'/'+f.variant)).size,27);assert.ok(fixtures.every(f=>f.cast.length===0));
 for(const gen of ['current','previous']){const rows=fixtures.filter(f=>f.variant.startsWith(gen));assert.equal(new Set(rows.map(f=>f.scene)).size,5);assert.equal(rows.filter(f=>f.scene==='small').length,4);assert.ok(rows.some(f=>f.variant===gen+'-lose'));}
 for(const scene of ['restarted','small']){const f=fixtures.find(f=>f.scene===scene&&f.variant.startsWith('previous'));assert.equal(projectGame(loadQ079(f.save)).dialog.text,f.expectedText);assert.equal(f.expectedText,previousQ079.model.graph.find(n=>n.id===scene).text);assert.notEqual(f.expectedText,data.quests.q079.model.graph.find(n=>n.id===scene).text);}
 assert.equal(fixtures.filter(f=>f.absentStoryScene).length,3);
});
