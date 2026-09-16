import {dungeonFloodLevel} from './dungeons.js';
export const wetResistance=(actor,element)=>actor.statuses?.includes('wet')&&['ice','lightning'].includes(element)?1.5:1;
export function wetAfterSkill(engine,actor,skill){
 if(!actor.statuses.includes('wet'))return;
 const elements=skill.effects.filter(e=>e.type==='damage').map(e=>e.element);
 if(elements.some(e=>e==='ice'||e==='lightning')){
  const damage=Math.max(1,Math.ceil(engine.stats(actor.id).hp*.1));actor.hp=Math.max(0,actor.hp-damage);
  engine.state.battle?.log.push(`${engine.data.actors[actor.id].name}は濡れた身体を術に巻き込み、${damage}ダメージ。`);
 }
 if(elements.includes('fire')&&dungeonFloodLevel(engine.data,engine.state)===0){actor.statuses=actor.statuses.filter(s=>s!=='wet');engine.state.battle?.log.push(`${engine.data.actors[actor.id].name}の衣服が炎の熱で乾いた。`);}
}
