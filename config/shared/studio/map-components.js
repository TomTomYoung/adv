import {edgeKey,edgeInBounds,mergeEdgeLayers} from '../../../src/core/edge-layers.js';
import {mergeCellLayers} from '../../../src/core/cell-layers.js';
import {get} from './workspace.js';
const file='cell-layers.json';
export function paintEdge(workspace,map,x,y,side,preset,policy='keep'){
 const source=workspace.value(file),p=source.maps[map],key=edgeKey(x,y,side);
 if(!p||!edgeInBounds(key,p.rows[0].length,p.rows.length)||!source.edgePresets[preset])throw Error('配置する境界とエッジ種を選んでください。');
 workspace.transaction('エッジ種を配置',[file],docs=>{const p=docs[file].maps[map];p.edges??={};const old=p.edges[key];p.edges[key]={preset,...(policy==='keep'&&old?.overrides?{overrides:old.overrides}:{})};});
}
export function componentAt(workspace,map,point){
 const source=workspace.value(file),p=source.maps[map];if(!p||!point)return null;
 if(point.side){const key=edgeKey(point.x,point.y,point.side),placement=p.edges?.[key];if(!placement)return {edge:true,key,placement:null};const base=source.edgePresets[placement.preset];return {edge:true,key,preset:placement.preset,base,override:placement.overrides??{},effective:base?mergeEdgeLayers(base,placement.overrides):null,path:['maps',map,'edges',key,'overrides']};}
 const key=`${point.x},${point.y}`,preset=p.legend[p.rows[point.y]?.[point.x]],base=source.presets[preset];if(!base)return null;
 const override=p.overrides?.[key]??{};return {edge:false,key,preset,base,override,effective:mergeCellLayers(base,override),path:['maps',map,'overrides',key]};
}
export function setComponentField(workspace,map,point,path,value){
 const c=componentAt(workspace,map,point);if(!c?.base)throw Error('先にセル種またはエッジ種を配置してください。');
 workspace.set(file,[...c.path,...path],value,`${c.edge?'エッジ':'セル'}の個別設定を変更`);
}
export function resetComponentField(workspace,map,point,path){
 const c=componentAt(workspace,map,point);if(!c?.base)return;
 workspace.transaction('標準設定に戻す',[file],docs=>{
  const root=docs[file].maps[map],patch=c.edge?root.edges[c.key].overrides:root.overrides[c.key];if(!patch)return;
  if(!path){if(c.edge)delete root.edges[c.key].overrides;else delete root.overrides[c.key];return;}
  if(path.length===1)delete patch[path[0]];else{delete patch[path[0]]?.[path[1]];if(patch[path[0]]&&!Object.keys(patch[path[0]]).length)delete patch[path[0]];}
  if(!Object.keys(patch).length){if(c.edge)delete root.edges[c.key].overrides;else delete root.overrides[c.key];}
 });
}
export function resizeReferences(documents,map,width,height){
 const issues=[];const outside=(x,y)=>x<0||y<0||x>=width||y>=height;
 for(const [file,value] of documents){
  const add=(path,why)=>issues.push({file,path,message:`${file} / ${path.join('/')}：${why}`});
  function visit(v,path=[],inherited){
   if(!v||typeof v!=='object')return;const scope=typeof v.map==='string'?v.map:inherited;
   if(scope===map&&Number.isInteger(v.x)&&Number.isInteger(v.y)&&outside(v.x,v.y))add(path,`座標 ${v.x},${v.y} が範囲外になります。`);
   if(v.vectorRows?.[map])for(const [y,row] of v.vectorRows[map].entries())for(const [x,c] of Array.from(row).entries())if(c!=='#'&&outside(x,y))add([...path,'vectorRows',map,y],`流れ ${x},${y} が範囲外になります。`);
   for(const [k,child] of Object.entries(v)){
    if(k==='vectorRows'||k==='tiles'||file==='cell-layers.json'&&k==='maps')continue;
    const ownMap=path.at(-1)==='maps'&&!Array.isArray(v)?k:scope;visit(child,[...path,Array.isArray(v)?Number(k):k],ownMap);
   }
  }visit(value);
 }
 return issues;
}
export function resizeMap(workspace,context,map,width,height,readOnly=[]){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<3||height<3||width>50||height>50)throw Error('大きさは3〜50セルの整数です。');
 const source=workspace.value(file),placement=source.maps[map],meta=context.maps()[map],original=context.map(map);
 if(!placement||original?.voxels)throw Error('2Dマップを選んでください。');
 const shrinking=width<placement.rows[0].length||height<placement.rows.length;
 const documents=[...[...workspace.documents].filter(([f])=>f!=='voxel-content.json').map(([f,d])=>['config/'+f,d.value]),...readOnly];
 const issues=shrinking?resizeReferences(documents,map,width,height):[];
 if(shrinking){
  for(const key of Object.keys(placement.overrides)){const [x,y]=key.split(',').map(Number);if(x>=width||y>=height)issues.push({message:`config/${file} / ${map} / ${key}：セルの個別設定が範囲外になります。`});}
  for(const key of Object.keys(placement.edges??{}))if(!edgeInBounds(key,width,height))issues.push({message:`config/${file} / ${map} / ${key}：エッジが範囲外になります。`});
 }
 if(issues.length){const error=Error('サイズを変更できません。先に対象を移動・解除してください。\n'+issues.map(i=>i.message).join('\n'));error.issues=issues;throw error;}
 const owner=meta.owner??{file:'connected-maps.json',path:['maps',map]},vectors=[];
 for(const [f,d] of workspace.documents){function walk(v,path=[]){if(!v||typeof v!=='object')return;if(v.vectorRows?.[map])vectors.push({file:f,path:[...path,'vectorRows',map]});for(const [k,c] of Object.entries(v))walk(c,[...path,Array.isArray(v)?Number(k):k]);}if(f.startsWith('dungeons/'))walk(d.value);}
 return workspace.transaction('マップサイズを変更',[file,owner.file,...vectors.map(v=>v.file)],docs=>{
  const p=docs[file].maps[map];let wall=Object.keys(p.legend).find(k=>p.legend[k]==='stone_wall');if(!wall){wall=Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789').find(k=>!Object.hasOwn(p.legend,k));if(!wall)throw Error('壁の配置記号が足りません。');p.legend[wall]='stone_wall';}
  p.rows=Array.from({length:height},(_,y)=>(p.rows[y]??'').slice(0,width).padEnd(width,wall));
  if(!meta.owner){const copy=structuredClone(original);delete copy.cells;docs[owner.file].maps[map]=copy;}
  get(docs[owner.file],owner.path).tiles=p.rows.map((row,y)=>Array.from(row,(c,x)=>p.overrides[`${x},${y}`]?.passage??docs[file].presets[p.legend[c]].passage).join(''));
  for(const v of vectors){const rows=get(docs[v.file],v.path),parent=get(docs[v.file],v.path.slice(0,-1));parent[map]=Array.from({length:height},(_,y)=>(rows[y]??'').slice(0,width).padEnd(width,'#'));}
 });
}
