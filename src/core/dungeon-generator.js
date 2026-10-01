import {featureAlgorithms, generateFeatureMask, generateTerrainTopology, terrainAlgorithms} from './dungeon-terrain.js';

const DIRECTIONS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

const MODE_SET = new Set(['corridors', 'bulges', 'rooms']);
const ROOM_SHAPES = new Set([
  'rectangle',
  'square',
  'l_shape',
  't_shape',
  'cross',
  'chamfered',
  'roundish',
  'mask',
]);

const rangeValue = (value, fallback) => {
  if (Number.isInteger(value)) return { min: value, max: value };
  if (value && Number.isInteger(value.min) && Number.isInteger(value.max)) {
    return { min: value.min, max: value.max };
  }
  return { ...fallback };
};

const clone = value => JSON.parse(JSON.stringify(value));
const inside = (grid, x, y) => y >= 0 && y < grid.length && x >= 0 && x < grid[0].length;
const keyOf = (x, y) => `${x},${y}`;
const manhattan = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const mapCell = (candidate, x, y) => candidate.grid?.[y]?.[x] ?? candidate.tiles?.[y]?.[x];

function hashSeed(...parts) {
  let hash = 2166136261 >>> 0;
  const text = parts.map(part => String(part)).join('|');
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash || 0x9e3779b9;
}

