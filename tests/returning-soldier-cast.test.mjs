import test from 'node:test';
import assert from 'node:assert/strict';
import {projectGame} from '../src/application/projection.js';
import {data,go,drain,checkpoint} from './royal-helpers.mjs';
import {previousQ188,q188Routes,q188AcceptedRoutes,q188Cast,q188Engine,q188AcceptedEngine,loadQ188,chooseQ188,returningSoldierArtFixtures} from '../tools/returning-soldier-art-fixtures.mjs';

test('q188 adds three character links and ten casts while preserving prose, revision, all actions and four endings',()=>{
 const q=structuredClone(data.quests.q188);assert.equal(q.story.revision,1);assert.equal(q.model.edition.revision,1);assert.equal(q.model.storyUpgrades,undefined);
 for(const id of ['soldier','wife','brother']){assert.equal(q.story.entities[id].character,'q188_'+id);delete q.story.entities[id].character;assert.equal(data.characters['q188_'+id].portrait,undefined);assert.equal(data.characters['q188_'+id].sprite,undefined);}
 assert.equal(Object.values(q.story.scenes).filter(s=>s.cast.length).length,10);for(const s of Object.values(q.story.scenes))s.cast=[];assert.deepEqual(q,previousQ188);
});

test('q188 current and previous saves resume every scene and all nine journeys without changing dialogue, choices or state',()=>{
 const scenes=new Set(),journeys=new Set(),phases=new Set();
 const observe=g=>{const raw=g.save(),now=loadQ188(raw),before=projectGame(g).dialog,after=projectGame(now).dialog;assert.equal(now.save(),raw);assert.equal(g.save(),raw);assert.equal(after?.text,before?.text);assert.deepEqual(after?.options,before?.options);
  phases.add(g.state.journey?'journey':g.state.quests.q188.stage==='completed'?'completed':g.state.waiting?.type);
  if(g.state.stories.q188.scene)scenes.add(g.state.stories.q188.scene);if(after?.scene)assert.deepEqual(after.scene.cast.map(c=>c.id),q188Cast(now.state.stories.q188.scene));
  if(now.state.journey){const a=data.quests.q188.story.actions[now.state.journey.action],v=now.state.stories.q188.values;journeys.add(now.state.journey.action);assert.equal(now.state.stories.q188.scene,null);assert.equal(after?.scene,undefined);assert.equal(now.dispatch({type:'story.resume',quest:'q188'}),false);for(const who of a.journey.companions)assert.equal(v[who+'At'],'transit');now.random=()=>.999999;go(now,data.quests.q188.story.worldPlaces[a.journey.to]);drain(now);checkpoint(now);assert.equal(now.state.journey,null);for(const who of a.journey.companions)assert.equal(now.state.stories.q188.values[who+'At'],a.journey.to);}
 };
 for(const legacy of [false,true])for(const route of q188Routes){const g=q188Engine({legacy});observe(g);for(const id of route.path){assert.ok(g.dispatch({type:'choose',id}));observe(g);drain(g);observe(g);if(g.state.journey){const a=g.data.quests.q188.story.actions[g.state.journey.action];go(g,g.data.quests.q188.story.worldPlaces[a.journey.to]);observe(g);drain(g);observe(g);}}assert.equal(g.state.quests.q188.outcome,route.outcome);}
 assert.equal(scenes.size,10);assert.equal(journeys.size,9);for(const phase of ['text','choice','journey','completed'])assert.ok(phases.has(phase),phase);
});

test('q188 separate conversations leave the wife and brother in their actual rooms, including the separate-home ending',()=>{
 for(const legacy of [false,true])for(const outcome of ['old','share','apart']){const g=loadQ188(q188Engine({legacy}).save()),v=()=>g.state.stories.q188.values;
  const locations=expected=>{for(const [id,place]of Object.entries(expected))assert.equal(v()[id+'At'],place,id);assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),q188Cast(g.state.stories.q188.scene));};
  locations({soldier:'entry',wife:'home',brother:'home'});assert.equal(v().arrived,false);
  chooseQ188(g,'escort');locations({soldier:'home',wife:'home',brother:'home'});assert.equal(v().arrived,true);
  chooseQ188(g,'talk');locations({soldier:'room',wife:'room',brother:'home'});
  chooseQ188(g,'next');locations({soldier:'home',wife:'room',brother:'home'});
  chooseQ188(g,'talk');locations({soldier:'backroom',wife:'room',brother:'backroom'});
  chooseQ188(g,outcome);locations(outcome==='apart'?{soldier:'lodging',wife:'room',brother:'backroom'}:{soldier:'room',wife:'room',brother:'room'});
  if(outcome!=='apart'){chooseQ188(g,'gather');locations({soldier:'home',wife:'home',brother:'home'});}assert.equal(v().resolution,'pending');chooseQ188(g,'finish');assert.equal(v().resolution,outcome);
 }
});

test('q188 safe arrival alone and all family choices receive the same one-time reward with no inventory or party changes',()=>{
 for(const legacy of [false,true])for(const route of q188Routes){const g=loadQ188(q188Engine({legacy}).save()),gold=g.state.gold,inventory=structuredClone(g.state.inventory),members=[...g.state.members];let rewards=0;const award=g.award.bind(g);g.award=(gp,xp,who)=>{assert.deepEqual([gp,xp],[153,99]);rewards++;return award(gp,xp,who);};
  for(const [i,id]of route.path.entries()){assert.equal(rewards,0);chooseQ188(g,id);if(i<route.path.length-1)assert.equal(g.state.quests.q188.stage,'active');}
  assert.equal(g.state.quests.q188.outcome,route.outcome);assert.equal(g.state.gold,gold+153);assert.equal(rewards,1);assert.equal(g.state.stories.q188.values.arrived,true);assert.deepEqual(g.state.inventory,inventory);assert.deepEqual(g.state.members,members);
  const raw=g.save();assert.throws(()=>g.complete('q188',route.outcome));assert.equal(g.save(),raw);g.run(data.quests.q188.model.entryScript);drain(g);assert.equal(rewards,1);
 }
});

test('q188 pre-relocation accepted saves keep the original two scenes and four direct endings',()=>{
 for(const route of q188AcceptedRoutes){const g=loadQ188(q188AcceptedEngine().save());let rewards=0;const award=g.award.bind(g);g.award=(gold,xp,who)=>{assert.deepEqual([gold,xp],[153,99]);rewards++;return award(gold,xp,who);};for(const id of route.path){loadQ188(g.save());assert.ok(g.dispatch({type:'choose',id}));drain(g);assert.equal(g.state.journey,null);assert.equal(g.state.stories.q188,undefined);assert.equal(projectGame(g).dialog?.scene,undefined);checkpoint(g);}assert.equal(g.state.quests.q188.outcome,route.outcome);assert.equal(rewards,1);loadQ188(g.save());}
});

test('q188 browser checkpoints cover ten scenes in new and previous saves and both accepted legacy scenes',async()=>{
 const r=await returningSoldierArtFixtures();assert.equal(r.fixtures.length,22);assert.equal(r.outcomes.length,4);assert.equal(new Set(r.fixtures.map(f=>f.scene+'/'+f.variant)).size,22);assert.equal(r.fixtures.filter(f=>f.absentStoryScene).length,2);
 for(const f of r.fixtures){const d=projectGame(loadQ188(f.save)).dialog;assert.equal(d.text,f.expectedText);if(f.absentStoryScene)assert.equal(d.scene,undefined);else assert.deepEqual(d.scene.cast.map(c=>c.id),f.cast);}
});
