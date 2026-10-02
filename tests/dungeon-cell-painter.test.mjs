import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {generateDungeonCandidate} from '../src/core/dungeon-generator.js';
import {generatedCellAt, generatedCellIdAt, normalizeGeneratedCells} from '../src/core/dungeon-cell-painter.js';

const source = JSON.parse(fs.readFileSync(new URL('../config/cell-layers.json', import.meta.url), 'utf8'));
const cellTypes = source.presets;

const layout = {
  mode: 'rooms',
  width: 39,
  height: 31,
  corridorWidth: 1,
  corridors: {algorithm: 'bezier_grid', branchCount: 0, curvature: 0.7, sampleDensity: 5, turnPenalty: 0.1},
  terrain: {algorithm: 'classic'},
  extraLoops: {min: 0, max: 1},
  bulges: {count: {min: 0, max: 0}},
  rooms: {
    count: {min: 4, max: 5},
    width: {min: 5, max: 9},
    height: {min: 5, max: 9},
    minArea: 9,
    wallThickness: 1,
    entrances: {min: 1, max: 2},
    shapes: [{id: 'rectangle', weight: 2}, {id: 'l_shape', weight: 1}, {id: 'roundish', weight: 1}],
  },
};

const cells = {
  baseFloor: 'stone_floor',
  baseWall: 'stone_wall',
  patches: [
    {preset: 'shallow_water', areas: ['corridor','room'], density: 0.10, cluster: {min: 2, max: 6}},
    {preset: 'ice_floor', areas: ['corridor'], density: 0.06, cluster: {min: 2, max: 5}},
    {preset: 'poison_swamp', areas: ['room','dead_end'], density: 0.04, cluster: {min: 1, max: 3}, minDistanceFromEntry: 5},
    {preset: 'deep_depression_water', areas: ['room'], density: 0.08, cluster: {min: 1, max: 4}, preserveCriticalRoute: true},
  ],
};

function pathExists(candidate) {
  const q = [candidate.entry];
  const seen = new Set([candidate.entry.x + ',' + candidate.entry.y]);
  for (let i=0;i<q.length;i+=1) {
    const p=q[i];
    if (p.x===candidate.goal.x && p.y===candidate.goal.y) return true;
    for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const x=p.x+dx,y=p.y+dy,k=x+','+y;
      if (x<0||y<0||x>=candidate.width||y>=candidate.height||candidate.tiles[y][x]!=='.'||seen.has(k)) continue;
      seen.add(k);q.push({x,y});
    }
  }
  return false;
}

test('cell presets are painted deterministically into map.cells-compatible rows', () => {
  const a=generateDungeonCandidate({seed:20261002,candidateIndex:3,layout,cells,cellTypes});
  const b=generateDungeonCandidate({seed:20261002,candidateIndex:3,layout,cells,cellTypes});
  assert.deepEqual(a,b);
  assert.ok(a.cells);
  assert.equal(a.cells.rows.length,a.height);
  assert.ok(a.cells.rows.every(row=>row.length===a.width));
  assert.equal(a.cells.overrides && Object.keys(a.cells.overrides).length,0);
  assert.equal(pathExists(a),true);
  assert.equal(a.tiles[a.entry.y][a.entry.x],'.');
  assert.equal(a.tiles[a.goal.y][a.goal.x],'.');
  assert.ok(a.metrics.mandatoryRouteSteps > 0);
  assert.ok(Object.keys(a.cellSummary).includes('shallow_water'));
});

test('generated tiles always match the passage of the resolved cell preset', () => {
  const out=generateDungeonCandidate({seed:811,candidateIndex:4,layout,cells,cellTypes});
  for (let y=0;y<out.height;y+=1) for (let x=0;x<out.width;x+=1) {
    const id=generatedCellIdAt(out,x,y);
    const cell=generatedCellAt(out,cellTypes,x,y);
    assert.ok(id);
    assert.ok(cell);
    assert.equal(out.tiles[y][x],cell.passage,`${id} at ${x},${y}`);
  }
});

test('impassable patches preserve the critical entry-to-goal route', () => {
  for (let candidateIndex=0;candidateIndex<24;candidateIndex+=1) {
    const out=generateDungeonCandidate({
      seed:44551,
      candidateIndex,
      layout,
      cells:{
        baseFloor:'stone_floor',
        baseWall:'stone_wall',
        patches:[{preset:'deep_depression_water',areas:['any_floor'],density:0.28,cluster:{min:2,max:8},preserveCriticalRoute:true}],
      },
      cellTypes,
    });
    assert.equal(pathExists(out),true,`candidate ${candidateIndex}`);
    assert.ok((out.cellSummary.deep_depression_water??0)>0,`candidate ${candidateIndex}`);
  }
});

test('mechanism-bound presets are rejected until their mechanism compiler is available', () => {
  assert.throws(
    () => normalizeGeneratedCells({
      baseFloor:'stone_floor',
      baseWall:'stone_wall',
      patches:[{preset:'corrosive_floor',areas:['any_floor'],density:.1}],
    },cellTypes),
    /requires mechanism binding corrosion/,
  );
});

test('cell parameters reject unknown presets and contradictory count/density', () => {
  assert.throws(()=>normalizeGeneratedCells({baseFloor:'missing',baseWall:'stone_wall'},cellTypes),/unknown cell preset/);
  assert.throws(()=>normalizeGeneratedCells({
    baseFloor:'stone_floor',
    baseWall:'stone_wall',
    patches:[{preset:'shallow_water',count:2,density:.1}],
  },cellTypes),/cannot set both count and density/);
});