function rngFor(seed, ...phase) {
  let state = hashSeed(seed, ...phase);
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

const randomInt = (rng, min, max) => min + Math.floor(rng() * (max - min + 1));
const randomItem = (rng, items) => items[Math.floor(rng() * items.length)];

function weightedItem(rng, items, fallback) {
  if (!Array.isArray(items) || items.length === 0) return fallback;
  const valid = items.filter(item => item && Number.isFinite(item.weight) && item.weight > 0);
  if (!valid.length) return fallback;
  const total = valid.reduce((sum, item) => sum + item.weight, 0);
  let cursor = rng() * total;
  for (const item of valid) {
    cursor -= item.weight;
    if (cursor < 0) return item;
  }
  return valid.at(-1);
}

function validateRange(name, value, minAllowed, maxAllowed) {
  if (!Number.isInteger(value.min) || !Number.isInteger(value.max) || value.min > value.max) {
    throw new Error(`${name} must be an integer range with min <= max`);
  }
  if (value.min < minAllowed || value.max > maxAllowed) {
    throw new Error(`${name} must stay within ${minAllowed}..${maxAllowed}`);
  }
}

export function normalizeDungeonLayout(layout = {}) {
  const mode = layout.mode ?? 'corridors';
  if (!MODE_SET.has(mode)) throw new Error(`unsupported layout mode: ${mode}`);

  const width = layout.width ?? 25;
  const height = layout.height ?? 21;
  if (!Number.isInteger(width) || width < 5 || width > 50) throw new Error('width must be an integer in 5..50');
  if (!Number.isInteger(height) || height < 5 || height > 50) throw new Error('height must be an integer in 5..50');

  const corridorWidth = layout.corridorWidth ?? 1;
  if (corridorWidth !== 1) {
    throw new Error('prototype currently supports corridorWidth=1; width 2..3 is reserved by the specification');
  }

  const extraLoops = rangeValue(layout.extraLoops, { min: 0, max: 1 });
  validateRange('extraLoops', extraLoops, 0, 64);

  const terrainAlgorithm = layout.terrain?.algorithm ?? 'classic';
  if (!terrainAlgorithms.includes(terrainAlgorithm)) throw new Error(`unsupported terrain algorithm: ${terrainAlgorithm}`);
  const terrain = {algorithm: terrainAlgorithm, options: clone(layout.terrain?.options ?? {})};

  const bulges = {
    count: rangeValue(layout.bulges?.count, mode === 'bulges' ? { min: 3, max: 5 } : { min: 0, max: 0 }),
    positions: Array.isArray(layout.bulges?.positions) && layout.bulges.positions.length
      ? [...layout.bulges.positions]
      : ['along_corridor', 'dead_end'],
    shapes: Array.isArray(layout.bulges?.shapes) && layout.bulges.shapes.length
      ? clone(layout.bulges.shapes)
      : [{ id: 'side_alcove', weight: 1 }],
    addedArea: rangeValue(layout.bulges?.addedArea, { min: 1, max: 4 }),
    minSpacing: layout.bulges?.minSpacing ?? 3,
    featureAlgorithm: layout.bulges?.featureAlgorithm ?? 'primitive',
    shapeOptions: clone(layout.bulges?.shapeOptions ?? {}),
    promoteToRoomArea: layout.bulges?.promoteToRoomArea ?? 12,
  };
  validateRange('bulges.count', bulges.count, 0, 64);
  validateRange('bulges.addedArea', bulges.addedArea, 1, 225);
  if (!featureAlgorithms.includes(bulges.featureAlgorithm)) throw new Error(`unsupported bulge feature algorithm: ${bulges.featureAlgorithm}`);
  if (!Number.isInteger(bulges.promoteToRoomArea) || bulges.promoteToRoomArea < 4 || bulges.promoteToRoomArea > 225) throw new Error('bulges.promoteToRoomArea must be an integer in 4..225');
  if (!Number.isInteger(bulges.minSpacing) || bulges.minSpacing < 0 || bulges.minSpacing > 20) {
    throw new Error('bulges.minSpacing must be an integer in 0..20');
  }
  for (const position of bulges.positions) {
    if (!['along_corridor', 'dead_end'].includes(position)) throw new Error(`unsupported bulge position: ${position}`);
  }

  const rooms = {
    count: rangeValue(layout.rooms?.count, mode === 'rooms' ? { min: 3, max: 5 } : { min: 0, max: 0 }),
    shapes: Array.isArray(layout.rooms?.shapes) && layout.rooms.shapes.length
      ? clone(layout.rooms.shapes)
      : [{ id: 'rectangle', weight: 1 }],
    width: rangeValue(layout.rooms?.width, { min: 5, max: 9 }),
    height: rangeValue(layout.rooms?.height, { min: 5, max: 9 }),
    minArea: layout.rooms?.minArea ?? 9,
    mirror: Boolean(layout.rooms?.mirror),
    wallThickness: layout.rooms?.wallThickness ?? 1,
    entrances: rangeValue(layout.rooms?.entrances, { min: 1, max: 2 }),
    directRoomLinks: Boolean(layout.rooms?.directRoomLinks),
    featureAlgorithm: layout.rooms?.featureAlgorithm ?? 'primitive',
    shapeOptions: clone(layout.rooms?.shapeOptions ?? {}),
  };
  if (!featureAlgorithms.includes(rooms.featureAlgorithm)) throw new Error(`unsupported room feature algorithm: ${rooms.featureAlgorithm}`);
  validateRange('rooms.count', rooms.count, 0, 32);
  validateRange('rooms.width', rooms.width, 3, 15);
  validateRange('rooms.height', rooms.height, 3, 15);
  validateRange('rooms.entrances', rooms.entrances, 1, 4);
  if (!Number.isInteger(rooms.minArea) || rooms.minArea < 1 || rooms.minArea > 225) throw new Error('rooms.minArea must be 1..225');
  if (!Number.isInteger(rooms.wallThickness) || rooms.wallThickness < 0 || rooms.wallThickness > 4) {
    throw new Error('rooms.wallThickness must be an integer in 0..4');
  }
  for (const shape of rooms.shapes) {
    if (!shape || !ROOM_SHAPES.has(shape.id)) throw new Error(`unsupported room shape: ${shape?.id}`);
  }

  if (mode === 'corridors' && (bulges.count.max !== 0 || rooms.count.max !== 0)) {
    throw new Error('corridors mode requires zero bulges and zero rooms');
  }
  if (mode === 'bulges' && (bulges.count.min < 1 || rooms.count.max !== 0)) {
    throw new Error('bulges mode requires at least one bulge and zero rooms');
  }
  if (mode === 'rooms' && rooms.count.min < 1) throw new Error('rooms mode requires at least one room');

  return {
    mode,
    width,
    height,
    corridorWidth,
    extraLoops,
    terrain,
    bulges,
    rooms,
  };
}

function blankCandidate(layout) {
  return {
    width: layout.width,
    height: layout.height,
    grid: Array.from({ length: layout.height }, () => Array(layout.width).fill('#')),
    region: Array.from({ length: layout.height }, () => Array(layout.width).fill('#')),
    rooms: [],
    bulges: [],
    warnings: [],
  };
}

function carve(candidate, x, y, region = 'c') {
  if (x <= 0 || y <= 0 || x >= candidate.width - 1 || y >= candidate.height - 1) return false;
  candidate.grid[y][x] = '.';
  if (candidate.region[y][x] === '#') candidate.region[y][x] = region;
  return true;
}

function floorNeighborCount(candidate, x, y, includeBulges = true) {
  return DIRECTIONS.reduce((count, [dx, dy]) => {
    const nx = x + dx;
    const ny = y + dy;
    if (!inside(candidate.grid, nx, ny)) return count;
    if (candidate.grid[ny][nx] !== '.') return count;
    if (!includeBulges && candidate.region[ny][nx] === 'b') return count;
    return count + 1;
  }, 0);
}

function createsTwoByTwo(candidate, x, y) {
  for (const oy of [-1, 0]) {
    for (const ox of [-1, 0]) {
      let floors = 0;
      for (let yy = y + oy; yy <= y + oy + 1; yy += 1) {
        for (let xx = x + ox; xx <= x + ox + 1; xx += 1) {
          if ((xx === x && yy === y) || (inside(candidate.grid, xx, yy) && candidate.grid[yy][xx] === '.')) floors += 1;
        }
      }
      if (floors === 4) return true;
    }
  }
  return false;
}

function generateCorridors(candidate, layout, seed, candidateIndex) {
  const rng = rngFor(seed, candidateIndex, 'corridors');
  const maxX = candidate.width - 2;
  const maxY = candidate.height - 2;
  const start = { x: 1, y: 1 };
  const stack = [start];
  carve(candidate, start.x, start.y, 'c');

  while (stack.length) {
    const current = stack.at(-1);
    const options = DIRECTIONS
      .map(([dx, dy]) => ({ x: current.x + dx * 2, y: current.y + dy * 2, dx, dy }))
      .filter(next => next.x > 0 && next.x <= maxX && next.y > 0 && next.y <= maxY && candidate.grid[next.y][next.x] === '#');
    if (!options.length) {
      stack.pop();
      continue;
    }
    const next = randomItem(rng, options);
    carve(candidate, current.x + next.dx, current.y + next.dy, 'c');
    carve(candidate, next.x, next.y, 'c');
    stack.push({ x: next.x, y: next.y });
  }

  const loops = randomInt(rng, layout.extraLoops.min, layout.extraLoops.max);
  const walls = [];
  for (let y = 1; y < candidate.height - 1; y += 1) {
    for (let x = 1; x < candidate.width - 1; x += 1) {
      if (candidate.grid[y][x] !== '#') continue;
      const horizontal = candidate.grid[y][x - 1] === '.' && candidate.grid[y][x + 1] === '.';
      const vertical = candidate.grid[y - 1][x] === '.' && candidate.grid[y + 1][x] === '.';
      if ((horizontal || vertical) && !createsTwoByTwo(candidate, x, y)) walls.push({ x, y });
    }
  }
  for (let i = 0; i < loops && walls.length; i += 1) {
    const index = randomInt(rng, 0, walls.length - 1);
    const [wall] = walls.splice(index, 1);
    if (!createsTwoByTwo(candidate, wall.x, wall.y)) carve(candidate, wall.x, wall.y, 'c');
  }
}

function candidateBulgeAnchors(candidate, positions) {
  const out = [];
  for (let y = 1; y < candidate.height - 1; y += 1) {
    for (let x = 1; x < candidate.width - 1; x += 1) {
      if (candidate.region[y][x] !== 'c') continue;
      const degree = floorNeighborCount(candidate, x, y, false);
      const kind = degree === 1 ? 'dead_end' : degree === 2 ? 'along_corridor' : null;
      if (kind && positions.includes(kind)) out.push({ x, y, kind });
    }
  }
  return out;
}

function bulgeSeedOptions(candidate, anchor) {
  const options = [];
  for (const [dx, dy] of DIRECTIONS) {
    const x = anchor.x + dx;
    const y = anchor.y + dy;
    if (x <= 0 || y <= 0 || x >= candidate.width - 1 || y >= candidate.height - 1) continue;
    if (candidate.grid[y][x] !== '#') continue;
    let touchesOtherFloor = false;
    for (const [adx, ady] of DIRECTIONS) {
      const nx = x + adx;
      const ny = y + ady;
      if (nx === anchor.x && ny === anchor.y) continue;
      if (inside(candidate.grid, nx, ny) && candidate.grid[ny][nx] === '.') touchesOtherFloor = true;
    }
    if (!touchesOtherFloor) options.push({ x, y });
  }
  return options;
}

function growBulge(candidate, anchor, area, rng, bulgeOptions) {
  const seeds = bulgeSeedOptions(candidate, anchor);
  if (!seeds.length) return null;
  const first = randomItem(rng, seeds);
  const chosen = [first];
  const chosenKeys = new Set([keyOf(first.x, first.y)]);

  while (chosen.length < area) {
    const frontier = [];
    const seen = new Set();
    for (const cell of chosen) {
      for (const [dx, dy] of DIRECTIONS) {
        const x = cell.x + dx;
        const y = cell.y + dy;
        const key = keyOf(x, y);
        if (chosenKeys.has(key) || seen.has(key)) continue;
        seen.add(key);
        if (x <= 0 || y <= 0 || x >= candidate.width - 1 || y >= candidate.height - 1) continue;
        if (candidate.grid[y][x] !== '#') continue;
        let foreignFloor = false;
        for (const [adx, ady] of DIRECTIONS) {
          const nx = x + adx;
          const ny = y + ady;
          if ((nx === anchor.x && ny === anchor.y) || chosenKeys.has(keyOf(nx, ny))) continue;
          if (inside(candidate.grid, nx, ny) && candidate.grid[ny][nx] === '.') foreignFloor = true;
        }
        if (!foreignFloor) frontier.push({ x, y });
      }
    }
    if (!frontier.length) break;
    const next = randomItem(rng, frontier);
    chosen.push(next);
    chosenKeys.add(keyOf(next.x, next.y));
  }

  if (!chosen.length) return null;
  let finalCells = chosen;
  const minX = Math.max(1, Math.min(...chosen.map(cell => cell.x)) - 2);
  const minY = Math.max(1, Math.min(...chosen.map(cell => cell.y)) - 2);
  const maxX = Math.min(candidate.width - 2, Math.max(...chosen.map(cell => cell.x)) + 2);
  const maxY = Math.min(candidate.height - 2, Math.max(...chosen.map(cell => cell.y)) + 2);
  const localWidth = maxX - minX + 1;
  const localHeight = maxY - minY + 1;
  const baseMask = Array.from({length: localHeight}, () => Array(localWidth).fill(false));
  for (const cell of chosen) baseMask[cell.y - minY][cell.x - minX] = true;
  const preferred = {x: first.x - minX, y: first.y - minY};
  const enhanced = generateFeatureMask({
    width: localWidth,
    height: localHeight,
    baseMask,
    algorithm: bulgeOptions.featureAlgorithm,
    options: bulgeOptions.shapeOptions,
    preferred,
  }, rng);
  const enhancedCells = [];
  for (let y = 0; y < enhanced.length; y += 1) {
    for (let x = 0; x < enhanced[y].length; x += 1) {
      if (!enhanced[y][x]) continue;
      const gx = minX + x;
      const gy = minY + y;
      if (candidate.grid[gy][gx] !== '#') continue;
      enhancedCells.push({x: gx, y: gy});
    }
  }
  const enhancedKeys = new Set(enhancedCells.map(cell => keyOf(cell.x, cell.y)));
  const touchesForeign = enhancedCells.some(cell => DIRECTIONS.some(([dx, dy]) => {
    const nx = cell.x + dx;
    const ny = cell.y + dy;
    if (nx === anchor.x && ny === anchor.y) return false;
    return inside(candidate.grid, nx, ny) && candidate.grid[ny][nx] === '.' && !enhancedKeys.has(keyOf(nx, ny));
  }));
  if (!touchesForeign && enhancedCells.length >= Math.min(3, chosen.length)) finalCells = enhancedCells;

  const promoted = finalCells.length >= bulgeOptions.promoteToRoomArea;
  for (const cell of finalCells) carve(candidate, cell.x, cell.y, promoted ? 'r' : 'b');
  return {cells: finalCells, promoted};
}

function addBulges(candidate, layout, seed, candidateIndex) {
  const rng = rngFor(seed, candidateIndex, 'bulges');
  const desired = randomInt(rng, layout.bulges.count.min, layout.bulges.count.max);
  const anchors = candidateBulgeAnchors(candidate, layout.bulges.positions);
  const usedAnchors = [];
  let attempts = 0;

  while (candidate.bulges.length < desired && attempts < Math.max(100, desired * 80)) {
    attempts += 1;
    if (!anchors.length) break;
    const anchor = randomItem(rng, anchors);
    if (usedAnchors.some(other => manhattan(anchor, other) < layout.bulges.minSpacing)) continue;
    const area = randomInt(rng, layout.bulges.addedArea.min, layout.bulges.addedArea.max);
    const shape = weightedItem(rng, layout.bulges.shapes, { id: 'side_alcove', weight: 1 });
    const grown = growBulge(candidate, anchor, area, rng, layout.bulges);
    if (!grown) continue;
    const {cells, promoted} = grown;
    usedAnchors.push(anchor);
    candidate.bulges.push({
      id: `bulge_${candidate.bulges.length + 1}`,
      shape: shape.id,
      position: anchor.kind,
      anchor: { x: anchor.x, y: anchor.y },
      cells,
      promotedToRoom: promoted,
      generator: layout.bulges.featureAlgorithm,
    });
    if (promoted) {
      const minX = Math.min(...cells.map(cell => cell.x));
      const maxX = Math.max(...cells.map(cell => cell.x));
      const minY = Math.min(...cells.map(cell => cell.y));
      const maxY = Math.max(...cells.map(cell => cell.y));
      const centerPoint = {x: Math.round((minX + maxX) / 2), y: Math.round((minY + maxY) / 2)};
      const center = nearestRoomCell({cells}, centerPoint);
      candidate.rooms.push({
        id: `room_${candidate.rooms.length + 1}`,
        shape: 'promoted_bulge',
        source: 'bulge',
        generator: layout.bulges.featureAlgorithm,
        origin: {x: minX, y: minY},
        width: maxX - minX + 1,
        height: maxY - minY + 1,
        center: {...center},
        cells,
      });
    }
  }

  if (candidate.bulges.length < layout.bulges.count.min) {
    throw new Error(`could not place minimum bulges: ${candidate.bulges.length}/${layout.bulges.count.min}`);
  }
}

function roomMask(shapeId, width, height, customMask) {
  if (shapeId === 'mask') {
    if (!Array.isArray(customMask) || !customMask.length) throw new Error('mask room shape requires mask rows');
    const maskWidth = customMask[0].length;
    if (!maskWidth || customMask.some(row => typeof row !== 'string' || row.length !== maskWidth)) {
      throw new Error('mask room rows must be equal-length strings');
    }
    return customMask.map(row => [...row].map(cell => cell !== '#'));
  }

  const mask = Array.from({ length: height }, () => Array(width).fill(false));
  const fill = (predicate) => {
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) mask[y][x] = Boolean(predicate(x, y));
    }
  };

  switch (shapeId) {
    case 'rectangle':
      fill(() => true);
      break;
    case 'square': {
      const size = Math.min(width, height);
      const offsetX = Math.floor((width - size) / 2);
      const offsetY = Math.floor((height - size) / 2);
      fill((x, y) => x >= offsetX && x < offsetX + size && y >= offsetY && y < offsetY + size);
      break;
    }
    case 'l_shape': {
      const thickX = Math.max(1, Math.floor(width / 3));
      const thickY = Math.max(1, Math.floor(height / 3));
      fill((x, y) => x < thickX || y >= height - thickY);
      break;
    }
    case 't_shape': {
      const top = Math.max(1, Math.floor(height / 3));
      const stem = Math.max(1, Math.floor(width / 3));
      const left = Math.floor((width - stem) / 2);
      fill((x, y) => y < top || (x >= left && x < left + stem));
      break;
    }
    case 'cross': {
      const vertical = Math.max(1, Math.floor(width / 3));
      const horizontal = Math.max(1, Math.floor(height / 3));
      const vx = Math.floor((width - vertical) / 2);
      const hy = Math.floor((height - horizontal) / 2);
      fill((x, y) => (x >= vx && x < vx + vertical) || (y >= hy && y < hy + horizontal));
      break;
    }
    case 'chamfered':
      fill((x, y) => {
        if (width < 5 || height < 5) return true;
        const corner = (x === 0 || x === width - 1) && (y === 0 || y === height - 1);
        return !corner;
      });
      break;
    case 'roundish': {
      const rx = Math.max(1, (width - 1) / 2);
      const ry = Math.max(1, (height - 1) / 2);
      const cx = (width - 1) / 2;
      const cy = (height - 1) / 2;
      fill((x, y) => (((x - cx) ** 2) / (rx ** 2)) + (((y - cy) ** 2) / (ry ** 2)) <= 1.05);
      break;
    }
    default:
      throw new Error(`unsupported room shape: ${shapeId}`);
  }
  return mask;
}

