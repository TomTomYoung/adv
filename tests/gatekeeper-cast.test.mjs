import test from 'node:test';
import assert from 'node:assert/strict';
import {projectGame} from '../src/application/projection.js';
import {data,go,drain,checkpoint} from './machine-helpers.mjs';
import {q071Routes,q071Cast,q071Engine,loadQ071,chooseQ071,previousQ071,q071AcceptedEngine,q071LegacyScene,resolveQ071,returnQ071AfterLoss,gatekeeperArtFixtures} from '../tools/gatekeeper-art-fixtures.mjs';
const story=g=>g.state.stories.q071,values=g=>story(g).values;
const depart=(g,id)=>{assert.ok(g.dispatch({type:'choose',id}),g.state.notice);drain(g);assert.ok(g.state.journey);loadQ071(g.save());};
const arrive=g=>{const a=g.data.quests.q071.story.actions[g.state.journey.action];go(g,g.data.quests.q071.story.worldPlaces[a.journey.to]);drain(g);assert.equal(g.state.journey,null);checkpoint(g);};

test('q071 adds only one existing worker reference, two casts and three timing corrections',()=>{
 const q=structuredClone(data.quests.q071);
 assert.equal(q.story.revision,1);assert.equal(q.model.edition.revision,1);
 assert.deepEqual(q.story.registry,previousQ071.story.registry);
 assert.deepEqual(q.story.actions,previousQ071.story.actions);
 assert.deepEqual(q.outcomes,previousQ071.outcomes);
 assert.equal(q.story.entities.workerPerson.character,'q071_worker');delete q.story.entities.workerPerson.character;
 for(const field of ['portrait','sprite'])assert.equal(data.characters.q071_worker[field],undefined);
 for(const [id,s] of Object.entries(q.story.scenes)){assert.deepEqual(s.cast.map(c=>c.entity),q071Cast(id).length?['workerPerson']:[]);s.cast=[];}
 for(const id of ['returned','cut','repaired']){
  const node=q.model.graph.find(n=>n.id===id),now=node.text,old=previousQ071.model.graph.find(n=>n.id===id).text;assert.notEqual(now,old);node.text=old;let count=0;
  const restore=x=>{if(!x||typeof x!=='object')return;for(const k of Object.keys(x))if(x[k]===now){x[k]=old;count++;}else restore(x[k]);};restore(q.scripts);assert.equal(count,1);
 }
 assert.equal(Object.keys(q.story.scenes).length,7);assert.equal(Object.keys(q.story.actions).length,10);
 assert.equal(Object.values(q.story.actions).filter(a=>a.journey).length,7);
 assert.deepEqual(q,previousQ071);
});

test('q071 all seven scenes, seven journeys, ten actions and pending battles resume byte-for-byte',()=>{
 const scenes=new Set(),journeys=new Set(),actions=new Set(),phases=new Set();
 const observe=g=>{
  const raw=g.save(),now=loadQ071(raw);assert.equal(g.save(),raw);
  const before=projectGame(g).dialog,after=projectGame(now).dialog;
  assert.equal(after?.text,before?.text);assert.deepEqual(after?.options,before?.options);
  phases.add(g.state.battle?'battle':g.state.journey?'journey':g.state.quests.q071.stage==='completed'?'completed':g.state.waiting?.type);
  if(story(g).scene)scenes.add(story(g).scene);
  if(after?.scene)assert.deepEqual(after.scene.cast.map(c=>c.id),q071Cast(story(now).scene));
  if(g.state.journey){journeys.add(g.state.journey.action);assert.equal(story(g).scene,null);assert.equal(after?.scene,undefined);assert.equal(now.dispatch({type:'story.resume',quest:'q071'}),false);arrive(now);}
 };
 for(const legacy of [false,true])for(const route of q071Routes){
  const g=q071Engine({legacy});observe(g);
  for(const id of route.path){actions.add(story(g).scene+'_'+id);assert.ok(g.dispatch({type:'choose',id}));observe(g);drain(g);observe(g);
   if(g.state.battle){resolveQ071(g,'win');observe(g);}
   if(g.state.journey){const a=g.data.quests.q071.story.actions[g.state.journey.action];go(g,g.data.quests.q071.story.worldPlaces[a.journey.to]);observe(g);drain(g);observe(g);}
  }
  assert.equal(g.state.quests.q071.outcome,route.outcome);
 }
 assert.equal(scenes.size,7);assert.equal(journeys.size,7);assert.equal(actions.size,10);
 assert.deepEqual([...actions].sort(),Object.keys(data.quests.q071.story.actions).sort());
 for(const phase of ['text','choice','battle','journey','completed'])assert.ok(phases.has(phase),phase);
});

