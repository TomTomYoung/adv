import fs from 'node:fs/promises';
import path from 'node:path';
import {editNarration} from '../authoring/narration.mjs';
export async function buildNarration(root){
 const game=JSON.parse(await fs.readFile(path.join(root,'data/game.json'),'utf8'));
 const files=[...game.files.quests,...game.files.scripts,'data/locations.json','data/dungeons.json'];
 for(const file of files){
  const absolute=path.join(root,file),before=JSON.parse(await fs.readFile(absolute,'utf8'));
  await fs.writeFile(absolute,JSON.stringify(editNarration(before),null,2)+'\n');
 }
}
