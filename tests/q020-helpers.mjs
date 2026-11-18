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
  const content=await read(file);
  if(file==='data/scenario-editions.json')delete content.editions.e2.questOverrides.q020;
  return content;
},{edition:'e2'});
export const previous=previousData.quests.q020;
export const values=g=>g.state.stories.q020.values;
export function checkpoint(g){
  const raw=g.save();
  assert.deepEqual(validateSave(JSON.parse(raw),data),[]);
  g.load(raw);
  assert.equal(g.save(),raw);
}
export function ready({old=false,visit=true,party='balanced',level=2}={}){
  const g=createQuestTrial(old?previousData:data,catalog,{quest:'q020',party,level,start:visit?'site':'reception',seed:1907}).engine;
  g.random=()=>0.999999;drain(g);
  return g;
}
export function go(g,place,options={}){
  goToMinePlace(g,g.data.quests.q020.story.worldPlaces[place],options);
}
export function depart(g,id){
  assert.ok(g.dispatch({type:'choose',id}),id+': '+g.state.notice);
  drain(g);
}
export function arrive(g,options){
  const action=g.state.journey.action;
  const target=g.data.quests.q020.story.actions[action].journey.to;
  go(g,target,options);
  if(g.state.journey)assert.ok(g.dispatch({type:'story.resume',quest:'q020'}),g.state.notice);
  drain(g);assert.equal(g.state.journey,null);
}
export function choose(g,...ids){
  for(const id of ids){
    depart(g,id);
    if(g.state.battle)fight(g);
    if(g.state.journey)arrive(g);
  }
}
export function resume(g){
  go(g,g.data.quests.q020.story.scenes[g.state.stories.q020.scene].place);
  assert.ok(g.dispatch({type:'story.resume',quest:'q020'}),g.state.notice);drain(g);
}
export function migrated(g){
  const newer=new GameEngine(data);
  newer.load(g.save());
  return newer;
}
const handover=['accept','return','receive','escort'];
const watch=['patrol','report','recruit'];
const brace=['brace','deep','replace','branch','seal','return'];
export const routes=[
  {old:['relieve','recruit'],path:['relieve',...handover,'recruit',...watch],outcome:'compromise'},
  {old:['relieve','repair','shift'],path:['relieve',...handover,'repair','inspect','measure','shift',...watch],outcome:'compromise'},
  {old:['supports','shift'],path:['supports','inspect','measure','shift',...handover,'recruit',...watch],outcome:'compromise'},
  {old:['supports','brace'],path:['supports','inspect','measure','brace',...brace,'open_keeper','escort','record','archive','deposit'],outcome:'informed'},
  {old:['relieve','repair','brace'],path:['relieve',...handover,'repair','inspect','measure','brace',...brace,'open_shifted','file','record','archive','deposit'],outcome:'informed'},
  {old:['fight'],path:['fight','break','finish'],outcome:'contract'}
];
let graph;
export function enumerate(){
  if(graph)return graph;
  const active=[],endings=[],seen=new Set();
  for(const route of routes){
    const g=ready();
    for(const id of route.path){
      const state=g.state.stories.q020,key=JSON.stringify(state);
      if(!seen.has(key)){
        seen.add(key);
        active.push({save:g.save(),scene:state.scene,values:structuredClone(state.values)});
      }
      choose(g,id);
    }
    endings.push({...route,save:g.save()});
  }
  return graph={active,endings};
}
