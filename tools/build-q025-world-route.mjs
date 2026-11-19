import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {rainSongSource} from '../authoring/editions/e2/story-q025.mjs';
import {compilePreservedWorldQuest,buildPreservedWorldFile} from './preserved-world-quest.mjs';

export function buildRainSongQuest(original,items){
  return compilePreservedWorldQuest(original,items,rainSongSource(),'rainsong');
}
export function buildRainSong(options){
  return buildPreservedWorldFile('q025',buildRainSongQuest,options);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)
  await buildRainSong({check:process.argv.includes('--check')});
