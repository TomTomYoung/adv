import {abilityCategory} from '../src/application/character-profile.js';
import {guardDamageRate} from '../src/core/battle-turns.js';

const targetLabels={enemy:'敵1体',ally:'味方1人',self:'自分',all_enemies:'敵全体',all_allies:'味方全体',location:'地点'};
const itemTypeLabels={consumable:'消耗品',material:'素材',equipment:'装備品',key:'重要品',dungeon_tool:'ダンジョン道具'};
const slotLabels={weapon:'武器',armor:'防具',charm:'護符'};
const statLabels={hp:'HP',mp:'MP',str:'力',vit:'防御',agi:'速さ',int:'知力'};
const elementLabels={physical:'物理',fire:'炎',ice:'氷',lightning:'雷',water:'水',light:'光',earth:'地',dark:'闇'};
const refLabels={
  'source.stats.str':'使用者の力','source.stats.vit':'使用者の防御','source.stats.agi':'使用者の速さ','source.stats.int':'使用者の知力',
  'target.stats.str':'対象の力','target.stats.vit':'対象の防御','target.stats.agi':'対象の速さ','target.stats.int':'対象の知力'
};

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

function expressionText(node){
  if(typeof node==='number')return String(node);
  if(node===null||node===undefined)return '0';
  if(typeof node!=='object')return String(node);
  if(node.ref)return refLabels[node.ref]??node.ref;
  const args=(node.args??[]).map(expressionText);
  if(node.op==='add')return `(${args.join(' + ')})`;
  if(node.op==='sub')return `(${args[0]} - ${args[1]})`;
  if(node.op==='mul')return `(${args.join(' × ')})`;
  if(node.op==='div')return `(${args[0]} ÷ ${args[1]})`;
  if(node.op==='floor')return `floor(${args[0]})`;
  if(node.op==='max'||node.op==='min')return `${node.op}(${args.join(', ')})`;
  return `${node.op??'式'}(${args.join(', ')})`;
}
const rawText=(data,effect)=>effect.formula?expressionText(data.formulas?.[effect.formula]??effect.formula):String(effect.amount??0);
const chanceText=chance=>`${Math.round((chance??1)*1000)/10}%`;
const buffEffectText=(data,id)=>{
  const b=data.buffs?.[id];if(!b)return `補正 ${id}`;
  const values=[];
  for(const [key,n] of Object.entries(b.stats??{}))values.push(`${statLabels[key]??key} ×${n}`);
  for(const [element,n] of Object.entries(b.resist??{}))values.push(`${elementLabels[element]??element}被ダメージ ×${n}`);
  values.push(`持続 ${b.turns}敵巡`);
  return values.join(' / ');
};
function effectCalculation(data,skillId,effect,prefix='計算式'){
  const base=`max(0, ${rawText(data,effect)})`;
  if(effect.type==='damage'){
    const element=elementLabels[effect.element]??effect.element??'未指定';
    return `${prefix}：基礎値 = ${base}。最終ダメージ = max(1, floor(floor(基礎値) × 威力補正 × ガード補正 × 属性補正 × 被ダメージ補正 × クリティカル補正))。防御Lv3では0。属性：${element}。`;
  }
  if(effect.type==='heal'){
    const multiplier=(effect.itemHealing||skillId==='potion')?'アイテム回復補正':'回復威力補正';
    const scale=effect.scale??1;
    return `${prefix}：基礎値 = ${base}。回復量 = floor(基礎値 × ${multiplier}${scale!==1?` × ${scale}`:''})。実回復量は最大HPを超えない。`;
  }
  if(effect.type==='restore_mp')return `${prefix}：MP回復量 = min(最大MP - 現在MP, floor(${base}))。`;
  if(effect.type==='drain_mp')return `${prefix}：MP減少量 = min(現在MP, floor(${base}))。`;
  if(effect.type==='status')return `${prefix}：状態異常「${data.statuses?.[effect.status]?.name??effect.status}」を ${chanceText(effect.chance)} で付与${effect.duration!==undefined?`、持続 ${effect.duration}`:''}。`;
  if(effect.type==='stun')return `${prefix}：次の行動機会を${effect.count??1}回消費（${effect.stack==='add'?'加算':'更新'}）、付与率${chanceText(effect.chance)}。`;
  if(effect.type==='cleanse')return `${prefix}：${effect.status?`状態異常「${data.statuses?.[effect.status]?.name??effect.status}」を解除`:'解除可能な状態異常を解除'}。`;
  if(effect.type==='buff')return `${prefix}：${buffEffectText(data,effect.buff)}。`;
  if(effect.type==='guard')return `${prefix}：防御Lv${effect.level??1}、ガード中の被ダメージ補正 = ×${guardDamageRate(data,effect.level??1)}。`;
  if(effect.type==='cover')return `${prefix}：指定した味方への単体攻撃を1回の対象変更として引き受ける。数値ダメージ式は攻撃側の式をそのまま使う。`;
  if(effect.type==='analyze')return `${prefix}：数値計算なし。対象の能力・耐性を解析済みとして記録する。`;
  if(effect.type==='repel')return `${prefix}：数値ダメージなし。対象条件を満たすくらがり戦を撃退終了する。`;
  return `${prefix}：数値計算なし。`;
}
const calculationLines=(data,id,spec)=>{
  const lines=[];
  for(const effect of spec.effects??[])lines.push(effectCalculation(data,id,effect,'計算式'));
  for(const effect of spec.selfEffects??[])lines.push(effectCalculation(data,id,effect,'自己効果'));
  return lines;
};
const commonRules=data=>[
  '## 共通の計算規則','',
  '戦闘の基礎式は [data/formulas.json](../data/formulas.json)、戦闘補正は [data/buffs.json](../data/buffs.json)、ガード率などは [data/system.json](../data/system.json) が正本です。各能力の「計算式」には基礎値を展開して記載します。','',
  'ダメージは、まず各技の基礎式を評価し、0未満を0へ丸めます。その後、最終ダメージ = max(1, floor(floor(基礎値) × 威力補正 × ガード補正 × 属性補正 × 被ダメージ補正 × クリティカル補正)) です。威力補正にはダンジョン属性補正、物理／魔法威力の職業特性、属性威力特性を含みます。ガード補正は通常1、防御Lv1は system.guardRate（現行0.5）、Lv2は0.25、Lv3は0。防御Lv3の最終ダメージは最小1を適用せず0とします。属性補正には対象の属性耐性、戦闘バフの耐性、濡れによる耐性変化を含みます。被ダメージ補正は対象側の職業特性です。クリティカル補正は通常1、発生時2。通常確率0%に攻撃側・被攻撃側の状態による上昇分を加算し、どちらかの確定効果で100%。命中後に対象ごとに1回判定します。','',
  'HP回復は 回復量 = floor(基礎値 × 回復補正 × 個別scale) です。通常の回復技能は回復威力補正、傷薬系はアイテム回復補正を使い、最大HPを超えた分は切り捨てます。','',
  '戦闘バフ／デバフの能力値は、能力ごとに 最終値 = max(0, floor(基礎値 × 最大の強化倍率 × 最大の弱体倍率)) です。同じ能力の強化を無制限に乗算せず、最も強い強化1つと最も強い弱体1つを使います。属性耐性補正も有効なもののうち最も強い軽減を使います。',''
];

