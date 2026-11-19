import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {crownSource} from '../authoring/editions/e2/story-q020.mjs';
import {compilePreservedWorldQuest,buildPreservedWorldFile} from './preserved-world-quest.mjs';

export function buildCrownQuest(original,items){
  return compilePreservedWorldQuest(original,items,crownSource(),'crown');
}
export function buildCrown(options){
  return buildPreservedWorldFile('q020',buildCrownQuest,options);
}
if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)
  await buildCrown({check:process.argv.includes('--check')});
