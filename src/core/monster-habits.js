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
    description: '2手番続けて防御し、各巡1回、仲間を狙った単体の物理攻撃に転がり込んで引き受ける。次の手番は甲羅を開いて通常攻撃する。'
  },
  burn_out: {
    name: '燃え尽き',
    description: '火属性の攻撃が命中すると、その個体だけが燃え尽きて即死する。',
    fatalHitElement: 'fire'
  }
};

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
