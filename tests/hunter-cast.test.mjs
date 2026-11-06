import test from 'node:test';
import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {data,choose,resolve,go,drain,checkpoint} from './machine-helpers.mjs';
import {resolveBattle} from '../tools/audit-regional-relocation.mjs';
import {previousQ175,q175Routes,q175Battles,q175Cast,q175Engine,q175AcceptedEngine,upgradeQ175,hunterArtFixtures} from '../tools/hunter-art-fixtures.mjs';

test('q175 adds only cast and a stationary, count-unspecified lookout with an explicit save upgrade',()=>{
 const q=structuredClone(data.quests.q175);
 assert.deepEqual(q.model.storyUpgrades,[{fromRevision:1,toRevision:2,previous:previousQ175.story,values:[{key:'lookoutAt',value:'warning_place'}]}]);
 assert.deepEqual(q.story.entities.lookout,{holder:'lookoutAt',kind:'group',character:'q175_lookout'});assert.deepEqual(q.story.registry.lookoutAt.values,['warning_place']);
 delete q.story.entities.lookout;delete q.story.registry.lookoutAt;delete q.story.entities.miro.character;delete q.story.entities.sister.character;delete q.model.storyUpgrades;
 for(const s of Object.values(q.story.scenes))s.cast=[];q.story.revision=q.model.edition.revision=1;
 assert.deepEqual(q,previousQ175);
 for(const id of ['q175_miro','q175_sister','q175_lookout']){assert.equal(data.characters[id].portrait,undefined);assert.equal(data.characters[id].sprite,undefined);}
});

test('q175 current and previous saves preserve all scenes, journeys, endings, companions and single rewards',()=>{
 const scenes=new Set(),journeys=new Set(),outcomes=new Set();
 function observe(g){
  const n=upgradeQ175(g.save()),story=n.state.stories.q175;assert.equal(story.values.lookoutAt,'warning_place');
  if(n.state.journey){
   journeys.add(n.state.journey.action);assert.equal(story.scene,null);assert.equal(story.values.partyAt,'transit');
   for(const id of ['miroAt','sisterAt'])assert.equal(story.values[id],n.state.journey.action==='entry_visit'?'lair':'transit');
   assert.equal(projectGame(n).dialog?.scene,undefined);assert.equal(n.dispatch({type:'story.resume',quest:'q175'}),false);
  }else if(story.scene&&n.state.quests.q175.stage!=='completed'){
   const shown=projectGame(n).dialog?.scene;if(shown){scenes.add(story.scene);assert.deepEqual(shown.cast.map(c=>c.id),q175Cast(story.scene));}
   for(const id of ['miroAt','sisterAt'])assert.equal(story.values[id],story.scene==='entry'?'lair':data.quests.q175.story.scenes[story.scene].place);
  }
 }
 for(const legacy of [false,true])for(const route of q175Routes){
  const g=q175Engine({legacy}),members=[...g.state.members];let rewards=0;const award=g.award.bind(g);
  g.award=(gold,xp,recipients)=>{if(recipients===undefined){assert.deepEqual([gold,xp],[141,93]);rewards++;}return award(gold,xp,recipients);};observe(g);
  for(const id of route.path){
   assert.ok(g.dispatch({type:'choose',id}));observe(g);drain(g);
   if(g.state.battle)resolve(g,'q175','win');
   if(g.state.journey){observe(g);const a=g.data.quests.q175.story.actions[g.state.journey.action];go(g,g.data.quests.q175.story.worldPlaces[a.journey.to]);drain(g);}observe(g);
  }
  assert.equal(g.state.quests.q175.outcome,route.outcome);outcomes.add(route.outcome);assert.equal(rewards,1);assert.deepEqual(g.state.members,members);
  const v=g.state.stories.q175.values;assert.equal(v.warned,route.outcome==='drive');assert.equal(v.defeated,route.outcome==='changed');
  const raw=g.save();assert.throws(()=>g.complete('q175',route.outcome));assert.equal(g.save(),raw);g.run(data.quests.q175.model.entryScript);drain(g);assert.equal(rewards,1);upgradeQ175(g.save());
 }
 assert.deepEqual([...scenes].sort(),Object.keys(data.quests.q175.story.scenes).sort());
 assert.deepEqual([...journeys].sort(),Object.entries(data.quests.q175.story.actions).filter(([,a])=>a.journey).map(([id])=>id).sort());
 assert.deepEqual([...outcomes].sort(),['changed','drive','front']);
});

