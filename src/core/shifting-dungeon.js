import {generateDungeonCandidate} from './dungeon-generator.js';

export const SHIFTING_DUNGEON = 'shifting_labyrinth';
const name = '千変の迷宮';
const floorId = floor => `${SHIFTING_DUNGEON}_f${floor}`;
const exitScript = `${SHIFTING_DUNGEON}.exit`;

// Both endpoints are odd lattice cells visited by the maze generator on every seed.
const sizeFor = floor => 11 + 2 * Math.min(3, Math.floor((floor - 1) / 25));
const entrance = {x: 1, y: 1};
const widthFor = (floor, seed) => sizeFor(floor) + 2 * (seed % 2);
const farCorner = (floor, seed) => ({x: widthFor(floor, seed) - 2, y: sizeFor(floor) - 2});

function floorMap(data, floor, seed) {
  const id = floorId(floor);
  let tiles, cells;
  const layout = () => tiles ??= generateDungeonCandidate({
    seed, candidateIndex: floor, layout: {width: widthFor(floor, seed), height: sizeFor(floor), extraLoops: 2}
  }).tiles;
  const encounter = `${id}_encounter`;
  const objects = [];
  if (floor === 1 || floor === data.system.shiftingDungeonFloors) {
    objects.push({id: 'exit', kind: 'exit', name: '地上への帰路', trigger: 'interact',
      interactionRange: 'here', safe: true, script: exitScript, ...(floor === 1 ? entrance : farCorner(floor, seed))});
  }
  return {
    id, dungeon: SHIFTING_DUNGEON, region: 1, floor, recommendedLevel: floor,
    name: `${name} 地下${floor}階（推奨Lv${floor}）`,
    get tiles() { return layout(); },
    get cells() {
      if (!cells) {
        const rows = layout().map(row => row.replaceAll('#', 'W').replaceAll('.', 'F'));
        for (const {x, y} of [entrance, farCorner(floor, seed)]) rows[y] = rows[y].slice(0, x) + 'S' + rows[y].slice(x + 1);
        cells = {rows, legend: {W: 'stone_wall', F: 'stone_floor', S: 'safe_floor'}, overrides: {}};
      }
      return cells;
    },
    get entrance() { return {...entrance, facing: layout()[1][2] === '.' ? 'east' : 'south'}; },
    background: 'corridor', music: 'exploration', encounter, encounterRate: 0.48,
    encounterPool: [{encounter, weight: 1}], objects
  };
}

function addFloorEncounter(data, floor) {
  const species = ['kagaribi_soot_rat', 'waterwheel_beaver', 'saw_mantis', 'kaleidoscope_owl', 'moon_wolf'];
  const base = data.enemies[species[Math.floor((floor - 1) / 5) % species.length]];
  const id = floorId(floor), enemy = `${id}_beast`, encounter = `${id}_encounter`;
  const growth = floor - 1;
  data.enemies[enemy] = {...base, id: enemy, name: `${base.name} Lv${floor}`,
    stats: {hp: 32 + 12 * growth, mp: base.stats.mp + growth, str: 10 + 2 * growth,
      vit: 4 + growth, agi: 6 + Math.floor(growth / 2), int: 8 + 2 * growth},
    rewards: {xp: 32 * floor, gold: 6 + 2 * growth}};
  data.encounters[encounter] = {id: encounter, text: `${base.name}が現れた。`, escape: true, enemies: [enemy]};
}

// Authored edition catalogs are shared by previews, old-save validation and other engines.
// Only the generated maps depend on the expedition seed. Geometry is built on first access.
export function shiftingDungeonData(source, seed = 0) {
  const count = source.system.shiftingDungeonFloors;
  if (!count || !source.game.dungeonVersion) return source;
  if (source.shiftingLayoutSeed === seed) return source;
  let data = source;
  if (!data.dungeons[SHIFTING_DUNGEON]) {
    const root = source.game.world.townRoot, home = source.locations[root];
    const maps = Array.from({length: count}, (_, i) => floorId(i + 1));
    const dungeon = {id: SHIFTING_DUNGEON, schemaVersion: 1, name, profile: 'classic', region: 1, recommendedLevel: 1,
      description: `入るたびに地形が変わる地下${count}階の迷宮。各階の推奨レベルは階数と同じです。帰還印は全階で使えます。`,
      maps, entries: {main: {map: maps[0], point: 'entrance'}}, systems: {},
      fieldEvents: [], art: source.dungeons.kagaribi.art};
    data = {...source, dungeons: {...source.dungeons, [SHIFTING_DUNGEON]: dungeon},
      locations: {...source.locations, [root]: {...home, dungeons: [...(home.dungeons ?? []), SHIFTING_DUNGEON]}},
      enemies: {...source.enemies}, encounters: {...source.encounters},
      scripts: {...source.scripts, [exitScript]: {commands: [{op: 'town.return'}]}}};
    for (let floor = 1; floor <= count; floor++) addFloorEncounter(data, floor);
  }
  const maps = {...data.maps};
  for (let floor = 1; floor <= count; floor++) maps[floorId(floor)] = floorMap(data, floor, seed);
  const dungeon = data.dungeons[SHIFTING_DUNGEON];
  const links = dungeon.maps.slice(1).map((map, i) => ({
    id: `stairs_${i + 1}`, kind: 'stairs', name: `地下${i + 1}階と地下${i + 2}階の階段`,
    a: {map: dungeon.maps[i], ...farCorner(i + 1, seed)}, b: {map, ...entrance}
  }));
  const systems = {stairs: {use: 'map_connections', links}};
  return {...data, maps, dungeons: {...data.dungeons, [SHIFTING_DUNGEON]: {...dungeon, systems}}, shiftingLayoutSeed: seed};
}

export function savedShiftingSeed(state) {
  return state.dungeons?.persistent?.[SHIFTING_DUNGEON]?.layoutSeed ?? 0;
}
