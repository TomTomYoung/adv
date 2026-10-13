import {applyStatus,statusDurationValid} from './status-effects.js';
import {applyMapPatch,mapPatchErrors} from './map-mutations.js';
import {fireContext} from './systems/fire-network.js';
import {signalFieldChange} from './field-signals.js';
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
export function impactErrors(data,spec){
  const errors=[];
  if(!object(spec)||!['party','leader'].includes(spec.target)||!Number.isSafeInteger(spec.damage)||spec.damage<0||spec.damage>1e6)return ['危険の対象・ダメージが不正です'];
  if(!Array.isArray(spec.statuses)||spec.statuses.some(s=>!object(s)||Object.keys(s).some(k=>!['status','duration','level'].includes(k))||!data.statuses?.[s.status]||s.duration!==undefined&&!statusDurationValid(s.duration)||s.level!==undefined&&(!Number.isInteger(s.level)||s.level<1||s.level>3)))errors.push('危険の状態異常が不正です');
  if(!Array.isArray(spec.patches))errors.push('危険の地形変更が不正です');else for(const p of spec.patches)errors.push(...mapPatchErrors(data,p));
  const fixtures=Object.values(data.dungeons??{}).flatMap(d=>Object.values(d.systems).filter(s=>s.use==='fire_network').flatMap(s=>s.fixtures.map(f=>f.id)));
  if(!Array.isArray(spec.extinguish)||new Set(spec.extinguish).size!==spec.extinguish.length||spec.extinguish.some(id=>id!=='portable'&&!fixtures.includes(id)))errors.push('消火する火台が不正です');
  return errors;
}
export function extinguishFire(data,state,target){
  const ctx=fireContext(data,state),flame=target==='portable'?ctx?.run.portable:ctx?.persistent.fixtures[target];
  if(flame){Object.assign(flame,{lit:false,effect:null,fuel:0});signalFieldChange(data,state,'light');return true;}
  if(target==='portable'&&!ctx){state.light=0;signalFieldChange(data,state,'light');return true;}
  return false;
}
export function applyImpact(engine,spec){
  const {data,state}=engine,alive=state.members.filter(id=>state.actors[id].hp>0),targets=spec.target==='leader'?alive.slice(0,1):alive,damage=Math.floor(spec.damage*engine.partyEffect('trapDamage'));
  for(const id of targets){const a=state.actors[id];a.hp=Math.max(0,a.hp-damage);for(const status of spec.statuses)applyStatus(data,state,a,status.status,status.duration,status.level??1);}
  for(const patch of spec.patches)applyMapPatch(engine,patch);
  for(const id of spec.extinguish)extinguishFire(data,state,id);
  if(damage)engine.eventCue('field_poison');
  if(state.members.every(id=>state.actors[id].hp<=0)){if(state.battle)engine.finishBattle('lose');else engine.defeat();return false;}
  return true;
}
