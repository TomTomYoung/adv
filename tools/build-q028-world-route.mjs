import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {gardenersSeatSource} from '../authoring/editions/e2/story-q028.mjs';
import {compilePreservedWorldQuest,buildPreservedWorldFile} from './preserved-world-quest.mjs';

export function buildGardenersSeatQuest(original,items){
  return compilePreservedWorldQuest(original,items,gardenersSeatSource(),'gardenersseat');
}
export function buildGardenersSeat(options){
  return buildPreservedWorldFile('q028',buildGardenersSeatQuest,options);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)
  await buildGardenersSeat({check:process.argv.includes('--check')});
