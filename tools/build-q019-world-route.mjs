import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {mineScaleSource} from '../authoring/editions/e2/story-q019.mjs';
import {compilePreservedWorldQuest,buildPreservedWorldFile} from './preserved-world-quest.mjs';

export function buildMineScaleQuest(first,items) {
  return compilePreservedWorldQuest(first,items,mineScaleSource(),'minescale');
}
export function buildMineScale(options) {
  return buildPreservedWorldFile('q019',buildMineScaleQuest,options);
}
if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)
  await buildMineScale({check:process.argv.includes('--check')});
