import {cellSurfaces,cellBindings,cellBindingErrors} from './cell-behaviors.js';
// Passage glyphs carry no material, opacity, water or event semantics.
export const mergeCellLayers=(base,patch={})=>{const events=patch.events??base.events??[];return {...base,...patch,visual:{...base.visual,...patch.visual},parameters:{...base.parameters,...patch.parameters},events:Array.isArray(events)?[...events]:events};};
export function authoredCellLayers(data,map,x,y){
  const placement=map.cells,id=placement?.legend?.[placement.rows?.[y]?.[x]],preset=data.cellTypes?.[id],patch=placement?.overrides?.[`${x},${y}`];
  if(!object(preset)||patch!==undefined&&!object(patch))return null;
  return mergeCellLayers(preset,patch);
}
export const cellEventKey=(map,x,y,id)=>`cell/${map}/${x},${y}/${id}`;
export const cellEntryId=id=>`cell:${id}`;

const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const identifier=v=>typeof v==='string'&&/^[a-z][a-z0-9_]*$/.test(v)&&!['constructor','prototype','__proto__'].includes(v);
const keys=(v,allowed)=>object(v)&&Object.keys(v).every(k=>allowed.includes(k));
export function cellLayersValid(data,value,partial=false){
  if(!keys(value,['name','description','passage','visual','parameters','events']))return false;
  if(['name','description'].some(k=>value[k]!==undefined&&(typeof value[k]!=='string'||!value[k].trim())))return false;
  if((!partial||value.passage!==undefined)&&!['.','#'].includes(value.passage))return false;
  if(!partial||value.visual!==undefined){
    const v=value.visual;
    if(!keys(v,['wall','floor','opaque','material','image','surface'])||['wall','floor','opaque'].some(k=>(!partial||v[k]!==undefined)&&typeof v[k]!=='boolean'))return false;
    if((!partial||v.material!==undefined)&&!['floor','wall'].includes(v.material))return false;
    if(v.surface!==undefined&&!cellSurfaces.includes(v.surface))return false;
    if(v.image!==undefined&&v.image!==null&&!Object.hasOwn(data.assets.images,v.image))return false;
  }
  if(!partial||value.parameters!==undefined){
    const p=value.parameters;
    if(!object(p)||Object.entries(p).some(([k,v])=>!identifier(k)||!(typeof v==='boolean'||typeof v==='string'||Number.isFinite(v))))return false;
    if((!partial||p.illumination!==undefined)&&(!Number.isInteger(p.illumination)||p.illumination<0||p.illumination>8))return false;
    if(p.water_depth!==undefined&&(!Number.isInteger(p.water_depth)||p.water_depth<0||p.water_depth>2)||['slippery','fragile','safe'].some(k=>p[k]!==undefined&&typeof p[k]!=='boolean')||p.corrosion!==undefined&&(!Number.isInteger(p.corrosion)||p.corrosion<0||p.corrosion>100)||p.binding!==undefined&&!cellBindings.includes(p.binding))return false;
    if((!partial||p.water_passable!==undefined)&&typeof p.water_passable!=='boolean')return false;
  }
  if((!partial||value.events!==undefined)&&(!Array.isArray(value.events)||new Set(value.events).size!==value.events.length||value.events.some(id=>!Object.hasOwn(data.cellEvents??{},id))))return false;
  return true;
}
export function validateCellLayers(data,expression){
  if(!data.game.cellLayerVersion)return [];
  const errors=[],bad=text=>errors.push(`セルレイヤー: ${text}`);
  if(data.dungeons)for(const e of cellBindingErrors({presets:data.cellTypes,maps:Object.fromEntries(Object.values(data.maps).filter(m=>m.cells).map(m=>[m.id,m.cells]))},data.dungeons))bad(e.message);
  if(data.game.cellLayerVersion!==1||!object(data.cellTypes)||!Object.keys(data.cellTypes).length||!object(data.cellEvents))return ['セルレイヤー: 定義がありません'];
  for(const [id,preset] of Object.entries(data.cellTypes))if(!identifier(id)||!cellLayersValid(data,preset))bad(`プリセット不正 ${id}`);
  for(const [id,event] of Object.entries(data.cellEvents)){
    if(!identifier(id)||!keys(event,['trigger','script','once','condition'])||event.trigger!=='enter'||typeof event.once!=='boolean'||!Object.hasOwn(data.scripts,event.script))bad(`イベント不正 ${id}`);
    if(event?.condition!==undefined)expression(event.condition,`cellEvents/${id}`);
  }
  for(const map of Object.values(data.maps)){
    const c=map.cells;
    if(map.voxels){bad(`${map.id}: 通常のセルレイヤーへ退避3Dを混在させないでください`);continue;}
    if(!keys(c,['legend','rows','overrides'])||!object(c.legend)||!Array.isArray(c.rows)||c.rows.length!==map.tiles.length||c.rows.some((r,y)=>typeof r!=='string'||r.length!==map.tiles[y].length)||!object(c.overrides)){
      bad(`${map.id}: 配置・寸法不正`);continue;
    }
    for(const [symbol,id] of Object.entries(c.legend))if(!/^[A-Za-z0-9]$/.test(symbol)||!Object.hasOwn(data.cellTypes,id))bad(`${map.id}: 凡例不正 ${symbol}`);
    for(const [key,patch] of Object.entries(c.overrides)){
      const [x,y]=key.split(',').map(Number);
      if(!/^(0|[1-9]\d*),(0|[1-9]\d*)$/.test(key)||map.tiles[y]?.[x]===undefined||!cellLayersValid(data,patch,true))bad(`${map.id}: 上書き不正 ${key}`);
    }
    for(let y=0;y<c.rows.length;y++)for(let x=0;x<c.rows[y].length;x++){
      const cell=authoredCellLayers(data,map,x,y);
      if(!cell||!cellLayersValid(data,cell)||cell.passage!==map.tiles[y][x])bad(`${map.id} ${x},${y}: プリセットと通行データが一致しません`);
    }
  }
  return errors;
}
