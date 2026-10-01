import test from 'node:test';
import assert from 'node:assert/strict';
import {
  dungeonGeneratorCapabilities,
  generateDungeonCandidate,
  normalizeDungeonLayout,
  validateGeneratedCandidate,
} from '../src/core/dungeon-generator.js';

const corridorLayout = {
  mode: 'corridors',
  width: 25,
  height: 21,
  corridorWidth: 1,
  extraLoops: { min: 1, max: 2 },
  bulges: { count: { min: 0, max: 0 } },
  rooms: { count: { min: 0, max: 0 } },
};

test('same seed and candidate index reproduce the exact candidate', () => {
  const a = generateDungeonCandidate({ seed: 20261002, candidateIndex: 3, layout: corridorLayout });
  const b = generateDungeonCandidate({ seed: 20261002, candidateIndex: 3, layout: corridorLayout });
  assert.deepEqual(a, b);
});

test('candidate index changes the deterministic candidate', () => {
  const a = generateDungeonCandidate({ seed: 20261002, candidateIndex: 0, layout: corridorLayout });
  const b = generateDungeonCandidate({ seed: 20261002, candidateIndex: 1, layout: corridorLayout });
  assert.notDeepEqual(a.tiles, b.tiles);
});

test('corridors mode stays connected and does not create open 2x2 floors', () => {
  for (let index = 0; index < 16; index += 1) {
    const candidate = generateDungeonCandidate({ seed: 7919, candidateIndex: index, layout: corridorLayout });
    const validation = validateGeneratedCandidate(candidate, 'corridors');
    assert.equal(validation.ok, true, validation.errors.join('\n'));
    assert.equal(candidate.rooms.length, 0);
    assert.equal(candidate.bulges.length, 0);
    assert.ok(candidate.metrics.routeSteps > 0);
  }
});

test('bulges mode adds local bulges while keeping all floors connected', () => {
  const layout = {
    ...corridorLayout,
    mode: 'bulges',
    bulges: {
      count: { min: 3, max: 5 },
      positions: ['along_corridor', 'dead_end'],
      shapes: [{ id: 'side_alcove', weight: 2 }, { id: 'end_pocket', weight: 1 }],
      addedArea: { min: 1, max: 4 },
      minSpacing: 3,
    },
  };
  const candidate = generateDungeonCandidate({ seed: 113, layout });
  assert.ok(candidate.bulges.length >= 3);
  assert.equal(candidate.rooms.length, 0);
  assert.equal(candidate.validation.ok, true, candidate.validation.errors.join('\n'));
  assert.ok(candidate.regions.some(row => row.includes('b')));
});

test('rooms mode places shaped rooms and connects them', () => {
  const candidate = generateDungeonCandidate({
    seed: 9001,
    layout: {
      mode: 'rooms',
      width: 35,
      height: 29,
      corridorWidth: 1,
      extraLoops: { min: 1, max: 2 },
      bulges: { count: { min: 0, max: 0 } },
      rooms: {
        count: { min: 4, max: 5 },
        shapes: [
          { id: 'rectangle', weight: 2 },
          { id: 'l_shape', weight: 2 },
          { id: 'chamfered', weight: 1 },
          { id: 'roundish', weight: 1 },
        ],
        width: { min: 5, max: 9 },
        height: { min: 5, max: 9 },
        minArea: 12,
        wallThickness: 1,
      },
    },
  });
  assert.ok(candidate.rooms.length >= 4);
  assert.equal(candidate.validation.ok, true, candidate.validation.errors.join('\n'));
  assert.ok(candidate.regions.some(row => row.includes('r')));
});

test('mode contradictions and unsupported corridor width are rejected', () => {
  assert.throws(() => normalizeDungeonLayout({
    mode: 'corridors',
    rooms: { count: { min: 1, max: 1 } },
  }), /zero bulges and zero rooms/);
  assert.throws(() => normalizeDungeonLayout({ mode: 'corridors', corridorWidth: 2 }), /corridorWidth=1/);
});

test('prototype capabilities state the deliberately unfinished areas', () => {
  assert.ok(dungeonGeneratorCapabilities.modes.includes('rooms'));
  assert.ok(dungeonGeneratorCapabilities.pending.includes('stateful mechanism validation'));
});
