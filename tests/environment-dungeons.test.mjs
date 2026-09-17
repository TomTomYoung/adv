import test from 'node:test';
import assert from 'node:assert/strict';
import {data,newGame,drain,walk,goTownLocation} from './helpers.mjs';
import {GameEngine} from '../src/core/engine.js';
import {dungeonActionPlan} from '../src/core/dungeons.js';
import {validateSave} from '../src/core/save.js';
import {validateContent} from '../src/core/validation.js';
import {projectGame} from '../src/application/projection.js';
import {fireContext} from '../src/core/systems/fire-network.js';

const begin=region=>{const g=newGame();g.dispatch({type:'travel',region});return g;};
const water=g=>g.state.dungeons.active.systems.water;
const wear=g=>g.state.dungeons.active.systems.salt.wear;
const action=(g,system,action,target,extra={})=>g.dispatch({type:'dungeon.action',system,action,target,...extra});
const wait=(g,n)=>{for(let i=0;i<n;i++)assert.ok(action(g,'water','wait'));};
const roundtrip=g=>{const text=g.save();assert.deepEqual(validateSave(JSON.parse(text),g.data),[]);g.load(text);assert.equal(g.save(),text);};
const escape=g=>{g.random=()=>0;assert.ok(g.dispatch({type:'battle',action:'escape'}));drain(g);};
function equipped(){const g=newGame();g.give('iron_sword',1);assert.ok(g.dispatch({type:'equip',actor:'ada',item:'iron_sword'}));g.dispatch({type:'travel',region:2});return g;}





test('water phases pause during dialog and battle and do not affect a different dungeon',()=>{
  const g=begin(1);g.run('service.inn');assert.equal(action(g,'water','wait'),false);assert.equal(water(g).elapsed,0);drain(g);
  g.startBattle('roaming_1',{win:[],escape:[],lose:[]});assert.equal(action(g,'water','wait'),false);escape(g);assert.equal(water(g).elapsed,0);
  g.returnTown();g.dispatch({type:'travel',region:3});assert.equal(action(g,'water','wait'),false);assert.deepEqual(projectGame(g).dungeon.systems.map(s=>s.kind),['plant_garden']);roundtrip(g);
});
test('both waterway floors remain traversable through real movement, gate operations and stairs',()=>{
  const g=begin(1);g.random=()=>.999999;assert.ok(action(g,'water','close','upper_gate'));
  const stairs=g.map().objects.find(o=>o.id==='stairs');walk(g,stairs.x,stairs.y,{heal:true});
  while(!g.walkable(data.maps.region_1_f2,1,1))wait(g,1);const time=water(g).elapsed;g.dispatch({type:'interact'});drain(g);assert.equal(g.state.location.map,'region_1_f2');assert.equal(water(g).elapsed,time);
  assert.ok(action(g,'water','close','lower_gate'));walk(g,6,2,{heal:true});roundtrip(g);
  walk(g,1,1,{heal:true});g.dispatch({type:'interact'});drain(g);assert.equal(g.state.location.map,'region_1_f1');roundtrip(g);
});


