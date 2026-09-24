import {editors} from './catalog.js';
import {referenceData} from './reference-catalog.js';
import {browserRead,createDefinitions,createValidator} from './validation.js';
import {parseJSON,serialize} from './model.js';
import {Workspace,get,nextId} from './studio/workspace.js';
import {EditorContext} from './studio/context.js';
import {collections,groups,editableScope} from './studio/profiles.js';
import {schemaAt,initialValue,resolveSchema} from './studio/schema-form.js';
import {renderRecord,renderValue,renderCommands,referenceOptions} from './studio/forms.js';
import {enrichSchema} from './studio/supplemental.js';
import {el,button,select,section,clear,short} from './studio/dom.js';
import {label,enumLabel,systemNames} from './studio/labels.js';
import {mapPanel} from './studio/map-view.js';
import {addQuestEvent,projectMap} from './studio/map-model.js';
import {previewPanel,renderArt} from './studio/preview.js';
import {checkWorkspace,costWarnings} from './studio/checks.js';

const clone=value=>structuredClone(value);
const readonlyKeys=new Set(['id','version','schemaVersion','source','examples','systems','fieldEvents']);
const fileEntry=file=>editors.find(e=>e.file===file);
export class ConfigStudio {
 constructor(root,{read=browserRead,confirm=message=>globalThis.confirm(message),base=referenceData}={}){
  this.root=root;this.read=read;this.confirm=confirm;this.workspace=new Workspace(read);this.context=new EditorContext(this.workspace,read,base);
  const readDefinition=async file=>{const value=await read(file);return typeof value==='string'?JSON.parse(value):value;};this.definition=createDefinitions(readDefinition);this.validateFile=createValidator(readDefinition);this.schemas=new Map();this.errors=new Map();this.cleanups=[];this.epoch=0;this.navigation=0;this.search='';this.tab=0;
  this.workspace.subscribe(()=>this.invalidate());
 }
 async start(file){this.dsl=await this.context.data('data/schemas/script.schema.json');await this.open(file,{collection:typeof location!=='undefined'?new URLSearchParams(location.search).get('collection')??undefined:undefined});}
 async prepare(file){const entry=fileEntry(file);if(!entry)throw Error('編集対象のJSONではありません: '+file);await this.workspace.load(file);if(!this.schemas.has(file))this.schemas.set(file,await this.definition(entry));return entry;}
 async open(file,{collection,record,path}={}){
  if(!this.guard())return;const token=++this.navigation;
  try{
   const entry=await this.prepare(file);if(token!==this.navigation||!this.guard())return;
   const value=this.workspace.value(file),items=collections(entry,value),group=items.find(c=>c.key===collection)??items[0];
   let chosen=record??this.rows(group,value)[0]?.key;
   if(path){const c=items.find(c=>c.mode==='single'&&c.path.length&&path[0]===c.path[0]||c.mode!=='single'&&(c.path.length===0||path[0]===c.path[0]));if(c){collection=c.key;chosen=path[c.path.length];}}
   this.entry=entry;this.collectionKey=collection===undefined?group.key:collection;this.recordId=chosen;this.tab=0;this.search='';this.target=null;this.selectedCell=null;
   await this.prepareMap();if(token!==this.navigation)return;this.refresh();
  }catch(e){this.message(e.message,true);}
 }
 group(){return collections(this.entry,this.workspace.value(this.entry.file)).find(c=>c.key===this.collectionKey)??collections(this.entry,this.workspace.value(this.entry.file))[0];}
 rows(group=this.group(),value=this.workspace.value(this.entry.file)){
  const data=get(value,group.path);if(group.mode==='single')return [{key:'single',value:data,path:group.path}];
  return Object.entries(data??{}).map(([key,value])=>({key:group.mode==='array'?Number(key):key,value,path:[...group.path,group.mode==='array'?Number(key):key]}));
 }
 current(){const rows=this.rows();return rows.find(r=>String(r.key)===String(this.recordId))??rows[0];}
 recordName(record=this.current()?.value,key=this.current()?.key,kind=this.group().kind){
  if(kind==='system')return record?.name??systemNames[record?.use]??'仕掛け';
  if(kind==='art')return this.context.name('dungeons',record?.dungeon);
  if(kind==='stock')return this.context.name('items',record?.item);
  if(kind==='cellmap'||kind==='map')return record?.name??this.context.name('maps',key);
  if(kind==='script')return record?.commands?.find(c=>typeof c.text==='string')?.text?.slice(0,42)??'処理 '+key;
  if(kind==='cell')return record?.name??({stone_floor:'石の床',stone_wall:'石の壁'})[key]??enumLabel(key);
  if(this.group().mode==='single')return this.group().title;
  return record?.name??record?.title??record?.label??enumLabel(key);
 }
 async prepareMap(token=this.navigation){
  const row=this.current(),kind=this.group().kind,value=row?.value;
  let id=kind==='map'||kind==='cellmap'?row?.key:value?.points?.[0]?.map??value?.entries?.main?.map;
  if(kind==='system'){const find=v=>{if(!v||typeof v!=='object')return;return typeof v.map==='string'?v.map:Object.values(v).map(find).find(Boolean);};id=find(value);}
  if(!id&&this.entry.family==='dungeon')id=this.workspace.value(this.entry.file).entries?.main?.map;
  if(id){await this.context.ensureMap(id);await this.prepare('cell-layers.json');if(token!==this.navigation)return;this.mapId=id;this.z=this.context.map(id)?.voxels?.minZ??0;}
 }
 async selectRecord(key){if(!this.guard())return;this.recordId=key;this.tab=0;this.target=null;this.selectedCell=null;await this.prepareMap();this.refresh();}
 async selectCollection(key){if(!this.guard())return;this.collectionKey=key;this.recordId=this.rows()[0]?.key;this.search='';this.tab=0;this.target=null;this.selectedCell=null;await this.prepareMap();this.refresh();}
 guard(){if(!this.errors.size)return true;this.message('入力中のエラーを直してから操作してください。入力を戻す場合は「不正な入力を取り消す」を選べます。',true);return false;}
 invalidate(){this.epoch++;this.workspace.output=null;if(this.review)this.review.hidden=true;if(this.dirty)this.dirty.textContent=`変更したJSON：${this.workspace.changed().length}件`;
  if(this.undoButton)this.undoButton.disabled=!this.workspace.history.length;if(this.redoButton)this.redoButton.disabled=!this.workspace.future.length;
 }
 message(text,error=false){if(!this.status){this.status=el('p','','status');this.root.prepend(this.status);}this.status.hidden=false;this.status.textContent=text;this.status.className='status'+(error?' error':'');this.status.setAttribute('role',error?'alert':'status');}
 refresh(){
  if(!this.entry)return;for(const cleanup of this.cleanups.splice(0))cleanup();
  this.root.className='studio';clear(this.root);const title=el('div','','studio-heading');title.append(el('p','灯帰りの迷宮 / 原稿編集','eyebrow'),el('h1',this.entry.title));
  title.append(el('p',editableScope[this.entry.family],'intro'),el('p','編集対象：config/'+this.entry.file,'source-file'));
  const guide=el('a','編集対象JSON・使い方');guide.href=new URL('../../doc/CONFIG_EDITORS.md',import.meta.url).href;title.append(guide);
  const chooser=select(editors.map(e=>[e.file,`${e.group} / ${e.title}`]),this.entry.file,file=>this.open(file),'編集するJSON');title.append(chooser);this.root.append(title);
  const toolbar=el('div','','toolbar');this.undoButton=button('戻す',()=>{if(this.guard()){this.workspace.undo();this.refresh();}});this.redoButton=button('やり直す',()=>{if(this.guard()){this.workspace.redo();this.refresh();}});
  this.undoButton.disabled=!this.workspace.history.length;this.redoButton.disabled=!this.workspace.future.length;
  toolbar.append(this.undoButton,this.redoButton,button('変更を確認・JSONを出力',()=>this.reviewChanges(),'primary'),button('変更をすべて破棄',()=>{if(this.confirm('読み込み後の変更をすべて破棄しますか？')){this.errors.clear();this.workspace.discard();this.refresh();}},'danger'));
  this.dirty=el('span',`変更したJSON：${this.workspace.changed().length}件`);this.dirty.id='dirty';toolbar.append(this.dirty);this.root.append(toolbar,el('p','出力前に形式・数値・配置範囲・原稿間の参照を確認します。分岐の全通し実行・到達可能性・素材生成は、反映後のプロジェクト検証で確認してください。','validation-note'));
  this.status=el('p','','status');this.status.setAttribute('role','status');this.status.hidden=true;this.root.append(this.status);
  if(this.errors.size){this.message('入力エラーがあります。出力できません。',true);this.root.append(button('不正な入力を取り消す',()=>{this.errors.clear();this.refresh();}));}
  const nav=el('nav','','collection-tabs');nav.setAttribute('aria-label','編集する内容');for(const c of collections(this.entry,this.workspace.value(this.entry.file))){const b=button(c.title,()=>this.selectCollection(c.key));b.setAttribute('aria-pressed',String(this.group().key===c.key));if(this.entry.family==='terrain'&&c.key==='mapOpenings'){const legacy=el('details');legacy.append(el('summary','互換原稿'),b);nav.append(legacy);}else nav.append(b);}this.root.append(nav);
  const layout=el('div','','studio-layout');this.list=el('aside','','record-list');this.detail=el('section','','record-detail');this.preview=el('aside','','record-preview');layout.append(this.list,this.detail,this.preview);this.root.append(layout);
  this.renderList();this.renderDetail();this.renderPreview();this.review=el('section','','review-panel');this.review.hidden=true;this.root.append(this.review);this.renderAdvanced();
 }
 renderList(){
  clear(this.list);const group=this.group(),rows=this.rows();this.list.append(el('h2',group.title));
  if(group.mode==='single')return;
  const input=el('input');input.type='search';input.placeholder='名前・説明・IDで絞り込み';input.value=this.search;input.setAttribute('aria-label','一覧を検索');input.addEventListener('input',()=>{this.search=input.value;draw();});this.list.append(input);
  const list=el('div','','record-buttons');this.list.append(list);const draw=()=>{clear(list);for(const row of rows){const v=row.value;if(!`${this.recordName(v,row.key)} ${v?.description??''} ${v?.id??row.key}`.toLowerCase().includes(this.search.toLowerCase()))continue;
   const b=button('',()=>this.selectRecord(row.key),'record-button');b.setAttribute('aria-pressed',String(this.current()?.key===row.key));b.append(el('span',this.recordName(v,row.key)),el('small',this.rowSummary(v,group.kind)));list.append(b);
  }};draw();
  if(!['cellmap','art','story'].includes(group.kind)&&this.entry.family!=='voxel')this.list.append(button(group.kind==='map'?'マップを追加':'新規作成',()=>this.addRecord()));
  if(['monster','actor','job','skill','stock'].includes(group.kind)){
   const table=el('table','','compare-table'),head=el('tr');const keys=['monster','actor','job'].includes(group.kind)?['hp','mp','str','vit','agi','int']:group.kind==='skill'?['mp','target']:['price'];head.append(el('th','名前'));for(const k of keys)head.append(el('th',label(k)));const thead=el('thead');thead.append(head);table.append(thead);const body=el('tbody');
   for(const row of rows){const tr=el('tr'),cell=el('td');cell.append(button(this.recordName(row.value,row.key),()=>this.selectRecord(row.key)));tr.append(cell);for(const k of keys)tr.append(el('td',enumLabel(row.value?.stats?.[k]??row.value?.[k]??'—')));body.append(tr);}table.append(body);const disclosure=el('details');disclosure.append(el('summary','一覧で比較'),table);this.list.append(disclosure);
  }
 }
 rowSummary(v,kind){if(kind==='event')return `${enumLabel(v?.trigger)} / ${v?.points?.length??0}地点`;if(kind==='system')return systemNames[v?.use]??'';if(v?.stats)return Object.entries(v.stats).map(([k,n])=>`${label(k)} ${n}`).join(' / ');return v?.description?.slice(0,60)??v?.role??v?.id??'';}
 renderDetail(){
  clear(this.detail);const row=this.current(),group=this.group();if(!row){this.detail.append(el('p','まだ登録がありません。「新規作成」で追加できます。'));return;}
  this.recordId=row.key;const value=row.value,location={file:this.entry.file,path:row.path};
  const source=this.schemas.get(this.entry.file),schema=enrichSchema(group.kind,schemaAt(source,this.workspace.value(this.entry.file),row.path));
  if(['cell','edge'].includes(group.kind)&&value.description)this.detail.append(el('p',value.description,'intro'));
  if(group.kind==='cell'){const source=this.workspace.value(this.entry.file);let count=0,maps=0;for(const p of Object.values(source.maps)){let n=0;for(const line of p.rows)for(const symbol of line)if(p.legend[symbol]===row.key)n++;if(n)maps++;count+=n;}this.detail.append(el('p',`共有セル種を編集中：${maps} マップ・${count} セルで使用。変更は全使用地点に反映され、地点ごとの上書きが優先されます。`,'cost-warning'));}
  this.detail.append(el('h2',this.recordName()),el('p',`出力先：config/${this.entry.file}${value?.id?' / ID: '+value.id:''}`,'source-caption'));
  if(group.kind==='map'){
   const owner=this.context.maps()[row.key]?.owner;if(owner&&owner.file!==this.entry.file){this.detail.append(el('p',`このマップはconfig/${owner.file}の内容が優先されます。`,'unsupported'),button('有効なマップ原稿を開く',()=>this.open(owner.file,{collection:'maps',record:row.key})));return;}
  }
  if(group.kind==='edge'){const source=this.workspace.value(this.entry.file),count=Object.values(source.maps).reduce((n,p)=>n+Object.values(p.edges??{}).filter(e=>e.preset===row.key).length,0);this.detail.append(el('p',`共有エッジ種を編集中：${count} 境界で使用。変更は全使用地点に反映され、個別設定が優先されます。`,'cost-warning'));}
  if(group.kind==='cellmap'){this.renderCellControls();return;}
  if(group.kind==='art'){this.detail.append(renderRecord(this,location,schema,{keys:['dungeon','floor']}),renderArt(this,location,value));return;}
  if(['assignments','bindings'].includes(group.kind)){this.detail.append(renderValue(this,location,schema,group.key,{hideLabel:true,required:true}));return;}
  if(group.kind==='expression'){this.detail.append(renderValue(this,location,{$ref:'#/$defs/value'},'formulaValue',{expression:true}));return;}
  if(group.kind==='script'){this.detail.append(renderCommands(this,{...location,path:[...row.path,'commands']},value.commands??[]));}
  else if(group.kind==='system'){
   this.detail.append(el('p',systemNames[value.use]??value.use,'system-kind'),renderRecord(this,location,schema,{omit:['use']}));
  }else{
   const tabs=(groups[group.kind]??[['設定',Object.keys(schema.properties??value??{}).filter(k=>!readonlyKeys.has(k))]]).filter(([,keys])=>keys.some(k=>value?.[k]!==undefined||schema.properties?.[k]));
   const covered=new Set(tabs.flatMap(([,keys])=>keys));const other=Object.keys(value??{}).filter(k=>!covered.has(k)&&!readonlyKeys.has(k)&&k!=='tiles');if(other.length)tabs.push(['その他の設定',other]);
   this.tab=Math.min(this.tab,Math.max(0,tabs.length-1));const nav=el('nav','','detail-tabs');for(const [i,[name]] of tabs.entries()){const b=button(name,()=>{if(this.guard()){this.tab=i;this.renderDetail();}});b.setAttribute('aria-pressed',String(this.tab===i));nav.append(b);}this.detail.append(nav);
   const keys=tabs[this.tab]?.[1];this.detail.append(renderRecord(this,location,schema,{keys}));
  }
  if(group.kind==='event'||group.kind==='cellEvent')this.renderLinkedScript(value);
  if(group.kind==='map'&&value.voxels)this.renderVoxelControls(location,value);
  if(group.mode!=='single'&&!['story','art','cellmap','map'].includes(group.kind))this.detail.append(button('この項目を複製',()=>this.addRecord(true)),button('この項目を削除',()=>{if(!this.guard()||!this.confirm(this.recordName()+'を削除しますか？参照が残る場合は出力時に表示します。'))return;this.workspace.set(this.entry.file,row.path,undefined,this.recordName()+'を削除');this.recordId=this.rows()[0]?.key;this.refresh();},'danger'));
 }
 renderLinkedScript(value){
  if(!value?.script)return;const owner=this.context.base.scriptOwners[value.script];const local=this.workspace.value(this.entry.file).scripts?.[value.script];
  const card=section('このイベントが実行する内容');if(local)card.append(button('会話・選択肢・消費・報酬を編集',()=>this.selectCollection('scripts').then(()=>this.selectRecord(value.script))));
  else if(owner)card.append(button('処理の正本を開く',()=>this.open(owner.file,{collection:'scripts',record:owner.path.at(-1)})));
  else card.append(el('p','この処理の正本はJavaScript原稿です。ここでは参照だけを設定します。生成済みのdata/は編集しません。','muted'),el('code',value.script));this.detail.append(card);
 }
 renderCellControls(){
  this.detail.append(el('p','配置図でセルを選びます。「選んだセル種を塗る」で通行や外観をまとめて変更できます。'));
  const cell=this.selectedCell;if(!cell||cell.map!==this.mapId)return;const source=this.workspace.value('cell-layers.json'),placement=source.maps[this.mapId],key=`${cell.x},${cell.y}`;if(!placement)return;
  const preset=placement.legend[placement.rows[cell.y][cell.x]],effective=projectMap(this.context,this.mapId).cells[cell.y][cell.x];
  this.detail.append(el('h3',`${cell.x},${cell.y} のセル`),el('p','セル種：'+this.recordName(source.presets[preset],preset,'cell')));
  for(const id of effective.events??[])this.detail.append(button('セル進入イベントを編集：'+enumLabel(id),()=>this.open('cell-layers.json',{collection:'events',record:id})));
  const path=['maps',this.mapId,'overrides',key],override=placement.overrides?.[key],schema=this.schemas.get('cell-layers.json');
  if(!override)this.detail.append(button('この地点だけの設定を作る',()=>{if(!this.guard())return;this.workspace.set('cell-layers.json',path,{passage:effective.passage,visual:clone(effective.visual),parameters:clone(effective.parameters),events:clone(effective.events??[])},'地点だけのセル設定を追加');this.refresh();}));
  else this.detail.append(renderRecord(this,{file:'cell-layers.json',path},schemaAt(schema,source,path)),button('セル種の設定に戻す',()=>{if(!this.guard())return;this.workspace.set('cell-layers.json',path,undefined,'地点だけの上書きを解除');this.refresh();}));
 }
 renderVoxelControls(location,value){
  const box=section('旧3D層を塗る','通常の2D配信には含まれません。配置図のセルを選んで、この高さの通行値を変更します。');
  if(this.selectedCell){const {x,y}=this.selectedCell;for(const [symbol,title] of [['.','床にする'],['#','壁にする']])box.append(button(title,()=>{if(!this.guard())return;const path=[...location.path,'voxels','layers',this.z-value.voxels.minZ,y],row=get(this.workspace.value(location.file),path);if(!row)return;const next=Array.from(row);next[x]=symbol;this.workspace.set(location.file,path,next.join(''),'旧3D層の通行値を変更');this.refresh();}));}this.detail.append(box);
 }
 renderPreview(){
  for(const cleanup of this.cleanups.splice(0))cleanup();clear(this.preview);const row=this.current();if(!row)return;const kind=this.group().kind;
  if(this.target||['event','fieldEvent','system','dungeon','map','cellmap'].includes(kind)){
   if(this.mapId&&this.context.map(this.mapId)){
    if(this.target)this.preview.append(button('配置操作を終了',()=>{this.target=null;this.refresh();}));
    this.preview.append(mapPanel(this,{mapId:this.mapId,target:this.target,paint:['map','cellmap'].includes(kind)&&this.entry.family!=='voxel',selectedCell:this.selectedCell,z:this.z}));
    if(kind==='map'&&this.entry.family!=='voxel')this.preview.append(button('選択セルの詳細を編集',async()=>{const cell=this.selectedCell;await this.open('cell-layers.json',{collection:'maps',record:this.mapId});this.selectedCell=cell;this.refresh();}));
   }
  }else this.preview.append(previewPanel(this,row.value,kind));
  const changed=this.workspace.changed();if(changed.length){const sources=section('今回の出力対象');for(const file of changed)sources.append(el('code','config/'+file));this.preview.append(sources);}
 }
 refreshPreview(){this.renderPreview();this.renderList();}
 async pickPoint(target,map){if(!this.guard())return;try{await this.context.ensureMap(map??this.mapId??Object.keys(this.context.maps())[0]);this.mapId=map??this.mapId;this.target=target;this.renderPreview();}catch(e){this.message(e.message,true);}}
 async openPlacement(point){if(!this.guard())return;const file=point.file;await this.open(file,{path:point.path});this.target={file,path:point.path,eventPath:point.eventPath,name:point.name,allowEdge:true,edgeKey:point.side!==undefined?'side':'edge',omitMap:get(this.workspace.value(file),point.path)?.map===undefined};this.mapId=point.map;this.renderPreview();}
 async addRecord(duplicate=false){
  if(!this.guard())return;const group=this.group(),file=this.entry.file,source=this.workspace.value(file),data=get(source,group.path),root=this.schemas.get(file),row=this.current();
  if(group.kind==='map'){await this.addMap();return;}
  if(group.kind==='event'&&!duplicate){const map=this.mapId??Object.keys(this.context.maps())[0];await this.context.ensureMap(map);this.recordId=addQuestEvent(this.workspace,file,map,this.selectedCell?.x??1,this.selectedCell?.y??1);this.tab=0;this.refresh();return;}
  const key=nextId(data,group.kind),recordPath=group.mode==='array'?[...group.path,data?.length??0]:[...group.path,key];
  const container=schemaAt(root,source,group.path),schema=group.mode==='array'?container.items:container.additionalProperties;
  let value=duplicate?clone(row.value):initialValue(enrichSchema(group.kind,resolveSchema(schema,root,undefined)),root,'',{defaultReference:k=>referenceOptions(this,k,{file,path:recordPath})?.[0]?.[0]});
  if(group.kind==='system'&&!duplicate){this.showSystemCreator(group,root);return;}
  if(value&&typeof value==='object'&&!Array.isArray(value)){if('id' in value)value.id=key;if('name' in value)value.name=duplicate?value.name+' のコピー':'新しい'+label(group.kind);if('title' in value)value.title=duplicate?value.title+' のコピー':'新しいイベント';}
  if(group.kind==='script'&&!duplicate)value={commands:[]};if(group.kind==='expression'&&!duplicate)value=0;
  if(group.kind==='cell'&&!duplicate)value={passage:'.',visual:{wall:false,floor:true,opaque:false,material:'floor'},parameters:{illumination:0,water_passable:true},events:[]};
  if(group.kind==='location'&&!duplicate)value={id:key,name:'新しい場所',parent:null,description:'',background:this.context.options('images')[0]?.[0]??'',links:[]};
  if(group.kind==='script'&&file.startsWith('quests/'))recordPath[recordPath.length-1]=this.entry.id+'.editor.'+key;
  this.workspace.set(file,recordPath,value,duplicate?'項目を複製':'項目を作成');this.recordId=recordPath.at(-1);this.tab=0;this.refresh();
 }
 showSystemCreator(group,root){
  const panel=section('追加する仕掛けを選ぶ');let use=Object.keys(systemNames)[0];panel.append(select(Object.entries(systemNames),use,v=>use=v,'仕掛けの種類'),button('仕掛けを作成',()=>{
   const doc=this.workspace.value(this.entry.file),key=nextId(doc.systems,use),systemSchema=schemaAt(root,doc,['systems']),variants=systemSchema.additionalProperties?.oneOf??[];
   const resolved=variants.map(s=>resolveSchema(s,root,{use})),schema=resolved.find(s=>s.properties?.use?.const===use)??resolveSchema(systemSchema.additionalProperties,root,{use});
   const value=initialValue(schema,root,'',{defaultReference:k=>referenceOptions(this,k,{file:this.entry.file,path:['systems',key]})?.[0]?.[0]});value.use=use;
   this.workspace.set(this.entry.file,['systems',key],value,'仕掛けを追加');this.recordId=key;this.refresh();
  }));this.detail.prepend(panel);
 }
 async addMap(){
  await this.prepare('cell-layers.json');const file=this.entry.file,doc=this.workspace.value(file),id=nextId({...this.context.maps(),...doc.maps},'map'),dungeon=this.context.options('dungeons')[0]?.[0];
  const panel=section('マップを追加','名前・大きさ・所属迷宮を指定します。マップ、セル、迷宮の所属一覧をまとめて変更します。');
  const name=el('input');name.value='新しいマップ';name.setAttribute('aria-label','新しいマップ名');const width=el('input'),height=el('input');for(const [input,title] of [[width,'横のセル数'],[height,'縦のセル数']]){input.type='number';input.min='3';input.max='50';input.value='10';input.setAttribute('aria-label',title);}let selected=dungeon;
  panel.append(name,width,height,select(this.context.options('dungeons'),selected,v=>selected=v,'所属迷宮'),button('この内容で作成',async()=>{
   if(!this.guard())return;const w=Number(width.value),h=Number(height.value);if(!Number.isInteger(w)||!Number.isInteger(h)||w<3||h<3||w>50||h>50){this.message('大きさは3〜50セルの整数です。',true);return;}
   const dungeonFile='dungeons/'+selected+'.json';try{await this.prepare(dungeonFile);const templateId=this.workspace.value(dungeonFile).maps[0];await this.context.ensureMap(templateId);const template=this.context.map(templateId);this.workspace.transaction('マップ・セル・所属を追加',[file,'cell-layers.json',dungeonFile],docs=>{
    const rows=Array.from({length:h},(_,y)=>y===0||y===h-1?'W'.repeat(w):'W'+'F'.repeat(w-2)+'W');docs[file].maps[id]={id,name:name.value||'新しいマップ',region:template.region,dungeon:selected,floor:1,background:template.background,music:template.music,encounter:template.encounter,tiles:rows.map(r=>r.replaceAll('W','#').replaceAll('F','.')),entrance:{x:1,y:1,facing:'south'},objects:[],encounterRate:0};
    docs['cell-layers.json'].maps[id]={legend:{W:'stone_wall',F:'stone_floor'},rows,overrides:{}};docs[dungeonFile].maps.push(id);
   });this.recordId=id;await this.prepareMap();this.refresh();}catch(e){this.message(e.message,true);}
  }));this.detail.prepend(panel);
 }
 addDictionary(location,schema,key){if(!this.guard())return;const data=get(this.workspace.value(location.file),location.path),id=nextId(data,key.replace(/[^a-z]/g,'')||'entry'),value=initialValue(schema,this.schemas.get(location.file),'',{defaultReference:k=>referenceOptions(this,k,location)?.[0]?.[0]});this.workspace.set(location.file,[...location.path,id],value,label(key)+'へ追加');this.refresh();}
 describePath(change){
  const value=this.workspace.value(change.file),parts=[];let cursor=value;for(const key of change.path){cursor=cursor?.[key];if(typeof key==='number')parts.push(cursor?.title??cursor?.name??`${key+1}件目`);else parts.push(cursor?.title??cursor?.name??label(key));}return parts.join(' / ');
 }
 async reviewChanges(){
  if(!this.guard())return;const files=this.workspace.changed();if(!files.length){this.message('変更はありません。');return;}
  const epoch=++this.epoch;this.workspace.output=null;this.review.hidden=true;this.message('変更と参照先を検証しています。');
  try{for(const file of files)await this.prepare(file);const result=await this.workspace.validate((file,value)=>this.validateFile(fileEntry(file),value),(snapshot,changed)=>checkWorkspace(snapshot,changed,this.context.base,this.schemas),files);
   if(result.stale||epoch!==this.epoch){this.workspace.output=null;this.message('検証中に変更されました。もう一度「変更を確認・JSONを出力」を選んでください。');return;}
   clear(this.review);this.review.hidden=false;
   if(result.errors.length){this.message('修正が必要な項目があります。JSONはまだ出力できません。',true);this.review.append(el('h2','修正する項目'));for(const error of result.errors.slice(0,80))this.review.append(button(`config/${error.file}：${error.message}`,async()=>{await this.open(error.file,{path:error.path});const tabs=groups[this.group().kind],key=error.path[this.current()?.path.length??0],tab=tabs?.findIndex(([,keys])=>keys.includes(key));if(tab>=0){this.tab=tab;this.renderDetail();}this.message(error.message,true);const target=[...this.root.querySelectorAll('[data-path]')].find(n=>n.dataset.file===error.file&&n.dataset.path===JSON.stringify(error.path));for(let parent=target?.parentElement;parent;parent=parent.parentElement)if(parent.tagName==='DETAILS')parent.open=true;target?.scrollIntoView?.({block:'center'});target?.querySelector('input,select,textarea')?.focus();}));return;}
   this.message('検証を通過しました。差分と出力先を確認して、JSON全文をコピーしてください。');this.review.append(el('h2','変更内容とJSONの出力'));
   const changes=this.workspace.differences();for(const {file,text} of result.outputs){const panel=section('config/'+file);const list=el('ul');for(const c of changes.filter(c=>c.file===file))list.append(el('li',`${this.describePath(c)}：${short(c.before)} → ${short(c.after)}${c.added?.length?' ／ 追加：'+c.added.map(short).join('、'):''}${c.removed?.length?' ／ 削除：'+c.removed.map(short).join('、'):''}`));panel.append(list);
    for(const ref of this.context.base.unresolvedReferences??[])if(ref.file===file&&get(this.workspace.value(file),ref.path)===ref.id)panel.append(el('p','元原稿にも存在する未解決の参照：'+this.describePath(ref)+' → '+ref.id+'。参照先を選び直して解消できます。','cost-warning'));
    for(const warning of costWarnings(this.workspace.value(file),this.context))panel.append(el('p',warning,'cost-warning'));
    const textarea=el('textarea');textarea.value=text;textarea.readOnly=true;textarea.rows=10;textarea.setAttribute('aria-label','config/'+file+' のJSON全文');
    const copy=button('このJSON全文をコピー',async()=>{if(epoch!==this.epoch||!this.workspace.output){this.message('変更後の再検証が必要です。',true);return;}try{await navigator.clipboard.writeText(text);this.message('config/'+file+' をコピーしました。');}catch{textarea.focus();textarea.select();this.message('自動コピーを利用できません。選択した全文をコピーしてください。');}});
    const details=el('details');details.append(el('summary','JSON全文を確認'),textarea);panel.append(copy,details);this.review.append(panel);
   }this.review.scrollIntoView?.({block:'start'});
  }catch(e){this.workspace.output=null;this.message('検証できません: '+e.message,true);}
 }
 renderAdvanced(){
  const details=el('details','','advanced-json');details.append(el('summary','高度な編集：JSONの確認・取り込み'));
  const area=el('textarea');area.value=serialize(this.workspace.value(this.entry.file));area.rows=12;area.setAttribute('aria-label','編集中のJSON');let pending=false;
  area.addEventListener('input',()=>{pending=true;this.errors.set('raw',{file:this.entry.file,path:[],message:'JSON取り込みが未反映です。'});this.invalidate();});
  const apply=button('このJSONを下書きに反映',async()=>{const file=this.entry.file,epoch=++this.epoch;try{const value=parseJSON(area.value),errors=await this.validateFile(this.entry,value);if(epoch!==this.epoch||file!==this.entry.file)return;if(errors.length)throw Error(errors.join('\n'));this.workspace.replace(file,serialize(value));this.errors.delete('raw');pending=false;await this.prepareMap();this.refresh();this.message('JSONを下書きに反映しました。未知の項目も保持します。');}catch(e){this.message('取り込めません: '+e.message,true);}});
  const input=el('input');input.type='file';input.accept='.json,application/json';input.setAttribute('aria-label','JSONファイルを読み込む');input.addEventListener('change',async()=>{const file=input.files?.[0];if(!file)return;const epoch=++this.epoch;this.errors.set('raw',{file:this.entry.file,path:[],message:'JSON取り込みが未反映です。'});this.workspace.output=null;if(this.review)this.review.hidden=true;try{if(file.size>5*1024*1024)throw Error('5MB以下のJSONを指定してください。');const text=await file.text();if(epoch!==this.epoch)return;area.value=text;pending=true;}catch(e){this.message(e.message,true);}});
  details.append(el('p','通常の編集では扱えない拡張項目も保持します。取り込みはこのページのJSONだけに反映します。','muted'),input,area,apply,button('取り込みを取り消す',()=>{this.errors.delete('raw');pending=false;area.value=serialize(this.workspace.value(this.entry.file));this.invalidate();}));this.root.append(details);
 }
 destroy(){for(const cleanup of this.cleanups.splice(0))cleanup();}
}

if(typeof document!=='undefined'&&document.body.dataset.config){
 const app=new ConfigStudio(document.getElementById('editor'));app.start(document.body.dataset.config).catch(e=>app.message('読み込めません: '+e.message,true));
 globalThis.addEventListener('beforeunload',event=>{if(app.workspace.dirty||app.errors.size){event.preventDefault();event.returnValue='';}});
}
