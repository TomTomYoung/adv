import fs from 'node:fs/promises';
import path from 'node:path';

// Generators compose links relative to doc/; relocate only at the write boundary.
export const scenarioDocs = new Set([
  'QUEST_CATALOG.md', 'QUEST_Q001.md', 'QUEST_Q002.md',
  'QUEST_EVENTS.md', 'SCENARIO_DESIGN.md', 'SCENARIO_MODEL_V11.md',
  'EXPLORATION_AND_PROSE.md', 'EVENT_SYSTEM.md', 'EVENT_CATALOG.md',
  'SCRIPT_REFERENCE.md', 'CHARACTERS.md'
]);
export const uiDocs = new Set([
  'PHILOSOPHY_AND_STATUS.md', 'VIEW_CONTRACT.md', 'IN_SCENE_VIEW.md',
  'INSPECTION.md', 'KEYBOARD_CONTROLS.md', 'KEY_CONFIG.md',
  'MESSAGE_AND_COMMAND_WINDOWS.md', 'CHARACTER_STAGING.md', 'SE_CATALOG.md',
  'EFFECT_CATALOG.md', 'MINIMAP.md','SHOP_AND_PREPARATIONS.md'
]);
export const dungeonsDocs = new Set([
  'CELL_CATALOG.md', 'CELL_LAYERS.md', 'CONNECTED_2D_MAPS.md',
  'DUNGEON_ART_AND_SCENARIOS.md', 'DUNGEON_CATALOG.md', 'DUNGEON_SYSTEMS.md',
  'DUNGEON_SYSTEM_DESIGN.md', 'FIELD_LIGHTING.md', 'KAGARIBI_DUNGEON.md',
  'MAP_CELLS_AND_BOUNDARIES.md', 'VOXEL_TERRAIN_AND_WATER.md', 'WATERWAYS_SALT_MINE.md'
]);
export const worldDocs = new Set([
  'WORLD_LOCATIONS.md', 'LOCATION_CATALOG.md'
]);
export const battleDocs = new Set([
  'BALANCE_PLAN.md', 'COMPANION_CATALOG.md', 'JOB_SYSTEM.md',
  'MONSTER_CATALOG.md'
]);
export const authoringDocs = new Set([
  'CONFIG_EDITORS.md', 'CONFIG_EDITOR_SOURCES.md', 'CONFIG_EDITOR_URLS.md'
]);
export const developmentDocs = new Set([
  'PROGRESS.md', 'DOCUMENTATION_AUDIT.md', 'DATA_SNAPSHOT.json'
]);
export const docGroups = {scenarios:scenarioDocs,ui:uiDocs,dungeons:dungeonsDocs,world:worldDocs,battle:battleDocs,authoring:authoringDocs,development:developmentDocs};
const aliases = {'DUNGEON_SYSTEMS_1_7.md':'dungeons/DUNGEON_SYSTEMS.md','EXPLORATION_AND_PROSE_1_11.md':'scenarios/EXPLORATION_AND_PROSE.md','scenarios/EXPLORATION_AND_PROSE_1_11.md':'scenarios/EXPLORATION_AND_PROSE.md','DUNGEON_REVISION_1_9.md':'legacy/2026-09-25/DUNGEON_REVISION_1_9.md','DUNGEON_RENDER_REVIEW.md':'legacy/2026-09-25/DUNGEON_RENDER_REVIEW.md','ui/DUNGEON_RENDER_REVIEW.md':'legacy/2026-09-25/DUNGEON_RENDER_REVIEW.md'};
export function docPath(name) {
  if (aliases[name]) return aliases[name];
  if (name.startsWith('quest-maps/')) return `scenarios/${name}`;
  for (const [folder,names] of Object.entries(docGroups)) if (names.has(name)) return `${folder}/${name}`;
  return name;
}

export function relocateDoc(source, name) {
  const from = path.posix.dirname(docPath(name));
  return source.replace(/(```[^\n]*\n[\s\S]*?```)|\]\(([^\s)]+)\)|\b(src|href)=(["'])(.*?)\4/g, (match, block, markdownTarget, attribute, quote, htmlTarget) => {
    const target=markdownTarget??htmlTarget;
    if (block || /^(?:#|[a-z][a-z\d+.-]*:|\/\/)/i.test(target)) return match;
    const [, file, suffix] = target.match(/^([^?#]*)(.*)$/);
    const resolved = docPath(path.posix.normalize(file));
    const relative=`${path.posix.relative(from, resolved)}${suffix}`;
    return attribute?`${attribute}=${quote}${relative}${quote}`:`](${relative})`;
  });
}

export async function currentMarkdown(folder) {
  const files = [];
  for (const entry of await fs.readdir(folder, {withFileTypes:true})) {
    if (entry.name === 'legacy') continue;
    if (entry.isDirectory()) files.push(...(await currentMarkdown(path.join(folder, entry.name))).map(file => `${entry.name}/${file}`));
    else if (entry.name.endsWith('.md')) files.push(entry.name);
  }
  return files.sort();
}
