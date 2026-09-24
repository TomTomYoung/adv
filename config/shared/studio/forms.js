import {el,button,select,section,image,short} from './dom.js';
import {labels,label,enumLabel,help,units,commandNames,expressionNames,systemNames} from './labels.js';
import {referenceKinds,listKinds,quantityKinds} from './context.js';
import {get,nextId,pathLabel} from './workspace.js';
import {resolveSchema,initialValue} from './schema-form.js';
import {validateSchema} from '../schema.js';
const clone=v=>structuredClone(v);
const textKeys=new Set(['text','description','brief','past','progression','role','limitation','requirement','message','detail','notice']);
const expressionKeys=new Set(['condition','visibleWhen','when','requires']);
const commandKeys=new Set(['commands','then','else','default','on_win','on_lose','on_escape','on_interrupt']);
const identityKeys=new Set(['id','schemaVersion','version']);
export function referenceOptions(app,key,location,parent={}){
 const context=app.context,path=location.path;
 let kind=referenceKinds[key];
 if(key==='cue'&&path[0]==='fieldAbilities')kind='eventCues';
 if(key==='skill'&&parent.api&&parent.api!=='battle.skill')kind='fieldAbilities';
 if(key==='api')return ['battle.skill','map.reveal','inventory.convert','fire.kindling','wall.break','archive.unlock','party.heal','voxel.traverse','water.traverse','party.dry'].filter(id=>path[0]!=='fieldAbilities'||id!=='battle.skill').map(id=>[id,enumLabel(id)]);
 if(key==='equipmentType')return context.options('equipment-all');
 if(key==='instrument')return ['pluck','bell','flute','pulse','pad','bass','kick','snare','hat'].map(id=>[id,enumLabel(id)]);
 if(key==='asset')kind=parent.op?.startsWith('audio.')?'audio':'images';
 if(key==='effect'||key==='baseEffect'||key==='entryEffect'||key==='fireEffect'){
  const source=app.workspace.value(location.file),fire=Object.values(source.systems??{}).find(s=>s.use==='fire_network');
  if(fire)return Object.entries(fire.effects).map(([id,e])=>[id,e.name]);kind='effects';
 }
 if(key==='parent'||key==='links'&&location.file==='locations.json')kind='locations';
 if(key==='formula')kind='formulas';
 if(key==='key'&&parent.op==='flag.set')return context.refs().filter(([id])=>id.startsWith('flags.')).map(([id,name])=>[id.slice(6),name]);
 if(key==='target'&&['set','add','random.set'].includes(parent.op))return context.refs();
 if(key==='entryFixture'){const fire=Object.values(app.workspace.value(location.file).systems??{}).find(s=>s.use==='fire_network');return fire?.fixtures.map(f=>[f.id,f.name])??[];}
 if(key==='destination'&&typeof parent.destination==='string'){const systemPath=path.slice(0,path.indexOf('systems')+2),system=get(app.workspace.value(location.file),systemPath);if(system?.portals)return system.portals.map(p=>[p.id,p.name]);}
 if(key==='object'){const id=parent.map;return [...new Map(context.placements(id).filter(o=>o.id).map(o=>[o.id,[o.id,o.name]])).values()];}
 if(key==='to'){
  const index=path[0],story=get(app.workspace.value(location.file),[index]);if(story?.nodes)return [...story.nodes.map(n=>[n.id,`場面：${n.title??n.id}`]),...Object.entries(story.outcomes??{}).map(([id,o])=>['@'+id,'結末：'+o.label])];
 }
 if(kind)return context.options(kind);
 return null;
}
export function renderRecord(app,location,schema,{keys,title,description,omit=[]}={}){
 const value=get(app.workspace.value(location.file),location.path),rootSchema=app.schemas.get(location.file),resolved=resolveSchema(schema,rootSchema,value);
 const root=title?section(title,description):el('div','','record-fields');
 if(!value||typeof value!=='object'||Array.isArray(value)){root.append(renderValue(app,location,resolved,location.path.at(-1)??'value'));return root;}
 const properties=resolved.properties??{},available=keys??[...new Set([...Object.keys(properties),...Object.keys(value)])];
 const optional=available.filter(k=>value[k]===undefined&&!omit.includes(k)&&!identityKeys.has(k));
 for(const key of available){if(omit.includes(key)||value[key]===undefined)continue;const s=properties[key]??{};
  if(key==='op'||key==='use'&&systemNames[value.use])continue;
  root.append(renderValue(app,{...location,path:[...location.path,key]},s,key,{parent:value,required:(resolved.required??[]).includes(key)}));
 }
 if(optional.length){const line=el('div','','add-optional');let chosen=optional[0];line.append(select(optional.map(k=>[k,label(k)]),chosen,k=>chosen=k,'追加する設定'),button('設定を追加',()=>{
  if(!app.guard())return;const s=properties[chosen]??{};let next=initialValue(s,rootSchema,chosen,{defaultReference:key=>referenceOptions(app,key,location,value)?.[0]?.[0]});
  if(expressionKeys.has(chosen))next=true;if(commandKeys.has(chosen))next=[];
  app.workspace.set(location.file,[...location.path,chosen],next,`${label(chosen)}を追加`);app.refresh();
 }));root.append(line);}
 return root;
}
export function renderValue(app,location,definition={},key='value',{parent={},required=false,expression=false,hideLabel=false}={}){
 const {file,path}=location,source=app.workspace.value(file),value=get(source,path),rootSchema=app.schemas.get(file),schema=resolveSchema(definition,rootSchema,value);
 const root=el('div','','edit-field');root.dataset.file=file;root.dataset.path=JSON.stringify(path);
 const caption=key==='use'&&file==='presentation.json'?'用途':key==='at'&&path.includes('frames')?'経過割合':key==='floor'&&path.includes('visual')?'床を描く':key==='level'&&path.includes('phases')?'水位':label(key),heading=el('label',caption+(required?' *':''),'field-caption');if(!hideLabel)root.append(heading);
 const error=el('p','','field-error');error.setAttribute('role','status');const errorKey=file+pathLabel(path);
 const write=(next,structural=false)=>{app.errors.delete(errorKey);app.workspace.set(file,path,next,`${app.recordName()}：${caption}を変更`);if(structural)app.refresh();else app.refreshPreview();};
 const inputError=message=>{error.textContent=message;if(message)app.errors.set(errorKey,{file,path,message});else app.errors.delete(errorKey);app.invalidate();};
 if(!required&&!identityKeys.has(key)&&value!==null&&typeof value==='object'&&typeof path.at(-1)!=='number')root.append(button('未指定に戻す',()=>{if(app.guard())write(undefined,true);},'field-remove'));
 if(commandKeys.has(key)&&Array.isArray(value)){root.append(renderCommands(app,location,value));return root;}
 if(expression||expressionKeys.has(key)||(definition.$ref==='#/$defs/value'&&!((typeof value!=='object'||value===null)&&(textKeys.has(key)||referenceOptions(app,key,location,parent)?.length)))||definition.$ref==='#/$defs/expression'||(value?.op&&expressionNames[value.op])){root.append(renderExpression(app,location,value,caption));return root;}
 const nullable=definition.anyOf?.some(s=>s.type==='null')||Array.isArray(definition.type)&&definition.type.includes('null');
 if(nullable&&value===null){root.append(el('span',key==='capacity'?'無制限':'なし'),button('値を指定する',()=>{if(!app.guard())return;const nonnull=definition.anyOf?.find(s=>s.type!=='null')??{...definition,type:definition.type.filter(t=>t!=='null')};write(initialValue(nonnull,rootSchema,key),true);}));return root;}
 if(nullable)root.append(button(key==='capacity'?'無制限にする':'なしにする',()=>{if(app.guard())write(null,true);}));
 if(identityKeys.has(key)){root.append(el('code',String(value),'identifier'),el('small','参照を維持するため通常の編集では変更しません。','muted'));return root;}
 if(value&&typeof value==='object'&&!Array.isArray(value)&&'x' in value&&'y' in value){
  const point=el('div','','point-fields');const map=value.map??app.mapId;
  point.append(renderRecord(app,location,schema,{keys:Object.keys(value)}));
  point.append(button('配置図で場所を選ぶ',()=>app.pickPoint({...location,name:app.recordName()+' / '+caption,allowEdge:Boolean(schema.properties?.edge||schema.properties?.side||value.edge!==undefined),edgeKey:schema.properties?.side?'side':'edge',omitMap:value.map===undefined,eventPath:file.startsWith('quests/')&&path[0]==='events'?path.slice(0,2):undefined},get(app.workspace.value(file),path)?.map??app.mapId)));root.append(point);return root;
 }
 if(Array.isArray(value)){
  root.append(renderArray(app,location,schema,key));return root;
 }
 if(value&&typeof value==='object'){
  if(quantityKinds[key]){root.append(renderQuantity(app,location,value,key));return root;}
  if(schema.properties||['stats','growth','resist','passives','visual','parameters','display','rect'].includes(key)){
   const inner=el('div','',['stats','growth','resist','parameters','rect','display'].includes(key)?'compact-fields':'nested-fields');
   inner.append(renderRecord(app,location,schema));root.append(inner);return root;
  }
  const details=el('details','','nested-card');details.open=['outcomes','initialJobs','bindings','equipment'].includes(key);details.append(el('summary',`${caption}（${Object.keys(value).length}件）`));
  for(const [id,entry] of Object.entries(value)){
   let childSchema=typeof schema.additionalProperties==='object'?schema.additionalProperties:{};
   if(key==='initialJobs')childSchema={type:'string'};
   const childKey=key==='initialJobs'?'job':key==='skillCues'||path.includes('bindings')?'cue':key==='formulas'?'formulaValue':id;
   const card=section(entry?.name??entry?.label??(key==='initialJobs'?app.context.name('actors',id):key==='skillCues'?app.context.name('skills',id):enumLabel(id)));
   card.append(renderValue(app,{file,path:[...path,id]},childSchema,childKey,{expression:key==='formulas',hideLabel:true,parent:value}));details.append(card);
  }
  if(schema.additionalProperties&&typeof schema.additionalProperties==='object')details.append(button('項目を追加',()=>app.addDictionary(location,schema.additionalProperties,key)));
  root.append(details);return root;
 }
 let choices=schema.enum?.map(v=>[JSON.stringify(v),enumLabel(v)]),reference=referenceOptions(app,key,location,parent),control;
 if(choices){control=select(choices,JSON.stringify(value),s=>write(JSON.parse(s),['api','type','kind'].includes(key)),caption);}
 else if(reference?.length){const options=[...reference];if(value===null||!required)options.unshift(['','なし']);const search=el('input');search.type='search';search.placeholder='名前で候補を絞る';search.setAttribute('aria-label',caption+'の候補検索');
  control=select(options,value??'',v=>{if(key==='instrument'&&['kick','snare','hat'].includes(v)){if(!app.guard())return;app.workspace.transaction('音色と打楽器の音高を変更',[file],docs=>{const sound=get(docs[file],path.slice(0,-1));sound.instrument=v;for(const note of sound.notes)note.pitch=({kick:36,snare:38,hat:42})[v];});app.refresh();return;}write(v===''&&value===null?null:v);if(['map','parent','skill','item','sprite','image','background'].includes(key))app.refreshPreview();},caption);
  search.addEventListener('input',()=>{const query=search.value.toLowerCase();for(const option of control.options)option.hidden=option.value!==String(value??'')&&!option.textContent.toLowerCase().includes(query)&&!option.value.toLowerCase().includes(query);});root.append(search);
 }
 else if(typeof value==='boolean'){control=el('input');control.type='checkbox';control.checked=value;control.addEventListener('change',()=>write(control.checked));}
 else{
  control=el(textKeys.has(key)||typeof value==='string'&&(value.length>90||value.includes('\n'))?'textarea':'input');
  if(typeof value==='number'){control.type='number';control.step=schema.type==='integer'?'1':'any';if(schema.minimum!==undefined)control.min=String(schema.minimum);if(schema.maximum!==undefined)control.max=String(schema.maximum);}
  else if(key==='color'||key==='palette')control.type='color';else if(control.tagName==='INPUT')control.type='text';
  if(control.tagName==='TEXTAREA')control.rows=Math.min(9,Math.max(3,String(value??'').split('\n').length));control.value=value??'';
  control.addEventListener('input',()=>{let next=control.value;if(typeof value==='number'){if(!next.trim()||!Number.isFinite(Number(next))){inputError('数値を入力してください。');control.setAttribute('aria-invalid','true');return;}next=Number(next);if(!Number.isSafeInteger(next)&&Number.isInteger(next)){inputError('数値が大きすぎます。');return;}}
   try{const simple={...schema};delete simple.$defs;const errors=validateSchema(next,{$defs:rootSchema?.$defs??{},...simple});if(errors.length){inputError(errors[0]);control.setAttribute('aria-invalid','true');return;}inputError('');control.removeAttribute?.('aria-invalid');write(next);}catch(e){inputError(e.message);}
  });
 }
 control.setAttribute('aria-label',caption);control.id='field-'+encodeURIComponent(errorKey);heading.htmlFor=control.id;root.append(control);
 if(units[key])root.append(el('small',['x','y'].includes(key)&&path.includes('frames')?'px':key==='duration'&&path.includes('phases')?'歩':key==='level'&&path.includes('phases')?'水位':units[key],'unit'));if(help[key])root.append(el('p',help[key],'field-help'));root.append(error);
 if(['sprite','portrait','image','background','asset'].includes(key)&&typeof value==='string'){const asset=app.context.assets().images[value];if(asset)root.append(image(asset,app.context.assetName(value)));}
 if(!required&&!identityKeys.has(key))root.append(button('未指定に戻す',()=>{if(!app.guard())return;write(undefined,true);},'field-remove'));
 return root;
}
function renderArray(app,location,schema,key){
 const value=get(app.workspace.value(location.file),location.path),root=el('div','','array-editor');
 const kind=(['weapon','armor','charm'].includes(key)&&location.path.includes('equipment')?'equipment-'+key:key==='requiresWeapon'?'equipment-weapon':null)??(key==='events'&&location.file==='cell-layers.json'?'cellEvents':null)??listKinds[key]??(key==='effects'&&value.every(v=>typeof v==='string')?'effects':key==='links'&&location.file==='locations.json'?'locations':null);
 const itemSchema=schema.items??{};
 for(const [i,item] of value.entries()){
  const itemLocation={file:location.file,path:[...location.path,i]},row=el('details','','array-card');row.open=value.length<=4;
  row.append(el('summary',`${i+1}. ${item?.name??item?.title??item?.text??(kind?app.context.name(kind,item):typeof item==='string'?enumLabel(item):item?.type?enumLabel(item.type):label(key))}`));
  if(kind&&typeof item==='string')row.append(select(app.context.options(kind),item,next=>{app.workspace.set(location.file,itemLocation.path,next,`${label(key)}を変更`);app.refresh();},label(key)+' '+(i+1)));
  else if(item&&typeof item==='object'&&!Array.isArray(item)&&'x' in item&&'y' in item)row.append(renderValue(app,itemLocation,itemSchema,key,{hideLabel:true}));
  else if(item&&typeof item==='object'&&!Array.isArray(item)&&!item.op){
   const variants=itemSchema.oneOf??itemSchema.anyOf,discriminator=['type','kind'].find(k=>variants?.some(s=>s.properties?.[k]?.const));
   if(discriminator){row.append(select(variants.map(s=>[s.properties[discriminator].const,enumLabel(s.properties[discriminator].const)]),item[discriminator],next=>{if(!app.guard()||!app.confirm('種類を変更しますか？現在の内容は「戻す」で復元できます。'))return;const target=variants.find(s=>s.properties[discriminator].const===next);app.workspace.set(location.file,itemLocation.path,initialValue(target,app.schemas.get(location.file),'',{defaultReference:k=>referenceOptions(app,k,itemLocation)?.[0]?.[0]}),'効果の種類を変更');app.refresh();},'効果の種類'));}
   row.append(renderRecord(app,itemLocation,resolveSchema(itemSchema,app.schemas.get(location.file),item),{omit:discriminator?[discriminator]:[]}));
  }
  else row.append(renderValue(app,itemLocation,itemSchema,typeof item==='object'?'value':key,{expression:location.path.includes('args')}));
  const tools=el('div','','row-tools');for(const [caption,delta] of [['上へ',-1],['下へ',1]]){const b=button(caption,()=>{if(!app.guard())return;app.workspace.transaction(`${label(key)}の順序を変更`,[location.file],docs=>{const list=get(docs[location.file],location.path);[list[i],list[i+delta]]=[list[i+delta],list[i]];});app.refresh();});b.disabled=i+delta<0||i+delta>=value.length;tools.append(b);}
  tools.append(button('複製',()=>{if(!app.guard())return;app.workspace.transaction(`${label(key)}を複製`,[location.file],docs=>{const list=get(docs[location.file],location.path),copy=clone(list[i]);if(copy&&typeof copy==='object'&&copy.id)copy.id=nextId(list,copy.id);list.splice(i+1,0,copy);});app.refresh();}),button('削除',()=>{if(!app.guard())return;if(app.confirm(`${label(key)}の${i+1}件目を削除しますか？`)){app.workspace.set(location.file,itemLocation.path,undefined,`${label(key)}を削除`);app.refresh();}},'danger'));row.append(tools);root.append(row);
 }
 let choice;const options=kind?app.context.options(kind):null;if(options?.length){choice=options[0][0];root.append(select(options,choice,v=>choice=v,'追加する'+label(key)));}
 root.append(button(label(key)+'を追加',()=>{if(!app.guard())return;const rootSchema=app.schemas.get(location.file);let item=choice??initialValue(itemSchema,rootSchema,key,{defaultReference:k=>referenceOptions(app,k,location)?.[0]?.[0]});
  if(item&&typeof item==='object'&&!Array.isArray(item)&&Object.hasOwn(item,'id'))item.id=nextId(value,key.replace(/[^a-z]/g,'')||'entry');
  if(key==='notes')item={pitch:60,start:0,seconds:.2,velocity:90};
  if(key==='grants'&&value[0]){item=clone(value[0]);item.level=1;}
  if(['effects','selfEffects'].includes(key)&&!kind)item={type:'damage',formula:'physical',element:'physical'};
  if(key==='options'&&location.path.includes('nodes')){const story=app.workspace.value(location.file)[location.path[0]];item={text:'新しい選択肢',to:story.nodes[0]?.id??'entry'};}
  if(key==='nodes')item={id:nextId(value,'scene'),options:[]};
  app.workspace.set(location.file,location.path,[...value,item],`${label(key)}を追加`);app.refresh();
 }));return root;
}
function renderQuantity(app,location,value,key){
 const root=el('div','','quantity-list');for(const [id,count] of Object.entries(value)){const row=el('div','','quantity-row');row.append(el('span',app.context.name('items',id)),renderValue(app,{...location,path:[...location.path,id]},{type:'integer',minimum:1},'count',{required:true}),button('外す',()=>{if(!app.guard())return;app.workspace.set(location.file,[...location.path,id],undefined,`${label(key)}から${app.context.name('items',id)}を外す`);app.refresh();}));root.append(row);}
 const options=app.context.options('items').filter(([id])=>!Object.hasOwn(value,id));if(options.length){let chosen=options[0][0];root.append(select(options,chosen,id=>chosen=id,'追加する道具'),button('道具を追加',()=>{if(!app.guard())return;app.workspace.set(location.file,[...location.path,chosen],1,`${label(key)}へ道具を追加`);app.refresh();}));}return root;
}
export function expressionSummary(value,context,depth=0){
 if(depth>8)return '入れ子の条件';if(value===true)return '常に成立';if(value===false)return '成立しない';if(value===null)return '値なし';if(typeof value!=='object')return enumLabel(value);if(Array.isArray(value))return value.map(x=>expressionSummary(x,context,depth+1)).join('、');if(value.ref)return context.refLabel(value.ref);if(value.format)return '文章への値の差し込み';
 if(['and','or'].includes(value.op))return '('+(value.args??[]).map(x=>expressionSummary(x,context,depth+1)).join(value.op==='and'?'、かつ ':'、または ')+')';
 if(value.op==='not')return expressionSummary(value.arg,context,depth+1)+' を満たさない';
 if(value.op==='has_item')return `${context.name('items',value.item)}を${value.count??1}個以上持っている`;
 if(value.op==='has_member')return `${context.name('actors',value.actor)}が同行している`;
 if(value.left!==undefined)return expressionSummary(value.left,context,depth+1)+' '+expressionNames[value.op]+' '+expressionSummary(value.right,context,depth+1);
 return expressionNames[value.op]??'未対応の式を保持';
}
export function renderExpression(app,location,value,caption='条件',depth=0){
 const root=el('div','','expression');if(depth>12){root.append(el('p','深い式は高度なJSON編集で扱えます。元の式は保持しています。','muted'));return root;}
 const rootSchema=app.schemas.get(location.file),definitions=rootSchema.$defs??app.dsl.$defs;
 const mode=value?.ref?'reference':value?.format?'format':value?.op??(Array.isArray(value)?'array':typeof value==='boolean'?'boolean':typeof value==='number'?'number':'string');
 const options=[['boolean','成立／不成立'],['reference','状態の値を参照'],['string','文字・状態名'],['number','数値'],['array','候補の一覧'],['format','文章に値を差し込む'],...Object.entries(expressionNames)];
 const switcher=select(options,mode,next=>{if(!app.guard())return;let replacement;
  if(next==='boolean')replacement=true;else if(next==='number')replacement=0;else if(next==='string')replacement='';else if(next==='array')replacement=[];else if(next==='reference')replacement={ref:'gold'};else if(next==='format')replacement={format:'所持金は{gold}Gです。',values:{gold:{ref:'gold'}}};else{const schema=definitions.expression.oneOf.find(s=>s.properties?.op?.const===next);replacement=initialValue(schema,{$defs:definitions},'',{defaultReference:key=>referenceOptions(app,key,location)?.[0]?.[0]});if(['and','or'].includes(next))replacement.args=[true,true];if(next==='not')replacement.arg=true;if(['eq','ne','gt','gte','lt','lte','in','contains'].includes(next)){replacement.left={ref:'gold'};replacement.right=next==='in'?['active','completed']:0;}}
  if(typeof value==='object'&&value!==null&&!app.confirm('式の種類を変更しますか？現在の式は「戻す」で復元できます。'))return;
  app.workspace.set(location.file,location.path,replacement,`${caption}の種類を変更`);app.refresh();
 },caption+'の種類');root.append(switcher,el('p',expressionSummary(value,app.context),'condition-summary'));
 if(value?.ref){const options=app.context.refs();root.append(select(options,value.ref,ref=>{app.workspace.set(location.file,location.path,{...value,ref},'調べる状態を変更');app.refresh();},'調べる状態'));const search=el('input');search.type='search';search.placeholder='所持品・仲間・依頼などで検索';search.setAttribute('aria-label','状態の候補検索');search.addEventListener('input',()=>{const select=root.querySelectorAll('select')[1];for(const option of select.options)option.hidden=!option.textContent.includes(search.value)&&!option.value.includes(search.value);});root.insertBefore(search,root.lastChild);return root;}
 if(value===null||typeof value!=='object'){
  if(typeof value==='boolean')root.append(select([['true','成立'],['false','不成立']],String(value),v=>{app.workspace.set(location.file,location.path,v==='true','条件の成立を変更');app.refresh();},caption+'の値'));
  else root.append(renderValue(app,location,{type:typeof value==='number'?'number':'string'},'literal',{required:true,hideLabel:true}));return root;
 }
 if(Array.isArray(value)){for(const [i,v] of value.entries()){const row=el('div','','condition-branch');row.append(renderExpression(app,{...location,path:[...location.path,i]},v,'候補 '+(i+1),depth+1),button('候補を削除',()=>{app.workspace.set(location.file,[...location.path,i],undefined,'条件候補を削除');app.refresh();}));root.append(row);}root.append(button('候補を追加',()=>{app.workspace.set(location.file,location.path,[...value,''],'条件候補を追加');app.refresh();}));return root;}
 const variant=value.format?definitions.value?.oneOf?.find(s=>s.properties?.format):definitions.expression?.oneOf.find(s=>s.properties?.op?.const===value.op);
 if(!variant){root.append(el('p','この式は専用編集に未対応です。内容を保持しています。高度なJSON編集で確認できます。','unsupported'));return root;}
 for(const key of new Set([...Object.keys(variant.properties??{}),...Object.keys(value)])){if(key==='op'||value[key]===undefined)continue;
  if(['args','left','right','arg','value','equals'].includes(key)){
   if(key==='args'){for(const [i,v] of value.args.entries()){const row=section(`条件・値 ${i+1}`);row.append(renderExpression(app,{...location,path:[...location.path,key,i]},v,'条件・値 '+(i+1),depth+1),button('条件・値を削除',()=>{if(!app.guard())return;app.workspace.set(location.file,[...location.path,key,i],undefined,'条件を削除');app.refresh();}));root.append(row);}root.append(button('条件・値を追加',()=>{if(!app.guard())return;app.workspace.set(location.file,[...location.path,key],[...value.args,true],'条件を追加');app.refresh();}));}
   else{const row=section(label(key));row.append(renderExpression(app,{...location,path:[...location.path,key]},value[key],label(key),depth+1));root.append(row);}
  }else root.append(renderValue(app,{...location,path:[...location.path,key]},variant.properties[key]??{},key,{parent:value,required:(variant.required??[]).includes(key)}));
 }
 const optional=Object.keys(variant.properties??{}).filter(k=>k!=='op'&&value[k]===undefined);if(optional.length){let key=optional[0];root.append(select(optional.map(k=>[k,label(k)]),key,v=>key=v,'条件の追加項目'),button('条件の項目を追加',()=>{if(!app.guard())return;app.workspace.set(location.file,[...location.path,key],initialValue(variant.properties[key],{$defs:definitions},key,{defaultReference:k=>referenceOptions(app,k,location)?.[0]?.[0]}),'条件の項目を追加');app.refresh();}));}
 return root;
}
export function renderCommands(app,location,commands){
 const root=el('div','','command-sequence'),variants=app.dsl.$defs.command.oneOf;
 for(const [i,command] of commands.entries()){
  const card=el('details','','command-card');card.open=commands.length<=3;card.append(el('summary',`${i+1}. ${commandNames[command.op]??'未対応の処理を保持'}${typeof command.text==='string'?'：'+short(command.text):''}`));
  const schema=variants.find(s=>s.properties.op.const===command.op),loc={file:location.file,path:[...location.path,i]};
  if(schema){card.append(renderRecord(app,loc,schema,{omit:['op']}));if(command.op==='item.take')card.append(el('p','消費する操作です。プレイヤーが選べる選択肢の中に置き、所持数の条件を確認してください。','cost-note'));}
  else card.append(el('p','内容を保持しています。高度なJSON編集で確認できます。','unsupported'));
  const tools=el('div','','row-tools');for(const [text,delta] of [['上へ',-1],['下へ',1]]){const b=button(text,()=>{if(!app.guard())return;app.workspace.transaction('処理の順序を変更',[location.file],docs=>{const list=get(docs[location.file],location.path);[list[i],list[i+delta]]=[list[i+delta],list[i]];});app.refresh();});b.disabled=i+delta<0||i+delta>=commands.length;tools.append(b);}
  tools.append(button('処理を複製',()=>{if(!app.guard())return;const next=clone(commands);next.splice(i+1,0,clone(command));app.workspace.set(location.file,location.path,next,'処理を複製');app.refresh();}),button('処理を削除',()=>{if(!app.guard()||!app.confirm('この処理を削除しますか？'))return;app.workspace.set(location.file,loc.path,undefined,'処理を削除');app.refresh();},'danger'));card.append(tools);root.append(card);
 }
 let op='narrate';const line=el('div','','add-command');line.append(select(Object.entries(commandNames),op,v=>op=v,'追加する処理'),button('処理を追加',()=>{
  if(!app.guard())return;const schema=variants.find(s=>s.properties.op.const===op),value=initialValue(schema,app.dsl,'',{defaultReference:k=>referenceOptions(app,k,location,{op})?.[0]?.[0]});
  if(['say','narrate'].includes(op))value.text='表示する本文';if(op==='choice')value.options=[{id:'option_1',text:'選択肢の本文',commands:[]}];if(op==='if')value.condition=true;
  if(op==='item.take'||op==='item.give'){value.item=app.context.options('items')[0]?.[0]??'';value.count=1;}
  app.workspace.set(location.file,location.path,[...commands,value],`${commandNames[op]}を追加`);app.refresh();
 }));root.append(line);return root;
}
