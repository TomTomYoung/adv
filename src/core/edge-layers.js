// Shared two-dimensional boundaries. Both adjacent cells address one placement.
export const edgeSides=['north','east','south','west'];
export const edgeDelta={north:[0,-1],east:[1,0],south:[0,1],west:[-1,0]};
export function edgeKey(x,y,side){
 if(!Number.isInteger(x)||!Number.isInteger(y)||!edgeSides.includes(side))return null;
 return side==='north'?`h:${x},${y}`:side==='south'?`h:${x},${y+1}`:side==='west'?`v:${x},${y}`:`v:${x+1},${y}`;
}
export function edgePoint(key){const m=/^([hv]):(0|[1-9]\d*),(0|[1-9]\d*)$/.exec(key);return m?{axis:m[1],x:Number(m[2]),y:Number(m[3])}:null;}
export function edgeInBounds(key,width,height){const p=edgePoint(key);return Boolean(p&&p.x>=0&&p.y>=0&&(p.axis==='h'?p.x<width&&p.y<=height:p.x<=width&&p.y<height));}
export function edgeFaces(key,width,height){const p=edgePoint(key);if(!p)return [];return (p.axis==='h'?[{x:p.x,y:p.y-1,side:'south'},{x:p.x,y:p.y,side:'north'}]:[{x:p.x-1,y:p.y,side:'east'},{x:p.x,y:p.y,side:'west'}]).filter(p=>p.x>=0&&p.y>=0&&p.x<width&&p.y<height);}
export const mergeEdgeLayers=(base,patch={})=>({...base,...patch,visual:{...base.visual,...patch.visual},parameters:{...base.parameters,...patch.parameters}});
export function authoredEdge(data,map,x,y,side){const placement=map?.cells?.edges?.[edgeKey(x,y,side)];if(!placement)return null;const preset=data.edgeTypes?.[placement.preset];return preset?mergeEdgeLayers(preset,placement.overrides):null;}
export function edgeBetween(data,map,from,to){const dx=to.x-from.x,dy=to.y-from.y;return Math.abs(dx)+Math.abs(dy)===1?authoredEdge(data,map,from.x,from.y,dx===1?'east':dx===-1?'west':dy===1?'south':'north'):null;}
export function edgeSurfaces(data,map){
 const boundaries={},occlusion={},edges={};if(!map?.cells?.edges)return {boundaries,occlusion,edges};
 for(const [key,p] of Object.entries(map.cells.edges)){const base=data.edgeTypes?.[p.preset];if(!base)continue;const value=mergeEdgeLayers(base,p.overrides);
  for(const f of edgeFaces(key,map.tiles[0].length,map.tiles.length)){const address=`${f.x},${f.y}/${f.side}`;edges[address]=value;if(value.visual.wall)boundaries[address]=true;if(value.visual.opaque)occlusion[address]=true;}
 }return {boundaries,occlusion,edges};
}
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const keys=(v,allowed)=>object(v)&&Object.keys(v).every(k=>allowed.includes(k));
export function edgeLayersValid(data,v,partial=false){
 if(!keys(v,['name','description','passage','visual','parameters']))return false;
 if(['name','description'].some(k=>v[k]!==undefined&&(typeof v[k]!=='string'||!v[k].trim())))return false;
 if((!partial||v.passage!==undefined)&&!['.','#'].includes(v.passage))return false;
 if(!partial||v.visual!==undefined){const a=v.visual;if(!keys(a,['wall','opaque','surface','image'])||['wall','opaque'].some(k=>(!partial||a[k]!==undefined)&&typeof a[k]!=='boolean')||a.surface!==undefined&&!['stone','wood','rock','salt'].includes(a.surface)||a.image!==undefined&&a.image!==null&&!Object.hasOwn(data.assets?.images??{},a.image))return false;}
 if(!partial||v.parameters!==undefined){const p=v.parameters;if(!keys(p,['water_passable'])||(!partial||p.water_passable!==undefined)&&typeof p.water_passable!=='boolean')return false;}
 return true;
}
export function edgePlacementErrors(presets,placement,width,height,assets={images:{}}){
 const errors=[];for(const [key,p] of Object.entries(placement??{})){
  if(!edgeInBounds(key,width,height))errors.push(`${key}: エッジがマップ範囲外です。`);
  if(!keys(p,['preset','overrides'])||!Object.hasOwn(presets??{},p.preset))errors.push(`${key}: エッジ種がありません。`);
  else if(p.overrides!==undefined&&!edgeLayersValid({assets},p.overrides,true))errors.push(`${key}: エッジの個別設定が不正です。`);
 }return errors;
}
