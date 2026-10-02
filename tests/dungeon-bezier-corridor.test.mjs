import test from 'node:test';
import assert from 'node:assert/strict';
import {generateDungeonCandidate, normalizeDungeonLayout} from '../src/core/dungeon-generator.js';

const base = {
  mode: 'corridors',
  width: 31,
  height: 25,
  corridorWidth: 1,
  extraLoops: {min: 0, max: 0},
  bulges: {count: {min: 0, max: 0}},
  rooms: {count: {min: 0, max: 0}},
  terrain: {algorithm: 'classic'},
};

function shortestPath(candidate) {
  const start = candidate.entry;
  const goal = candidate.goal;
  const q = [start];
  const parent = new Map([[start.x + ',' + start.y, null]]);
  for (let i = 0; i < q.length; i += 1) {
    const p = q[i];
    if (p.x === goal.x && p.y === goal.y) break;
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const x = p.x + dx;
      const y = p.y + dy;
      const key = x + ',' + y;
      if (x < 0 || y < 0 || x >= candidate.width || y >= candidate.height) continue;
      if (candidate.tiles[y][x] !== '.' || parent.has(key)) continue;
      parent.set(key, p);
      q.push({x, y});
    }
  }
  const path = [];
  let cur = goal;
  while (cur) {
    path.push(cur);
    cur = parent.get(cur.x + ',' + cur.y);
  }
  return path.reverse();
}

function countTurns(path) {
  let turns = 0;
  let previous = null;
  for (let i = 1; i < path.length; i += 1) {
    const direction = {x: path[i].x - path[i - 1].x, y: path[i].y - path[i - 1].y};
    assert.equal(Math.abs(direction.x) + Math.abs(direction.y), 1, 'path must remain four-neighbor');
    if (previous && (previous.x !== direction.x || previous.y !== direction.y)) turns += 1;
    previous = direction;
  }
  return turns;
}

test('bezier_grid corridor is deterministic, connected and strictly four-neighbor', () => {
  const layout = {
    ...base,
    corridors: {algorithm: 'bezier_grid', branchCount: {min: 5, max: 8}, curvature: 0.85, sampleDensity: 6, turnPenalty: 0.12},
  };
  for (let candidateIndex = 0; candidateIndex < 24; candidateIndex += 1) {
    const a = generateDungeonCandidate({seed: 20261002, candidateIndex, layout});
    const b = generateDungeonCandidate({seed: 20261002, candidateIndex, layout});
    assert.deepEqual(a, b);
    assert.equal(a.validation.ok, true, a.validation.errors.join('; '));
    assert.equal(a.corridorAlgorithm, 'bezier_grid');
    assert.equal(a.validation.reachable, a.validation.floorCount);
    countTurns(shortestPath(a));
  }
});

test('curvature changes the Bezier-guided raster while zero curvature remains valid', () => {
  const straight = {...base, corridors: {algorithm: 'bezier_grid', branchCount: 0, curvature: 0, sampleDensity: 6, turnPenalty: 0}};
  const curved = {...base, corridors: {algorithm: 'bezier_grid', branchCount: 0, curvature: 1.15, sampleDensity: 6, turnPenalty: 0.08}};
  let changed = false;
  let curvedTurns = 0;
  for (let candidateIndex = 0; candidateIndex < 12; candidateIndex += 1) {
    const a = generateDungeonCandidate({seed: 99173, candidateIndex, layout: straight});
    const b = generateDungeonCandidate({seed: 99173, candidateIndex, layout: curved});
    assert.equal(a.validation.ok, true, a.validation.errors.join('; '));
    assert.equal(b.validation.ok, true, b.validation.errors.join('; '));
    if (JSON.stringify(a.tiles) !== JSON.stringify(b.tiles)) changed = true;
    curvedTurns = Math.max(curvedTurns, countTurns(shortestPath(b)));
  }
  assert.equal(changed, true, 'curvature should affect at least one fixed candidate');
  assert.ok(curvedTurns >= 4, 'curved raster should visibly stair-step along the ideal curve');
});

test('rooms can connect with the same Bezier-guided corridor option', () => {
  const out = generateDungeonCandidate({
    seed: 44591,
    candidateIndex: 2,
    layout: {
      mode: 'rooms',
      width: 39,
      height: 31,
      corridorWidth: 1,
      extraLoops: {min: 0, max: 1},
      terrain: {algorithm: 'classic'},
      corridors: {algorithm: 'bezier_grid', branchCount: 0, curvature: 0.75, sampleDensity: 5, turnPenalty: 0.1},
      bulges: {count: {min: 0, max: 0}},
      rooms: {
        count: {min: 4, max: 4},
        width: {min: 5, max: 8},
        height: {min: 5, max: 8},
        minArea: 9,
        wallThickness: 1,
        entrances: {min: 1, max: 2},
        shapes: [{id: 'rectangle', weight: 1}, {id: 'l_shape', weight: 1}],
      },
    },
  });
  assert.equal(out.validation.ok, true, out.validation.errors.join('; '));
  assert.equal(out.corridorAlgorithm, 'bezier_grid');
  assert.equal(out.rooms.length, 4);
});

test('maze stays the default and unsupported corridor algorithms are rejected', () => {
  assert.equal(normalizeDungeonLayout({mode: 'corridors'}).corridors.algorithm, 'maze');
  assert.throws(
    () => normalizeDungeonLayout({mode: 'corridors', corridors: {algorithm: 'diagonal_bezier'}}),
    /unsupported corridor algorithm/,
  );
});