const fieldCalculation=(data,spec)=>{
  if(spec.api==='trap.detect')return `範囲：${spec.radius*2+1}×${spec.radius*2+1}。対応隠蔽度：${spec.hidden}。`;
  if(spec.api==='trap.disarm')return `解除難度：${spec.difficulty}まで。回収：${spec.recover?'罠定義の最低Lv・確率・袋の空きに従う':'なし'}。`;
  if(spec.api==='party.ambush')return `効果：${spec.duration}歩以内の次戦闘で味方先制${spec.actions}回を予約。`;
  if(spec.api==='party.patrol')return `効果：${spec.duration}歩、敵先制候補を除外。`;
  if(spec.api==='party.camouflage')return `効果：${spec.duration}歩、通常遭遇率×${spec.rate}。`;
  if(spec.api==='party.recon')return `結果：周囲半径${spec.radius}の通行可能な接続域から未探索${spec.cells}セルまで。${spec.returnSteps}歩で復帰、罠解除は${spec.disarmCount}件まで。`;
  if(spec.api==='encounter.seek')return '遭遇：現在フロアの通常候補を重み付きで抽選。';
  if(spec.api==='map.reveal'&&spec.radius!==undefined)return `計算式：記録範囲 = 現在地を中心とする半径${spec.radius}マス。`;
  if(spec.api==='inventory.convert')return `変換式：${materialText(data,spec.materials).join(' + ')}${spec.mp?` + MP${spec.mp}`:''} → ${outputText(data,spec.output)}。`;
  if(spec.api==='party.heal'&&spec.amount!==undefined)return `計算式：各生存隊員のHP回復量 = min(最大HP - 現在HP, ${spec.amount})。`;
  if(spec.api==='fire.kindling')return `計算式：数値ダメージなし。MP${spec.mp}を消費し、火効果 ${spec.effect} を点火する。`;
  if(spec.api==='water.traverse')return '計算式：数値ダメージなし。条件を満たす間、水没度10まで移動・呼吸を許可する。';
  if(spec.api==='party.dry')return '計算式：数値ダメージなし。隊員の濡れ状態を解除する。';
  return '計算式：固定の数値計算なし。APIの成立条件と状態変更を適用する。';
};

