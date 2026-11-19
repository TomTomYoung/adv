import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {motherRingSource} from '../authoring/editions/e2/story-q023.mjs';
import {compilePreservedWorldQuest,buildPreservedWorldFile} from './preserved-world-quest.mjs';

export function buildMotherRingQuest(original,items){
  return compilePreservedWorldQuest(original,items,motherRingSource(),'motherring');
}
export function buildMotherRing(options){
  return buildPreservedWorldFile('q023',buildMotherRingQuest,options);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)
  await buildMotherRing({check:process.argv.includes('--check')});
