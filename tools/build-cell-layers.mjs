import fs from 'node:fs/promises';
import path from 'node:path';
import {authoredCellLayers,validateCellLayers} from '../src/core/cell-layers.js';

export async function buildCellLayers(root){
  const read=async file=>JSON.parse(await fs.readFile(path.join(root,file),'utf8'));
  const write=async(file,value)=>fs.writeFile(path.join(root,file),JSON.stringify(value,null,2)+'\n');
  const source=await read('config/cell-layers.json'),game=await read('data/game.json');
  if(source.schemaVersion!==1)throw Error('セル原稿の形式版が不正です');
  const data={game,cellTypes:source.presets,cellEvents:source.events,scripts:source.scripts,assets:await read('data/assets.json'),maps:{}};
  game.cellLayerVersion=1;
  for(const file of game.files.maps){
    const map=await read(file),placement=source.maps[map.id];
    if(!placement)throw Error(`セル配置がありません: ${map.id}`);
    map.cells=structuredClone(placement);
    map.tiles=placement.rows.map((row,y)=>Array.from(row,(_,x)=>authoredCellLayers(data,map,x,y)?.passage??'?').join(''));
    data.maps[map.id]=map;
  }
  if(Object.keys(source.maps).some(id=>!data.maps[id]))throw Error('ロードされないマップのセル配置があります');
  data.dungeons={};for(const file of await fs.readdir(path.join(root,'config/dungeons'))){if(file.endsWith('.json')){const d=await read('config/dungeons/'+file);data.dungeons[d.id]=d;}}
  const errors=validateCellLayers(data,()=>{});if(errors.length)throw Error(errors.join('\n'));
  for(const [id,map] of Object.entries(data.maps))await write(`data/maps/${id}.json`,map);
  await write('data/cell-types.json',source.presets);
  await write('data/cell-events.json',source.events);
  await write('data/scripts/cell-events.json',{scripts:source.scripts});
  game.files.databases.cellTypes='data/cell-types.json';game.files.databases.cellEvents='data/cell-events.json';
  game.files.scripts=[...new Set([...game.files.scripts,'data/scripts/cell-events.json'])];
  await write('data/game.json',game);
}
