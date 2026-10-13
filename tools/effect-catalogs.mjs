import {BATTLE_STATUS_DEFINITIONS,guardDamageRate} from '../src/core/battle-turns.js';

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
const percent=n=>`${Math.round(n*1000)/10}%`;
const statusLevelEffect=(def,level)=>({...def,...(def.levels?.[level]??{})});
const statusLevelText=(id,def,level)=>{
  const effect=statusLevelEffect(def,level),parts=[];
  if(effect.stepDamage)parts.push(`成功歩ごとHP−${effect.stepDamage}`);
  if(effect.turnDamage)parts.push(`戦闘ターン終了時HP−${effect.turnDamage}`);
  if(effect.stepHpRate)parts.push(`成功歩ごと最大HPの${percent(effect.stepHpRate)}減少`);
  if(effect.turnHpRate)parts.push(`戦闘ターン終了時最大HPの${percent(effect.turnHpRate)}減少`);
  if(effect.stepMpDamage)parts.push(`成功歩ごとMP−${effect.stepMpDamage}`);
  if(effect.turnMpDamage)parts.push(`戦闘ターン終了時MP−${effect.turnMpDamage}`);
  if(effect.stepMpRate)parts.push(`成功歩ごと最大MPの${percent(effect.stepMpRate)}減少`);
  if(effect.turnMpRate)parts.push(`戦闘ターン終了時最大MPの${percent(effect.turnMpRate)}減少`);
  for(const [key,n] of Object.entries(effect.stats??{}))parts.push(`${statLabels[key]??key}×${n}`);
  if(effect.actionFailureChance!==undefined)parts.push(`行動時${percent(effect.actionFailureChance)}で行動不能（行動枠のみ消費）`);
  if(effect.accuracyRate!==undefined)parts.push(`攻撃・攻撃的な効果の命中率×${effect.accuracyRate}`);
  if(effect.confusionChance!==undefined)parts.push(`行動時${percent(effect.confusionChance)}で使用可能な行動・対象をランダム選択`);
  if(effect.actionDisabled)parts.push('戦闘中は行動不能（行動枠のみ消費）');
  if(effect.damageWakeChance!==undefined)parts.push(`攻撃によるHPダメージで${percent(effect.damageWakeChance)}の確率で解除`);
  if(effect.sureHit)parts.push('命中判定のある攻撃・効果が必中（くらやみより優先）');
  if(effect.forcedAttack)parts.push('操作不能となり、生存する敵へ通常攻撃');
  if(effect.misfireChance!==undefined)parts.push(`魔法・スキル使用時${percent(effect.misfireChance)}で対象を変更（通常攻撃・防御・アイテムは対象外、追加消費・反動なし）`);
  if(effect.criticalChance!==undefined)parts.push(`クリティカル率+${Math.round(effect.criticalChance*1000)/10}ポイント`);
  if(effect.criticalTakenChance!==undefined)parts.push(`被クリティカル率+${Math.round(effect.criticalTakenChance*1000)/10}ポイント`);
  if(effect.guaranteedCritical)parts.push('自分の命中したHP攻撃が確定クリティカル');
  if(effect.guaranteedCriticalTaken)parts.push('自分に命中したHP攻撃が確定クリティカル');
  if(effect.battleOnly)parts.push(`持続${durationText(effect.duration)}`,'戦闘終了時に解除');
  for(const kind of effect.blockedActions??[])parts.push(`${{magic:'魔法',skills:'スキル',items:'アイテム'}[kind]}使用不可`);
  if(effect.recovery)parts.push(`ラウンド終了時に回復抽選（初回${percent(effect.recovery.initialChance)}、以後毎ラウンド${Math.round(effect.recovery.increment*1000)/10}ポイント上昇、上限100%）`,'戦闘終了後も状態と回復経過を持ち越す');
  if(id==='wet'){
    parts.push(`雷・氷の被ダメージ×${effect.wetDamageScale??1}`);
    parts.push(`雷・氷魔法使用時、自身の最大HPの${percent(effect.wetBacklashRate??0)}を失う`);
    if(effect.wetSuppressElements?.length)parts.push('雷・氷魔法は使用できるが発動しない');
    parts.push('水のない場所で炎を使うと乾く');
  }
  return parts.join(' / ')||'個別効果なし';
};
const statusSkillSources=(data,id)=>Object.entries(data.skills??{}).filter(([,skill])=>[...(skill.effects??[]),...(skill.selfEffects??[])].some(e=>e.type==='status'&&e.status===id)).map(([skillId,skill])=>`${skill.name} (${skillId})`);
export function statusCatalog(data,{date}={}){
  const entries=Object.entries(data.statuses??{}),lines=['# 状態異常一覧','',`更新日: ${date??'未記録'}。作品版${data.game.version}。共通管理の状態${entries.length}件（うち戦闘限定${entries.filter(([,e])=>e.battleOnly).length}件）＋防御・スタン2件。`,'',
    '状態異常Lvは全種類でLv1〜Lv3固定、Lv3が上限です。Lv未指定はLv1。全種類のLv1〜Lv3を設定済みです。ねむり・必中・鈍重・狂暴化・暴発・クリティカル関連4種の数値と持続・解除条件は2026-10-13時点の暫定値です。クリティカルは通常0%、発生時ダメージ2倍で、必中とは独立します。','',
    '## 共通管理の状態',''];
  for(const [id,def] of entries){
    const sources=[...statusSkillSources(data,id),...(trapSources[id]??[]).map(v=>`標準トラップ：${v}`)];
    lines.push(`### ${def.name} (${id})`,'',`分類：${categoryLabels[def.category]??'身体・環境状態'}${def.beneficial?'・有利な状態':''}${def.battleOnly?'・戦闘限定':''}。`,`持続：${def.battleOnly?'各Lvの持続、または戦闘終了まで':durationText(def.duration)}。`,`付与元：${sources.join(' / ')||'環境・スクリプト'}。`,'');
    for(let level=1;level<=3;level++)lines.push(`#### Lv${level}`,'',def.levels?.[level]||level===1?`効果：${statusLevelText(id,def,level)}。`:'効果：未設定。','');
  }
  const guard=BATTLE_STATUS_DEFINITIONS.guarded,stun=BATTLE_STATUS_DEFINITIONS.stun;
  lines.push('## 戦闘限定状態','',`### ${guard.name} (${guard.id})`,'','分類：有利な戦闘限定状態。防御技能・盾の壁で付与。','');
  for(let level=1;level<=3;level++)lines.push(`#### Lv${level}`,'',`効果：1ターン、防御状態。受けるダメージ×${guardDamageRate(data,level)}。`,'');
  lines.push(
    `### ${stun.name} (${stun.id})`,'','分類：不利な戦闘限定状態。戦闘終了時に消える。','','#### Lv1','','効果：次の行動機会を1回失う。','','#### Lv2','','効果：次の行動機会を2回失う。','','#### Lv3','','効果：次の行動機会を3回失う。','');
  return lines.join('\n').trimEnd()+'\n';
}
