import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {orchardPromiseSource} from '../authoring/editions/e2/story-q026.mjs';
import {compilePreservedWorldQuest,buildPreservedWorldFile} from './preserved-world-quest.mjs';

export function buildOrchardPromiseQuest(original,items){
  return compilePreservedWorldQuest(original,items,orchardPromiseSource(),'orchardpromise');
}
export function buildOrchardPromise(options){
  return buildPreservedWorldFile('q026',buildOrchardPromiseQuest,options);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)
  await buildOrchardPromise({check:process.argv.includes('--check')});