test('q071 retirement records do not replace a real worker return and stamp stays with its owner until finish',()=>{
 for(const legacy of [false,true]){
  let g=q071Engine({legacy});chooseQ071(g,'retired');assert.equal(values(g).returnRecordAt,'record');assert.equal(values(g).retiredChecked,false);
  depart(g,'carry');assert.equal(values(g).returnRecordAt,'party');assert.equal(values(g).retiredChecked,false);arrive(g);g=loadQ071(g.save());
  assert.equal(values(g).returnRecordAt,'entry');assert.equal(values(g).retiredChecked,true);assert.equal(values(g).workerPersonAt,'worker_room');assert.equal(values(g).returned,false);
  chooseQ071(g,'call');assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['q071_worker']);
  depart(g,'escort');assert.equal(values(g).workerPersonAt,'transit');assert.equal(values(g).stampAt,'workerPerson');arrive(g);
  assert.equal(values(g).workerPersonAt,'entry');assert.equal(values(g).stampAt,'workerPerson');assert.equal(values(g).returned,false);assert.equal(values(g).finished,false);
  chooseQ071(g,'finish');assert.equal(values(g).stampAt,'entry');assert.equal(values(g).returned,true);assert.equal(values(g).repaired,false);
 }
});

test('q071 power is cut on departure and restored only after repair confirmation, independently of record lookup',()=>{
 for(const legacy of [false,true])for(const checked of [false,true]){
  let g=q071Engine({legacy});if(checked){chooseQ071(g,'retired');chooseQ071(g,'carry');}
  chooseQ071(g,checked?'temporary':'power');assert.equal(values(g).temporaryOff,false);assert.equal(values(g).retiredChecked,checked);
  assert.equal(values(g).workerPersonAt,'worker_room');assert.equal(values(g).stampAt,'workerPerson');
  depart(g,'repair');assert.equal(values(g).temporaryOff,true);assert.equal(values(g).repaired,false);
  arrive(g);g=loadQ071(g.save());assert.equal(values(g).temporaryOff,true);assert.equal(values(g).repaired,false);assert.deepEqual(projectGame(g).dialog.scene.cast,[]);
  chooseQ071(g,'finish');assert.equal(values(g).temporaryOff,false);assert.equal(values(g).repaired,true);assert.equal(values(g).returned,false);assert.equal(values(g).retiredChecked,checked);
 }
});

test('q071 dismantling cannot escape or commit before winning; a saved defeat can retry or change approach',()=>{
 for(const legacy of [false,true])for(const after of ['retry','records']){
  const old=q071Engine({legacy});chooseQ071(old,'dismantle',{combat:'pending'});const g=loadQ071(old.save());
  assert.equal(g.state.battle.encounter,'boss_8');assert.equal(g.data.encounters.boss_8.escape,false);
  const s=structuredClone(story(g));assert.equal(g.dispatch({type:'battle',action:'escape'}),false);assert.deepEqual(story(g),s);assert.equal(values(g).dismantled,false);loadQ071(g.save());
  resolveQ071(g,'lose');assert.equal(g.state.mode,'town');assert.equal(g.state.quests.q071.stage,'active');assert.equal(values(g).dismantled,false);assert.equal(values(g).finished,false);assert.equal(values(g).workerPersonAt,'worker_room');
  loadQ071(g.save());returnQ071AfterLoss(g);
  for(const id of after==='retry'?['dismantle']:q071Routes[0].path)chooseQ071(g,id);
  assert.equal(g.state.quests.q071.outcome,after==='retry'?'contract':'informed');assert.equal(values(g).dismantled,after==='retry');
 }
});

test('q071 all pending journeys retain positions, possessions and power state through retreat and defeat',()=>{
 const seen=new Set();
 for(const legacy of [false,true])for(const route of q071Routes.filter(r=>r.outcome!=='contract')){
  const g=q071Engine({legacy});
  for(const id of route.path){assert.ok(g.dispatch({type:'choose',id}));drain(g);
   if(g.state.journey){const key=legacy+'/'+g.state.journey.action;
    if(!seen.has(key)){seen.add(key);const raw=g.save();
     for(const interruption of ['mark','defeat']){
      const h=loadQ071(raw);if(h.state.mode==='town')go(h,{kind:'dungeon',dungeon:'region_8',map:'region_8_f1',x:1,y:1});assert.ok(h.state.journey);
      const s=structuredClone(story(h)),j=structuredClone(h.state.journey);
      if(interruption==='mark')assert.ok(h.dispatch({type:'retreat'}));else h.defeat();drain(h);
      assert.equal(h.state.mode,'town');assert.deepEqual(story(h),s);assert.deepEqual(h.state.journey,j);
      const resumed=loadQ071(h.save());assert.equal(resumed.dispatch({type:'story.resume',quest:'q071'}),false);arrive(resumed);assert.equal(values(resumed).finished,false);
     }
    }arrive(g);
   }
  }
 }
 assert.equal(seen.size,14);
});

