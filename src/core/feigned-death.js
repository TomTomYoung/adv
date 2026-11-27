import {revivePosition} from './battle-grid.js';
import {unitKey} from './buffs.js';
import {BATTLE_STATUS_DEFINITIONS,clearGuard} from './battle-turns.js';

export const feigning = unit => unit?.hp === 0 && Number.isInteger(unit.reviveRound);
export const finishOnly = skill => skill.effects.some(e => e.type === 'lay_to_rest');
export const feignLabel = (battle, unit) => '仮死・復活まで' + Math.max(0,unit.reviveRound-battle.round) + 'ターン';

export function markFeignedDeaths(engine) {
  const b=engine.state.battle;
  if(!b)return;
  for (const u of b.enemies) {
    if (u.hp!==0 || u.sealed || feigning(u) || b.recordedKills?.includes(u.instance) ||
        b.frontline?.removed?.[unitKey(u)] || !engine.data.enemies[u.id]?.habits?.includes('bone_revival')) continue;
    u.reviveRound=b.round+BATTLE_STATUS_DEFINITIONS.feigned_death.rounds;
    if(u.tactics)for(const key of ['holding','ready','mark','hook','notes'])delete u.tactics[key];
    clearGuard(b,u);
    if(b.stuns)delete b.stuns[unitKey(u)];
    b.log.push(u.name+'は骨が崩れ、仮死になった。');
  }
}

export function reviveBones(engine,unit) {
  if (!feigning(unit)) return false;
  const b=engine.state.battle;
  if(b.grid){
    const cell=revivePosition(engine.state,unit);
    if(!cell)return false;
    b.grid.positions[unitKey(unit)]=cell;
  }
  delete unit.reviveRound;
  unit.hp=Math.max(1,Math.ceil(unit.stats.hp/2));
  b.log.push(unit.name+'は骨を組み直し、HP'+unit.hp+'で復活した。');
  return true;
}

export function sealBones(engine,unit) {
  if(!feigning(unit))return false;
  delete unit.reviveRound;
  unit.sealed=true;
  engine.state.battle.log.push(unit.name+'の骨は静まり、復活を封じられた。');
  return true;
}
