import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {loadContent} from '../src/core/loader.js';
import {GameEngine} from '../src/core/engine.js';
import {validateSave} from '../src/core/save.js';
import {createQuestTrial} from '../src/application/quest-playtest.js';
import {drain,fight,exploreSpot,goWorldLocation} from './helpers.mjs';

export {drain,fight};
const read=async file=>JSON.parse(await fs.readFile(new URL('../'+file,import.meta.url),'utf8'));
export const data=await loadContent(read,{edition:'e2'});
export const catalog=await read('playtests/quest-parties.json');
export const previousData=await loadContent(async file=>{
  const content=await read(file);
  if(file==='data/scenario-editions.json')delete content.editions.e2.questOverrides.q026;
  return content;
},{edition:'e2'});
export const previous=previousData.quests.q026;
export const values=g=>g.state.stories.q026.values;
export function checkpoint(g){
  const raw=g.save();
  assert.deepEqual(validateSave(JSON.parse(raw),data),[]);
  g.load(raw);assert.equal(g.save(),raw);
}
export function ready({old=false,visit=true,party='balanced',level=3}={}){
  const g=createQuestTrial(old?previousData:data,catalog,{quest:'q026',party,level,start:visit?'site':'reception',seed:1907}).engine;
  g.random=()=>0.999999;
  drain(g);
  return g;
}
export function go(g,place,options={}){
  const p=g.data.quests.q026.story.worldPlaces[place];
  if(p.kind==='town')goWorldLocation(g,p.location);
  else exploreSpot(g,p,{maintain:true,interact:false,...options});
}
export function depart(g,id){
  assert.ok(g.dispatch({type:'choose',id}),id+': '+g.state.notice);
  drain(g);
}
export function arrive(g,options){
  const action=g.state.journey.action;
  const to=g.data.quests.q026.story.actions[action].journey.to;
  go(g,to,options);
  if(g.state.journey)assert.ok(g.dispatch({type:'story.resume',quest:'q026'}),g.state.notice);
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
  go(g,g.data.quests.q026.story.scenes[g.state.stories.q026.scene].place);
  assert.ok(g.dispatch({type:'story.resume',quest:'q026'}),g.state.notice);drain(g);
}
export function migrated(g){const newEngine=new GameEngine(data);newEngine.load(g.save());return newEngine;}
const agreement=['buyer','ask','agree','receive','return','graft'];
const alternate=['ask','take','return','graft'];
export const routes=[
  {old:['fuel'],path:['fuel','cut','hand'],outcome:'contract'},
  {old:['new'],path:['new',...alternate],outcome:'compromise'},
  {old:['buyer','decline'],path:['buyer','ask','decline',...alternate],outcome:'compromise'},
  {old:['buyer','agree','leave'],path:[...agreement,'leave','entrust'],outcome:'grafted'},
  {old:['buyer','agree','season'],path:[...agreement,'season','sow','wait','inspect','orchard','confirm'],outcome:'informed'}
];
let graph;
export function enumerate(){
  if(graph)return graph;
  const active=[],endings=[],seen=new Set();
  for(const route of routes){
    const g=ready();
    for(const id of route.path){
      const state=g.state.stories.q026,key=JSON.stringify(state);
      if(!seen.has(key)){seen.add(key);active.push({save:g.save(),scene:state.scene,values:structuredClone(state.values)});}
      choose(g,id);
    }
    endings.push({...route,save:g.save()});
  }
  return graph={active,endings};
}
