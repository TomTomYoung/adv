import {isRecord,evaluate} from './expression.js';
import {expeditionFacility} from './world-travel.js';
import {townLocation,dungeonInterior} from './world.js';

const own=(o,k)=>typeof k==='string'&&Object.hasOwn(o??{},k);
const atShop=(data,state)=>state.mode==='town'&&!state.waiting&&!state.battle&&!state.battleResult&&!dungeonInterior(data,state)&&expeditionFacility(data,state,'shopLocation');
export const workshopCapacity=(data,state)=>state.expedition?.workshop?.upgraded?data.expedition.workshop.capacity.value:180;
export function capacityRecipePlan(data,state,camp){
 const spec=data.expedition.workshop?.capacity,w=state.expedition.workshop;
 if(!spec?.camps.includes(camp)||!state.expedition.camps[camp]?.supply)return {ok:false,reason:'この7F給油設備を修理すると製法を受け取れます。'};
 if(w?.claims.includes(camp))return {ok:false,reason:'この設備の製法は受け取り済みです。'};
 const duplicate=Boolean(w?.claims.length);
 if(duplicate&&(state.inventory[spec.duplicate.item]??0)+spec.duplicate.count>data.system.maxStack)return {ok:false,reason:'予備部材を受け取るため、袋に空きを作ってください。'};
 return {ok:true,duplicate,spec};
}
export function claimCapacityRecipe(engine,camp){
 const p=capacityRecipePlan(engine.data,engine.state,camp);if(!p.ok){engine.notify(p.reason);return false;}
 const w=engine.state.expedition.workshop??={claims:[],upgraded:false};w.claims.push(camp);
 if(p.duplicate){engine.give(p.spec.duplicate.item,p.spec.duplicate.count);engine.notify(`同じ容量の製法を予備部材（${engine.data.items[p.spec.duplicate.item].name}${p.spec.duplicate.count}個）として受け取りました。`);}
 else engine.notify(`携行容量${p.spec.value}の製法を記録しました。町の旅道具店で${p.spec.price}Gを払い、改修できます。製法は失われません。`);
 return true;
}
export function capacityUpgradePlan(data,state){
 const spec=data.expedition?.workshop?.capacity,w=state.expedition?.workshop;
 if(!spec||!atShop(data,state))return {ok:false,reason:'町の旅道具店で改修できます。'};
 if(!w?.claims.length)return {ok:false,reason:'地下水道・廃坑・庭園いずれかの7F給油設備で、製法を受け取ってください。'};
 if(w.upgraded)return {ok:false,reason:'携行容器は改修済みです。'};
 if(state.gold<spec.price)return {ok:false,reason:`${spec.price-state.gold}G足りません。`};
 return {ok:true,spec};
}
export function upgradeCapacity(engine){
 const {data,state}=engine,p=capacityUpgradePlan(data,state);if(!p.ok){engine.notify(p.reason);return false;}
 state.gold-=p.spec.price;state.expedition.workshop.upgraded=true;state.expedition.capacity=Math.max(state.expedition.capacity,p.spec.value);
 engine.notify(`携行容量が${state.expedition.capacity}単位になりました。油は給油設備または補給所の保管油から補充してください。`);return true;
}
export function weaponCraftPlan(data,state,item){
 const recipes=data.expedition?.workshop?.recipes;if(!own(recipes,item))return {ok:false,reason:'製作する武器を選んでください。'};
 const recipe=recipes[item];
 if(!atShop(data,state))return {ok:false,reason:'町の旅道具店で製作できます。'};
 if(!evaluate(recipe.condition,state))return {ok:false,reason:recipe.requirement};
 if((state.inventory[item]??0)>=data.system.maxStack)return {ok:false,reason:'この武器は所持数の上限です。'};
 if(state.gold<recipe.price)return {ok:false,reason:`${recipe.price-state.gold}G足りません。`};
 for(const [id,count] of Object.entries(recipe.materials))if((state.inventory[id]??0)<count)return {ok:false,reason:`${data.items[id].name}が${count}個必要です。`};
 return {ok:true,recipe};
}
export function craftWeapon(engine,item){
 const {data,state}=engine,p=weaponCraftPlan(data,state,item);if(!p.ok){engine.notify(p.reason);return false;}
 state.gold-=p.recipe.price;for(const [id,count] of Object.entries(p.recipe.materials))engine.give(id,-count);
 engine.give(item,1);engine.notify(`${data.items[item].name}を製作し、共通の袋へ入れました。製法は残り、何度でも製作できます。`);return true;
}
export function workshopSaveValid(data,state){
 const w=state.expedition.workshop;if(w===undefined)return true;
 const spec=data.expedition.workshop?.capacity;
 return Boolean(spec&&isRecord(w)&&Object.keys(w).every(k=>['claims','upgraded'].includes(k))&&Array.isArray(w.claims)&&w.claims.length>0&&new Set(w.claims).size===w.claims.length&&w.claims.every(id=>spec.camps.includes(id)&&state.expedition.camps[id]?.supply)&&typeof w.upgraded==='boolean');
}
export function workshopDefinitionErrors(data){
 const w=data.expedition.workshop;if(w===undefined)return [];
 const c=w?.capacity,integer=(v,min=1)=>Number.isSafeInteger(v)&&v>=min&&v<=1e9;
 if(!isRecord(w)||!isRecord(c)||c.value!==330||!integer(c.price)||!Array.isArray(c.camps)||!c.camps.length||new Set(c.camps).size!==c.camps.length||c.camps.some(id=>!data.expedition.camps.some(c=>c.id===id))||!data.items[c.duplicate?.item]||data.items[c.duplicate.item].slot||c.duplicate.item===data.expedition.oil.item||!integer(c.duplicate.count)||c.duplicate.count>data.system.maxStack||!isRecord(w.recipes))return ['expedition: 工房の定義不正'];
 for(const [id,r] of Object.entries(w.recipes))if(data.items[id]?.slot!=='weapon'||!isRecord(r)||!integer(r.price)||r.condition===undefined||typeof r.requirement!=='string'||!isRecord(r.materials)||!Object.keys(r.materials).length||Object.entries(r.materials).some(([id,n])=>!own(data.items,id)||data.items[id].slot||id===data.expedition.oil.item||!integer(n)||n>data.system.maxStack))return ['expedition: 武器製法の定義不正'];
 return [];
}
