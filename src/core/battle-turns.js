import {isRecord} from './expression.js';
import {unitKey} from './buffs.js';
import {statusLevelValid} from './status-effects.js';

export const BATTLE_STATUS_DEFINITIONS={
  guarded:{id:'guarded',name:'防御',kind:'status',battleOnly:true,maxLevel:3,levels:{1:{duration:'one_turn',damageTaken:'system.guardRate'},2:{duration:'one_turn',damageTaken:0.25},3:{duration:'one_turn',damageTaken:0}}},
  stun:{id:'stun',name:'スタン',kind:'status',battleOnly:true,maxLevel:3,levels:{1:{lostActions:1},2:{lostActions:2},3:{lostActions:3}}}
};
export const guarded=(battle,unit)=>unit?.instance?Boolean(unit.guard):(battle?.guards??[]).includes(unit?.id);
export const guardLevel=(battle,unit)=>guarded(battle,unit)?battle?.guardLevels?.[unitKey(unit)]??1:0;
export function guardDamageRate(data,level=1){
  if(level===0)return 1;
  const rate=BATTLE_STATUS_DEFINITIONS.guarded.levels[level]?.damageTaken;
  return rate==='system.guardRate'?data.system?.guardRate??0.5:rate;
}
export function clearGuard(battle,target){
  if(target.instance)target.guard=false;
  else battle.guards=battle.guards.filter(id=>id!==target.id);
  if(battle.guardLevels){delete battle.guardLevels[unitKey(target)];if(!Object.keys(battle.guardLevels).length)delete battle.guardLevels;}
}
export function applyGuard(battle,target,level=1){
  if(!statusLevelValid(level))throw Error('防御Lvが不正です');
  if(!battle||!target)return false;
  const nextLevel=Math.max(guardLevel(battle,target),level);
  if(target.instance)target.guard=true;
  else if(!battle.guards.includes(target.id))battle.guards.push(target.id);
  if(nextLevel>1)(battle.guardLevels??={})[unitKey(target)]=nextLevel;
  return true;
}
export function preemptiveValid(c){return isRecord(c)&&Object.keys(c).every(k=>['side','actions','chance','priority'].includes(k))&&['allies','enemies'].includes(c.side)&&Number.isInteger(c.actions)&&c.actions>=1&&c.actions<=20&&(c.chance===undefined||Number.isFinite(c.chance)&&c.chance>=0&&c.chance<=1)&&(c.priority===undefined||Number.isInteger(c.priority)&&c.priority>=0&&c.priority<=100);}
export function resolvePreemptive(engine,encounter,options){
  const s=engine.state,q=s.scouting,b=s.battle,candidates=[encounter.preemptive,options.preemptive,...encounter.enemies.map(id=>engine.data.enemies[id].preemptive)].filter(Boolean);
  if(q?.effects.ambush){candidates.push({side:'allies',actions:q.effects.ambush.actions,priority:10});delete q.effects.ambush;}
  const eligible=candidates.filter(c=>(!q?.effects.patrol||c.side!=='enemies')&&(c.chance===undefined||engine.random()<c.chance));
  // Definition priority first, then action count, then allies for a stable tie.
  eligible.sort((a,c)=>(c.priority??0)-(a.priority??0)||c.actions-a.actions||(a.side===c.side?0:a.side==='allies'?-1:1));
  const winner=eligible[0];if(!winner)return;
  b.preemptive={side:winner.side,remaining:winner.actions};b.log.push(`${winner.side==='allies'?'味方':'敵'}が先制。${winner.actions}回行動できます。`);
}
export const stunned=(battle,unit)=>(battle?.stuns?.[unitKey(unit)]??0)>0;
export function applyStun(engine,target,effect){
  const b=engine.state.battle;if(!b||target.hp<=0||engine.random()>=(effect.chance??1))return false;
  const key=unitKey(target),stuns=b.stuns??={};stuns[key]=Math.min(20,effect.stack==='add'?(stuns[key]??0)+(effect.count??1):effect.count??1);return true;
}
export function consumeStun(engine,unit){
  const b=engine.state.battle,key=unitKey(unit);if(!stunned(b,unit))return false;
  if(--b.stuns[key]===0)delete b.stuns[key];
  b.log.push(`${unit.name??engine.data.actors[unit.id].name}はスタンで行動できない。`);return true;
}
export function battleTurnSaveErrors(state){
  const b=state.battle;if(!b)return [];
  const errors=[],valid=new Set([...state.members.map(id=>`actor:${id}`),...(b.enemies??[]).map(e=>`enemy:${e.instance}`)]);
  const guarding=new Set([...(Array.isArray(b.guards)?b.guards:[]).map(id=>`actor:${id}`),...(b.enemies??[]).filter(e=>e.guard).map(unitKey)]);
  if(b.guardLevels!==undefined&&(!isRecord(b.guardLevels)||Object.entries(b.guardLevels).some(([id,n])=>!valid.has(id)||!guarding.has(id)||!statusLevelValid(n)||n===1)))errors.push('防御Lv不正');
  if(b.stuns!==undefined&&(!isRecord(b.stuns)||Object.entries(b.stuns).some(([id,n])=>!valid.has(id)||!Number.isInteger(n)||n<1||n>20)))errors.push('スタン行動回数不正');
  // Old same-version battle saves omit both fields; GameEngine.load rebuilds their queue.
  const queue=b.turnQueue,index=b.turnIndex,legacy=queue===undefined&&index===undefined;
  if(!legacy){
    if(!Number.isInteger(index)||index<0||queue!==null&&!Array.isArray(queue)||(queue===null&&index!==0))errors.push('戦闘行動キュー不正');
    else if(Array.isArray(queue)){
      const keys=new Set(queue);
      if(index>queue.length||queue.length>valid.size||keys.size!==queue.length||queue.some(key=>typeof key!=='string'||!valid.has(key))||b.preemptive||b.acted?.some(id=>queue.includes('actor:'+id)&&!queue.slice(0,index).includes('actor:'+id))||(!b.event&&index<queue.length&&queue[index].startsWith('enemy:')))errors.push('戦闘行動キュー不正');
    }else if(!b.preemptive&&!b.event)errors.push('戦闘行動キュー不正');
  }
  const p=b.preemptive;if(p!==undefined&&(!isRecord(p)||Object.keys(p).some(k=>!['side','remaining'].includes(k))||!['allies','enemies'].includes(p.side)||!Number.isInteger(p.remaining)||p.remaining<1||p.remaining>20||b.round!==1||b.acted?.length||p.side==='enemies'&&!b.event))errors.push('先制陣営・残り行動回数不正');
  return errors;
}
