import test from 'node:test';
import assert from 'node:assert/strict';
import {data, drain} from './helpers.mjs';
import {GameEngine} from '../src/core/engine.js';
import {applySkill} from '../src/core/battle.js';
import {applyStatus, removeStatus, tickStatuses} from '../src/core/status-effects.js';

const solo = 'kagaribi_oil_beetle_solo';
const pair = 'kagaribi_oil_beetle_moth';
function start(mode, encounter = solo) {
  const g = new GameEngine(data, 52);
  drain(g);
  g.random = () => 0;
  g.startBattle(encounter, {}, {battleMode:mode, manualTurns:true, preemptive:{side:'enemies', actions:2}});
  return g;
}

for (const mode of ['classic', 'grid', 'frontline']) {
  test(mode + ' 油吹きは単体に命中し、灯蛾の術と引火爆弾の火ダメージを2倍にする', () => {
    function measure(oiled) {
      const g = start(mode, pair);
      assert.ok(g.dispatch({type:'battle.step'}));
      const targets = g.state.members.filter(id => g.state.actors[id].statuses.includes('oiled'));
      assert.equal(targets.length, 1);
      const id = targets[0];
      g.load(g.save());
      const actor = g.state.actors[id];
      assert.deepEqual(actor.statusDurations.oiled, {turns:3});
      if (!oiled) removeStatus(actor, 'oiled');
      for (const other of g.state.members) if (other !== id) g.state.actors[other].hp = 0;
      const moth = g.state.battle.enemies[1];
      const hp = actor.hp;
      // Give the moth the second ambush action and a clear line to the coated target.
      g.state.battle.enemies[0].stats.agi = 0;
      if (mode === 'grid') {
        const pos = g.state.battle.grid.positions;
        [pos['enemy:enemy_0'], pos['enemy:enemy_1']] = [pos['enemy:enemy_1'], pos['enemy:enemy_0']];
      }
      assert.ok(g.dispatch({type:'battle.step'}));
      const spell = hp - actor.hp;
      assert.ok(spell > 0);
      assert.equal(actor.statuses.includes('ablaze'), oiled);
      assert.ok(!actor.statuses.includes('oiled'));
      if (oiled) applyStatus(data, g.state, actor, 'oiled');
      actor.hp = hp;
      applySkill(g, actor, moth, data.skills.torch_play, 'torch_play');
      assert.equal(moth.hp, 0);
      return [spell, hp - actor.hp];
    }
    const plain = measure(false), covered = measure(true);
    assert.ok(plain.every(n => n > 0));
    assert.deepEqual(covered, plain.map(n => n * 2));
  });
}

test('油は受け手だけに働き、丸めた火ダメージを倍にする。再付着・解除・持続と他属性', () => {
  const g = start('classic', 'kagaribi_roaming'), actor = g.state.actors.ada, rat = g.state.battle.enemies[0];
  rat.resist = {...rat.resist, fire:0.5};
  function hit(element) {
    return applySkill(g, actor, rat, {name:'確認', effects:[{type:'damage', amount:9, element}]}, null, false, null, false);
  }
  applyStatus(data, g.state, actor, 'oiled');
  assert.equal(hit('fire'), 4);
  for (const level of [1, 2, 3]) {
    applyStatus(data, g.state, rat, 'oiled', undefined, level);
    assert.equal(hit('fire'), 8);
    rat.hp = rat.stats.hp;
  }
  assert.equal(hit('ice'), 9);
  assert.equal(hit('physical'), 9);
  applyStatus(data, g.state, rat, 'oiled');
  tickStatuses(data, g.state, rat, 'turns');
  applyStatus(data, g.state, rat, 'oiled');
  assert.deepEqual(rat.statusDurations.oiled, {turns:3});
  for (let i = 0; i < 3; i++) tickStatuses(data, g.state, rat, 'turns');
  assert.equal(hit('fire'), 4);
  g.finishBattle('escape');
  assert.ok(!actor.statuses.includes('oiled'));
});
