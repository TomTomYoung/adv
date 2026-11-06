import test from 'node:test';
import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {data,choose,go,drain,checkpoint} from './machine-helpers.mjs';
import {previousQ174,q174Routes,q174Cast,q174Engine,q174AcceptedEngine,funeralArtFixtures} from '../tools/funeral-art-fixtures.mjs';

test('q174 adds only two bindings and four casts, keeping prose, actions, items and save revision',()=>{
 const q=structuredClone(data.quests.q174);delete q.story.entities.daughterPerson.character;delete q.story.entities.injured.character;
 for(const s of Object.values(q.story.scenes))s.cast=[];
 assert.deepEqual(q,previousQ174);assert.equal(q.story.revision,1);
 assert.equal(q.story.entities.injured.kind,'group');assert.equal(q.story.entities.daughterPerson.kind,'person');
 assert.deepEqual(Object.keys(q.story.entities).sort(),['daughterPerson','injured','letterSheet','party']);
 for(const id of ['q174_daughter','q174_injured']){assert.equal(data.characters[id].portrait,undefined);assert.equal(data.characters[id].sprite,undefined);}
});

test('q174 current and previous saves retain every scene, journey and ending without escorting the daughter or duplicating rewards',()=>{
 const scenes=new Set(),journeys=new Set(),outcomes=new Set();
 function observe(g){
  const raw=g.save(),n=new GameEngine(data);n.load(raw);assert.equal(n.save(),raw);checkpoint(n);
  assert.deepEqual(n.state.stories.q174,g.state.stories.q174);
  const story=n.state.stories.q174;assert.equal(story.values.daughterPersonAt,'procession');
  if(n.state.journey){
   journeys.add(n.state.journey.action);assert.equal(story.scene,null);assert.equal(story.values.partyAt,'transit');
   assert.equal(story.values.injuredAt,n.state.journey.action==='onsite_people'?'transit':'procession');
   assert.equal(projectGame(n).dialog?.scene,undefined);assert.equal(n.dispatch({type:'story.resume',quest:'q174'}),false);
  }else if(story.scene&&n.state.quests.q174.stage!=='completed'){
   const shown=projectGame(n).dialog?.scene;if(shown){scenes.add(story.scene);assert.deepEqual(shown.cast.map(c=>c.id),q174Cast(story.scene));}
   assert.equal(story.values.injuredAt,story.scene==='rescued'?'rescue':'procession');
  }
 }
 for(const legacy of [false,true])for(const route of q174Routes){
  const g=q174Engine({legacy}),members=[...g.state.members];let rewards=0;const award=g.award.bind(g);
  g.award=(gold,xp)=>{assert.deepEqual([gold,xp],[141,93]);rewards++;return award(gold,xp);};observe(g);
  for(const id of route.path){
   assert.ok(g.dispatch({type:'choose',id}));observe(g);drain(g);observe(g);
   if(g.state.journey){const a=g.data.quests.q174.story.actions[g.state.journey.action];go(g,g.data.quests.q174.story.worldPlaces[a.journey.to]);drain(g);observe(g);}
  }
  const state=g.state.stories.q174.values;assert.equal(g.state.quests.q174.outcome,route.outcome);outcomes.add(route.outcome);assert.equal(rewards,1);assert.deepEqual(g.state.members,members);
  assert.equal(Boolean(state.mourned),route.outcome==='name');assert.equal(Boolean(state.coffinSealed),route.outcome==='seal');assert.equal(Boolean(state.rescued),route.outcome==='rescue');
  const raw=g.save();assert.throws(()=>g.complete('q174',route.outcome));assert.equal(g.save(),raw);g.run(data.quests.q174.model.entryScript);drain(g);assert.equal(rewards,1);
 }
 assert.deepEqual([...scenes].sort(),Object.keys(data.quests.q174.story.scenes).sort());
 assert.deepEqual([...journeys].sort(),Object.entries(data.quests.q174.story.actions).filter(([,a])=>a.journey).map(([id])=>id).sort());
 assert.deepEqual([...outcomes].sort(),['name','rescue','seal']);
});

test('q174 letter custody changes at departure and the final handover; other endings leave it in the hut',()=>{
 for(const legacy of [false,true]){
  const g=q174Engine({legacy});for(const id of ['visit','hut'])choose(g,'q174',id);
  assert.equal(g.state.stories.q174.values.letterSheetAt,'hut');assert.deepEqual(projectGame(g).dialog.scene.cast,[]);
  assert.ok(g.dispatch({type:'choose',id:'name'}));drain(g);assert.equal(g.state.stories.q174.values.letterSheetAt,'party');assert.ok(g.state.journey);
  const raw=g.save(),n=new GameEngine(data);n.load(raw);assert.equal(n.save(),raw);go(n,data.quests.q174.story.worldPlaces.procession);drain(n);
  assert.equal(n.state.stories.q174.values.letterSheetAt,'party');assert.deepEqual(projectGame(n).dialog.scene.cast.map(c=>c.id),['q174_daughter','q174_injured']);
  choose(n,'q174','finish');assert.equal(n.state.stories.q174.values.letterSheetAt,'procession');
  for(const action of ['seal','people']){const other=q174Engine({legacy});for(const id of ['visit',action,'finish'])choose(other,'q174',id);assert.equal(other.state.stories.q174.values.letterSheetAt,'hut');}
 }
});

test('q174 browser fixtures include all 13 current, prior and legacy states and three endings',async()=>{
 const r=await funeralArtFixtures();assert.equal(r.fixtures.length,13);assert.equal(r.outcomes.length,3);assert.equal(r.fixtures.filter(f=>f.absentStoryScene).length,1);
 for(const f of r.fixtures){const g=new GameEngine(data);g.load(f.save);checkpoint(g);if(!f.absentStoryScene)assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),f.cast);}
});

test('q174 pre-relocation accepted routes keep their three original endings without new cast or journeys',()=>{
 for(const [outcome,path] of [['name',['hut','name']],['seal',['seal']],['rescue',['people']]]){
  const old=q174AcceptedEngine(),g=new GameEngine(data);g.load(old.save());g.random=()=>.999999;checkpoint(g);
  assert.equal(g.state.flags.legacyStoryRoutes.q174,true);assert.equal(projectGame(g).dialog.scene,undefined);
  for(const id of path){assert.ok(g.dispatch({type:'choose',id}));drain(g);checkpoint(g);assert.equal(g.state.journey,null);assert.equal(g.state.stories.q174,undefined);}
  assert.equal(g.state.quests.q174.outcome,outcome);
 }
});
