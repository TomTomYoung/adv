import test from 'node:test';
import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {data,ready,start,go,drain,checkpoint} from './royal-helpers.mjs';
import {previousQ187,previousQ187Data,q187Routes,q187Cast,q187Engine,loadQ187,resolveQ187,chooseQ187,flaglessSoldierArtFixtures} from '../tools/flagless-soldier-art-fixtures.mjs';

test('q187 adds four roles and nine casts while preserving prose, all actions, battle scripts and three endings',()=>{
 const q=structuredClone(data.quests.q187);assert.equal(q.story.revision,2);assert.equal(q.model.edition.revision,2);assert.equal(q.model.storyUpgrades,undefined);
 for(const id of ['kado','residents','mayor','officerPerson']){assert.equal(q.story.entities[id].character,'q187_'+id);delete q.story.entities[id].character;assert.equal(data.characters['q187_'+id].portrait,undefined);assert.equal(data.characters['q187_'+id].sprite,undefined);}
 assert.equal(q.story.entities.residents.kind,'group');assert.deepEqual(q.story.registry.officerPersonAt.values,['officer']);assert.deepEqual(q.story.registry.mayorAt.values,['contract']);
 assert.equal(Object.values(q.story.scenes).filter(s=>s.cast.length).length,9);for(const s of Object.values(q.story.scenes))s.cast=[];
 delete q.story.entities.officerPerson;delete q.story.registry.officerPersonAt;
 for(const [key,r] of Object.entries(q.story.registry)){if(key==='mayorAt')r.values=structuredClone(previousQ187.story.registry[key].values);else if(r.values)r.values=r.values.filter(v=>v!=='officerPerson');}
 q.story.revision=1;q.model.edition.revision=1;assert.deepEqual(q,previousQ187);
});

test('q187 saves resume every scene and all ten journeys, text, choices, pending battles and completed states',()=>{
 const scenes=new Set(),journeys=new Set(),phases=new Set();
 const observe=g=>{const raw=g.save(),now=loadQ187(raw);assert.equal(g.save(),raw);assert.deepEqual(projectGame(now).dialog,projectGame(g).dialog);
  phases.add(g.state.journey?'journey':g.state.quests.q187.stage==='completed'?'completed':g.state.battle?'battle':g.state.waiting?.type);
  const scene=g.state.stories.q187.scene;if(scene)scenes.add(scene);if(projectGame(now).dialog?.scene)assert.deepEqual(projectGame(now).dialog.scene.cast.map(c=>c.id),q187Cast(scene));
  if(now.state.journey){const a=data.quests.q187.story.actions[now.state.journey.action],v=now.state.stories.q187.values;journeys.add(now.state.journey.action);assert.equal(now.state.stories.q187.scene,null);assert.equal(projectGame(now).dialog?.scene,undefined);assert.equal(now.dispatch({type:'story.resume',quest:'q187'}),false);for(const who of a.journey.companions)assert.equal(v[who+'At'],'transit');assert.equal(v.mayorAt,'contract');assert.equal(v.officerPersonAt,'officer');now.random=()=>.999999;go(now,data.quests.q187.story.worldPlaces[a.journey.to]);drain(now);checkpoint(now);assert.equal(now.state.journey,null);for(const who of a.journey.companions)assert.equal(now.state.stories.q187.values[who+'At'],a.journey.to);}
 };
 for(const route of q187Routes){const g=q187Engine();let battles=0;observe(g);for(const id of route.path){assert.ok(g.dispatch({type:'choose',id}));observe(g);drain(g);observe(g);if(g.state.battle)resolveQ187(g,route.battles?.[battles++]??'win',{observe});if(g.state.journey){const a=data.quests.q187.story.actions[g.state.journey.action];go(g,data.quests.q187.story.worldPlaces[a.journey.to]);observe(g);drain(g);observe(g);}}assert.equal(g.state.quests.q187.outcome,route.outcome);}
 assert.equal(scenes.size,9);assert.equal(journeys.size,10);for(const phase of ['text','choice','journey','battle','completed'])assert.ok(phases.has(phase),phase);
});

