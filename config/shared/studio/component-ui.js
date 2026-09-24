import {el,button,select,section,clear} from './dom.js';
import {componentAt,setComponentField,resetComponentField,paintEdge,resizeMap} from './map-components.js';
import {paintCell} from './map-model.js';
import {editors} from '../catalog.js';
import {get} from './workspace.js';
const file='cell-layers.json';
const groups={floor:'床',wall:'壁',water:'水域',special:'危険・特殊'};
function category(id){if(['shallow_water','deep_water','submerged_passage','air_pocket'].includes(id))return 'water';if(['stone_wall','rock_wall','earth_wall','salt_wall','thorn_wall'].includes(id))return 'wall';if(['stone_floor','earth_floor','wood_floor','wet_stone_floor','root_bridge','supported_space'].includes(id))return 'floor';return 'special';}
export const componentUI={
 componentTools(){
  const bar=el('div','','component-tools');
  if(['cells','edges'].includes(this.task)){
   const edge=this.task==='edges',mode=edge?this.edgeTool??'paint':this.mapTool??'paint';
   for(const [id,name] of [['paint','配置する'],['inspect','設定を調べる']]){const b=button(name,()=>{if(!this.guard())return;this[edge?'edgeTool':'mapTool']=id;this.refresh();});b.setAttribute('aria-pressed',String(mode===id));bar.append(b);}
   const source=this.workspace.value(file),presets=edge?source.edgePresets:source.presets,key=edge?'edgeBrush':'brush';this[key]??=Object.keys(presets)[0];bar.append(el('span',presets[this[key]]?.name??'', 'active-brush'));
  }
  if(this.task==='passage')bar.append(el('span','セルか境界を選び、右側で通行の例外を設定します。','muted'));
  if(this.task==='edges')bar.append(el('span','セルの四辺をクリックして境界を指定します。','muted'));
  const overlay=el('label','','map-overlay-toggle'),input=el('input');input.type='checkbox';input.checked=Boolean(this.showMarkers);input.addEventListener('change',()=>{this.showMarkers=input.checked;this.refresh();});overlay.append(input,el('span','イベント・配置物を重ねて表示'));bar.append(overlay,button(this.showLight?'照度を隠す':'初期照度を表示',()=>{this.showLight=!this.showLight;this.refresh();}));return bar;
 },
 renderPalette(edge=false){
  const source=this.workspace.value(file),presets=edge?source.edgePresets:source.presets,key=edge?'edgeBrush':'brush';this[key]??=Object.keys(presets)[0];
  const box=section(edge?'配置するエッジ種':'配置するセル種');
  if(!edge)box.append(select([['all','すべて'],...Object.entries(groups)],this.paletteGroup??'all',v=>{this.paletteGroup=v;this.renderDetail();},'セル種の分類'));
  const list=el('div','','component-palette');list.setAttribute('aria-label',edge?'エッジ種パレット':'セル種パレット');
  for(const [id,p] of Object.entries(presets)){
   if(!edge&&this.paletteGroup&&this.paletteGroup!=='all'&&category(id,p)!==this.paletteGroup)continue;
   const b=button('',()=>{if(!this.guard())return;this[key]=id;this.refresh();},'palette-choice');b.setAttribute('aria-label',p.name??id);b.setAttribute('aria-pressed',String(this[key]===id));b.title=p.description??'';
   const swatch=el('span',edge?'━':'','map-tile palette-swatch '+(p.visual.wall?'wall':'floor'));swatch.dataset.surface=p.visual.surface??'stone';swatch.dataset.preset=id;if(p.parameters.water_depth)swatch.dataset.depth=p.parameters.water_depth;if(!p.visual.floor&&!p.visual.wall&&!edge)swatch.dataset.void='true';swatch.setAttribute('aria-hidden','true');b.append(swatch,el('span',p.name??id));list.append(b);
  }box.append(list,el('p',presets[this[key]]?.description??'','preview-note'));this.detail.append(box);
 },
 changeComponent(x,y,side){
  if(!this.guard()||this.task==='edges'&&!side)return;const edge=Boolean(side);this.selectedCell={map:this.mapId,x,y,...(side?{side}:{})};
  const mode=edge?this.edgeTool??'paint':this.mapTool??'paint';
  if(this.task==='cells'&&!edge&&mode==='paint'||this.task==='edges'&&edge&&mode==='paint'){
   const c=componentAt(this.workspace,this.mapId,this.selectedCell),preset=edge?this.edgeBrush:this.brush;
   if(c?.base&&c.preset!==preset&&Object.keys(c.override).length){
    this.refresh();const panel=section('個別設定のある地点です','種類を置き換えた後の個別設定を選んでください。');
    for(const [policy,name] of [['keep','個別設定を引き継ぐ'],['reset','新しい種類の標準に戻す']])panel.append(button(name,()=>{if(!this.guard())return;this.placeComponent(x,y,side,preset,policy);},policy==='keep'?'primary':''));panel.append(button('置き換えを取り消す',()=>this.refresh()));this.detail.prepend(panel);return;
   }
   this.placeComponent(x,y,side,preset,'keep');return;
  }
  this.refresh();
 },
 placeComponent(x,y,side,preset,policy){try{if(side)paintEdge(this.workspace,this.mapId,x,y,side,preset,policy);else paintCell(this.workspace,this.mapId,x,y,preset,policy);this.refresh();}catch(e){this.message(e.message,true);}},
 componentField(c,path,title,kind='boolean',options){
  const row=el('label','','component-field'),value=get(c.effective,path)??(kind==='number'?0:undefined),override=get(c.override,path)!==undefined;
  row.append(el('span',title),el('small',override?'個別設定':'種類の標準','setting-origin'));
  const change=v=>{if(!this.guard())return;try{if(kind==='number'&&(!Number.isFinite(Number(v))||Number(v)<0||Number(v)> (path.at(-1)==='illumination'?8:path.at(-1)==='water_depth'?2:100)||!Number.isInteger(Number(v))))throw Error('範囲内の整数を入力してください。');setComponentField(this.workspace,this.mapId,this.selectedCell,path,kind==='number'?Number(v):kind==='boolean'?v==='true':v===''&&path.at(-1)==='image'?null:v);this.refresh();}catch(e){input.value=value??'';this.message(e.message,true);}};
  let input;if(kind==='boolean'||options)input=select(options??[['false','いいえ'],['true','はい']],value??(options?options[0]?.[0]:false),change,title);
  else{input=el('input');input.type=kind==='number'?'number':'text';input.value=value??'';input.setAttribute('aria-label',title);if(kind==='number'){input.min=0;input.max=path.at(-1)==='illumination'?8:path.at(-1)==='water_depth'?2:100;input.step=1;}input.addEventListener('change',()=>change(input.value));}
  row.append(input);if(override)row.append(button(title+'を標準に戻す',()=>{if(this.guard()){resetComponentField(this.workspace,this.mapId,this.selectedCell,path);this.refresh();}},'field-remove'));return row;
 },
 renderComponentDetail(){
  clear(this.detail);if(this.task==='size'){this.renderSizeDetail();return;}
  const edge=this.task==='edges',paint=(edge?this.edgeTool??'paint':this.mapTool??'paint')==='paint';
  this.detail.append(el('h2',this.task==='passage'?'通行可否の確認・個別設定':edge?'エッジの配置・設定':'セルの配置・設定'),el('p','出力先：config/cell-layers.json','source-caption'));
  if(this.task!=='passage'&&paint)this.renderPalette(edge);
  const c=componentAt(this.workspace,this.mapId,this.selectedCell);if(!c){this.detail.append(el('p',edge?'境界を選ぶと設定を表示します。':'セルを選ぶと設定を表示します。','muted'));return;}
  if(!c.base){this.detail.append(el('p','この境界にはエッジ種が置かれていません。両側のセルの通行可否に従います。'),button('開口を配置して個別設定する',()=>{if(!this.guard())return;const p=this.selectedCell;paintEdge(this.workspace,this.mapId,p.x,p.y,p.side,'open_passage');this.refresh();}));return;}
  const {x,y,side}=this.selectedCell;this.detail.append(el('h3',`${x},${y}${side?' / '+({north:'北',east:'東',south:'南',west:'西'})[side]+'の境界':''}`),el('p',`${c.edge?'エッジ種':'セル種'}：${c.base.name??c.preset}`));
  this.detail.append(this.componentField(c,['passage'],'通行可否','string',[['.','通行可'],['#','通行不可']]));
  if(this.task==='passage'){this.detail.append(el('p','通行可でも、移動先のセルや仕掛け・配置物が塞いでいれば移動できません。','muted'));return;}
  const visual=section('外観');for(const [key,name] of (c.edge?[['wall','壁を表示'],['opaque','光を遮る']]:[['wall','壁を表示'],['floor','床を表示'],['opaque','光を遮る']]))visual.append(this.componentField(c,['visual',key],name));
  if(!c.edge)visual.append(this.componentField(c,['visual','material'],'素材の種類','string',[['floor','床素材'],['wall','壁素材']]));
  visual.append(this.componentField(c,['visual','surface'],'表面模様','string',(c.edge?['stone','wood','rock','salt']:['stone','earth','wood','wet','ice','cracked','salt','roots','thorns','poison','corrosion','rune','rock']).map(v=>[v,({stone:'石',earth:'土',wood:'木',wet:'濡れ',ice:'氷',cracked:'亀裂',salt:'塩',roots:'根',thorns:'茨',poison:'毒',corrosion:'腐食',rune:'紋様',rock:'岩'})[v]])),this.componentField(c,['visual','image'],'画像','string',[['','標準の素材'],...this.context.options('images')]));this.detail.append(visual);
  const params=section('性質');for(const [key,v] of Object.entries(c.edge?c.effective.parameters:{water_depth:0,slippery:false,fragile:false,safe:false,corrosion:0,...c.effective.parameters}))params.append(this.componentField(c,['parameters',key],({illumination:'局所照度',water_passable:'水を通す',water_depth:'水深',slippery:'滑る',fragile:'離れると崩れる',safe:'通常遭遇を抑える',corrosion:'塩の蓄積',binding:'連動する仕掛け'})[key]??key,typeof v==='boolean'?'boolean':typeof v==='number'?'number':'string'));this.detail.append(params);
  if(!c.edge){const events=section('セル進入時の処理');for(const id of c.effective.events??[])events.append(button('セル進入イベントを編集：'+this.context.name('cellEvents',id),()=>this.open(file,{collection:'events',record:id})),button('この地点から外す：'+this.context.name('cellEvents',id),()=>{if(!this.guard())return;setComponentField(this.workspace,this.mapId,this.selectedCell,['events'],c.effective.events.filter(v=>v!==id));this.refresh();}));const ids=Object.keys(this.workspace.value(file).events).filter(id=>!c.effective.events?.includes(id));if(ids.length){let chosen=ids[0];events.append(select(ids.map(id=>[id,this.context.name('cellEvents',id)]),chosen,v=>{chosen=v;},'追加する進入イベント'),button('この地点に進入イベントを追加',()=>{if(!this.guard())return;setComponentField(this.workspace,this.mapId,this.selectedCell,['events'],[...(c.effective.events??[]),chosen]);this.refresh();}));}if(c.override.events)events.append(button('進入イベントを標準に戻す',()=>{resetComponentField(this.workspace,this.mapId,this.selectedCell,['events']);this.refresh();}));this.detail.append(events);}
  if(Object.keys(c.override).length)this.detail.append(button('この地点の個別設定をすべて解除',()=>{if(this.guard()){resetComponentField(this.workspace,this.mapId,this.selectedCell);this.refresh();}}));
  if(c.edge)this.detail.append(button('このエッジを取り除く',()=>{if(this.guard()){this.workspace.set(file,['maps',this.mapId,'edges',c.key],undefined,'エッジを除去');this.refresh();}}));
  const source=this.workspace.value(file),count=c.edge?Object.values(source.maps).reduce((n,p)=>n+Object.values(p.edges??{}).filter(e=>e.preset===c.preset).length,0):Object.values(source.maps).reduce((n,p)=>n+p.rows.join('').split('').filter(s=>p.legend[s]===c.preset).length,0);
  this.detail.append(el('p',`共有設定は同じ種類を使う全地点（${count}件）に反映され、個別設定が優先されます。`,'cost-warning'),button(c.edge?'共有エッジ種を編集':'共有セル種を編集',()=>{if(this.confirm(`共有設定を変更すると${count}地点へ反映されます。続けますか？`))this.open(file,{collection:c.edge?'edgePresets':'presets',record:c.preset});}));
 },
 renderSizeDetail(){
  const p=this.workspace.value(file).maps[this.mapId],box=section('マップサイズ','左上を固定して右・下へ変更します。追加部分は石壁です。');
  const width=el('input'),height=el('input');for(const [input,name,value] of [[width,'マップの横幅',p.rows[0].length],[height,'マップの縦幅',p.rows.length]]){input.type='number';input.min=3;input.max=50;input.value=value;input.setAttribute('aria-label',name);const label=el('label',name);label.append(input);box.append(label);}
  const owner=this.context.maps()[this.mapId].owner?.file??'connected-maps.json';box.append(el('p',`出力先：config/cell-layers.json、config/${owner}。流れの配置がある場合は該当する迷宮JSONも更新します。`,'source-caption'),button('サイズ変更を適用',async()=>{try{await this.resizeCurrent(Number(width.value),Number(height.value));this.refresh();this.message('マップサイズを変更しました。');}catch(e){this.message(e.message,true);}}));this.detail.append(box);
 },
 async resizeCurrent(width,height){
  if(!this.guard())return;const map=this.mapId,navigation=this.navigation,revision=this.workspace.revision;await Promise.all(editors.map(e=>this.workspace.load(e.file)));await this.prepare('connected-maps.json');
  const game=await this.context.data('data/game.json'),readonly=[];
  const files=[...game.files.scripts,...game.files.quests];const values=await Promise.all(files.map(f=>this.context.data(f)));
  for(const [i,value] of values.entries()){const copy=structuredClone(value);if(copy.scripts)for(const id of Object.keys(copy.scripts))if(this.context.base.scriptOwners[id])delete copy.scripts[id];readonly.push([files[i],copy]);}
  if(navigation!==this.navigation||map!==this.mapId||revision!==this.workspace.revision||!this.guard())throw Error('読み込み中に編集対象が変わりました。もう一度適用してください。');
  resizeMap(this.workspace,this.context,map,width,height,readonly);this.selectedCell=null;
 }
};
