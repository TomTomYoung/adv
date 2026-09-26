import {dungeonInterior} from './world.js';
export const rosterCandidates=data=>data.game.tavern?.candidates??Object.keys(data.actors);
export const rosterOrder=(data,state)=>state.rosterOrder??rosterCandidates(data);

export function partyOrderPlan(data,state,group,actor,direction){
  if(state.mode!=='town'||dungeonInterior(data,state)||state.waiting||state.battle||!['up','down'].includes(direction))return {ok:false};
  const list=group==='party'?state.members:group==='tavern'?rosterOrder(data,state).filter(id=>!state.members.includes(id)):[];
  const index=list.indexOf(actor),target=index+(direction==='up'?-1:1);
  return index>=0&&target>=0&&target<list.length?{ok:true,other:list[target]}:{ok:false};
}

export function reorderParty(engine,group,actor,direction){
  const {data,state}=engine,plan=partyOrderPlan(data,state,group,actor,direction);
  if(!plan.ok)return false;
  // The reserve list filters the complete roster; swap only the two visible
  // neighbors so that active members never move within that saved order.
  const order=[...(group==='party'?state.members:rosterOrder(data,state))];
  const from=order.indexOf(actor),to=order.indexOf(plan.other);
  [order[from],order[to]]=[order[to],order[from]];
  if(group==='party')state.members=order;else state.rosterOrder=order;
  engine.notify(`${data.actors[actor].name}を${direction==='up'?'一つ上':'一つ下'}へ移した。`);
  return true;
}

export function validRosterOrder(data,state){
  if(state.rosterOrder===undefined)return true;
  const order=state.rosterOrder,candidates=rosterCandidates(data);
  return Array.isArray(order)&&order.length===candidates.length&&new Set(order).size===order.length&&order.every(id=>candidates.includes(id));
}
