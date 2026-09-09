import test from 'node:test';
import assert from 'node:assert/strict';
import {data,newGame,drain,exploreSpot} from './helpers.mjs';
import {GameEngine} from '../src/core/engine.js';
import {activeActor} from '../src/core/battle.js';
import {projectGame} from '../src/application/projection.js';
import {validateSave} from '../src/core/save.js';
import {simulateBalance} from '../tools/simulate-balance.mjs';

test('tavern swaps are atomic and preserve wounds, poison, MP and equipment across saves',()=>{
  const g=newGame();g.state.inventory.iron_sword=1;assert.ok(g.dispatch({type:'equip',actor:'ada',item:'iron_sword'}));g.state.actors.ada.hp=9;g.state.actors.ada.mp=1;g.state.actors.ada.statuses=['poison'];const original=structuredClone(g.state.actors.ada);
  assert.ok(g.dispatch({type:'party',action:'join',actor:'toma'}));assert.equal(g.dispatch({type:'party',action:'join',actor:'toma'}),false);assert.equal(g.dispatch({type:'party',action:'join',actor:'berg'}),false);
  assert.ok(g.dispatch({type:'party',action:'swap',actor:'berg',replace:'ada'}));g.load(g.save());assert.deepEqual(g.state.actors.ada,original);assert.ok(g.dispatch({type:'party',action:'swap',actor:'ada',replace:'berg'}));assert.deepEqual(g.state.actors.ada,original);
  for(const id of [...g.state.members].filter(id=>id!=='ada'))assert.ok(g.dispatch({type:'party',action:'leave',actor:id}));assert.equal(g.dispatch({type:'party',action:'leave',actor:'ada'}),false);
  g.state.actors.mica.hp=0;assert.equal(g.dispatch({type:'party',action:'swap',actor:'mica',replace:'ada'}),false);
  g.dispatch({type:'travel',region:1});assert.equal(g.dispatch({type:'party',action:'join',actor:'nio'}),false);
});
test('reserve equipment never disappears when inventory is full and view data cannot change the roster',()=>{
  const g=newGame();g.state.inventory.mail=1;g.dispatch({type:'equip',actor:'ada',item:'mail'});g.dispatch({type:'party',action:'leave',actor:'ada'});g.state.inventory.mail=99;
  assert.equal(g.dispatch({type:'unequip',actor:'ada',slot:'body'}),false);const slot=Object.keys(g.state.actors.ada.equipment)[0];assert.equal(g.dispatch({type:'unequip',actor:'ada',slot}),false);g.state.inventory.mail=98;assert.ok(g.dispatch({type:'unequip',actor:'ada',slot}));assert.equal(g.state.inventory.mail,99);assert.deepEqual(g.state.actors.ada.equipment,{});
  const vm=projectGame(g);assert.equal(vm.roster.length,10);assert.ok(vm.roster.every(a=>a.portrait));vm.roster[0].stats.hp=999;vm.roster[0].equipmentSlots.push({});assert.notEqual(g.stats('ada').hp,999);
});
test('legacy 1.0 saves migrate at text, choice and battle waits without losing progress',()=>{
  for(const mode of ['text','choice','battle']){
    const g=newGame(72);g.dispatch({type:'accept',id:'q001'});
    if(mode==='text')g.run('q001.clue_a');
    if(mode==='choice')exploreSpot(g,data.quests.q001.locations[2]);
    if(mode==='battle'){exploreSpot(g,data.quests.q001.locations[2]);g.dispatch({type:'choose',id:'contract'});drain(g);}
    const saved=JSON.parse(g.save());saved.contentVersion=saved.state.contentVersion='1.0.0';for(const id of ['luka','toma','mica','dora','ren'])delete saved.state.actors[id];
    const expected=structuredClone(saved.state),next=newGame();next.load(JSON.stringify(saved));assert.equal(next.state.contentVersion,'1.1.0');assert.deepEqual(next.state.waiting,expected.waiting);assert.deepEqual(next.state.vm,expected.vm);assert.deepEqual(next.state.battle,expected.battle);assert.equal(next.state.rng,expected.rng);assert.deepEqual(next.state.actors.ada,expected.actors.ada);assert.equal(Object.keys(next.state.actors).length,10);assert.deepEqual(validateSave(JSON.parse(next.save()),data),[]);
    const corrupt=structuredClone(saved);corrupt.state.actors.ada.hp=-1;const before=next.save();assert.throws(()=>next.load(JSON.stringify(corrupt)));assert.equal(next.save(),before);
  }
});
test('group healing skips the fallen, group guard covers the party, and MP recovery cannot multiply MP',()=>{
  const g=newGame();g.state.members=['toma','dora','ren'];g.state.actors.dora.hp=0;g.state.actors.toma.hp=8;g.state.actors.ren.hp=8;g.startBattle('wild_bone_whale',{win:[],lose:[],escape:[]});
  assert.equal(activeActor(g),'ren');const total=g.state.members.reduce((n,id)=>n+g.state.actors[id].mp,0);g.dispatch({type:'battle',action:'skill',skill:'inspire',target:'ren'});assert.equal(g.state.members.reduce((n,id)=>n+g.state.actors[id].mp,0),total-3);
  assert.equal(activeActor(g),'toma');g.dispatch({type:'battle',action:'skill',skill:'group_heal'});assert.equal(g.state.actors.dora.hp,0);assert.ok(g.state.actors.toma.hp>8);assert.ok(g.state.actors.ren.hp>8);
  const shield=newGame();shield.state.members=['dora','ada'];shield.startBattle('wild_bone_whale',{win:[],lose:[],escape:[]});shield.state.battle.acted=['ada'];shield.state.battle.enemies[0].stats.agi=0;const before=shield.state.actors.ada.hp;shield.dispatch({type:'battle',action:'skill',skill:'party_guard'});assert.ok(shield.state.actors.ada.hp<before);assert.ok(before-shield.state.actors.ada.hp<=4);assert.deepEqual(shield.state.battle.guards,[]);
});
test('MP draining never changes the saved battle replay',()=>{
  const g=newGame(119);g.dispatch({type:'travel',region:3});const copy=newGame();copy.load(g.save());
  for(const map of Object.values(data.maps)){assert.ok(map.encounterPool.length>=3);for(const e of map.encounterPool)assert.ok(data.encounters[e.encounter]);}
  g.startBattle('wild_book_silverfish',{win:[],lose:[],escape:[]});copy.startBattle('wild_book_silverfish',{win:[],lose:[],escape:[]});
  for(let i=0;i<4;i++){const id=activeActor(g);g.dispatch({type:'battle',action:'skill',skill:'guard',target:id});copy.dispatch({type:'battle',action:'skill',skill:'guard',target:id});}assert.equal(g.save(),copy.save());assert.equal(g.state.members.reduce((n,id)=>n+g.state.actors[id].mp,0),data.game.initial.members.reduce((n,id)=>n+data.actors[id].stats.mp,0)-4);
});

