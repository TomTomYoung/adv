import test from 'node:test';
import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {data,ready,start,go,choose,drain} from './royal-helpers.mjs';
import {beforeLocksmith,locksmithArtFixtures,locksmithRoutes} from '../tools/locksmith-art-fixtures.mjs';

const ids=['q163_som','q163_owner'];
const beforeData={...data,quests:{...data.quests,q163:beforeLocksmith},scripts:{...data.scripts,...beforeLocksmith.scripts}};
function restore(content,save){
 const game=new GameEngine(content);game.load(save);game.random=()=>.999999;return game;
}
test('q163 binds only the two witnesses in the eight existing scenes',()=>{
 const quest=structuredClone(data.quests.q163);
 for(const entity of ['som','owner']){
  assert.equal(quest.story.entities[entity].character,'q163_'+entity);
  assert.equal(data.characters['q163_'+entity].sprite,'npc_q163_'+entity);
  delete quest.story.entities[entity].character;
 }
 assert.equal(Object.keys(quest.story.scenes).length,8);
 for(const scene of Object.values(quest.story.scenes)){
  assert.deepEqual(scene.cast.map(c=>c.entity),['som','owner']);scene.cast=[];
 }
 assert.deepEqual(quest,beforeLocksmith);
});

test('q163 current, pre-cast and accepted legacy saves restore the same text and choices',()=>{
 const {fixtures,outcomes}=locksmithArtFixtures();
 assert.equal(fixtures.length,18);
 assert.deepEqual(outcomes.sort(),['e2/q163/later','e2/q163/repair','e2/q163/repay']);
 for(const f of fixtures){
  const game=restore(data,f.save),dialog=projectGame(game).dialog;
  assert.equal(game.save(),f.save);assert.equal(dialog.text,f.expectedText);
  assert.ok(dialog.options.find(o=>o.id===f.availableChoice).enabled);
  if(f.absentStoryScene){
   assert.equal(dialog.scene,undefined);assert.equal(game.state.stories.q163,undefined);
   assert.equal(game.state.flags.legacyStoryRoutes.q163,true);
  }else assert.deepEqual(dialog.scene.cast.map(c=>c.id),ids);
 }
});

test('q163 all four routes preserve the previous actions, repair, outcomes and rewards',()=>{
 const initial=ready();start(initial,'q163');const entry=initial.save();
 for(const route of locksmithRoutes){
  const previous=restore(beforeData,entry),current=restore(data,entry);
  for(const step of route.choices){
   choose(previous,'q163',step);choose(current,'q163',step);
   assert.equal(current.save(),previous.save());
   assert.equal(current.state.stories.q163.values.goodsAt,'vault');
  }
  assert.equal(current.state.quests.q163.outcome,route.outcome);
  assert.equal(current.state.stories.q163.values.repaired,route.outcome!=='later');
  assert.equal(current.accept('q163'),false);
  const completed=current.save();
  assert.throws(()=>current.complete('q163',route.outcome));assert.equal(current.save(),completed);
  current.run(data.quests.q163.model.entryScript);drain(current);
  assert.equal(projectGame(current).dialog?.scene,undefined);
 }
});

test('q163 all four journeys restore in transit and show both witnesses only on arrival',()=>{
 const initial=ready();start(initial,'q163');const entry=initial.save(),checked=new Set();
 for(const route of locksmithRoutes.filter(r=>r.outcome!=='later')){
  const previous=restore(beforeData,entry);
  for(const step of route.choices){
   const story=previous.state.stories.q163;
   const key=story.scene+'_'+step,action=beforeLocksmith.story.actions[key];
   if(action.journey){
    const departed=restore(beforeData,previous.save());
    assert.ok(departed.dispatch({type:'choose',id:step}));drain(departed);
    const current=restore(data,departed.save());
    assert.equal(current.save(),departed.save());
    assert.equal(current.state.journey.action,key);
    assert.equal(current.state.stories.q163.scene,null);
    assert.equal(projectGame(current).dialog?.scene,undefined);
    for(const holder of ['somAt','ownerAt','partyAt'])assert.equal(current.state.stories.q163.values[holder],'transit');
    assert.equal(current.state.stories.q163.values.goodsAt,'vault');
    assert.equal(current.dispatch({type:'story.resume',quest:'q163'}),false);
    go(current,data.quests.q163.story.worldPlaces[action.journey.to]);
    if(current.state.journey)assert.ok(current.dispatch({type:'story.resume',quest:'q163'}));
    drain(current);
    for(const holder of ['somAt','ownerAt','partyAt'])assert.equal(current.state.stories.q163.values[holder],action.journey.to);
    assert.equal(current.state.stories.q163.values.goodsAt,'vault');
    assert.deepEqual(projectGame(current).dialog.scene.cast.map(c=>c.id),ids);
    checked.add(key);
   }
   choose(previous,'q163',step);
  }
 }
 assert.deepEqual([...checked].sort(),['checked_repair_return','checked_repay_return','entry_new','repay_agree']);
});
