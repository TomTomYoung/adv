import {evaluate} from '../core/expression.js';
import {guardDamageRate} from '../core/battle-turns.js';
import {statusEffectAtLevel} from '../core/status-effects.js';

export const statLabels={hp:'HP',mp:'MP',str:'力',vit:'防御',agi:'速さ',int:'知力'};
export const elementLabels={physical:'物理',fire:'炎',ice:'氷',lightning:'雷',water:'水',light:'光',earth:'地',dark:'闇'};
export const buffEffectText=(data,id)=>{
  const b=data.buffs?.[id];if(!b)return `補正 ${id}`;
  const values=[];
  for(const [key,n] of Object.entries(b.stats??{}))values.push(`${statLabels[key]??key} ×${n}`);
  for(const [element,n] of Object.entries(b.resist??{}))values.push(`${elementLabels[element]??element}被ダメージ ×${n}`);
  if(b.physicalPower!==undefined)values.push(`次の行動の物理威力 ×${b.physicalPower}`);
  if(b.physicalTaken!==undefined)values.push(`次の物理被害1回 ×${b.physicalTaken}`);
  if(b.blocksMovement)values.push('自発移動と次のFrontline自動前進を阻止');
  if(b.classicAccuracyPenalty)values.push(`Classic命中率−${b.classicAccuracyPenalty*100}ポイント`);
  values.push(b.consume==='next_action'?'次の本人の行動機会に消費':`持続 ${b.turns}ターン`);
  return values.join(' / ');
};

export const damageExampleNote = 'ダメージは図鑑の基礎能力で防御10の相手に命中したときの目安です。耐性・防御姿勢・クリティカルなどで変わります。';

function statusText(data, effect) {
  const level = effect.level ?? 1;
  const status = statusEffectAtLevel(data, effect.status, level);
  const details = [];
  const turns = effect.duration?.turns ?? status.duration?.turns;
  if (turns) details.push(turns + 'ターン');
  if (status.turnDamage) details.push('巡の終わりにHP−' + status.turnDamage);
  if (status.turnMpDamage) details.push('巡の終わりにMP−' + status.turnMpDamage);
  if (status.stepDamage) details.push('移動1歩でHP−' + status.stepDamage);
  if (status.stepMpDamage) details.push('移動1歩でMP−' + status.stepMpDamage);
  if (status.accuracyRate) details.push('命中率×' + status.accuracyRate);
  if (status.description) details.push(status.description.trim());
  const chance = Math.round((effect.chance ?? 1) * 100);
  return '命中時' + chance + '%で' + status.name + 'Lv' + level + 'を付与' +
    (details.length ? '（' + details.join('、') + '）' : '');
}

function effectText(data, enemy, effect) {
  const amount = () => Math.floor(effect.formula
    ? evaluate(data.formulas[effect.formula], {source: enemy, target: {stats: {vit: 10}}})
    : effect.amount);
  switch (effect.type) {
    case 'damage': return elementLabels[effect.element] + 'ダメージ（目安' + amount() + '）';
    case 'heal': return 'HPを回復（基礎回復量' + amount() + '、最大HPまで）';
    case 'drain_mp': return '残りMPを最大' + amount() + '減らす';
    case 'status': return statusText(data, effect);
    case 'guard': return '次の自分の手番まで防御し、受けるダメージを' + guardDamageRate(data, effect.level) * 100 + '%にする';
    case 'buff': return data.buffs[effect.buff].name + 'を付与（' + buffEffectText(data, effect.buff) + '）';
    case 'stun': return '命中時' + (effect.chance ?? 1) * 100 + '%でスタンさせ、行動機会を' + (effect.count ?? 1) + '回失わせる';
    case 'cleanse': return '次の順に、かかっている状態を1つ解除（' + effect.statuses.map(id => data.statuses[id].name).join('・') + '）';
    default: throw Error('魔物図鑑で未対応の行動効果 ' + effect.type);
  }
}

// Scripted turns can choose a different skill after winding up or changing form.
const variations = {
  family_skeleton_20_twoheads: [['火の頭', 'family_skeleton_20_twoheads'], ['氷の頭', 'skeleton_frost']],
  family_slime_20_twins: [['打撃', 'family_slime_20_twins'], ['後列の分体による回復', 'slime_cure']],
  family_slime_25_strata: [['HPが2/3超', 'family_slime_25_strata'], ['HPが1/3超〜2/3', 'slime_clay'], ['HPが1/3以下', 'slime_wave']],
  family_slime_25_pot: [['赤い薬', 'family_slime_25_pot'], ['緑の薬', 'slime_cure']],
  family_slime_25_abyss: [['剣で最前列を攻撃', 'slime_relicslash'], ['盾', 'guard'], ['杖で1体を攻撃', 'slime_relicspell'], ['遺物を全て失った後', 'slime_press']]
};

export function monsterActionEffects(data, enemy, skillId) {
  const skill = data.skills[skillId], lines = [];
  if (skillId === enemy.classSkill || ['moth_whistle','slime_burst','mine_drill_ready'].includes(skillId))
    lines.push(skill.description);
  if (skillId === 'recover_stance') lines.push('突進後の息継ぎで、この手番は休む。');
  for (const [when, id] of variations[skillId] ?? [['', skillId]]) {
    const variant = data.skills[id];
    const effects = variant.effects.map(effect => effectText(data, enemy, effect));
    if (effects.length) lines.push((when ? when + '：' : '') + (variant.projectile ? '投射攻撃。' : '') + effects.join('。続いて') + '。');
    for (const effect of variant.selfEffects ?? []) lines.push('行動後、自身に' + effectText(data, enemy, effect) + '。');
  }
  return lines;
}
