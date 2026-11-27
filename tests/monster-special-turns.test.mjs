import assert from 'node:assert/strict';
import test from 'node:test';
import {data, drain} from './helpers.mjs';
import {GameEngine} from '../src/core/engine.js';
import {applyGuard, applyStun, clearGuard} from '../src/core/battle-turns.js';
import {applyStatus, statusLevel} from '../src/core/status-effects.js';
import {unitKey} from '../src/core/buffs.js';
import {validateSave} from '../src/core/save.js';
import {SHIFTING_DUNGEON, shiftingDungeonData} from '../src/core/shifting-dungeon.js';

function encounter(mode, floor, group, legacy=false) {
  const groups=structuredClone(data.encounterGroups);
  if(legacy) groups.dungeons.shifting_labyrinth.floors[floor][group]=0;
  const g=new GameEngine(shiftingDungeonData({...data,encounterGroups:groups}),31);drain(g);
  g.award(0,100000,g.state.members);
  for(const id of g.state.members)g.state.actors[id].hp=g.stats(id).hp;
  g.dispatch({type:'travel',dungeon:SHIFTING_DUNGEON});
  const map=g.data.maps[SHIFTING_DUNGEON+'_f'+floor];
  g.teleport(map.id,map.entrance.x,map.entrance.y,map.entrance.facing);
  const id=map.id+'_lv'+floor+'_'+group;
  if(!legacy)assert.ok(map.encounterPool.some(e=>e.encounter===id&&e.weight>0));
  g.startBattle(id,{win:[],lose:[],escape:[]},{battleMode:mode,manualTurns:true});
  g.random=()=>.75;
  return g;
}
function turn(g,unit) {
  const b=g.state.battle;
  delete b.preemptive;b.acted=[];
  const others=[...g.state.members.map(id=>g.state.actors[id]),...b.enemies].filter(u=>u!==unit&&u.hp>0);
  b.turnQueue=[unitKey(unit),...others.map(unitKey)];b.turnIndex=0;
  assert.ok(g.dispatch({type:'battle.step'}));
}
function reload(g){
  const bytes=g.save();assert.deepEqual(validateSave(JSON.parse(bytes),g.data),[]);g.load(bytes);
}
function impacts(g,name){
  return g.feedback.events.filter(e=>e.phase==='impact'&&e.action?.includes(name)).flatMap(e=>e.targets);
}
for(const mode of ['classic','grid','frontline']){
  test(mode+' 乱転がりはLv8から。ガードで迎えた手番だけに2〜3撃、各撃の対象を再抽選する',()=>{
    for(const roll of [0,.999]){
      const g=encounter(mode,8,'shell_guard');
      let [shell,mate]=g.state.battle.enemies;
      turn(g,shell);assert.ok(shell.guard);assert.equal(impacts(g,'乱転がり').length,0);
      reload(g);[shell,mate]=g.state.battle.enemies;
      const hp=shell.hp,mateHp=mate.hp;
      // The high draw selects the last combatant (the other monster); zero selects a party member.
      g.random=()=>roll;
      turn(g,shell);
      const hits=impacts(g,'乱転がり');
      assert.equal(hits.length,roll===0?2:3);
      assert.ok(hits.every(t=>roll===0?t.key.startsWith('actor:'):t.key===unitKey(mate)));
      assert.equal(shell.hp,hp);assert.ok(!shell.guard);
      if(roll>0)assert.ok(mate.hp<mateHp);
      turn(g,shell);assert.ok(shell.guard);assert.equal(impacts(g,'乱転がり').length,0);
      clearGuard(g.state.battle,shell);turn(g,shell);assert.equal(impacts(g,'乱転がり').length,0);
      reload(g);
    }
    const g=encounter(mode,7,'shell_guard'),shell=g.state.battle.enemies[0];
    applyGuard(g.state.battle,shell);turn(g,shell);assert.equal(impacts(g,'乱転がり').length,0);
    const h=encounter(mode,8,'shell_guard'),[armor,other]=h.state.battle.enemies;
    // One blow defeats the only other monster. Remaining blows must draw living party members.
    other.hp=1;h.random=()=>.999;
    applyGuard(h.state.battle,armor);turn(h,armor);
    const hits=impacts(h,'乱転がり');
    assert.equal(hits[0].key,unitKey(other));assert.equal(other.hp,0);
    assert.ok(hits.slice(1).every(t=>t.key.startsWith('actor:')));assert.equal(hits.length,3);
  });

  test(mode+' 煤虫はスタンで延期後も自爆突撃し、対象1体のくらやみを確実に1段階上げる',()=>{
    const g=encounter(mode,8,'bomb_slinger_escort');let soot=g.state.battle.enemies[1];
    const old=JSON.parse(g.save()),saved=old.state.battle.enemies[1];
    saved.ai[0]={priority:20,condition:{op:'eq',left:{ref:'self.round'},right:1},skill:'soot_beetle_dust',target:'random'};
    g.load(JSON.stringify(old));soot=g.state.battle.enemies[1];
    for(const id of g.state.members)applyStatus(g.data,g.state,g.state.actors[id],'blindness');
    applyStatus(g.data,g.state,soot,'blindness');
    applyStun(g,soot,{count:1});turn(g,soot);assert.ok(soot.hp>0);
    reload(g);soot=g.state.battle.enemies[1];g.random=()=>.999;
    turn(g,soot);
    assert.equal(soot.hp,0);assert.equal(g.state.records.kills[soot.id],1);
    const hits=impacts(g,'煤の自爆突撃');assert.equal(hits.length,1);assert.ok(hits[0].damage>0);
    const lv=g.state.members.map(id=>statusLevel(g.state.actors[id],'blindness'));
    assert.equal(lv.filter(n=>n===2).length,1);
    reload(g);assert.equal(g.state.records.kills[soot.id],1);
  });

  test(mode+' 投石手はLv8から爆弾岩を投げ、石虫が生存中だけ石虫投げを優先する',()=>{
    const young=encounter(mode,7,'goblin_squad_1',true);
    turn(young,young.state.battle.enemies[0]);assert.equal(impacts(young,'飛礫').length,1);
    const g=encounter(mode,8,'bomb_slinger_escort'),[slinger,soot]=g.state.battle.enemies;
    turn(g,slinger);
    assert.equal(impacts(g,'爆弾岩投げ').length,1);assert.ok(impacts(g,'爆弾岩投げ')[0].damage>0);
    assert.equal(soot.hp,soot.stats.hp);
    const h=encounter(mode,8,'stone_sling',true);let [thrower,beetle]=h.state.battle.enemies;
    turn(h,thrower);assert.equal(impacts(h,'石虫投げ').length,1);assert.equal(beetle.hp,0);
    reload(h);thrower=h.state.battle.enemies[0];
    turn(h,thrower);assert.equal(impacts(h,'爆弾岩投げ').length,1);
  });
}
