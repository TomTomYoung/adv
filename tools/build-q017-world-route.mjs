import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {twoGravesSource} from '../authoring/editions/e2/story-q017.mjs';
import {compilePreservedWorldQuest,buildPreservedWorldFile} from './preserved-world-quest.mjs';

export function buildTwoGravesQuest(first,items) {
  return compilePreservedWorldQuest(first,items,twoGravesSource(),'twograves');
}
export function buildTwoGraves(options) {
  return buildPreservedWorldFile('q017',buildTwoGravesQuest,options);
}
if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)
  await buildTwoGraves({check:process.argv.includes('--check')});
