import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {changeCounterSource} from '../authoring/editions/e2/story-q051.mjs';
import {compilePreservedWorldQuest,buildPreservedWorldFile} from './preserved-world-quest.mjs';

export function buildChangeCounterQuest(original,items){
  return compilePreservedWorldQuest(original,items,changeCounterSource(),'changecounter');
}
export function buildChangeCounter(options){
  return buildPreservedWorldFile('q051',buildChangeCounterQuest,options);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)
  await buildChangeCounter({check:process.argv.includes('--check')});
