import {fireContext} from './systems/fire-network.js';
import {objectVisible} from './quest-events.js';

export const MAX_LIGHT=8;
const burning=f=>Boolean(f?.lit&&(f.fuel===null||f.fuel>0));
// Center-to-center Euclidean falloff, clipped by walls, closed doors and voxel faces.
export function lightReaches(geometry,boundaries,source,x,y){
  let cx=source.x,cy=source.y;if(cx===x&&cy===y)return true;
  const dx=x-cx,dy=y-cy,sx=Math.sign(dx),sy=Math.sign(dy),ax=dx?1/Math.abs(dx):Infinity,ay=dy?1/Math.abs(dy):Infinity;
  let tx=ax/2,ty=ay/2;
  const closed=(x,y,side)=>Boolean(boundaries[`${x},${y}/${side}`]);
  const ex=sx>0?'east':'west',ey=sy>0?'south':'north';
  while(cx!==x||cy!==y){
    if(Math.abs(tx-ty)<1e-9){
      if(closed(cx,cy,ex)||closed(cx,cy,ey)||geometry[cy]?.[cx+sx]!=='.'||geometry[cy+sy]?.[cx]!=='.'||closed(cx+sx,cy,ey)||closed(cx,cy+sy,ex))return false;
      cx+=sx;cy+=sy;tx+=ax;ty+=ay;
    }else if(tx<ty){if(closed(cx,cy,ex))return false;cx+=sx;tx+=ax;}
    else{if(closed(cx,cy,ey))return false;cy+=sy;ty+=ay;}
    if(cx===x&&cy===y)return true; // The first wall face receives light, cells behind it do not.
    if(geometry[cy]?.[cx]!=='.')return false;
  }
  return true;
}
export function computeLightGrid(geometry,sources,boundaries={}){
  const grid=geometry.map(row=>Array(row.length).fill(0));
  for(const source of sources){
    const r=source.radius,peak=source.intensity??MAX_LIGHT;
    for(let y=Math.max(0,source.y-r);y<=Math.min(grid.length-1,source.y+r);y++)for(let x=Math.max(0,source.x-r);x<=Math.min(grid[y].length-1,source.x+r);x++){
      const distance=Math.hypot(x-source.x,y-source.y);if(distance>r)continue;
      const level=r===0?peak:Math.max(1,Math.round(peak-(peak-1)*distance/r));
      if(level>grid[y][x]&&lightReaches(geometry,boundaries,source,x,y))grid[y][x]=Math.min(MAX_LIGHT,level);
    }
  }
  return grid;
}
export function lightSources(data,state){
  const loc=state.location;if(state.mode!=='dungeon'||!loc)return [];
  const sources=[],ctx=fireContext(data,state),z=loc.z??0,map=data.maps[loc.map];
  if(ctx){
    if(burning(ctx.run.portable)&&state.inventory[ctx.spec.portable.item]>0)sources.push({id:'portable',x:loc.x,y:loc.y,z,radius:4,intensity:8});
    for(const f of ctx.spec.fixtures)if(f.map===loc.map&&(f.z??0)===z&&burning(ctx.persistent.fixtures[f.id]))sources.push({id:f.id,x:f.x,y:f.y,z,radius:f.radius,intensity:8});
  }else if(state.light>0)sources.push({id:'lantern',x:loc.x,y:loc.y,z,radius:4,intensity:8});
  for(const o of map.objects)if(o.fire&&(o.z??0)===z&&objectVisible(state,map,o)&&o.fire.litStates.includes(state.objects[`${map.id}/${o.id}`]??o.initialState))sources.push({id:o.id,x:o.x,y:o.y,z,radius:o.fire.radius,intensity:8});
  return sources;
}
export function fieldLighting(data,state,geometry,boundaries={}){
  const sources=lightSources(data,state),levels=computeLightGrid(geometry,sources,boundaries),p=state.location;
  return {max:MAX_LIGHT,current:levels[p.y]?.[p.x]??0,levels,sources};
}
