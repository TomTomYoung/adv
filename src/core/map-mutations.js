import {cellLayersValid} from './cell-layers.js';
import {edgePlacementErrors} from './edge-layers.js';
import {signalFieldChange} from './field-signals.js';
const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
export function mapPatchErrors(data,patch){
  if(!record(patch)||Object.keys(patch).some(k=>!['map','x','y','preset','edge','object','state'].includes(k)))return ['地形変更の形式が不正です'];
  const map=data.maps[patch.map];if(!map||map.voxels)return ['地形変更先の2Dマップがありません'];
  if(patch.object!==undefined){
    if(Object.keys(patch).some(k=>!['map','object','state'].includes(k))||!map.objects.some(o=>o.id===patch.object)||typeof patch.state!=='string'||!patch.state)return ['変更する配置物・状態が不正です'];
  }else if(patch.edge!==undefined){
    if(Object.keys(patch).some(k=>!['map','edge','preset'].includes(k))||edgePlacementErrors(data.edgeTypes,{[patch.edge]:{preset:patch.preset}},map.tiles[0].length,map.tiles.length,data.assets).length)return ['変更するエッジ・種類が不正です'];
  }else if(!Number.isInteger(patch.x)||!Number.isInteger(patch.y)||patch.x<1||patch.y<1||patch.x>=map.tiles[0].length-1||patch.y>=map.tiles.length-1||!cellLayersValid(data,data.cellTypes?.[patch.preset])||data.cellTypes[patch.preset].passage==='#'&&(map.entrance.x===patch.x&&map.entrance.y===patch.y||map.objects.some(o=>o.x===patch.x&&o.y===patch.y)))return ['変更するセル・種類が不正です（入口・配置物を埋めることはできません）'];
  return [];
}
export function applyMapPatch(engine,patch){
  const errors=mapPatchErrors(engine.data,patch);if(errors.length)throw Error(errors.join('\n'));
  const {state,data}=engine,loc=state.location;
  if(patch.x===loc?.x&&patch.y===loc?.y&&patch.map===loc?.map&&data.cellTypes[patch.preset]?.passage==='#'){engine.notify('足元には障害物を作れません。');return false;}
  if(patch.object!==undefined)state.objects[`${patch.map}/${patch.object}`]=patch.state;
  else{
    const changes=state.mapChanges??={cells:{},edges:{}};
    if(patch.edge!==undefined)changes.edges[`${patch.map}/${patch.edge}`]=patch.preset;
    else changes.cells[`${patch.map}/${patch.x},${patch.y}`]=patch.preset;
  }
  signalFieldChange(data,state,'object','light');engine.reveal();return true;
}
export function mapChangesErrors(data,state){
  if(state.mapChanges===undefined)return [];
  const c=state.mapChanges,errors=[];
  if(!record(c)||Object.keys(c).some(k=>!['cells','edges'].includes(k))||!record(c.cells)||!record(c.edges))return ['地形変更の保存が不正です'];
  for(const [key,preset] of Object.entries(c.cells)){
    const m=/^([^/]+)\/(0|[1-9]\d*),(0|[1-9]\d*)$/.exec(key);
    if(!m)errors.push('セル変更の保存座標が不正です');else errors.push(...mapPatchErrors(data,{map:m[1],x:Number(m[2]),y:Number(m[3]),preset}));
  }
  for(const [key,preset] of Object.entries(c.edges)){
    const m=/^([^/]+)\/([hv]:\d+,\d+)$/.exec(key);
    if(!m)errors.push('エッジ変更の保存座標が不正です');else errors.push(...mapPatchErrors(data,{map:m[1],edge:m[2],preset}));
  }
  return errors;
}
