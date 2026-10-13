import {BATTLE_STATUS_DEFINITIONS} from '../src/core/battle-turns.js';

const statLabels={str:'力',vit:'防御',agi:'速さ',int:'知力'};
const elementLabels={physical:'物理',fire:'炎',ice:'氷',lightning:'雷',water:'水',light:'光',earth:'地',dark:'闇'};
const categoryLabels={parameter:'パラメータ異常',magic:'魔術系',physical:'身体異常'};
const trapSources={weakened:['針','矢'],enfeebled:['ガス'],arcane_malaise:['魔法陣']};

const buffKind=def=>Object.values(def.stats??{}).some(n=>n<1)||Object.values(def.resist??{}).some(n=>n>1)?'debuff':'buff';
const buffEffect=def=>{
  const parts=[];
  for(const [key,n] of Object.entries(def.stats??{}))parts.push(`${statLabels[key]??key}×${n}`);
  for(const [element,n] of Object.entries(def.resist??{}))parts.push(`${elementLabels[element]??element}被ダメージ×${n}`);
  return parts.join(' / ')||'数値補正なし';
};
const buffSources=(data,id)=>{
  const out=[];
  for(const [skillId,skill] of Object.entries(data.skills??{})){
    const effects=[...(skill.effects??[]),...(skill.selfEffects??[])];
    if(effects.some(e=>e.type==='buff'&&e.buff===id))out.push(`${skill.name} (${skillId})`);
  }
  return out;
};
function modifierCatalog(data,kind,{date}={}){
  const entries=Object.entries(data.buffs??{}).filter(([,def])=>buffKind(def)===kind);
  const title=kind==='buff'?'バフ一覧':'デバフ一覧',lines=[`# ${title}`,'',`更新日: ${date??'未記録'}。作品版${data.game.version}。全${entries.length}件。`,'',
    '正本は [data/buffs.json](../data/buffs.json)。戦闘中だけ存在する一時補正で、状態異常とは別系統です。同じ能力について強化は最も強い倍率1つ、弱体は最も強い倍率1つを採用します。',''];
  for(const [id,def] of entries){
    lines.push(`## ${def.name} (${id})`,'',`分類：${kind==='buff'?'バフ':'デバフ'}。`,`効果：${buffEffect(def)}。`,`持続：${def.turns}敵巡。`,`付与元：${buffSources(data,id).join(' / ')||'直接定義'}。`,'');
  }
  return lines.join('\n').trimEnd()+'\n';
}
export const buffCatalog=(data,options)=>modifierCatalog(data,'buff',options);
export const debuffCatalog=(data,options)=>modifierCatalog(data,'debuff',options);

const durationText=d=>d?Object.entries(d).map(([k,n])=>`${k==='steps'?'歩数':'ターン'}${n}`).join(' または '):'解除まで';
const statusBaseEffect=def=>{
  const parts=[];
  if(def.stepDamage)parts.push(`成功歩ごとHP−${def.stepDamage}`);
  if(def.turnDamage)parts.push(`戦闘ターン終了時HP−${def.turnDamage}`);
  for(const [key,n] of Object.entries(def.stats??{}))parts.push(`${statLabels[key]??key}×${n}`);
  if(def.description)parts.push(def.description);
  return [...new Set(parts)].join(' / ')||'個別効果なし';
};
const statusSkillSources=(data,id)=>Object.entries(data.skills??{}).filter(([,skill])=>[...(skill.effects??[]),...(skill.selfEffects??[])].some(e=>e.type==='status'&&e.status===id)).map(([skillId,skill])=>`${skill.name} (${skillId})`);
export function statusCatalog(data,{date}={}){
  const entries=Object.entries(data.statuses??{}),lines=['# 状態異常一覧','',`更新日: ${date??'未記録'}。作品版${data.game.version}。通常状態異常${entries.length}件＋戦闘限定状態2件。`,'',
    '状態異常Lvは全種類でLv1〜Lv3固定、Lv3が上限です。Lv未指定はLv1。現行の通常状態異常はLv1効果のみ確定しており、Lv2・Lv3は個別決定まで未設定です。戦闘限定の防御とスタンもこのカタログに含めます。','',
    '## 通常状態異常',''];
  for(const [id,def] of entries){
    const sources=[...statusSkillSources(data,id),...(trapSources[id]??[]).map(v=>`標準トラップ：${v}`)];
    lines.push(`### ${def.name} (${id})`,'',`分類：${categoryLabels[def.category]??'身体・環境状態'}。`,`持続：${durationText(def.duration)}。`,`付与元：${sources.join(' / ')||'環境・スクリプト'}。`,'',
      '#### Lv1','',`効果：${statusBaseEffect(def)}。`,'','#### Lv2','','効果：未設定。','','#### Lv3','','効果：未設定。','');
  }
  const guard=BATTLE_STATUS_DEFINITIONS.guarded,stun=BATTLE_STATUS_DEFINITIONS.stun;
  lines.push('## 戦闘限定状態','',
    `### ${guard.name} (${guard.id})`,'','分類：有利な戦闘限定状態。防御技能・盾の壁で付与。','','#### Lv1','',`効果：1ターン、防御状態。受けるダメージ×${data.system.guardRate}。`,'','#### Lv2','','効果：未設定。','','#### Lv3','','効果：未設定。','',
    `### ${stun.name} (${stun.id})`,'','分類：不利な戦闘限定状態。戦闘終了時に消える。','','#### Lv1','','効果：次の行動機会を1回失う。','','#### Lv2','','効果：次の行動機会を2回失う。','','#### Lv3','','効果：次の行動機会を3回失う。','');
  return lines.join('\n').trimEnd()+'\n';
}
