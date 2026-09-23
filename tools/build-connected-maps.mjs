import fs from 'node:fs/promises';
import path from 'node:path';

// Run after the older dungeon generators. The authored flat compartments are
// authoritative; voxel source and its distributed files remain in the archive.
export async function buildConnectedMaps(root,definitions,game){
  const read=async p=>JSON.parse(await fs.readFile(path.join(root,p),'utf8'));
  const write=async(p,v)=>fs.writeFile(path.join(root,p),JSON.stringify(v,null,2)+'\n');
  const source=await read('config/connected-maps.json');
  for(const [id,map] of Object.entries(source.maps))await write(`data/maps/${id}.json`,map);
  game.files.maps=[...new Set([...game.files.maps.filter(p=>!source.retiredMaps.includes(path.basename(p,'.json'))),...Object.keys(source.maps).map(id=>`data/maps/${id}.json`)])];
  game.files.scripts=game.files.scripts.filter(p=>!source.retiredScriptFiles.includes(p));
  // Connections own the physical stair operation. Retain script IDs as inert
  // historical records, without an alternative UI path that bypasses the gate.
  const common=await read('data/scripts/common.json'),fire=await read('data/scripts/kagaribi.json');
  for(const d of Object.values(definitions))if(d.systems.connections?.use==='map_connections')for(const id of d.maps){
    const file=`data/maps/${id}.json`,map=await read(file);
    for(const o of map.objects.filter(o=>o.kind==='stairs'))for(const scripts of [common.scripts,fire.scripts])if(scripts[o.script])scripts[o.script]={commands:[{op:'narrate',text:'階段の接続口から隣の区画へ進む。'}]};
    map.objects=map.objects.filter(o=>o.kind!=='stairs');await write(file,map);
  }
  for(const id of ['region_1_f1.stairs','region_1_f2.stairs'])common.scripts[id]={commands:[{op:'narrate',text:'荷揚げ場の乾いた階段室が上下層をつないでいる。'}]};
  await write('data/scripts/common.json',common);await write('data/scripts/kagaribi.json',fire);
}
