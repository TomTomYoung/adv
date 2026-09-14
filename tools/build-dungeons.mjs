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
  const content=await read('authoring/kagaribi-content.json'),game=await read('data/game.json');
  for(const type of ['items','enemies','encounters'])await write(`data/${type}.json`,{...await read(`data/${type}.json`),...content[type]});
  for(const [id,map] of Object.entries(content.maps))await write(`data/maps/${id}.json`,map);
  await write('data/scripts/kagaribi.json',{scripts:content.scripts});
  await write('data/dungeons.json',definitions);
  game.version='1.5.0';game.dungeonVersion=1;
  game.migrations={...game.migrations,'1.4.0':{actors:Object.keys(await read('data/actors.json')),dungeonRevision:true}};
  game.files.databases.dungeons='data/dungeons.json';
  game.files.maps=[...new Set([...game.files.maps,...Object.keys(content.maps).map(id=>`data/maps/${id}.json`)])];
  game.files.scripts=[...new Set([...game.files.scripts,'data/scripts/kagaribi.json'])];
  await write('data/game.json',game);
  const presentation=await read('data/presentation.json');presentation.bindings.skills.repel_kuragari='light';await write('data/presentation.json',presentation);
  console.log(`Dungeons: ${Object.keys(definitions).length}, fire network authored in JSON`);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)await buildDungeons();
