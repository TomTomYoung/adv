import test from 'node:test';
import assert from 'node:assert/strict';
import {projectGame} from '../src/application/projection.js';
import {data,go,drain} from './machine-helpers.mjs';
import {previousQ075,q075Routes,q075Cast,q075LegacyScene,q075Engine,q075AcceptedEngine,loadQ075,chooseQ075,departQ075,arriveQ075,resolveQ075,returnQ075AfterLoss,unpaidSaintArtFixtures} from '../tools/unpaid-saint-art-fixtures.mjs';
const story=g=>g.state.stories.q075,values=g=>story(g).values;

test('q075 only adds an existing group reference, two casts and two timing corrections',()=>{
 const q=structuredClone(data.quests.q075);assert.equal(q.story.revision,1);assert.equal(q.model.edition.revision,1);
 assert.deepEqual(q.story.registry,previousQ075.story.registry);assert.deepEqual(q.story.actions,previousQ075.story.actions);assert.deepEqual(q.outcomes,previousQ075.outcomes);
 assert.equal(q.story.entities.workersGroup.kind,'group');assert.equal(q.story.entities.workersGroup.character,'q075_workers');delete q.story.entities.workersGroup.character;
 for(const field of ['portrait','sprite'])assert.equal(data.characters.q075_workers[field],undefined);
 for(const [id,s] of Object.entries(q.story.scenes)){assert.deepEqual(s.cast.map(c=>c.entity),q075Cast(id).length?['workersGroup']:[]);s.cast=[];}
 for(const id of ['shared','registered']){
  const n=q.model.graph.find(n=>n.id===id),now=n.text,old=previousQ075.model.graph.find(n=>n.id===id).text;assert.notEqual(now,old);n.text=old;let count=0;
  const restore=x=>{if(!x||typeof x!=='object')return;for(const k of Object.keys(x))if(x[k]===now){x[k]=old;count++;}else restore(x[k]);};restore(q.scripts);assert.equal(count,1);
 }
 assert.deepEqual(q,previousQ075);
});

test('q075 fixtures enumerate all five paths in the current and accepted acyclic graphs',()=>{
 function paths(graph){const result=[],nodes=new Map(graph.map(n=>[n.id,n]));const visit=(scene,route,seen)=>{assert.ok(!seen.has(scene));const next=new Set([...seen,scene]);for(const o of nodes.get(scene).options){const path=[...route,o.id];if(o.to.startsWith('@'))result.push({path,outcome:o.to.slice(1)});else visit(o.to,path,next);}};visit('entry',[],new Set());return result.map(r=>JSON.stringify(r)).sort();}
 assert.equal(q075Routes.length,5);assert.deepEqual(paths(data.quests.q075.model.graph),q075Routes.map(({path,outcome})=>JSON.stringify({path,outcome})).sort());
 assert.deepEqual(paths(data.previousQuestRoutes.q075.model.graph),q075Routes.map(({accepted:path,outcome})=>JSON.stringify({path,outcome})).sort());
});

test('q075 all seven scenes, seven journeys, eleven actions and battle phases resume without changing state',()=>{
 const scenes=new Set(),journeys=new Set(),actions=new Set(),phases=new Set();
 const observe=g=>{const raw=g.save(),now=loadQ075(raw);assert.equal(g.save(),raw);const before=projectGame(g).dialog,after=projectGame(now).dialog;assert.equal(after?.text,before?.text);assert.deepEqual(after?.options,before?.options);
  phases.add(g.state.battle?'battle':g.state.journey?'journey':g.state.quests.q075.stage==='completed'?'completed':g.state.waiting?.type);
  if(story(g).scene)scenes.add(story(g).scene);if(after?.scene)assert.deepEqual(after.scene.cast.map(c=>c.id),q075Cast(story(now).scene));
  if(g.state.journey){journeys.add(g.state.journey.action);assert.equal(story(g).scene,null);assert.equal(after?.scene,undefined);assert.equal(now.dispatch({type:'story.resume',quest:'q075'}),false);arriveQ075(now);}
 };
 for(const legacy of [false,true])for(const route of q075Routes){const g=q075Engine({legacy});observe(g);for(const id of route.path){actions.add(story(g).scene+'_'+id);assert.ok(g.dispatch({type:'choose',id}));observe(g);drain(g);observe(g);if(g.state.battle){resolveQ075(g,'win');observe(g);}if(g.state.journey){const a=g.data.quests.q075.story.actions[g.state.journey.action];go(g,g.data.quests.q075.story.worldPlaces[a.journey.to]);observe(g);drain(g);observe(g);}}assert.equal(g.state.quests.q075.outcome,route.outcome);}
 assert.equal(scenes.size,7);assert.equal(journeys.size,7);assert.equal(actions.size,11);assert.deepEqual([...actions].sort(),Object.keys(data.quests.q075.story.actions).sort());for(const phase of ['text','choice','journey','battle','completed'])assert.ok(phases.has(phase),phase);
});

