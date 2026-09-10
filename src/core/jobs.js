import {buffStats} from './buffs.js';
export const STAT_KEYS=['hp','mp','str','vit','agi','int'];
export const FIELD_APIS=new Set(['map.reveal','inventory.convert']);
export const SKILL_EFFECTS=new Set(['damage','heal','guard','status','cleanse','drain_mp','restore_mp','buff','cover','analyze']);
const owns=(obj,key)=>typeof key==='string'&&Object.hasOwn(obj??{},key);
export const actorJob=(data,state,id)=>data.jobs?.[state.actors[id]?.job]??null;
export const passives=(data,state,id)=>actorJob(data,state,id)?.passives??{};
export function actorStats(data,state,id,battle=true){
  const actor=state.actors[id],def=data.actors[id];
  if(!actor||!def)throw new Error(`不明な隊員: ${id}`);
  const stats={...def.stats};
  if(data.jobs){
    const job=actorJob(data,state,id);if(!job)throw new Error(`不明な職業: ${actor.job}`);
    for(const key of STAT_KEYS){
      let growth=0;
      for(const [history,count] of Object.entries(actor.growthHistory??{})){
        const rate=history==='legacy'?data.jobProfile.legacyGrowth:data.jobs[history]?.growth;
        if(!rate)throw new Error(`不明な成長履歴: ${history}`);
        growth+=(rate[key]??0)*count;
      }
      // Round once, after summing fractional growth across jobs.
      stats[key]+=(Math.floor(growth+1e-9)+(job.stats[key]??0));
    }
  }else for(const [key,rate] of Object.entries(data.system.growth))stats[key]=(stats[key]??0)+rate*(state.level-1);
  for(const item of Object.values(actor.equipment))for(const [key,amount] of Object.entries(data.items[item]?.stats??{}))stats[key]=(stats[key]??0)+amount;
  for(const key of STAT_KEYS)stats[key]=Math.max(key==='hp'?1:0,Math.floor(stats[key]));
  return battle?buffStats(data,state.battle,`actor:${id}`,stats):stats;
}
export function initializeJob(data,actor){
  actor.job=data.actors[actor.id].initialJob;actor.growthHistory={};
}
export function recordGrowth(data,state,count){
  if(!data.jobs||!count)return;
  for(const actor of Object.values(state.actors))actor.growthHistory[actor.job]=(actor.growthHistory[actor.job]??0)+count;
}
export function canEquip(data,state,id,itemId,jobId=state.actors[id]?.job){
  const item=data.items[itemId];if(!item?.slot)return false;
  if(!data.jobs)return true;
  return Boolean(data.jobs[jobId]?.equipment[item.slot]?.includes(item.equipmentType));
}
export function jobChangePlan(data,state,id,jobId){
  if(state.mode!=='town'||state.waiting||state.battle)return {ok:false,reason:'転職は町の会話・戦闘が終わってから行えます。'};
  if(!owns(data.actors,id)||!state.actors[id]||!owns(data.jobs,jobId))return {ok:false,reason:'人物または職業がありません。'};
  const actor=state.actors[id];if(actor.job===jobId)return {ok:false,reason:'現在の職業です。'};
  const inventory={...state.inventory},equipment={...actor.equipment},returned=[];
  for(const [slot,item] of Object.entries(equipment))if(!canEquip(data,state,id,item,jobId)){
    const count=(inventory[item]??0)+1;if(count>data.system.maxStack)return {ok:false,reason:`${data.items[item].name}の袋が満杯です。先に空きを作ってください。`};
    inventory[item]=count;delete equipment[slot];returned.push(item);
  }
  const candidate={...state,actors:{...state.actors,[id]:{...actor,job:jobId,equipment}}};
  return {ok:true,inventory,equipment,returned,stats:actorStats(data,candidate,id,false)};
}
export function changeJob(engine,id,jobId){
  const plan=jobChangePlan(engine.data,engine.state,id,jobId);if(!plan.ok){engine.notify(plan.reason);return false;}
  const actor=engine.state.actors[id];actor.job=jobId;actor.equipment=plan.equipment;engine.state.inventory=plan.inventory;
  actor.hp=Math.min(actor.hp,plan.stats.hp);actor.mp=Math.min(actor.mp,plan.stats.mp);
  engine.notify(`${engine.data.actors[id].name}は${engine.data.jobs[jobId].name}に転職しました。${plan.returned.length?'適合しない装備は袋に戻しました。':''}`);
  return true;
}
export function grantsFor(data,state,id){
  const job=actorJob(data,state,id);if(!job)return [];
  const common=data.jobProfile.commonSkills.map(skill=>({skill,level:1,api:'battle.skill',target:data.skills[skill].target,maxTargets:1,lifetime:'equipped'}));
  return [...common,...job.grants];
}
export function knownSkills(data,state,id){
  if(!data.jobs)return [...data.actors[id].skills];
  return grantsFor(data,state,id).filter(g=>g.api==='battle.skill'&&state.level>=g.level).map(g=>g.skill);
}
export function permission(data,state,id,skill,api){
  const spec=api==='battle.skill'?data.skills[skill]:data.fieldAbilities[skill];
  return grantsFor(data,state,id).find(g=>g.skill===skill&&g.api===api&&g.target===spec?.target&&g.lifetime==='equipped'&&state.level>=g.level)??null;
}
export function costProblem(data,state,id,spec){
  const a=state.actors[id];if(!a||a.hp<=0)return '倒れている仲間は使用できません。';
  if(!Number.isInteger(spec.mp)||spec.mp<0||!Number.isInteger(spec.hp??0)||(spec.hp??0)<0)return '消費定義が不正です。';
  if(a.mp<spec.mp)return `MPが${spec.mp}必要です。`;
  if(a.hp<=(spec.hp??0))return `HPが${spec.hp}より多く必要です。`;
  if(spec.weaponTypes&&!spec.weaponTypes.includes(data.items[a.equipment.weapon]?.equipmentType))return '対応する種類の武器を装備してください。';
  if(spec.equippedItem&&!Object.values(a.equipment).includes(spec.equippedItem))return `${data.items[spec.equippedItem]?.name??spec.equippedItem}の装備が必要です。`;
  for(const [item,count] of Object.entries(spec.materials??{})){
    if(!owns(data.items,item)||!Number.isInteger(count)||count<1)return '材料定義が不正です。';
    if((state.inventory[item]??0)<count)return `${data.items[item].name}が${count}個必要です。`;
  }
  return '';
}
export function payCost(engine,id,spec){
  // Call only after permission, all targets, equipment and output capacity passed.
  const a=engine.state.actors[id];a.mp-=spec.mp;a.hp-=spec.hp??0;
  for(const [item,count] of Object.entries(spec.materials??{}))engine.state.inventory[item]-=count;
}
export function partyEffect(data,state,key,neutral=1,mode='min'){
  const values=state.members.filter(id=>state.actors[id].hp>0).map(id=>passives(data,state,id)[key]).filter(v=>v!==undefined);
  return (mode==='min'?Math.min:Math.max)(neutral,...values);
}
export const purchasePrice=(data,state,price)=>Math.ceil(price*(1-partyEffect(data,state,'shopDiscount',0,'max')));
export function fieldActionPlan(data,state,id,abilityId){
  const ability=data.fieldAbilities?.[abilityId];
  if(!ability||!FIELD_APIS.has(ability.api)||!permission(data,state,id,abilityId,ability.api))return {ok:false,reason:'この探索特技は習得していません。'};
  if(state.waiting||state.battle||!ability.modes.includes(state.mode)||!state.members.includes(id))return {ok:false,reason:'この場所・状態では使用できません。'};
  const reason=costProblem(data,state,id,ability);if(reason)return {ok:false,reason};
  if(ability.api==='map.reveal'&&(!state.location||!Number.isInteger(ability.radius)||ability.radius<1||ability.radius>8))return {ok:false,reason:'測量できる場所ではありません。'};
  const inventory={...state.inventory};
  for(const [item,count] of Object.entries(ability.materials??{}))inventory[item]-=count;
  for(const [item,count] of Object.entries(ability.output??{})){
    if(!owns(data.items,item)||!Number.isInteger(count)||count<1)return {ok:false,reason:'出力定義が不正です。'};
    inventory[item]=(inventory[item]??0)+count;
    if(inventory[item]>data.system.maxStack)return {ok:false,reason:`${data.items[item].name}の袋が満杯です。`};
  }
  return {ok:true,ability,inventory};
}
export function fieldAction(engine,id,abilityId){
  const plan=fieldActionPlan(engine.data,engine.state,id,abilityId);if(!plan.ok){engine.notify(plan.reason);return false;}
  payCost(engine,id,plan.ability);engine.state.inventory=plan.inventory;
  if(plan.ability.api==='map.reveal')engine.reveal(plan.ability.radius);
  engine.eventCue(plan.ability.cue);engine.notify(`${engine.data.actors[id].name}は${plan.ability.name}を使いました。`);return true;
}
