import {removeStatus,statusEffect} from './status-effects.js';
import {dungeonFloodLevel,dungeonEffectActive} from './dungeons.js';
const wetEffect=(data,actor)=>actor.statuses?.includes('wet')?statusEffect(data,actor,'wet'):null;
export const wetResistance=(data,actor,element)=>{
 const effect=wetEffect(data,actor);
 return effect&&['ice','lightning'].includes(element)?effect.wetDamageScale??1.5:1;
};
export function wetSkillBlocked(engine,actor,skill){
 if(!actor.statuses?.includes('wet')||!dungeonEffectActive(engine.data,engine.state,'status','wet'))return false;
 const effect=wetEffect(engine.data,actor),blocked=effect?.wetSuppressElements??[];
 const elements=skill.effects.filter(e=>e.type==='damage').map(e=>e.element);
 return elements.some(element=>blocked.includes(element));
}
export function wetAfterSkill(engine,actor,skill){
 if(!actor.statuses?.includes('wet')||!dungeonEffectActive(engine.data,engine.state,'status','wet'))return;
 const effect=wetEffect(engine.data,actor),elements=skill.effects.filter(e=>e.type==='damage').map(e=>e.element);
 if(elements.some(e=>e==='ice'||e==='lightning')){
  const maxHp=actor.instance?actor.stats.hp:engine.stats(actor.id).hp,rate=effect?.wetBacklashRate??.1;
  const damage=Math.max(1,Math.ceil(maxHp*rate));actor.hp=Math.max(0,actor.hp-damage);
  const name=actor.name??engine.data.actors[actor.id]?.name??'対象';
  engine.state.battle?.log.push(`${name}は濡れた身体を術に巻き込み、${damage}ダメージ。`);
 }
 if(elements.includes('fire')&&dungeonFloodLevel(engine.data,engine.state)===0){removeStatus(actor,'wet');const name=actor.name??engine.data.actors[actor.id]?.name??'対象';engine.state.battle?.log.push(`${name}の衣服が炎の熱で乾いた。`);}
}
