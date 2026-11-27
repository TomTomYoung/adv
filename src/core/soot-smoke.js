import {battleAlive} from './frontline-lifecycle.js';
import {hasMonsterHabit, MONSTER_HABITS} from './monster-habits.js';
import {applyStatus, statusLevel} from './status-effects.js';

function blind(engine, rat, target) {
  if (applyStatus(engine.data, engine.state, target, 'blindness')) {
    const name = target.name ?? engine.data.actors[target.id].name;
    engine.state.battle.log.push(rat.name + 'の煤煙で' + name + 'がくらやみLv' + statusLevel(target, 'blindness') + 'になった。');
  }
}

export function sootOnHit(engine, attacker, target) {
  if (attacker === target || !battleAlive(engine.state, target)) return;
  if (hasMonsterHabit(engine.data, attacker, 'soot_smoke') && engine.random() < MONSTER_HABITS.soot_smoke.hitChance)
    blind(engine, attacker, target);
  if (hasMonsterHabit(engine.data, target, 'soot_smoke') && battleAlive(engine.state, attacker) && engine.random() < MONSTER_HABITS.soot_smoke.hitChance)
    blind(engine, target, attacker);
}

export function sootOnDeath(engine, rat, attacker) {
  if (rat.hp !== 0 || rat.reviveRound || !hasMonsterHabit(engine.data, rat, 'soot_smoke')) return;
  const s = engine.state;
  if (attacker && battleAlive(s, attacker)) return blind(engine, rat, attacker);
  const living = s.members.map(id => s.actors[id]).filter(unit => battleAlive(s, unit));
  if (living.length) blind(engine, rat, living[Math.floor(engine.random() * living.length)]);
}
