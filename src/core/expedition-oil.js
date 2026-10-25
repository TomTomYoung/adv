// Oil in the lamp, the shared reserve and sealed bottles uses one party capacity.
// Existing saves opt in at their first repaired supply point; overflow is kept
// in the supply depot rather than silently deleted.
import {ignitionReason,attemptIgnition} from './fire-hazards.js';
import {signalFieldChange} from './field-signals.js';
import {locationRoot} from './world.js';
export function oilStore(data,state,create=false){
  if(!data.worldTravel||!state.worldTravel)return state.expedition;
  const root=state.mode==='town'?locationRoot(data,state.townLocation)?.id:null;
  const town=Object.entries(data.worldTravel.settlements).find(([,s])=>s.root===root)?.[0];
  const id=town??state.worldTravel.returnAnchor;
  if(id===data.worldTravel.home)return state.expedition;
  if(create)return state.worldTravel.oilStores[id]??={storedOil:0,storedBottles:0};
  return state.worldTravel.oilStores[id]??{storedOil:0,storedBottles:0};
}
export const managesOil=state=>state.expedition?.managed===true;
export function oilFire(data,state){
  const active=state.dungeons?.active,definition=data.dungeons?.[active?.id];
  const pair=Object.entries(definition?.systems??{}).find(([,s])=>s.use==='fire_network'&&s.enabled!==false);
  return pair&&active?.systems?.[pair[0]]?{spec:pair[1],run:active.systems[pair[0]]}:null;
}
export function oilLamp(data,state){
  const fire=oilFire(data,state);
  if(fire)return {fuel:fire.run.portable?.fuel??0,effect:fire.run.portable?.effect,capacity:fire.spec.portable.capacity};
  if(state.mode==='dungeon')return {fuel:state.light,effect:state.light>0?(state.expedition?.lamp.effect??null):null,capacity:data.system.lightCapacity};
  return {...(state.expedition?.lamp??{fuel:data.system.lightCapacity,effect:null}),capacity:data.system.lightCapacity};
}
export function rememberOil(data,state){
  if(!managesOil(state)||state.mode!=='dungeon'&&!oilFire(data,state))return;
  const {fuel,effect}=oilLamp(data,state);state.expedition.lamp={fuel,effect:fuel>0?effect:null};
}
export function restoreOil(data,state){
  if(!managesOil(state))return;
  const saved=state.expedition.lamp,fire=oilFire(data,state);
  if(fire){
    const fuel=Math.min(saved.fuel,fire.spec.portable.capacity),effect=fuel>0?(fire.spec.effects[saved.effect]?saved.effect:fire.spec.portable.entryEffect):null;
    Object.assign(fire.run.portable,{lit:fuel>0,fuel,effect});
  }
  state.light=Math.min(saved.fuel,data.system.lightCapacity);
}
export function oilTotal(data,state){
  if(!managesOil(state))return 0;
  return oilLamp(data,state).fuel+state.expedition.reserve+(state.inventory[data.expedition.oil.item]??0)*data.expedition.oil.units;
}
export const oilRoom=(data,state)=>managesOil(state)?Math.max(0,state.expedition.capacity-oilTotal(data,state)):Infinity;
export function balanceOil(data,state){
  if(!managesOil(state))return;
  const e=state.expedition,{item,units}=data.expedition.oil;
  let excess=oilTotal(data,state)-e.capacity;
  if(excess>0){
    const depot=oilStore(data,state,true);
    const bottles=Math.min(state.inventory[item]??0,Math.ceil(excess/units));
    if(bottles){state.inventory[item]-=bottles;depot.storedBottles=Math.min(1e9,depot.storedBottles+bottles);excess-=bottles*units;}
    if(excess>0){const n=Math.min(e.reserve,excess);e.reserve-=n;depot.storedOil=Math.min(1e9,depot.storedOil+n);}
  }
  rememberOil(data,state);
}
export function enableOil(data,state){
  if(managesOil(state))return;
  const {fuel,effect}=oilLamp(data,state);state.expedition.lamp={fuel,effect};state.expedition.managed=true;balanceOil(data,state);
}
export function oilFuelPlan(data,state,needed){
  if(!managesOil(state))return null;
  if(state.expedition.reserve>0)return {ok:true,oilCost:Math.min(needed,state.expedition.reserve),fuelCost:false};
  return (state.inventory[data.expedition.oil.item]??0)>0?{ok:true,oilCost:0,fuelCost:true}:{ok:false,reason:'予備油がありません。修理した給油設備で汲むか、灯油を用意してください。'};
}
export function useReserve(engine){
  const {data,state}=engine,e=state.expedition;
  if(!managesOil(state)||state.mode!=='dungeon'||state.waiting||state.battle)return false;
  const fire=oilFire(data,state);if(fire)return false; // Fire-network ignition uses its own hazard checks.
  if(!e.reserve||state.light>=data.system.lightCapacity)return false;
  const reason=ignitionReason(data,state);if(reason){engine.notify(reason);return false;}
  const n=Math.min(e.reserve,data.system.lightCapacity-state.light);e.reserve-=n;
  if(!attemptIgnition(engine))return true;
  state.light+=n;rememberOil(data,state);signalFieldChange(data,state,'light');
  engine.notify(`携行灯へ油を${n}単位補充しました。`);return true;
}
