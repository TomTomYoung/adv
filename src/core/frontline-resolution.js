import {unitKey} from './buffs.js';
import {frontPosition,traceFrontline} from './battle-frontline.js';
import {frontlineProfile,orderFrontlineTargets,seriesFactor} from './frontline-targeting.js';
// A committed attack is atomic. Diagnostic events expose every hit and reaction;
// presentation replay never advances the engine or spends its cost again.
export function resolveFrontlineAttack(engine,source,targets,skill,id,{snapshot,hit,react}){
 const b=engine.state.battle,s=engine.state,profile=frontlineProfile(engine.data,source,skill,id),ordered=orderFrontlineTargets(s,targets,profile.order),initial=new Map(ordered.map(u=>[unitKey(u),{...frontPosition(s,u)}])),finalBase={},results=[];
 const snapshots=new Map(ordered.map(u=>[unitKey(u),snapshot(u)]));
 traceFrontline(engine,'attack_start',{source:unitKey(source),skill:id,resolution:profile.resolution,targets:ordered.map(unitKey),order:profile.order});
 let stopped=false,hitIndex=0;
 for(let i=0;i<ordered.length;i++){
  const target=ordered[i],key=unitKey(target),before=target.hp,p=frontPosition(s,target),old=initial.get(key);
  if(profile.resolution==='sequential'&&(target.hp<=0||profile.reevaluate==='position'&&(p.depth!==old.depth||p.lane!==old.lane))){traceFrontline(engine,'hit_skipped',{target:key,reason:target.hp<=0?'戦闘不能':'位置が変化',remaining:ordered.length-i-1});continue;}
  const factor=seriesFactor(profile.damageSeries,hitIndex),context={factor,basis:profile.damageSeries.basis,finalBase,snapshot:profile.resolution==='simultaneous'?snapshots.get(key):snapshot(target)};
  const result=hit(target,context);results.push(result);
  traceFrontline(engine,'hit',{source:unitKey(source),target:key,skill:id,index:hitIndex+1,factor,damage:result.damage??0,hpBefore:before,hpAfter:target.hp,remaining:ordered.length-i-1});hitIndex++;
  if(profile.resolution==='sequential'&&result.hit){
   const cancel=react(target,'onHit',source);if(cancel||source.hp<=0){stopped=true;traceFrontline(engine,'attack_stopped',{reason:cancel?'反応による後続命中中止':'行動者が戦闘不能',remaining:ordered.length-i-1});break;}
  }
 }
 if(profile.resolution==='simultaneous')for(let i=0;i<ordered.length;i++)if(results[i]?.hit)react(ordered[i],'onHit',source);
 traceFrontline(engine,'attack_end',{source:unitKey(source),skill:id,hits:results.length,stopped});return results;
}
