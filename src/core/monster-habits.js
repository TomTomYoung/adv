// Species definitions own the assignments, including the floor-scaled copies.
// Consult them at hit time so battles restored from older saves use the same rules.
export const MONSTER_HABITS = {
  bone_revival: {
    name: '骨の再生',
    description: 'HPが0になると仮死になり、3巡後に最大HPの半分で復活する。仮死中は鎮魂でとどめを刺せる。'
  },
  ignition_bomb: {
    name: '引火爆弾',
    description: '火属性の攻撃が命中すると即死する。散り際に爆ぜ、生存中の味方からランダムに1人を選び、灯火の術に相当する火属性ダメージを与える。',
    fatalHitElement: 'fire',
    burstSkill: 'fire'
  },
  rolling_shell: {
    name: '転がり甲羅',
    description: '防御中、仲間を狙った単体の物理攻撃に転がり込んで引き受ける。各巡1回。'
  },
  oil_coat: {
    name: '油膜',
    description: '直接物理攻撃で触れた探索隊員と、自身の通常攻撃が命中してダメージを与えた相手に油が付く。'
  },
  flammable_body: {
    name: '易燃体',
    description: '火属性ダメージを受けて生き残ると火だるまになる。火だるまのまま巡が終わると燃え尽きる。'
  },
  sticky_hide: {
    name: '粘着肌',
    description: '最初に直接物理攻撃を当てた探索隊員の武器に付着し、その隊員の手番を遅らせる。別の敵を通常攻撃すると外れ、同じダメージを受ける。',
    usesFormation: true
  },
  glass_body: {
    name: 'ガラス瓶',
    description: '瓶が割れるまで打撃以外の被害を半減する。打撃で割れると相手の列へ中身が飛び散り、以後の被害は1.5倍になる。',
    usesFormation: true
  },
  wax_wick: {
    name: '溶ける蝋',
    description: '火属性ダメージで蝋が溶け、打撃の被害が2倍になる。',
    usesFormation: true
  },
  waking_chime: {
    name: '目覚まし鈴',
    description: '打撃を受けると、生存中の魔物全員が眠りから覚める。',
    usesFormation: true
  },
  elastic_body: {
    name: '弾む体',
    description: '打撃で一列下がる。移動先に仲間がいると衝突し、双方がダメージを受ける。',
    usesFormation: true
  },
  shed_skin: {
    name: '脱皮逃れ',
    description: '探索隊からの最初の一撃を外皮で受け流し、一列下がる。',
    usesFormation: true
  },
  split_core: {
    name: '二核分裂',
    description: '被弾後に残りHPが半分以下になると、一戦に一度だけ残りHPを二分し、前後に分裂する。',
    usesFormation: true
  },
  scatter_beads: {
    name: 'こぼれ玉',
    description: 'ダメージを受けると自分の列に粒を落とす。次にその列へ移動した者はスタンする。',
    usesFormation: true
  },
  retreat_pursuit: {
    name: '退路狩り',
    description: '探索隊員が後列へ退くと、その隊員を直ちに通常攻撃する。',
    usesFormation: true
  },
  night_vision: {
    name: '夜目',
    description: '戦場の灯りが消えても、暗闇による命中低下を受けない。',
    usesFormation: true
  },
  red_horn: {
    name: '赤角',
    description: '被弾で怒りが一段階上がり、攻撃が強くなる。最大三段階。',
    usesFormation: true
  },
  fire_rage: {
    name: '炎怒り',
    description: '火属性攻撃でダメージを受けると、怒りが一気に三段階まで上がる。',
    usesFormation: true
  },
  axe_bequest: {
    name: '大斧継承',
    description: '開戦時にオークの仲間一体を後継者に指名する。自身が倒れると、その仲間の攻撃が強くなる。',
    usesFormation: true
  },
  shield_intercept: {
    name: '盾の割り込み',
    description: '防御中、自分と同じ列か後ろにいる仲間を狙った単体攻撃を引き受ける。',
    usesFormation: true
  },
  crown_intercept: {
    name: '王冠守護',
    description: '防御中、骸骨の王冠を持つ仲間を狙った単体攻撃を引き受ける。',
    usesFormation: true
  },
  bone_crown: {
    name: '王冠渡り',
    description: '開戦時に王冠をかぶる。仮死になると一戦に一度、別の仮死の骸骨を復活させて王冠を渡す。',
    usesFormation: true
  },
  shield_arm: {
    name: 'もろい盾腕',
    description: '防御を崩されると盾腕が外れる。骨拾いに直してもらうまで盾腕で防御できない。',
    usesFormation: true
  },
  shield_trip: {
    name: '錆盾倒し',
    description: '防御を崩されると、後ろの列にいる仲間一体もスタンする。',
    usesFormation: true
  },
  unsteady_foot: {
    name: '片足立ち',
    description: '溜め動作中にダメージを受けると構えが崩れ、自分が一手スタンする。',
    usesFormation: true
  },
  windup_counter: {
    name: '詠唱反撃',
    description: '溜め動作中に探索隊員からダメージを受けると、その相手に通常攻撃で反撃する。',
    usesFormation: true
  },
  watch_counter: {
    name: '見張り反撃',
    description: '見張りの構え中、探索隊員が仲間を傷つけると、構えを解いてその隊員に一度反撃する。',
    usesFormation: true
  },
  lost_rhythm: {
    name: '乱れ拍子',
    description: '肋骨で演奏している途中にダメージを受けると、それまでの音数を失う。',
    usesFormation: true
  },
  mirror_skin: {
    name: '術返し',
    description: '鏡面を張っている間、探索隊の単体攻撃魔法を一度反射する。物理攻撃を受けても鏡面は崩れる。',
    usesFormation: true
  },
  parasol_cover: {
    name: '傘受け',
    description: '傘を差しかけた後ろの仲間への飛び道具を遮る。傘を開くと自身が受ける近接物理ダメージは1.75倍になる。',
    usesFormation: true
  },
  thread_tether: {
    name: '糸づたい',
    description: '糸で結んだ仲間が前の列へ動くと、糸が外れ、自分も同じだけ前へ引かれる。',
    usesFormation: true
  },
  loose_bandage: {
    name: 'ほどけ包帯',
    description: '仲間に巻きついている間は打撃の被害が2倍になり、打撃で包帯がほどける。',
    usesFormation: true
  },
  air_leak: {
    name: '空気漏れ',
    description: '膨張中に突き攻撃を受けると空気を失い、後ろにいる最寄りの仲間に衝撃が当たる。',
    usesFormation: true
  },
  fragile_cargo: {
    name: '割れ壺',
    description: '回復壺を運んでいる途中で倒れると、壺が割れて同じ列の敵味方が回復する。',
    usesFormation: true
  },
  crystal_core: {
    name: '硬い晶核',
    description: '通常の被害を半減する。詠唱で核が露出すると軽減を失い、打撃の被害が2.5倍になって詠唱が中断する。',
    usesFormation: true
  },
  spilled_brew: {
    name: '煮こぼれ',
    description: '赤または緑の薬を煮ている途中に打撃を受けると、釜が返ってその薬を自分で浴びる。',
    usesFormation: true
  },
  loose_relic: {
    name: '遺物こぼし',
    description: '遺物が浮上しているときに重い一撃を受けると、その遺物を失う。',
    usesFormation: true
  },
  bare_iron: {
    name: '砂鉄の鎧',
    description: '砂鉄を放って丸裸の間、受けるダメージが1.5倍になる。',
    usesFormation: true
  },
  exposed_puddle: {
    name: '露出した核',
    description: '倒れ込んだ後、水たまりの姿でいる間は受けるダメージが2倍になる。',
    usesFormation: true
  },
  burn_out: {
    name: '燃え尽き',
    description: '火属性の攻撃が命中すると、その個体だけが燃え尽きて即死する。',
    fatalHitElement: 'fire'
  }
};

export function hasMonsterHabit(data, unit, id) {
  return Boolean(unit?.instance && data.enemies[unit.id]?.habits?.includes(id));
}

export function usesMonsterFormation(definition) {
  return Boolean(definition?.family || definition?.habits?.some(id=>MONSTER_HABITS[id]?.usesFormation));
}

export function validHabits(ids) {
  return Array.isArray(ids) && new Set(ids).size === ids.length &&
    ids.every(id => typeof id === 'string' && Object.hasOwn(MONSTER_HABITS, id));
}

export function fatalHitHabit(data, target, element) {
  if (!element || !target.instance || target.hp <= 0) return;
  const habits = data.enemies[target.id]?.habits;
  if (!habits?.length) return;
  const matching = habits.map(id => MONSTER_HABITS[id]).filter(habit => habit.fatalHitElement === element);
  // One death can trigger the attached burst even if the plain fatal habit was assigned first.
  return matching.find(habit => habit.burstSkill) ?? matching[0];
}
