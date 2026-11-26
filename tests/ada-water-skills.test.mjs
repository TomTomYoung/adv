import test from 'node:test';
import assert from 'node:assert/strict';
import {data, drain} from './helpers.mjs';
import {GameEngine} from '../src/core/engine.js';
import {activeActor, applySkill} from '../src/core/battle.js';
import {applyStatus, applyStatusClock, removeStatus, tickStatuses} from '../src/core/status-effects.js';
import {clearGuard} from '../src/core/battle-turns.js';
import {xpThreshold} from '../src/core/progression.js';
import {shiftingDungeonData} from '../src/core/shifting-dungeon.js';

function game() {
  const g = new GameEngine(data, 52);
  drain(g);
  return g;
}
function levelAda(g, level) {
  return g.award(0, xpThreshold(data, level - 1) - g.state.actors.ada.xp, ['ada']);
}
function battle(mode) {
  const g = game();
  levelAda(g, 4);
  assert.ok(g.dispatch({type:'party',action:'join',actor:'berg'}));
  g.startBattle('kagaribi_oil_beetle_solo', {}, {battleMode:mode, manualTurns:true});
  for (let i = 0; activeActor(g) !== 'ada' && i < 16; i++) {
    assert.ok(g.dispatch(activeActor(g) ? {type:'battle',action:'skill',skill:'guard'} : {type:'battle.step'}));
  }
  assert.equal(activeActor(g), 'ada');
  return g;
}

test('アダ個人のLv3・4で習得通知が出て、転職・旧セーブの読込でも同じレベル条件を使う', () => {
  const g = game();
  levelAda(g, 2);
  assert.ok(!g.skills('ada').includes('water_wall'));
  assert.deepEqual(levelAda(g, 3)[0].skills, ['water_wall']);
  assert.ok(!g.skills('ada').includes('water_edge'));
  assert.deepEqual(levelAda(g, 4)[0].skills, ['water_edge','water_bash']);
  const saved = g.save();
  g.load(saved);
  assert.ok(g.dispatch({type:'job.change',actor:'ada',job:'mage'}));
  g.award(0,xpThreshold(data,3),['nio']);
  for (const id of ['water_wall','water_edge','water_bash']) {
    assert.ok(g.skills('ada').includes(id));
    assert.ok(!g.skills('nio').includes(id));
  }
});

for (const mode of ['classic','grid','frontline']) {
  test(mode+' ウォーターウォールは5人それぞれに油か炎を1回だけ防ぐ加護を付与する', () => {
    const g = battle(mode);
    assert.ok(g.dispatch({type:'battle',action:'skill',skill:'water_wall'}),g.state.notice);
    assert.equal(g.state.members.length,5);
    g.load(g.save());
    const s = g.state, actor = s.actors.ada, other = s.actors.nio, enemy = s.battle.enemies[0];
    assert.ok(s.members.every(id => s.actors[id].statuses.includes('water_ward')));
    removeStatus(actor,'oiled');
    const spray = () => applySkill(g,enemy,actor,data.skills.oil_spray,'oil_spray',true);
    spray();
    assert.ok(!actor.statuses.includes('water_ward') && !actor.statuses.includes('oiled'));
    spray();
    assert.ok(actor.statuses.includes('oiled'));
    const flame = {name:'炎',effects:[{type:'damage',amount:6,element:'fire'}]};
    const hit = target => applySkill(g,enemy,target,flame,null,true,null,false);
    removeStatus(other,'oiled');
    clearGuard(s.battle, other);
    const hp = other.hp;
    assert.equal(hit(other),0);
    assert.equal(other.hp,hp);
    assert.equal(hit(other),6);
    assert.equal(hit(actor),12);
    assert.deepEqual(actor.statuses,['ablaze']);
    assert.equal(hit(actor),6);
    applyStatus(data,s,actor,'water_ward');
    const tick = () => applyStatusClock(data,s,actor,'ablaze','turns',g.stats('ada')).hp;
    assert.equal(tick(),0);
    g.load(g.save());
    const burning = g.state.actors.ada;
    assert.ok(burning.statuses.includes('ablaze') && !burning.statuses.includes('water_ward'));
    assert.equal(applyStatusClock(data,g.state,burning,'ablaze','turns',g.stats('ada')).hp,Math.ceil(g.stats('ada').hp/4));
    for (let i=0;i<3;i++) tickStatuses(data,g.state,burning,'turns');
    assert.ok(!burning.statuses.includes('ablaze'));
  });
  for(const [skill,status] of [['water_edge','water_infusion'],['water_bash','water_ward']]) {
    test(mode+' '+skill+' は攻撃後に使用者だけを強化する', () => {
      const g = battle(mode), s = g.state, e = s.battle.enemies[0], a = s.actors.ada;
      e.hp = e.stats.hp;
      const before = e.hp;
      assert.ok(g.dispatch({type:'battle',action:'skill',skill,target:e.instance}),g.state.notice);
      assert.ok(e.hp < before && a.statuses.includes(status));
      assert.ok(!s.actors.nio.statuses.includes(status));
      if (status !== 'water_infusion') return;
      e.resist = {...e.resist,water:2};
      const strike = () => applySkill(g,a,e,{name:'斬撃',effects:[{type:'damage',amount:4,element:'physical'}]},null,false,null,false);
      const enchanted = strike();
      for(let i=0;i<3;i++) tickStatuses(data,s,a,'turns');
      assert.ok(!a.statuses.includes(status));
      assert.equal(enchanted,strike()*2);
    });
  }
}

test('千変の迷宮3〜100Fで4通りの混成を抽選し、階層別の灯蛾も引火爆弾を持つ', () => {
  const db = shiftingDungeonData(data);
  const groups = ['torch_oil','torch_moths','oil_moths','torch_oil_moth'];
  for(let floor=1;floor<=100;floor++) {
    const map = db.maps['shifting_labyrinth_f'+floor];
    for(const group of groups) {
      const row = map.encounterPool.find(r=>r.encounter.endsWith('_'+group));
      if(floor<3) { assert.equal(row,undefined); continue; }
      assert.ok(row?.weight>0);
      const roster = db.encounters[row.encounter].enemies.map(id=>db.enemies[id]);
      assert.equal(roster.length,3);
      for(const moth of roster.filter(e=>e.name.startsWith('灯蛾'))) assert.ok(moth.habits.includes('ignition_bomb'));
    }
  }
});
