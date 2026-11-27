import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {guideActor, guideBands, guideGear, loadGuide, monsterFloorText, monsterLevelRows} from '../src/application/labyrinth-guide.js';
import {floorEncounterGroups} from '../src/core/encounter-groups.js';
import {hasMonsterHabit} from '../src/core/monster-habits.js';
import {canEquip} from '../src/core/jobs.js';
import {xpThreshold} from '../src/core/progression.js';
import {newGame} from './helpers.mjs';

const guide = await loadGuide(file => readFile(new URL('../' + file, import.meta.url), 'utf8').then(JSON.parse));

test('個別原画の魔物の生息階は有効な編成から表示する', () => {
  const sections = guideBands(guide, false);
  assert.equal(monsterFloorText(sections, 'moss_beetle'), '地下1〜10階');
  assert.equal(monsterFloorText(sections, 'tank_beaver'), '地下6〜24階');
  assert.equal(monsterFloorText(sections, 'stone_beetle'), '地下6〜14階');
  assert.equal(monsterFloorText(sections, 'soot_beetle'), '地下4〜9階');
  for (const id of ['moss_beetle', 'tank_beaver', 'stone_beetle', 'soot_beetle']) {
    assert.equal(guide.assets.images[guide.enemies[id].sprite], 'assets/images/monsters/' + id + '.webp');
  }
});

test('迷宮図鑑は全階の抽選重みと敵種ごとの個体数を実際の遭遇表と一致させる', () => {
  const data = {...guide, enemies: {...guide.enemies}, encounters: {}};
  const sections = guideBands(guide, false);
  for (let floor = 1; floor <= guide.system.shiftingDungeonFloors; floor++) {
    const section = sections.find(s => s.first <= floor && floor <= s.last);
    const map = {id: 'test', dungeon: 'shifting_labyrinth', floor, recommendedLevel: floor};
    const {encounterPool} = floorEncounterGroups(data, map);
    const eligible = section.groups.filter(g => g.weight);
    assert.equal(eligible.length, encounterPool.length);
    assert.equal(section.total, encounterPool.reduce((sum, e) => sum + e.weight, 0));
    for (const group of eligible) {
      const encounter = 'test_lv' + floor + '_' + group.id;
      assert.equal(encounterPool.find(e => e.encounter === encounter)?.weight, group.weight);
      const actual = data.encounters[encounter].enemies.map(id => data.enemies[id].name);
      assert.deepEqual(actual, group.members.flatMap(m => Array(m.count).fill(m.name + ' Lv' + floor)));
      assert.equal(actual.length, group.count);
    }
  }
  const b3 = sections.find(s => s.first === 3);
  assert.deepEqual(b3.groups.filter(g => g.override).map(g => [g.base, g.weight]), [[20, 10]]);
  assert.equal(guideBands(guide, true).flatMap(s => s.groups).length, guide.encounterGroups.bands.flatMap(b => Object.keys(b.groups)).length);
});

test('同種の比較行が全階の通常遭遇個体と一致し、重み0・他種・旧編成を含まない', () => {
  const data = {...guide, enemies: {...guide.enemies}, encounters: {}};
  const sections = guideBands(guide, false), expected = new Map();
  for (let level = 1; level <= guide.system.shiftingDungeonFloors; level++) {
    const map = {id: 'test', dungeon: 'shifting_labyrinth', floor: level, recommendedLevel: level};
    const {encounterPool} = floorEncounterGroups(data, map);
    const ids = new Set(encounterPool.flatMap(({encounter}) => data.encounters[encounter].enemies));
    for (const id of ids) {
      const actual = data.enemies[id], species = id.slice(('test_lv' + level + '_').length);
      const habits = (actual.habits ?? []).filter(h => hasMonsterHabit(data, {id, instance:'enemy_0'}, h));
      if (!expected.has(species)) expected.set(species, []);
      expected.get(species).push({level, stats:actual.stats, habits});
    }
  }
  for (const species of Object.keys(guide.enemies)) {
    assert.deepEqual(monsterLevelRows(guide, sections, species), expected.get(species) ?? [], species);
  }
  const rat = monsterLevelRows(guide, sections, 'kagaribi_soot_rat');
  assert.deepEqual(rat.map(r => [r.level,r.stats.hp,r.habits]), [
    [1,17,[]], [2,28,[]], [3,40,[]], [4,45,[]], [5,53,['soot_smoke']]
  ]);
});

test('一つの帯の途中にある優先設定と、重みゼロの候補を区別する', () => {
  const data = {...guide, encounterGroups: structuredClone(guide.encounterGroups)};
  const band = data.encounterGroups.bands.find(b => b.minLevel === 11);
  const id = Object.keys(band.groups)[0];
  data.encounterGroups.dungeons.shifting_labyrinth.floors = {13: {[id]: 0}};
  const sections = guideBands(data, false).filter(s => s.band === band);
  assert.deepEqual(sections.map(s => [s.first, s.last]), [[11, 12], [13, 13], [14, 14]]);
  const disabled = sections[1].groups.find(g => g.id === id);
  assert.equal(disabled.weight, 0);
  assert.equal(disabled.override, true);
  assert.ok(guideBands(data, true).find(s => s.band === band).groups.some(g => g.id === id));
});