export function skillLevelLines(spec){
  if(!spec.levelUp)return [];
  return [`技能Lv：1〜${spec.maxSkillLevel??3}。人物Lvによる習得条件とは独立。`,...Object.entries(spec.levels??{}).map(([n,v])=>`技能Lv${n}の変更：${JSON.stringify(v)}。`),...Object.entries(spec.levelUp).map(([n,v])=>`技能Lv${n}の成長条件：${JSON.stringify(v)}。`)];
}
const staticGrowthText=(data,id,c,nested=false)=>{
  const name=skill=>data.skills?.[skill]?.name??data.fieldAbilities?.[skill]?.name??skill;
  if(c?.all||c?.any){
    const list=c.all??c.any,join=c.all?' かつ ':' または ',body=list.map(v=>staticGrowthText(data,id,v,true)).join(join);
    return nested?`(${body})`:body;
  }
  switch(c?.kind){
    case 'actor_level':return `人物Lv${c.level}以上`;
    case 'uses':return `${name(c.skill??id)}を${c.count}回使用`;
    case 'weapon_uses':return `${data.items?.[c.weapon]?.name??c.weapon}を${c.count}回使用`;
    case 'action_uses':return `${c.action}を${c.count}回実行`;
    case 'event':return `イベント「${c.event}」完了`;
    case 'flag':return `条件「${c.flag}」=${String(c.value??true)}`;
    case 'training':return `${name(c.skill??id)}を${c.count}回訓練`;
    case 'skill':return `${name(c.skill)} 技能Lv${c.level??1}以上`;
    case 'companion':return `${data.actors?.[c.actor]?.name??c.actor}が生存して同行`;
    case 'random':return `${c.on==='skill'?name(c.id):c.on==='weapon'?data.items?.[c.id]?.name??c.id:c.id}使用時に${Math.round(c.chance*100)}%`;
    default:return '未設定';
  }
};
const resolvedSkillLevel=(spec,level)=>{
  const result=structuredClone(spec);
  for(let n=2;n<=level;n++)Object.assign(result,spec.levels?.[n]??{});
  return result;
};
const skillCatalogLevelLines=(data,id,spec,field=false)=>{
  const max=spec.maxSkillLevel??3,lines=['技能Lv別',''];
  for(let n=1;n<=max;n++){
    const resolved=resolvedSkillLevel(spec,n),changed=n===1||Boolean(spec.levels?.[n]);
    lines.push(`#### 技能Lv${n}`,'',`消費：${costText(data,resolved)}。対象：${targetLabels[resolved.target]??resolved.target??'未指定'}。`);
    if(field)lines.push(changed?fieldCalculation(data,resolved):'効果：前Lvと同一。');
    else lines.push(...(changed?calculationLines(data,id,resolved):['効果：前Lvと同一。']));
    lines.push(`到達条件：${n===1?'習得時の初期段階':spec.levelUp?.[n]?staticGrowthText(data,id,spec.levelUp[n]):'未設定（現行では到達不可）'}。`,'');
  }
  return lines;
};
const battleEntry=(data,id,spec,label,rawLevels=true)=>[
  `### ${spec.name} (${id})`,'',
  `区分：戦闘${label}。対象：${targetLabels[spec.target]??spec.target??'未指定'}。消費：${costText(data,spec)}。`,
  spec.description??'説明なし。',
  ...calculationLines(data,id,spec),
  ...(rawLevels?skillLevelLines(spec):[]),
  `使用元：${usage(data,id,'battle.skill')}。`,
  spec.fieldUse?'戦闘外使用：可。':'戦闘外使用：不可。',''
];
const fieldEntry=(data,id,spec,label,rawLevels=true)=>{
  const extra=[];
  if(Object.keys(spec.materials??{}).length)extra.push(`材料：${materialText(data,spec.materials).join(' / ')}。`);
  if(Object.keys(spec.output??{}).length)extra.push(`生成：${outputText(data,spec.output)}。`);
  return [
    `### ${spec.name} (${id})`,'',
    `区分：探索${label}。API：${spec.api}。対象：${targetLabels[spec.target]??spec.target??'未指定'}。消費：${costText(data,spec)}。使用場所：${(spec.modes??[]).join(' / ')||'未指定'}。`,
    spec.description??'説明なし。',
    fieldCalculation(data,spec),
    ...(rawLevels?skillLevelLines(spec):[]),
    ...extra,
    `習得：${usage(data,id,spec.api)}。`,''
  ];
};

