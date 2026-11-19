import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {edibleMapSource} from '../authoring/editions/e2/story-q024.mjs';
import {compilePreservedWorldQuest,buildPreservedWorldFile} from './preserved-world-quest.mjs';

export function buildEdibleMapQuest(original,items){
  return compilePreservedWorldQuest(original,items,edibleMapSource(),'ediblemap');
}
export function buildEdibleMap(options){
  return buildPreservedWorldFile('q024',buildEdibleMapQuest,options);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)
  await buildEdibleMap({check:process.argv.includes('--check')});