test('q075 the gear is carried at departure and supplied at real arrival; the request is registered only on finish',()=>{
 for(const legacy of [false,true]){
  let g=q075Engine({legacy});assert.equal(values(g).requestSheetAt,'entry');assert.equal(values(g).gearPartAt,'store');
  departQ075(g,'gear');assert.equal(values(g).requestSheetAt,'party');assert.equal(values(g).gearPartAt,'store');arriveQ075(g);g=loadQ075(g.save());
  departQ075(g,'deliver');assert.equal(values(g).gearPartAt,'party');assert.equal(values(g).supplied,false);arriveQ075(g);g=loadQ075(g.save());
  assert.equal(values(g).gearPartAt,'entry');assert.equal(values(g).supplied,true);assert.equal(values(g).translated,false);assert.equal(values(g).workersGroupAt,'workers');
  chooseQ075(g,'translate');assert.equal(values(g).requestSheetAt,'party');assert.equal(values(g).translated,false);
  departQ075(g,'deliver');assert.equal(values(g).requestSheetAt,'party');arriveQ075(g);g=loadQ075(g.save());assert.equal(values(g).requestSheetAt,'party');assert.equal(values(g).translated,false);assert.equal(values(g).finished,false);
  chooseQ075(g,'finish');assert.equal(values(g).requestSheetAt,'store');assert.equal(values(g).translated,true);assert.equal(values(g).workShared,false);
 }
});

test('q075 both work-sharing approaches move the same group, keep the unsupplied gear and finish only after handover',()=>{
 for(const legacy of [false,true])for(const viaStore of [false,true]){
  let g=q075Engine({legacy});if(viaStore)chooseQ075(g,'gear');chooseQ075(g,viaStore?'reduce':'share');g=loadQ075(g.save());
  assert.equal(values(g).workersGroupAt,'workers');assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['q075_workers']);assert.equal(values(g).requestSheetAt,viaStore?'party':'entry');
  departQ075(g,'escort');assert.equal(values(g).workersGroupAt,'transit');assert.equal(values(g).workShared,false);assert.equal(values(g).gearPartAt,'store');arriveQ075(g);g=loadQ075(g.save());
  assert.equal(values(g).workersGroupAt,'entry');assert.equal(values(g).workShared,false);assert.equal(values(g).supplied,false);assert.equal(values(g).translated,false);assert.equal(values(g).finished,false);
  assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['q075_workers']);chooseQ075(g,'finish');assert.equal(values(g).workShared,true);assert.equal(values(g).supplied,false);assert.equal(values(g).translated,false);assert.equal(values(g).gearPartAt,'store');
 }
});

test('q075 one-off repair does not register a translated request or move human workers',()=>{
 for(const legacy of [false,true]){let g=q075Engine({legacy});for(const id of q075Routes[1].path)chooseQ075(g,id);g=loadQ075(g.save());assert.equal(g.state.quests.q075.outcome,'once');assert.equal(values(g).supplied,true);assert.equal(values(g).translated,false);assert.equal(values(g).workShared,false);assert.equal(values(g).requestSheetAt,'party');assert.equal(values(g).workersGroupAt,'workers');}
});

test('q075 forced rewriting rejects escape and premature completion; defeat can retry or select work sharing',()=>{
 for(const legacy of [false,true])for(const retry of [false,true]){
  const old=q075Engine({legacy});chooseQ075(old,'rewrite',{combat:'pending'});const g=loadQ075(old.save());assert.equal(g.state.battle.encounter,'boss_8');assert.equal(g.data.encounters.boss_8.escape,false);
  const state=structuredClone(story(g));assert.equal(g.dispatch({type:'battle',action:'escape'}),false);assert.deepEqual(story(g),state);assert.equal(values(g).finished,false);loadQ075(g.save());
  resolveQ075(g,'lose');assert.equal(g.state.mode,'town');assert.equal(g.state.quests.q075.stage,'active');assert.equal(values(g).resolution,'pending');assert.equal(values(g).finished,false);loadQ075(g.save());returnQ075AfterLoss(g);
  for(const id of retry?['rewrite']:q075Routes[2].path)chooseQ075(g,id);assert.equal(g.state.quests.q075.outcome,retry?'contract':'compromise');assert.equal(values(g).workShared,!retry);assert.equal(values(g).supplied,false);
 }
});

