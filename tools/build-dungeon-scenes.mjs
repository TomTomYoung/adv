import fs from 'node:fs/promises';
import path from 'node:path';

// Additive scripts: existing quest VM addresses remain unchanged.
export async function buildDungeonScenes(root,definitions){
  const read=async f=>JSON.parse(await fs.readFile(path.join(root,f),'utf8'));
  const write=async(f,v)=>fs.writeFile(path.join(root,f),JSON.stringify(v,null,2)+'\n');
  const source=await read('authoring/dungeon-scenes.json'),scripts=await read('data/scripts/dungeon-scenes.json').then(v=>v.scripts).catch(e=>{if(e.code==='ENOENT')return {};throw e;}),assets=await read('data/assets.json'),ids=new Set();
  if(source.schemaVersion!==1||!Array.isArray(source.entries))throw Error('Dungeon scene source is invalid');
  assets.images.dungeon_walls=source.assets.walls;assets.images.dungeon_devices=source.assets.devices;
  const art=(asset,index)=>{
    if(!Number.isInteger(index)||index<0||index>15)throw Error('Invalid atlas index');
    // Insets exclude grid seams. The device atlas has unequal authored row heights.
    const ys=asset==='dungeon_devices'?[0,310,616,907,1254]:[0,313.5,627,940.5,1254],row=Math.floor(index/4);
    return {asset,rect:{x:(index%4*313.5+5)/1254,y:(ys[row]+5)/1254,width:303.5/1254,height:(ys[row+1]-ys[row]-10)/1254}};
  };
  for(const entry of source.entries){
    const d=definitions[entry.dungeon],s=entry.scene;
    if(!d||ids.has(s.id))throw Error('Unknown dungeon or duplicate scene');ids.add(s.id);
    d.art={wall:art('dungeon_walls',entry.wall),device:art('dungeon_devices',entry.device)};
    if(entry.floor??source.floor)d.art.floor=structuredClone(entry.floor??source.floor);
    if(d.systems.garden)d.art.variants={root_bridge:art('dungeon_devices',13),thorn_wall:art('dungeon_devices',14),stair_vine:art('dungeon_devices',15)};
    if(!Number.isSafeInteger(s.revision)||s.revision<1)throw Error('Invalid scene revision');
    const script=`dungeon.scene.${s.id}.v${s.revision}`,flag=`flags.dungeonNotes.${s.id}`,ref=p=>({ref:p}),say=text=>({op:'narrate',text});
    d.fieldScenes??=[];d.fieldScenes.push({id:s.id,title:s.title,quest:s.quest,points:s.points,script,condition:s.condition,note:s.note});
    scripts[script]={dungeonScene:s.id,commands:[say(s.intro),{op:'if',condition:s.condition,
      then:[say(s.observed),{op:'choice',options:[{id:'record',text:'確認した事実を依頼の手帳へ記す',condition:{op:'ne',left:ref(flag),right:true},commands:[{op:'set',target:flag,value:true},say('現地の観察を手帳に記した。')]},{id:'leave',text:'探索へ戻る',commands:[]}]}],
      else:[say(s.pending)]}]};
  }
  await write('data/assets.json',assets);
  await write('data/scripts/dungeon-scenes.json',{scripts});
  const file=path.join(root,'doc/DUNGEON_ART_AND_SCENARIOS.md'),doc=await fs.readFile(file,'utf8'),marker='<!-- generated dungeon scenes -->';
  const rows=[];
  for(const entry of source.entries){const s=entry.scene;rows.push(`### ${definitions[entry.dungeon].name} / ${s.title}`,'',`関連依頼: ${s.quest}。調査地点: ${s.points.map(p=>`${p.map} (${p.x}, ${p.y})`).join(' / ')}。`,'',s.note,'',`観察条件: \`${JSON.stringify(s.condition)}\``,'');}
  await fs.writeFile(file,doc.split(marker)[0].trimEnd()+'\n\n'+marker+'\n\n'+rows.join('\n'));
}
