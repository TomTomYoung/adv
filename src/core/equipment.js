// Equipment definitions stay item IDs; physical copies have stable identities and statuses.
export const freshGear=()=>({next:1,items:{},bag:{},equipped:{}});
export function addGear(state,item,count){
 const g=state.gear,bag=g.bag[item]??=[];
 if(count>0)for(let i=0;i<count;i++){const id=`gear_${g.next++}`;g.items[id]={item,salt:0};bag.push(id);}
 else for(let i=0;i<-count;i++){const id=bag.pop();if(!id)throw Error('装備個体の所持数が一致しません');delete g.items[id];}
}
export function equipGear(state,actor,slot,item){
 const g=state.gear,bag=g.bag[item]??[];if(!bag.length)throw Error('装備個体がありません');
 bag.sort((a,b)=>g.items[a].salt-g.items[b].salt);const next=bag.shift(),slots=g.equipped[actor]??={};
 if(slots[slot]){const old=slots[slot];(g.bag[g.items[old].item]??=[]).push(old);}
 slots[slot]=next;
}
export function unequipGear(state,actor,slot){
 const g=state.gear,id=g.equipped[actor]?.[slot];if(!id)return;
 (g.bag[g.items[id].item]??=[]).push(id);delete g.equipped[actor][slot];
}
export function destroyGear(state,id){
 const g=state.gear,copy=g.items[id];if(!copy)return;
 const bag=g.bag[copy.item]??[],at=bag.indexOf(id);
 if(at>=0){bag.splice(at,1);state.inventory[copy.item]--;}
 else for(const [actor,slots] of Object.entries(g.equipped))for(const [slot,key] of Object.entries(slots))if(key===id){delete slots[slot];delete state.actors[actor].equipment[slot];}
 delete g.items[id];
}
export function gearErrors(data,state){
 const g=state.gear;if(!g||!Number.isSafeInteger(g.next)||g.next<1||!g.items||!g.bag||!g.equipped)return ['装備個体の保存がありません'];
 const errors=[],seen=new Set(),check=(id,item)=>{if(seen.has(id)||!g.items[id]||g.items[id].item!==item)errors.push('装備個体の所在・種類が不一致です');seen.add(id);};
 for(const [item,list] of Object.entries(g.bag)){if(!data.items[item]?.slot||!Array.isArray(list)){errors.push('装備袋が不正です');continue;}if(list.length!==(state.inventory[item]??0))errors.push('装備袋の個数が不一致です');for(const id of list)check(id,item);}
 for(const [item,n] of Object.entries(state.inventory))if(data.items[item]?.slot&&(g.bag[item]?.length??0)!==n)errors.push('装備袋が不足しています');
 for(const [actor,a] of Object.entries(state.actors))for(const [slot,item] of Object.entries(a.equipment))check(g.equipped[actor]?.[slot],item);
 for(const [actor,slots] of Object.entries(g.equipped))for(const slot of Object.keys(slots))if(!state.actors[actor]?.equipment[slot])errors.push('所在不明の装備です');
 for(const [id,c] of Object.entries(g.items))if(!/^gear_[1-9]\d*$/.test(id)||Number(id.slice(5))>=g.next||!data.items[c.item]?.slot||!Number.isSafeInteger(c.salt)||c.salt<0||c.salt>1e9||!seen.has(id))errors.push('装備個体・塩状態が不正です');
 return errors;
}
