import test from 'node:test';
import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {data,choose,go,drain,checkpoint} from './machine-helpers.mjs';
import {previousQ173,q173Routes,q173Cast,q173Engine,q173AcceptedEngine,nightSoldierArtFixtures} from '../tools/night-soldier-art-fixtures.mjs';

test('q173 adds only two character bindings and casts, preserving prose, consent, routes, rewards and save revision',()=>{
 const q=structuredClone(data.quests.q173);delete q.story.entities.tera.character;delete q.story.entities.spiritPerson.character;
 for(const s of Object.values(q.story.scenes))s.cast=[];
 assert.deepEqual(q,previousQ173);assert.equal(q.story.revision,1);
 assert.deepEqual(Object.keys(q.story.entities).sort(),['party','spiritPerson','tera']);
 for(const id of ['q173_tera','q173_spirit']){assert.equal(data.characters[id].portrait,undefined);assert.equal(data.characters[id].sprite,undefined);}
});

test('q173 current and previous saves preserve all scenes, journeys and three endings without premature arrivals or duplicate rewards',()=>{
 const scenes=new Set(),journeys=new Set(),outcomes=new Set();
 function observe(g){
  const raw=g.save(),n=new GameEngine(data);n.load(raw);assert.equal(n.save(),raw);checkpoint(n);
  assert.deepEqual(n.state.stories.q173,g.state.stories.q173);
  const story=n.state.stories.q173;assert.equal(story.values.teraAt,'home');
  if(n.state.journey){
   journeys.add(n.state.journey.action);assert.equal(story.scene,null);assert.equal(story.values.partyAt,'transit');
   assert.equal(story.values.spiritPersonAt,['spirit_guest','spirit_copy'].includes(n.state.journey.action)?'transit':'grave');
   assert.equal(projectGame(n).dialog?.scene,undefined);assert.equal(n.dispatch({type:'story.resume',quest:'q173'}),false);
  }else if(story.scene&&n.state.quests.q173.stage!=='completed'){
   const shown=projectGame(n).dialog?.scene;if(shown){scenes.add(story.scene);assert.deepEqual(shown.cast.map(c=>c.id),q173Cast(story.scene));}
   assert.equal(story.values.spiritPersonAt,['guest_agree','copy_home','copy_later'].includes(story.scene)?'home':'grave');
  }
 }
 for(const legacy of [false,true])for(const route of q173Routes){
  const g=q173Engine({legacy}),members=[...g.state.members];let rewards=0;const award=g.award.bind(g);
  g.award=(gold,xp)=>{assert.deepEqual([gold,xp],[141,93]);rewards++;return award(gold,xp);};observe(g);
  for(const id of route.path){
   assert.ok(g.dispatch({type:'choose',id}));observe(g);drain(g);observe(g);
   if(g.state.journey){const a=g.data.quests.q173.story.actions[g.state.journey.action];go(g,g.data.quests.q173.story.worldPlaces[a.journey.to]);drain(g);observe(g);}
  }
  assert.equal(g.state.quests.q173.outcome,route.outcome);outcomes.add(route.outcome);assert.equal(rewards,1);assert.deepEqual(g.state.members,members);
  const raw=g.save();assert.throws(()=>g.complete('q173',route.outcome));assert.equal(g.save(),raw);g.run(data.quests.q173.model.entryScript);drain(g);assert.equal(rewards,1);
 }
 assert.deepEqual([...scenes].sort(),Object.keys(data.quests.q173.story.scenes).sort());
 assert.deepEqual([...journeys].sort(),Object.entries(data.quests.q173.story.actions).filter(([,a])=>a.journey).map(([id])=>id).sort());
 assert.deepEqual([...outcomes].sort(),['copy','guest','part']);
});

test('q173 a visible spirit is not consent: the guest choice stays blocked until Tera is heard',()=>{
 for(const legacy of [false,true]){
  const old=q173Engine({legacy});for(const id of ['visit','spirit'])choose(old,'q173',id);
  const g=new GameEngine(data);g.load(old.save());g.random=()=>.999999;
  assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['q173_spirit']);
  assert.equal(g.state.stories.q173.values.bothAgreed,false);assert.equal(g.dispatch({type:'choose',id:'guest'}),false);
  for(const id of ['wife','return','guest'])choose(g,'q173',id);
  assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['q173_tera','q173_spirit']);
  assert.equal(g.state.stories.q173.values.bothAgreed,false);choose(g,'q173','finish');assert.equal(g.state.stories.q173.values.bothAgreed,true);
 }
});

test('q173 browser fixtures cover 19 current, previous and legacy states, including both consent states',async()=>{
 const r=await nightSoldierArtFixtures();assert.equal(r.fixtures.length,19);assert.equal(r.outcomes.length,3);
 assert.equal(r.fixtures.filter(f=>f.blockedChoice==='guest').length,2);
 assert.equal(r.fixtures.filter(f=>f.absentStoryScene).length,1);
 for(const f of r.fixtures){const g=new GameEngine(data);g.load(f.save);checkpoint(g);if(!f.absentStoryScene)assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),f.cast);}
});

test('q173 routes accepted before relocation keep all three old endings without new cast or journeys',()=>{
 for(const [outcome,path] of [['guest',['wife','guest']],['part',['spirit','part']],['copy',['spirit','copy']]]){
  const old=q173AcceptedEngine(),g=new GameEngine(data);g.load(old.save());g.random=()=>.999999;checkpoint(g);
  assert.equal(g.state.flags.legacyStoryRoutes.q173,true);assert.equal(projectGame(g).dialog.scene,undefined);
  for(const id of path){assert.ok(g.dispatch({type:'choose',id}));drain(g);checkpoint(g);assert.equal(g.state.journey,null);assert.equal(g.state.stories.q173,undefined);}
  assert.equal(g.state.quests.q173.outcome,outcome);
 }
});
