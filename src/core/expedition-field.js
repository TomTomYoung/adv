import {dungeonAbilityReason} from './dungeons.js';
import {measureCampRoute,campRouteText,campRouteSaveValid} from './camp-route.js';

export function expeditionFieldPlan(data,state,ability,target){
 if(!state.expedition||!state.location)return {ok:false,reason:'迷宮の探索中に使用してください。'};
 if(ability.api==='gear.wax'){
  const owners=Object.fromEntries(Object.entries(state.gear.equipped).flatMap(([actor,slots])=>Object.values(slots).map(id=>[id,actor])));
  const available=(id,c)=>c&&(!c.holder||state.members.includes(c.holder))&&(!owners[id]||state.members.includes(owners[id]));
  // A committed target is checked directly; projecting many copies must not rebuild the whole list for each one.
  if(target!==undefined){
   const copy=typeof target==='string'&&Object.hasOwn(state.gear.items,target)?state.gear.items[target]:null;
   if(!available(target,copy))return {ok:false,reason:'封蝋する装備を1個選んでください。'};
   return copy.wax?{ok:false,reason:'この個体には封蝋手当が残っています。'}:{ok:true,gear:target};
  }
  const targets=Object.entries(state.gear.items).filter(([id,c])=>available(id,c)).map(([id,c])=>({id,name:`${data.items[c.item].name}（${owners[id]?data.actors[owners[id]].name+'・装備中':c.holder?data.actors[c.holder].name+'の袋':'共通の袋'}／個体${id.slice(5)}／塩${c.salt}${c.wax?'／封蝋済み':''}）`,enabled:!c.wax}));
  return {ok:false,targets,reason:'封蝋する装備を1個選んでください。'};
 }
 return ability.api==='camp.route'?measureCampRoute(data,state):{ok:true};
}
export function applyExpeditionField(engine,ability,plan){
 if(ability.api==='gear.wax')engine.state.gear.items[plan.gear].wax=true;
 if(ability.api==='party.oil_saving')engine.state.expedition.oilSaving={remaining:60};
 if(ability.api==='camp.route')engine.state.expedition.route=plan.route;
}
export function oilStepSaved(engine){
 const {data,state}=engine,aid=state.expedition?.oilSaving,passive=engine.partyEffect('lightSaveEvery',Infinity);
 // Select one cadence; the 2-step aid never stacks with the 3-step passive.
 if(aid&&passive>=2&&!dungeonAbilityReason(data,state,'exp_oil_spark','party.oil_saving'))return (61-aid.remaining)%2===0;
 return Number.isFinite(passive)&&state.steps%passive===0;
}
export function expireOilSaving(state,aid){
 if(aid&&state.expedition?.oilSaving===aid&&--aid.remaining<=0)delete state.expedition.oilSaving;
}
export function clearExpeditionTrip(state){
 if(state.expedition){delete state.expedition.oilSaving;delete state.expedition.route;}
}
export function expeditionFieldCards(data,state){
 const cards=[],aid=state.expedition?.oilSaving;
 if(aid)cards.push({name:'節油の種火',text:`残り${aid.remaining}歩。携行灯・携帯松明の油を2歩に1回節約します。灯番の節油とは有利な方だけを適用します。${dungeonAbilityReason(data,state,'exp_oil_spark','party.oil_saving')?'この場所では効果が停止しています。残り歩数は進みます。':''}`,actions:[]});
 if(state.expedition?.route)cards.push({name:'帰路測定',text:campRouteText(data,state),actions:[]});
 return cards;
}
export function expeditionFieldSaveValid(data,state){
 const e=state.expedition,aid=e.oilSaving;
 return (aid===undefined||aid!==null&&typeof aid==='object'&&!Array.isArray(aid)&&Object.keys(aid).length===1&&Number.isInteger(aid.remaining)&&aid.remaining>=1&&aid.remaining<=60)&&(e.route===undefined||campRouteSaveValid(data,state,e.route));
}
