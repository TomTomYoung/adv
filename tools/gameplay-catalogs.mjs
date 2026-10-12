import {abilityCategory} from '../src/application/character-profile.js';

const targetLabels={enemy:'敵1体',ally:'味方1人',self:'自分',all_enemies:'敵全体',all_allies:'味方全体',location:'地点'};
const itemTypeLabels={consumable:'消耗品',material:'素材',equipment:'装備品',key:'重要品',dungeon_tool:'ダンジョン道具'};
const slotLabels={weapon:'武器',armor:'防具',charm:'護符'};
const statLabels={hp:'HP',mp:'MP',str:'力',vit:'防御',agi:'速さ',int:'知力'};

const materialText=(data,materials)=>Object.entries(materials??{}).map(([id,n])=>`${data.items[id]?.name??id}×${n}`);
const costText=(data,spec)=>{
  const values=[];
  if(spec.mp)values.push(`MP${spec.mp}`);
  if(spec.hp)values.push(`HP${spec.hp}`);
  values.push(...materialText(data,spec.materials));
  return values.length?values.join(' / '):'なし';
};
const compact=(values,limit=6)=>values.length<=limit?values.join('・'):`${values.slice(0,limit).join('・')}ほか${values.length-limit}件`;
const grants=(data,id,api=null)=>Object.values(data.jobs??{}).flatMap(job=>(job.grants??[]).filter(g=>g.skill===id&&(!api||g.api===api)).map(g=>`${job.name} Lv${g.level}`));
const enemyUsers=(data,id)=>Object.values(data.enemies??{}).filter(enemy=>(enemy.ai??[]).some(rule=>rule.skill===id)).map(enemy=>enemy.name);
const itemUsers=(data,id)=>Object.values(data.items??{}).filter(item=>item.battleSkill===id).map(item=>item.name);
const usage=(data,id,api)=>{
  const values=[];
  if(api==='battle.skill'&&(data.jobProfile?.commonSkills??[]).includes(id))values.push('全職共通');
  const job=grants(data,id,api);if(job.length)values.push(`職業：${compact(job)}`);
  if(api==='battle.skill'){const enemies=enemyUsers(data,id);if(enemies.length)values.push(`魔物：${compact(enemies)}`);const items=itemUsers(data,id);if(items.length)values.push(`道具：${compact(items)}`);}
  return values.length?values.join(' / '):'定義のみ・直接参照';
};
const outputText=(data,output)=>Object.entries(output??{}).map(([id,n])=>`${data.items[id]?.name??id}×${n}`).join(' / ');
const battleEntry=(data,id,spec,label)=>[
  `### ${spec.name} (${id})`,'',
  `区分：戦闘${label}。対象：${targetLabels[spec.target]??spec.target??'未指定'}。消費：${costText(data,spec)}。`,
  spec.description??'説明なし。',
  `使用元：${usage(data,id,'battle.skill')}。`,
  spec.fieldUse?'戦闘外使用：可。':'戦闘外使用：不可。',''
];
const fieldEntry=(data,id,spec,label)=>{
  const extra=[];
  if(Object.keys(spec.materials??{}).length)extra.push(`材料：${materialText(data,spec.materials).join(' / ')}。`);
  if(Object.keys(spec.output??{}).length)extra.push(`生成：${outputText(data,spec.output)}。`);
  return [
    `### ${spec.name} (${id})`,'',
    `区分：探索${label}。API：${spec.api}。対象：${targetLabels[spec.target]??spec.target??'未指定'}。消費：${costText(data,spec)}。使用場所：${(spec.modes??[]).join(' / ')||'未指定'}。`,
    spec.description??'説明なし。',
    ...extra,
    `習得：${usage(data,id,spec.api)}。`,''
  ];
};