test('q187 residents stay at the refuge, the mayor stays at the well, and the officer only attends enlistment',()=>{
 for(const outcome of ['army','village','leave']){const g=q187Engine(),v=()=>g.state.stories.q187.values,inventory=structuredClone(g.state.inventory),members=[...g.state.members],gold=g.state.gold;let rewards=0;
  const award=g.award.bind(g);g.award=(gp,xp,who)=>{assert.deepEqual([gp,xp],[153,99]);rewards++;return award(gp,xp,who);};
  assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['q187_kado']);
  assert.ok(g.dispatch({type:'choose',id:'evac'}));drain(g);assert.equal(v().kadoAt,'transit');assert.equal(v().residentsAt,'transit');assert.equal(v().mayorAt,'contract');assert.equal(v().officerPersonAt,'officer');
  go(g,data.quests.q187.story.worldPlaces.refuge);drain(g);assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['q187_kado','q187_residents']);
  chooseQ187(g,'contract');assert.equal(v().residentsAt,'refuge');assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['q187_kado','q187_mayor']);
  chooseQ187(g,outcome);assert.equal(v().kadoAt,{army:'officer',village:'bridge',leave:'exit'}[outcome]);assert.equal(v().resolution,'pending');assert.equal(rewards,0);
  if(outcome==='village'){assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['q187_kado']);chooseQ187(g,'sign');assert.equal(v().kadoAt,'contract');}
  assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),q187Cast(g.state.stories.q187.scene));chooseQ187(g,'finish');assert.equal(g.state.quests.q187.outcome,outcome);assert.equal(v().resolution,outcome);assert.equal(v().residentsAt,'refuge');assert.equal(v().mayorAt,'contract');assert.equal(v().officerPersonAt,'officer');assert.equal(g.state.gold,gold+153);assert.equal(rewards,1);assert.deepEqual(g.state.members,members);assert.deepEqual(g.state.inventory,inventory);
  const raw=g.save();assert.throws(()=>g.complete('q187',outcome));assert.equal(g.save(),raw);g.run(data.quests.q187.model.entryScript);drain(g);assert.equal(rewards,1);
 }
});

test('q187 defeat permits a saved retry or evacuation, whereas escape only permits contract consultation',()=>{
 for(const result of ['lose','escape'])for(const next of result==='lose'?['battle','back']:['escaped']){const old=q187Engine();chooseQ187(old,'fight');assert.ok(old.dispatch({type:'choose',id:'battle'}));drain(old);const g=loadQ187(old.save());resolveQ187(g,result);assert.equal(g.state.flags.relocatedBattleResult.q187,result);assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['q187_kado']);assert.equal(g.state.stories.q187.values.residentsAt,'entry');
  const raw=g.save();for(const id of result==='escape'?['battle','back']:['escaped']){assert.equal(g.dispatch({type:'choose',id}),false);assert.equal(g.save(),raw);}
  chooseQ187(g,next);if(next==='battle'){assert.equal(g.state.stories.q187.scene,'defend_battle_ready');assert.equal(g.state.stories.q187.values.kadoAt,'gate');assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['q187_kado']);chooseQ187(g,'continue');}
  if(next==='back'){assert.equal(g.state.stories.q187.values.kadoAt,'entry');chooseQ187(g,'evac');chooseQ187(g,'contract');}
  assert.equal(g.state.stories.q187.scene,'contract');assert.equal(g.state.stories.q187.values.kadoAt,'contract');assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['q187_kado','q187_mayor']);assert.equal(g.state.stories.q187.values.residentsAt,next==='back'?'refuge':'entry');
 }
});

test('q187 revision-1 saves and malformed fixed locations are rejected atomically; unstarted saves still load',()=>{
 const g=q187Engine(),raw=g.save(),old=new GameEngine(previousQ187Data);old.load(ready().save());old.random=()=>.999999;start(old,'q187');assert.throws(()=>g.load(old.save()),/改訂版/);assert.equal(g.save(),raw);
 for(const mutate of [s=>s.stories.q187.values.mayorAt='officer',s=>s.stories.q187.values.officerPersonAt='contract',s=>s.stories.q187.values.kadoAt='refuge',s=>delete s.stories.q187.values.officerPersonAt,s=>(s.flags.legacyStoryRoutes??={}).q187=true]){const bad=JSON.parse(raw);mutate(bad.state);assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),raw);}
 const unstarted=new GameEngine(previousQ187Data);unstarted.load(ready().save());loadQ187(unstarted.save());
});

test('q187 browser checkpoints include every scene, all three endings and both failed battle continuations',async()=>{
 const r=await flaglessSoldierArtFixtures();assert.equal(r.fixtures.length,28);assert.equal(r.outcomes.length,3);assert.equal(new Set(r.fixtures.map(f=>f.scene+'/'+f.variant)).size,r.fixtures.length);assert.equal(new Set(r.fixtures.map(f=>f.scene)).size,9);
 for(const f of r.fixtures){const dialog=projectGame(loadQ187(f.save)).dialog;assert.equal(dialog.text,f.expectedText);assert.deepEqual(dialog.scene.cast.map(c=>c.id),f.cast);}
 assert.ok(r.fixtures.some(f=>f.scene==='defend'&&f.variant.endsWith('lose')));assert.ok(r.fixtures.some(f=>f.scene==='defend'&&f.blockedChoices?.length===2));
 for(const scene of ['contract','army','bridge','village_done','left'])for(const variant of ['waiting-win','waiting-escape','evacuated-unfought','evacuated-lose'])assert.ok(r.fixtures.some(f=>f.scene===scene&&f.variant===variant),scene+'/'+variant);
});
