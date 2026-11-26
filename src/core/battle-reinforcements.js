import {syncFamilyBattle} from './monster-family-field.js';
import {isRecord} from './expression.js';
import {scaledEnemy} from './enemy.js';
import {unitKey} from './buffs.js';
import {battleAlive,frontlinePresent,traceFrontline} from './frontline-lifecycle.js';
import {ENEMY_CELLS,validCell} from './battle-formation.js';

const integer=(n,a,b)=>Number.isInteger(n)&&n>=a&&n<=b;
const fields=['id','enemy','round','afterDefeat','whileAlive','position'];
// A finite, ordered schedule. Instances are appended, never recycled. A blocked
// join waits for the next round; it consumes neither randomness nor its slot.
export function reinforcementDefinitionErrors(data){
 const errors=[];
 for(const [id,e] of Object.entries(data.encounters??{})){
  if(e.reinforcements===undefined)continue;
  const rows=e.reinforcements,initial=e.enemies??[],validInitial=v=>typeof v==='string'&&/^enemy_(0|[1-9]\d*)$/.test(v)&&initial[Number(v.slice(6))]!==undefined;
  if(!Array.isArray(rows)||!rows.length||initial.length>5||initial.length+rows.length>15||new Set(rows.map(r=>r?.id)).size!==rows.length||rows.some(r=>!isRecord(r)||Object.keys(r).some(k=>!fields.includes(k))||typeof r.id!=='string'||!/^[a-z][a-z0-9_]*$/.test(r.id)||!Object.hasOwn(data.enemies,r.enemy)||!integer(r.round,2,1000)||r.afterDefeat!==undefined&&!validInitial(r.afterDefeat)||r.whileAlive!==undefined&&!validInitial(r.whileAlive)||r.afterDefeat!==undefined&&r.afterDefeat===r.whileAlive||r.position!==undefined&&!validCell(r.position)))errors.push(`${id}: 増援の定義不正`);
 }
 return errors;
}
export const EMBER_MOTH = 'kagaribi_ember_moth';
export function reinforcementRoster(encounter, records, round = 1e6, enemies = {}) {
  if (!encounter) return null;
  const roster = [...encounter.enemies], schedule = encounter.reinforcements;
  if (records === undefined) return schedule ? null : roster;
  if (!Array.isArray(records) || (!schedule && !records.length) || roster.length + records.length > 15) return null;
  let previousRound = 1, scheduled = 0;
  const callers = new Set();
  for (let i = 0; i < records.length; i++) {
    const row = records[i];
    if (!isRecord(row) || !integer(row.round, previousRound, round)) return null;
    previousRound = row.round;
    if (row.caller !== undefined) {
      if (typeof row.caller !== 'string' || !/^enemy_(0|[1-9]\d*)$/.test(row.caller)) return null;
      const caller = roster[Number(row.caller.slice(6))];
      if (!enemies[caller]?.ai.some(r => r.skill === 'moth_whistle') ||
          callers.has(row.caller) || !enemies[EMBER_MOTH]) return null;
      callers.add(row.caller);
      let count = 0;
      while (i + count < records.length && records[i + count]?.caller === row.caller) {
        const join = records[i + count];
        if (join.round !== row.round || join.eventId !== row.eventId ||
            Object.keys(join).some(k => !['caller', 'round', 'eventId'].includes(k)) ||
            (join.eventId !== undefined && !integer(join.eventId, 1, 1e9))) return null;
        roster.push(EMBER_MOTH);
        count++;
      }
      if (count < 2 || count > 3) return null;
      i += count - 1;
    } else {
      const def = schedule?.[scheduled++];
      if (!def || Object.keys(row).length !== 2 || row.id !== def.id || row.round < def.round) return null;
      roster.push(def.enemy);
    }
  }
  return roster;
}

