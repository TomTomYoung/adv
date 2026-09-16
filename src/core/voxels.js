// Cubic terrain; flood operations apply to horizontal regions, not water parcels.
export const SIX_FACES={north:[0,-1,0],east:[1,0,0],south:[0,1,0],west:[-1,0,0],up:[0,0,1],down:[0,0,-1]};
export const voxelKey=p=>`${p.x},${p.y},${p.z??0}`;
export const voxelPoint=key=>{const [x,y,z]=key.split(',').map(Number);return {x,y,z};};
export const sameVoxel=(a,b)=>a.x===b.x&&a.y===b.y&&(a.z??0)===(b.z??0);
export const neighbor=(p,side)=>{const [x,y,z]=SIX_FACES[side];return {x:p.x+x,y:p.y+y,z:(p.z??0)+z};};
export function sharedFace(a,b){return [voxelKey(a),voxelKey(b)].sort().join('/');}
export function voxelAt(map,state,p){
  if(!map?.voxels)return (p.z??0)===0?map?.tiles[p.y]?.[p.x]??null:(p.z===-1||p.z===1)&&map?.tiles[p.y]?.[p.x]!==undefined?'#':null;
  const tile=map.voxels.layers[(p.z??0)-map.voxels.minZ]?.[p.y]?.[p.x];
  return tile===undefined?null:state?.removed?.includes(voxelKey(p))?'.':tile;
}
const faceIndexes=new WeakMap();
export function clearVoxelIndex(map){faceIndexes.delete(map);}
export function faceDefinition(map,a,b){
  if(!map.voxels)return null;let index=faceIndexes.get(map);
  if(!index||index.source!==map.voxels.faces||index.count!==map.voxels.faces.length){index={source:map.voxels.faces,count:map.voxels.faces.length,faces:new Map(map.voxels.faces.map(f=>[sharedFace(f.at,neighbor(f.at,f.side)),f]))};faceIndexes.set(map,index);}
  return index.faces.get(sharedFace(a,b))??null;
}
export function faceRules(map,state,a,b){
  const f=faceDefinition(map,a,b);if(!f)return {passage:true,water:true,support:false};
  return (state?.faces?.[f.id]??f.initiallyOpen)?f.open:f.closed;
}
export function hasFooting(map,state,p){return voxelAt(map,state,neighbor(p,'down'))==='#'||faceRules(map,state,p,neighbor(p,'down')).support;}
export function voxelLevel(state,p){return state?.water?.[voxelKey(p)]??0;}
export function voxelDepth(state,p){const n=voxelLevel(state,p);return n===0?0:n<=3?1:n<=6?2:3;}
export const depthName=depth=>['乾燥','足元まで','腰まで','完全水没'][depth]??'水深不明';
export function voxelOccupancyReason(map,state,p,{footing=true,waterAccess=false}={}){
  if(!Number.isSafeInteger(p.x)||!Number.isSafeInteger(p.y)||!Number.isSafeInteger(p.z??0)||voxelAt(map,state,p)!=='.')return '密の立方体または範囲外です。';
  if(voxelLevel(state,p)>=6&&!waterAccess)return '水没度6以上です。潜水の備え、水を抜く操作、別の足場が必要です。';
  if(footing&&!hasFooting(map,state,p))return '足場がありません。梯子・階段・縄などの経路を使ってください。';
  return '';
}
export function voxelRouteReason(map,state,path,options={}){
  if(!Array.isArray(path)||path.length<2)return '経路がありません。';
  for(let i=0;i<path.length;i++){
    const p=path[i],reason=voxelOccupancyReason(map,state,p,{...options,footing:i===path.length-1});if(reason)return reason;
    if(i){const a=path[i-1];if(Math.abs(p.x-a.x)+Math.abs(p.y-a.y)+Math.abs(p.z-a.z)!==1)return '経路が六方向に接続していません。';
      if(!faceRules(map,state,a,p).passage)return '経路の境界が閉じています。';}
  }
  return '';
}
export function emptyVoxels(map,state){
  const result=[];for(let iz=0;iz<map.voxels.layers.length;iz++)for(let y=0;y<map.tiles.length;y++)for(let x=0;x<map.tiles[0].length;x++){
    const p={x,y,z:map.voxels.minZ+iz};if(voxelAt(map,state,p)==='.')result.push(p);
  }return result;
}
export function freshVoxelState(map){
  const s={faces:Object.fromEntries(map.voxels.faces.map(f=>[f.id,f.initiallyOpen])),removed:[],installed:[],water:{},drained:0};
  const result=redistributeWater(map,s,map.voxels.initialWater??[]);if(result.rejected)throw Error('初期水没操作の対象が不正です');return {...s,water:result.water,drained:result.drained};
}
export function voxelMapState(data,state,map){
  if(!map?.voxels)return null;
  for(const d of Object.values(data.dungeons??{}))if(d.maps.includes(map.id)){
    const entry=Object.entries(d.systems).find(([,s])=>s.use==='voxel_space'&&s.enabled!==false&&s.maps.includes(map.id));
    if(entry)return state.dungeons?.persistent?.[d.id]?.systems?.[entry[0]]?.maps?.[map.id]??freshVoxelState(map);
  }
  return freshVoxelState(map);
}
// Regions connect horizontally through water-permeable faces. An open top is valid.
export function floodRegions(map,state){
 const cells=emptyVoxels(map,state),byCell=new Map(),regions=[];
 for(const first of cells){if(byCell.has(voxelKey(first)))continue;
  const r={id:voxelKey(first),cells:[first],down:new Set(),outlet:false};regions.push(r);byCell.set(r.id,r);
  for(let i=0;i<r.cells.length;i++)for(const side of ['north','east','south','west']){
   const p=r.cells[i],q=neighbor(p,side),key=voxelKey(q);
   if(voxelAt(map,state,q)==='.'&&faceRules(map,state,p,q).water&&!byCell.has(key)){byCell.set(key,r);r.cells.push(q);}
  }
 }
 for(const r of regions)for(const p of r.cells){const q=neighbor(p,'down');if(!faceRules(map,state,p,q).water)continue;const tile=voxelAt(map,state,q);if(tile===null)r.outlet=true;else if(tile==='.')r.down.add(byCell.get(voxelKey(q)));}
 return {regions,byCell};
}
export function redistributeWater(map,state,operations=[]){
 const {regions,byCell}=floodRegions(map,state),levels=new Map(),water={};let drained=0,rejected=0;
 const bottoms=(r,seen=new Set())=>{if(seen.has(r))return [];seen.add(r);if(!r.down.size)return r.outlet?[]:[r];return [...r.down].flatMap(next=>bottoms(next,seen));};
 // A topology change carries a region's level downward once; it never multiplies by cell count.
 for(const r of regions){const level=Math.max(0,...r.cells.map(p=>state.water?.[voxelKey(p)]??0));if(!level)continue;
  const targets=bottoms(r);if(!targets.length){drained++;continue;}for(const target of targets)levels.set(target,Math.max(levels.get(target)??0,level));
 }
 for(const op of operations){const r=byCell.get(voxelKey(op.at));if(!r||!Number.isInteger(op.amount)||op.amount<1){rejected++;continue;}
  const targets=bottoms(r);if(!targets.length){drained++;continue;}for(const target of targets)levels.set(target,Math.min(10,(levels.get(target)??0)+op.amount));
 }
 for(const [r,level] of levels)for(const p of r.cells)if(level>0)water[voxelKey(p)]=level;
 return {water,drained,rejected};
}
export function voxelNear(state,map,p){
  const loc=state.location;if(!loc||loc.map!==map.id||(loc.z??0)!==p.z)return false;
  if(sameVoxel(loc,p))return true;const delta=SIX_FACES[loc.facing],q=neighbor(loc,loc.facing);
  return Boolean(delta)&&sameVoxel(q,p);
}
export function voxelReachableNear(map,terrain,location,point){
  if((location.z??0)!==point.z)return false;if(sameVoxel(location,point))return true;
  return sameVoxel(neighbor(location,location.facing),point)&&faceRules(map,terrain,location,point).passage;
}
export function enterVoxelMap(data,state,map){
  if(!map.voxels)return;
  const d=Object.values(data.dungeons??{}).find(d=>d.maps.includes(map.id)),entry=d&&Object.entries(d.systems).find(([,s])=>s.use==='voxel_space'&&s.enabled!==false&&s.maps.includes(map.id));
  const holder=entry&&state.dungeons?.persistent?.[d.id]?.systems?.[entry[0]];
  if(holder)holder.maps[map.id]??=freshVoxelState(map);
}
