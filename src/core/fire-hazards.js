import {evaluate} from './expression.js';
import {compileTrap} from './dungeon-packages.js';
import {applyImpact,impactErrors} from './hazard-effects.js';
const at=(a,b)=>a?.map===b?.map&&a.x===b.x&&a.y===b.y;
export function activeFireHazards(data,state,point=state.location){
  const d=data.dungeons?.[state.dungeons?.active?.id];
  return (d?.hazards??[]).filter(h=>h.points.some(p=>at(p,point))&&evaluate(h.condition,state));
}
export const ignitionReason=(data,state,point)=>activeFireHazards(data,state,point).some(h=>h.kind==='water_leak')?'漏水しているため、ここでは火を灯せません。':'';
export function attemptIgnition(engine,point=engine.state.location){
  const reason=ignitionReason(engine.data,engine.state,point);if(reason){engine.notify(reason);return false;}
  const gas=activeFireHazards(engine.data,engine.state,point).filter(h=>h.kind==='gas_leak');
  for(const hazard of gas){
    const impact=compileTrap({...hazard.explosion,kind:'explosion'})[0];
    engine.notify(`${hazard.name}：着火した火が引火し、爆発した。`);
    if(!applyImpact(engine,impact))return false;
  }
  return gas.length===0;
}
export function fireHazardsErrors(data,d,expression=()=>{}){
  if(d.hazards===undefined)return [];
  if(!Array.isArray(d.hazards))return ['環境危険は配列です'];
  const errors=[],ids=new Set();
  for(const h of d.hazards){
    if(!h||Object.keys(h).some(k=>!['id','name','kind','points','condition','explosion'].includes(k))||!/^[a-z][a-z0-9_]*$/.test(h.id)||ids.has(h.id)||!h.name||!['water_leak','gas_leak'].includes(h.kind)||!Array.isArray(h.points)||!h.points.length||h.points.some(p=>!d.maps.includes(p.map)||data.maps[p.map]?.tiles[p.y]?.[p.x]!=='.')||h.condition===undefined){errors.push('環境危険の定義が不正です');continue;}
    ids.add(h.id);expression(h.condition,`${d.id}/hazards/${h.id}`);
    if(h.kind==='gas_leak'){
      if(!h.explosion||Object.keys(h.explosion).some(k=>!['damage','target','patches'].includes(k)))errors.push('ガス漏れには爆発の被害・破壊対象を指定します');
      else errors.push(...impactErrors(data,compileTrap({...h.explosion,kind:'explosion'})[0]));
    }else if(h.explosion!==undefined)errors.push('漏水には爆発を指定できません');
  }
  return errors;
}