function freePositions(s, preferred) {
  const b = s.battle, cells = preferred ? [preferred, ...ENEMY_CELLS.filter(p => p.x !== preferred.x || p.y !== preferred.y)] : ENEMY_CELLS;
  if (b.mode === 'grid') return cells.filter(p => !b.enemies.some(u => battleAlive(s,u) && b.grid.positions[unitKey(u)].x === p.x && b.grid.positions[unitKey(u)].y === p.y));
  if (b.mode === 'frontline') return cells.map(p => ({lane:p.x, depth:2-p.y})).filter(p =>
    !b.enemies.some(u => frontlinePresent(s,u) && b.frontline.positions[unitKey(u)].lane === p.lane && b.frontline.positions[unitKey(u)].depth === p.depth) &&
    !b.frontline.objects.some(o => o.side === 'enemies' && o.lane === p.lane && o.depth === p.depth));
  return cells;
}
function appendReinforcement(engine, species, position, record) {
  const b = engine.state.battle;
  const unit = scaledEnemy(engine.data.enemies[species], b.enemies.length, b.enemyScale ?? 1);
  b.enemies.push(unit);
  if (b.mode === 'grid') b.grid.positions[unitKey(unit)] = {...position};
  if (b.mode === 'frontline') b.frontline.positions[unitKey(unit)] = {...position};
  (b.reinforcements ??= []).push({...record, round:b.round});
  return unit;
}
export const hasWhistled = (battle, caller) => battle.reinforcements?.some(r => r.caller === caller.instance) ?? false;
export function mothSummonPositions(engine, caller) {
  const s = engine.state, b = s.battle;
  if (hasWhistled(b, caller) || !engine.data.enemies[caller.id]?.ai.some(r => r.skill === 'moth_whistle')) return [];
  const scheduled = engine.data.encounters[b.encounter].reinforcements?.length ?? 0;
  const pending = scheduled - (b.reinforcements?.filter(r => r.id).length ?? 0);
  const capacity = Math.min(3, 5 - b.enemies.filter(u => battleAlive(s,u)).length, 15 - b.enemies.length - pending);
  return capacity < 2 ? [] : freePositions(s).slice(0, capacity);
}
export function summonMoths(engine, caller) {
  const b = engine.state.battle, cells = mothSummonPositions(engine, caller);
  if (cells.length < 2) return;
  const count = cells.length === 3 && engine.random() >= 0.5 ? 3 : 2;
  const record = {caller:caller.instance};
  // A summon happens during a turn. Earlier snapshots in this same round
  // still describe the roster before the whistle.
  if (b.mode === 'frontline') record.eventId = b.frontline.eventSerial + 1;
  const units = cells.slice(0,count).map(p => unitKey(appendReinforcement(engine, EMBER_MOTH, p, record)));
  b.log.push(`${caller.name}の集合笛。灯蛾が${units.length}体、松明のまわりに集まった。`);
  syncFamilyBattle(engine);
  traceFrontline(engine, 'reinforcements', {units});
}
export function joinReinforcements(engine){
 const {state:s,data:d}=engine,b=s.battle,defs=d.encounters[b.encounter].reinforcements;
 if(!defs)return;
 const joined=[];
 let scheduled=b.reinforcements.filter(r=>r.id).length;
 while(scheduled<defs.length){
  const row=defs[scheduled],unit=id=>b.enemies.find(e=>e.instance===id);
  if(b.round<row.round||!b.enemies.some(e=>battleAlive(s,e))||b.enemies.filter(e=>battleAlive(s,e)).length>=5||row.afterDefeat&&unit(row.afterDefeat).hp>0||row.whileAlive&&!battleAlive(s,unit(row.whileAlive)))break;
  const p=freePositions(s,row.position)[0];if(!p)break;
  const enemy=appendReinforcement(engine,row.enemy,p,{id:row.id});
  scheduled++;joined.push(unitKey(enemy));b.log.push(`${enemy.name}が増援として現れた。`);
 }
 // One snapshot after the whole batch: all joins in this round share its roster.
 if(joined.length){syncFamilyBattle(engine);traceFrontline(engine,'reinforcements',{units:joined});}
}
