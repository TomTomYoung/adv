import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {loadContent} from '../src/core/loader.js';
import {GameEngine} from '../src/core/engine.js';
import {validateSave} from '../src/core/save.js';
import {projectGame} from '../src/application/projection.js';
import {createQuestTrial} from '../src/application/quest-playtest.js';
import {drain,walk,fight,navigateMaps} from './helpers.mjs';
import {town} from './oddland-helpers.mjs';
export {drain,walk,fight};
export const read=file=>fs.readFile(new URL('../'+file,import.meta.url),'utf8').then(JSON.parse);
export const data=await loadContent(read,{edition:'e2'}),catalog=await read('playtests/quest-parties.json');
export const previous=await read('tests/fixtures/e2-q015-before-world.json');
export const previousData=await loadContent(async path=>{
  const d=await read(path);
  if(path==='data/scenario-editions.json')delete d.editions.e2.questOverrides.q015;
  return d;
},{edition:'e2'});
export const values=g=>g.state.stories.q015.values;
export function checkpoint(g){const raw=g.save();assert.deepEqual(validateSave(JSON.parse(raw),data),[]);g.load(raw);assert.equal(g.save(),raw);}
export function ready({old=false,visit=true}={}){
  const g=createQuestTrial(old?previousData:data,catalog,{quest:'q015',party:'balanced',level:1,start:visit?'site':'reception',seed:1907}).engine;
  g.random=()=>.999999;drain(g);return g;
}
export function go(g,key,options={}){
 const p=g.data.quests.q015.story?.worldPlaces?.[key]??previous.locations.find(p=>p.role==='decision');
 if(p.kind==='town'){
  if(g.state.mode==='dungeon'){navigateMaps(g,'region_2_f1',options);walk(g,17,1,options);assert.ok(g.dispatch({type:'world.cross',route:'return_cart_surface'}),g.state.notice);drain(g);}
  town(g,p.location);
 }else{
  if(g.state.mode==='town'){town(g,'hikarigaeri_square');assert.ok(g.dispatch({type:'world.cross',route:'return_cart_surface'}),g.state.notice);drain(g);}
  navigateMaps(g,p.map,options);walk(g,p.x,p.y,options);drain(g);
 }
}

export function depart(g,id){assert.ok(g.dispatch({type:'choose',id}),id+': '+g.state.notice);drain(g);}
export function arrive(g,options){const a=g.data.quests.q015.story.actions[g.state.journey.action];go(g,a.journey.to,options);if(g.state.journey)assert.ok(g.dispatch({type:'story.resume',quest:'q015'}),g.state.notice);drain(g);assert.equal(g.state.journey,null);}
export function choose(g,...ids){for(const id of ids){depart(g,id);if(g.state.journey)arrive(g);}}
export function resume(g){go(g,g.data.quests.q015.story.scenes[g.state.stories.q015.scene].place);assert.ok(g.dispatch({type:'story.resume',quest:'q015'}),g.state.notice);drain(g);}
export function migrated(g){const h=new GameEngine(data);h.random=()=>.999999;h.load(g.save());return h;}
const start=['catch','divert','storage','protect','copy'];
const archive=['take','archive','deposit'];
const publish=['prepare','display','publish'];
export const routes=[
 {path:['exorcise','seal','return','finish'],old:['exorcise'],outcome:'contract'},
 {path:['chapel','storage','protect','carry',...archive,'finish'],old:['chapel'],outcome:'compromise'},
 {path:[...start,'complete',...archive,'records','request','receive','families','consult','receive','return','reconcile','water','sample','inspect','return','study',...publish,'finish_informed'],old:['catch','complete'],outcome:'informed'},
 {path:[...start,'missing',...archive,...publish,'finish'],old:['catch','missing'],outcome:'missing'},
 {path:[...start,'deposit',...archive,'store_copy','finish'],old:['catch','deposit'],outcome:'compromise'}
];
let cache;
export function enumerate(){
 if(cache)return cache;const g=ready(),active=[],endings=[],seen=new Set();
 for(const route of routes){g.load(ready().save());for(const id of route.path){
   const s=g.state.stories.q015,key=JSON.stringify(s);if(!seen.has(key)){seen.add(key);active.push({save:g.save(),scene:s.scene,values:structuredClone(s.values)});}
   choose(g,id);
 }endings.push({...route,save:g.save()});}
 return cache={active,endings};
}
export function oldFrames(){
 const saves=new Map();
 for(const route of routes){const g=createQuestTrial(previousData,catalog,{quest:'q015',party:'balanced',level:1,start:'site',seed:1907}).engine;let i=0;
  for(let n=0;n<100;n++){
   const key=JSON.stringify({vm:g.state.vm,waiting:g.state.waiting,flow:g.state.flags.flow?.q015,quest:g.state.quests.q015});saves.set(key,g.save());
   if(g.state.quests.q015.stage==='completed')break;
   assert.ok(g.dispatch(g.state.waiting.type==='text'?{type:'advance'}:{type:'choose',id:route.old[i++]}));
  }
 }
 return [...saves.values()];
}
