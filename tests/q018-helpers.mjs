import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {loadContent} from '../src/core/loader.js';
import {GameEngine} from '../src/core/engine.js';
import {validateSave} from '../src/core/save.js';
import {createQuestTrial} from '../src/application/quest-playtest.js';
import {drain,fight} from './helpers.mjs';
import {town} from './oddland-helpers.mjs';

export {drain,fight};
const read=async file=>JSON.parse(await fs.readFile(new URL('../'+file,import.meta.url),'utf8'));
export const data=await loadContent(read,{edition:'e2'});
export const catalog=await read('playtests/quest-parties.json');
export const previousData=await loadContent(async file=>{
  const contents=await read(file);
  if(file==='data/scenario-editions.json') delete contents.editions.e2.questOverrides.q018;
  return contents;
},{edition:'e2'});
export const previous=previousData.quests.q018;
export const values=g=>g.state.stories.q018.values;
export function checkpoint(g){
  const raw=g.save();
  assert.deepEqual(validateSave(JSON.parse(raw),data),[]);
  g.load(raw);
  assert.equal(g.save(),raw);
}
export function ready({old=false,visit=true}={}){
  const g=createQuestTrial(old?previousData:data,catalog,{quest:'q018',party:'balanced',level:2,start:visit?'site':'reception',seed:1907}).engine;
  g.random=()=>0.999999;
  drain(g);
  return g;
}
export function go(g,place,options={}){
  const moves=town(g,g.data.quests.q018.story.worldPlaces[place].location);
  if(options.townMoves!==undefined) options.townMoves+=moves;
}
export function depart(g,id){
  assert.ok(g.dispatch({type:'choose',id}),id+': '+g.state.notice);
  drain(g);
}
export function arrive(g,options){
  const target=g.data.quests.q018.story.actions[g.state.journey.action].journey.to;
  go(g,target,options);
  if(g.state.journey) assert.ok(g.dispatch({type:'story.resume',quest:'q018'}),g.state.notice);
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
  go(g,g.data.quests.q018.story.scenes[g.state.stories.q018.scene].place);
  assert.ok(g.dispatch({type:'story.resume',quest:'q018'}),g.state.notice);drain(g);
}
export function migrated(g){
  const newer=new GameEngine(data);
  newer.load(g.save());return newer;
}
const endings={
  dissolve:['stamp','river','sink','borrower','ow'],
  split:['stamp','line','break','borrower','ow']
};
export const routes=[
  {old:['seize'],path:['seize','shop','hand','door','post'],outcome:'contract'},
  {old:['copy','dissolve'],path:['copy','check','dissolve','escort','dissolve','pay',...endings.dissolve],outcome:'informed'},
  ...['dissolve','split'].flatMap(method=>{
    const outcome=method==='split'?'compromise':'informed';
    return [
      {old:['both',method],path:['both','call','escort',method,'pay',...endings[method]],outcome},
      {old:['copy','meet',method],path:['copy','check','meet','call','escort',method,'verify',...endings[method]],outcome}
    ];
  })
];
let cache;
export function enumerate(){
  if(cache) return cache;
  const active=[],endings=[],seen=new Set();
  for(const route of routes){
    const g=ready();
    for(const id of route.path){
      const s=g.state.stories.q018,key=JSON.stringify(s);
      if(!seen.has(key)){seen.add(key);active.push({save:g.save(),scene:s.scene,values:structuredClone(s.values)});}
      choose(g,id);
    }
    endings.push({...route,save:g.save()});
  }
  return cache={active,endings};
}
