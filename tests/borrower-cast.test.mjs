import test from 'node:test';
import assert from 'node:assert/strict';
import {projectGame} from '../src/application/projection.js';
import {data,go,drain,checkpoint} from './library-helpers.mjs';
import {previousQ041,q041Routes,q041AcceptedRoutes,q041Cast,q041Engine,q041AcceptedEngine,loadQ041,chooseQ041,borrowerArtFixtures} from '../tools/borrower-art-fixtures.mjs';

test('q041 adds two character links and six casts while preserving every other quest field and revision',()=>{
 const q=structuredClone(data.quests.q041);assert.equal(q.story.revision,1);assert.equal(q.model.edition.revision,1);assert.equal(q.model.storyUpgrades,undefined);
 for(const id of ['borrower','clerk']){assert.equal(q.story.entities[id].character,'q041_'+id);delete q.story.entities[id].character;assert.equal(data.characters['q041_'+id].portrait,undefined);assert.equal(data.characters['q041_'+id].sprite,undefined);}
 assert.equal(Object.values(q.story.scenes).filter(s=>s.cast.length).length,6);for(const s of Object.values(q.story.scenes))s.cast=[];assert.deepEqual(q,previousQ041);
});

test('q041 current and previous saves resume all eight scenes and eight journeys with byte-identical state and dialogue',()=>{
 const scenes=new Set(),journeys=new Set(),phases=new Set();
 const observe=g=>{const raw=g.save(),now=loadQ041(raw),before=projectGame(g).dialog,after=projectGame(now).dialog;assert.equal(now.save(),raw);assert.equal(g.save(),raw);assert.equal(after?.text,before?.text);assert.deepEqual(after?.options,before?.options);
  phases.add(g.state.journey?'journey':g.state.quests.q041.stage==='completed'?'completed':g.state.waiting?.type);
  if(g.state.stories.q041.scene)scenes.add(g.state.stories.q041.scene);if(after?.scene)assert.deepEqual(after.scene.cast.map(c=>c.id),q041Cast(now.state.stories.q041.scene));
  if(now.state.journey){const a=data.quests.q041.story.actions[now.state.journey.action],v=now.state.stories.q041.values;journeys.add(now.state.journey.action);assert.equal(now.state.stories.q041.scene,null);assert.equal(after?.scene,undefined);assert.equal(now.dispatch({type:'story.resume',quest:'q041'}),false);for(const who of a.journey.companions)assert.equal(v[who+'At'],'transit');now.random=()=>.999999;go(now,data.quests.q041.story.worldPlaces[a.journey.to]);drain(now);checkpoint(now);assert.equal(now.state.journey,null);for(const who of a.journey.companions)assert.equal(now.state.stories.q041.values[who+'At'],a.journey.to);}
 };
 for(const legacy of [false,true])for(const route of q041Routes){const g=q041Engine({legacy});observe(g);for(const id of route.path){assert.ok(g.dispatch({type:'choose',id}));observe(g);drain(g);observe(g);if(g.state.journey){const a=g.data.quests.q041.story.actions[g.state.journey.action];go(g,g.data.quests.q041.story.worldPlaces[a.journey.to]);observe(g);drain(g);observe(g);}}assert.equal(g.state.quests.q041.outcome,route.outcome);}
 assert.equal(scenes.size,8);assert.equal(journeys.size,8);for(const phase of ['text','choice','journey','completed'])assert.ok(phases.has(phase),phase);
});

test('q041 collecting only the book leaves the unvisited borrower at home and transfers the book only on finish',()=>{
 for(const legacy of [false,true]){const g=loadQ041(q041Engine({legacy}).save()),v=()=>g.state.stories.q041.values;assert.deepEqual(projectGame(g).dialog.scene.cast,[]);
  assert.ok(g.dispatch({type:'choose',id:'recover'}));drain(g);assert.equal(v().bookAt,'party');assert.equal(v().borrowerAt,'resident');assert.equal(v().clerkAt,'registry');assert.deepEqual(g.state.stories.q041.knowledge.party??[],[]);
  go(g,data.quests.q041.story.worldPlaces.registry);drain(g);assert.equal(v().bookAt,'party');assert.deepEqual(projectGame(g).dialog.scene.cast,[]);assert.equal(v().finished,false);chooseQ041(g,'finish');assert.equal(v().bookAt,'registry');assert.equal(v().registered,false);assert.equal(v().leaseRenewed,false);assert.equal(v().borrowerAt,'resident');
 }
});

