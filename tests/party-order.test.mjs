import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,data,drain} from './helpers.mjs';
import {projectGame} from '../src/application/projection.js';
import {validateSave} from '../src/core/save.js';
const move=(g,group,actor,direction)=>g.dispatch({type:'party.order',group,actor,direction});
const reserve=g=>projectGame(g).roster.filter(a=>!a.active).map(a=>a.id);
const resources=g=>JSON.stringify({actors:g.state.actors,inventory:g.state.inventory,carried:g.state.carried,gear:g.state.gear,gold:g.state.gold,steps:g.state.steps,rng:g.state.rng});

test('party order changes the real member order and all projected card lists, retaining resources and saves',()=>{
  const g=newGame(),original=[...g.state.members],waiting=reserve(g),before=resources(g);
  assert.ok(move(g,'party',original[1],'up'));assert.deepEqual(g.state.members,[original[1],original[0],...original.slice(2)]);
  const m=projectGame(g);assert.deepEqual(m.party.map(a=>a.id),g.state.members);assert.deepEqual(m.shop[0].recipients.map(a=>a.actor),g.state.members);assert.deepEqual(reserve(g),waiting);
  const order=[...g.state.members];g.load(g.save());assert.deepEqual(g.state.members,order);assert.equal(resources(g),before);
  assert.ok(move(g,'party',original[1],'down'));assert.deepEqual(g.state.members,original);
});

test('tavern order skips active members, persists independently, and survives joining and leaving',()=>{
  const g=newGame();g.dispatch({type:'party',action:'leave',actor:'nio'});
  const party=[...g.state.members],waiting=reserve(g),before=resources(g);
  assert.ok(move(g,'tavern',waiting[1],'up'));const reordered=[waiting[1],waiting[0],...waiting.slice(2)];assert.deepEqual(reserve(g),reordered);assert.deepEqual(g.state.members,party);assert.equal(resources(g),before);
  g.load(g.save());assert.deepEqual(reserve(g),reordered);
  assert.ok(g.dispatch({type:'party',action:'join',actor:waiting[1]}));assert.deepEqual(reserve(g),reordered.filter(id=>id!==waiting[1]));
  assert.ok(g.dispatch({type:'party',action:'leave',actor:waiting[1]}));assert.deepEqual(reserve(g),reordered);
});

test('boundaries, wrong groups, missing actors and busy or dungeon state cannot reorder lists',()=>{
  const g=newGame(),party=[...g.state.members],waiting=reserve(g),before=resources(g);
  for(const args of [['party',party[0],'up'],['party',party.at(-1),'down'],['tavern',waiting[0],'up'],['tavern',waiting.at(-1),'down'],['party',waiting[0],'up'],['tavern',party[0],'down'],['other',party[1],'up'],['party','unknown','up'],['party',party[1],'sideways']])assert.equal(move(g,...args),false);
  assert.deepEqual(g.state.members,party);assert.deepEqual(reserve(g),waiting);assert.equal(resources(g),before);
  g.run('item.ration');assert.ok(g.state.waiting);assert.equal(move(g,'party',party[1],'up'),false);drain(g);
  g.dispatch({type:'travel',dungeon:'kagaribi'});assert.equal(move(g,'party',party[1],'up'),false);
  g.startBattle('wild_pair_1',{win:[],lose:[],escape:[]});assert.equal(move(g,'party',party[1],'up'),false);assert.deepEqual(g.state.members,party);
});

test('saves accept an absent optional roster order and reject malformed lists before replacing current state',()=>{
  const g=newGame(),save=JSON.parse(g.save()),initial=reserve(g);delete save.state.rosterOrder;g.load(JSON.stringify(save));assert.deepEqual(reserve(g),initial);
  const valid=[...data.game.tavern.candidates],before=g.save();
  for(const invalid of [null,{},[],valid.slice(1),[...valid,valid[0]],valid.map((id,i)=>i===0?'unknown':id),valid.map((id,i)=>i===0?valid[1]:id)]){
    const broken=structuredClone(save);broken.state.rosterOrder=invalid;assert.ok(validateSave(broken,data).includes('酒場の並び順不正'));assert.throws(()=>g.load(JSON.stringify(broken)));assert.equal(g.save(),before);
  }
});
