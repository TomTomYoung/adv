import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {data, drain, inspect, pathTo, walk, fight} from './helpers.mjs';
import {GameEngine} from '../src/core/engine.js';
import {formationExperience, xpThreshold} from '../src/core/progression.js';
import {activeActor, endBattle, applySkill} from '../src/core/battle.js';
import {normalEncounterPool} from '../src/core/scouting.js';
import {loadContent, loadPlayableContent} from '../src/core/loader.js';
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
    const earned = g.state.actors.ada.xp - xp;
    assert.equal(earned, floor === 1 ? 9 : 37);
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

test('early floors draw the weighted group on each walking encounter and resume that exact battle', () => {
  const expected = [
    [[1, 40], [2, 25], [1, 15], [1, 20]],
    [[2, 25], [2, 30], [3, 30], [2, 15]],
    [[3, 30], [3, 20], [4, 25], [5, 10], [3, 15], [3, 4], [3, 4], [3, 4], [3, 8]]
  ];
  for (const [index, groups] of expected.entries()) {
    const floor = index + 1, g = newGame();
    enter(g);
    const map = g.data.maps[g.data.dungeons[id].maps[index]];
    g.teleport(map.id, map.entrance.x, map.entrance.y, map.entrance.facing);
    assert.deepEqual(normalEncounterPool(g.data, g.state).pool, map.encounterPool);
    const saved = g.save();
    const total = groups.reduce((sum, [,weight]) => sum + weight, 0);
    let boundary = 0;
    for (const [i, [count, weight]] of groups.entries()) {
      g.load(saved);
      g.state.steps = g.data.system.encounterCheckSteps - 1;
      const rolls = [0, (boundary + 0.5) / total];
      g.random = () => rolls.shift() ?? 0.5;
      assert.ok(g.dispatch({type: 'move', direction: 'forward'}));
      const battle = g.state.battle;
      assert.equal(map.encounterPool[i].weight, weight);
      assert.equal(battle.encounter, map.encounterPool[i].encounter);
      assert.equal(battle.enemies.length, count);
      assert.equal(battle.enemies.reduce((sum, enemy) => sum + enemy.rewards.xp, 0), count * 32);
      assert.ok(battle.enemies.every(enemy => enemy.name.endsWith(' Lv' + floor)));
      const copy = new GameEngine(playable);
      copy.load(g.save());
      assert.deepEqual(copy.state.battle, battle);
      boundary += weight;
    }
    assert.equal(boundary, total);
  }
});

test('Ada meets early-floor normal attack breakpoints with opening-shop weapons', () => {
  const cases = [
    {floor: 1, level: 1, hits: 2}, {floor: 1, level: 3, hits: 1},
    {floor: 3, level: 3, hits: 3}, {floor: 3, level: 3, weapon: 'iron_sword', hits: 2},
    {floor: 3, level: 3, weapon: 'hand_axe', hits: 2}
  ];
  for (const {floor, level, weapon, hits} of cases) {
    const g = newGame();
    g.award(0, g.data.system.xpBase * level * (level - 1));
    if (weapon) {
      g.give(weapon, 1);
      assert.ok(g.equip('ada', weapon));
    }
    enter(g);
    const map = g.data.maps[g.data.dungeons[id].maps[floor - 1]];
    const encounters = map.encounterPool.map(entry => entry.encounter);
    // Every species must satisfy the target, including those in mixed packs.
    const tested = new Set();
    for (const encounter of encounters) {
      const saved = g.save();
      g.startBattle(encounter, {win: [], lose: [], escape: []});
      for (const enemy of g.state.battle.enemies) {
        if (tested.has(enemy.id)) continue;
        tested.add(enemy.id);
        for (let i = 1; i <= hits; i++) {
          applySkill(g, g.state.actors.ada, enemy, g.data.skills.attack, 'attack', false, null, false);
          assert.equal(enemy.hp === 0, i === hits, [level, weapon, enemy.name, i].join(' / '));
        }
      }
      g.load(saved);
    }
    assert.equal(tested.size, floor === 3 ? 5 : 3);
  }
});

