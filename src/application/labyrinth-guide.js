import {encounterWeightsForFloor} from '../core/encounter-groups.js';
import {actorStats, canEquip, grantsFor} from '../core/jobs.js';
import {readContentJson} from '../core/read-content-json.js';

export async function loadGuide(read = readContentJson) {
  const game = await read('data/game.json');
  const types = ['actors', 'system', 'skills', 'items', 'enemies', 'encounterGroups', 'shops', 'assets', 'jobs', 'jobProfile', 'fieldAbilities', 'expedition'];
  const [entries, parties] = await Promise.all([
    Promise.all(types.map(async key => [key, await read(game.files.databases[key])])),
    read('playtests/quest-parties.json')
  ]);
  return {...Object.fromEntries(entries), loadouts: parties.loadouts};
}

// The labyrinth's recommended level is its floor. Keep ranges compact, but split at every floor override.
export function guideBands(data, common) {
  const catalog = data.encounterGroups;
  const profile = catalog.dungeons.shifting_labyrinth;
  const max = data.system.shiftingDungeonFloors;
  const sections = [];
  for (const band of catalog.bands) {
    const end = common ? band.maxLevel : Math.min(max, band.maxLevel);
    if (band.minLevel > end) continue;
    const cuts = new Set([band.minLevel, end + 1]);
    if (!common) for (const f of Object.keys(profile.floors ?? {}).map(Number)) {
      if (f >= band.minLevel && f <= end) { cuts.add(f); cuts.add(f + 1); }
    }
    const bounds = [...cuts].sort((a, b) => a - b);
    for (let i = 0; i < bounds.length - 1; i++) {
      const first = bounds[i], last = bounds[i + 1] - 1;
      const weights = common ? {} : encounterWeightsForFloor(profile, first);
      const groups = Object.entries(band.groups).map(([id, roster]) => {
        const members = Object.entries(roster).map(([species, count]) => {
          const enemy = data.enemies[species];
          return {name: enemy.name, image: data.assets.images[enemy.sprite], count};
        });
        const weight = weights[id] ?? 0;
        const override = !common && Object.hasOwn(profile.floors?.[first] ?? {}, id);
        return {id, members, count: members.reduce((sum, m) => sum + m.count, 0),
          weight, base: profile.weights[id] ?? 0, override};
      });
      const total = groups.reduce((sum, row) => sum + row.weight, 0);
      sections.push({first, last, band, groups, total});
    }
  }
  return sections;
}

export const gearStages = {
  auto: 'レベル帯の想定', none: '装備なし', town: '町の店売り', tier1: '第1段階の武器', tier2: '第2段階の武器'
};
export function guideGear(data, actor, job, level, mode) {
  const stage = mode === 'auto' ? (level <= 2 ? 'none' : level <= 5 ? 'town' : level <= 10 ? 'tier1' : 'tier2') : mode;
  if (stage === 'none') return {stage, equipment: {}, requirement: ''};
  const state = {actors: {[actor]: {job}}};
  const permitted = id => canEquip(data, state, actor, id);
  const equipment = {};
  const preset = data.loadouts[actor]?.equipment ?? [];
  const stock = data.shops.goods.filter(g => !g.condition).map(g => g.item);
  for (const slot of ['weapon','armor','charm']) {
    const preferred = preset.find(id => data.items[id].slot === slot && permitted(id));
    const def = data.jobs[job];
    const fallback = slot !== 'charm' && def.equipment[slot].map(type => stock.find(id =>
      data.items[id]?.slot === slot && data.items[id].equipmentType === type && permitted(id))).find(Boolean);
    if (preferred || fallback) equipment[slot] = preferred || fallback;
  }
  let requirement = '';
  if (stage === 'tier1' || stage === 'tier2') {
    const weapon = data.items[equipment.weapon];
    const prefix = stage === 'tier1' ? 'exp_t1_' : 'exp_t2_';
    const upgrade = data.shops.goods.find(g => g.item.startsWith(prefix) && weapon &&
      data.items[g.item]?.equipmentType === weapon.equipmentType && permitted(g.item));
    if (upgrade) { equipment.weapon = upgrade.item; requirement = upgrade.requirement; }
  }
  return {stage, equipment, requirement};
}

export function guideActor(data, id, job, level, mode) {
  const gear = guideGear(data, id, job, level, mode);
  const actor = {id, level, job, growthHistory: {[job]: level - 1}, equipment: {}, statuses: []};
  const state = {actors: {[id]: actor}};
  const base = actorStats(data, state, id, false);
  actor.equipment = gear.equipment;
  const stats = actorStats(data, state, id, false);
  const grants = grantsFor(data, state, id).filter(g => g.level <= level);
  return {base, stats, gear, grants};
}
