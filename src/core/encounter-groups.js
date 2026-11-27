function enemyStats(catalog, template, level) {
  if (typeof template !== 'string') return template;
  const {base, perLevel} = catalog.growthProfiles[template];
  return Object.fromEntries(Object.entries(base).map(([key, value]) =>
    [key, Math.floor(value + (level - 1) * perLevel[key])]));
}

export const encounterWeightsForFloor = (profile, floor) => ({...profile.weights, ...profile.floors?.[floor]});

// The band defines eligible rosters. A dungeon assigns weights to them and a
// floor can add, reweight or disable an individual roster (weight zero).
export function floorEncounterGroups(data, map) {
  const catalog = data.encounterGroups;
  const profile = catalog?.dungeons[map.dungeon];
  if (!profile) return;
  const level = map.recommendedLevel ?? data.dungeons[map.dungeon]?.recommendedLevel;
  const band = catalog.bands.find(b => b.minLevel <= level && level <= b.maxLevel);
  if (!band) return;

  const weights = encounterWeightsForFloor(profile, map.floor);
  const encounterPool = [], defined = [];
  for (const [group, roster] of Object.entries(band.groups)) {
    const weight = weights[group] ?? 0;
    if (!Number.isFinite(weight) || weight < 0) throw Error(map.id + ': 遭遇重みが不正です ' + group);
    // Explicit zero keeps former battles and kill records loadable, outside the draw pool.
    if (!Object.hasOwn(weights, group)) continue;
    const enemies = [], names = [];
    for (const [species, count] of Object.entries(roster)) {
      const base = data.enemies[species], stats = enemyStats(catalog, band.enemies[species], level);
      if (!base || !stats || !Number.isInteger(count) || count < 1) throw Error(map.id + ': 敵編成が不正です ' + group);
      const enemy = map.id + '_lv' + level + '_' + species;
      data.enemies[enemy] ??= {...base, id: enemy, level, name: base.name + ' Lv' + level, stats, rewards: band.rewards};
      enemies.push(...Array(count).fill(enemy));
      names.push(base.name + (count > 1 ? '×' + count : ''));
    }
    if (!enemies.length) throw Error(map.id + ': 空の敵編成です ' + group);
    const encounter = map.id + '_lv' + level + '_' + group;
    data.encounters[encounter] = {id: encounter, text: names.join('、') + 'が現れた。', escape: true, enemies};
    if (enemies.length <= 15 && enemies.some(id => data.enemies[id].family)) {
      // A shield can start in front of its pikeman in all three battle modes.
      const lanes = [2, 1, 3, 0, 4], counts = [0, 0, 0];
      const formation = enemies.map(id => {
        const preferred = data.enemies[id].combatRow ?? 0;
        const depth = counts[preferred] < lanes.length ? preferred : counts.findIndex(n => n < lanes.length);
        return {depth, lane: lanes[counts[depth]++]};
      });
      data.encounters[encounter].frontlinePositions = formation;
      data.encounters[encounter].enemyPositions = formation.map(p => ({x: p.lane, y: 2 - p.depth}));
    }
    defined.push(encounter);
    if (weight > 0) encounterPool.push({encounter, weight});
  }
  if (encounterPool.length) {
    if (profile.progression) {
      const count = id => data.encounters[id].enemies.length;
      const weight = encounterPool.reduce((sum, e) => sum + e.weight, 0);
      const meanSize = encounterPool.reduce((sum, e) => sum + count(e.encounter) * e.weight, 0) / weight;
      for (const id of defined) {
        const encounter = data.encounters[id];
        // Half the reward is for victory, half is proportional to the size of this formation.
        encounter.progression = {dungeon: map.dungeon, level, rewardFactor: (1 + count(id) / meanSize) / 2};
      }
    }
    return {encounter: encounterPool[0].encounter, encounterPool};
  }
  if (Object.keys(band.groups).some(group => Object.hasOwn(weights, group))) {
    throw Error(map.id + ': このレベル帯で有効な敵編成がありません');
  }
}
