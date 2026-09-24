import {componentUI} from './studio/component-ui.js';
import {ConfigStudio} from './studio.js';
import {el,button,select,section,clear} from './studio/dom.js';
import {mapPanel} from './studio/map-view.js';
import {projectMap,addQuestEvent} from './studio/map-model.js';
import {nextId} from './studio/workspace.js';
import {editors} from './catalog.js';
import {validateConnections} from '../../src/core/connection-geometry.js';
import {systemNames} from './studio/labels.js';

export class MapStudio extends ConfigStudio {
 async start(dungeon){
  this.dsl=await this.context.data('data/schemas/script.schema.json');
  await this.chooseDungeon(dungeon??this.context.options('dungeons')[0][0]);
 }
 async prepareMap(){if(this.mapId){await this.context.ensureMap(this.mapId);await this.prepare('cell-layers.json');}}
 dungeonFile(){return `dungeons/${this.dungeonId}.json`;}
 mapOptions(){return this.workspace.value(this.dungeonFile()).maps.filter(id=>this.context.maps()[id]&&!this.context.maps()[id].voxels).map(id=>[id,this.context.name('maps',id)]);}
 async reviewChanges(){if(this.connectionDraft){this.message('接続の編集中です。「接続を下書きに反映」または「接続の編集を取り消す」を選んでから出力してください。',true);return;}if(!this.guard())return;
  const epoch=this.epoch;this.workspace.output=null;
  try{
   const affected=this.workspace.changed().includes('cell-layers.json')?this.context.options('dungeons').map(([id])=>`dungeons/${id}.json`):this.workspace.changed().filter(f=>f.startsWith('dungeons/'));
   for(const file of affected){await this.prepare(file);const dungeon=this.workspace.value(file);await Promise.all(dungeon.maps.map(id=>this.context.ensureMap(id)));if(epoch!==this.epoch){this.message('検証中に変更されました。もう一度出力してください。',true);return;}
    const source=this.workspace.value('cell-layers.json'),maps=Object.fromEntries(dungeon.maps.map(id=>{const view=projectMap(this.context,id);return [id,{...view.map,tiles:view.cells.map(row=>row.map(c=>c.passage).join('')),cells:source.maps[id]}];}));
    for(const [key,spec] of Object.entries(dungeon.systems??{}))if(spec.use==='map_connections'){const errors=validateConnections({game:{cellLayerVersion:1},cellTypes:source.presets,edgeTypes:source.edgePresets,maps},dungeon,spec);if(errors.length){this.review.hidden=true;this.message(`config/${file} / ${key}：${[...new Set(errors)].join('、')}。「マップ間の接続」で修正してください。`,true);return;}}
   }
   await super.reviewChanges();
  }catch(e){this.message('検証できません：'+e.message,true);}
 }
 async chooseDungeon(id){
  if(!this.guard())return;const token=++this.navigation;
  try{await this.prepare(`dungeons/${id}.json`);if(token!==this.navigation)return;if(this.connectionDraft&&!this.confirm('編集中の接続を取り消して迷宮を切り替えますか？'))return;this.dungeonId=id;this.connectionDraft=null;await this.chooseMap(this.mapOptions()[0]?.[0]);}catch(e){this.message(e.message,true);}
 }
 async chooseMap(id){
  if(!this.guard()||!id)return;if(this.connectionDraft){if(!this.confirm('編集中の接続を取り消してマップを切り替えますか？作成済みのマップは下書きに残ります。'))return;this.connectionDraft=null;}const token=++this.navigation;
  try{await this.context.ensureMap(id);if(token!==this.navigation)return;this.mapId=id;this.selectedCell=null;this.target=null;this.task='cells';await this.open('cell-layers.json',{collection:'maps',record:id});}catch(e){this.message(e.message,true);}
 }
 async open(file,options={}){if(!this.guard())return;const cell=this.selectedCell;await super.open(file,options);this.selectedCell=cell?.map===this.mapId?cell:null;this.refresh();}
 async selectTask(task){
  if(!this.guard())return;if(this.connectionDraft&&task!=='connections'){if(!this.confirm('編集中の接続を取り消しますか？作成済みのマップは下書きに残ります。'))return;this.connectionDraft=null;}this.task=task;this.target=null;if(task!=='passage'&&!(task==='cells'&&!this.selectedCell?.side)&&!(task==='edges'&&this.selectedCell?.side))this.selectedCell=null;this.outlineOpen=['events','systems','connections'].includes(task);
  if(['size','cells','edges','passage'].includes(task))await this.open('cell-layers.json',{collection:'maps',record:this.mapId});
  else if(task==='objects'){const owner=this.context.maps()[this.mapId].owner;if(owner){await this.open(owner.file,{collection:'maps',record:this.mapId});this.tab=2;this.renderDetail();}else this.refresh();}
  else if(task==='systems')await this.open(this.dungeonFile(),{collection:'systems',record:Object.keys(this.workspace.value(this.dungeonFile()).systems).find(k=>!['map_connections','voxel_space'].includes(this.workspace.value(this.dungeonFile()).systems[k].use))});
  else this.refresh();
 }
 refresh(){
  if(!this.entry||!this.dungeonId)return;for(const cleanup of this.cleanups.splice(0))cleanup();
  // Undoing creation can remove the map currently on screen.
  if(!this.context.maps()[this.mapId]){this.mapId=this.mapOptions()[0]?.[0];this.selectedCell=null;this.target=null;this.entry=editors.find(e=>e.file==='cell-layers.json');this.collectionKey='maps';this.recordId=this.mapId;this.task='cells';}
  clear(this.root);this.root.className='studio map-studio';
  const heading=el('div','','map-heading');heading.append(el('h1','マップ編集'));
  heading.append(select(this.context.options('dungeons'),this.dungeonId,id=>this.chooseDungeon(id),'編集する迷宮'),select(this.mapOptions(),this.mapId,id=>this.chooseMap(id),'編集するマップ'),button('マップを追加',()=>this.createMapDialog()));this.root.append(heading);
  const toolbar=el('div','','toolbar');this.undoButton=button('戻す',()=>{if(this.guard()){this.workspace.undo();this.refresh();}});this.redoButton=button('やり直す',()=>{if(this.guard()){this.workspace.redo();this.refresh();}});this.dirty=el('span');toolbar.append(this.undoButton,this.redoButton,button('変更を確認・JSONを出力',()=>this.reviewChanges(),'primary'),button('変更をすべて破棄',()=>{if(this.confirm('下書きの変更をすべて破棄しますか？')){this.errors.clear();this.workspace.discard();this.connectionDraft=null;this.refresh();}}),this.dirty);this.root.append(toolbar);this.invalidate();if(this.connectionDraft){this.undoButton.disabled=true;this.redoButton.disabled=true;}
  this.status=el('p','','status');this.status.hidden=true;this.root.append(this.status);if(this.errors.size){this.message('入力エラーを修正してください。',true);this.root.append(button('不正な入力を取り消す',()=>{this.errors.clear();this.refresh();}));}
  const nav=el('nav','','collection-tabs');nav.setAttribute('aria-label','編集する内容');for(const [id,name] of [['size','マップサイズ'],['cells','セル'],['edges','エッジ'],['objects','入口・配置物'],['passage','通行可否'],['events','イベント'],['systems','仕掛け'],['connections','マップ間の接続']]){const b=button(name,()=>this.selectTask(id));b.setAttribute('aria-pressed',String(this.task===id));nav.append(b);}this.root.append(nav);
  const layout=el('div','','map-workspace');this.list=el('aside','','record-list');this.preview=el('section','','record-preview');this.detail=el('section','','record-detail');
  const outline=el('details','','map-outline');outline.open=this.outlineOpen??['events','systems','connections'].includes(this.task);outline.append(el('summary','配置・仕掛け・接続の一覧'),this.list);outline.addEventListener('toggle',()=>{if(outline.isConnected)this.outlineOpen=outline.open;});
  layout.append(this.preview,this.detail,outline);this.root.append(layout);
  this.renderList();this.renderPreview();this.renderDetail();this.review=el('section','','review-panel');this.review.hidden=true;this.root.append(this.review);
 }
 renderList(){
  clear(this.list);
  this.list.append(el('h3','迷宮内の接続'));
  for(const [key,s] of Object.entries(this.workspace.value(this.dungeonFile()).systems??{}))if(s.use==='map_connections')for(const [i,l] of s.links.entries())this.list.append(button(`${this.context.name('maps',l.a.map)} ↔ ${this.context.name('maps',l.b.map)}：${l.name}`,()=>this.editConnection(key,i)));
  if(this.task==='connections'){this.list.append(button('接続を追加',()=>this.newConnection()));return;}
  if(this.task==='systems'){
   for(const [key,s] of Object.entries(this.workspace.value(this.dungeonFile()).systems??{}))if(!['map_connections','voxel_space'].includes(s.use))this.list.append(button(s.name??systemNames[s.use]??key,()=>this.open(this.dungeonFile(),{collection:'systems',record:key})));
   this.list.append(button('仕掛けを追加',async()=>{await this.open(this.dungeonFile(),{collection:'systems'});this.addRecord();}));
  }
  this.list.append(el('h3','このマップの配置'));
  for(const p of this.context.placements(this.mapId))if(p.file)this.list.append(button(`${p.name}（${p.x},${p.y}）`,()=>this.openPlacement(p)));
  if(this.task==='events'){this.list.append(button('イベントを追加',()=>this.createEventDialog()));for(const [i,event] of (this.workspace.value(this.dungeonFile()).fieldEvents??[]).entries())this.list.append(button(event.title??event.id,()=>this.open(this.dungeonFile(),{collection:'fieldEvents',record:i})));this.list.append(button('迷宮の条件付きイベントを追加',async()=>{await this.open(this.dungeonFile(),{collection:'fieldEvents'});await this.addRecord();}));}
  const changed=this.workspace.changed();if(changed.length){this.list.append(el('h3','今回の出力対象'));for(const f of changed)this.list.append(el('p','config/'+f,'source-caption'));}
 }
 renderPreview(){
  clear(this.preview);if(this.task==='connections'&&this.connectionDraft){this.renderConnectionMaps();return;}
  if(this.target)this.preview.append(button('配置操作を終了',()=>{this.target=null;this.refresh();}));
  const components=['size','cells','edges','passage'].includes(this.task)&&!this.target;
  this.preview.append(mapPanel(this,{mapId:this.mapId,target:this.target,paint:this.task==='cells',selectedCell:this.selectedCell,compact:true,showMapSelect:false,components,showMarkers:components?Boolean(this.showMarkers):true}));
 }
 renderDetail(){
  clear(this.detail);
  if(['size','passage'].includes(this.task)||this.task==='edges'&&this.group().kind!=='edge'||this.task==='cells'&&this.group().kind==='cellmap'){this.renderComponentDetail();return;}
  if(this.task==='connections'){this.renderConnectionDetail();return;}
  if(this.task==='objects'&&!this.context.maps()[this.mapId]?.owner){this.detail.append(el('p','このマップの基本情報・入口・配置物の正本はJavaScript原稿です。この画面では参照専用です。'));return;}
  if(this.task==='systems'&&['map_connections','voxel_space'].includes(this.current()?.value?.use)){this.detail.append(el('p','一覧から仕掛けを選ぶか、仕掛けを追加してください。接続は「マップ間の接続」で編集します。'));return;}
  if(this.task==='events'&&!['event','fieldEvent','script'].includes(this.group().kind)){this.detail.append(el('h2','イベントを選ぶ'),el('p','配置図または一覧でイベントを選ぶと、条件・本文・処理を編集できます。'),button('イベントを追加',()=>this.createEventDialog()));return;}
  super.renderDetail();
  if(['cell','edge'].includes(this.group().kind))this.detail.prepend(el('p','共有設定を編集中です。同じ種類を使用する全地点に反映されます。','cost-warning'),button('選択地点だけの編集に戻る',()=>this.open('cell-layers.json',{collection:'maps',record:this.mapId})));
 }
 async openPlacement(p){
  if(!this.guard())return;if(this.connectionDraft){if(!this.confirm('編集中の接続を取り消して配置を選びますか？'))return;this.connectionDraft=null;}
  if(p.system&&p.path?.[0]==='systems'){
   const s=this.workspace.value(p.file).systems[p.path[1]];if(s.use==='map_connections'){this.task='connections';return this.editConnection(p.path[1],p.path[3]);}
   this.task='systems';await this.open(p.file,{collection:'systems',record:p.path[1]});
  }else{this.task=p.eventPath||p.file.startsWith('quests/')?'events':'objects';await this.open(p.file,{path:p.eventPath??p.path});if(this.task==='objects')this.tab=p.path?.includes('entrance')?1:2;}
  this.selectedCell={map:this.mapId,x:p.x,y:p.y};this.refresh();
 }
 async pickPoint(target,map){if(!this.guard())return;const id=map??this.mapId;if(!this.mapOptions().some(([m])=>m===id)){this.message('この迷宮内のマップを選んでください。',true);return;}await super.pickPoint(target,id);}
 createEventDialog(){
  if(!this.guard())return;const panel=section('イベントを追加','所属するクエストを選んでください。イベントと専用の処理を同じJSONに作成します。');const quests=editors.filter(e=>e.family==='quest');let file=quests[0].file;const source=el('p','出力先：config/'+file,'source-caption');const name=el('input');name.value='新しいイベント';name.setAttribute('aria-label','イベント名');panel.append(select(quests.map(e=>[e.file,e.title]),file,v=>{file=v;source.textContent='出力先：config/'+file;},'所属クエスト'),name,source,button('選択セルに作成',async()=>{if(!this.guard())return;try{const navigation=this.navigation,map=this.mapId,x=this.selectedCell?.x??1,y=this.selectedCell?.y??1;await this.prepare(file);if(navigation!==this.navigation||!this.guard())return;const index=addQuestEvent(this.workspace,file,map,x,y,name.value);this.task='events';await this.open(file,{collection:'events',record:index});}catch(e){this.message(e.message,true);}}),button('閉じる',()=>panel.remove()));this.detail.prepend(panel);
 }
 showSystemCreator(group,root){super.showSystemCreator(group,root);const chooser=this.detail.querySelector('[aria-label="仕掛けの種類"]');for(const option of [...chooser.children])if(['map_connections','voxel_space'].includes(option.value))option.remove();}
 async createMapDialog(){
  if(!this.guard())return;const panel=section('マップを追加','マップ・セル配置・迷宮の所属一覧を一緒に作成します。');const name=el('input');name.value='新しいマップ';name.setAttribute('aria-label','新しいマップ名');const width=el('input'),height=el('input');for(const [n,label] of [[width,'横のセル数'],[height,'縦のセル数']]){n.type='number';n.min=3;n.max=50;n.value=10;n.setAttribute('aria-label',label);}panel.append(name,width,height,el('p',`出力先：config/connected-maps.json、config/cell-layers.json、config/${this.dungeonFile()}`,'source-caption'),button('この内容で作成',async()=>{if(!this.guard())return;try{const id=await this.createMap(name.value,Number(width.value),Number(height.value));if(this.connectionDraft){this.connectionDraft.b={map:id};await this.context.ensureMap(id);this.refresh();}else await this.chooseMap(id);}catch(e){this.message(e.message,true);}}),button('閉じる',()=>panel.remove()));this.detail.prepend(panel);
 }
 async createMap(name,w,h){
  if(!Number.isInteger(w)||!Number.isInteger(h)||w<3||h<3||w>50||h>50)throw Error('大きさは3〜50セルの整数です。');
  const navigation=this.navigation,dungeonId=this.dungeonId,file='connected-maps.json',dungeonFile=this.dungeonFile();await this.prepare(file);await this.prepare('cell-layers.json');const templateId=this.workspace.value(dungeonFile).maps[0];await this.context.ensureMap(templateId);if(navigation!==this.navigation||!this.guard())throw Error('編集対象が変わりました。もう一度作成してください。');const template=this.context.map(templateId),id=nextId(this.context.maps(),'map');
  this.workspace.transaction('マップ・セル・所属を追加',[file,'cell-layers.json',dungeonFile],docs=>{const rows=Array.from({length:h},(_,y)=>y===0||y===h-1?'W'.repeat(w):'W'+'F'.repeat(w-2)+'W');docs[file].maps[id]={id,name:name||'新しいマップ',region:template.region,dungeon:dungeonId,floor:1,background:template.background,music:template.music,encounter:template.encounter,tiles:rows.map(r=>r.replaceAll('W','#').replaceAll('F','.')),entrance:{x:1,y:1,facing:'south'},objects:[],encounterRate:0};docs['cell-layers.json'].maps[id]={legend:{W:'stone_wall',F:'stone_floor'},rows,overrides:{}};docs[dungeonFile].maps.push(id);});return id;
 }
 async newConnection(){if(!this.guard())return;if(this.connectionDraft&&!this.confirm('編集中の接続を取り消して新規作成しますか？'))return;this.task='connections';this.connectionDraft={name:'新しい接続',kind:'stairs',a:{map:this.mapId},b:{map:this.mapOptions().find(([id])=>id!==this.mapId)?.[0]??this.mapId}};const draft=this.connectionDraft;await this.context.ensureMap(draft.b.map);if(this.connectionDraft===draft)this.refresh();}
 async editConnection(key,index){if(!this.guard())return;if(this.connectionDraft&&!this.confirm('編集中の接続を取り消して選び直しますか？'))return;this.task='connections';const link=this.workspace.value(this.dungeonFile()).systems[key].links[index];this.connectionDraft={...structuredClone(link),key,index};const draft=this.connectionDraft;await Promise.all([this.context.ensureMap(link.a.map),this.context.ensureMap(link.b.map)]);if(this.connectionDraft===draft)this.refresh();}
 renderConnectionDetail(){
  const d=this.connectionDraft;this.detail.append(el('h2','マップ間の接続'),el('p','出力先：config/'+this.dungeonFile()+' / systems / map_connections','source-caption'));if(!d){this.detail.append(el('p','一覧から接続を選ぶか、新しい接続を追加してください。'),button('接続を追加',()=>this.newConnection()));return;}
  const name=el('input');name.value=d.name;name.setAttribute('aria-label','接続名');name.addEventListener('input',()=>{d.name=name.value;});this.detail.append(name,select([['stairs','階段'],['door','扉'],['watertight_door','水密扉']],d.kind,v=>{d.kind=v;if(v==='stairs'){delete d.a.side;delete d.b.side;}this.refresh();},'接続の種類'),el('p','AとBを別々のマップの床に置きます。扉は壁に接する面を選んでください。移動は双方向で、到着時の向きをそれぞれ指定できます。'),button('接続先のマップを作成',()=>this.createMapDialog()),button('接続を下書きに反映',()=>{try{this.saveConnection();this.connectionDraft=null;this.refresh();}catch(e){this.message(e.message,true);}},'primary'),button('接続の編集を取り消す',()=>{this.connectionDraft=null;this.refresh();}));
  if(d.key)this.detail.append(button('この接続を削除',()=>{if(!this.confirm('この接続を削除しますか？'))return;const file=this.dungeonFile();this.workspace.transaction('接続を削除',[file],docs=>{const s=docs[file].systems[d.key];s.links.splice(d.index,1);if(!s.links.length)delete docs[file].systems[d.key];});this.connectionDraft=null;this.refresh();},'danger'));
 }
 renderConnectionMaps(){
  const draft=this.connectionDraft;for(const end of ['a','b']){const point=draft[end],box=section(end==='a'?'接続口 A':'接続口 B');box.append(el('p',Number.isInteger(point.x)?`${point.x},${point.y}${point.side?' / '+point.side:''}`:'配置図で接続口を選んでください。'),select([['north','北向き'],['east','東向き'],['south','南向き'],['west','西向き']],point.facing??'north',v=>{point.facing=v;},'接続口 '+end.toUpperCase()+' の到着方向'));
   box.append(mapPanel(this,{mapId:point.map,mapOptions:this.mapOptions(),target:{name:'接続口 '+end.toUpperCase(),allowEdge:draft.kind!=='stairs'},selectedCell:point,onMapChange:async id=>{await this.context.ensureMap(id);if(this.connectionDraft!==draft)return;draft[end]={map:id};this.refresh();},onPlace:(x,y,side)=>{draft[end]={...point,map:point.map,x,y,facing:point.facing??'north'};delete draft[end].side;if(side)draft[end].side=side;this.refresh();}}));this.preview.append(box);}
 }
 saveConnection(){
  if(!this.guard())return;const d=this.connectionDraft;if(!d.name.trim())throw Error('接続名を入力してください。');if(d.a.map===d.b.map)throw Error('別々のマップを選んでください。');
  for(const p of [d.a,d.b]){const view=projectMap(this.context,p.map);if(!this.mapOptions().some(([id])=>id===p.map)||!view?.cells[p.y]?.[p.x]||view.cells[p.y][p.x].passage==='#')throw Error('AとBをそれぞれ通行可能なセルに配置してください。');if(d.kind!=='stairs'){const delta={north:[0,-1],east:[1,0],south:[0,1],west:[-1,0]}[p.side];if(!delta||!view.edges.edges[`${p.x},${p.y}/${p.side}`]?.visual.wall&&!view.cells[p.y+delta[1]]?.[p.x+delta[0]]?.visual.wall)throw Error('扉は壁セルか壁エッジに接する面を選んでください。');}}
  const file=this.dungeonFile(),systems=this.workspace.value(file).systems;for(const [key,s] of Object.entries(systems))if(s.use==='map_connections')for(const [i,l] of s.links.entries())if(key!==d.key||i!==d.index)for(const old of [l.a,l.b])if([d.a,d.b].some(p=>p.map===old.map&&p.x===old.x&&p.y===old.y))throw Error('同じセルに既存の接続口があります。');
  this.workspace.transaction('接続を編集',[file],docs=>{const systems=docs[file].systems,key=d.key??Object.keys(systems).find(k=>systems[k].use==='map_connections')??nextId(systems,'connections');systems[key]??={use:'map_connections',links:[]};const links=systems[key].links,link={...(d.index===undefined?{}:links[d.index]),id:d.id??nextId(links,'connection'),name:d.name,kind:d.kind,a:structuredClone(d.a),b:structuredClone(d.b)};if(d.index===undefined)links.push(link);else links[d.index]=link;});
 }
}
Object.assign(MapStudio.prototype,componentUI);
export function presetUsage(source,preset){let maps=0,cells=0;for(const p of Object.values(source.maps)){let count=0;for(const row of p.rows)for(const c of row)if(p.legend[c]===preset)count++;if(count)maps++;cells+=count;}return {maps,cells};}
if(typeof document!=='undefined'&&document.body.dataset.mapStudio!==undefined){const app=new MapStudio(document.getElementById('editor'));app.start(new URLSearchParams(location.search).get('dungeon')??undefined).catch(e=>app.message('読み込めません：'+e.message,true));globalThis.addEventListener('beforeunload',e=>{if(app.workspace.dirty||app.errors.size||app.connectionDraft){e.preventDefault();e.returnValue='';}});}
