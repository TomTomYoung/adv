import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {rootMorningSource} from '../authoring/editions/e2/story-q030.mjs';
import {compilePreservedWorldQuest,buildPreservedWorldFile} from './preserved-world-quest.mjs';

export function buildRootMorningQuest(original,items){
  return compilePreservedWorldQuest(original,items,rootMorningSource(),'rootmorning');
}
export function buildRootMorning(options){
  return buildPreservedWorldFile('q030',buildRootMorningQuest,options);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)
  await buildRootMorning({check:process.argv.includes('--check')});