export function skillCatalog(data,{date}={}){
  const battle=Object.entries(data.skills??{}).filter(([id])=>abilityCategory(id,false)==='skills');
  const field=Object.entries(data.fieldAbilities??{}).filter(([id])=>abilityCategory(id,true)==='skills');
  const lines=['# スキル一覧','',`更新日: ${date??'未記録'}。作品版${data.game.version}。戦闘スキル${battle.length}件、探索スキル${field.length}件。`,'',
    '正本は [data/skills.json](../data/skills.json) と [data/field-abilities.json](../data/field-abilities.json)。魔法との表示分類は [character-profile.js](../src/application/character-profile.js) の明示分類に従います。魔法に分類される能力は [MAGIC_CATALOG.md](MAGIC_CATALOG.md) に分けます。','','## 戦闘スキル',''];
  for(const [id,spec] of battle)lines.push(...battleEntry(data,id,spec,'スキル'));
  lines.push('## 探索スキル','');
  for(const [id,spec] of field)lines.push(...fieldEntry(data,id,spec,'スキル'));
  return lines.join('\n').trimEnd()+'\n';
}

export function magicCatalog(data,{date}={}){
  const battle=Object.entries(data.skills??{}).filter(([id])=>abilityCategory(id,false)==='magic');
  const field=Object.entries(data.fieldAbilities??{}).filter(([id])=>abilityCategory(id,true)==='magic');
  const lines=['# 魔法一覧','',`更新日: ${date??'未記録'}。作品版${data.game.version}。戦闘魔法${battle.length}件、探索魔法${field.length}件。`,'',
    '魔法は独立したデータベースではなく、[data/skills.json](../data/skills.json) と [data/field-abilities.json](../data/field-abilities.json) の一部を表示分類したものです。分類元は [character-profile.js](../src/application/character-profile.js)。魔法以外は [SKILL_CATALOG.md](SKILL_CATALOG.md) に載せます。','','## 戦闘魔法',''];
  for(const [id,spec] of battle)lines.push(...battleEntry(data,id,spec,'魔法'));
  lines.push('## 探索魔法','');
  for(const [id,spec] of field)lines.push(...fieldEntry(data,id,spec,'魔法'));
  return lines.join('\n').trimEnd()+'\n';
}

export function itemCatalog(data,{date}={}){
  const groups=['consumable','equipment','material','key','dungeon_tool','__other__'];
  const entries=Object.entries(data.items??{});
  const lines=['# アイテム一覧','',`更新日: ${date??'未記録'}。作品版${data.game.version}。全${entries.length}件。`,'',
    '正本は [data/items.json](../data/items.json)。消耗品・装備品・素材・重要品・ダンジョン道具の現在定義を一覧化します。ショップの商品と価格は [data/shops.json](../data/shops.json)、所持・装備・使用規則は [ショップと旅支度](SHOP_AND_PREPARATIONS.md) を参照してください。',''];
  for(const group of groups){
    const list=entries.filter(([,item])=>(item.type??'__other__')===group);
    if(!list.length)continue;
    lines.push(`## ${group==='__other__'?'未分類・特殊':itemTypeLabels[group]}`,'');
    for(const [id,item] of list){
      lines.push(`### ${item.name} (${id})`,'',`分類：${itemTypeLabels[item.type]??'未分類・特殊'}。`,item.description??'説明なし。');
      if(item.type==='equipment'){
        lines.push(`装備枠：${slotLabels[item.slot]??item.slot??'未指定'}。装備種別：${item.equipmentType??'未指定'}。能力補正：${Object.entries(item.stats??{}).map(([k,n])=>`${statLabels[k]??k} ${n>=0?'+':''}${n}`).join(' / ')||'なし'}。`);
      }
      if(item.field!==undefined)lines.push(`探索中の直接使用：${item.field?'可':'不可'}。`);
      if(item.battleSkill)lines.push(`戦闘時効果：${data.skills[item.battleSkill]?.name??item.battleSkill} (${item.battleSkill})。`);
      if(item.script)lines.push(`使用スクリプト：${item.script}。`);
      lines.push('');
    }
  }
  return lines.join('\n').trimEnd()+'\n';
}
