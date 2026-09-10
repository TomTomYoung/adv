import test from 'node:test';
import assert from 'node:assert/strict';
import {data,newGame,drain,fight,exploreSpot,maintainParty} from './helpers.mjs';
import {validateSave} from '../src/core/save.js';

for(const outcome of ['informed','contract','compromise'])test(`walk all 100 quests to the ${outcome} outcome (real maps/events/commands)`,()=>{
  const g=newGame(1907);
  // Scenario coverage fixture isolates reachability and continuation behavior from combat balance.
  g.award(0,data.system.xpBase*24*25);g.state.gold=5000;g.state.inventory.rope=99;g.healAll();
  for(const quest of Object.values(data.quests).filter(q=>q.number<=100)){
    if(g.state.mode==='dungeon')g.dispatch({type:'retreat'});
    assert.ok(g.dispatch({type:'accept',id:quest.id}),quest.id+' must unlock');g.healAll();
    if(outcome==='informed')for(const spot of quest.locations.slice(0,2)){exploreSpot(g,spot,{heal:true});assert.equal(g.state.quests[quest.id].stage,'active');}
    exploreSpot(g,quest.locations[2],{heal:true});assert.equal(g.state.waiting?.type,'choice',quest.id);
    const checkpoint=g.save();g.load(checkpoint);assert.ok(g.dispatch({type:'choose',id:outcome}),quest.id);drain(g);if(g.state.battle){g.load(g.save());fight(g);}drain(g);
    assert.equal(g.state.quests[quest.id].stage,'completed',quest.id);assert.equal(g.state.quests[quest.id].outcome,outcome,quest.id);assert.equal(g.state.vm.length,0,quest.id+' continuation drained');
  }
  assert.equal(g.state.vars.completed,100);assert.ok(g.state.ending);assert.deepEqual(validateSave(JSON.parse(g.save()),data),[]);
});
test('a new unmodified party can investigate the first quest, return, rest and recruit',()=>{
  const g=newGame(4);g.dispatch({type:'accept',id:'q001'});
  for(const spot of data.quests.q001.locations.slice(0,2))exploreSpot(g,spot);
  exploreSpot(g,data.quests.q001.locations[2]);assert.ok(g.dispatch({type:'choose',id:'informed'}));drain(g);assert.equal(g.state.quests.q001.stage,'completed');g.dispatch({type:'retreat'});g.dispatch({type:'service',id:'inn'});drain(g);assert.equal(g.state.actors.ada.hp,g.stats('ada').hp);g.dispatch({type:'service',id:'recruit'});drain(g);g.dispatch({type:'choose',id:'join'});drain(g);assert.equal(g.state.members.length,5);g.dispatch({type:'service',id:'recruit'});drain(g);assert.equal(g.state.members.length,5);
});
test('full 100-quest campaign is completable from normal starting stats and earned resources',()=>{
  const g=newGame(4);
  for(const q of Object.values(data.quests).filter(q=>q.number<=100)){
    if(g.state.mode==='dungeon')g.dispatch({type:'retreat'});
    g.dispatch({type:'service',id:'inn'});drain(g);
    for(const [item,min] of [['rope',1],['antidote',3],['potion',4],['ration',3]])while((g.state.inventory[item]??0)<min&&g.dispatch({type:'buy',item}));
    assert.ok(g.dispatch({type:'accept',id:q.id}),q.id);
    for(const spot of q.locations.slice(0,2))exploreSpot(g,spot,{maintain:true});
    maintainParty(g);exploreSpot(g,q.locations[2],{maintain:true});
    assert.ok(g.dispatch({type:'choose',id:'informed'}),q.id);drain(g);if(g.state.battle)fight(g);drain(g);
    assert.equal(g.state.quests[q.id].stage,'completed',q.id+' completed without debug healing');
  }
  assert.equal(g.state.vars.completed,100);assert.ok(g.state.ending);assert.ok(g.state.gold>=0);
});