test('q075 every journey preserves group location and item custody through retreat and defeat',()=>{
 const seen=new Set();for(const legacy of [false,true])for(const route of q075Routes.filter(r=>r.outcome!=='contract')){
  const g=q075Engine({legacy});for(const id of route.path){assert.ok(g.dispatch({type:'choose',id}));drain(g);if(g.state.journey){const key=legacy+'/'+g.state.journey.action;if(!seen.has(key)){seen.add(key);const raw=g.save();for(const interruption of ['mark','defeat']){const h=loadQ075(raw);if(h.state.mode==='town')go(h,{kind:'dungeon',dungeon:'region_8',map:'region_8_f1',x:1,y:1});assert.ok(h.state.journey);const s=structuredClone(story(h)),j=structuredClone(h.state.journey);if(interruption==='mark')assert.ok(h.dispatch({type:'retreat'}));else h.defeat();drain(h);assert.equal(h.state.mode,'town');assert.deepEqual(story(h),s);assert.deepEqual(h.state.journey,j);const resumed=loadQ075(h.save());assert.equal(resumed.dispatch({type:'story.resume',quest:'q075'}),false);arriveQ075(resumed);assert.equal(values(resumed).finished,false);}}arriveQ075(g);}}
 }assert.equal(seen.size,14);
});

test('q075 all five current and previous-start paths award each outcome exactly once',()=>{
 for(const legacy of [false,true])for(const route of q075Routes){const g=loadQ075(q075Engine({legacy}).save()),gold=g.state.gold,reward=data.quests.q075.outcomes[route.outcome];let awards=0,total=0;const award=g.award.bind(g);g.award=(gp,xp,who)=>{total+=gp;if(gp===reward.gold&&xp===reward.xp)awards++;return award(gp,xp,who);};for(const id of route.path){assert.equal(awards,0);chooseQ075(g,id);}assert.equal(awards,1);assert.equal(g.state.gold,gold+total);assert.equal(g.state.quests.q075.outcome,route.outcome);const raw=g.save();assert.throws(()=>g.complete('q075',route.outcome));assert.equal(g.save(),raw);assert.equal(g.accept('q075'),false);g.run(data.quests.q075.model.entryScript);drain(g);assert.equal(awards,1);loadQ075(g.save());}
});

test('q075 accepted old routes retain three scenes and five paths without new casts or journeys',()=>{
 const scenes=new Set();for(const route of q075Routes){const g=loadQ075(q075AcceptedEngine().save()),reward=data.quests.q075.outcomes[route.outcome];let awards=0;const award=g.award.bind(g);g.award=(gp,xp,who)=>{if(gp===reward.gold&&xp===reward.xp)awards++;return award(gp,xp,who);};for(const id of route.accepted){scenes.add(q075LegacyScene(g));loadQ075(g.save());assert.ok(g.dispatch({type:'choose',id}));loadQ075(g.save());drain(g);if(g.state.battle){loadQ075(g.save());resolveQ075(g,'win');}assert.equal(g.state.stories.q075,undefined);assert.equal(g.state.journey,null);assert.equal(projectGame(g).dialog?.scene,undefined);}assert.equal(g.state.quests.q075.outcome,route.outcome);assert.equal(awards,1);loadQ075(g.save());}assert.deepEqual([...scenes].sort(),['entry','parts','running']);
});

test('q075 malformed old and current saves reject atomically without changing another save',()=>{
 const g=q075Engine(),before=g.save();for(const raw of [before,q075Engine({legacy:true}).save()])for(const mutate of [s=>s.stories.q075.values.gearPartAt='nowhere',s=>s.stories.q075.values.workersGroupAt='party',s=>s.stories.q075.values.workShared=1,s=>delete s.stories.q075.values.supplied,s=>s.stories.q075.revision=2,s=>s.stories.q075.events.push('unwritten'),s=>(s.flags.legacyStoryRoutes??={}).q075=true]){const bad=JSON.parse(raw);mutate(bad.state);assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),before);}
});

test('q075 browser fixtures cover both work-sharing origins, all scenes, loss, old prose and accepted saves',async()=>{
 const {fixtures,outcomes}=await unpaidSaintArtFixtures();assert.equal(fixtures.length,23);assert.equal(outcomes.length,4);assert.equal(new Set(fixtures.map(f=>f.scene+'/'+f.variant)).size,fixtures.length);
 for(const gen of ['current','previous']){const rows=fixtures.filter(f=>f.variant.startsWith(gen));assert.equal(new Set(rows.map(f=>f.scene)).size,7);for(const scene of ['share','shared'])for(const holder of ['entry','party'])assert.ok(rows.some(f=>f.scene===scene&&f.variant===gen+'-'+holder+'-unsupplied'));assert.ok(rows.some(f=>f.scene==='entry'&&f.variant===gen+'-lose'));}
 for(const scene of ['shared','registered']){const f=fixtures.find(f=>f.scene===scene&&f.variant.startsWith('previous'));assert.ok(f);assert.equal(projectGame(loadQ075(f.save)).dialog.text,f.expectedText);assert.equal(f.expectedText,previousQ075.model.graph.find(n=>n.id===scene).text);assert.notEqual(f.expectedText,data.quests.q075.model.graph.find(n=>n.id===scene).text);}
 assert.equal(fixtures.filter(f=>f.absentStoryScene).length,3);
});
