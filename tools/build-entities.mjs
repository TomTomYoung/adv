import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root=path.resolve(import.meta.dirname,'..');
export async function applyEntityExpansion(){
  const read=async file=>JSON.parse(await fs.readFile(path.join(root,file),'utf8'));
  const write=(file,value)=>fs.writeFile(path.join(root,file),JSON.stringify(value,null,2)+'\n');
  const plan=await read('authoring/entities.json'),game=await read('data/game.json'),enemies=await read('data/enemies.json'),encounters=await read('data/encounters.json'),skills=await read('data/skills.json'),formulas=await read('data/formulas.json'),assets=await read('data/assets.json');
  const ref=p=>({ref:p}),op=(name,...args)=>({op:name,args});
  formulas.pierce=op('max',2,op('sub',op('mul',ref('source.stats.str'),1.25),op('mul',ref('target.stats.vit'),.25)));
  formulas.spread=op('max',1,op('sub',op('mul',ref('source.stats.str'),.55),op('floor',op('div',ref('target.stats.vit'),2))));
  formulas.group_heal=op('add',8,op('mul',ref('source.stats.int'),.65));
  const damage=(name,mp,formula='physical',element='physical',target='enemy')=>({name,mp,target,description:`${target==='all_enemies'?'敵全体':'敵1体'}へ${name}。MP${mp}。`,effects:[{type:'damage',formula,element}]});
  Object.assign(skills,{
    pierce:damage('貫通突き',4,'pierce'),ice:damage('氷の符',4,'fire','ice'),lightning:damage('雷の符',4,'fire','lightning'),
    group_heal:{name:'薬草の霧',mp:8,target:'all_allies',description:'生存する味方全員を小回復。',effects:[{type:'heal',formula:'group_heal'}]},
    party_guard:{name:'盾の壁',mp:5,target:'all_allies',description:'次の敵一巡まで味方全員の被害を半減。重ね掛け不可。',effects:[{type:'guard'}]},
    inspire:{name:'気付けの節',mp:8,target:'ally',description:'MP8で、生存する味方1人のMPを5回復。',effects:[{type:'restore_mp',amount:5}]},
    water_tail:damage('水車の尾',3,'heavy','water'),gate_slam:damage('水門落とし',3,'heavy'),drill_thrust:damage('螺旋突進',4,'pierce'),shell_roll:damage('殻の体当たり',0),
    wax_flame:damage('蜜蝋の火',4,'fire','fire'),saw_cut:damage('引き鋸',3,'heavy'),iris_ray:damage('虹彩光線',4,'fire','light'),glass_shards:damage('硝子の刃',3,'heavy'),type_needles:damage('活字の針',3,'heavy'),
    ink_sip:{name:'墨すすり',mp:2,target:'enemy',description:'相手1人のMPを4減らす。',effects:[{type:'drain_mp',amount:4}]},
    vault_bite:damage('金庫の歯',0),stitch_mend:{...skills.heal,name:'縫い直し',target:'self'},bone_rain:damage('肋骨の雨',4,'spread','physical','all_enemies'),anchor_strike:damage('碇打ち',3,'heavy'),
    discharge:damage('殻の放電',4,'fire','lightning'),rail_charge:damage('列車突進',4,'heavy'),needle_lunge:damage('尾針突き',4,'pierce'),moon_sweep:damage('月輪払い',4,'spread','physical','all_enemies'),blade_pass:damage('すれ違い斬り',3,'heavy')
  });
  const round=(remainder)=>({op:'eq',left:op('mod',ref('self.round'),2),right:remainder});
  for(const m of plan.monsters){
    let ai=[{priority:10,skill:m.skill,target:'random'},{priority:0,skill:'attack',target:'random'}];
    if(['sluice_crocodile','vault_mouse'].includes(m.id))ai.unshift({priority:30,condition:{op:'eq',left:ref('self.round'),right:1},skill:'guard',target:'self'});
    if(m.id==='ceramic_armadillo')ai.unshift({priority:30,condition:{op:'and',args:[round(0),{op:'lt',left:ref('self.hp_ratio'),right:.5}]},skill:'guard',target:'self'});
    if(['kaleidoscope_owl','anchor_squid','battery_hermit'].includes(m.id))ai.unshift({priority:30,condition:round(0),skill:'guard',target:'self'});
    if(m.id==='derail_centipede')ai.unshift({priority:30,condition:round(0),skill:'recover_stance',target:'self'});
    if(m.id==='patchwork_bagworm')ai=[{priority:30,condition:{op:'lt',left:ref('self.hp_ratio'),right:.55},skill:'stitch_mend',target:'self'},{priority:0,skill:'attack',target:'random'}];
    if(m.id==='book_silverfish')ai[0].condition=round(1);
    if(m.id==='compass_magpie')ai[0].target='weakest';
    enemies[m.id]={...m,ai};assets.images[m.sprite]=`assets/images/monsters/${m.id}.webp`;
    encounters[`wild_${m.id}`]={id:`wild_${m.id}`,text:`${m.name}が現れました。${m.appearance}`,escape:true,enemies:[m.id]};
  }
  skills.recover_stance={name:'姿勢を立て直す',mp:0,target:'self',description:'突進後の隙。',effects:[]};
  for(let r=1;r<=10;r++){
    const [a,b]=plan.monsters.filter(m=>m.region===r);
    encounters[`wild_pair_${r}`]={id:`wild_pair_${r}`,text:`${a.name}と${b.name}が通路に現れました。`,escape:true,enemies:[a.id,b.id]};
    for(const floor of [1,2]){
      const file=`data/maps/region_${r}_f${floor}.json`,map=await read(file);
      map.encounterPool=[{encounter:`roaming_${r}`,weight:20},{encounter:`wild_${a.id}`,weight:floor===1?40:35},{encounter:`wild_${b.id}`,weight:floor===1?40:35},...(floor===2?[{encounter:`wild_pair_${r}`,weight:10}]:[])];await write(file,map);
    }
  }
  for(const a of Object.values(plan.actors))assets.images[a.portrait]=`assets/images/portraits/${a.id}.webp`;
  assets.audio.exploration='assets/audio/exploration-v2.ogg';assets.audio.battle='assets/audio/battle-v2.ogg';
  game.version=plan.version;game.tavern={name:'帰り火亭',description:'出発する仲間を選びます。待機中も傷・魔力・装備は残ります。',candidates:Object.keys(plan.actors)};
  game.migrations={'1.0.0':{actors:['ada','nio','sera','il','berg']}};
  game.services.find(s=>s.id==='recruit').detail='ベルグの話を聞いて加入を頼みます。ほかの仲間は酒場で選べます。';
  await write('data/actors.json',plan.actors);await write('data/game.json',game);await write('data/enemies.json',enemies);await write('data/encounters.json',encounters);await write('data/skills.json',skills);await write('data/formulas.json',formulas);await write('data/assets.json',assets);
  console.log(`Entity expansion: ${plan.monsters.length} new species, ${Object.keys(plan.actors).length} companions`);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)await applyEntityExpansion();
