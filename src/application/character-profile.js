import {effectiveSkill} from '../core/skill-levels.js';
import {heldCount} from '../core/inventory.js';
import {fieldSkillPlan} from '../core/field-skills.js';

export {abilityCategory} from '../core/ability-category.js';
export function projectFieldSkillTargets(engine,actorId,skillId){
  const {data:d,state:s}=engine,skill=effectiveSkill(d,s,actorId,skillId);
  if(!skill.fieldUse)return [];
  return (skill.target==='ally'?s.members:[actorId]).map(id=>{
    const plan=fieldSkillPlan(engine,actorId,skillId,id);
    return {id,name:skill.target==='all_allies'?(skill.maxTargets<s.members.length?`${skill.selection==='lowest_hp_ratio'?'HPが低い仲間':'生存する仲間'}${skill.maxTargets}人`:'仲間全員'):d.actors[id].name,enabled:plan.ok,reason:plan.reason??'',reasonScope:plan.reasonScope??null};
  });
}
export function personalItems(engine,actor){
  return Object.entries(engine.data.items).flatMap(([id,item])=>{
    const count=heldCount(engine.data,engine.state,id,actor);
    return count?[{id,name:item.name,description:item.description,count}]:[];
  });
}