function maybeMirrorMask(mask, mirror) {
  if (!mirror) return mask;
  return mask.map(row => [...row].reverse());
}

function rotateMask(mask, turns) {
  let result = mask.map(row => [...row]);
  for (let i = 0; i < turns; i += 1) {
    const height = result.length;
    const width = result[0].length;
    result = Array.from({ length: width }, (_, y) => Array.from({ length: height }, (_, x) => result[height - 1 - x][y]));
  }
  return result;
}

function maskCells(mask) {
  const cells = [];
  for (let y = 0; y < mask.length; y += 1) {
    for (let x = 0; x < mask[y].length; x += 1) if (mask[y][x]) cells.push({ x, y });
  }
  return cells;
}

function roomFits(candidate, cells, origin, spacing) {
  const cellKeys = new Set(cells.map(cell => keyOf(origin.x + cell.x, origin.y + cell.y)));
  for (const cell of cells) {
    const x = origin.x + cell.x;
    const y = origin.y + cell.y;
    if (x <= 0 || y <= 0 || x >= candidate.width - 1 || y >= candidate.height - 1) return false;
    for (let dy = -spacing; dy <= spacing; dy += 1) {
      for (let dx = -spacing; dx <= spacing; dx += 1) {
        const nx = x + dx;
        const ny = y + dy;
        if (!inside(candidate.grid, nx, ny)) return false;
        if (!cellKeys.has(keyOf(nx, ny)) && candidate.region[ny][nx] === 'r') return false;
      }
    }
  }
  return true;
}

