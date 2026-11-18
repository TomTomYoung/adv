import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {silentBlastSource} from '../authoring/editions/e2/story-q016.mjs';
import {compilePreservedWorldQuest,buildPreservedWorldFile} from './preserved-world-quest.mjs';

export function buildSilentBlastQuest(first,items) {
  return compilePreservedWorldQuest(first,items,silentBlastSource(),'silentblast');
}
export function buildSilentBlast(options) {
  return buildPreservedWorldFile('q016',buildSilentBlastQuest,options);
}
if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)
  await buildSilentBlast({check:process.argv.includes('--check')});
