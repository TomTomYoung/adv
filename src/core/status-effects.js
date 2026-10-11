import {dungeonEffectActive} from './dungeons.js';
const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
export function statusDurationValid(value){return record(value)&&Object.keys(value).length>0&&Object.keys(value).every(k=>['steps','turns'].includes(k))&&Object.values(value).every(n=>Number.isSafeInteger(n)&&n>0&&n<=1e6);}
export function applyStatus(data,state,target,id,duration){
  if(!data.statuses[id])throw Error(`不明な状態異常: ${id}`);
  if(target.hp<=0||!dungeonEffectActive(data,state,'status',id)||(target.statusImmune??data.actors[target.id]?.statusImmune??[]).includes(id))return false;
  const fresh=!target.statuses.includes(id);if(fresh)target.statuses.push(id);
  const next=duration??data.statuses[id].duration;
  if(next!==undefined){
    if(!statusDurationValid(next))throw Error('状態異常の持続が不正です');
    const timers=target.statusDurations??={},prior=timers[id];
    // Refresh to the longer remaining duration. Never stack the same status.
    if(fresh||prior)timers[id]=Object.fromEntries(Object.entries(next).map(([k,n])=>[k,Math.max(n,prior?.[k]??0)]));
  }else if(target.statusDurations)delete target.statusDurations[id];
  return fresh;
}
export function removeStatus(target,id){
  target.statuses=id?target.statuses.filter(s=>s!==id):[];
  if(target.statusDurations){if(id)delete target.statusDurations[id];else delete target.statusDurations;}
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
  for(const id of target.statuses??[])if(dungeonEffectActive(data,state,'status',id))for(const [key,scale] of Object.entries(data.statuses[id]?.stats??{}))stats[key]=Math.max(1,Math.floor(stats[key]*scale));
  return stats;
}
export function statusDefinitionsErrors(data){
  const errors=[];
  for(const [id,s] of Object.entries(data.statuses??{}))if(!record(s)||typeof s.name!=='string'||!s.name||['stepDamage','turnDamage'].some(k=>s[k]!==undefined&&(!Number.isSafeInteger(s[k])||s[k]<0))||s.category!==undefined&&!['parameter','magic','physical'].includes(s.category)||s.duration!==undefined&&!statusDurationValid(s.duration)||s.stats!==undefined&&(!record(s.stats)||Object.entries(s.stats).some(([k,n])=>!['str','vit','agi','int'].includes(k)||!Number.isFinite(n)||n<=0||n>5)))errors.push(`状態異常定義不正: ${id}`);
  return errors;
}
export function statusStateErrors(data,target){
  const errors=[];if(new Set(target.statuses).size!==target.statuses.length)errors.push('状態異常が重複しています');
  if(target.statusDurations!==undefined&&(!record(target.statusDurations)||Object.entries(target.statusDurations).some(([id,v])=>!data.statuses[id]||!target.statuses.includes(id)||!statusDurationValid(v))))errors.push('状態異常の残り時間が不正です');
  return errors;
}
