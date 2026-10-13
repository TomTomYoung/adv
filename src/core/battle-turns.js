import {isRecord} from './expression.js';
import {unitKey} from './buffs.js';

export const BATTLE_STATUS_DEFINITIONS={
  guarded:{id:'guarded',name:'防御',kind:'status',battleOnly:true,maxLevel:3,levels:{1:{duration:'one_turn',damageTaken:'system.guardRate'},2:null,3:null}},
  stun:{id:'stun',name:'スタン',kind:'status',battleOnly:true,maxLevel:3,levels:{1:{lostActions:1},2:{lostActions:2},3:{lostActions:3}}}
};
export const guarded=(battle,unit)=>unit?.instance?Boolean(unit.guard):(battle?.guards??[]).includes(unit?.id);
export function applyGuard(battle,target){
  if(!battle||!target)return false;
  if(target.instance)target.guard=true;
  else if(!battle.guards.includes(target.id))battle.guards.push(target.id);
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
  if(b.stuns!==undefined&&(!isRecord(b.stuns)||Object.entries(b.stuns).some(([id,n])=>!valid.has(id)||!Number.isInteger(n)||n<1||n>20)))errors.push('スタン行動回数不正');
  const p=b.preemptive;if(p!==undefined&&(!isRecord(p)||Object.keys(p).some(k=>!['side','remaining'].includes(k))||!['allies','enemies'].includes(p.side)||!Number.isInteger(p.remaining)||p.remaining<1||p.remaining>20||b.round!==1||b.acted?.length||p.side==='enemies'&&!b.event))errors.push('先制陣営・残り行動回数不正');
  return errors;
}
