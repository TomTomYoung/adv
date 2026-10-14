import {clone} from '../core/expression.js';
import {unitKey} from '../core/buffs.js';
import {isGrid,gridCells,position,gridMovePlan,battleUnits,cellId} from '../core/battle-grid.js';
import {formationPlan,PARTY_CELLS} from '../core/battle-formation.js';
import {targetingProfile,gridSelections} from '../core/battle-targeting.js';
import {battleSkillPlan,battleItemPlan} from '../core/battle.js';
export function projectFormation(engine){
  const {data:d,state:s}=engine;
  return {positions:clone(s.partyFormation),editable:s.members.length>0&&formationPlan(d,s,s.members[0],0,0).ok,cells:PARTY_CELLS.slice().sort((a,b)=>a.y-b.y||a.x-b.x).map(p=>({...p,actor:s.members.find(id=>s.partyFormation?.[id]?.x===p.x&&s.partyFormation[id].y===p.y)??null}))};
}
export function gridSkillView(engine,id,skillId,skill){
  const source=engine.state.actors[id],profile=targetingProfile(engine.data,source,skill,skillId);
  const choices=gridSelections(engine,source,skill,skillId).map(choice=>{const p=battleSkillPlan(engine,id,skillId,choice.id);return projectChoice(engine,choice.id,p);});
  return {profile:clone(profile),choices};
}
function projectChoice(engine,id,p){
  const units=battleUnits(engine.state),unit=units.find(u=>unitKey(u)===id);
  return {id,name:unit?`${unit.name??engine.data.actors[unit.id].name} HP ${unit.hp}/${unit.instance?unit.stats.hp:engine.stats(unit.id).hp}`:id.startsWith('cell:')?`地点 ${id.slice(5)}`:'全域',enabled:p.ok,reason:p.reason??'',aim:p.aim??position(engine.state,id)??null,cells:p.cells??[],targets:p.targets?.map(unitKey)??[],targetNames:p.targets?.map(u=>u.name??engine.data.actors[u.id].name)??[]};
}
export function gridItemView(engine,id,itemId){
  const skillId=engine.data.items[itemId].battleSkill,skill=engine.data.skills[skillId],source=engine.state.actors[id];
  if(!source)return {choices:[],enabled:false};
  const choices=gridSelections(engine,source,skill,skillId).map(c=>projectChoice(engine,c.id,battleItemPlan(engine,id,itemId,c.id)));
  return {choices,profile:clone(targetingProfile(engine.data,source,skill,skillId)),enabled:choices.some(c=>c.enabled),reason:choices.find(c=>!c.enabled)?.reason??''};
}
export function projectBattleGrid(engine,actorId){
  const s=engine.state;if(!isGrid(s))return null;
  const units=battleUnits(s),actor=s.actors[actorId];
  return {positions:clone(s.battle.grid.positions),movement:s.battle.grid.movement,enemyPresentation:clone(engine.data.presentation?.battleGrid?.enemyPresentation??{anchor:'bottom-center',rowScale:[.7,.85,1],maxOverlapRatio:.33,depthSort:'back-to-front'}),
    cells:gridCells().map(p=>{const u=units.find(u=>u.hp>0&&position(s,u).x===p.x&&position(s,u).y===p.y),move=gridMovePlan(s,actor,p);return {...p,id:cellId(p),unit:u?unitKey(u):null,name:u?u.name??engine.data.actors[u.id].name:'',move:{enabled:move.ok,reason:move.reason??''}};})};
}
