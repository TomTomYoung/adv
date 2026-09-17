import test from 'node:test';
import assert from 'node:assert/strict';
import {data,newGame,drain,fight,exploreSpot,maintainParty} from './helpers.mjs';
import {routeTo,finishJourney} from './structure-routes.mjs';
import {validateSave} from '../src/core/save.js';

test('a new unmodified party can investigate the first quest, return, rest and recruit',()=>{
  const g=newGame(4);g.dispatch({type:'accept',id:'q001'});
  exploreSpot(g,data.quests.q001.locations.find(l=>l.role==='decision'));for(const id of ['talk','inspect','follow','support','call','home','repair']){assert.ok(g.dispatch({type:'choose',id}));drain(g);}assert.equal(g.state.quests.q001.stage,'completed');g.dispatch({type:'retreat'});g.dispatch({type:'service',id:'inn'});drain(g);assert.equal(g.state.actors.ada.hp,g.stats('ada').hp);g.dispatch({type:'service',id:'recruit'});drain(g);g.dispatch({type:'choose',id:'join'});drain(g);assert.equal(g.state.members.length,5);g.dispatch({type:'service',id:'recruit'});drain(g);assert.equal(g.state.members.length,5);
});
test('full 100-quest campaign is completable from normal starting stats and earned resources',()=>{
  const g=newGame(4);
  for(const q of Object.values(data.quests).filter(q=>q.number<=100)){
    if(g.state.mode==='dungeon')g.dispatch({type:'retreat'});
    g.dispatch({type:'service',id:'inn'});drain(g);
    for(const [item,min] of [['rope',1],['antidote',3],['potion',4],['ration',3]])while((g.state.inventory[item]??0)<min&&g.dispatch({type:'buy',item}));
    assert.ok(g.dispatch({type:'accept',id:q.id}),q.id);
    maintainParty(g);exploreSpot(g,q.locations.find(l=>l.role==='decision'),{maintain:true});
    for(const id of routeTo(q.id,'informed')){assert.ok(g.dispatch({type:'choose',id}),q.id+'/'+id);drain(g);if(g.state.battle)fight(g);drain(g);finishJourney(g);}
    assert.equal(g.state.quests[q.id].stage,'completed',q.id+' completed without debug healing');
  }
  assert.equal(g.state.vars.completed,100);assert.ok(g.state.ending);assert.ok(g.state.gold>=0);
});
