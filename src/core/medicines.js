import {applyStatus} from './status-effects.js';

export function medicineChoices(data, level) {
  return Object.entries(data.jobProfile.personalSkills.toma ?? {})
    .filter(([id, required]) => required <= level && data.skills[id]?.effects[0]?.type === 'medicine')
    .sort((a, b) => a[1] - b[1])
    .map(([id]) => id);
}

export function giveMedicine(engine, target, maxHp, effect, skill) {
  if (target.hp <= 0) return;
  const {data, state} = engine;
  const name = target.name ?? data.actors[target.id].name;
  const recovered = Math.min(maxHp - target.hp, Math.ceil(maxHp * effect.healRate));
  target.hp += recovered;
  state.battle.log.push(name + 'は' + skill.name + 'でHPが' + recovered + '回復した。');
  if (effect.permanentVitLoss) {
    const previous = target.medicineVitLoss ?? 0;
    target.medicineVitLoss = Math.min(5, previous + effect.permanentVitLoss);
    state.battle.log.push(name + 'の防御の永久低下は累計' + target.medicineVitLoss + 'になった。');
  } else {
    applyStatus(data, state, target, effect.status);
    if (target.statuses.includes(effect.status)) state.battle.log.push(name + 'に副作用「' + data.statuses[effect.status].name + '」。');
  }
}
