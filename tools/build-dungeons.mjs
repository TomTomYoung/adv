import {buildCellLayers} from './build-cell-layers.mjs';
import {buildWorld} from './build-world.mjs';
import {buildConnectedMaps} from './build-connected-maps.mjs';
import fs from 'node:fs/promises';
import {buildDungeonArt} from './build-dungeon-art.mjs';
import {applyQuestEvents} from './quest-event-source.mjs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root=path.resolve(import.meta.dirname,'..');
export async function buildDungeons(){
  const read=async file=>JSON.parse(await fs.readFile(path.join(root,file),'utf8'));
  const write=async(file,data)=>{await fs.mkdir(path.dirname(path.join(root,file)),{recursive:true});await fs.writeFile(path.join(root,file),JSON.stringify(data,null,2)+'\n');};
  const definitions={};
  for(const file of (await fs.readdir(path.join(root,'authoring/dungeons'))).filter(f=>f.endsWith('.json')).sort()){
    const d=await read(`authoring/dungeons/${file}`);if(Object.hasOwn(definitions,d.id))throw Error(`Dungeon ID duplicated: ${d.id}`);
    for(const spec of Object.values(d.systems))if(spec.use==='vector_curse'&&spec.vectorRows){
      if(spec.vectors)throw Error('vectorRowsとvectorsは同時に指定できません');
      const directions={'↑':[0,-1],'→':[1,0],'↓':[0,1],'←':[-1,0],'・':[0,0]};spec.vectors=[];
      for(const mapId of d.maps){
        const map=await read(`data/maps/${mapId}.json`),rows=spec.vectorRows[mapId];
        if(!Array.isArray(rows)||rows.length!==map.tiles.length||rows.some((row,y)=>typeof row!=='string'||Array.from(row).length!==map.tiles[y].length))throw Error(`${mapId}: ベクトル図の寸法が違います`);
        for(let y=0;y<rows.length;y++)for(let x=0;x<rows[y].length;x++){
          const glyph=rows[y][x];if(map.tiles[y][x]==='#'){if(glyph!=='#')throw Error(`${mapId}: 壁には#を指定してください`);continue;}
          const delta=directions[glyph];if(!delta)throw Error(`${mapId}: 床には矢印か・を指定してください`);spec.vectors.push({map:mapId,x,y,dx:delta[0],dy:delta[1]});
        }
      }
      if(Object.keys(spec.vectorRows).some(id=>!d.maps.includes(id)))throw Error('ベクトル図のマップが迷宮に所属していません');delete spec.vectorRows;
    }
    definitions[d.id]=d;
  }
  const content=await read('authoring/kagaribi-content.json'),terrain=await read('authoring/terrain-content.json'),extra=await read('authoring/dungeon-content.json'),voxel=await read('authoring/voxel-content.json'),game=await read('data/game.json');
  for(const type of ['items','enemies','encounters'])await write(`data/${type}.json`,{...await read(`data/${type}.json`),...content[type]});
  for(const [id,map] of Object.entries(content.maps))await write(`data/maps/${id}.json`,map);
  for(const type of ['items','enemies','encounters','statuses'])await write(`data/${type}.json`,{...await read(`data/${type}.json`),...extra[type]});
  for(const [id,map] of Object.entries(extra.maps))await write(`data/maps/${id}.json`,map);
  await write('data/items.json',{...await read('data/items.json'),...terrain.items});
  const shop=await read('data/shops.json');
  for(const good of [...terrain.shopGoods,...extra.shopGoods]){const at=shop.goods.findIndex(g=>g.item===good.item);if(at<0)shop.goods.push(good);else shop.goods[at]=good;}
  await write('data/shops.json',shop);
  const connected=await read('authoring/connected-maps.json');
  for(const point of [...terrain.mapOpenings,...extra.mapOpenings].filter(p=>!connected.maps[p.map])){
    const file=`data/maps/${point.map}.json`,map=await read(file);
    if(!Number.isInteger(point.x)||!Number.isInteger(point.y)||point.x<1||point.y<1||point.x>=map.tiles[0].length-1||point.y>=map.tiles.length-1)throw Error('水路の座標が不正です');
    const row=Array.from(map.tiles[point.y]);row[point.x]='.';map.tiles[point.y]=row.join('');await write(file,map);
  }
  for(const [id,cells] of Object.entries(extra.mapKnown)){if(connected.maps[id])continue;const file=`data/maps/${id}.json`,map=await read(file);map.initiallyKnown=[...new Set([...(map.initiallyKnown??[]),...cells])];await write(file,map);}
  for(const [id,map] of Object.entries(voxel.maps))if(!connected.retiredMaps.includes(id))await write(`data/maps/${id}.json`,map);
  if(!connected.retiredScriptFiles.includes('data/scripts/voxel-space.json'))await write('data/scripts/voxel-space.json',{scripts:voxel.scripts});
  await write('data/scripts/dungeon-systems.json',{scripts:extra.scripts});
  await write('data/scripts/kagaribi.json',{scripts:content.scripts});
  await buildDungeonArt(root,definitions);
  await applyQuestEvents(root);
  await write('data/dungeons.json',definitions);
  game.version='1.9.0';game.dungeonVersion=1;
  game.migrations={};
  game.files.databases.dungeons='data/dungeons.json';
  game.files.maps=[...new Set([...game.files.maps,...Object.keys({...content.maps,...extra.maps,...voxel.maps}).map(id=>`data/maps/${id}.json`)])];
  game.files.scripts=[...new Set([...game.files.scripts,'data/scripts/kagaribi.json','data/scripts/dungeon-systems.json','data/scripts/voxel-space.json'])];
  await buildConnectedMaps(root,definitions,game);
  await write('data/game.json',game);
  const presentation=await read('data/presentation.json');presentation.bindings.skills.repel_kuragari='light';await write('data/presentation.json',presentation);
  await buildWorld(root);
  await buildCellLayers(root);
  console.log(`Dungeons: ${Object.keys(definitions).length}, unique systems authored in JSON`);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)await buildDungeons();
