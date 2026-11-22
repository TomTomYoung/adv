import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {data, drain, inspect, pathTo, walk, fight} from './helpers.mjs';
import {GameEngine} from '../src/core/engine.js';
import {loadPlayableContent} from '../src/core/loader.js';
import {validateSave} from '../src/core/save.js';
import {validateContent} from '../src/core/validation.js';
import {projectGame} from '../src/application/projection.js';
import {SHIFTING_DUNGEON as id, shiftingDungeonData} from '../src/core/shifting-dungeon.js';

const playable = shiftingDungeonData(data);
const newGame = () => {
  const engine = new GameEngine(playable, 42);
  drain(engine);
  return engine;
};
const enter = engine => assert.ok(engine.dispatch({type: 'travel', dungeon: id}), engine.state.notice);
const returnMark = engine => assert.ok(engine.dispatch({type: 'retreat'}));
const stairs = (engine, floor) => engine.data.dungeons[id].systems.stairs.links[floor - 1];
const cross = (engine, link) => engine.dispatch({type: 'dungeon.action', system: 'stairs', action: 'cross', target: link.id});

for (const edition of ['e1', 'e2']) {
  test(edition + ' opens the labyrinth at the starting square, restores a trip and rerolls on re-entry', async () => {
    const source = edition === 'e1' ? playable : await loadPlayableContent(file => fs.readFile(file, 'utf8').then(JSON.parse), {edition});
    const engine = new GameEngine(source);
    drain(engine);
    const town = engine.state.townLocation;
    const menu = projectGame(engine);
    assert.ok(menu.town.dungeons.some(d => d.id === id));
    assert.ok(menu.dungeons.find(d => d.id === id).canEnter);
    enter(engine);
    assert.equal(engine.map().floor, 1);
    const first = engine.map().tiles;
    const link = stairs(engine, 1);
    assert.equal(cross(engine, link), false);
    engine.random = () => 0.999;
    walk(engine, link.a.x, link.a.y);
    assert.ok(cross(engine, link));
    const second = engine.map().tiles;
    const saved = engine.save();
    assert.deepEqual(validateSave(JSON.parse(saved), source), []);
    const copy = new GameEngine(source);
    copy.load(saved);
    assert.deepEqual(copy.map().tiles, second);
    assert.deepEqual(copy.state.location, engine.state.location);
    assert.deepEqual(copy.state.discovered, engine.state.discovered);
    assert.ok(cross(copy, link));
    assert.deepEqual(copy.map().tiles, first);
    returnMark(copy);
    assert.equal(copy.state.townLocation, town);
    enter(copy);
    assert.notDeepEqual(copy.map().tiles, first);
    assert.equal(copy.state.discovered[link.b.map].length, 0);
    assert.deepEqual(engine.map().tiles, second);
    copy.load(saved);
    assert.deepEqual(copy.map().tiles, second);
    copy.defeat();
    assert.equal(copy.state.townLocation, town);
    enter(copy);
    assert.equal(copy.map().floor, 1);
  });
}

test('all 100 floors connect in order, scale combat and accept the return mark', () => {
  const g = newGame();
  enter(g);
  assert.deepEqual(validateContent(g.data), []);
  g.random = () => 0.999;
  const dungeon = g.data.dungeons[id];
  assert.equal(dungeon.maps.length, 100);
  assert.deepEqual(dungeon.fieldEvents, []);
  assert.equal(dungeon.systems.stairs.links.length, 99);
  let previousHP = 0;
  for (let floor = 1; floor <= 100; floor++) {
    const map = g.map();
    assert.equal(map.floor, floor);
    assert.equal(map.recommendedLevel, floor);
    const enemy = g.data.enemies[g.data.encounters[map.encounter].enemies[0]];
    assert.match(enemy.name, new RegExp('Lv' + floor + '$'));
    assert.ok(enemy.stats.hp > previousHP);
    previousHP = enemy.stats.hp;
    assert.ok(map.objects.every(o => o.kind === 'exit'));
    assert.ok(Object.values(map.cells.legend).every(preset => !g.data.cellTypes[preset].events.length));
    const probe = new GameEngine(data);
    probe.load(g.save());
    returnMark(probe);
    assert.equal(probe.state.mode, 'town');
    const link = stairs(g, floor);
    const destination = link?.a ?? map.objects[0];
    assert.ok(pathTo(g, destination.x, destination.y).length);
    g.teleport(map.id, destination.x, destination.y);
    if (link) assert.ok(cross(g, link));
    else {
      assert.equal(floor, 100);
      g.award(0, 396000);
      g.startBattle(map.encounter, {win: [], lose: [], escape: []});
      const battle = g.save();
      probe.load(battle);
      assert.deepEqual(probe.state.battle.enemies, g.state.battle.enemies);
      fight(g);
      assert.equal(g.state.records.wins, 1);
      inspect(g, 'exit');
      assert.equal(g.state.mode, 'town');
      assert.deepEqual(validateSave(JSON.parse(g.save()), data), []);
    }
  }
});

test('first and middle floors award floor-level combat rewards to the recommended party', () => {
  for (const floor of [1, 50]) {
    const g = newGame();
    enter(g);
    const map = g.data.maps[g.data.dungeons[id].maps[floor - 1]];
    g.teleport(map.id, map.entrance.x, map.entrance.y);
    g.award(0, g.data.system.xpBase * floor * (floor - 1));
    const xp = g.state.actors.ada.xp;
    assert.equal(g.state.actors.ada.level, floor);
    g.startBattle(map.encounter, {win: [], lose: [], escape: []});
    fight(g);
    assert.equal(g.state.records.wins, 1);
    assert.equal(g.state.actors.ada.xp - xp, 32 * floor);
  }
});

test('an old level-30 save keeps banked XP and current HP, MP and statuses, exactly once', () => {
  const g = newGame();
  g.award(0, 34800);
  const old = JSON.parse(g.save());
  delete old.levelCap;
  const actor = old.state.actors.ada;
  actor.xp = 40 * 49 * 50;
  actor.hp = 1;
  actor.mp = 0;
  actor.statuses = ['poison'];
  g.load(JSON.stringify(old));
  const upgraded = g.state.actors.ada;
  assert.equal(upgraded.level, 50);
  assert.equal(upgraded.xp, actor.xp);
  assert.equal(upgraded.growthHistory[actor.job], 49);
  assert.equal(upgraded.hp, 1);
  assert.equal(upgraded.mp, 0);
  assert.deepEqual(upgraded.statuses, actor.statuses);
  const saved = g.save();
  g.load(saved);
  assert.equal(g.save(), saved);
  old.levelCap = 100;
  assert.throws(() => g.load(JSON.stringify(old)));
  assert.equal(g.save(), saved);
});