test('q071 existing waiting prose remains intact when current saves use corrected processing times',()=>{
 for(const scene of ['returned','cut','repaired']){
  const g=q071Engine({legacy:true}),route=scene==='returned'?q071Routes[0]:q071Routes[1];
  for(const id of route.path){if(story(g).scene===scene)break;chooseQ071(g,id);}
  const raw=g.save(),before=projectGame(g).dialog,after=projectGame(loadQ071(raw)).dialog;
  assert.equal(after.text,before.text);assert.deepEqual(after.options,before.options);assert.equal(story(g).scene,scene);
  assert.notEqual(data.quests.q071.model.graph.find(n=>n.id===scene).text,previousQ071.model.graph.find(n=>n.id===scene).text);
 }
});

test('q071 each physical route awards its unchanged outcome exactly once, including the separate battle reward',()=>{
 for(const legacy of [false,true])for(const route of q071Routes){
  const g=loadQ071(q071Engine({legacy}).save()),gold=g.state.gold,reward=data.quests.q071.outcomes[route.outcome];let awards=0,total=0;
  const award=g.award.bind(g);g.award=(gp,xp,who)=>{total+=gp;if(gp===reward.gold&&xp===reward.xp)awards++;return award(gp,xp,who);};
  for(const id of route.path){assert.equal(awards,0);chooseQ071(g,id);}
  assert.equal(awards,1);assert.equal(g.state.gold,gold+total);assert.equal(g.state.quests.q071.outcome,route.outcome);
  const raw=g.save();assert.throws(()=>g.complete('q071',route.outcome));assert.equal(g.save(),raw);assert.equal(g.accept('q071'),false);
  g.run(data.quests.q071.model.entryScript);drain(g);assert.equal(awards,1);loadQ071(g.save());
 }
});

test('q071 accepted old saves keep two scenes, four direct routes and original battle with no new cast or journeys',()=>{
 const scenes=new Set();
 for(const route of q071Routes){
  let g=loadQ071(q071AcceptedEngine().save());const reward=data.quests.q071.outcomes[route.outcome];let awards=0;
  const award=g.award.bind(g);g.award=(gp,xp,who)=>{if(gp===reward.gold&&xp===reward.xp)awards++;return award(gp,xp,who);};
  for(const id of route.accepted){scenes.add(q071LegacyScene(g));loadQ071(g.save());assert.ok(g.dispatch({type:'choose',id}));loadQ071(g.save());drain(g);
   if(g.state.battle){loadQ071(g.save());resolveQ071(g,'win');}
   assert.equal(g.state.stories.q071,undefined);assert.equal(g.state.journey,null);assert.equal(projectGame(g).dialog?.scene,undefined);
  }
  assert.equal(g.state.quests.q071.outcome,route.outcome);assert.equal(awards,1);loadQ071(g.save());
 }
 assert.deepEqual([...scenes].sort(),['entry','worker']);
});

test('q071 invalid new and old states reject atomically without resetting another save',()=>{
 const g=q071Engine(),before=g.save();
 for(const raw of [before,q071Engine({legacy:true}).save()])for(const mutate of [s=>s.stories.q071.values.stampAt='nowhere',s=>s.stories.q071.values.workerPersonAt='party',s=>s.stories.q071.values.temporaryOff=1,s=>delete s.stories.q071.values.returned,s=>s.stories.q071.revision=2,s=>s.stories.q071.events.push('unwritten'),s=>(s.flags.legacyStoryRoutes??={}).q071=true]){
  const bad=JSON.parse(raw);mutate(bad.state);assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),before);
 }
});

test('q071 browser fixtures cover every scene, both power approaches, defeat restart and accepted old routes',async()=>{
 const {fixtures,outcomes}=await gatekeeperArtFixtures();assert.equal(fixtures.length,22);assert.equal(outcomes.length,3);
 assert.equal(new Set(fixtures.map(f=>f.scene+'/'+f.variant)).size,22);
 for(const gen of ['current','previous']){
  const rows=fixtures.filter(f=>f.variant.startsWith(gen));assert.equal(new Set(rows.map(f=>f.scene)).size,7);
  for(const scene of ['cut','repaired'])for(const suffix of ['checked','unread'])assert.ok(rows.some(f=>f.scene===scene&&f.variant===gen+'-'+suffix));
  assert.ok(rows.some(f=>f.scene==='entry'&&f.variant===gen+'-lose'));
 }
 assert.equal(fixtures.filter(f=>f.absentStoryScene).length,2);
});
