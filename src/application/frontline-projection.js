import {clone} from '../core/expression.js';
import {unitKey} from '../core/buffs.js';
import {isFrontline,frontlineUnits,frontPosition,startingFrontFormation,depthNames,frontlineMovePlan} from '../core/battle-frontline.js';
import {frontlineProfile,frontlineSelections} from '../core/frontline-targeting.js';
import {battleSkillPlan,battleItemPlan} from '../core/battle.js';
export function projectFrontFormation(engine){return clone(startingFrontFormation(engine.state));}
function choiceView(engine,choice,p){
 const u=frontlineUnits(engine.state).find(u=>unitKey(u)===choice.id),position=u?frontPosition(engine.state,u):p.aim;
 return {id:choice.id,name:u?`${u.name??engine.data.actors[u.id].name}・${depthNames[position.depth]} HP ${u.hp}`:position?`${position.side==='allies'?'味方':'敵'}${depthNames[position.depth]}の地点`:'対象',enabled:p.ok,reason:p.reason??'',aim:p.aim??null,targets:p.targets?.map(unitKey)??[],targetNames:p.targets?.map(u=>u.name??engine.data.actors[u.id].name)??[],requiredRange:p.requiredRange??null,cells:p.cells??[]};
}
export function frontlineSkillView(engine,id,skillId,skill){
 return {profile:clone(frontlineProfile(engine.data,engine.state.actors[id],skill,skillId)),choices:frontlineSelections(engine,engine.state.actors[id],skill,skillId).map(c=>choiceView(engine,c,battleSkillPlan(engine,id,skillId,c.id)))};
}
export function frontlineItemView(engine,id,itemId){
 const source=engine.state.actors[id];if(!source)return {choices:[],enabled:false};
 const sid=engine.data.items[itemId].battleSkill,skill=engine.data.skills[sid],choices=frontlineSelections(engine,source,skill,sid).map(c=>choiceView(engine,c,battleItemPlan(engine,id,itemId,c.id)));
 return {choices,enabled:choices.some(c=>c.enabled),reason:choices.some(c=>c.enabled)?'':choices[0]?.reason??'対象がありません。'};
}
export function projectFrontline(engine,actorId){
 const s=engine.state;if(!isFrontline(s))return null;const units=frontlineUnits(s);
 return {positions:clone(s.battle.frontline.positions),events:clone(s.battle.frontline.events),moves:[0,1,2].map(depth=>{const p=frontlineMovePlan(s,s.actors[actorId],{depth});return {id:`depth:${depth}`,depth,name:depthNames[depth],enabled:p.ok,reason:p.reason??''};}),units:units.map(u=>({id:unitKey(u),name:u.name??engine.data.actors[u.id].name,hp:u.hp,enemy:Boolean(u.instance),...frontPosition(s,u)})),presentation:{rowScale:[1,.85,.7],overlap:.33}};
}