test('a tank escort resumes on the sixth floor and fires a log on its second turn', () => {
  const g = newGame();
  g.award(0, xpThreshold(data, 6));
  enter(g);
  const map = g.data.maps[id + '_f6'];
  g.teleport(map.id, map.entrance.x, map.entrance.y, map.entrance.facing);
  g.state.steps = g.data.system.encounterCheckSteps - 1;
  const tankIndex = map.encounterPool.findIndex(row => row.encounter.endsWith('_tank_pair'));
  assert.ok(tankIndex >= 0);
  const sum = rows => rows.reduce((n, row) => n + row.weight, 0);
  const tankWeight = map.encounterPool[tankIndex].weight;
  const rolls = [0, (sum(map.encounterPool.slice(0, tankIndex)) + tankWeight / 2) / sum(map.encounterPool)];
  g.random = () => rolls.shift() ?? 0.5;
  assert.ok(g.dispatch({type: 'move', direction: 'forward'}));
  const copy = newGame();
  copy.load(g.save());
  const battle = copy.state.battle;
  assert.deepEqual(battle.enemies.map(e => e.name), ['戦車ビーバー Lv6', '苔虫 Lv6']);
  const tank = battle.enemies[0];
  const initialMp = tank.mp;
  for (const round of [1, 2]) {
    while (battle.round === round) {
      const actor = activeActor(copy);
      assert.ok(copy.dispatch({type: 'battle', action: 'skill', skill: 'guard', target: actor}));
    }
    assert.equal(tank.mp, round === 1 ? initialMp : initialMp - data.skills.beaver_log_shot.mp);
  }
  assert.ok(battle.log.some(line => line.includes('丸太砲')));
});

test('石虫は防御と岩殻突進を交互に使い、煤虫は初手だけくらやみを狙う', () => {
  const g = newGame();
  g.award(0, xpThreshold(data, 6));
  enter(g);
  const map = g.data.maps[id + '_f6'];
  g.teleport(map.id, map.entrance.x, map.entrance.y, map.entrance.facing);
  const pair = map.encounterPool.find(row => row.encounter.endsWith('_stone_soot_pair'));
  assert.ok(pair?.weight > 0);
  g.startBattle(pair.encounter, {win: [], lose: [], escape: []});
  g.random = () => 0.4;
  const defendRound = engine => {
    const round = engine.state.battle.round;
    while (engine.state.battle.round === round) {
      assert.ok(engine.dispatch({type: 'battle', action: 'skill', skill: 'guard', target: activeActor(engine)}));
    }
  };
  defendRound(g);
  const [stone, soot] = g.state.battle.enemies;
  assert.deepEqual([stone.name, soot.name], ['石虫 Lv6', '煤虫 Lv6']);
  assert.ok(stone.guard);
  assert.equal(soot.mp, 0);
  assert.ok(g.state.members.some(id => g.state.actors[id].statuses.includes('blindness')));
  assert.ok(!g.state.battle.log.some(line => line.includes('岩殻突進')));

  const copy = newGame();
  copy.load(g.save());
  copy.random = () => 0.4;
  defendRound(copy);
  assert.ok(!copy.state.battle.enemies[0].guard);
  assert.ok(copy.state.battle.log.some(line => line.includes('石虫 Lv6の岩殻突進')));
  assert.ok(copy.state.battle.log.some(line => line.includes('煤虫 Lv6の攻撃')));
  defendRound(copy);
  assert.ok(copy.state.battle.enemies[0].guard);
});

test('authored dungeons can assign band groups and add or disable them on one floor', async () => {
  const source = await loadContent(async file => {
    const value = JSON.parse(await fs.readFile(file, 'utf8'));
    if (file === 'data/encounter-groups.json') {
      value.dungeons.kagaribi = {weights: {rat_solo: 1}, floors: {5: {rat_solo: 0, moth_solo: 1}}};
    }
    return value;
  });
  const first = source.maps.kagaribi_f1, second = source.maps.kagaribi_f2;
  const species = map => map.encounterPool.flatMap(e => source.encounters[e.encounter].enemies)
    .map(enemy => source.enemies[enemy].name);
  assert.deepEqual(species(first), ['煤ネズミ Lv1']);
  assert.deepEqual(species(second), ['灯蛾 Lv1']);
  assert.deepEqual(source.maps.region_1_f1.encounterPool, data.maps.region_1_f1.encounterPool);
});

test('a legacy solitary battle resumes with its original HP and rewards before the next group draw', () => {
  const old = new GameEngine(shiftingDungeonData({...data, encounterGroups: undefined}));
  drain(old);
  enter(old);
  const map = old.data.maps[old.data.dungeons[id].maps[2]];
  old.teleport(map.id, map.entrance.x, map.entrance.y);
  old.startBattle(map.encounter, {win: [], lose: [], escape: []});
  const enemy = old.state.battle.enemies[0];
  assert.equal(enemy.stats.hp, 56);
  assert.equal(enemy.rewards.xp, 96);
  enemy.hp = 7;
  const restored = newGame();
  restored.load(old.save());
  assert.deepEqual(restored.state.battle, old.state.battle);
  fight(restored);
  assert.equal(restored.state.actors.ada.xp, 96);
  assert.ok(restored.map().encounterPool.every(entry => entry.encounter !== map.encounter));
});

