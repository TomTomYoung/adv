import test from 'node:test';
import assert from 'node:assert/strict';
import {data, drain} from './helpers.mjs';
import {GameEngine} from '../src/core/engine.js';
import {activeActor, applySkill} from '../src/core/battle.js';
import {validateSave} from '../src/core/save.js';

const moth = 'kagaribi_ember_moth', pair = 'kagaribi_prankster_pair', leader = 'kagaribi_ringleader';
function start(encounter, mode, prepare = () => {}, side = 'enemies') {
  const db = {...data, enemies:structuredClone(data.enemies), encounters:structuredClone(data.encounters)};
  const g = new GameEngine(db, 52);
  drain(g);
  prepare(g);
  g.startBattle(encounter, {}, {battleMode:mode, manualTurns:true, preemptive:{side, actions:1}});
  return g;
}
function step(g) { assert.ok(g.dispatch({type:'battle.step'}), g.state.notice); }
function reload(g) {
  const save = g.save();
  assert.deepEqual(validateSave(JSON.parse(save), g.data), []);
  g.load(save);
  assert.equal(g.save(), save);
}
const blasts = g => g.feedback.events.filter(e => e.action === '引火爆弾');
test('篝火の迷宮の4Fと7Fに、初期編成と専用画像を登録する', () => {
  assert.ok(data.maps.kagaribi_crossroads.encounterPool.some(row => row.encounter === pair && row.weight > 0));
  assert.ok(data.maps.kagaribi_relay.encounterPool.some(row => row.encounter === leader && row.weight > 0));
  assert.deepEqual(data.encounters[pair].enemies, ['kagaribi_torch_prankster', moth]);
  assert.deepEqual(data.encounters[leader].enemies, ['kagaribi_torch_ringleader']);
  for (const id of ['torch_prankster','torch_ringleader']) assert.equal(data.assets.images[data.enemies['kagaribi_'+id].sprite], 'assets/images/monsters/'+id+'.webp');
});

for (const mode of ['classic','grid','frontline']) {
  test(mode+' 火遊びは使用者を含む両陣営の生存者を等幅で選ぶ', () => {
    // Three living candidates in this order: Ada, the prankster, the moth.
    for (const [i, expected] of ['actor:ada','enemy:enemy_0','enemy:enemy_1'].entries()) {
      const g = start(pair,mode,g=>{for(const id of g.state.members)if(id!=='ada')g.state.actors[id].hp=0;});
      g.random = () => (i + 0.5) / 3;
      step(g);
      const impact = g.feedback.events.find(e=>e.action==='火つけ小僧・火遊び' && e.phase==='impact');
      assert.deepEqual(impact.targets.map(t=>t.key),[expected]);
      assert.equal(blasts(g).length,i===2?1:0);
      assert.equal(g.state.battle.enemies[1].hp===0,i===2);
    }
  });
  test(mode+' 集合笛で2〜3体を実体として呼ぶ。次の手番までに倒した灯蛾は火祭りから外れる', () => {
    for (const [roll,count] of [[0.01,2],[0.99,3]]) {
      const g = start(leader,mode);
      g.random = () => roll;
      step(g);
      assert.deepEqual(g.state.battle.enemies.slice(1).map(u=>u.id),Array(count).fill(moth));
      reload(g);
      let b=g.state.battle;
      applySkill(g,g.state.actors.ada,b.enemies[1],{name:'打撃',effects:[{type:'damage',amount:999,element:'physical'}]},'attack');
      reload(g);
      b=g.state.battle;
      const before = g.state.records.kills[moth];
      for(let turns=0;!b.log.some(line=>line.includes('の火祭り。'))&&turns<25;turns++)step(g);
      assert.ok(b.log.some(line=>line.includes('灯蛾'+(count-1)+'体に一斉に')));
      assert.equal(blasts(g).length,count-1);
      assert.equal(g.state.records.kills[moth]-before,count-1);
      assert.ok(b.enemies.slice(1).every(u=>u.hp===0));
      reload(g);
      b=g.state.battle;
      for(let turns=0;!b.log.some(line=>line.includes('の火遊び。'))&&turns<25;turns++)step(g);
      assert.ok(b.log.some(line=>line.includes('の火遊び。')));
      assert.equal(b.enemies.length,count+1);
      g.finishBattle('win');
      reload(g);
      drain(g);
    }
  });
}
test('習性を外した灯蛾は火祭りで通常の火ダメージを受ける',()=>{
  const g=start(leader,'classic',g=>{delete g.data.enemies[moth].habits;});
  g.random=()=>0.1;
  step(g);
  const b=g.state.battle, hp=b.enemies[1].hp;
  for(let i=0;!b.log.some(line=>line.includes('の火祭り。'))&&i<25;i++)step(g);
  assert.deepEqual(b.enemies.slice(1).map(u=>u.hp),[hp-12,hp-12]);
  assert.equal(blasts(g).length,0);
});
test('大将が倒れていれば集合笛は鳴らず、灯蛾をすべて先に倒せば火祭りは起きない',()=>{
  const strike={name:'打撃',effects:[{type:'damage',amount:1000,element:'physical'}]};
  const g=start(leader,'classic',()=>{},'allies');
  g.state.battle.enemies[0].hp=1;
  assert.ok(activeActor(g));
  assert.ok(g.dispatch({type:'battle',action:'skill',skill:'attack',target:'enemy_0'}));
  assert.equal(g.state.battle,null);
  assert.equal(g.state.battleResult.reinforcements,undefined);
  const h=start(leader,'grid');
  step(h);
  const b=h.state.battle;
  for(const unit of b.enemies.slice(1))applySkill(h,h.state.actors.ada,unit,strike,'attack');
  for(let i=0;!b.log.some(line=>line.includes('の火遊び。'))&&i<25;i++)step(h);
  assert.ok(b.log.some(line=>line.includes('の火遊び。')));
  assert.ok(!b.log.some(line=>line.includes('の火祭り。')));
  assert.equal(blasts(h).length,0);
});
test('集合笛の記録は実在する大将が一度に呼んだ2〜3体だけを復元する',()=>{
  const g=start(leader,'frontline');
  step(g);
  const original=g.save();
  for(const change of [
    joins=>joins[0].caller='enemy_1',
    joins=>joins[0].caller=['enemy_0'],
    joins=>joins.push({...joins[0]},{...joins[0]}),
    joins=>joins[0].eventId+=1
  ]){
    const copy=JSON.parse(original);
    change(copy.state.battle.reinforcements);
    assert.throws(()=>g.load(JSON.stringify(copy)));
    assert.equal(g.save(),original);
  }
});
