import {integer,closeTo} from './common.js';
import {exact,idList,pointsValid,cellsValid,patchValid,patchTile,sameCell,action,markers,panel} from './environment.js';
const pockets=ctx=>[...ctx.spec.pockets,...ctx.spec.devices.filter(d=>ctx.persistent.raised.includes(d.id)).flatMap(d=>d.pockets)];
const submerged=ctx=>ctx.spec.water.some(p=>sameCell(p,ctx.state.location))&&!pockets(ctx).some(p=>sameCell(p,ctx.state.location));
function consume(ctx,n){
  if(!submerged(ctx)){ctx.run.air=ctx.spec.capacity;return;}
  ctx.run.air=Math.max(0,ctx.run.air-n);
  if(ctx.run.air===0){for(const id of ctx.state.members){const a=ctx.state.actors[id];if(a.hp>0)a.hp=Math.max(0,a.hp-Math.max(1,Math.ceil(ctx.engine.stats(id).hp*ctx.spec.suffocation)));}ctx.engine.notify('空気が尽き、隊が窒息による損傷を受けました。空気の残る区画へ戻ってください。');}
  else if(ctx.run.air<=ctx.spec.warning)ctx.engine.notify(`残り空気 ${ctx.run.air}。補給地点への帰路を確保してください。`);
}
function plan(ctx,intent){
  const device=ctx.spec.devices.find(d=>d.id===intent.target);
  if(intent.action==='raise'&&device&&closeTo(ctx.state,device)&&!ctx.persistent.raised.includes(device.id))return {ok:true,device};
  if(intent.action==='refill'&&pockets(ctx).some(p=>sameCell(p,ctx.state.location)))return {ok:true};
  return {ok:false,reason:'未作動の浮上装置か、空気の残る部屋で操作してください。'};
}
export const airSupply={createPersistent:()=>({raised:[]}),createRun:s=>({air:s.capacity}),plan,
  waterDepth:(ctx,map,x,y)=>ctx.spec.water.some(p=>sameCell(p,{map:map.id,x,y}))&&!pockets(ctx).some(p=>sameCell(p,{map:map.id,x,y}))?3:0,
  step:ctx=>consume(ctx,ctx.spec.perStep),battleStart:ctx=>consume(ctx,ctx.spec.perBattle),battleRound:ctx=>consume(ctx,ctx.spec.perRound),
  danger(ctx){if(ctx.state.members.every(id=>ctx.state.actors[id].hp<=0)){ctx.engine.defeat();return true;}return false;},
  act(ctx,intent,p){if(p.device){ctx.persistent.raised.push(p.device.id);ctx.engine.reveal();ctx.engine.notify(`${p.device.name}を作動させ、空気の補給地点と出入口を増やしました。`);}if(!submerged(ctx))ctx.run.air=ctx.spec.capacity;},
  tile:(ctx,map,x,y)=>patchTile(ctx.spec.devices.filter(d=>ctx.persistent.raised.includes(d.id)).flatMap(d=>d.tiles),map,x,y),
  project(ctx){return panel(ctx,'沈没城の空気',`空気 ${ctx.run.air}/${ctx.spec.capacity} ／ ${submerged(ctx)?'水中':'空気を補給できる区画'}。水中では移動・戦闘開始・戦闘ラウンドで消費します。`,ctx.spec.devices.filter(d=>closeTo(ctx.state,d)).map(d=>({name:d.name,text:ctx.persistent.raised.includes(d.id)?'浮上済み':'区画を浮上させ、補給地点と出入口を開きます。',actions:[action(ctx,plan,'浮上装置を動かす',{action:'raise',target:d.id})]})),{actions:[action(ctx,plan,'空気を補給する',{action:'refill'})],markers:[...markers(ctx,pockets(ctx),'息'),...markers(ctx,ctx.spec.devices,'浮')]});},
  validate(data,d,s){return !integer(s.capacity,1,1000)||!integer(s.warning,0,s.capacity)||['perStep','perBattle','perRound'].some(k=>!integer(s[k],1,s.capacity))||!Number.isFinite(s.suffocation)||s.suffocation<=0||s.suffocation>1||!cellsValid(data,d,s.water)||!pointsValid(data,d,s.pockets)||!pointsValid(data,d,s.devices)||s.devices.some(v=>!pointsValid(data,d,v.pockets)||!patchValid(data,d,v.tiles)||v.tiles.some(p=>p.tile!=='.'))?['空気・水中区画・浮上装置が不正です']:[];},
  validateState:(s,p,r)=>!exact(p,['raised'])||!idList(p.raised,s.devices.map(d=>d.id))||r&&(!exact(r,['air'])||!integer(r.air,0,s.capacity))?['空気・浮上の保存が不正です']:[]
};
