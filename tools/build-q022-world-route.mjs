import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {greenSleepSource} from '../authoring/editions/e2/story-q022.mjs';
import {compilePreservedWorldQuest,buildPreservedWorldFile} from './preserved-world-quest.mjs';

export function buildGreenSleepQuest(original,items){
  return compilePreservedWorldQuest(original,items,greenSleepSource(),'greensleep');
}
export function buildGreenSleep(options){
  return buildPreservedWorldFile('q022',buildGreenSleepQuest,options);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)
  await buildGreenSleep({check:process.argv.includes('--check')});
