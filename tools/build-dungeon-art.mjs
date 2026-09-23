import fs from 'node:fs/promises';
import path from 'node:path';

// Dungeon structure and art contain no quest references.
export async function buildDungeonArt(root,definitions){
  const read=async f=>JSON.parse(await fs.readFile(path.join(root,f),'utf8'));
  const write=async(f,v)=>fs.writeFile(path.join(root,f),JSON.stringify(v,null,2)+'\n');
  const source=await read('config/dungeon-art.json'),assets=await read('data/assets.json');
  if(source.schemaVersion!==1||!Array.isArray(source.entries))throw Error('Dungeon art source is invalid');
  assets.images.dungeon_walls=source.assets.walls;assets.images.dungeon_devices=source.assets.devices;
  const art=(asset,index)=>{
    if(!Number.isInteger(index)||index<0||index>15)throw Error('Invalid atlas index');
    // Insets exclude grid seams. The device atlas has unequal authored row heights.
    const ys=asset==='dungeon_devices'?[0,310,616,907,1254]:[0,313.5,627,940.5,1254],row=Math.floor(index/4);
    return {asset,rect:{x:(index%4*313.5+5)/1254,y:(ys[row]+5)/1254,width:303.5/1254,height:(ys[row+1]-ys[row]-10)/1254}};
  };
  for(const entry of source.entries){
    const d=definitions[entry.dungeon];
    if(!d)throw Error('Unknown dungeon');
    d.art={wall:art('dungeon_walls',entry.wall),device:art('dungeon_devices',entry.device)};
    if(entry.floor??source.floor)d.art.floor=structuredClone(entry.floor??source.floor);
    if(d.systems.garden)d.art.variants={root_bridge:art('dungeon_devices',13),thorn_wall:art('dungeon_devices',14),stair_vine:art('dungeon_devices',15)};
  }
  await write('data/assets.json',assets);
}
