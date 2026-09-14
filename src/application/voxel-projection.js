import {SIX_FACES,voxelMapState,voxelAt,voxelDepth,voxelKey,neighbor,faceRules,hasFooting,depthName} from '../core/voxels.js';
export function projectVoxels(engine){
  const map=engine.map();if(!map?.voxels)return {};
  const loc=engine.state.location,z=loc.z??0,terrain=voxelMapState(engine.data,engine.state,map),seen=new Set(engine.state.discovered[map.id]??[]),boundaries={};
  const cells=map.tiles.map((row,y)=>Array.from(row,(_,x)=>{
    const p={x,y,z},tile=voxelAt(map,terrain,p),depth=voxelDepth(terrain,p),edges={};
    for(const side of ['north','east','south','west']){const rules=faceRules(map,terrain,p,neighbor(p,side));edges[side]=!rules.passage;if(!rules.passage)boundaries[`${x},${y}/${side}`]=true;}
    return {x,y,z,known:seen.has(voxelKey(p)),wall:tile!=='.',blocked:!engine.walkable(map,x,y,z),water:depth>0,waterDepth:depth,waterLabel:depthName(depth),floor:hasFooting(map,terrain,p),edges};
  }));
  const geometry=cells.map(row=>row.map(c=>c.wall?'#':'.').join(''));
  const neighbors=Object.entries(SIX_FACES).map(([side])=>{const p=neighbor(loc,side),tile=voxelAt(map,terrain,p);return {side,kind:tile==='#'?'密':tile==='.'?'空':'範囲外',...faceRules(map,terrain,loc,p)};});
  return {voxel:true,z,cells,geometry,boundaries,currentCube:{waterDepth:voxelDepth(terrain,loc),waterLabel:depthName(voxelDepth(terrain,loc)),neighbors}};
}