function nearestRoomCell(room, point) {
  let best = room.cells[0];
  let distance = Infinity;
  for (const cell of room.cells) {
    const next = manhattan(cell, point);
    if (next < distance) {
      distance = next;
      best = cell;
    }
  }
  return best;
}

function carveLine(candidate, from, to, region = 'c') {
  let x = from.x;
  let y = from.y;
  const stepX = Math.sign(to.x - x);
  const stepY = Math.sign(to.y - y);
  while (x !== to.x) {
    x += stepX;
    if (candidate.region[y][x] === '#') carve(candidate, x, y, region);
  }
  while (y !== to.y) {
    y += stepY;
    if (candidate.region[y][x] === '#') carve(candidate, x, y, region);
  }
}

function connectPoints(candidate, a, b, rng) {
  if (rng() < 0.5) {
    carveLine(candidate, a, { x: b.x, y: a.y });
    carveLine(candidate, { x: b.x, y: a.y }, b);
  } else {
    carveLine(candidate, a, { x: a.x, y: b.y });
    carveLine(candidate, { x: a.x, y: b.y }, b);
  }
}

function placeRooms(candidate, layout, seed, candidateIndex) {
  const rng = rngFor(seed, candidateIndex, 'rooms');
  const desired = randomInt(rng, layout.rooms.count.min, layout.rooms.count.max);
  let attempts = 0;

  while (candidate.rooms.length < desired && attempts < Math.max(400, desired * 160)) {
    attempts += 1;
    const shape = weightedItem(rng, layout.rooms.shapes, { id: 'rectangle', weight: 1 });
    let width = randomInt(rng, layout.rooms.width.min, layout.rooms.width.max);
    let height = randomInt(rng, layout.rooms.height.min, layout.rooms.height.max);
    let mask = roomMask(shape.id, width, height, shape.mask);
    if (layout.rooms.mirror && rng() < 0.5) mask = maybeMirrorMask(mask, true);
    const rotations = Array.isArray(shape.rotations) && shape.rotations.length ? shape.rotations : [0, 90, 180, 270];
    const rotation = randomItem(rng, rotations);
    const turns = ((rotation % 360) + 360) % 360 / 90;
    mask = rotateMask(mask, turns);
    width = mask[0].length;
    height = mask.length;
    mask = generateFeatureMask({
      width,
      height,
      baseMask: mask,
      algorithm: layout.rooms.featureAlgorithm,
      options: layout.rooms.shapeOptions,
      preferred: {x: Math.floor(width / 2), y: Math.floor(height / 2)},
    }, rng);
    const localCells = maskCells(mask);
    if (localCells.length < layout.rooms.minArea) continue;
    if (width + 2 >= candidate.width || height + 2 >= candidate.height) continue;
    const origin = {
      x: randomInt(rng, 1, candidate.width - width - 1),
      y: randomInt(rng, 1, candidate.height - height - 1),
    };
    if (!roomFits(candidate, localCells, origin, Math.max(1, layout.rooms.wallThickness))) continue;
    const cells = localCells.map(cell => ({ x: origin.x + cell.x, y: origin.y + cell.y }));
    for (const cell of cells) carve(candidate, cell.x, cell.y, 'r');
    const centerPoint = { x: origin.x + Math.floor(width / 2), y: origin.y + Math.floor(height / 2) };
    const center = nearestRoomCell({ cells }, centerPoint);
    candidate.rooms.push({
      id: `room_${candidate.rooms.length + 1}`,
      shape: shape.id,
      generator: layout.rooms.featureAlgorithm,
      rotation,
      origin,
      width,
      height,
      center: { ...center },
      cells,
    });
  }

  if (candidate.rooms.length < layout.rooms.count.min) {
    throw new Error(`could not place minimum rooms: ${candidate.rooms.length}/${layout.rooms.count.min}`);
  }

  if (!candidate.rooms.length) return;
  const connected = [candidate.rooms[0]];
  const pending = candidate.rooms.slice(1);
  while (pending.length) {
    let best = null;
    for (const fromRoom of connected) {
      for (const toRoom of pending) {
        const distance = manhattan(fromRoom.center, toRoom.center);
        if (!best || distance < best.distance) best = { fromRoom, toRoom, distance };
      }
    }
    connectPoints(candidate, best.fromRoom.center, best.toRoom.center, rng);
    connected.push(best.toRoom);
    pending.splice(pending.indexOf(best.toRoom), 1);
  }

  const extra = randomInt(rng, layout.extraLoops.min, layout.extraLoops.max);
  for (let i = 0; i < extra && candidate.rooms.length > 2; i += 1) {
    const a = randomItem(rng, candidate.rooms);
    const others = candidate.rooms.filter(room => room !== a);
    const b = randomItem(rng, others);
    connectPoints(candidate, a.center, b.center, rng);
  }
}

