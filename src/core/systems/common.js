export const faces={north:[0,-1],east:[1,0],south:[0,1],west:[-1,0]};
export const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
export const integer=(v,min=0,max=1000000)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
export const identifier=v=>typeof v==='string'&&/^[a-z][a-z0-9_]*$/.test(v)&&!['constructor','prototype','__proto__'].includes(v);
export const closeTo=(state,point)=>{
  const loc=state.location;if(!loc||loc.map!==point.map||(loc.z??0)!==(point.z??0))return false;
  if(point.edge)return point.x===loc.x&&point.y===loc.y&&point.edge===loc.facing;
  const [dx,dy]=faces[loc.facing]??[0,0];
  return point.x===loc.x&&point.y===loc.y||point.x===loc.x+dx&&point.y===loc.y+dy;
};
export const validPoint=(data,definition,point,tile='.')=>object(point)&&definition.maps.includes(point.map)&&integer(point.x)&&integer(point.y)&&data.maps[point.map]?.tiles[point.y]?.[point.x]===tile;
export const knownPoint=(state,point)=>point.map===state.location?.map&&(state.discovered[point.map]??[]).includes(`${point.x},${point.y}`);
export function actionConsumes(ctx,intent,p){
  if(intent.item||p.fuelCost||p.ability?.mp>0||p.ability?.hp>0||Object.values(p.ability?.materials??{}).some(n=>n>0)||p.offer?.gold>0||p.inventory&&Object.entries(ctx.state.inventory).some(([id,n])=>(p.inventory[id]??0)<n))return true;
  return !['open','close','cross','warp','shift','collect','supplies','extinguish','harvest','return','disconnect','ride','lure','refill','toggle','raise'].includes(intent.action);
}
export const available=(ctx,intent,plan,label)=>{const p=plan(ctx,intent);return {label,intent,enabled:p.ok&&!ctx.state.waiting&&!ctx.state.battle,reason:p.reason??'',consumes:actionConsumes(ctx,intent,p)};};
