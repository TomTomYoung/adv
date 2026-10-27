import test from 'node:test';
import assert from 'node:assert/strict';
import {loadContent} from '../src/core/loader.js';
import {data,ready,go,drain,checkpoint,read} from './machine-helpers.mjs';
const maps=['outskirts','cemetery','valley'].map(s=>'e2_salome_'+s);
test('three outside paths join Salome without adding a dungeon definition or touching the initial edition',async()=>{
 assert.equal(Object.keys(data.maps).length,86);assert.equal(Object.keys(data.dungeons).length,20);assert.equal(Object.keys(data.quests).length,300);assert.equal(data.scenarioEditions.editions.e2.saveRevision,2);assert.equal(data.worldTravel.version,2);
 const old=await read('tests/fixtures/e2-geography-before-machine.json');for(const [id,map] of Object.entries(old.additions.maps)){
  // The later outdoor theme is presentation metadata; all previous geography stays exact.
  const {outdoor,...current}=data.maps[id];assert.equal(outdoor,id.slice(3));assert.deepEqual({...current,objects:[]},map);
 }
 const g=ready();g.state.gold=0;g.state.light=0;g.state.expedition.lamp.fuel=0;g.state.expedition.reserve=0;for(const key of Object.keys(g.state.inventory))g.state.inventory[key]=0;
 for(const map of maps){go(g,{kind:'dungeon',dungeon:'salome_road',map,x:15,y:7});checkpoint(g);go(g,{kind:'town',location:'e2_academy'});checkpoint(g);}assert.equal(g.state.gold,0);assert.equal(g.state.light,0);assert.equal(g.state.battle,null);
 const first=await loadContent(read);assert.equal(Object.keys(first.maps).length,56);assert.equal(Object.keys(first.dungeons).length,13);assert.equal(Object.keys(first.quests).length,210);for(const map of maps)assert.equal(first.maps[map],undefined);
});
for(const map of maps)for(const exit of ['mark','defeat'])test(`${map}/${exit}: a new excursion returns to Salome with power state untouched`,()=>{
 const g=ready();go(g,{kind:'town',location:'e2_academy'});const power=structuredClone(g.state.dungeons.persistent.region_8);go(g,{kind:'dungeon',dungeon:'salome_road',map,x:15,y:7});checkpoint(g);if(exit==='mark')assert.ok(g.dispatch({type:'retreat'}));else g.defeat();drain(g);assert.equal(g.state.townLocation,'e2_academy');assert.deepEqual(g.state.dungeons.persistent.region_8,power);checkpoint(g);
});
