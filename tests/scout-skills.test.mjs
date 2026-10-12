import test from 'node:test';
import assert from 'node:assert/strict';
import {data,drain} from './helpers.mjs';
import {GameEngine} from '../src/core/engine.js';
import {activeActor} from '../src/core/battle.js';
import {applyStatus} from '../src/core/status-effects.js';
import {skillLevel} from '../src/core/skill-levels.js';
import {projectGame} from '../src/application/projection.js';
import {validateSave} from '../src/core/save.js';

const roundtrip=g=>{const text=g.save();assert.deepEqual(validateSave(JSON.parse(text),g.data),[]);g.load(text);return g;};
function game(){
  const d=structuredClone(data),g=new GameEngine(d,42);drain(g);
  for(const map of Object.values(d.maps))map.encounterRate=0;
  return {d,g};
}
function addNeedle(d,map='region_2_f1',x=2,y=1){
  const m=d.maps[map];m.cells.overrides??={};m.cells.overrides[`${x},${y}`]={...(m.cells.overrides[`${x},${y}`]??{}),events:['trap_needle']};return m;
}
function allowScout(d,id){const grant=d.jobs.scout.grants.find(g=>g.skill===id);grant.level=1;}
function enter(g,map='region_2_f1',x=1,y=1,facing='east'){g.teleport(map,x,y,facing);}

test('罠発見は技能Lvに応じた範囲の罠を地図へ記録する',()=>{
  const {d,g}=game();addNeedle(d);enter(g);
  assert.ok(g.dispatch({type:'job.action',actor:'nio',ability:'trap_detect'}));
  const key='cell/region_2_f1/2,1/trap_needle';assert.ok(g.state.scouting.discovered.includes(key));
  const marker=projectGame(g).dungeon.objects.find(o=>o.id===`scout:${key}`);assert.equal(marker.kind,'trap');roundtrip(g);
});

test('盗賊と斥候の罠解除は隣接・足元の未発動罠を解除し、技能Lv2で回収する',()=>{
  const {d,g}=game();addNeedle(d);assert.ok(g.dispatch({type:'job.change',actor:'ada',job:'rogue'}));enter(g);
  g.state.actors.ada.skillLevels.trap_disarm=2;const before=g.state.inventory.recovered_trap??0;
  assert.ok(g.dispatch({type:'job.action',actor:'ada',ability:'trap_disarm'}));
  const key='cell/region_2_f1/2,1/trap_needle';assert.ok(g.state.scouting.disabled.includes(key));assert.equal(g.state.inventory.recovered_trap,before+1);
  assert.ok(g.dispatch({type:'move',direction:'forward'}));drain(g);assert.ok(!g.state.actors.ada.statuses.includes('weakened'));roundtrip(g);

  const second=game();addNeedle(second.d);assert.ok(second.g.dispatch({type:'job.change',actor:'ada',job:'rogue'}));enter(second.g,'region_2_f1',2,1,'east');
  assert.ok(second.g.dispatch({type:'job.action',actor:'ada',ability:'trap_disarm'}));assert.ok(second.g.state.scouting.disabled.includes(key));
});

test('技能レベルは職業習得Lvと独立し、使用回数条件で上昇して保存される',()=>{
  const {d,g}=game();enter(g);
  assert.equal(skillLevel(d,g.state,'nio','trap_detect'),1);
  for(let n=0;n<5;n++){g.state.actors.nio.mp=99;assert.ok(g.dispatch({type:'job.action',actor:'nio',ability:'trap_detect'}));}
  assert.equal(skillLevel(d,g.state,'nio','trap_detect'),2);assert.equal(g.state.actors.nio.skillProgress.uses.trap_detect,5);roundtrip(g);
});

test('奇襲の先制3は最速の同じ味方が3回続けて行動でき、その後に通常巡へ戻る',()=>{
  const {d,g}=game();allowScout(d,'ambush');enter(g);g.state.actors.nio.skillLevels.ambush=3;g.state.actors.nio.mp=99;
  assert.ok(g.dispatch({type:'job.action',actor:'nio',ability:'ambush'}));g.startBattle('kuragari_hunt',{win:[],lose:[],escape:[]});
  assert.deepEqual(g.state.battle.preemptive,{side:'party',remaining:3});const first=activeActor(g);
  for(let n=3;n>0;n--){assert.equal(activeActor(g),first);assert.ok(g.dispatch({type:'battle',action:'skill',skill:'guard',target:first}));if(n>1)assert.equal(g.state.battle.preemptive.remaining,n-1);}
  assert.equal(g.state.battle.preemptive,null);assert.equal(activeActor(g),first);roundtrip(g);
});

test('敵先制は哨戒で無効になり、スタンは次の行動だけを失わせる',()=>{
  const {d,g}=game();allowScout(d,'patrol');d.encounters.kuragari_hunt.preemptive={side:'enemy',count:3};enter(g);g.state.actors.nio.mp=99;
  assert.ok(g.dispatch({type:'job.action',actor:'nio',ability:'patrol'}));const hp=g.state.members.reduce((n,id)=>n+g.state.actors[id].hp,0);
  g.startBattle('kuragari_hunt',{win:[],lose:[],escape:[]});assert.equal(g.state.battle.preemptive,null);assert.equal(g.state.members.reduce((n,id)=>n+g.state.actors[id].hp,0),hp);
  g.finishBattle('escape');drain(g);

  g.state.members=['ada'];g.startBattle('kuragari_hunt',{win:[],lose:[],escape:[]});const actor=activeActor(g),enemy=g.state.battle.enemies[0],enemyHp=enemy.hp;
  applyStatus(d,g.state,g.state.actors[actor],'stun');assert.ok(g.dispatch({type:'battle',action:'skill',skill:'attack',target:enemy.instance}));
  assert.equal(enemy.hp,enemyHp);assert.ok(!g.state.actors[actor].statuses.includes('stun'));assert.ok(g.state.battle.log.some(line=>line.includes('昏倒している')));
});

test('偵察は使用者を一時離脱させ、成功歩で帰隊させる',()=>{
  const {d,g}=game();allowScout(d,'reconnaissance');enter(g);g.state.actors.nio.mp=99;
  assert.ok(g.dispatch({type:'job.action',actor:'nio',ability:'reconnaissance'}));assert.ok(!g.state.members.includes('nio'));assert.equal(g.state.scouting.detached[0].actor,'nio');
  for(let n=0;n<4;n++){const direction=n%2===0?'forward':'back';assert.ok(g.dispatch({type:'move',direction}));drain(g);}
  assert.ok(g.state.members.includes('nio'));assert.equal(g.state.scouting.detached.length,0);roundtrip(g);
});
