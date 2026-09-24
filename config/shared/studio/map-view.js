import {el,button,select} from './dom.js';
import {enumLabel} from './labels.js';
import {projectMap,movePoint,paintCell} from './map-model.js';
export function mapPanel(app,{mapId,target=null,paint=false,onInspect,selectedCell=null,z=0,mapOptions,onMapChange,onPlace,compact=false,showMapSelect=true}={}){
 const root=el('section','','map-panel'),context=app.context,workspace=app.workspace,meta=context.maps()[mapId];
 if(!compact||target)root.append(el('h3',target?`配置する対象：${target.name??'選択中の地点'}`:paint?'セルを塗る・調べる':'配置図'));
 const toolbar=el('div','','map-tools');if(showMapSelect)toolbar.append(select(target?.omitMap?[[mapId,context.name('maps',mapId)]]:(mapOptions??context.options('maps')),mapId,async id=>{if(!app.guard())return;try{if(onMapChange){await onMapChange(id);return;}await context.ensureMap(id);app.mapId=id;app.z=0;app.refresh();}catch(e){app.message(e.message,true);}},'表示マップ'));
 const view=projectMap(context,mapId,z);if(!view){root.append(toolbar,el('p','マップを読み込んでください。'));return root;}
 if(view.voxels)toolbar.append(select(view.voxels.layers.map((_,i)=>[i+view.voxels.minZ,`高さ ${i+view.voxels.minZ}`]),z,n=>{app.z=Number(n);app.refresh();},'表示する高さ'));
 if(paint&&view.placement){const presets=workspace.value('cell-layers.json').presets;app.brush??=Object.keys(presets)[0];toolbar.append(select([['inspect','セルの詳細を調べる'],['paint','選んだセル種を塗る']],app.mapTool??'inspect',v=>{app.mapTool=v;app.refresh();},'マップの操作'),select(Object.keys(presets).map(id=>[id,(presets[id].name??id)+(presets[id].parameters.binding?'【仕掛け連動】':'')]),app.brush,v=>{app.brush=v;app.refresh();},'塗るセル種'));}
 const notes=el('div','','map-notes');
 if(paint){const preset=workspace.value('cell-layers.json').presets[app.brush];notes.append(el('p',preset?.description??'','preview-note'));}
 toolbar.append(button(app.showLight?'照度を隠す':'初期照度を表示',()=>{app.showLight=!app.showLight;app.refresh();}));root.append(toolbar);
 notes.append(el('p',target?'配置先のセルをクリックしてください。面のある対象は、セル四辺の細いボタンで向きも指定できます。':paint?'セル種を選んで塗るか、セルを選んで通行・外観・照度を個別に編集します。':'配置を選ぶと、そのイベントや仕掛けの編集を開きます。','muted'));
 if(app.showLight)notes.append(el('p','初期配置の灯火・遮光・局所照度のプレビューです。進行条件や開閉後の状態は評価しません。','preview-note'));
 const scroller=el('div','','map-scroll'),grid=el('div','','map-grid');grid.style.setProperty('--columns',view.width);grid.setAttribute('role','group');grid.setAttribute('aria-label',meta?.name??mapId);
 const click=(x,y,edge)=>{if(!app.guard())return;try{
  if(onPlace){onPlace(x,y,edge);}
  else if(target){movePoint(workspace,context,{...target,z},mapId,x,y,edge);app.refresh();}
  else if(paint&&app.mapTool==='paint'){paintCell(workspace,mapId,x,y,app.brush);app.refresh();}
  else{app.selectedCell={map:mapId,x,y,z};onInspect?.(x,y);app.refresh();}
 }catch(e){app.message(e.message,true);}};
 for(const row of view.cells)for(const cell of row){
  const {x,y}=cell,markers=view.markers.filter(p=>p.x===x&&p.y===y),tile=el('div','','map-tile'+(cell.passage==='#'?' wall':' floor'));
  if(selectedCell?.x===x&&selectedCell?.y===y)tile.classList.add('selected');if(target&&markers.some(p=>p.file===target.file&&JSON.stringify(p.path)===JSON.stringify(target.path)))tile.classList.add('placed');
  const title=`${x},${y} ${cell.passage==='#'?'通行不可':'通行可能'}${markers.length?' / '+markers.map(p=>p.name).join('、'):''}`;
  const hit=button(app.showLight?String(cell.light):markers.length?String(markers.length):cell.passage==='#'?'':'·',()=>click(x,y),'cell-hit');hit.setAttribute('aria-label',title);hit.dataset.cell=`${x},${y}`;tile.title=(cell.name??'')+' '+title;if(cell.visual.surface)tile.dataset.surface=cell.visual.surface;if(cell.parameters.water_depth)tile.dataset.depth=cell.parameters.water_depth;tile.append(hit);
  if(app.showLight)tile.style.setProperty('--light',String(cell.light/8));
  for(const p of markers){const dot=el('span',p.edge?'':'◆','map-marker '+(p.system?'device':'event')+(p.edge?' edge-'+p.edge:''));dot.setAttribute('aria-hidden','true');tile.append(dot);}
  if(target?.allowEdge)for(const side of ['north','east','south','west']){const hit=button('',()=>click(x,y,side),'edge-hit '+side);hit.setAttribute('aria-label',`${x},${y}の${enumLabel(side)}面に配置`);hit.dataset.edge=`${x},${y}/${side}`;tile.append(hit);}
  grid.append(tile);
 }
 scroller.append(grid);root.append(scroller,notes,el('p',`横 ${view.width} × 縦 ${view.height} セル。青：イベント、金：装置。座標は左上が0,0です。`,'muted'));
 app.mapScrolls??=new Map();const scrollKey=`${mapId}/${z}`,position=app.mapScrolls.get(scrollKey);scroller.addEventListener('scroll',()=>app.mapScrolls.set(scrollKey,{left:scroller.scrollLeft,top:scroller.scrollTop}));
 if(position)queueMicrotask(()=>{if(scroller.isConnected){scroller.scrollLeft=position.left;scroller.scrollTop=position.top;}});
 const points=selectedCell?view.markers.filter(p=>p.x===selectedCell.x&&p.y===selectedCell.y):view.markers;
 const list=el('div','','marker-list');for(const p of points){const b=button(`${p.name} — ${p.x},${p.y}${p.edge?' '+enumLabel(p.edge):''}`,()=>app.openPlacement(p));b.disabled=!p.file;list.append(b);}if(points.length&&(!compact||selectedCell))root.append(el('h4',selectedCell?'選択セルの配置':'このマップの配置'),list);
 if(meta?.owner)root.append(el('p',`配置物の正本：config/${meta.owner.file} ／ セルの正本：config/cell-layers.json`,'source-caption'));else root.append(el('p','このマップの基本情報はJavaScript原稿由来です。セルとイベントは対応するJSONで編集できます。','source-caption'));
 return root;
}