test('実際に育成・装備したアダと図鑑の素の能力値・装備込み能力値・戦闘技能が一致する', () => {
  const engine = newGame();
  for (const level of [1, 2, 3, 5, 6, 10, 11, 100]) {
    engine.award(0, xpThreshold(guide, level - 1) - engine.state.actors.ada.xp, ['ada']);
    for (const slot of Object.keys(engine.state.actors.ada.equipment)) assert.ok(engine.unequip('ada', slot));
    const row = guideActor(guide, 'ada', guide.actors.ada.initialJob, level, 'auto');
    assert.deepEqual(row.base, engine.stats('ada'));
    for (const item of Object.values(row.gear.equipment)) {
      engine.give(item, 1);
      assert.ok(engine.equip('ada', item));
    }
    assert.deepEqual(row.stats, engine.stats('ada'));
    assert.deepEqual(row.grants.filter(g => g.api === 'battle.skill').map(g => g.skill), engine.skills('ada'));
  }
});

test('仲間と全職の想定装備が職業条件を満たし、技能と上位武器の解放条件を参照できる', () => {
  for (const id of Object.keys(guide.actors)) for (const job of Object.keys(guide.jobs)) {
    const state = {actors: {[id]: {job}}};
    for (const mode of ['none', 'town', 'tier1', 'tier2']) {
      const {equipment, requirement} = guideGear(guide, id, job, 100, mode);
      for (const [slot, item] of Object.entries(equipment)) {
        assert.equal(guide.items[item].slot, slot);
        assert.ok(canEquip(guide, state, id, item));
      }
      if (equipment.weapon?.startsWith('exp_')) assert.ok(requirement);
    }
    for (const grant of guideActor(guide, id, job, 100, 'auto').grants) {
      assert.ok((grant.api === 'battle.skill' ? guide.skills : guide.fieldAbilities)[grant.skill]?.name);
    }
  }
});

test('千変6〜9階は各階の専用編成を抽選し、共通候補と他の階に重みを加えない', () => {
  const sections = guideBands(guide, false);
  const common = guideBands(guide, true).find(s => s.first === 6);
  assert.equal(common.last, 9);
  const additions = [
    ['stone_log_escort', 'shell_stone_guard', 'mochi_escort', 'stone_sling'],
    ['sticky_escort', 'hunter_iron_moth', 'diviner_butterflies'],
    ['bone_shield_archer', 'drop_stone_escort', 'berry_escort', 'bubble_escort', 'bone_skull_drummer'],
    ['torch_oil_moth_swarm', 'oil_globe_firebrand', 'drop_moth_escort']
  ];
  for (const [index, ids] of additions.entries()) {
    const floor = index + 6;
    const section = sections.find(s => s.first === floor);
    assert.equal(section.last, floor);
    assert.deepEqual(section.groups.filter(g => !g.base && g.weight > 0).map(g => g.id), ids);
    for (const id of ids) {
      assert.ok(common.groups.some(g => g.id === id));
      assert.deepEqual(sections.filter(s => s.groups.some(g => g.id === id && g.weight > 0)).map(s => s.first), [floor]);
    }
  }
});

test('千変5〜10階の亜人は指定の系統だけが出現し、スライム26種は別種との混成で散らばる', () => {
  const sections = guideBands(guide, false);
  const featured = ['goblin','goblin','orc','orc','ogre','ogre'];
  const slimes = new Set();
  for (let floor = 5; floor <= 29; floor++) {
    const {groups} = sections.find(s => s.first <= floor && floor <= s.last);
    const present = groups.filter(g => g.weight > 0);
    const members = present.flatMap(g => g.members.map(m => guide.enemies[m.id]));
    if (floor <= 10) assert.deepEqual(new Set(members.map(m => m.family).filter(f => featured.includes(f))), new Set([featured[floor - 5]]));
    const local = members.filter(m => m.family === 'slime');
    assert.ok(local.length > 0, floor);
    for (const slime of new Set(local)) {
      if (slime.id === 'slime_5_drop') assert.ok([5,8,9].includes(floor));
      else assert.ok(!slimes.has(slime.id), slime.id);
      slimes.add(slime.id);
    }
    for (const g of present) {
      const count = g.members.filter(m => guide.enemies[m.id].family === 'slime').reduce((n,m) => n+m.count,0);
      if (count) assert.ok(count === 1 && g.count > 1, g.id);
    }
  }
  assert.equal(slimes.size,26);
});
