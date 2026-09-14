import {closeTo,integer} from './common.js';
import {empty,exact,pointsValid,action,markers,panel} from './environment.js';
function plan(ctx,intent){
  const portal=ctx.spec.portals.find(p=>p.id===intent.target),destination=ctx.spec.portals.find(p=>p.id===portal?.destination);
  if(intent.action!=='warp'||!portal||!destination||!closeTo(ctx.state,portal))return {ok:false,reason:'足元か正面の鏡を選んでください。'};
  return {ok:true,portal,destination};
}
export const warpNetwork={createPersistent:()=>({}),createRun:()=>({uses:0}),plan,
  act(ctx,intent,p){const d=p.destination;if(!ctx.engine.walkable(ctx.data.maps[d.map],d.x,d.y)){ctx.engine.notify('移動先が塞がれています。');return;}ctx.run.uses++;ctx.engine.teleport(d.map,d.x,d.y,d.facing??'north');ctx.engine.notify(`${p.portal.name}から${d.name}へ移りました。`);},
  project(ctx){return panel(ctx,'鏡の転移網','鏡の前で移動先を確かめ、接続を組み合わせて探索します。',ctx.spec.portals.filter(p=>closeTo(ctx.state,p)).map(p=>({name:p.name,text:`移動先：${ctx.spec.portals.find(d=>d.id===p.destination).name}`,actions:[action(ctx,plan,'鏡を通る',{action:'warp',target:p.id})]})),{markers:markers(ctx,ctx.spec.portals,'鏡')});},
  validate(data,d,s){return !pointsValid(data,d,s.portals)||s.portals.some(p=>p.id===p.destination||!s.portals.some(t=>t.id===p.destination)||p.facing!==undefined&&!['north','east','south','west'].includes(p.facing))?['鏡の座標・接続先が不正です']:[];},
  validateState:(s,p,r)=>!empty(p)||r&&(!exact(r,['uses'])||!integer(r.uses,0,1e9))?['鏡の保存が不正です']:[]
};
