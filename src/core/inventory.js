import {canEquip} from './jobs.js';
import {townLocation} from './world.js';

export const SHARED_BAG='shared';
export const validHolder=(state,id)=>id===SHARED_BAG||state.members.includes(id);
export const holderName=(data,id)=>id===SHARED_BAG?'共通の袋':data.actors[id]?.name??'';
export function heldGear(state,item,holder){
  return (state.gear.bag[item]??[]).filter(id=>holder===undefined||(state.gear.items[id].holder??SHARED_BAG)===holder);
}
export function heldCount(data,state,item,holder=SHARED_BAG){
  if(data.items[item]?.slot)return heldGear(state,item,holder).length;
  if(holder!==SHARED_BAG)return state.carried?.[holder]?.[item]??0;
  return (state.inventory[item]??0)-Object.values(state.carried??{}).reduce((n,items)=>n+(items[item]??0),0);
}
function carry(state,holder,item,count){
  if(holder===SHARED_BAG)return;
  const items=(state.carried??={})[holder]??={};
  const next=(items[item]??0)+count;if(next>0)items[item]=next;else delete items[item];
  if(!Object.keys(items).length)delete state.carried[holder];
}
export function moveHolding(data,state,item,from,to,count=1){
  if(data.items[item].slot){
    for(const id of heldGear(state,item,from).sort((a,b)=>state.gear.items[a].salt-state.gear.items[b].salt).slice(0,count)){
      if(to===SHARED_BAG)delete state.gear.items[id].holder;else state.gear.items[id].holder=to;
    }
  }else{carry(state,from,item,-count);carry(state,to,item,count);}
}
// Inventory is the party total used by scripts. Ownership partitions that total;
// rewards go to the shared bag, and shared costs use it before personal supplies.
export function settleHoldings(data,state,{item,source,spent=0}={}){
  state.carried??={};
  if(item&&!data.items[item]?.slot&&source&&source!==SHARED_BAG&&spent>0)carry(state,source,item,-spent);
  for(const actor of Object.keys(state.carried))if(!state.members.includes(actor))delete state.carried[actor];
  const items=new Set([...Object.keys(state.inventory),...Object.values(state.carried).flatMap(items=>Object.keys(items))]);
  for(const item of items){
    const total=state.inventory[item]??0;
    if(data.items[item]?.slot)continue;
    let excess=Object.values(state.carried).reduce((n,items)=>n+(items[item]??0),0)-total;
    for(const actor of state.members){if(excess<=0)break;const take=Math.min(excess,state.carried[actor]?.[item]??0);carry(state,actor,item,-take);excess-=take;}
  }
  for(const copy of Object.values(state.gear.items))if(copy.holder&&!state.members.includes(copy.holder))delete copy.holder;
}
export function purchasePlan(engine,item,actor=SHARED_BAG){
  const s=engine.state,d=engine.data,stock=d.shops.goods.find(g=>g.item===item);
  if(s.mode!=='town'||s.waiting||s.battle||d.game.world&&!townLocation(d,s)?.shop)return {ok:false,reason:'ショップで購入できます。'};
  if(!stock||!validHolder(s,actor))return {ok:false,reason:'品物または渡す相手を選び直してください。'};
  const price=engine.price(stock.price);
  if(s.gold<price)return {ok:false,reason:`${price-s.gold} G足りません。`};
  if((s.inventory[item]??0)>=d.system.maxStack)return {ok:false,reason:'この品物は所持数の上限です。'};
  return {ok:true,price};
}
export function transferPlan(engine,item,from,to,count=1){
  const s=engine.state,d=engine.data;
  if(s.waiting||s.battle)return {ok:false,reason:'会話・戦闘が終わってから受け渡せます。'};
  if(!Object.hasOwn(d.items,item)||!validHolder(s,from)||!validHolder(s,to)||from===to||!Number.isSafeInteger(count)||count<1)return {ok:false,reason:'受け渡す品物・相手・個数を選び直してください。'};
  if(heldCount(d,s,item,from)<count)return {ok:false,reason:'渡す品物が足りません。'};
  return {ok:true};
}
export function equipmentPlan(engine,actorId,itemId,source){
  const s=engine.state,d=engine.data,item=d.items[itemId],actor=s.actors[actorId];
  if(s.waiting||s.battle)return {ok:false,reason:'会話・戦闘中は装備を変更できません。'};
  if(!s.members.includes(actorId)||!item?.slot||!actor)return {ok:false,reason:'装備する仲間と品物を選び直してください。'};
  if(!canEquip(d,s,actorId,itemId))return {ok:false,reason:'今の職業では装備できません。'};
  if(actor.hp<=0)return {ok:false,reason:'倒れているため装備できません。'};
  if(source!==undefined&&!validHolder(s,source)||!heldGear(s,itemId,source).length)return {ok:false,reason:'装備する品物を持っていません。'};
  const previous=actor.equipment[item.slot];
  if(previous&&previous!==itemId&&(s.inventory[previous]??0)>=d.system.maxStack)return {ok:false,reason:'外す装備の所持数が上限です。'};
  return {ok:true};
}
export function carriedErrors(data,state){
  const c=state.carried;if(c===undefined)return []; // Existing saves begin with a shared bag.
  if(!c||typeof c!=='object'||Array.isArray(c))return ['持ち物の所在が不正です'];
  const errors=[],totals={};
  for(const [actor,items] of Object.entries(c)){
    if(!state.members.includes(actor)||!items||typeof items!=='object'||Array.isArray(items)){errors.push('持ち物の保持者が不正です');continue;}
    for(const [item,n] of Object.entries(items)){
      if(!Object.hasOwn(data.items,item)||data.items[item].slot||!Number.isSafeInteger(n)||n<=0||n>data.system.maxStack)errors.push('個人の持ち物が不正です');
      totals[item]=(totals[item]??0)+n;
    }
  }
  for(const [item,n] of Object.entries(totals))if(n>(state.inventory[item]??0))errors.push('個人の持ち物が隊の所持数を超えています');
  return errors;
}
