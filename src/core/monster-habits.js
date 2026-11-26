// Species definitions own the assignments, including the floor-scaled copies.
// Consult them at hit time so battles restored from older saves use the same rules.
export const MONSTER_HABITS = {
  ignition_bomb: {
    name: '引火爆弾',
    description: '火属性の攻撃が命中すると即死する。散り際に爆ぜ、生存中の味方からランダムに1人を選び、灯火の術に相当する火属性ダメージを与える。',
    fatalHitElement: 'fire',
    burstSkill: 'fire'
  }
};

export function validHabits(ids) {
  return Array.isArray(ids) && new Set(ids).size === ids.length &&
    ids.every(id => typeof id === 'string' && Object.hasOwn(MONSTER_HABITS, id));
}

export function fatalHitHabit(data, target, element) {
  if (!target.instance || target.hp <= 0) return;
  return data.enemies[target.id]?.habits?.map(id => MONSTER_HABITS[id])
    .find(habit => habit.fatalHitElement === element);
}
