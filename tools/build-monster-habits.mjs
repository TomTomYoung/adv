import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {validHabits} from '../src/core/monster-habits.js';

export function applyMonsterHabits(enemies, assignments) {
  if (!assignments || typeof assignments !== 'object' || Array.isArray(assignments)) throw Error('魔物の習性の割当が不正です');
  for (const [id, ids] of Object.entries(assignments)) {
    if (!Object.hasOwn(enemies, id) || !validHabits(ids)) throw Error(id + ': 魔物または習性の割当が不正です');
  }
  for (const [id, enemy] of Object.entries(enemies)) {
    if (assignments[id]?.length) enemy.habits = [...assignments[id]];
    else delete enemy.habits;
  }
}

export async function buildMonsterHabits(root = path.resolve(import.meta.dirname, '..')) {
  const file = path.join(root, 'data/enemies.json');
  const enemies = JSON.parse(await fs.readFile(file, 'utf8'));
  const {assignments} = JSON.parse(await fs.readFile(path.join(root, 'config/monster-habits.json'), 'utf8'));
  applyMonsterHabits(enemies, assignments);
  await fs.writeFile(file, JSON.stringify(enemies, null, 2) + '\n');
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) await buildMonsterHabits();
