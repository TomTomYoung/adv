import {unitKey} from './buffs.js';
import {applyStatus,cleanseCandidates} from './status-effects.js';

export function medicineChoices(data, level) {
  return Object.entries(data.jobProfile.personalSkills.toma ?? {})
    .filter(([id, required]) => required <= level && data.skills[id]?.effects?.at(-1)?.type === 'medicine')
    .sort((a, b) => a[1] - b[1])
    .map(([id]) => id);
}

export function chooseHerbalistMedicine(engine, source, allies) {
  const {data, state} = engine;
  const level = data.enemies[source.id]?.level ?? source.levelBand ?? source.level ?? 1;
  const options = medicineChoices(data, level).reverse();
  const patients = [...allies].sort((a, b) => a.hp / a.stats.hp - b.hp / b.stats.hp);
  if (!patients.length) return null;
  const primary = id => data.skills[id].effects[0];
  const heal = options.find(id => primary(id).healRate);
  const weakest = patients[0];
  if (heal && weakest.hp <= weakest.stats.hp * .35) return {id:heal, target:weakest};
  for (const target of patients) {
    const id = options.find(id => primary(id).type === 'cleanse' && cleanseCandidates(target, primary(id)).length);
    if (id) return {id, target};
  }
  if (heal && weakest.hp < weakest.stats.hp) return {id:heal, target:weakest};
  const drained = patients.find(target => target.stats.mp > 0 && target.mp <= target.stats.mp / 2);
  const restore = options.find(id => primary(id).type === 'restore_mp');
  if (drained && restore) return {id:restore, target:drained};
  if (state.battle.round < 2) return null;
  for (const id of options) {
    const effect = primary(id);
    const target = patients.find(unit => {
      if (effect.type === 'buff') return !state.battle.buffs.some(b => b.target === unitKey(unit) && b.id === effect.buff);
      return effect.type === 'status' && !unit.statuses.includes(effect.status) && !unit.statusImmune?.includes(effect.status);
    });
    if (target) return {id, target};
  }
  return null;
}

export function giveMedicine(engine, target, maxHp, effect, skill) {
  if (target.hp <= 0) return;
  const {data, state} = engine;
  const name = target.name ?? data.actors[target.id].name;
  if (effect.healRate) {
    const recovered = Math.min(maxHp - target.hp, Math.ceil(maxHp * effect.healRate));
    target.hp += recovered;
    state.battle.log.push(name + 'は' + skill.name + 'でHPが' + recovered + '回復した。');
  }
  if (effect.permanentVitLoss) {
    const previous = target.medicineVitLoss ?? 0;
    target.medicineVitLoss = Math.min(5, previous + effect.permanentVitLoss);
    state.battle.log.push(name + 'の防御の永久低下は累計' + target.medicineVitLoss + 'になった。');
  } else {
    applyStatus(data, state, target, effect.status);
    if (target.statuses.includes(effect.status)) state.battle.log.push(name + 'に副作用「' + data.statuses[effect.status].name + '」。');
  }
}
