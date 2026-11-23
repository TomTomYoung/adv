// The band defines eligible rosters. A dungeon assigns weights to them and a
// floor can add, reweight or disable an individual roster (weight zero).
export function floorEncounterGroups(data, map) {
  const catalog = data.encounterGroups;
  const profile = catalog?.dungeons[map.dungeon];
  if (!profile) return;
  const level = map.recommendedLevel ?? data.dungeons[map.dungeon]?.recommendedLevel;
  const band = catalog.bands.find(b => b.minLevel <= level && level <= b.maxLevel);
  if (!band) return;

  const weights = {...profile.weights, ...profile.floors?.[map.floor]};
  const encounterPool = [];
  for (const [group, roster] of Object.entries(band.groups)) {
    const weight = weights[group] ?? 0;
    if (!Number.isFinite(weight) || weight < 0) throw Error(map.id + ': 遭遇重みが不正です ' + group);
    if (weight === 0) continue;
    const enemies = [], names = [];
    for (const [species, count] of Object.entries(roster)) {
      const base = data.enemies[species], stats = band.enemies[species];
      if (!base || !stats || !Number.isInteger(count) || count < 1) throw Error(map.id + ': 敵編成が不正です ' + group);
      const enemy = map.id + '_lv' + level + '_' + species;
      data.enemies[enemy] ??= {...base, id: enemy, name: base.name + ' Lv' + level, stats, rewards: band.rewards};
      enemies.push(...Array(count).fill(enemy));
      names.push(base.name + (count > 1 ? '×' + count : ''));
    }
    if (!enemies.length) throw Error(map.id + ': 空の敵編成です ' + group);
    const encounter = map.id + '_lv' + level + '_' + group;
    data.encounters[encounter] = {id: encounter, text: names.join('、') + 'が現れた。', escape: true, enemies};
    encounterPool.push({encounter, weight});
  }
  if (encounterPool.length) return {encounter: encounterPool[0].encounter, encounterPool};
  if (Object.keys(band.groups).some(group => Object.hasOwn(weights, group))) {
    throw Error(map.id + ': このレベル帯で有効な敵編成がありません');
  }
}
