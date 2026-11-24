import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {guideActor, guideBands, guideGear, loadGuide, monsterFloorText} from '../src/application/labyrinth-guide.js';
import {floorEncounterGroups} from '../src/core/encounter-groups.js';
import {canEquip} from '../src/core/jobs.js';
import {xpThreshold} from '../src/core/progression.js';
import {newGame} from './helpers.mjs';

const guide = await loadGuide(file => readFile(new URL('../' + file, import.meta.url), 'utf8').then(JSON.parse));

test('苔虫と戦車ビーバーの生息階は有効な編成から表示する', () => {
  const sections = guideBands(guide, false);
  assert.equal(monsterFloorText(sections, 'moss_beetle'), '地下1〜10階');
  assert.equal(monsterFloorText(sections, 'tank_beaver'), '地下6〜24階');
  for (const id of ['moss_beetle', 'tank_beaver']) {
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

test('一つの帯の途中にある優先設定と、重みゼロの候補を区別する', () => {
  const data = {...guide, encounterGroups: structuredClone(guide.encounterGroups)};
  const band = data.encounterGroups.bands.find(b => b.minLevel === 6);
  const id = Object.keys(band.groups)[0];
  data.encounterGroups.dungeons.shifting_labyrinth.floors[8] = {[id]: 0};
  const sections = guideBands(data, false).filter(s => s.band === band);
  assert.deepEqual(sections.map(s => [s.first, s.last]), [[6, 7], [8, 8], [9, 10]]);
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