function firstFloor(candidate) {
  for (let y = 1; y < candidate.height - 1; y += 1) {
    for (let x = 1; x < candidate.width - 1; x += 1) if (mapCell(candidate, x, y) === '.') return { x, y };
  }
  return null;
}

function distancesFrom(candidate, start) {
  const distances = new Map([[keyOf(start.x, start.y), 0]]);
  const queue = [start];
  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];
    const distance = distances.get(keyOf(current.x, current.y));
    for (const [dx, dy] of DIRECTIONS) {
      const x = current.x + dx;
      const y = current.y + dy;
      const key = keyOf(x, y);
      if (x < 0 || y < 0 || x >= candidate.width || y >= candidate.height || mapCell(candidate, x, y) !== '.' || distances.has(key)) continue;
      distances.set(key, distance + 1);
      queue.push({ x, y });
    }
  }
  return distances;
}

function farthestFloor(candidate, start) {
  const distances = distancesFrom(candidate, start);
  let best = { ...start, distance: 0 };
  for (const [key, distance] of distances.entries()) {
    if (distance <= best.distance) continue;
    const [x, y] = key.split(',').map(Number);
    best = { x, y, distance };
  }
  return best;
}

function countFloors(candidate) {
  let count = 0;
  const rows = candidate.grid ?? candidate.tiles;
  for (const row of rows) for (const cell of row) if (cell === '.') count += 1;
  return count;
}

