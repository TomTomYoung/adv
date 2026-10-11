import fs from 'node:fs/promises';
import path from 'node:path';
import {compileTreasure} from '../src/core/dungeon-packages.js';
export async function buildDungeonPackages(root){
  const read=async f=>JSON.parse(await fs.readFile(path.join(root,f),'utf8'));
  const write=async(f,v)=>fs.writeFile(path.join(root,f),JSON.stringify(v,null,2)+'\n');
  const game=await read('data/game.json'),scripts={};
  for(const file of game.files.maps){
    const map=await read(file);let changed=false;
    for(const object of map.objects)if(object.treasure){
      const result=compileTreasure(map.id,object);object.script=result.script;object.once=false;
      scripts[result.script]={commands:result.commands};changed=true;
    }
    if(changed)await write(file,map);
  }
  await write('data/scripts/dungeon-packages.json',{scripts});
  game.files.scripts=[...new Set([...game.files.scripts,'data/scripts/dungeon-packages.json'])];await write('data/game.json',game);
}
