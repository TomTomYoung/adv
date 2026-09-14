import {object,integer} from './common.js';

function equipmentStats(ctx,item,stats){
  const wear=ctx.run.wear[item]??0;
  return Object.fromEntries(Object.entries(stats).map(([key,amount])=>[key,amount>0?amount-wear:amount]));
}
function battleStart(ctx){
  const equipped=new Set(ctx.state.members.filter(id=>ctx.state.actors[id].hp>0).flatMap(id=>Object.values(ctx.state.actors[id].equipment)));
  for(const item of equipped)ctx.run.wear[item]=(ctx.run.wear[item]??0)+ctx.spec.perBattle;
  // Maximum HP/MP can fall when a staff, robe or similar equipment corrodes.
  for(const actor of Object.values(ctx.state.actors)){const stats=ctx.engine.stats(actor.id);actor.hp=Math.min(actor.hp,stats.hp);actor.mp=Math.min(actor.mp,stats.mp);}
  if(equipped.size)ctx.engine.notify(`塩気で装備が腐食しました。装備の補正がさらに−${ctx.spec.perBattle}。廃坑を出ると回復します。`);
}
function project(ctx){
  const items=Object.entries(ctx.run.wear).map(([id,penalty])=>({id,name:ctx.data.items[id].name,penalty,stats:equipmentStats(ctx,id,ctx.data.items[id].stats??{})}));
  return {kind:'corrosion',id:ctx.id,title:'装備の腐食',perBattle:ctx.spec.perBattle,items,markers:[]};
}
export const corrosion={
  createPersistent:()=>({}),createRun:()=>({wear:{}}),battleStart,equipmentStats,project,
  plan:()=>({ok:false,reason:'腐食は廃坑を出ると回復します。'}),
  validate:(_data,_definition,spec)=>integer(spec.perBattle,1,100)?[]:['戦闘ごとの腐食量が不正です'],
  validateState:(spec,persistent,run,_state,data)=>{
    if(!object(persistent)||Object.keys(persistent).length)return ['腐食の永続領域が不正です'];
    if(run&&(!object(run)||!object(run.wear)||Object.keys(run).some(k=>k!=='wear')||Object.entries(run.wear).some(([id,n])=>!data.items[id]?.slot||!integer(n,1,1e9)||n%spec.perBattle!==0)))return ['装備の腐食状態が不正です'];
    return [];
  }
};
