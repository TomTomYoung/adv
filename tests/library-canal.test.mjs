import test from 'node:test';
import assert from 'node:assert/strict';
import {data,read,ready,go,walk,checkpoint,drain} from './library-helpers.mjs';
import {loadContent} from '../src/core/loader.js';
test('the quiet canal is a longer safe alternative with real round trips and unchanged older roads',async()=>{
 const before=await read('tests/fixtures/e2-geography-before-library-second.json');
 for(const id of ['e2_highland_lower','e2_highland_upper']){
  // The later outdoor theme does not change the older route's physical definition.
  const {outdoor,...current}=data.maps[id];assert.equal(outdoor,id.slice(3));assert.deepEqual({...current,objects:[]},before.additions.maps[id]);
 }
 assert.equal(Object.keys(data.maps).length,86);assert.equal(Object.keys(data.dungeons).length,20);assert.equal(Object.keys(data.quests).length,300);assert.equal(data.worldTravel.version,2);assert.equal(data.scenarioEditions.editions.e2.saveRevision,2);
 const g=ready();g.state.gold=0;g.state.light=0;g.state.expedition.lamp.fuel=0;g.state.expedition.reserve=0;for(const k of Object.keys(g.state.inventory))g.state.inventory[k]=0;
 go(g,{kind:'town',location:'e2_academy'});const begin=g.state.steps;assert.ok(g.dispatch({type:'world.cross',route:'salome_canal_city'}));drain(g);walk(g,15,5);const canalSteps=g.state.steps-begin;assert.ok(canalSteps>18);checkpoint(g);assert.ok(g.dispatch({type:'world.cross',route:'salome_canal_lower'}));drain(g);go(g,{kind:'town',location:'hikarigaeri_square'});checkpoint(g);
 go(g,{kind:'dungeon',dungeon:'salome_road',map:'e2_salome_canal',x:9,y:3});checkpoint(g);go(g,{kind:'town',location:'e2_academy'});assert.equal(g.state.gold,0);assert.equal(g.state.light,0);assert.equal(g.state.battle,null);
 const first=await loadContent(read);assert.equal(Object.keys(first.maps).length,56);assert.equal(Object.keys(first.quests).length,210);assert.equal(first.maps.e2_salome_canal,undefined);
});
for(const from of ['hikarigaeri_square','e2_academy'])for(const retreat of ['mark','defeat'])test(`canal ${from}/${retreat} returns to its actual departure settlement`,()=>{
 const g=ready();go(g,{kind:'town',location:from});go(g,{kind:'dungeon',dungeon:'salome_road',map:'e2_salome_canal',x:9,y:3});checkpoint(g);if(retreat==='mark')assert.ok(g.dispatch({type:'retreat'}));else g.defeat();drain(g);assert.equal(g.state.townLocation,from);checkpoint(g);
});
