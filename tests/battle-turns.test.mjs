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
  for(let i=0;i<g.state.members.length*3&&g.state.battle.stuns?.[`enemy:${enemy.instance}`];i++)guard(g);
  assert.match(g.state.battle.log.join('\n'),/スタンで行動できない/);assert.equal(g.state.battle.stuns[`enemy:${enemy.instance}`],undefined);g.finishBattle('escape');assert.equal(g.state.battle,null);assert.ok(g.state.members.every(id=>!g.state.actors[id].statuses.includes('stun')));
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

function mixedGame({fastEnemy=false,tie=false}={}){
  const {g,d}=game(),members=[...g.state.members],native=g.stats.bind(g);
  g.stats=id=>({...native(id),agi:id===members[0]?80:id===members[1]?30:1});
  d.encounters.wild_pair_10.enemies.forEach((id,i)=>{
    d.enemies[id].stats.agi=i===0?(fastEnemy?120:tie?80:50):10;
    d.enemies[id].ai=[{priority:1,skill:'guard',target:'self'}];
  });
  start(g);return {g,d,members};
}
test('mixed queue interleaves allies and enemies by AGI, and retains the round boundary',()=>{
  const {g,members}=mixedGame(),b=g.state.battle;
  assert.deepEqual(b.turnQueue.slice(0,4),['actor:'+members[0],'enemy:enemy_0','actor:'+members[1],'enemy:enemy_1']);
  assert.equal(activeActor(g),members[0]);assert.equal(b.turnIndex,0);
  guard(g);
  assert.equal(b.turnIndex,2);assert.equal(activeActor(g),members[1]);
  assert.equal(b.log.filter(line=>line.includes('守りを固めた。')).length,2); // first ally and the first enemy
  roundtrip(g);assert.equal(g.state.battle.turnIndex,2);
  assert.equal(activeActor(g),members[1]);guard(g);
  assert.equal(g.state.battle.turnIndex,4);
  assert.equal(activeActor(g),members[2]);
  for(let i=2;i<members.length;i++)guard(g);
  assert.equal(g.state.battle.round,2);
  assert.equal(g.state.battle.turnIndex,0);assert.equal(activeActor(g),members[0]);
  assert.equal(g.state.battle.log.filter(line=>line.includes('守りを固めた。')).length,members.length+2);
  roundtrip(g);
});
test('mixed queue applies stable tie priority and executes faster enemies before the first ally',()=>{
  const tied=mixedGame({tie:true});
  assert.deepEqual(tied.g.state.battle.turnQueue.slice(0,2),['actor:'+tied.members[0],'enemy:enemy_0']);
  const faster=mixedGame({fastEnemy:true}),b=faster.g.state.battle;
  assert.equal(b.turnQueue[0],'enemy:enemy_0');
  assert.equal(b.turnIndex,1);assert.equal(activeActor(faster.g),faster.members[0]);
  assert.equal(b.log.filter(line=>line.includes('守りを固めた。')).length,1);
  roundtrip(faster.g);
});
test('mixed queue skips an enemy stun slot without dropping later ally turns',()=>{
  const {g,members}=mixedGame(),enemy=g.state.battle.enemies[0];
  applyStun(g,enemy,{});guard(g);
  assert.equal(g.state.battle.turnIndex,2);
  assert.equal(g.state.battle.stuns?.['enemy:'+enemy.instance],undefined);
  assert.equal(activeActor(g),members[1]);
  assert.match(g.state.battle.log.join('\n'),/スタンで行動できない/);
  roundtrip(g);
});
test('failed escape consumes only the current mixed-queue slot',()=>{
  const {g,members}=mixedGame();g.random=()=>1;
  assert.ok(g.dispatch({type:'battle',action:'escape'}));
  assert.equal(g.state.battle.round,1);
  assert.equal(g.state.battle.turnIndex,2);
  assert.equal(activeActor(g),members[1]);
  assert.ok(g.state.battle.log.includes('退路を塞がれました。'));
});
test('legacy battle saves without a mixed queue rebuild remaining slots',()=>{
  const {g,members}=mixedGame(),legacy=JSON.parse(g.save());
  legacy.state.battle.acted=[members[0]];
  delete legacy.state.battle.turnQueue;delete legacy.state.battle.turnIndex;
  assert.deepEqual(validateSave(legacy,g.data),[]);
  g.load(JSON.stringify(legacy));
  assert.equal(activeActor(g),members[1]); // The acted member is not replayed.
  assert.ok(!g.state.battle.turnQueue.includes('actor:'+members[0]));
  assert.equal(g.state.battle.turnIndex,1); // Faster enemy 0 has acted.
  roundtrip(g);
});
test('invalid mixed queue slots, cursors and action history are rejected',()=>{
  const {g}=mixedGame(),snapshot=JSON.parse(g.save());
  for(const edit of [
    b=>b.turnQueue.push('enemy:enemy_0'),
    b=>b.turnQueue[0]='enemy:missing',
    b=>b.turnIndex=-1,
    b=>b.turnIndex=999,
    b=>b.turnQueue=null,
    b=>b.turnQueue=['enemy:enemy_0',...b.turnQueue.slice(1)],
    b=>b.acted.push(g.state.members.at(-1))
  ]){
    const bad=structuredClone(snapshot);edit(bad.state.battle);
    assert.ok(validateSave(bad,g.data).length);
  }
});
