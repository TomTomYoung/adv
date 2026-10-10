import {heldCount} from '../core/inventory.js';
import {fieldSkillPlan} from '../core/field-skills.js';
import {dungeonEffectActive} from '../core/dungeons.js';

// Display categories are explicit: MP costs, elements and healing alone do not
// distinguish a spell from alchemy, breathing, songs or weapon techniques.
const magicSkills=new Set(['fire','heal','cleanse','ice','lightning','firestorm','ice_bind','rune_armor','thundercloud','flameblade','greater_heal','purify','holy_guard','holy_light','lamplight','roots','blood_light','homeward','repel_kuragari','valley_curse']);
const magicAbilities=new Set(['kuragari_ward','kindle_calm','kindle_lure','read_path','field_prayer','water_breath','dry_clothes']);
export const abilityCategory=(id,field=false)=>(field?magicAbilities:magicSkills).has(id)?'magic':'skills';
export function projectFieldSkillTargets(engine,actorId,skillId){
  const {data:d,state:s}=engine,skill=d.skills[skillId];
  if(!skill.fieldUse)return [];
  const effects=new Set(skill.effects.map(effect=>effect.type));
  const member=id=>{const a=s.actors[id],stats=engine.stats(id);return {
    id,name:d.actors[id].name,hp:a.hp,maxHp:stats.hp,mp:a.mp,maxMp:stats.mp,
    vitals:[...(effects.has('heal')?[`HP ${a.hp}/${stats.hp}`]:[]),...(effects.has('restore_mp')?[`MP ${a.mp}/${stats.mp}`]:[])],
    statuses:a.statuses.map(status=>d.statuses[status].name+(dungeonEffectActive(d,s,'status',status)?'':'（停止中）'))
  };};
  return (skill.target==='ally'?s.members:[actorId]).map(id=>{
    const plan=fieldSkillPlan(engine,actorId,skillId,id);
    return {id,name:skill.target==='all_allies'?'仲間全員':d.actors[id].name,enabled:plan.ok,reason:plan.reason??'',reasonScope:plan.reasonScope??null,
      members:(skill.target==='all_allies'?s.members:[id]).map(member)};
  });
}
export function personalItems(engine,actor){
  return Object.entries(engine.data.items).flatMap(([id,item])=>{
    const count=heldCount(engine.data,engine.state,id,actor);
    return count?[{id,name:item.name,description:item.description,count}]:[];
  });
}
