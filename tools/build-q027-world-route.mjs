import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {pollenRansomSource} from '../authoring/editions/e2/story-q027.mjs';
import {compilePreservedWorldQuest,buildPreservedWorldFile} from './preserved-world-quest.mjs';

export function buildPollenRansomQuest(original,items){
  return compilePreservedWorldQuest(original,items,pollenRansomSource(),'pollenransom');
}
export function buildPollenRansom(options){
  return buildPreservedWorldFile('q027',buildPollenRansomQuest,options);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)
  await buildPollenRansom({check:process.argv.includes('--check')});
