import {referenceData} from '../reference-catalog.js';
import {get} from './workspace.js';
import {label,enumLabel} from './labels.js';
export const referenceKinds={map:'maps',dungeon:'dungeons',quest:'quests',actor:'actors',character:'characters',item:'items',fuelItem:'items',emberItem:'items',protectionItem:'items',skill:'skills',battleSkill:'skills',ability:'fieldAbilities',job:'jobs',enemy:'enemies',encounter:'encounters',guardEncounter:'encounters',status:'statuses',buff:'buffs',sprite:'images',portrait:'images',image:'images',background:'images',music:'audio',sound:'sounds',cue:'cues',script:'scripts',event:'events'};
export const listKinds={maps:'maps',dungeons:'dungeons',skills:'skills',blockedSkills:'skills',suppressedSkills:'skills',abilities:'fieldAbilities',blockedAbilities:'fieldAbilities',items:'items',enemies:'enemies',statuses:'statuses',buffs:'buffs',commonSkills:'skills'};
export const quantityKinds={materials:'items',output:'items',harvest:'items',immatureHarvest:'items',supplies:'items'};
export const statNames={hp:'HP',mp:'MP',str:'力',vit:'防御',agi:'速さ',int:'知力'};
export class EditorContext{
 constructor(workspace,read,base=referenceData){this.workspace=workspace;this.read=read;this.base=base;this.mapCache=new Map();this.pending=new Map();}
 async data(file){if(!this.pending.has(file))this.pending.set(file,Promise.resolve().then(()=>this.read(file)).then(x=>typeof x==='string'?JSON.parse(x):x).catch(e=>{this.pending.delete(file);throw e;}));return this.pending.get(file);}
 names(kind){
  if(kind.startsWith('equipment-')){const types=this.workspace.documents.get('jobs.json')?.value.profile.equipmentTypes??this.base.equipmentTypes;return Object.fromEntries((kind==='equipment-all'?Object.values(types).flat():types[kind.slice(10)]??[]).map(id=>[id,{name:enumLabel(id)}]));}
  if(kind==='eventCues'){const bindings=this.workspace.documents.get('presentation.json')?.value.bindings?.events;return bindings?Object.fromEntries(Object.entries(bindings).map(([id,cue])=>[id,{name:enumLabel(id),cue}])):this.base.names.eventCues;}
  if(kind==='maps')return Object.fromEntries(Object.entries(this.maps()).map(([id,m])=>[id,{name:m.name}]));
  if(kind==='images'||kind==='audio')return Object.fromEntries(Object.entries(this.assets()[kind==='images'?'images':'audio']).map(([id,path])=>[id,{name:this.assetName(id),path}]));
  if(kind==='scripts'){
   const values={...this.base.scripts};for(const [id,owner] of Object.entries(this.base.scriptOwners))if(this.workspace.documents.has(owner.file)&&!get(this.workspace.value(owner.file),owner.path))delete values[id];
   for(const [file,d] of this.workspace.documents)for(const [id,s] of Object.entries(d.value.scripts??{}))values[id]={name:s.commands?.find(c=>typeof c.text==='string')?.text?.slice(0,38)??id,file:'config/'+file};return values;
  }
  if(kind==='events'){
   const values={...this.base.names.events,...Object.fromEntries(this.base.placements.map(e=>[e.id,{name:e.name}]))};
   for(const [file,d] of this.workspace.documents)if(file.startsWith('quests/')){for(const [key,o] of Object.entries(this.base.owners))if(key.startsWith('events/')&&o.file===file)delete values[key.slice(7)];for(const e of d.value.events??[])values[e.id]={name:e.title};}
   const cells=this.workspace.documents.get('cell-layers.json')?.value?.events??{};for(const [id,e] of Object.entries(cells))values[id]={name:e.name??id};return values;
  }
  const values={...(this.base.names[kind]??{})};
  for(const [key,owner] of Object.entries(this.base.owners))if(key.startsWith(kind+'/')&&this.workspace.documents.has(owner.file)&&(owner.id?get(this.workspace.value(owner.file),owner.path)?.id!==owner.id:get(this.workspace.value(owner.file),owner.path)===undefined))delete values[key.slice(kind.length+1)];
  for(const [file,d] of this.workspace.documents){const v=d.value;
   if(kind==='locations'&&file==='locations.json')return v;
   if(kind==='dungeons'&&file.startsWith('dungeons/'))values[v.id]=v;
   if(kind==='cellTypes'&&file==='cell-layers.json')return v.presets;
   if(kind==='cellEvents'&&file==='cell-layers.json')return v.events;
   if(kind==='enemies')for(const e of v.monsters??[])values[e.id]=e;
   if(v[kind]&&!Array.isArray(v[kind])&&typeof v[kind]==='object')for(const [id,record] of Object.entries(v[kind]))if(!this.base.owners[kind+'/'+id]||this.base.owners[kind+'/'+id].file===file)values[id]=record;
  }return values;
 }
 name(kind,id){if(id===null)return 'なし';return this.names(kind)?.[id]?.name??this.names(kind)?.[id]?.title??enumLabel(id);}
 options(kind){return Object.entries(this.names(kind)).map(([id,v])=>[id,v.name??v.title??enumLabel(id)]);}
 assetName(id){for(const kind of ['characters','actors','enemies'])for(const v of Object.values(this.base.names[kind]??{}))if(v.sprite===id||v.portrait===id)return v.name;return this.base.names.sounds?.[id]?.name??this.base.names.effects?.[id.replace(/^fx_/,'')]?.name??id.replace(/^location_/,'町の背景：').replace(/^fx_/,'演出素材：');}
 assets(){const assets=structuredClone(this.base.assets),art=this.workspace.documents.get('dungeon-art.json')?.value;if(art){assets.images.dungeon_walls=art.assets.walls;assets.images.dungeon_devices=art.assets.devices;}return assets;}
 maps(){
  const maps={...this.base.maps};
  for(const [id,m] of Object.entries(maps))if(m.owner&&this.workspace.documents.has(m.owner.file)&&!get(this.workspace.value(m.owner.file),m.owner.path))delete maps[id];
  for(const [file,d] of this.workspace.documents){if(file==='cell-layers.json'||Array.isArray(d.value.maps)||!d.value.maps)continue;for(const [id,m] of Object.entries(d.value.maps)){
   if(maps[id]?.owner&&maps[id].owner.file!==file)continue;
   maps[id]={...maps[id],id,name:m.name,dungeon:m.dungeon??maps[id]?.dungeon,owner:{file,path:['maps',id]}};
  }}return maps;
 }
 async ensureMap(id){
  const meta=this.maps()[id];if(!meta)throw Error('このマップは見つかりません。');
  if(meta.owner)await this.workspace.load(meta.owner.file);
  if(!this.mapCache.has(id)){if(meta.file)this.mapCache.set(id,await this.data(meta.file));else this.mapCache.set(id,structuredClone(get(this.workspace.value(meta.owner.file),meta.owner.path)));}
  await this.workspace.load('cell-layers.json');
  if(meta.dungeon)await this.workspace.load('dungeons/'+meta.dungeon+'.json');
  return this.map(id);
 }
 map(id){const meta=this.maps()[id];if(!meta)return null;const source=meta.owner&&this.workspace.documents.has(meta.owner.file)?get(this.workspace.value(meta.owner.file),meta.owner.path):null;return source??this.mapCache.get(id)??null;}
 placements(mapId){
  const loaded=new Set([...this.workspace.documents.keys()].filter(f=>f.startsWith('quests/'))),values=this.base.placements.filter(p=>p.map===mapId&&!loaded.has(p.file));
  for(const file of loaded)for(const [i,e] of (this.workspace.value(file).events??[]).entries())for(const [n,p] of (e.points??[]).entries())if(p.map===mapId)values.push({file,path:['events',i,'points',n],eventPath:['events',i],id:e.id,name:e.title,...p,trigger:e.trigger,fire:e.fire,initialState:e.initialState});
  const meta=this.maps()[mapId],map=this.map(mapId);if(map?.entrance)values.push({...map.entrance,map:mapId,file:meta.owner?.file,path:meta.owner?[...meta.owner.path,'entrance']:null,name:'マップの入口'});for(const [i,o] of (map?.objects??[]).entries())values.push({...o,map:mapId,file:meta.owner?.file,path:meta.owner?[...meta.owner.path,'objects',i]:null,name:o.name??o.id});
  for(const [file,d] of this.workspace.documents)if(file.startsWith('dungeons/')){
   function walk(v,path=[],name){if(!v||typeof v!=='object')return;name=v.name??name;if(v.map===mapId&&Number.isInteger(v.x)&&Number.isInteger(v.y))values.push({...v,file,path,name:name?name+(['a','b'].includes(path.at(-1))?' / '+path.at(-1).toUpperCase():''):label(path.at(-2)??path.at(-1)),system:true});for(const [k,x] of Object.entries(v))walk(x,[...path,Array.isArray(v)?Number(k):k],name);}
   walk(d.value.systems,['systems']);
   for(const [i,e] of (d.value.fieldEvents??[]).entries())for(const [n,p] of (e.points??[]).entries())if(p.map===mapId)values.push({...p,file,path:['fieldEvents',i,'points',n],eventPath:['fieldEvents',i],name:e.title??e.id});
  }return values;
 }
 refLabel(ref){
  const pieces=ref.split('.');
  if(pieces[0]==='quests')return `依頼「${this.name('quests',pieces[1])}」の${({stage:'進行状況',outcome:'結末'})[pieces[2]]??label(pieces[2])}`;
  if(pieces[0]==='actors')return `仲間「${this.name('actors',pieces[1])}」の${label(pieces.at(-1))}`;
  if(pieces[0]==='inventory')return `所持品「${this.name('items',pieces.slice(1).join('.'))}」の個数`;
  const known={gold:'所持金',light:'灯油', 'party.hp_ratio':'隊のHP割合','field.illumination':'現在地の照度','battle.round':'戦闘のターン数','battle.pendingResult':'戦闘の結果','self.hp_ratio':'行動者のHP割合','self.hp':'行動者のHP','self.mp':'行動者のMP'};
  if(known[ref])return known[ref];if(pieces[0]==='flags')return '進行フラグ：'+pieces.slice(1).map(p=>this.base.names.quests[p]?.name??p).join(' / ');
  return pieces.map(p=>label(p)).join(' / ');
 }
 refs(){const values=new Set([...this.base.refs,'gold','light','field.illumination','battle.round','self.hp','self.mp','self.hp_ratio']);for(const id of Object.keys(this.names('items')))values.add('inventory.'+id);for(const id of Object.keys(this.names('actors')))for(const stat of Object.keys(statNames))values.add('actors.'+id+'.'+stat);return [...values].map(ref=>[ref,this.refLabel(ref)]);}
}
