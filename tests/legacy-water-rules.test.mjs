import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {data,newGame,drain,fight,exploreSpot} from './legacy-map-helpers.mjs';
import {finishJourney} from './structure-routes.mjs';
import {GameEngine} from '../src/core/engine.js';
import {restoreGame} from '../src/application/restore.js';
import {projectGame} from '../src/application/projection.js';
import {dungeonEncounter,dungeonFloodLevel} from '../src/core/dungeons.js';
import {fireContext,fireEnvironment} from '../src/core/systems/fire-network.js';
import {battleSkillPlan,activeActor} from '../src/core/battle.js';
import {wetAfterSkill,wetResistance} from '../src/core/wet.js';
import {validateSave} from '../src/core/save.js';
import {gearErrors} from '../src/core/equipment.js';
const action=(g,system,action,target,extra={})=>g.dispatch({type:'dungeon.action',system,action,target,...extra});
const choose=(g,...ids)=>{for(const id of ids){assert.ok(g.dispatch({type:'choose',id}),id);drain(g);finishJourney(g);}};
const enter=region=>{const g=newGame();g.dispatch({type:'travel',region});return g;};
const tickAt=level=>data.dungeons.region_1.systems.water.phases.slice(0,data.dungeons.region_1.systems.water.phases.findIndex(p=>p.level===level)).reduce((n,p)=>n+p.duration,0);
const setLevel=(g,level)=>{g.state.dungeons.active.systems.water.elapsed=tickAt(level);};
const roundtrip=g=>{const s=g.save();assert.deepEqual(validateSave(JSON.parse(s),g.data),[]);g.load(s);assert.equal(g.save(),s);};
const escape=g=>{g.random=()=>0;assert.ok(g.dispatch({type:'battle',action:'escape'}));drain(g);};
test('2D flooding is floor-wide, has ten internal levels and exactly three visual bands',()=>{
 const g=enter(1);
 for(let level=1;level<=9;level++){setLevel(g,level);const vm=projectGame(g).dungeon,depth=level<=3?1:level<=6?2:3;for(const row of vm.cells)for(const c of row)if(!c.wall)assert.equal(c.waterDepth,depth);assert.equal(g.walkable(g.map(),2,1),level<6);roundtrip(g);}
});
test('a rising tide strands rather than teleports at six, allows waiting, and drowns at ten',()=>{
 const g=enter(1);g.teleport('region_1_f1',3,1,'south');g.state.dungeons.active.systems.water.elapsed=tickAt(6)-1;const loc=structuredClone(g.state.location),events=structuredClone(g.state.events);assert.ok(action(g,'water','wait'));assert.equal(dungeonFloodLevel(data,g.state),6);assert.deepEqual(g.state.location,loc);assert.deepEqual(g.state.events,events);assert.equal(g.dispatch({type:'move',direction:'forward'}),false);roundtrip(g);
 g.state.dungeons.active.systems.water.elapsed=tickAt(10)-1;assert.ok(action(g,'water','wait'));assert.equal(g.state.mode,'town');assert.ok(g.state.members.every(id=>g.state.actors[id].hp>0));roundtrip(g);
});
test('gate drainage covers one floor, persists, and both floors share the saved clock',()=>{
 const g=enter(1);setLevel(g,6);assert.ok(action(g,'water','close','upper_gate'));assert.equal(dungeonFloodLevel(data,g.state),0);assert.ok(g.walkable(g.map(),3,3));assert.equal(g.walkable(data.maps.region_1_f2,1,1),false);const elapsed=g.state.dungeons.active.systems.water.elapsed;assert.equal(action(g,'water','close','upper_gate'),false);assert.equal(g.state.dungeons.active.systems.water.elapsed,elapsed);roundtrip(g);g.returnTown();g.dispatch({type:'travel',region:1});assert.equal(g.state.dungeons.active.systems.water.elapsed,0);assert.equal(g.state.dungeons.persistent.region_1.systems.water.controls.upper_gate,false);
});
test('diving item and skill protect the entire party through level ten and spend only once',()=>{
 for(const method of ['item','skill']){const g=newGame();if(method==='skill')g.changeJob('il','druid');else g.give('diving_kit',1);g.dispatch({type:'travel',region:1});const mp=g.state.actors.il.mp;
  assert.ok(g.dispatch(method==='skill'?{type:'job.action',actor:'il',ability:'water_breath'}:{type:'item',actor:'ada',item:'diving_kit'}));assert.equal(g.state.actors.il.mp,mp-(method==='skill'?4:0));setLevel(g,10);assert.ok(action(g,'water','wait'));assert.equal(g.state.mode,'dungeon');assert.ok(g.dispatch({type:'move',direction:'forward'}));roundtrip(g);const before=g.save();assert.equal(action(g,'water','protect',null,{item:'diving_kit'}),false);assert.equal(g.state.inventory.diving_kit,JSON.parse(before).state.inventory.diving_kit);g.returnTown();g.dispatch({type:'travel',region:1});assert.equal(g.state.dungeons.active.systems.water.protected,false);
 }
});
test('wet penalties, recoil, fire prohibition and dry-land recovery share actual immersion state',()=>{
 const g=enter(1),dry=g.stats('ada');setLevel(g,4);action(g,'water','wait');assert.ok(g.state.members.every(id=>g.state.actors[id].statuses.includes('wet')));assert.ok(g.stats('ada').agi<dry.agi);assert.ok(g.stats('ada').str<dry.str);assert.equal(wetResistance(g.state.actors.il,'ice'),1.5);
 const hp=g.state.actors.il.hp;wetAfterSkill(g,g.state.actors.il,data.skills.lightning);assert.ok(g.state.actors.il.hp<hp);assert.ok(g.state.actors.il.statuses.includes('wet'));assert.equal(g.jobAction('il','dry_clothes'),false);
 setLevel(g,7);g.startBattle('water_giant',{win:[],escape:[],lose:[]});assert.equal(battleSkillPlan(g,'il','fire','enemy_0').ok,false);escape(g);g.returnTown();assert.ok(g.state.actors.il.statuses.includes('wet'));assert.ok(g.jobAction('il','dry_clothes'));assert.ok(g.state.members.every(id=>!g.state.actors[id].statuses.includes('wet')));roundtrip(g);
});
test('flood depth selects increasingly strong fish and modifies fire/water damage',async()=>{
 const {dungeonDamageScale}=await import('../src/core/dungeons.js');const g=enter(1);
 for(const [level,id] of [[1,'water_small'],[4,'water_predator'],[7,'water_giant']]){setLevel(g,level);assert.equal(dungeonEncounter(data,g.state).encounter,id);assert.ok(dungeonDamageScale(data,g.state,'water')>1);assert.ok(dungeonDamageScale(data,g.state,'fire')<1);}
 assert.ok(data.enemies.water_giant.stats.hp>data.enemies.water_predator.stats.hp);assert.ok(data.enemies.water_predator.stats.hp>data.enemies.water_darter.stats.hp);
});
