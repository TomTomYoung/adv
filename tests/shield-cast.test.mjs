import test from 'node:test';
import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {data,ready,start,choose,go,drain} from './royal-helpers.mjs';
import {beforeShield,shieldArtFixtures} from '../tools/shield-art-fixtures.mjs';

test('q162 changes only the four character references and scene casts',()=>{
 const quest=structuredClone(data.quests.q162);
 for(const key of ['eld','niece','survivors','helpers']){
  assert.equal(quest.story.entities[key].character,'q162_'+key);
  delete quest.story.entities[key].character;
 }
 for(const scene of Object.values(quest.story.scenes))scene.cast=[];
 assert.deepEqual(quest,beforeShield);
});

test('q162 restores current, pre-cast and legacy saves with all choices, text and matching cast',()=>{
 const {fixtures,outcomes}=shieldArtFixtures();
 assert.deepEqual(outcomes.sort(),['e2/q162/ceremony','e2/q162/return','e2/q162/workshop']);
 const game=new GameEngine(data);
 for(const [generation,count] of [['current',21],['previous',21],['accepted-legacy',6]]){
  const cases=fixtures.filter(f=>f.variant.startsWith(generation+'-'));
  assert.equal(cases.length,count);
  for(const f of cases){
   game.load(f.save);
   assert.deepEqual(JSON.parse(game.save()),JSON.parse(f.save));
   const dialog=projectGame(game).dialog;
   assert.equal(dialog.text,f.expectedText);
   assert.deepEqual(dialog.scene?.cast.map(c=>c.id)??[],f.cast);
   if(f.absentStoryScene)assert.equal(dialog.scene,undefined);
   assert.ok(dialog.options.find(o=>o.id===f.availableChoice).enabled);
   for(const id of f.blockedChoices){
    const before=game.save();assert.equal(game.dispatch({type:'choose',id}),false);assert.equal(game.save(),before);
   }
  }
 }
});

test('q162 interrupted rescue resumes with both groups only after arrival on the assisted route',()=>{
 const game=ready();start(game,'q162');
 for(const step of ['borrow','help','return'])choose(game,'q162',step);
 assert.ok(game.dispatch({type:'choose',id:'rescue'}));drain(game);
 const oldSave=game.save(),loaded=new GameEngine(data);loaded.load(oldSave);loaded.random=()=>.999999;
 const values=()=>loaded.state.stories.q162.values;
 assert.equal(values().helpersAt,'transit');assert.equal(values().survivorsAt,'transit');assert.equal(values().shieldAt,'party');
 assert.equal(loaded.dispatch({type:'story.resume',quest:'q162'}),false);
 go(loaded,data.quests.q162.story.worldPlaces.bank);
 if(loaded.state.journey)assert.ok(loaded.dispatch({type:'story.resume',quest:'q162'}));
 drain(loaded);
 assert.equal(values().helpersAt,'bank');assert.equal(values().survivorsAt,'bank');
 assert.deepEqual(projectGame(loaded).dialog.scene.cast.map(c=>c.id),['q162_survivors','q162_helpers']);
 choose(loaded,'q162','ceremony');assert.deepEqual(projectGame(loaded).dialog.scene.cast.map(c=>c.id),['q162_niece']);
 choose(loaded,'q162','workshop');assert.equal(values().shieldAt,'party');choose(loaded,'q162','finish');
 assert.equal(values().shieldAt,'niece');assert.equal(values().helpersAt,'bank');
});
