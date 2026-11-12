import test from 'node:test';
import assert from 'node:assert/strict';
import {projectGame} from '../src/application/projection.js';
import {data,go,drain,checkpoint} from './library-helpers.mjs';
import {previousQ042,q042Routes,q042AcceptedRoutes,q042Cast,q042Engine,q042AcceptedEngine,loadQ042,chooseQ042,hourglassArtFixtures} from '../tools/hourglass-art-fixtures.mjs';

test('q042 preserves every shipped field except three character links, six casts and two fixed locations',()=>{
 const q=structuredClone(data.quests.q042);assert.equal(q.story.revision,2);assert.equal(q.model.edition.revision,2);
 assert.deepEqual(q.model.storyUpgrades,[{fromRevision:1,toRevision:2,previous:previousQ042.story,values:[{key:'craftspersonAt',value:'entry'},{key:'managerAt',value:'entry'}]}]);
 for(const id of ['craftsperson','manager','reliefCrew']){assert.equal(q.story.entities[id].character,'q042_'+id);assert.equal(data.characters['q042_'+id].portrait,undefined);assert.equal(data.characters['q042_'+id].sprite,undefined);}
 for(const id of ['craftsperson','manager']){assert.deepEqual(q.story.registry[id+'At'].values,['entry']);delete q.story.entities[id];delete q.story.registry[id+'At'];}
 delete q.story.entities.reliefCrew.character;assert.equal(Object.values(q.story.scenes).filter(s=>s.cast.length).length,6);for(const s of Object.values(q.story.scenes))s.cast=[];
 delete q.model.storyUpgrades;q.story.revision=q.model.edition.revision=1;assert.deepEqual(q,previousQ042);
});

test('q042 current and previous saves resume all nine scenes and eight journeys with only fixed-location migration',()=>{
 const scenes=new Set(),journeys=new Set(),phases=new Set();
 const observe=g=>{const raw=g.save(),now=loadQ042(raw),before=projectGame(g).dialog,after=projectGame(now).dialog;assert.equal(g.save(),raw);assert.equal(after?.text,before?.text);assert.deepEqual(after?.options,before?.options);
  phases.add(g.state.journey?'journey':g.state.quests.q042.stage==='completed'?'completed':g.state.waiting?.type);
  if(g.state.stories.q042.scene)scenes.add(g.state.stories.q042.scene);if(after?.scene)assert.deepEqual(after.scene.cast.map(c=>c.id),q042Cast(now.state.stories.q042.scene,now.state.stories.q042.events));
  if(now.state.journey){const a=data.quests.q042.story.actions[now.state.journey.action],v=now.state.stories.q042.values;journeys.add(now.state.journey.action);assert.equal(now.state.stories.q042.scene,null);assert.equal(after?.scene,undefined);assert.equal(now.dispatch({type:'story.resume',quest:'q042'}),false);for(const who of a.journey.companions)assert.equal(v[who+'At'],'transit');now.random=()=>.999999;go(now,data.quests.q042.story.worldPlaces[a.journey.to]);drain(now);checkpoint(now);assert.equal(now.state.journey,null);for(const who of a.journey.companions)assert.equal(now.state.stories.q042.values[who+'At'],a.journey.to);}
 };
 for(const legacy of [false,true])for(const route of q042Routes){const g=q042Engine({legacy});observe(g);for(const id of route.path){assert.ok(g.dispatch({type:'choose',id}));observe(g);drain(g);observe(g);if(g.state.journey){const a=g.data.quests.q042.story.actions[g.state.journey.action];go(g,g.data.quests.q042.story.worldPlaces[a.journey.to]);observe(g);drain(g);observe(g);}}assert.equal(g.state.quests.q042.outcome,route.outcome);}
 assert.equal(scenes.size,9);assert.equal(journeys.size,8);for(const phase of ['text','choice','journey','completed'])assert.ok(phases.has(phase),phase);
});

test('q042 only the explicit test in front of the manager displays that person, preserving existing shifted timing',()=>{
 for(const legacy of [false,true])for(const inFront of [false,true]){const g=loadQ042(q042Engine({legacy}).save()),v=()=>g.state.stories.q042.values;
  assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['q042_craftsperson']);assert.deepEqual(g.state.stories.q042.knowledge.party??[],[]);
  if(inFront){chooseQ042(g,'outside');assert.equal(v().outsideChecked,false);assert.deepEqual(projectGame(g).dialog.scene.cast,[]);assert.equal(v().managerAt,'entry');assert.equal(v().craftspersonAt,'entry');chooseQ042(g,'tell');assert.equal(v().outsideChecked,true);assert.equal(v().shifted,false);assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['q042_manager']);}
  chooseQ042(g,inFront?'sand':'sample');assert.deepEqual(g.state.stories.q042.knowledge.party,['truth']);assert.equal(v().shifted,inFront);assert.equal(v().hoursRecorded,false);assert.equal(v().reliefCrewAt,'relief');assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),inFront?['q042_manager']:[]);loadQ042(g.save());
 }
});

