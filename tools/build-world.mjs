import fs from 'node:fs/promises';
import {buildNarration} from './build-narration.mjs';
import path from 'node:path';
export async function buildWorld(root){
  const read=async f=>JSON.parse(await fs.readFile(path.join(root,f),'utf8'));
  const write=async(f,value)=>fs.writeFile(path.join(root,f),JSON.stringify(value,null,2)+'\n');
  const game=await read('data/game.json'),locations=await read('config/locations.json'),assets=await read('data/assets.json'),dungeons=await read('data/dungeons.json');
  assets.images.wraith='assets/images/monsters/wraith.webp';
  const owners={};for(const d of Object.values(dungeons))for(const map of d.maps){if(owners[map])throw Error(`Duplicate dungeon owner: ${map}`);owners[map]=d.id;}
  for(const l of Object.values(locations))assets.images[l.background]=`assets/images/locations/${l.background.slice(9)}.webp`;
  for(const id of ['curator','porter','examiner','elder','rookie','rine','accused','bearers','belt','brother','cleaners','clerks'])assets.images[`sprite_${id}`]=`assets/images/characters/sprites/${id}.webp`;
  for(const file of game.files.quests){
    const q=await read(file);
    for(const e of q.events){
      for(const p of e.points){if(!owners[p.map]||p.dungeon&&p.dungeon!==owners[p.map]||e.dungeon&&e.dungeon!==owners[p.map])throw Error(`${q.id}/${e.id}: dungeon/map mismatch`);p.dungeon=owners[p.map];}
      const ids=new Set(e.points.map(p=>p.dungeon));if(ids.size===1)e.dungeon=[...ids][0];
    }
    await write(file,q);
  }
  for(const file of game.files.maps){const map=await read(file);map.dungeon=owners[map.id];await write(file,map);}
  game.world={version:1,townRoot:'hikarigaeri_square'};game.version='1.20.0';game.inspectionVersion=1;game.fieldEventVersion=1;game.files.databases.locations='data/locations.json';
  await write('data/locations.json',locations);await write('data/assets.json',assets);await write('data/game.json',game);
  await buildNarration(root);
}
