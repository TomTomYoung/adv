import test from 'node:test';
import assert from 'node:assert/strict';
import {data,newGame,drain,fight,exploreSpot,maintainParty,goTownLocation} from './helpers.mjs';
import {routeTo,finishJourney} from './structure-routes.mjs';
import {dungeonActionPlan} from '../src/core/dungeons.js';
import {validateSave} from '../src/core/save.js';

test('a new unmodified party can investigate the first quest, return, rest and recruit',()=>{
  const g=newGame(4);g.dispatch({type:'accept',id:'q001'});
  exploreSpot(g,data.quests.q001.locations.find(l=>l.role==='decision'));for(const id of ['talk','inspect','follow','support','home','report','repair']){assert.ok(g.dispatch({type:'choose',id}));drain(g);finishJourney(g);if(g.state.battle)fight(g);}assert.equal(g.state.quests.q001.stage,'completed');g.dispatch({type:'retreat'});goTownLocation(g,'hikarigaeri_tavern');g.dispatch({type:'service',id:'inn'});drain(g);assert.equal(g.state.actors.ada.hp,g.stats('ada').hp);g.dispatch({type:'service',id:'recruit'});drain(g);g.dispatch({type:'choose',id:'join'});drain(g);assert.equal(g.state.members.length,5);g.dispatch({type:'service',id:'recruit'});drain(g);assert.equal(g.state.members.length,5);
});
// Encounter changes can raise market alarm while a previously planned route
// is being walked. Deal with visible guards through the normal fight action.
function clearMarketGuards(g){
 if(g.state.dungeons.active?.id!=='region_6')return;
 for(const guard of data.dungeons.region_6.systems.market.guards){
  const p=g.state.location,dx=guard.x-p.x,dy=guard.y-p.y;
  if(guard.map!==p.map||Math.abs(dx)+Math.abs(dy)>1)continue;
  const facing=dx>0?'east':dx<0?'west':dy>0?'south':dy<0?'north':p.facing;
  while(g.state.location.facing!==facing)assert.ok(g.dispatch({type:'move',direction:'right'}));
  const intent={type:'dungeon.action',system:'market',action:'fight',target:guard.id};
  if(dungeonActionPlan(g.data,g.state,intent).ok){assert.ok(g.dispatch(intent));fight(g);maintainParty(g);assert.ok(g.state.dungeons.active.systems.market.cleared.includes(guard.id));}
 }
}
test('full 100-quest campaign is completable from normal starting stats and earned resources',()=>{
  const g=newGame(4);
  for(const q of Object.values(data.quests).filter(q=>q.number<=100)){
    if(g.state.mode==='dungeon')g.dispatch({type:'retreat'});
    goTownLocation(g,'hikarigaeri_tavern');g.dispatch({type:'service',id:'inn'});drain(g);goTownLocation(g,'hikarigaeri_shop');
    for(const [item,min] of [['rope',1],['antidote',3],['potion',4],['ration',3]])while((g.state.inventory[item]??0)<min&&g.dispatch({type:'buy',item}));
    assert.ok(g.dispatch({type:'accept',id:q.id}),q.id);
    maintainParty(g);exploreSpot(g,q.locations.find(l=>l.role==='decision'),{maintain:true,beforeStep:clearMarketGuards});
    for(const id of routeTo(q.id,'informed')){assert.ok(g.dispatch({type:'choose',id}),q.id+'/'+id);drain(g);if(g.state.battle)fight(g);drain(g);finishJourney(g);if(g.state.battle)fight(g);}
    assert.equal(g.state.quests[q.id].stage,'completed',q.id+' completed without debug healing');
  }
  assert.equal(g.state.vars.completed,100);assert.ok(g.state.ending);assert.ok(g.state.gold>=0);
});
