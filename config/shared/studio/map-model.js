import {bindingSatisfied} from '../../../src/core/cell-behaviors.js';
import {mergeCellLayers} from '../../../src/core/cell-layers.js';
import {computeLightGrid} from '../../../src/core/light-geometry.js';
import {get,nextId} from './workspace.js';
export function projectMap(context,id,z=0){
 const map=context.map(id);if(!map)return null;
 const source=context.workspace.documents.get('cell-layers.json')?.value,placement=source?.maps?.[id];
 const voxels=map.voxels,rows=voxels?(voxels.layers[z-voxels.minZ]??map.tiles):placement?.rows??map.tiles;
 const cells=rows.map((row,y)=>Array.from(row,(symbol,x)=>{
  if(placement&&!voxels){const preset=source.presets[placement.legend[symbol]];return {x,y,preset:placement.legend[symbol],...mergeCellLayers(preset??{passage:'#',visual:{opaque:true},parameters:{},events:[]},placement.overrides?.[`${x},${y}`])};}
  return {x,y,passage:symbol,visual:{opaque:symbol==='#',wall:symbol==='#',floor:symbol==='.'},parameters:{illumination:0}};
 }));
 const markers=context.placements(id).filter(p=>(p.z??0)===z);
 const sources=markers.filter(p=>p.initiallyLit||p.fire?.litStates?.includes(p.initialState)).map(p=>({x:p.x,y:p.y,radius:p.fire?.radius??p.radius??0,intensity:8}));
 const light=computeLightGrid(cells.map(row=>row.map(c=>c.visual.opaque?'#':'.').join('')),sources);
 for(const row of cells)for(const c of row)c.light=Math.max(light[c.y][c.x],c.parameters?.illumination??0);
 return {map,cells,markers,width:rows[0]?.length??0,height:rows.length,placement,voxels,z};
}
export function movePoint(workspace,context,target,mapId,x,y,edge){
 const view=projectMap(context,mapId,target.z??0);if(!view?.cells[y]?.[x])throw Error('配置がマップの範囲外です。');
 const old=get(workspace.value(target.file),target.path);if(!old||typeof old!=='object')throw Error('配置する対象を選んでください。');
 if(edge&&target.eventPath){const event=get(workspace.value(target.file),target.eventPath);if(!['interact','action'].includes(event.trigger)||event.blocking)throw Error('エッジへ置くには、起動方法を「調べたとき」または「操作したとき」にし、通路を塞ぐ設定を外してください。');}
 const next={...old,map:mapId,x,y};if(view.voxels)next.z=target.z??old.z??view.voxels.minZ;if(target.omitMap)delete next.map;
 if(edge)next[target.edgeKey??'edge']=edge;else if(target.allowEdge)delete next[target.edgeKey??'edge'];
 workspace.set(target.file,target.path,next,`${target.name??'配置'}を${context.name('maps',mapId)}の${x},${y}${edge?' '+edge:''}へ移動`);
}
export function paintCell(workspace,mapId,x,y,preset){
 const source=workspace.value('cell-layers.json'),placement=source.maps[mapId];
 if(!placement?.rows[y]?.[x]||!source.presets[preset])throw Error('塗る場所とセル種を選んでください。');
 const binding=placement.overrides?.[`${x},${y}`]?.parameters?.binding??source.presets[preset].parameters.binding;const dungeon=[...workspace.documents].filter(([file])=>file.startsWith('dungeons/')).map(([,d])=>d.value).find(d=>d.maps.includes(mapId));if(binding&&!bindingSatisfied(binding,dungeon,mapId,x,y))throw Error(`${source.presets[preset].name??preset} は ${binding} の対象地点に配置してください。「仕掛け」で対象座標を設定できます。`);
 workspace.transaction('セル種を塗る',['cell-layers.json'],docs=>{
  const p=docs['cell-layers.json'].maps[mapId];let symbol=Object.keys(p.legend).find(k=>p.legend[k]===preset);
  if(!symbol){symbol=Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789').find(k=>!Object.hasOwn(p.legend,k));if(!symbol)throw Error('このマップのセル種の記号を使い切っています。');p.legend[symbol]=preset;}
  const row=Array.from(p.rows[y]);row[x]=symbol;p.rows[y]=row.join('');
 });
}
export function addQuestEvent(workspace,file,mapId,x,y,name='新しいイベント'){
 let index;workspace.transaction('イベントと処理を追加',[file],docs=>{
  const doc=docs[file],prefix=file.split('/').at(-1).split('.')[0],id=nextId(doc.events,prefix+'_event'),script=prefix+'.editor.'+id;
  index=doc.events.length;doc.events.push({id,title:name,points:[{map:mapId,x,y}],kind:'clue',trigger:'interact',script});doc.scripts[script]={commands:[{op:'narrate',text:'ここで表示する本文を入力してください。'}]};
 });return index;
}
