import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {seedBirdSource} from '../authoring/editions/e2/story-q021.mjs';
import {compilePreservedWorldQuest,buildPreservedWorldFile} from './preserved-world-quest.mjs';

export function buildSeedBirdQuest(original,items){
  return compilePreservedWorldQuest(original,items,seedBirdSource(),'seedbird');
}
export function buildSeedBird(options){
  return buildPreservedWorldFile('q021',buildSeedBirdQuest,options);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)
  await buildSeedBird({check:process.argv.includes('--check')});
