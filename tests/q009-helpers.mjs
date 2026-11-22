import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {loadContent} from '../src/core/loader.js';
import {GameEngine} from '../src/core/engine.js';
import {validateSave} from '../src/core/save.js';
import {projectGame} from '../src/application/projection.js';
import {drain,exploreSpot,walk,fight} from './helpers.mjs';
import {ratRouteLocations} from '../authoring/editions/e2/story-q009.mjs';
export {drain,walk,fight};
export const read=file=>fs.readFile(new URL('../'+file,import.meta.url),'utf8').then(JSON.parse);
export const data=await loadContent(read,{edition:'e2'});
export const previous=await read('tests/fixtures/e2-q009-before-world.json');
export const previousData=await loadContent(async path=>{
  const contents=await read(path);
  if(path==='data/scenario-editions.json'){
    delete contents.editions.e2.questOverrides.q009;
    delete contents.editions.e2.questOverrides.q018;
  }
  if(path==='data/scenario-editions/e2/geography.json'){
    const sites=Object.values(data.quests.q018.story.worldPlaces).map(p=>p.location);
    for(const id of [...Object.keys(ratRouteLocations),...sites]) delete contents.additions.locations[id];
  }
  return contents;
},{edition:'e2'});
export const values=g=>g.state.stories.q009.values;
export function checkpoint(g){const raw=g.save();assert.deepEqual(validateSave(JSON.parse(raw),data),[]);g.load(raw);assert.equal(g.save(),raw);}
// All new journeys use the existing surface stair and adjoining town doors.
// No retreat, teleport, forced healing or encounter suppression is used here.
export function town(g,destination,onMove=()=>{}){
  assert.equal(g.state.mode,'town');const locations=g.data.locations,from=g.state.townLocation,queue=[from],parents=new Map([[from,null]]);
  for(let i=0;i<queue.length&&!parents.has(destination);i++){
    const at=queue[i],edges=[locations[at].parent,...(locations[at].links??[]),...Object.values(locations).filter(l=>l.parent===at).map(l=>l.id)].filter(Boolean);
    for(const to of edges)if(!parents.has(to)){parents.set(to,at);queue.push(to);}
  }
  assert.ok(parents.has(destination));const steps=[];for(let id=destination;id!==from;id=parents.get(id))steps.unshift(id);
  for(const id of steps){assert.ok(g.dispatch({type:'location.move',id}),id+': '+g.state.notice);onMove(id,g);drain(g);}
}
export function go(g,key,{maintain=false,onMove}={}){
  const p=g.data.quests.q009.story.worldPlaces?.[key];
  if(!p){exploreSpot(g,previous.locations.find(p=>p.role==='decision'),{interact:false,heal:true});return;}
  if(p.kind==='town'){
    if(g.state.mode==='dungeon'){assert.equal(g.state.location.map,'region_1_f1');walk(g,1,1,{maintain});assert.ok(g.dispatch({type:'world.cross',route:'waterway_surface'}),g.state.notice);drain(g);}
    town(g,p.location,onMove);
  }else{
    if(g.state.mode==='town'){town(g,'e2_wharf',onMove);assert.ok(g.dispatch({type:'world.cross',route:'waterway_surface'}),g.state.notice);drain(g);}
    assert.equal(g.state.location.map,p.map);walk(g,p.x,p.y,{maintain});
  }
}
const starts=new Map();
export function ready({old=false,visit=true}={}){
  const content=old?previousData:data;
  if(!starts.has(old)){const g=new GameEngine(content,1907);drain(g);g.random=()=>.999999;g.award(0,10000);g.state.gold=1000;for(const item of ['torch','ration','potion'])g.give(item,20);assert.ok(g.accept('q009'));starts.set(old,g.save());}
  const g=new GameEngine(content);g.random=()=>.999999;g.load(starts.get(old));
  if(visit){go(g,'junction');g.run(g.data.quests.q009.model.entryScript);drain(g);}return g;
}
export function depart(g,id){assert.ok(g.dispatch({type:'choose',id}),id+': '+g.state.notice);drain(g);}
export function arrive(g,options){const a=g.data.quests.q009.story.actions[g.state.journey.action];go(g,a.journey.to,options);if(g.state.journey)assert.ok(g.dispatch({type:'story.resume',quest:'q009'}));drain(g);assert.equal(g.state.journey,null);}
export function choose(g,...ids){for(const id of ids){depart(g,id);if(g.state.battle)fight(g);if(g.state.journey)arrive(g);}}
export function resume(g){go(g,g.data.quests.q009.story.scenes[g.state.stories.q009.scene].place);assert.ok(g.dispatch({type:'story.resume',quest:'q009'}));drain(g);}
export function migrated(g){const h=new GameEngine(data);h.random=()=>.999999;h.load(g.save());return h;}
export const informed=['trace','work','listen','zones','granary','guide','holes','verify','survey','return','finish'];
export const delivery=['grain','request','escort','load','transport','receive'];
// A finite state search includes the set of executed actions, so cycles are
// explored to a fixed point without pretending to enumerate infinite walks.
export function enumerate({old=false}={}){
  const g=ready({old}),queue=[{save:g.save(),path:[]}],seen=new Set(),active=[],endings=[];
  for(let i=0;i<queue.length;i++){
    assert.ok(i<10000,'finite story state graph');const node=queue[i];g.load(node.save);const s=g.state.stories.q009,key=JSON.stringify({...s,events:[...s.events].sort()});
    if(seen.has(key))continue;seen.add(key);
    const row={...node,scene:s.scene,values:structuredClone(s.values),knowledge:structuredClone(s.knowledge)};
    if(g.state.quests.q009.stage==='completed'){endings.push({...row,outcome:g.state.quests.q009.outcome});continue;}
    active.push(row);
    for(const option of projectGame(g).dialog.options.filter(o=>o.enabled)){
      g.load(node.save);choose(g,option.id);queue.push({save:g.save(),path:[...node.path,option.id]});
    }
  }
  return {active,endings};
}
