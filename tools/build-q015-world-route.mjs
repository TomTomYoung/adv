import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {weepingPillarSource} from '../authoring/editions/e2/story-q015.mjs';
import {compilePreservedWorldQuest,buildPreservedWorldFile} from './preserved-world-quest.mjs';

export function buildWeepingPillarQuest(first,items) {
  return compilePreservedWorldQuest(first,items,weepingPillarSource(),'weepingpillar');
}
export function buildWeepingPillar(options) {
  return buildPreservedWorldFile('q015',buildWeepingPillarQuest,options);
}
if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)
  await buildWeepingPillar({check:process.argv.includes('--check')});
