export const faces={north:[0,-1],east:[1,0],south:[0,1],west:[-1,0]};
export const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
export const integer=(v,min=0,max=1000000)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
export const identifier=v=>typeof v==='string'&&/^[a-z][a-z0-9_]*$/.test(v)&&!['constructor','prototype','__proto__'].includes(v);
export const closeTo=(state,point)=>{
  const loc=state.location;if(!loc||loc.map!==point.map)return false;
  const [dx,dy]=faces[loc.facing]??[0,0];
  return point.x===loc.x&&point.y===loc.y||point.x===loc.x+dx&&point.y===loc.y+dy;
};
export const validPoint=(data,definition,point,tile='.')=>object(point)&&definition.maps.includes(point.map)&&integer(point.x)&&integer(point.y)&&data.maps[point.map]?.tiles[point.y]?.[point.x]===tile;
export const knownPoint=(state,point)=>point.map===state.location?.map&&(state.discovered[point.map]??[]).includes(`${point.x},${point.y}`);
export const available=(ctx,intent,plan,label)=>{const p=plan(ctx,intent);return {label,intent,enabled:p.ok&&!ctx.state.waiting&&!ctx.state.battle,reason:p.reason??''};};