test('corrosion clamps HP/MP maxima, survives battle save replay, and clears on defeat or crossing the dungeon boundary',()=>{
  const g=newGame();g.give('robe',1);assert.ok(g.dispatch({type:'equip',actor:'sera',item:'robe'}));g.healAll();g.dispatch({type:'travel',region:2});
  const before=g.stats('sera').mp;g.startBattle('roaming_2',{win:[],escape:[],lose:[]});assert.equal(g.stats('sera').mp,before-1);assert.equal(g.state.actors.sera.mp,before-1);roundtrip(g);
  const h=newGame();h.load(g.save());for(const engine of [g,h])engine.dispatch({type:'battle',action:'skill',skill:'guard'});assert.equal(g.save(),h.save());
  g.defeat();assert.equal(g.state.dungeons.active,null);assert.equal(g.stats('sera').mp,before);roundtrip(g);
  const other=equipped();other.startBattle('roaming_2',{win:[],escape:[],lose:[]});escape(other);other.teleport('region_3_f1',1,1);assert.deepEqual(projectGame(other).dungeon.systems.map(s=>s.kind),['plant_garden']);roundtrip(other);
});
test('wall item usage checks reach, matching item and supplies before payment; opening changes movement and remains after reentry',()=>{
  const g=begin(2);g.give('blasting_charge',2);const count=g.state.inventory.blasting_charge;
  assert.equal(action(g,'walls','item','upper_entry',{item:'blasting_charge'}),false);assert.equal(g.state.inventory.blasting_charge,count);
  g.teleport('region_2_f1',5,1,'east');assert.equal(g.walkable(g.map(),6,1),false);
  assert.equal(action(g,'walls','item','upper_entry',{item:'potion'}),false);assert.equal(g.state.inventory.blasting_charge,count);
  assert.ok(action(g,'walls','item','upper_entry',{item:'blasting_charge'}));assert.equal(g.state.inventory.blasting_charge,count-1);assert.ok(g.walkable(g.map(),6,1));
  assert.equal(action(g,'walls','item','upper_entry',{item:'blasting_charge'}),false);assert.equal(g.state.inventory.blasting_charge,count-1);
  assert.ok(g.dispatch({type:'move',direction:'forward'}));assert.equal(g.state.location.x,6);roundtrip(g);
  const model=projectGame(g);assert.equal(model.dungeon.geometry[1][6],'.');assert.equal(model.dungeon.cells[1][6].wall,false);
  g.returnTown();g.dispatch({type:'travel',region:2});assert.ok(g.walkable(g.map(),6,1));g.teleport('region_2_f2',5,1,'east');assert.equal(g.walkable(g.map(),6,1),false);roundtrip(g);
});
test('wall skill enforces job, level, living member, MP and dungeon, and both skill entry points pay once',()=>{
  const g=begin(2);g.teleport('region_2_f1',5,1,'east');const mp=g.state.actors.ada.mp;
  assert.equal(action(g,'walls','skill','upper_entry',{actor:'nio',ability:'break_rock'}),false);
  g.state.actors.ada.mp=2;assert.equal(g.dispatch({type:'job.action',actor:'ada',ability:'break_rock'}),false);assert.equal(g.state.actors.ada.mp,2);
  g.state.actors.ada.mp=mp;g.state.actors.ada.hp=0;assert.equal(g.dispatch({type:'job.action',actor:'ada',ability:'break_rock'}),false);g.healAll();
  const available=g.state.actors.ada.mp;assert.ok(g.dispatch({type:'job.action',actor:'ada',ability:'break_rock'}));assert.equal(g.state.actors.ada.mp,available-3);
  g.teleport('region_2_f2',5,1,'east');assert.ok(action(g,'walls','skill','lower_entry',{actor:'ada',ability:'break_rock'}));assert.equal(g.state.actors.ada.mp,available-6);roundtrip(g);
  g.returnTown();assert.equal(g.dispatch({type:'job.action',actor:'ada',ability:'break_rock'}),false);g.dispatch({type:'travel',region:1});assert.equal(g.dispatch({type:'job.action',actor:'ada',ability:'break_rock'}),false);
});
test('wall tools are obtainable in town and can open every authored wall without changing quest objects',()=>{
  const g=newGame();goTownLocation(g,'hikarigaeri_shop');g.state.gold=1000;assert.ok(g.dispatch({type:'buy',item:'blasting_charge'}));assert.equal(g.state.inventory.blasting_charge,1);goTownLocation(g,data.game.world.townRoot);
  g.give('blasting_charge',3);g.dispatch({type:'travel',region:2});const objects=JSON.stringify(data.maps.region_2_f1.objects);
  for(const wall of data.dungeons.region_2.systems.walls.walls){
    const map=data.maps[wall.map];const adjacent=[[wall.x-1,wall.y,'east'],[wall.x+1,wall.y,'west'],[wall.x,wall.y-1,'south'],[wall.x,wall.y+1,'north']].find(([x,y])=>map.tiles[y]?.[x]==='.');
    g.teleport(wall.map,...adjacent);assert.ok(g.dispatch({type:'item',item:'blasting_charge',actor:'ada'}));roundtrip(g);
  }
  assert.equal(g.state.inventory.blasting_charge,0);assert.equal(JSON.stringify(data.maps.region_2_f1.objects),objects);
});
test('environment projection is detached, respects exploration visibility and shares eligibility with commands',()=>{
  for(const region of [1,2]){
    const g=begin(region);if(region===2)g.teleport('region_2_f1',5,1,'east');const vm=projectGame(g);
    for(const system of vm.dungeon.systems){
      const actions=[...(system.actions??[]),...(system.controls??[]).flatMap(c=>c.actions),...(system.walls??[]).flatMap(w=>w.actions)];
      for(const a of actions)assert.equal(a.enabled,dungeonActionPlan(data,g.state,a.intent).ok);
      assert.ok(system.markers.every(m=>(g.state.discovered[g.state.location.map]??[]).includes(`${m.x},${m.y}`)));
    }
    const text=g.save();vm.dungeon.systems[0].id='changed';vm.dungeon.cells[1][1].wall=true;assert.equal(g.save(),text);
  }
  const g=begin(1);g.teleport('region_1_f1',3,1);wait(g,48);const vm=projectGame(g);assert.equal(vm.dungeon.cells[2][3].blocked,true);assert.equal(vm.dungeon.geometry[2][3],'.');assert.equal(vm.dungeon.cells[2][3].waterDepth,3);
});

test('malformed environmental definitions and saved values are rejected without spending resources or replacing a live save',()=>{
  for(const change of [d=>d.dungeons.region_1.systems.water.phases[0].duration=0,d=>d.dungeons.region_1.systems.water.floors[0].controls=['missing'],d=>d.dungeons.region_1.systems.water.floors[0].map='missing',d=>d.dungeons.region_2.systems.salt.perBattle=-1,d=>d.dungeons.region_2.systems.walls.walls[0].items=['missing'],d=>d.dungeons.region_2.systems.walls.walls[0].x=0]){
    const d=structuredClone(data);change(d);assert.ok(validateContent(d).length);
  }
  for(const [region,change] of [[1,s=>s.dungeons.active.systems.water.elapsed=-1],[1,s=>s.dungeons.persistent.region_1.systems.water.controls.upper_gate='yes'],[1,s=>delete s.dungeons.active.systems.water],[2,s=>s.gear.items.gear_1={item:'potion',salt:1}],[2,s=>s.gear.items.gear_1={item:'iron_sword',salt:-1}],[2,s=>s.dungeons.persistent.region_2.systems.walls.broken=['missing']],[2,s=>s.dungeons.persistent.region_2.systems.walls.broken=['upper_entry','upper_entry']]]){
    const g=begin(region),before=g.save(),save=JSON.parse(before);change(save.state);assert.throws(()=>g.load(JSON.stringify(save)));assert.equal(g.save(),before);
  }
});
