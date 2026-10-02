
const DIRECTIONS = [[1,0],[-1,0],[0,1],[0,-1]];
const SYMBOLS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

const clone = value => JSON.parse(JSON.stringify(value));
const keyOf = (x,y) => `${x},${y}`;
const inside = (candidate,x,y) => y >= 0 && y < candidate.height && x >= 0 && x < candidate.width;

function hashSeed(...parts) {
  let hash = 2166136261 >>> 0;
  const text = parts.map(String).join('|');
  for (let i=0;i<text.length;i+=1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash,16777619) >>> 0;
  }
  return hash || 0x9e3779b9;
}

function rngFor(seed,...parts) {
  let state = hashSeed(seed,...parts);
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

const randomInt = (rng,min,max) => min + Math.floor(rng() * (max-min+1));

function rangeValue(value,fallback) {
  if (Number.isInteger(value)) return {min:value,max:value};
  if (value && Number.isInteger(value.min) && Number.isInteger(value.max)) return {min:value.min,max:value.max};
  return {...fallback};
}

function validateRange(name,value,min,max) {
  if (!Number.isInteger(value.min) || !Number.isInteger(value.max) || value.min > value.max || value.min < min || value.max > max) {
    throw new Error(`${name} must be an integer range within ${min}..${max}`);
  }
}

function shortestPath(tiles,start,goal) {
  const height = tiles.length;
  const width = tiles[0].length;
  const queue = [start];
  const parent = new Map([[keyOf(start.x,start.y),null]]);
  for (let i=0;i<queue.length;i+=1) {
    const point = queue[i];
    if (point.x === goal.x && point.y === goal.y) break;
    for (const [dx,dy] of DIRECTIONS) {
      const x = point.x + dx;
      const y = point.y + dy;
      const key = keyOf(x,y);
      if (x < 0 || y < 0 || x >= width || y >= height || tiles[y][x] !== '.' || parent.has(key)) continue;
      parent.set(key,point);
      queue.push({x,y});
    }
  }
  if (!parent.has(keyOf(goal.x,goal.y))) return [];
  const path = [];
  let cursor = goal;
  while (cursor) {
    path.push(cursor);
    cursor = parent.get(keyOf(cursor.x,cursor.y));
  }
  return path.reverse();
}

function distancesFrom(tiles,start) {
  const distances = new Map([[keyOf(start.x,start.y),0]]);
  const queue = [start];
  for (let i=0;i<queue.length;i+=1) {
    const point = queue[i];
    const distance = distances.get(keyOf(point.x,point.y));
    for (const [dx,dy] of DIRECTIONS) {
      const x = point.x + dx;
      const y = point.y + dy;
      const key = keyOf(x,y);
      if (y < 0 || y >= tiles.length || x < 0 || x >= tiles[0].length || tiles[y][x] !== '.' || distances.has(key)) continue;
      distances.set(key,distance+1);
      queue.push({x,y});
    }
  }
  return distances;
}

function floorDegree(candidate,x,y) {
  let degree = 0;
  for (const [dx,dy] of DIRECTIONS) {
    const nx = x + dx;
    const ny = y + dy;
    if (inside(candidate,nx,ny) && candidate.tiles[ny][nx] === '.') degree += 1;
  }
  return degree;
}

function normalizedAreas(value) {
  const areas = Array.isArray(value) && value.length ? [...new Set(value)] : ['any_floor'];
  const allowed = new Set(['any_floor','corridor','bulge','room','dead_end','wall']);
  for (const area of areas) if (!allowed.has(area)) throw new Error(`unsupported cell placement area: ${area}`);
  return areas;
}

function areaMatches(candidate,x,y,areas) {
  const tile = candidate.tiles[y][x];
  const region = candidate.regions?.[y]?.[x] ?? '#';
  return areas.some(area => {
    if (area === 'wall') return tile === '#';
    if (tile !== '.') return false;
    if (area === 'any_floor') return true;
    if (area === 'corridor') return region === 'c';
    if (area === 'bulge') return region === 'b';
    if (area === 'room') return region === 'r';
    if (area === 'dead_end') return floorDegree(candidate,x,y) <= 1;
    return false;
  });
}

function catalogEntry(catalog,id) {
  const preset = catalog?.[id];
  if (!preset) throw new Error(`unknown cell preset: ${id}`);
  if (!['.','#'].includes(preset.passage)) throw new Error(`cell preset ${id} has invalid passage`);
  return preset;
}

export function normalizeGeneratedCells(spec = {}, catalog = {}) {
  const baseFloor = spec.baseFloor ?? 'stone_floor';
  const baseWall = spec.baseWall ?? 'stone_wall';
  const floorPreset = catalogEntry(catalog,baseFloor);
  const wallPreset = catalogEntry(catalog,baseWall);
  if (floorPreset.passage !== '.') throw new Error('baseFloor must be walkable');
  if (wallPreset.passage !== '#') throw new Error('baseWall must be impassable');

  const allowBindings = Boolean(spec.allowBindings);
  const patches = (spec.patches ?? []).map((patch,index) => {
    const preset = catalogEntry(catalog,patch.preset);
    if (preset.parameters?.binding && !allowBindings) {
      throw new Error(`cell patch ${patch.preset} requires mechanism binding ${preset.parameters.binding}`);
    }
    const count = patch.count === undefined ? null : rangeValue(patch.count,{min:0,max:0});
    if (count) validateRange(`cells.patches[${index}].count`,count,0,2500);
    const density = patch.density ?? null;
    if (density !== null && (!Number.isFinite(density) || density < 0 || density > 1)) throw new Error(`cells.patches[${index}].density must be in 0..1`);
    if (count && density !== null) throw new Error(`cells.patches[${index}] cannot set both count and density`);
    const cluster = rangeValue(patch.cluster,{min:1,max:1});
    validateRange(`cells.patches[${index}].cluster`,cluster,1,2500);
    const minDistanceFromEntry = patch.minDistanceFromEntry ?? 0;
    if (!Number.isInteger(minDistanceFromEntry) || minDistanceFromEntry < 0 || minDistanceFromEntry > 2500) throw new Error(`cells.patches[${index}].minDistanceFromEntry must be a non-negative integer`);
    return {
      preset: patch.preset,
      areas: normalizedAreas(patch.areas),
      count,
      density,
      cluster,
      minDistanceFromEntry,
      preserveCriticalRoute: patch.preserveCriticalRoute !== false,
    };
  });

  return {baseFloor,baseWall,allowBindings,patches};
}

function assignCluster(matrix,candidates,available,desired,preset,rng,clusterRange) {
  let assigned = 0;
  const changes = [];
  while (assigned < desired && available.size) {
    const keys = [...available];
    const seedKey = keys[randomInt(rng,0,keys.length-1)];
    const [sx,sy] = seedKey.split(',').map(Number);
    const clusterTarget = Math.min(desired-assigned,randomInt(rng,clusterRange.min,clusterRange.max));
    const queue = [{x:sx,y:sy}];
    const queued = new Set([seedKey]);
    let clusterAssigned = 0;
    for (let index=0; index<queue.length && clusterAssigned<clusterTarget; index+=1) {
      const point = queue[index];
      const pointKey = keyOf(point.x,point.y);
      if (!available.has(pointKey)) continue;
      const previous = matrix[point.y][point.x];
      matrix[point.y][point.x] = preset;
      changes.push({x:point.x,y:point.y,previous});
      available.delete(pointKey);
      clusterAssigned += 1;
      assigned += 1;
      const neighbors = DIRECTIONS
        .map(([dx,dy]) => ({x:point.x+dx,y:point.y+dy}))
        .filter(p => available.has(keyOf(p.x,p.y)) && !queued.has(keyOf(p.x,p.y)));
      while (neighbors.length) {
        const pick = randomInt(rng,0,neighbors.length-1);
        const [next] = neighbors.splice(pick,1);
        queued.add(keyOf(next.x,next.y));
        queue.push(next);
      }
    }
  }
  return {assigned,changes};
}

function walkableConnected(tiles) {
  let start=null,total=0;
  for(let y=0;y<tiles.length;y+=1)for(let x=0;x<tiles[y].length;x+=1)if(tiles[y][x]==='.'){total+=1;if(!start)start={x,y};}
  if(!start)return false;
  const seen=new Set([keyOf(start.x,start.y)]),queue=[start];
  for(let i=0;i<queue.length;i+=1){
    const p=queue[i];
    for(const [dx,dy] of DIRECTIONS){
      const x=p.x+dx,y=p.y+dy,k=keyOf(x,y);
      if(y<0||y>=tiles.length||x<0||x>=tiles[0].length||tiles[y][x]!=='.'||seen.has(k))continue;
      seen.add(k);queue.push({x,y});
    }
  }
  return seen.size===total;
}

function placementFromMatrix(matrix) {
  const ids = [];
  for (const row of matrix) for (const id of row) if (!ids.includes(id)) ids.push(id);
  if (ids.length > SYMBOLS.length) throw new Error('too many distinct cell presets for generated legend');
  const legend = {};
  const reverse = new Map();
  ids.forEach((id,index) => {
    legend[SYMBOLS[index]] = id;
    reverse.set(id,SYMBOLS[index]);
  });
  return {
    legend,
    rows: matrix.map(row => row.map(id => reverse.get(id)).join('')),
    overrides: {},
  };
}

function tilesFromMatrix(matrix,catalog) {
  return matrix.map(row => row.map(id => catalog[id].passage).join(''));
}

export function generatedCellIdAt(candidate,x,y) {
  const placement = candidate.cells;
  const symbol = placement?.rows?.[y]?.[x];
  return symbol ? placement.legend?.[symbol] ?? null : null;
}

export function generatedCellAt(candidate,catalog,x,y) {
  const id = generatedCellIdAt(candidate,x,y);
  return id ? {id,...catalog[id]} : null;
}

export function paintGeneratedCells(candidate,spec,catalog,{seed=1,candidateIndex=0}={}) {
  const normalized = normalizeGeneratedCells(spec,catalog);
  const matrix = Array.from({length:candidate.height},(_,y) => Array.from({length:candidate.width},(_,x) => candidate.tiles[y][x] === '.' ? normalized.baseFloor : normalized.baseWall));
  const criticalPath = shortestPath(candidate.tiles,candidate.entry,candidate.goal);
  if (!criticalPath.length) throw new Error('cannot paint cells because entry and goal are disconnected');
  const protectedKeys = new Set(criticalPath.map(p => keyOf(p.x,p.y)));
  const entryDistances = distancesFrom(candidate.tiles,candidate.entry);
  const summary = {[normalized.baseFloor]:0,[normalized.baseWall]:0};
  const patchSummaries = [];

  normalized.patches.forEach((patch,index) => {
    const preset = catalog[patch.preset];
    const candidates = [];
    for (let y=0;y<candidate.height;y+=1) {
      for (let x=0;x<candidate.width;x+=1) {
        if (!areaMatches(candidate,x,y,patch.areas)) continue;
        if ((x === candidate.entry.x && y === candidate.entry.y) || (x === candidate.goal.x && y === candidate.goal.y)) continue;
        const distance = entryDistances.get(keyOf(x,y));
        if (distance !== undefined && distance < patch.minDistanceFromEntry) continue;
        if (preset.passage === '#' && patch.preserveCriticalRoute && protectedKeys.has(keyOf(x,y))) continue;
        candidates.push({x,y});
      }
    }
    const rng = rngFor(seed,candidateIndex,'cells',index,patch.preset);
    const desired = patch.count
      ? randomInt(rng,patch.count.min,patch.count.max)
      : Math.round(candidates.length * (patch.density ?? 0));
    const available = new Set(candidates.map(p => keyOf(p.x,p.y)));
    const changeSet = assignCluster(matrix,candidates,available,Math.min(desired,candidates.length),patch.preset,rng,patch.cluster);
    if(preset.passage==='#'){
      while(changeSet.changes.length){
        const currentTiles=tilesFromMatrix(matrix,catalog);
        if(walkableConnected(currentTiles) && shortestPath(currentTiles,candidate.entry,candidate.goal).length)break;
        const change=changeSet.changes.pop();
        matrix[change.y][change.x]=change.previous;
        changeSet.assigned-=1;
      }
    }
    patchSummaries.push({preset:patch.preset,requested:desired,assigned:changeSet.assigned,areas:[...patch.areas]});
  });

  for (const row of matrix) for (const id of row) summary[id] = (summary[id] ?? 0) + 1;
  const tiles = tilesFromMatrix(matrix,catalog);
  const finalPath = shortestPath(tiles,candidate.entry,candidate.goal);
  if (!finalPath.length) throw new Error('cell placement blocks the mandatory entry-to-goal route');

  return {
    cells: placementFromMatrix(matrix),
    tiles,
    cellSummary: summary,
    cellPatches: patchSummaries,
    mandatoryRouteSteps: Math.max(0,finalPath.length-1),
  };
}