function itemScriptCommands(data,id,depth=0){
  if(depth>4)return [];
  const script=data.scripts?.[id];if(!script)return [];
  const out=[];
  for(const command of script.commands??[]){
    if(command.op==='call')out.push(...itemScriptCommands(data,command.script,depth+1));
    else out.push(command);
  }
  return out;
}
const itemCalculation=(data,item)=>{
  const lines=[];
  if(item.battleSkill){
    const skill=data.skills?.[item.battleSkill];
    for(const effect of skill?.effects??[])lines.push(effectCalculation(data,item.battleSkill,effect,'戦闘計算'));
  }
  if(item.script){
    for(const command of itemScriptCommands(data,item.script)){
      if(command.op==='actor.heal')lines.push(`探索計算：HP回復量 = min(最大HP - 現在HP, ${command.amount})。`);
      if(command.op==='actor.restore_mp')lines.push(`探索計算：MP回復量 = min(最大MP - 現在MP, ${command.amount})。`);
      if(command.op==='status.remove')lines.push(`探索効果：状態異常「${data.statuses?.[command.status]?.name??command.status}」を解除。`);
      if(command.op==='light.refill')lines.push('探索効果：灯の燃料をその系統の満タン値まで補充する。');
      if(command.op==='map.reveal')lines.push(`探索計算：地図記録範囲 = 現在地を中心とする半径${command.radius}マス。`);
    }
  }
  if(item.type==='equipment'&&Object.keys(item.stats??{}).length)lines.push(`装備計算：装備前能力値 + ${Object.entries(item.stats).map(([k,n])=>`${statLabels[k]??k} ${n>=0?'+':''}${n}`).join(' / ')}。その後に環境補正・状態異常・戦闘バフを適用する。`);
  return [...new Set(lines)];
};

export function skillCatalog(data,{date}={}){
  const battle=Object.entries(data.skills??{}).filter(([id])=>abilityCategory(id,false)==='skills');
  const field=Object.entries(data.fieldAbilities??{}).filter(([id])=>abilityCategory(id,true)==='skills');
  const lines=['# スキル一覧','',`更新日: ${date??'未記録'}。作品版${data.game.version}。戦闘スキル${battle.length}件、探索スキル${field.length}件。`,'',
    '正本は [data/skills.json](../data/skills.json) と [data/field-abilities.json](../data/field-abilities.json)。魔法との表示分類は [character-profile.js](../src/application/character-profile.js) の明示分類に従います。魔法に分類される能力は [MAGIC_CATALOG.md](MAGIC_CATALOG.md) に分けます。','',
    ...commonRules(data),'## 戦闘スキル',''];
  for(const [id,spec] of battle)lines.push(...battleEntry(data,id,spec,'スキル',false),...skillCatalogLevelLines(data,id,spec,false));
  lines.push('## 探索スキル','');
  for(const [id,spec] of field)lines.push(...fieldEntry(data,id,spec,'スキル',false),...skillCatalogLevelLines(data,id,spec,true));
  return lines.join('\n').trimEnd()+'\n';
}

export function magicCatalog(data,{date}={}){
  const battle=Object.entries(data.skills??{}).filter(([id])=>abilityCategory(id,false)==='magic');
  const field=Object.entries(data.fieldAbilities??{}).filter(([id])=>abilityCategory(id,true)==='magic');
  const lines=['# 魔法一覧','',`更新日: ${date??'未記録'}。作品版${data.game.version}。戦闘魔法${battle.length}件、探索魔法${field.length}件。`,'',
    '魔法は独立したデータベースではなく、[data/skills.json](../data/skills.json) と [data/field-abilities.json](../data/field-abilities.json) の一部を表示分類したものです。分類元は [character-profile.js](../src/application/character-profile.js)。魔法以外は [SKILL_CATALOG.md](SKILL_CATALOG.md) に載せます。','',
    ...commonRules(data),'## 戦闘魔法',''];
  for(const [id,spec] of battle)lines.push(...battleEntry(data,id,spec,'魔法'));
  lines.push('## 探索魔法','');
  for(const [id,spec] of field)lines.push(...fieldEntry(data,id,spec,'魔法'));
  return lines.join('\n').trimEnd()+'\n';
}

export function itemCatalog(data,{date}={}){
  const groups=['consumable','equipment','material','key','dungeon_tool','__other__'];
  const entries=Object.entries(data.items??{});
  const lines=['# アイテム一覧','',`更新日: ${date??'未記録'}。作品版${data.game.version}。全${entries.length}件。`,'',
    '正本は [data/items.json](../data/items.json)。消耗品・装備品・素材・重要品・ダンジョン道具の現在定義を一覧化します。ショップの商品と価格は [data/shops.json](../data/shops.json)、所持・装備・使用規則は [ショップと旅支度](SHOP_AND_PREPARATIONS.md) を参照してください。戦闘で技能を呼ぶ道具は、その技能と同じダメージ／回復式を使います。','',
    ...commonRules(data)];
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
      lines.push(...itemCalculation(data,item));
      lines.push('');
    }
  }
  return lines.join('\n').trimEnd()+'\n';
}