export function validateGeneratedCandidate(candidate, expectedMode = candidate.mode, {strictMode = true} = {}) {
  const errors = [];
  const start = firstFloor(candidate);
  if (!start) return { ok: false, errors: ['candidate has no walkable cell'], reachable: 0, floorCount: 0 };
  const distances = distancesFrom(candidate, start);
  const floorCount = countFloors(candidate);
  if (distances.size !== floorCount) errors.push(`walkable cells are disconnected: ${distances.size}/${floorCount}`);

  for (let x = 0; x < candidate.width; x += 1) {
    if (mapCell(candidate, x, 0) === '.' || mapCell(candidate, x, candidate.height - 1) === '.') errors.push('outer boundary must remain wall');
  }
  for (let y = 0; y < candidate.height; y += 1) {
    if (mapCell(candidate, 0, y) === '.' || mapCell(candidate, candidate.width - 1, y) === '.') errors.push('outer boundary must remain wall');
  }

  if (strictMode && expectedMode === 'corridors') {
    if (candidate.rooms.length) errors.push('corridors mode contains rooms');
    if (candidate.bulges.length) errors.push('corridors mode contains bulges');
    for (let y = 0; y < candidate.height - 1; y += 1) {
      for (let x = 0; x < candidate.width - 1; x += 1) {
        const cells = [mapCell(candidate, x, y), mapCell(candidate, x + 1, y), mapCell(candidate, x, y + 1), mapCell(candidate, x + 1, y + 1)];
        if (cells.every(cell => cell === '.')) errors.push(`corridors mode contains open 2x2 floor at ${x},${y}`);
      }
    }
  }
  if (strictMode && expectedMode === 'bulges' && !candidate.bulges.length) errors.push('bulges mode contains no bulge');
  if (strictMode && expectedMode === 'rooms' && !candidate.rooms.length) errors.push('rooms mode contains no room');

  return {
    ok: errors.length === 0,
    errors: [...new Set(errors)],
    reachable: distances.size,
    floorCount,
  };
}

