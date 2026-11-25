import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame, drain} from './helpers.mjs';
import {projectGame} from '../src/application/projection.js';
import {endBattle} from '../src/core/battle.js';

const cases = [
  ['kagaribi_f1', 0.20, 'kagaribi_soot_rat'],
  ['kagaribi_f1', 0.45, 'kagaribi_soot_ball'],
  ['kagaribi_crossroads', 0.45, 'kagaribi_torch_thief'],
  ['kagaribi_kilns', 0.80, 'kagaribi_chimney_rat'],
];

for (const [floor, roll, species] of cases) {
  test(`walk into ${species} on ${floor}, then reload its battle art`, () => {
    const game = newGame();
    game.teleport(floor, 2, 1, 'east');
    drain(game);
    game.setPortableFire({fuel: 90, effect: 'ordinary'});
    game.state.steps = game.data.system.encounterCheckSteps - 1;
    const rolls = [0, roll];
    game.random = () => rolls.shift() ?? 0.5;
    assert.ok(game.dispatch({type: 'move', direction: 'forward'}));
    const enemy = game.state.battle.enemies[0];
    assert.equal(enemy.id, species);
    const expected = 'assets/images/monsters/' + species + '.webp';
    assert.equal(projectGame(game).battle.enemies[0].sprite, expected);
    if (species === 'kagaribi_soot_rat') enemy.sprite = 'monster_vault_mouse'; // Previous-release battle save.
    const saved = game.save();
    const restored = newGame();
    restored.load(saved);
    assert.equal(projectGame(restored).battle.enemies[0].sprite, expected);

    if (species === 'kagaribi_torch_thief') {
      const item = 'kagaribi_torch_stub';
      endBattle(restored, 'win');
      drain(restored);
      assert.equal(restored.state.inventory[item], 1);
      assert.ok(restored.dispatch({type: 'item', item, actor: 'ada'}));
      drain(restored);
      assert.equal(restored.state.inventory[item] ?? 0, 0);
      assert.ok(restored.state.discovered[floor].includes('5,3'));
    }
  });
}
