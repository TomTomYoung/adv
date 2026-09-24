import {edgeSurfaces} from './edge-layers.js';
import {fireContext} from './systems/fire-network.js';
import {objectVisible,objectBlocks} from './quest-events.js';
import {dungeonCell,dungeonBlock,dungeonWaterDepth} from './dungeons.js';
import {connectionSurfaces} from './systems/map-connections.js';
import {voxelMapState,voxelAt,faceRules,neighbor} from './voxels.js';

import {MAX_LIGHT,lightReaches,computeLightGrid} from './light-geometry.js';
export {MAX_LIGHT,lightReaches,computeLightGrid} from './light-geometry.js';
const burning=f=>Boolean(f?.lit&&(f.fuel===null||f.fuel>0));
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
// Condition evaluation needs one occupied cell, not a ViewModel or a complete
// light grid. Match the projection's occlusion and local illumination minimum.
export function currentIllumination(data,state){
  const p=state.location,map=data.maps[p?.map];if(state.mode!=='dungeon'||!map)return 0;
  const terrain=map.voxels?voxelMapState(data,state,map):null;
  const boundaries={...edgeSurfaces(data,map).occlusion,...connectionSurfaces(data,state).boundaries};
  const geometry=map.tiles.map((row,y)=>Array.from(row,(_,x)=>{
    if(map.voxels){
      const point={x,y,z:p.z??0};
      for(const side of ['north','east','south','west'])if(!faceRules(map,terrain,point,neighbor(point,side)).passage)boundaries[`${x},${y}/${side}`]=true;
    }
    const opaque=map.voxels?voxelAt(map,terrain,{x,y,z:p.z??0})!=='.':dungeonCell(data,state,map,x,y).visual.opaque||(!data.game.cellLayerVersion&&dungeonBlock(data,state,map,x,y)&&!dungeonWaterDepth(data,state,map,x,y));
    return opaque||map.objects.some(o=>o.x===x&&o.y===y&&(o.z??0)===(p.z??0)&&objectBlocks(state,map,o))?'#':'.';
  }).join(''));
  let level=map.voxels?0:dungeonCell(data,state,map,p.x,p.y).parameters.illumination??0;
  for(const source of lightSources(data,state)){
    const distance=Math.hypot(p.x-source.x,p.y-source.y),r=source.radius,peak=source.intensity??MAX_LIGHT;
    if(distance<=r&&lightReaches(geometry,boundaries,source,p.x,p.y))level=Math.max(level,Math.min(MAX_LIGHT,r===0?peak:Math.max(1,Math.round(peak-(peak-1)*distance/r))));
  }
  return level;
}
