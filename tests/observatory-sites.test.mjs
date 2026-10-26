import test from 'node:test';
import assert from 'node:assert/strict';
import {read} from '../tools/audit-regional-relocation.mjs';
import {data,ready,go,walk,checkpoint,drain} from './royal-helpers.mjs';
const numbers=[...Array.from({length:10},(_,i)=>81+i),...Array.from({length:10},(_,i)=>181+i)];
test('eight observatory sites allow free registered round trips and rescue pockets restore real breath',()=>{
 const g=ready();g.state.gold=0;g.state.light=0;for(const k of Object.keys(g.state.inventory))g.state.inventory[k]=0;
 for(const dungeon of ['observatory_sites','observatory_rescue'])for(const map of data.dungeons[dungeon].maps){
  go(g,{kind:'dungeon',dungeon,map,x:1,y:1});assert.equal(g.state.worldTravel.returnAnchor,'oddland_village');
  if(dungeon==='observatory_rescue'){assert.equal(g.state.dungeons.active.systems.air.air,64);walk(g,2,1);assert.equal(g.state.dungeons.active.systems.air.air,63);walk(g,7,3);assert.equal(g.state.dungeons.active.systems.air.air,64);walk(g,13,7);assert.equal(g.state.dungeons.active.systems.air.air,64);}
  checkpoint(g);go(g,{kind:'town',location:'royal_board'});checkpoint(g);
 }
 assert.equal(g.state.gold,0);assert.equal(g.state.light,0);
});
for(const dungeon of ['observatory_sites','observatory_rescue'])for(const kind of ['mark','defeat'])test(`${dungeon}/${kind}: return keeps the village anchor and reloads`,()=>{
 const g=ready();go(g,{kind:'dungeon',dungeon,map:data.dungeons[dungeon].maps[0],x:7,y:3});if(kind==='mark')assert.ok(g.dispatch({type:'retreat'}));else g.defeat();drain(g);assert.equal(g.state.townLocation,'oddland_village');checkpoint(g);
});
for(const phase of ['east','west'])test(`all original-floor story destinations remain walkable with the native ${phase} terrain`,()=>{
 const g=ready();go(g,{kind:'dungeon',dungeon:'region_9',map:'region_9_f1',x:1,y:2});
 const c=data.dungeons.region_9.systems.terrain.controls[0];if(phase==='west')assert.ok(g.dispatch({type:'dungeon.action',system:'terrain',action:'shift',target:c.id,phase}));drain(g);
 const terrain=structuredClone(g.state.dungeons.persistent.region_9.systems.terrain);
 for(let n=81;n<=90;n++)for(const p of Object.values(data.quests['q0'+n].story.worldPlaces))if(p.dungeon==='region_9')go(g,p);
 go(g,{kind:'town',location:'royal_board'});assert.deepEqual(g.state.dungeons.persistent.region_9.systems.terrain,terrain);checkpoint(g);
});
test('all twenty identities, unlocks, outcomes and rewards remain intact; the expanded edition has eighty-two maps and twenty dungeon definitions',async()=>{
 for(const n of numbers){const id='q'+String(n).padStart(3,'0'),old=await read('data/quests/'+id+'.json'),q=data.quests[id];for(const key of ['id','number','region','title','requires','outcomes'])assert.deepEqual(q[key],old[key],id+'/'+key);assert.equal(q.settlement,'oddland_village');assert.deepEqual(q.receptionLocations,['royal_board']);assert.equal(q.model.preserveAcceptedRoute,true);}
 assert.equal(Object.keys(data.maps).length,82);assert.equal(Object.keys(data.dungeons).length,20);assert.equal(Object.keys(data.quests).length,300);assert.equal(data.scenarioEditions.editions.e2.saveRevision,2);
});
