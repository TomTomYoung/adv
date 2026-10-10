import {heldCount} from '../core/inventory.js';
import {fieldSkillPlan} from '../core/field-skills.js';

// Display categories are explicit: MP costs, elements and healing alone do not
// distinguish a spell from alchemy, breathing, songs or weapon techniques.
const magicSkills=new Set(['fire','heal','cleanse','ice','lightning','firestorm','ice_bind','rune_armor','thundercloud','flameblade','greater_heal','purify','holy_guard','holy_light','lamplight','roots','blood_light','homeward','repel_kuragari','valley_curse']);
const magicAbilities=new Set(['kuragari_ward','kindle_calm','kindle_lure','read_path','field_prayer','water_breath','dry_clothes']);
export const abilityCategory=(id,field=false)=>(field?magicAbilities:magicSkills).has(id)?'magic':'skills';
export function projectFieldSkillTargets(engine,actorId,skillId){
  const {data:d,state:s}=engine,skill=d.skills[skillId];
  if(!skill.fieldUse)return [];
  return (skill.target==='ally'?s.members:[actorId]).map(id=>{
    const plan=fieldSkillPlan(engine,actorId,skillId,id);
    return {id,name:skill.target==='all_allies'?'仲間全員':d.actors[id].name,enabled:plan.ok,reason:plan.reason??'',reasonScope:plan.reasonScope??null};
  });
}
export function personalItems(engine,actor){
  return Object.entries(engine.data.items).flatMap(([id,item])=>{
    const count=heldCount(engine.data,engine.state,id,actor);
    return count?[{id,name:item.name,description:item.description,count}]:[];
  });
}