function finalizeCandidate(candidate, layout, seed, candidateIndex) {
  const first = firstFloor(candidate);
  if (!first) throw new Error('generation produced no walkable cells');
  const endpointA = farthestFloor(candidate, first);
  const endpointB = farthestFloor(candidate, endpointA);
  const output = {
    generatorVersion: 'adv-grid/2-prototype',
    terrainAlgorithm: layout.terrain.algorithm,
    seed,
    candidateIndex,
    mode: layout.mode,
    width: candidate.width,
    height: candidate.height,
    tiles: candidate.grid.map(row => row.join('')),
    regions: candidate.region.map(row => row.join('')),
    entry: { x: endpointA.x, y: endpointA.y },
    goal: { x: endpointB.x, y: endpointB.y },
    rooms: candidate.rooms,
    bulges: candidate.bulges,
    warnings: candidate.warnings,
  };
  const validation = validateGeneratedCandidate(output, layout.mode, {strictMode: layout.terrain.algorithm === 'classic'});
  output.validation = validation;
  output.metrics = {
    floorCount: validation.floorCount,
    routeSteps: endpointB.distance,
    roomCount: output.rooms.length,
    bulgeCount: output.bulges.length,
  };
  if (!validation.ok) throw new Error(validation.errors.join('; '));
  return output;
}

