import {canEquip} from '../core/jobs.js';
import {dungeonAbilityReason,dungeonEffectActive} from '../core/dungeons.js';
import {SHARED_BAG,heldCount,purchasePlan,equipmentPlan} from '../core/inventory.js';
import {clone} from '../core/expression.js';

export function projectInventory(engine){
  const d=engine.data,s=engine.state,busy=Boolean(s.waiting||s.battle);
  const details=(id,count)=>{
    const item=d.items[id];
    const reason=busy?'会話・戦闘が終わってから使えます。':!item.field?'探索や仕掛けで使う品物です。':!dungeonEffectActive(d,s,'item',id)||item.battleSkill&&dungeonAbilityReason(d,s,item.battleSkill,'battle.skill')?'この場所では使用できません。':'';
    return {id,count,...clone(item),useEnabled:!reason,useReason:reason,allowedActors:item.slot?s.members.filter(actor=>canEquip(d,s,actor,id)&&s.actors[actor].hp>0):s.members.slice()};
  };
  const inventory=Object.entries(s.inventory).filter(([,n])=>n>0).map(([id,count])=>details(id,count));
  const inventoryHolders=[SHARED_BAG,...s.members].map(holder=>({id:holder,items:inventory.map(item=>{
    const count=heldCount(d,s,item.id,holder);if(!count)return null;
    return {...item,count,equipmentTargets:item.slot?s.members.map(actor=>{
      const plan=equipmentPlan(engine,actor,item.id,holder),previous=s.actors[actor].equipment[item.slot];
      return {actor,allowed:canEquip(d,s,actor,item.id),enabled:plan.ok,reason:plan.reason??'',current:previous?d.items[previous].name:'なし'};
    }):[]};
  }).filter(Boolean)}));
  const shop=d.shops.goods.map(g=>{
    const item=details(g.item,s.inventory[g.item]??0),plan=purchasePlan(engine,g.item);
    return {...item,price:engine.price(g.price),basePrice:g.price,canBuy:plan.ok,reason:plan.reason??'',sharedCount:heldCount(d,s,g.item),recipients:s.members.map(actor=>({actor,equipAllowed:item.slot?canEquip(d,s,actor,g.item):null,count:heldCount(d,s,g.item,actor),equippedCount:Object.values(s.actors[actor].equipment).filter(id=>id===g.item).length}))};
  });
  return {inventory,inventoryHolders,shop};
}
