import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {loadContent} from '../src/core/loader.js';
import {GameEngine} from '../src/core/engine.js';
import {validateSave} from '../src/core/save.js';
import {createQuestTrial} from '../src/application/quest-playtest.js';
import {drain,fight} from './helpers.mjs';
import {goToMinePlace} from './mine-world-travel.mjs';

export {drain,fight};
const read=async file=>JSON.parse(await fs.readFile(new URL('../'+file,import.meta.url),'utf8'));
export const data=await loadContent(read,{edition:'e2'});
export const catalog=await read('playtests/quest-parties.json');
export const previousData=await loadContent(async file=>{
  const contents=await read(file);
  if(file==='data/scenario-editions.json') delete contents.editions.e2.questOverrides.q019;
  return contents;
},{edition:'e2'});
export const previous=previousData.quests.q019;
export const values=g=>g.state.stories.q019.values;
export function checkpoint(g){
  const raw=g.save();
  assert.deepEqual(validateSave(JSON.parse(raw),data),[]);
  g.load(raw);
  assert.equal(g.save(),raw);
}
export function ready({old=false,visit=true}={}){
  const g=createQuestTrial(old?previousData:data,catalog,{quest:'q019',party:'balanced',level:2,start:visit?'site':'reception',seed:1907}).engine;
  g.random=()=>0.999999;
  drain(g);
  return g;
}
export function go(g,place,options={}){
  goToMinePlace(g,g.data.quests.q019.story.worldPlaces[place],options);
}
export function depart(g,id){
  assert.ok(g.dispatch({type:'choose',id}),id+': '+g.state.notice);
  drain(g);
}
export function arrive(g,options){
  const target=g.data.quests.q019.story.actions[g.state.journey.action].journey.to;
  go(g,target,options);
  if(g.state.journey) assert.ok(g.dispatch({type:'story.resume',quest:'q019'}),g.state.notice);
  drain(g);assert.equal(g.state.journey,null);
}
export function choose(g,...ids){
  for(const id of ids){
    depart(g,id);
    if(g.state.battle) fight(g);
    if(g.state.journey) arrive(g);
  }
}
export function resume(g){
  go(g,g.data.quests.q019.story.scenes[g.state.stories.q019.scene].place);
  assert.ok(g.dispatch({type:'story.resume',quest:'q019'}),g.state.notice);drain(g);
}
export function migrated(g){
  const newer=new GameEngine(data);
  newer.load(g.save());return newer;
}
const measure=['dry','control','portion','dryer','weigh','again','return','confirm','store','weigh','record'];
const audit=[...measure,'books','match','contract','compute'];
export const routes=[
  {old:['replace'],path:['replace','carry','swap','follow','return','finish'],outcome:'contract'},
  {old:['average'],path:['average','sign','finish'],outcome:'compromise'},
  {old:['dry','average'],path:[...measure,'average','sign','finish'],outcome:'compromise'},
  {old:['dry','books','limit'],path:[...audit,'limit','sign','finish'],outcome:'compromise'},
  {old:['dry','books','settle'],path:[...audit,'settle','enter','refund','basis','return','finish'],outcome:'informed'}
];
let cache;
export function enumerate(){
  if(cache) return cache;
  const active=[],endings=[],seen=new Set();
  for(const route of routes){
    const g=ready();
    for(const id of route.path){
      const s=g.state.stories.q019,key=JSON.stringify(s);
      if(!seen.has(key)){seen.add(key);active.push({save:g.save(),scene:s.scene,values:structuredClone(s.values)});}
      choose(g,id);
    }
    endings.push({...route,save:g.save()});
  }
  return cache={active,endings};
}