test('q042 relief crew leaves the shelf only on escort and recording finishes only after arrival',()=>{
 for(const legacy of [false,true]){const g=loadQ042(q042Engine({legacy}).save()),v=()=>g.state.stories.q042.values;
  for(const id of ['sample','hours'])chooseQ042(g,id);assert.equal(v().hoursRecorded,false);assert.equal(v().shifted,false);assert.deepEqual(projectGame(g).dialog.scene.cast,[]);
  chooseQ042(g,'call');assert.equal(v().reliefCrewAt,'relief');assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['q042_reliefCrew']);
  assert.ok(g.dispatch({type:'choose',id:'escort'}));drain(g);assert.equal(v().reliefCrewAt,'transit');assert.equal(v().managerAt,'entry');assert.equal(v().craftspersonAt,'entry');assert.equal(v().hoursRecorded,false);assert.equal(v().shifted,false);assert.equal(g.dispatch({type:'story.resume',quest:'q042'}),false);loadQ042(g.save());
  go(g,data.quests.q042.story.worldPlaces.entry);drain(g);assert.equal(v().reliefCrewAt,'entry');assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['q042_reliefCrew','q042_manager']);assert.equal(v().hoursRecorded,false);assert.equal(v().shifted,false);
  chooseQ042(g,'finish');assert.equal(v().hoursRecorded,true);assert.equal(v().shifted,true);assert.equal(v().twoClocks,false);assert.equal(v().broken,false);loadQ042(g.save());
 }
});

test('q042 two-clock contracts and breaking the glass do not invent escorts, measurement or a scripted battle',()=>{
 for(const legacy of [false,true]){const g=loadQ042(q042Engine({legacy}).save()),v=()=>g.state.stories.q042.values;
  for(const id of ['sample','two'])chooseQ042(g,id);assert.equal(v().twoClocks,false);assert.equal(v().hoursRecorded,false);assert.deepEqual(projectGame(g).dialog.scene.cast,[]);assert.equal(v().reliefCrewAt,'relief');
  chooseQ042(g,'agree');assert.equal(v().twoClocks,false);assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['q042_manager']);chooseQ042(g,'finish');assert.equal(v().twoClocks,true);assert.equal(v().shifted,false);assert.equal(v().reliefCrewAt,'relief');
  const broken=loadQ042(q042Engine({legacy}).save()),battles=broken.state.records.battles;chooseQ042(broken,'break');assert.equal(broken.state.records.battles,battles);assert.equal(broken.state.battle,null);const bv=broken.state.stories.q042.values;assert.equal(bv.broken,true);for(const key of ['shifted','twoClocks','hoursRecorded','outsideChecked'])assert.equal(bv[key],false);assert.equal(bv.reliefCrewAt,'relief');
 }
});

test('q042 all six routes retain their three distinct one-time rewards and inventory',()=>{
 const rewards={contract:[125,75],compromise:[68,75],informed:[105,100]};
 for(const legacy of [false,true])for(const route of q042Routes){const g=loadQ042(q042Engine({legacy}).save()),gold=g.state.gold,inventory=structuredClone(g.state.inventory),members=[...g.state.members];let count=0;const award=g.award.bind(g);g.award=(gp,xp,who)=>{assert.deepEqual([gp,xp],rewards[route.outcome]);count++;return award(gp,xp,who);};
  for(const id of route.path){assert.equal(count,0);chooseQ042(g,id);}assert.equal(g.state.quests.q042.outcome,route.outcome);assert.equal(count,1);assert.equal(g.state.gold,gold+rewards[route.outcome][0]);assert.deepEqual(g.state.inventory,inventory);assert.deepEqual(g.state.members,members);
  const raw=g.save();assert.throws(()=>g.complete('q042',route.outcome));assert.equal(g.save(),raw);g.run(data.quests.q042.model.entryScript);drain(g);assert.equal(count,1);
 }
});

test('q042 accepted pre-relocation saves keep three original scenes and all six direct paths',()=>{
 for(const route of q042AcceptedRoutes){const g=loadQ042(q042AcceptedEngine().save());let rewards=0;const award=g.award.bind(g);g.award=(gold,xp,who)=>{assert.deepEqual([gold,xp],[acceptedReward(route.outcome).gold,acceptedReward(route.outcome).xp]);rewards++;return award(gold,xp,who);};for(const id of route.path){loadQ042(g.save());assert.ok(g.dispatch({type:'choose',id}));drain(g);assert.equal(g.state.journey,null);assert.equal(g.state.stories.q042,undefined);assert.equal(projectGame(g).dialog?.scene,undefined);checkpoint(g);}assert.equal(g.state.quests.q042.outcome,route.outcome);assert.equal(rewards,1);loadQ042(g.save());}
});
const acceptedReward=outcome=>data.previousQuestRoutes.q042.outcomes[outcome];

test('q042 rejects invalid old and new saves without mutating the receiving game',()=>{
 const g=q042Engine(),raw=g.save(),old=q042Engine({legacy:true}).save();
 for(const input of [raw,old])for(const mutate of [s=>s.stories.q042.values.reliefCrewAt='missing',s=>s.stories.q042.revision=3,s=>(s.flags.legacyStoryRoutes??={}).q042=true]){const saved=JSON.parse(input);mutate(saved.state);assert.throws(()=>g.load(JSON.stringify(saved)));assert.equal(g.save(),raw);}
 for(const key of ['craftspersonAt','managerAt'])for(const value of [undefined,'clock','relief','transit']){const saved=JSON.parse(raw);if(value===undefined)delete saved.state.stories.q042.values[key];else saved.state.stories.q042.values[key]=value;assert.throws(()=>g.load(JSON.stringify(saved)));assert.equal(g.save(),raw);}
});

test('q042 browser checkpoints cover both sand appearances, timing variants and all three old scenes',async()=>{
 const r=await hourglassArtFixtures();assert.equal(r.fixtures.length,37);assert.equal(r.outcomes.length,3);assert.equal(new Set(r.fixtures.map(f=>f.scene+'/'+f.variant)).size,37);assert.equal(r.fixtures.filter(f=>f.absentStoryScene).length,3);
 for(const f of r.fixtures){const g=loadQ042(f.save),d=projectGame(g).dialog;assert.equal(d.text,f.expectedText);if(f.absentStoryScene)assert.equal(d.scene,undefined);else assert.deepEqual(d.scene.cast.map(c=>c.id),f.cast);}
});