test('weighted encounters stay inside each map pool and reproduce after loading',()=>{
  const content=structuredClone(data),map=content.maps.region_3_f2;map.encounterRate=1;map.objects=[];
  const seen=new Set();
  for(let seed=1;seed<=40;seed++){
    const g=new GameEngine(content,(seed*2654435761)>>>0);drain(g);g.dispatch({type:'travel',region:3});
    let spot;for(let y=1;y<map.tiles.length-1&&!spot;y++)for(let x=1;x<map.tiles[y].length-2;x++)if(map.tiles[y][x]==='.'&&map.tiles[y][x+1]==='.'){spot={map:map.id,x,y,facing:'east'};break;}
    g.state.location=spot;g.state.steps=content.system.encounterCheckSteps-1;const copy=new GameEngine(content);copy.load(g.save());
    assert.ok(g.dispatch({type:'move',direction:'forward'}));assert.ok(copy.dispatch({type:'move',direction:'forward'}));assert.ok(g.state.battle);assert.equal(g.save(),copy.save());
    const id=g.state.battle.encounter;assert.ok(map.encounterPool.some(e=>e.encounter===id));seen.add(id);
  }
  assert.equal(seen.size,map.encounterPool.length);
});
test('all new species and pairs pass the planned encounter budget for both reference parties',()=>{
  const report=simulateBalance(data);assert.equal(report.battles,1200);assert.ok(report.passed,JSON.stringify(report.results.filter(r=>r.wins!==20||r.maxRounds>10||r.medianRounds>6)));
});
