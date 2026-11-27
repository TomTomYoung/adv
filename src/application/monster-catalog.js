export function conditionText(value) {
  if(value===undefined||value===null)return '条件なし';
  if(value.op==='lt'&&value.left?.ref==='self.guardTurns')return `連続防御が${value.right}手番未満`;
  if(value.op==='contains'&&value.left?.ref==='self.activeStatuses'&&value.right==='ablaze')return '自身が火だるまの間';
  if(value.op==='contains'&&value.left?.ref==='self.buffs')return `自身に補助 ${value.right} がある間`;
  if(value.op==='and')return value.args.map(conditionText).join('、かつ');
  if(value.op==='eq'&&value.left?.op==='mod'&&value.left.args?.[0]?.ref==='self.round'&&value.left.args[1]===2)return value.right===0?'偶数ラウンド':'奇数ラウンド';
  if(value.left?.ref==='self.round'&&value.op==='eq')return `第${value.right}ラウンド`;
  if(value.left?.ref==='self.hp_ratio'&&typeof value.right==='number'&&['lt','eq'].includes(value.op))return `自身のHPが${value.right*100}％${value.op==='lt'?'未満':'と等しい'}`;
  return `条件式 ${JSON.stringify(value)}`;
}

export const torchTargetLabels = {
  torch_play: '敵味方の生存者全員からランダムに1体（使用者を含む）',
  moth_whistle: '自身の松明に灯蛾を2〜3体呼ぶ（各大将につき1戦1回）',
  torch_festival: '集合笛の後、生き残った灯蛾すべて'
};

export function targetText(rule,skill) {
  if (Object.hasOwn(torchTargetLabels, rule.skill)) return torchTargetLabels[rule.skill];
  if(skill.target==='all_enemies')return '探索隊の生存者全員';
  if(skill.target==='all_allies')return '敵側の生存者全員';
  if(rule.target==='self'||skill.target==='self')return '自身';
  if(rule.target==='unbuffed')return '敵側の生存者のうち、技能が付ける補助を持たない1体（遭遇順）';
  if(rule.target==='afflicted')return '敵側の生存者のうち、解除可能な状態異常を持つ1体（遭遇順）';
  if(skill.target==='ally')return '敵側でHP割合が最も低い1体';
  return rule.target==='weakest'?'探索隊で現在HPの実数が最も低い1人':'探索隊の生存者からランダムに1人';
}

export function monsterGroups(enemies) {
  const special=['kuragari','salt_eater','valley_hexer','water_darter','water_predator','water_giant'];
  return [
    ['固有環境の敵',enemies.filter(e=>special.includes(e.id))],
    ['個別デザインの通常魔物',enemies.filter(e=>e.source)],
    ['依頼に追加した敵',enemies.filter(e=>!e.source&&!special.includes(e.id)&&!/^guard_\d+(?:_elite)?$/.test(e.id))],
    ['地域の迷宮獣と守護者',enemies.filter(e=>/^guard_\d+(?:_elite)?$/.test(e.id))]
  ];
}
