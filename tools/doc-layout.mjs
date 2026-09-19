import fs from 'node:fs/promises';
import path from 'node:path';

// Generators compose links relative to doc/; relocate only at the write boundary.
export const scenarioDocs = new Set([
  'QUEST_CATALOG.md', 'QUEST_Q001.md', 'QUEST_Q002.md', 'QUEST_EVENTS.md',
  'SCENARIO_DESIGN.md', 'SCENARIO_MODEL_V11.md', 'EXPLORATION_AND_PROSE_1_11.md',
  'EVENT_SYSTEM.md', 'EVENT_CATALOG.md', 'SCRIPT_REFERENCE.md', 'CHARACTERS.md'
]);
export const uiDocs = new Set([
  'PHILOSOPHY_AND_STATUS.md', 'VIEW_CONTRACT.md', 'IN_SCENE_VIEW.md',
  'KEYBOARD_CONTROLS.md', 'KEY_CONFIG.md', 'MESSAGE_AND_COMMAND_WINDOWS.md',
  'DUNGEON_RENDER_REVIEW.md', 'SE_CATALOG.md', 'EFFECT_CATALOG.md'
]);
export const docPath = name => scenarioDocs.has(name) || name.startsWith('quest-maps/') ? `scenarios/${name}` : uiDocs.has(name) ? `ui/${name}` : name;

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
