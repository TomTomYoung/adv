import {dungeonEffectActive} from './dungeons.js';
const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
export const STATUS_LEVEL_MAX=3;
export const statusLevelValid=level=>Number.isInteger(level)&&level>=1&&level<=STATUS_LEVEL_MAX;
export function statusDurationValid(value){return record(value)&&Object.keys(value).length>0&&Object.keys(value).every(k=>['steps','turns'].includes(k))&&Object.values(value).every(n=>Number.isSafeInteger(n)&&n>0&&n<=1e6);}
export const statusLevel=(target,id)=>target.statusLevels?.[id]??1;
export function statusEffectAtLevel(data,id,level=1){
  const def=data.statuses[id];if(!def)return null;
  const effect={...def,...(def.levels?.[level]??{})};delete effect.levels;return effect;
}
export const statusEffect=(data,target,id)=>statusEffectAtLevel(data,id,statusLevel(target,id));
export function applyStatus(data,state,target,id,duration,level=1){
  if(!data.statuses[id])throw Error(`不明な状態異常: ${id}`);
  if(!statusLevelValid(level))throw Error('状態異常Lvが不正です');
  if(target.hp<=0||!dungeonEffectActive(data,state,'status',id)||(target.statusImmune??data.actors[target.id]?.statusImmune??[]).includes(id))return false;
  const fresh=!target.statuses.includes(id),prior=fresh?1:statusLevel(target,id),nextLevel=fresh?level:Math.max(prior,level);
  if(fresh)target.statuses.push(id);
  if(nextLevel>1)(target.statusLevels??={})[id]=nextLevel;
  else if(target.statusLevels)delete target.statusLevels[id];
  if(target.statusLevels&&!Object.keys(target.statusLevels).length)delete target.statusLevels;
  const next=duration??statusEffectAtLevel(data,id,nextLevel)?.duration;
  if(next!==undefined){
    if(!statusDurationValid(next))throw Error('状態異常の持続が不正です');
    const timers=target.statusDurations??={},priorTimer=timers[id];
    if(fresh||priorTimer)timers[id]=Object.fromEntries(Object.entries(next).map(([k,n])=>[k,Math.max(n,priorTimer?.[k]??0)]));
  }else if(target.statusDurations)delete target.statusDurations[id];
  return fresh||nextLevel>prior;
}
export function removeStatus(target,id){
  target.statuses=id?target.statuses.filter(s=>s!==id):[];
  if(target.statusDurations){if(id)delete target.statusDurations[id];else delete target.statusDurations;if(!Object.keys(target.statusDurations).length)delete target.statusDurations;}
  if(target.statusLevels){if(id)delete target.statusLevels[id];else delete target.statusLevels;if(target.statusLevels&&!Object.keys(target.statusLevels).length)delete target.statusLevels;}
}
export function tickStatuses(data,state,target,clock){
  for(const [id,timer] of Object.entries(target.statusDurations??{})){
    if(!target.statuses.includes(id)){delete target.statusDurations[id];continue;}
    if(!dungeonEffectActive(data,state,'status',id)||timer[clock]===undefined)continue;
    if(--timer[clock]<=0)removeStatus(target,id);
  }
}
export function statusStats(data,state,target,base){
  const stats={...base};
  for(const id of target.statuses??[])if(dungeonEffectActive(data,state,'status',id))for(const [key,scale] of Object.entries(statusEffect(data,target,id)?.stats??{}))stats[key]=Math.max(0,Math.floor(stats[key]*scale));
  return stats;
}
export function applyStatusClock(data,state,target,id,clock,maxStats,{lethal=true}={}){
  if(!dungeonEffectActive(data,state,'status',id))return {hp:0,mp:0};
  const effect=statusEffect(data,target,id);if(!effect)return {hp:0,mp:0};
  const prefix=clock==='steps'?'step':'turn';
  const hpFixed=effect[`${prefix}Damage`]??0,hpRate=effect[`${prefix}HpRate`]??0;
  const mpFixed=effect[`${prefix}MpDamage`]??0,mpRate=effect[`${prefix}MpRate`]??0;
  const hp=Math.max(0,Math.floor(hpFixed)+Math.ceil((maxStats.hp??0)*hpRate));
  const mp=Math.max(0,Math.floor(mpFixed)+Math.ceil((maxStats.mp??0)*mpRate));
  if(hp)target.hp=Math.max(lethal?0:1,target.hp-hp);
  if(mp)target.mp=Math.max(0,target.mp-mp);
  return {hp,mp};
}
function effectErrors(e){
  if(!record(e))return true;
  if(['stepDamage','turnDamage','stepMpDamage','turnMpDamage'].some(k=>e[k]!==undefined&&(!Number.isSafeInteger(e[k])||e[k]<0||e[k]>1e6)))return true;
  if(['stepHpRate','turnHpRate','stepMpRate','turnMpRate'].some(k=>e[k]!==undefined&&(!Number.isFinite(e[k])||e[k]<0||e[k]>1)))return true;
  if(e.wetDamageScale!==undefined&&(!Number.isFinite(e.wetDamageScale)||e.wetDamageScale<0||e.wetDamageScale>5))return true;
  if(e.wetBacklashRate!==undefined&&(!Number.isFinite(e.wetBacklashRate)||e.wetBacklashRate<0||e.wetBacklashRate>1))return true;
  if(e.wetSuppressElements!==undefined&&(!Array.isArray(e.wetSuppressElements)||e.wetSuppressElements.some(x=>!['ice','lightning'].includes(x))))return true;
  if(e.duration!==undefined&&!statusDurationValid(e.duration))return true;
  if(e.stats!==undefined&&(!record(e.stats)||Object.entries(e.stats).some(([k,n])=>!['str','vit','agi','int'].includes(k)||!Number.isFinite(n)||n<0||n>5)))return true;
  return false;
}
export function statusDefinitionsErrors(data){
  const errors=[];
  for(const [id,s] of Object.entries(data.statuses??{})){
    if(!record(s)||typeof s.name!=='string'||!s.name||s.category!==undefined&&!['parameter','magic','physical'].includes(s.category)||effectErrors(s)){errors.push(`状態異常定義不正: ${id}`);continue;}
    if(s.levels!==undefined&&(!record(s.levels)||Object.keys(s.levels).some(k=>!['1','2','3'].includes(k))||Object.entries(s.levels).some(([k,v])=>!statusLevelValid(Number(k))||effectErrors(v))))errors.push(`状態異常Lv定義不正: ${id}`);
  }
  return errors;
}
export function statusStateErrors(data,target){
  const errors=[];if(new Set(target.statuses).size!==target.statuses.length)errors.push('状態異常が重複しています');
  if(target.statusDurations!==undefined&&(!record(target.statusDurations)||Object.entries(target.statusDurations).some(([id,v])=>!data.statuses[id]||!target.statuses.includes(id)||!statusDurationValid(v))))errors.push('状態異常の残り時間が不正です');
  if(target.statusLevels!==undefined&&(!record(target.statusLevels)||Object.entries(target.statusLevels).some(([id,v])=>!data.statuses[id]||!target.statuses.includes(id)||!statusLevelValid(v)||v===1)))errors.push('状態異常Lvが不正です');
  return errors;
}
