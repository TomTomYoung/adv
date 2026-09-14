// Discrete cubic terrain. One empty cube holds three water units.
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
export function voxelDepth(state,p){return state?.water?.[voxelKey(p)]??0;}
export const depthName=depth=>['乾燥','足元まで','腰まで','完全水没'][depth]??'水深不明';
export function voxelOccupancyReason(map,state,p,{footing=true}={}){
  if(!Number.isSafeInteger(p.x)||!Number.isSafeInteger(p.y)||!Number.isSafeInteger(p.z??0)||voxelAt(map,state,p)!=='.')return '密の立方体または範囲外です。';
  if(voxelDepth(state,p)===3)return '完全水没しています。水を抜くか、水上の別の足場を使ってください。';
  if(footing&&!hasFooting(map,state,p))return '足場がありません。梯子・階段・縄などの経路を使ってください。';
  return '';
}
export function voxelRouteReason(map,state,path){
  if(!Array.isArray(path)||path.length<2)return '経路がありません。';
  for(let i=0;i<path.length;i++){
    const p=path[i],reason=voxelOccupancyReason(map,state,p,{footing:i===path.length-1});if(reason)return reason;
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
  const result=redistributeWater(map,s,map.voxels.initialWater??[]);if(result.rejected)throw Error('初期水量が密閉空間の容量を超えています');return {...s,water:result.water,drained:result.drained};
}
export function voxelMapState(data,state,map){
  if(!map?.voxels)return null;
  for(const d of Object.values(data.dungeons??{}))if(d.maps.includes(map.id)){
    const entry=Object.entries(d.systems).find(([,s])=>s.use==='voxel_space'&&s.enabled!==false&&s.maps.includes(map.id));
    if(entry)return state.dungeons?.persistent?.[d.id]?.systems?.[entry[0]]?.maps?.[map.id]??freshVoxelState(map);
  }
  return freshVoxelState(map);
}
// Minimax spill heights are geometric. We retain each parcel's origin so two basins
// separated by a high sill do not share water until the lower basin reaches that sill.
function destinations(map,state,start,cells){
  const points=new Map(cells.map(p=>[voxelKey(p),p])),costs=new Map([[voxelKey(start),(start.z??0)*3+1]]),done=new Set(),drains=[];
  while(true){let key=null,best=Infinity;for(const [k,c] of costs)if(!done.has(k)&&c<best){key=k;best=c;}if(key===null)break;
    done.add(key);const p=points.get(key);if(!p)continue;
    for(const side of Object.keys(SIX_FACES)){
      const q=neighbor(p,side);if(!faceRules(map,state,p,q).water)continue;
      const tile=voxelAt(map,state,q),cost=Math.max(best,Math.max(p.z,q.z)*3+1);
      if(tile===null){drains.push({cost,level:Math.min(p.z,q.z)*3,key:sharedFace(p,q)});continue;}
      if(tile!=='.')continue;const next=voxelKey(q);if(cost<(costs.get(next)??Infinity))costs.set(next,cost);
    }
  }
  return {cells:cells.filter(p=>costs.has(voxelKey(p))).map(p=>({key:voxelKey(p),base:p.z*3,cost:costs.get(voxelKey(p))})),drains};
}
export function redistributeWater(map,state,additions=[]){
  const cells=emptyVoxels(map,state),water={},cache=new Map();let drained=0,rejected=0;
  const parcels=[...Object.entries(state.water??{}).map(([key,amount])=>({at:voxelPoint(key),amount})),...additions].filter(p=>p.amount>0).sort((a,b)=>a.at.z-b.at.z||a.at.y-b.at.y||a.at.x-b.at.x);
  for(const parcel of parcels){
    const origin=voxelKey(parcel.at);if(voxelAt(map,state,parcel.at)!=='.'){rejected+=parcel.amount;continue;}
    if(!cache.has(origin))cache.set(origin,destinations(map,state,parcel.at,cells));const options=cache.get(origin);
    for(let unit=0;unit<parcel.amount;unit++){
      let chosen=null,head=Infinity,level=Infinity;
      for(const target of options.cells){const depth=water[target.key]??0;if(depth===3)continue;const surface=target.base+depth+1,required=Math.max(target.cost,surface);
        if(required<head||required===head&&surface<level){chosen=target;head=required;level=surface;}}
      // An open outlet wins a tie: a rim at the proposed water level cannot retain the parcel.
      for(const drain of options.drains)if(drain.cost<head||drain.cost===head&&drain.level<=level){chosen={drain:true};head=drain.cost;level=drain.level;}
      if(!chosen)rejected++;else if(chosen.drain)drained++;else water[chosen.key]=(water[chosen.key]??0)+1;
    }
  }
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
