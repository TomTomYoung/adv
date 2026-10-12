import {isRecord} from './expression.js';

const integer=(n,min,max)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
const allDefinitions=data=>({...data.skills,...data.fieldAbilities});
export const skillSpec=(data,id)=>data.skills?.[id]??data.fieldAbilities?.[id]??null;
export const skillLevelMax=(data,id)=>skillSpec(data,id)?.skillLevel?.max??1;
export function ensureSkillState(actor){
  actor.skillLevels??={};
  actor.skillProgress??={uses:{},weaponUses:{}};
  actor.skillProgress.uses??={};actor.skillProgress.weaponUses??={};
  return actor;
}
export function skillLevel(data,state,actorId,id){
  const actor=state.actors?.[actorId];if(!actor)return 1;
  ensureSkillState(actor);return Math.max(1,Math.min(skillLevelMax(data,id),actor.skillLevels[id]??1));
}
const currentGrant=(data,state,actorId,id)=>{
  const actor=state.actors?.[actorId],job=data.jobs?.[actor?.job];
  return Boolean(job?.grants?.some(g=>g.skill===id&&actor.level>=g.level));
};
function conditionValid(data,condition,subject){
  if(!isRecord(condition)||typeof condition.type!=='string')return false;
  if(condition.type==='all'||condition.type==='any')return Array.isArray(condition.conditions)&&condition.conditions.length>0&&condition.conditions.every(c=>conditionValid(data,c,subject));
  if(condition.type==='actor_level')return integer(condition.level,1,data.system.maxLevel);
  if(condition.type==='uses')return typeof condition.skill==='string'&&skillSpec(data,condition.skill)&&integer(condition.count,1,1e9);
  if(condition.type==='weapon_uses')return data.jobProfile.equipmentTypes.weapon.includes(condition.weapon)&&integer(condition.count,1,1e9);
  if(condition.type==='random_on_use')return typeof condition.skill==='string'&&skillSpec(data,condition.skill)&&Number.isFinite(condition.chance)&&condition.chance>0&&condition.chance<=1;
  if(condition.type==='event')return typeof condition.key==='string'&&condition.key.length>0;
  if(condition.type==='shop')return typeof condition.id==='string'&&condition.id.length>0;
  if(condition.type==='has_skill')return typeof condition.skill==='string'&&skillSpec(data,condition.skill)&&integer(condition.level??1,1,9);
  if(condition.type==='companion')return typeof condition.actor==='string'&&Boolean(data.actors[condition.actor]);
  return false;
}
function conditionMet(engine,actorId,subject,condition,triggerSkill){
  const {data,state}=engine,actor=state.actors[actorId];ensureSkillState(actor);
  if(condition.type==='all')return condition.conditions.every(c=>conditionMet(engine,actorId,subject,c,triggerSkill));
  if(condition.type==='any')return condition.conditions.some(c=>conditionMet(engine,actorId,subject,c,triggerSkill));
  if(condition.type==='actor_level')return actor.level>=condition.level;
  if(condition.type==='uses')return (actor.skillProgress.uses[condition.skill]??0)>=condition.count;
  if(condition.type==='weapon_uses')return (actor.skillProgress.weaponUses[condition.weapon]??0)>=condition.count;
  if(condition.type==='random_on_use')return triggerSkill===condition.skill&&engine.random()<condition.chance;
  if(condition.type==='event')return Boolean(state.events?.[condition.key]);
  if(condition.type==='shop')return state.flags?.[`skill_shop:${condition.id}`]===true;
  if(condition.type==='has_skill')return currentGrant(data,state,actorId,condition.skill)&&skillLevel(data,state,actorId,condition.skill)>=(condition.level??1);
  if(condition.type==='companion')return state.members.includes(condition.actor)&&condition.actor!==actorId;
  return false;
}
export function skillLevelDefinitionErrors(data,id,spec){
  const s=spec?.skillLevel;if(s===undefined)return [];
  const errors=[];if(!isRecord(s)||!integer(s.max,2,9)||!Array.isArray(s.upgrades)||s.upgrades.length!==s.max-1)return [`${id}: 技能レベル定義不正`];
  const levels=new Set();
  for(const u of s.upgrades){
    if(!isRecord(u)||!integer(u.level,2,s.max)||levels.has(u.level)||!conditionValid(data,u.when,id))errors.push(`${id}: 技能レベル上昇条件不正`);
    levels.add(u.level);
  }
  for(let level=2;level<=s.max;level++)if(!levels.has(level))errors.push(`${id}: 技能Lv${level}条件がありません`);
  return errors;
}
export function refreshSkillLevels(engine,actorId=null,triggerSkill=null){
  const ids=actorId?[actorId]:Object.keys(engine.state.actors),raised=[];
  for(const id of ids){
    const actor=engine.state.actors[id];if(!actor)continue;ensureSkillState(actor);
    const candidates=[...new Set([...(engine.data.jobs?.[actor.job]?.grants??[]).filter(g=>actor.level>=g.level).map(g=>g.skill),...Object.keys(actor.skillLevels)])];
    for(const skillId of candidates){
      const spec=skillSpec(engine.data,skillId),definition=spec?.skillLevel;if(!definition)continue;
      const current=skillLevel(engine.data,engine.state,id,skillId),next=definition.upgrades.find(u=>u.level===current+1);
      if(!next||!conditionMet(engine,id,skillId,next.when,triggerSkill))continue;
      actor.skillLevels[skillId]=next.level;raised.push({actor:id,skill:skillId,level:next.level,name:spec.name});
    }
  }
  for(const row of raised)engine.log(`${engine.data.actors[row.actor].name}の${row.name}が技能Lv${row.level}になった。`);
  if(raised.length)engine.state.notice=`${engine.data.actors[raised[0].actor].name}の${raised[0].name}が技能Lv${raised[0].level}になった。`;
  return raised;
}
export function recordSkillUse(engine,actorId,id){
  const actor=engine.state.actors[actorId];if(!actor)return;ensureSkillState(actor);
  actor.skillProgress.uses[id]=Math.min(1e9,(actor.skillProgress.uses[id]??0)+1);
  const spec=engine.data.skills?.[id],weapon=engine.data.items[actor.equipment?.weapon]?.equipmentType;
  if(weapon&&spec?.effects?.some(e=>e.type==='damage'&&e.element==='physical'))actor.skillProgress.weaponUses[weapon]=Math.min(1e9,(actor.skillProgress.weaponUses[weapon]??0)+1);
  refreshSkillLevels(engine,actorId,id);
}
export function skillStateErrors(data,actor){
  if(actor.skillLevels===undefined&&actor.skillProgress===undefined)return [];
  const errors=[],defs=allDefinitions(data);
  if(!isRecord(actor.skillLevels))errors.push('技能レベル状態不正');
  else for(const [id,level] of Object.entries(actor.skillLevels))if(!defs[id]||!integer(level,1,skillLevelMax(data,id)))errors.push('技能レベル状態不正');
  const p=actor.skillProgress;
  if(!isRecord(p)||!isRecord(p.uses)||!isRecord(p.weaponUses))errors.push('技能成長記録不正');
  else{
    for(const [id,n] of Object.entries(p.uses))if(!defs[id]||!integer(n,0,1e9))errors.push('技能使用回数不正');
    for(const [weapon,n] of Object.entries(p.weaponUses))if(!data.jobProfile.equipmentTypes.weapon.includes(weapon)||!integer(n,0,1e9))errors.push('武器使用回数不正');
  }
  return [...new Set(errors)];
}