test('q041 returning the book preserves both clerk locations and never escorts the clerk from the room implicitly',()=>{
 for(const legacy of [false,true])for(const invited of [false,true]){const g=loadQ041(q041Engine({legacy}).save()),v=()=>g.state.stories.q041.values;
  chooseQ041(g,'visit');assert.deepEqual(g.state.stories.q041.knowledge.party,['truth']);assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['q041_borrower']);
  if(invited){chooseQ041(g,'registry');assert.equal(v().borrowerAt,'resident');assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['q041_clerk']);chooseQ041(g,'escort');assert.equal(v().clerkAt,'resident');assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['q041_borrower','q041_clerk']);}
  chooseQ041(g,invited?'temporary':'deadline');assert.equal(v().bookAt,'entry');assert.equal(v().borrowerAt,'entry');assert.equal(v().clerkAt,invited?'resident':'registry');assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['q041_borrower']);
  assert.ok(g.dispatch({type:'choose',id:'return'}));drain(g);assert.equal(v().bookAt,'borrower');assert.equal(v().borrowerAt,'transit');assert.equal(v().leaseRenewed,false);loadQ041(g.save());
  go(g,data.quests.q041.story.worldPlaces.registry);drain(g);assert.equal(v().bookAt,'borrower');assert.equal(v().clerkAt,invited?'resident':'registry');assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['q041_borrower']);
  chooseQ041(g,'finish');assert.equal(v().bookAt,'registry');assert.equal(v().leaseRenewed,true);assert.equal(v().registered,false);assert.equal(v().clerkAt,invited?'resident':'registry');
 }
});

test('q041 registering residence escorts both people but keeps the book at its original shelf',()=>{
 for(const legacy of [false,true]){const g=loadQ041(q041Engine({legacy}).save()),v=()=>g.state.stories.q041.values;
  for(const id of ['visit','registry','escort'])chooseQ041(g,id);
  assert.ok(g.dispatch({type:'choose',id:'rewrite'}));drain(g);assert.equal(v().borrowerAt,'transit');assert.equal(v().clerkAt,'transit');assert.equal(v().bookAt,'entry');assert.equal(v().registered,false);
  go(g,data.quests.q041.story.worldPlaces.registry);drain(g);assert.equal(v().borrowerAt,'registry');assert.equal(v().clerkAt,'registry');assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['q041_borrower','q041_clerk']);assert.equal(v().registered,false);
  chooseQ041(g,'finish');assert.equal(v().registered,true);assert.equal(v().bookAt,'entry');assert.equal(v().leaseRenewed,false);
 }
});

test('q041 all four routes retain their three distinct one-time rewards and inventory',()=>{
 const rewards={contract:[125,75],compromise:[68,75],informed:[105,100]};
 for(const legacy of [false,true])for(const route of q041Routes){const g=loadQ041(q041Engine({legacy}).save()),gold=g.state.gold,inventory=structuredClone(g.state.inventory),members=[...g.state.members];let count=0;const award=g.award.bind(g);g.award=(gp,xp,who)=>{assert.deepEqual([gp,xp],rewards[route.outcome]);count++;return award(gp,xp,who);};
  for(const id of route.path){assert.equal(count,0);chooseQ041(g,id);}assert.equal(g.state.quests.q041.outcome,route.outcome);assert.equal(count,1);assert.equal(g.state.gold,gold+rewards[route.outcome][0]);assert.deepEqual(g.state.inventory,inventory);assert.deepEqual(g.state.members,members);
  const raw=g.save();assert.throws(()=>g.complete('q041',route.outcome));assert.equal(g.save(),raw);g.run(data.quests.q041.model.entryScript);drain(g);assert.equal(count,1);
 }
});

test('q041 accepted pre-relocation saves keep three original scenes and all four direct paths',()=>{
 for(const route of q041AcceptedRoutes){const g=loadQ041(q041AcceptedEngine().save());let rewards=0;const award=g.award.bind(g);g.award=(gold,xp,who)=>{assert.deepEqual([gold,xp],[acceptedReward(route.outcome).gold,acceptedReward(route.outcome).xp]);rewards++;return award(gold,xp,who);};for(const id of route.path){loadQ041(g.save());assert.ok(g.dispatch({type:'choose',id}));drain(g);assert.equal(g.state.journey,null);assert.equal(g.state.stories.q041,undefined);assert.equal(projectGame(g).dialog?.scene,undefined);checkpoint(g);}assert.equal(g.state.quests.q041.outcome,route.outcome);assert.equal(rewards,1);loadQ041(g.save());}
});
const acceptedReward=outcome=>data.previousQuestRoutes.q041.outcomes[outcome];

test('q041 browser checkpoints include both clerk-location variants in new and previous saves and three old scenes',async()=>{
 const r=await borrowerArtFixtures();assert.equal(r.fixtures.length,23);assert.equal(r.outcomes.length,3);assert.equal(new Set(r.fixtures.map(f=>f.scene+'/'+f.variant)).size,23);assert.equal(r.fixtures.filter(f=>f.absentStoryScene).length,3);
 for(const f of r.fixtures){const d=projectGame(loadQ041(f.save)).dialog;assert.equal(d.text,f.expectedText);if(f.absentStoryScene)assert.equal(d.scene,undefined);else assert.deepEqual(d.scene.cast.map(c=>c.id),f.cast);}
});