test('q175 old in-battle saves keep fixed encounters and win, escape, defeat and retry semantics',()=>{
 for(const legacy of [false,true])for(const battle of q175Battles)for(const result of battle.escape?['win','escape','lose']:['win','lose']){
  const g=q175Engine({legacy});for(const id of battle.path)choose(g,'q175',id);choose(g,'q175',battle.choice,{combat:'pending'});
  const n=upgradeQ175(g.save());assert.equal(n.state.battle.encounter,battle.encounter);const members=[...n.state.members];
  assert.equal(data.encounters[battle.encounter].escape,battle.escape);if(!battle.escape){const saved=n.save();assert.equal(n.dispatch({type:'battle',action:'escape'}),false);assert.equal(n.save(),saved);}
  delete n.random;resolveBattle(n,result);checkpoint(n);n.random=()=>.999999;
  if(result!=='win'){
   const v=n.state.stories.q175.values;assert.equal(n.state.quests.q175.stage,'active');assert.equal(v.finished,false);assert.equal(v.defeated,false);assert.equal(v.reported,false);assert.equal(v.warned,false);
   assert.equal(v.miroAt,data.quests.q175.story.scenes[battle.scene].place);assert.equal(v.sisterAt,v.miroAt);assert.equal(v.lookoutAt,'warning_place');upgradeQ175(n.save());
   if(result==='lose'){assert.equal(n.state.townLocation,'e2_academy');assert.equal(projectGame(n).dialog?.scene,undefined);go(n,data.quests.q175.story.worldPlaces[v.miroAt]);assert.ok(n.dispatch({type:'story.resume',quest:'q175'}));drain(n);}
   assert.deepEqual(projectGame(n).dialog.scene.cast.map(c=>c.id),['q175_miro','q175_sister']);choose(n,'q175',battle.choice);
  }
  for(const id of battle.finish)choose(n,'q175',id);assert.equal(n.state.quests.q175.outcome,battle.scene==='onsite'?'front':'changed');assert.deepEqual(n.state.members,members);
 }
});

test('q175 lookout appears only during reports and migration rejects corrupted saves atomically',()=>{
 const old=q175Engine({legacy:true});for(const id of ['visit','fake','guide','pursue'])choose(old,'q175',id);
 const n=upgradeQ175(old.save());assert.deepEqual(projectGame(n).dialog.scene.cast.map(c=>c.id),['q175_miro','q175_sister']);
 choose(n,'q175','fight');assert.deepEqual(projectGame(n).dialog.scene.cast.map(c=>c.id),['q175_miro','q175_sister','q175_lookout']);
 const saved=n.save();for(const badPlace of ['lair','transit','entry']){const invalid=JSON.parse(saved);invalid.state.stories.q175.values.lookoutAt=badPlace;assert.throws(()=>n.load(JSON.stringify(invalid)));assert.equal(n.save(),saved);}
 for(const mutate of [s=>s.state.stories.q175.values.miroAt='unknown',s=>s.state.stories.q175.values.lookoutAt='warning_place']){const invalid=JSON.parse(old.save());mutate(invalid);assert.throws(()=>n.load(JSON.stringify(invalid)));assert.equal(n.save(),saved);}
 const again=new GameEngine(data);again.load(saved);assert.equal(again.save(),saved);
});

test('q175 browser fixtures cover 31 current, previous, combat-recovered and accepted-legacy states',async()=>{
 const r=await hunterArtFixtures();assert.equal(r.fixtures.length,31);assert.equal(r.outcomes.length,3);assert.equal(new Set(r.fixtures.map(f=>f.scene+'/'+f.variant)).size,31);
 for(const f of r.fixtures){const g=upgradeQ175(f.save);if(!f.absentStoryScene)assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),f.cast);}
});

test('q175 pre-relocation accepted routes retain their original three endings without new cast or journeys',()=>{
 for(const [outcome,path] of [['changed',['hidden','fight']],['drive',['fake','guide','warn']],['front',['front']]]){
  const old=q175AcceptedEngine(),g=upgradeQ175(old.save());g.random=()=>.999999;assert.equal(g.state.flags.legacyStoryRoutes.q175,true);assert.equal(projectGame(g).dialog.scene,undefined);
  for(const id of path){assert.ok(g.dispatch({type:'choose',id}));drain(g);if(g.state.battle){delete g.random;resolveBattle(g,'win');g.random=()=>.999999;}checkpoint(g);assert.equal(g.state.journey,null);assert.equal(g.state.stories.q175,undefined);}
  assert.equal(g.state.quests.q175.outcome,outcome);
 }
});