function averageEncounterXp(catalog, map, actorLevel) {
  const total = map.encounterPool.reduce((sum, entry) => sum + entry.weight, 0);
  return map.encounterPool.reduce((sum, entry) => {
    const encounter = catalog.encounters[entry.encounter];
    assert.equal(encounter.progression.level, map.floor);
    // Average integer rounding over 1,000 victories per formation.
    let earned = 0;
    for (let n = 1; n <= 1000; n++) earned += formationExperience(catalog, encounter, actorLevel, n);
    return sum + earned / 1000 * entry.weight / total;
  }, 0);
}

test('same-level encounters follow the requested pace across all 99 level-ups', () => {
  const targets = [8, 10, 14, 20, 30, 50, 70, 80, 100];
  for (let level = 1; level < 100; level++) {
    const target = targets[Math.min(level, targets.length) - 1];
    const map = playable.maps[playable.dungeons[id].maps[level - 1]];
    const average = averageEncounterXp(playable, map, level);
    const cost = xpThreshold(playable, level) - xpThreshold(playable, level - 1);
    assert.ok(Math.abs(cost / average - target) < 0.02, 'Lv' + level);
    if (level >= 6) {
      assert.ok(map.encounterPool.length >= 7);
      const species = new Set(map.encounterPool.flatMap(e => playable.encounters[e.encounter].enemies));
      assert.ok(species.size >= 4);
    }
  }
});

test('pacing persists across a mixed-level battle and its result, and ignores fallen members', () => {
  const g = newGame();
  g.award(0, xpThreshold(data, 7), ['ada']);
  g.award(0, xpThreshold(data, 5), ['nio', 'sera', 'il']);
  g.state.actors.sera.hp = 0;
  enter(g);
  const map = g.data.maps[id + '_f8'];
  g.teleport(map.id, map.entrance.x, map.entrance.y);
  g.startBattle(map.encounter, {win: [], lose: [], escape: []});
  // The three living levels 8, 6, 6 round to 7.
  assert.equal(g.state.battle.enemyScale, 1.28);
  const copy = newGame();
  copy.load(g.save());
  assert.deepEqual(copy.state.battle, g.state.battle);
  const xp = Object.fromEntries(copy.state.members.map(id => [id, copy.state.actors[id].xp]));
  endBattle(copy, 'win');
  const delta = id => copy.state.actors[id].xp - xp[id];
  assert.ok(delta('ada') > 0 && delta('ada') < delta('nio'));
  assert.equal(delta('sera'), 0);
  for (const id of ['ada', 'nio']) assert.ok(copy.state.waiting.text.includes(data.actors[id].name + 'は' + delta(id)));
  const result = copy.save();
  g.load(result);
  drain(g);
  assert.equal(g.state.actors.ada.xp, xp.ada + delta('ada'));

  const old = newGame();
  enter(old);
  old.startBattle(old.map().encounter, {win: [], lose: [], escape: []});
  const preChange = JSON.parse(old.save());
  delete preChange.state.battle.pacedExperience;
  g.load(JSON.stringify(preChange));
  endBattle(g, 'win');
  assert.equal(g.state.actors.ada.xp, 32);
});

test('going deeper increases combat pressure, caps XP boosts and gives no XP on retreat', () => {
  const g = newGame();
  g.award(0, xpThreshold(data, 5));
  enter(g);
  let last = 0;
  for (const [level, scale] of [[6, 1], [7, 1.245], [8, 1.8]]) {
    const map = g.data.maps[id + '_f' + level];
    g.teleport(map.id, map.entrance.x, map.entrance.y);
    g.startBattle(map.encounter, {win: [], lose: [], escape: []});
    const battle = g.state.battle;
    assert.equal(battle.enemyScale ?? 1, scale);
    assert.ok(battle.enemies[0].stats.str > last);
    last = battle.enemies[0].stats.str;
    const xp = g.state.actors.ada.xp;
    endBattle(g, 'escape');
    assert.equal(g.state.actors.ada.xp, xp);
  }
  const xpAt = floor => averageEncounterXp(g.data, g.data.maps[id + '_f' + floor], 6);
  assert.ok(Math.abs(xpAt(8) - xpAt(7)) < 0.001);
  assert.ok(xpAt(6) > xpAt(1));
});
