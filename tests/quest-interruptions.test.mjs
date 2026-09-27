import test from 'node:test';
import assert from 'node:assert/strict';
import {data,drain,fight,goWorldLocation} from './helpers.mjs';
import {prepareQuest,finishJourney} from './structure-routes.mjs';
import {projectGame} from '../src/application/projection.js';
import {compileQuestInterruptions} from '../tools/build-quest-interruptions.mjs';
import {restoreGame} from '../src/application/restore.js';

const choose=(g,id)=>{assert.ok(g.dispatch({type:'choose',id}),id);drain(g);};
const roundtrip=g=>{const saved=g.save();g.load(saved);assert.equal(g.save(),saved);};
const progress=g=>structuredClone({stories:g.state.stories,quests:g.state.quests,gold:g.state.gold,inventory:g.state.inventory,records:g.state.records});

test('all quest scripts omit shared pause and compiling explicit shortages is idempotent',()=>{
 for(const q of Object.values(data.quests)){
  assert.doesNotMatch(JSON.stringify(q.scripts),/"id":"pause"|ここで中断し、同じ場面から再開する/);
  assert.deepEqual(compileQuestInterruptions(structuredClone(q),data.items),q,q.id);
  const rebuilt=structuredClone(q);
  for(const id of rebuilt.model.interruptionEntries??[])rebuilt.scripts[id].commands=rebuilt.scripts[id].commands[0].default;
  assert.deepEqual(compileQuestInterruptions(rebuilt,data.items),q,`${q.id}: regenerated entry`);
  for(const r of q.model.interruptionRoutes??[]){
   assert.ok(Object.keys(r.cost).length);assert.ok(Object.values(r.cost).every(n=>Number.isInteger(n)&&n>0));
   assert.ok(q.scripts[r.shortage]&&q.scripts[r.resume]&&q.scripts[r.from]);
   assert.ok(q.scripts[r.resume].commands.some(c=>c.op==='jump'&&c.script===r.from));
  }
 }
});

test('q002 missing rope has a non-paying exit, a saved resume route and actual return to the site',()=>{
 const g=prepareQuest('q002');g.state.inventory.rope=0;
 const before=progress(g);assert.equal(g.dispatch({type:'choose',id:'lift'}),false);
 assert.equal(projectGame(g).dialog.cancelId,undefined);
 assert.ok(g.dispatch({type:'choose',id:'lift_supplies'}));
 assert.match(g.state.waiting.text,/補修用の縄1個が足りない/);assert.deepEqual(progress(g),before);roundtrip(g);
 drain(g);assert.equal(g.state.waiting,null);assert.equal(g.state.vm.length,0);
 const pending=g.state.flags.questResume.q002;assert.equal(pending,'q002.v11.entry.lift.resume');roundtrip(g);
 assert.ok(g.returnTown());assert.equal(g.dispatch({type:'story.resume',quest:'q002'}),false);
 goWorldLocation(g,'hikarigaeri_shop');assert.ok(g.dispatch({type:'buy',item:'rope'}));
 const site=data.quests.q002.story.worldPlaces.landing;g.teleport(site.map,site.x,site.y);
 assert.ok(g.dispatch({type:'story.resume',quest:'q002'}));assert.match(g.state.waiting.text,/作業の続き/);roundtrip(g);
 assert.equal(g.state.flags.questResume.q002,null);drain(g);
 assert.equal(g.state.stories.q002.scene,'entry');choose(g,'lift');
 assert.equal(g.state.inventory.rope,0);assert.equal(g.state.stories.q002.values.boxAt,'party');roundtrip(g);
});

test('q004 money shortage resumes the inspection scene and pays only once after replenishing',()=>{
 const g=prepareQuest('q004');choose(g,'window');finishJourney(g);g.state.gold=0;
 const before=progress(g);choose(g,'fine_supplies');assert.deepEqual(progress(g),before);roundtrip(g);
 assert.equal(g.state.flags.questResume.q004,'q004.v11.duplicate.fine.resume');
 assert.ok(g.dispatch({type:'story.resume',quest:'q004'}));roundtrip(g);drain(g);
 choose(g,'fine_supplies');roundtrip(g);assert.equal(g.state.gold,0);
 g.state.gold=20;assert.ok(g.dispatch({type:'story.resume',quest:'q004'}));drain(g);choose(g,'fine');
 assert.equal(g.state.gold,0);assert.equal(g.state.flags.questResume.q004,null);roundtrip(g);
});

test('a combat job resumed after shortage commits cost only after victory',()=>{
 const g=prepareQuest('q006');g.state.inventory.rope=0;choose(g,'lift_supplies');roundtrip(g);
 g.give('rope',1);g.run(data.quests.q006.model.entryScript);roundtrip(g);drain(g);
 choose(g,'lift');assert.ok(g.state.battle);assert.equal(g.state.inventory.rope,1);roundtrip(g);
 fight(g);assert.equal(g.state.inventory.rope,0);assert.equal(g.state.flags.questResume.q006,null);roundtrip(g);
});

test('forged shortage routes and saves from before the choice removal are rejected',()=>{
 const g=prepareQuest('q002');g.state.inventory.rope=0;choose(g,'lift_supplies');const saved=g.save();
 for(const resume of ['missing','q004.v11.duplicate.fine.resume',42,{}]){
  const bad=JSON.parse(saved);bad.state.flags.questResume.q002=resume;
  assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),saved);
 }
 const bad=JSON.parse(saved);bad.contentVersion='1.23.0';bad.state.contentVersion='1.23.0';assert.equal(restoreGame(data,JSON.stringify(bad)).restarted,true);
});
