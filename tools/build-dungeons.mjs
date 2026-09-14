import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root=path.resolve(import.meta.dirname,'..');
export async function buildDungeons(){
  const read=async file=>JSON.parse(await fs.readFile(path.join(root,file),'utf8'));
  const write=async(file,data)=>{await fs.mkdir(path.dirname(path.join(root,file)),{recursive:true});await fs.writeFile(path.join(root,file),JSON.stringify(data,null,2)+'\n');};
  const definitions={};
  for(const file of (await fs.readdir(path.join(root,'authoring/dungeons'))).filter(f=>f.endsWith('.json')).sort()){
    const d=await read(`authoring/dungeons/${file}`);if(Object.hasOwn(definitions,d.id))throw Error(`Dungeon ID duplicated: ${d.id}`);definitions[d.id]=d;
  }
  const content=await read('authoring/kagaribi-content.json'),terrain=await read('authoring/terrain-content.json'),game=await read('data/game.json');
  for(const type of ['items','enemies','encounters'])await write(`data/${type}.json`,{...await read(`data/${type}.json`),...content[type]});
  for(const [id,map] of Object.entries(content.maps))await write(`data/maps/${id}.json`,map);
  await write('data/items.json',{...await read('data/items.json'),...terrain.items});
  const shop=await read('data/shops.json');
  for(const good of terrain.shopGoods){const at=shop.goods.findIndex(g=>g.item===good.item);if(at<0)shop.goods.push(good);else shop.goods[at]=good;}
  await write('data/shops.json',shop);
  for(const point of terrain.mapOpenings){
    const file=`data/maps/${point.map}.json`,map=await read(file);
    if(!Number.isInteger(point.x)||!Number.isInteger(point.y)||point.x<1||point.y<1||point.x>=map.tiles[0].length-1||point.y>=map.tiles.length-1)throw Error('水路の座標が不正です');
    const row=Array.from(map.tiles[point.y]);row[point.x]='.';map.tiles[point.y]=row.join('');await write(file,map);
  }
  await write('data/scripts/kagaribi.json',{scripts:content.scripts});
  await write('data/dungeons.json',definitions);
  game.version='1.6.0';game.dungeonVersion=1;
  game.migrations={...game.migrations,'1.4.0':{actors:Object.keys(await read('data/actors.json')),dungeonRevision:true}};
  game.migrations['1.5.0']={actors:Object.keys(await read('data/actors.json')),environmentRevision:true,addedSystems:{region_1:['water'],region_2:['salt','walls']}};
  game.files.databases.dungeons='data/dungeons.json';
  game.files.maps=[...new Set([...game.files.maps,...Object.keys(content.maps).map(id=>`data/maps/${id}.json`)])];
  game.files.scripts=[...new Set([...game.files.scripts,'data/scripts/kagaribi.json'])];
  await write('data/game.json',game);
  const presentation=await read('data/presentation.json');presentation.bindings.skills.repel_kuragari='light';await write('data/presentation.json',presentation);
  console.log(`Dungeons: ${Object.keys(definitions).length}, fire, water, corrosion and walls authored in JSON`);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)await buildDungeons();
