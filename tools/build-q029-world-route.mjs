import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {redHoneySource} from '../authoring/editions/e2/story-q029.mjs';
import {compilePreservedWorldQuest,buildPreservedWorldFile} from './preserved-world-quest.mjs';

export function buildRedHoneyQuest(original,items){
  return compilePreservedWorldQuest(original,items,redHoneySource(),'redhoney');
}
export function buildRedHoney(options){
  return buildPreservedWorldFile('q029',buildRedHoneyQuest,options);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)
  await buildRedHoney({check:process.argv.includes('--check')});