export function generateDungeonCandidate({ seed = 1, candidateIndex = 0, layout = {} } = {}) {
  const normalized = normalizeDungeonLayout(layout);
  if (!Number.isInteger(candidateIndex) || candidateIndex < 0) throw new Error('candidateIndex must be a non-negative integer');
  const candidate = blankCandidate(normalized);
  const topology = generateTerrainTopology({
    width: normalized.width,
    height: normalized.height,
    algorithm: normalized.terrain.algorithm,
    options: normalized.terrain.options,
  }, rngFor(seed, candidateIndex, 'terrain'));
  if (topology) {
    for (let y = 0; y < topology.mask.length; y += 1) {
      for (let x = 0; x < topology.mask[y].length; x += 1) if (topology.mask[y][x]) carve(candidate, x, y, 'c');
    }
    for (const source of topology.rooms ?? []) {
      const cells = source.cells.map(cell => ({...cell}));
      for (const cell of cells) candidate.region[cell.y][cell.x] = 'r';
      candidate.rooms.push({...source, id: `room_${candidate.rooms.length + 1}`, cells});
    }
    if (normalized.mode === 'bulges') addBulges(candidate, normalized, seed, candidateIndex);
    if (normalized.mode === 'rooms' && normalized.rooms.count.max > 0 && normalized.terrain.algorithm !== 'bsp') {
      placeRooms(candidate, normalized, seed, candidateIndex);
    }
  } else if (normalized.mode === 'rooms') {
    placeRooms(candidate, normalized, seed, candidateIndex);
  } else {
    generateCorridors(candidate, normalized, seed, candidateIndex);
    if (normalized.mode === 'bulges') addBulges(candidate, normalized, seed, candidateIndex);
  }
  return finalizeCandidate(candidate, normalized, seed, candidateIndex);
}

export const dungeonGeneratorCapabilities = Object.freeze({
  generatorVersion: 'adv-grid/2-prototype',
  modes: ['corridors', 'bulges', 'rooms'],
  corridorWidths: [1],
  terrainAlgorithms: [...terrainAlgorithms],
  featureAlgorithms: [...featureAlgorithms],
  roomShapes: [...ROOM_SHAPES],
  implemented: [
    'deterministic seed and candidate index',
    'corridor-only generation',
    'local corridor bulges',
    'room placement and corridor connection',
    'rectangle/square/L/T/cross/chamfered/roundish/custom-mask room masks',
    'optional asymmetric mask mutation, random boundary dropout, repeated boolean composition, and noise blending',
    'optional fBm/domain-warp noise, cellular automata, random walk, BSP, and Voronoi terrain generators',
    'bulges and rooms share feature shaping; large bulges can be promoted to room regions',
    'entry and farthest goal selection',
    'connectivity and corridor 2x2 validation',
  ],
  pending: [
    'corridor widths 2..3',
    'exact branch/dead-end/main-route constraints',
    'cells/edges/objects/materials/mechanisms/encounters compilation',
    'candidate adoption and source export',
    'stateful mechanism validation',
  ],
});
