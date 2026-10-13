import test from 'node:test';
import assert from 'node:assert/strict';
import {data,drain} from './helpers.mjs';
import {GameEngine} from '../src/core/engine.js';
import {activeActor,applySkill,enemyStats} from '../src/core/battle.js';
import {applyStun,preemptiveValid,guarded,BATTLE_STATUS_DEFINITIONS} from '../src/core/battle-turns.js';
import {validateSave} from '../src/core/save.js';
import {projectGame} from '../src/application/projection.js';
function game(){const d=structuredClone(data),g=new GameEngine(d);drain(g);g.award(0,d.system.xpBase*9*10);g.teleport('region_2_f1',1,1);return {g,d};}
const start=g=>g.startBattle('wild_pair_10',{win:[],lose:[],escape:[]});
const guard=g=>assert.ok(g.dispatch({type:'battle',action:'skill',skill:'guard'}));
const roundtrip=g=>{const s=g.save();assert.deepEqual(validateSave(JSON.parse(s),g.data),[]);g.load(s);assert.equal(g.save(),s);};
test('ally preemptive N repeatedly selects the fastest living actor, then restores a fresh normal cycle',()=>{
  const {g,d}=game();d.encounters.wild_pair_10.preemptive={side:'allies',actions:3};start(g);const actor=activeActor(g),hp=g.state.members.map(id=>g.state.actors[id].hp);
  for(let i=0;i<3;i++){assert.equal(activeActor(g),actor);guard(g);assert.deepEqual(g.state.members.map(id=>g.state.actors[id].hp),hp);if(i<2){assert.equal(g.state.battle.preemptive.remaining,2-i);roundtrip(g);}}
  assert.equal(g.state.battle.preemptive,undefined);assert.deepEqual(g.state.battle.acted,[]);assert.equal(activeActor(g),actor);assert.equal(g.state.battle.round,1);guard(g);assert.notEqual(activeActor(g),actor);
});
test('preemptive recalculates speed and living membership at each opportunity',()=>{
  const {g,d}=game();d.encounters.wild_pair_10.preemptive={side:'allies',actions:3};start(g);const first=activeActor(g);guard(g);g.state.actors[first].hp=0;assert.notEqual(activeActor(g),first);guard(g);assert.equal(g.state.battle.preemptive.remaining,1);
});
test('enemy preemptive N uses only the fastest enemy and does not advance the normal round',()=>{
  const {g,d}=game();d.encounters.wild_pair_10.preemptive={side:'enemies',actions:3};
  for(const id of d.encounters.wild_pair_10.enemies){d.enemies[id].ai=[{priority:1,skill:'guard',target:'self'}];d.enemies[id].stats.agi=1;}
  d.enemies[d.encounters.wild_pair_10.enemies[1]].stats.agi=40;start(g);
  const fastest=[...g.state.battle.enemies].sort((a,b)=>enemyStats(g,b).agi-enemyStats(g,a).agi)[0];
  assert.equal(g.state.battle.log.filter(t=>t===`${fastest.name}は守りを固めた。`).length,3);assert.equal(g.state.battle.round,1);assert.equal(g.state.battle.preemptive,undefined);assert.ok(activeActor(g));roundtrip(g);
});
test('ambush is consumed exactly once; enemy and ally candidates resolve exclusively; patrol prevents enemy rolls',()=>{
  const {g,d}=game();d.encounters.wild_pair_10.preemptive={side:'enemies',actions:4,priority:20,chance:1};g.state.scouting={traps:{},effects:{ambush:{remaining:20,actions:2},patrol:{remaining:10}}};let rolls=0;g.random=()=>{rolls++;return 0;};start(g);
  assert.equal(rolls,0);assert.deepEqual(g.state.battle.preemptive,{side:'allies',remaining:2});assert.equal(g.state.scouting.effects.ambush,undefined);roundtrip(g);assert.equal(rolls,0);
  g.finishBattle('escape');start(g);assert.equal(g.state.battle.preemptive,undefined);
});
test('start event saves the resolved enemy phase and resumes it once after the dialog',()=>{
  const {g,d}=game();const id=d.encounters.wild_pair_10.enemies[0];d.enemies[id].ai=[{priority:1,skill:'guard',target:'self'}];d.enemies[id].stats.agi=99;
  d.scripts.preempt={commands:[{op:'battle.start',encounter:'wild_pair_10',preemptive:{side:'enemies',actions:2},on_win:[],on_lose:[],on_escape:[],on_interrupt:[],events:[{id:'intro',triggers:['start'],commands:[{op:'narrate',text:'戦闘開始'}]}]}]};
  g.run('preempt');assert.equal(g.state.waiting.type,'text');assert.equal(g.state.battle.preemptive.remaining,2);roundtrip(g);drain(g);assert.equal(g.state.battle.preemptive,undefined);assert.equal(g.state.battle.log.filter(t=>t===`${d.enemies[id].name}は守りを固めた。`).length,2);roundtrip(g);
});
test('stun consumes one actual action without MP/items/uses and is refreshed instead of stacked by default',()=>{
  const {g}=game();start(g);const id=activeActor(g),a=g.state.actors[id],before={mp:a.mp,uses:a.skillProgress?.guard?.uses??0};g.random=()=>0;
  applyStun(g,a,{});applyStun(g,a,{});assert.equal(g.state.battle.stuns[`actor:${id}`],1);roundtrip(g);assert.equal(projectGame(g).battle.stunned,true);
  guard(g);assert.match(g.state.battle.log.join('\n'),/スタンで行動できない/);assert.equal(g.state.battle.stuns[`actor:${id}`],undefined);assert.equal(g.state.actors[id].mp,before.mp);assert.equal(g.state.actors[id].skillProgress?.guard?.uses??0,before.uses);assert.ok(g.state.battle.acted.includes(id));
  assert.ok(!g.state.actors[id].statuses.includes('stun'));
});
test('explicit additive stuns consume multiple opportunities, including preemptive actions',()=>{
  const {g,d}=game();d.encounters.wild_pair_10.preemptive={side:'allies',actions:3};start(g);const id=activeActor(g),a=g.state.actors[id];g.random=()=>0;applyStun(g,a,{});applyStun(g,a,{stack:'add'});
  guard(g);assert.equal(g.state.battle.stuns[`actor:${id}`],1);assert.equal(g.state.battle.preemptive.remaining,2);guard(g);assert.equal(g.state.battle.stuns[`actor:${id}`],undefined);assert.equal(g.state.battle.preemptive.remaining,1);guard(g);assert.equal(g.state.battle.preemptive,undefined);assert.equal(g.state.battle.acted.length,0);
});
test('enemy stun skips its opportunity and battle-only state is cleared on escape and defeat',()=>{
  const {g}=game();start(g);const enemy=g.state.battle.enemies[0];g.random=()=>0;applySkill(g,g.state.actors.nio,enemy,{name:'テスト',effects:[{type:'stun'}]},'trip');
  const count=g.state.members.length;for(let i=0;i<count;i++)guard(g);assert.match(g.state.battle.log.join('\n'),/スタンで行動できない/);assert.equal(g.state.battle.stuns[`enemy:${enemy.instance}`],undefined);g.finishBattle('escape');assert.equal(g.state.battle,null);assert.ok(g.state.members.every(id=>!g.state.actors[id].statuses.includes('stun')));
  start(g);applyStun(g,g.state.actors.nio,{});g.finishBattle('lose');assert.equal(g.state.battle,null);roundtrip(g);
});
test('invalid battle phases, targets and stun counts fail save validation',()=>{
  const {g}=game();start(g);const saved=JSON.parse(g.save());
  for(const bad of [{side:'both',remaining:2},{side:'allies',remaining:-1},{side:'allies',remaining:21},{side:'enemies',remaining:2,reroll:true}]){const s=structuredClone(saved);s.state.battle.preemptive=bad;assert.ok(validateSave(s,g.data).length);}
  for(const bad of [{'actor:missing':1},{'actor:nio':-1},{'enemy:missing':1}]){const s=structuredClone(saved);s.state.battle.stuns=bad;assert.ok(validateSave(s,g.data).length);}
  assert.equal(preemptiveValid({side:'allies',actions:1,chance:2}),false);
});


test('defense is recognized as a battle-only status while preserving guard storage compatibility',()=>{
  const {g}=game();start(g);const id=activeActor(g),actor=g.state.actors[id];
  assert.equal(BATTLE_STATUS_DEFINITIONS.guarded.name,'防御');assert.equal(BATTLE_STATUS_DEFINITIONS.guarded.maxLevel,3);
  assert.equal(guarded(g.state.battle,actor),false);guard(g);assert.equal(guarded(g.state.battle,actor),true);roundtrip(g);
});
