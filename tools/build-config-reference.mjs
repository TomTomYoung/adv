import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {collectReferences} from '../config/shared/studio/references.js';
const root=path.resolve(import.meta.dirname,'..');
export async function configReference(folder=root){
 const references=[];
 const used=new Set(),read=async f=>{used.add(f);return JSON.parse(await fs.readFile(path.join(folder,f),'utf8'));};
 const game=await read('data/game.json'),assets=await read('data/assets.json'),names={},maps={},placements=[],eventOwners={},refs=new Set(),scriptOwners={},scripts={},sources={};
 for(const file of (await fs.readdir(path.join(folder,'config'))).filter(f=>f.endsWith('.json')).sort())sources[file]=await read('config/'+file);
 for(const file of (await fs.readdir(path.join(folder,'config/dungeons'))).filter(f=>f.endsWith('.json')).sort())sources['dungeons/'+file]=await read('config/dungeons/'+file);
 for(const [kind,file] of Object.entries(game.files.databases)){
  const value=await read(file);if(!value||Array.isArray(value)||typeof value!=='object')continue;
  names[kind]=Object.fromEntries(Object.entries(value).map(([id,v])=>[id,{name:v?.name??v?.title??v?.label??id,...(v?.sprite?{sprite:v.sprite}:{}),...(v?.portrait?{portrait:v.portrait}:{})}]));
 }
 function walk(value){if(!value||typeof value!=='object')return;if(typeof value.ref==='string')refs.add(value.ref);if(['set','add','random.set'].includes(value.op)&&typeof value.target==='string')refs.add(value.target);if(value.op==='flag.set')refs.add('flags.'+value.key);for(const child of Object.values(value))walk(child);}
 for(const file of game.files.scripts){const value=await read(file);for(const [id,s] of Object.entries(value.scripts??{}))scripts[id]={name:s.commands?.find(c=>typeof c.text==='string')?.text?.slice(0,40)??id,file};walk(value);}
 names.quests={};const questFiles=game.files.quests;
 for(const file of questFiles){const q=await read(file);names.quests[q.id]={name:q.title};walk(q);for(const [id,s] of Object.entries(q.scripts??{}))scripts[id]={name:s.commands?.find(c=>typeof c.text==='string')?.text?.slice(0,40)??q.title,file};}
 for(const file of (await fs.readdir(path.join(folder,'config/quests'))).filter(f=>f.endsWith('.json')).sort()){
  const value=await read('config/quests/'+file),source='quests/'+file;walk(value);references.push(...collectReferences(value,source));names.events??={};for(const [i,e] of value.events.entries()){names.events[e.id]={name:e.title};eventOwners[e.id]={file:source,path:['events',i],id:e.id};}
  for(const [i,e] of value.events.entries())for(const [n,p] of e.points.entries())placements.push({file:source,path:['events',i,'points',n],eventPath:['events',i],id:e.id,name:e.title,...p,trigger:e.trigger,fire:e.fire,initialState:e.initialState});
  for(const id of Object.keys(value.scripts??{}))scriptOwners[id]={file:source,path:['scripts',id]};
 }
 for(const [file,value] of Object.entries(sources))for(const [id,s] of Object.entries(value.scripts??{})){scriptOwners[id]={file,path:['scripts',id]};scripts[id]={name:s.commands?.find(c=>typeof c.text==='string')?.text?.slice(0,40)??id,file:'config/'+file};}
 for(const file of game.files.maps){const m=await read(file);let owner=null;
  for(const f of ['kagaribi-content.json','dungeon-content.json','voxel-content.json','connected-maps.json'])if(sources[f]?.maps?.[m.id])owner={file:f,path:['maps',m.id]};
  maps[m.id]={id:m.id,name:m.name,width:m.tiles[0].length,height:m.tiles.length,dungeon:m.dungeon??Object.values(sources).find(d=>Array.isArray(d.maps)&&d.maps.includes(m.id))?.id,file,owner};
 }
 for(const kind of ['sounds','effects','cues','formulas'])names[kind]={...(names[kind]??{}),...Object.fromEntries(Object.entries(sources['presentation.json'][kind]??sources['jobs.json'][kind]??{}).map(([id,v])=>[id,{name:v.name??id}]))};
 names.eventCues=Object.fromEntries(Object.entries(sources['presentation.json'].bindings.events).map(([id,cue])=>[id,{name:id,cue}]));
 const owners={};for(const [file,value] of Object.entries(sources)){
  for(const key of ['items','enemies','encounters','jobs','skills','fieldAbilities','buffs','actors','sounds','effects','cues'])for(const id of Object.keys(value[key]??{}))owners[key+'/'+id]={file,path:[key,id]};
  for(const [i,m] of (value.monsters??[]).entries())owners['enemies/'+m.id]={file,path:['monsters',i],id:m.id};
 }
 for(const [id,owner] of Object.entries(eventOwners))owners['events/'+id]=owner;
 for(const [id,owner] of Object.entries(scriptOwners))owners['scripts/'+id]=owner;
 for(const [id,map] of Object.entries(maps))if(map.owner)owners['maps/'+id]=map.owner;
 for(const id of Object.keys(sources['locations.json']))owners['locations/'+id]={file:'locations.json',path:[id]};
 for(const [kind,key] of [['cellTypes','presets'],['edgeTypes','edgePresets'],['cellEvents','events']])for(const id of Object.keys(sources['cell-layers.json'][key]))owners[kind+'/'+id]={file:'cell-layers.json',path:[key,id]};
 for(const [file,value] of Object.entries(sources))references.push(...collectReferences(value,file));
 const unresolvedReferences=references.filter(r=>!Object.hasOwn(r.kind==='maps'?maps:r.kind==='scripts'?scripts:r.kind==='images'?assets.images:r.kind==='audio'?assets.audio:names[r.kind]??{},r.id));
 return {cellDungeons:Object.fromEntries(Object.entries(sources).filter(([f])=>f.startsWith('dungeons/')).map(([,d])=>[d.id,d])),equipmentTypes:sources['jobs.json'].profile.equipmentTypes,unresolvedReferences,references,generatedFrom:[...used].sort(),names,maps,placements,refs:[...refs].sort(),scripts,scriptOwners,owners,assets};
}
export async function buildConfigReference(folder=root){const value=await configReference(folder);await fs.writeFile(path.join(folder,'config/shared/reference-catalog.js'),'// Generated reference index. Edit config sources, never this file.\nexport const referenceData='+JSON.stringify(value,null,2)+';\n');return value;}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){const value=await buildConfigReference();console.log(`EDITOR REFERENCES: ${Object.keys(value.maps).length} maps, ${value.placements.length} event placements`);}
