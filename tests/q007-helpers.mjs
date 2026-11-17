import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {loadContent} from '../src/core/loader.js';
import {GameEngine} from '../src/core/engine.js';
import {validateSave} from '../src/core/save.js';
import {drain,exploreSpot} from './helpers.mjs';
export {drain};
export const read=file=>fs.readFile(new URL('../'+file,import.meta.url),'utf8').then(JSON.parse);
export const data=await loadContent(read,{edition:'e2'});
export const previous=await read('tests/fixtures/e2-q007-before-world.json');
export const previousData=await loadContent(async p=>{const d=await read(p);if(p==='data/scenario-editions.json')delete d.editions.e2.questOverrides.q007;if(p==='data/scenario-editions/e2/geography.json')for(const id of ['e2_voice_port','e2_voice_corridor','e2_voice_booth'])delete d.additions.locations[id];return d;},{edition:'e2'});
export const letters=['letters','return','deliver'];
export const meeting=['meet','ask','fetch','escort','finish'];
export const routes=[{path:['seal'],outcome:'contract'},{path:['reply','seal'],outcome:'contract'},...['trace','reply'].flatMap(start=>[['finish'],meeting].map(end=>({path:[...(start==='trace'?['trace']:['reply','walk']),...letters,...end],outcome:end.length===1?'compromise':'informed'})))];
export const oldRoutes=[{path:['seal'],outcome:'contract'},{path:['reply','seal'],outcome:'contract'},...['trace','reply'].flatMap(start=>[['finish'],['meet','finish']].map(end=>({path:[...(start==='trace'?['trace']:['reply','walk']),'letters',...end],outcome:end.length===1?'compromise':'informed'})))];
export const values=g=>g.state.stories.q007.values;
export function checkpoint(g){const raw=g.save();assert.deepEqual(validateSave(JSON.parse(raw),data),[]);g.load(raw);assert.equal(g.save(),raw);}
// Use actual parent/child/explicit links. The corridor cannot be skipped.
export function town(g,destination,onMove=()=>{}){
  assert.equal(g.state.mode,'town');const locations=g.data.locations,from=g.state.townLocation,queue=[from],parents=new Map([[from,null]]);
  for(let i=0;i<queue.length&&!parents.has(destination);i++){
    const at=queue[i],edges=[locations[at].parent,...(locations[at].links??[]),...Object.values(locations).filter(l=>l.parent===at).map(l=>l.id)].filter(Boolean);
    for(const to of edges)if(!parents.has(to)){parents.set(to,at);queue.push(to);}
  }
  assert.ok(parents.has(destination));const steps=[];for(let id=destination;id!==from;id=parents.get(id))steps.unshift(id);
  for(const id of steps){assert.ok(g.dispatch({type:'location.move',id}),id+': '+g.state.notice);onMove(id,g);}
}
export function go(g,key){
  const p=g.data.quests.q007.story.worldPlaces?.[key];
  if(p){if(g.state.mode==='dungeon'){assert.ok(g.dispatch({type:'retreat'}));drain(g);}town(g,p.location);}
  else exploreSpot(g,previous.locations.find(p=>p.role==='decision'),{interact:false,heal:true});
}
const starts=new Map();
export function ready({old=false,visit=true}={}){
  const content=old?previousData:data;
  if(!starts.has(old)){const g=new GameEngine(content,1907);drain(g);g.award(0,10000);g.state.gold=1000;for(const id of ['torch','ration','potion'])g.give(id,20);assert.ok(g.accept('q007'));starts.set(old,g.save());}
  const g=new GameEngine(content);g.random=()=>.999999;g.load(starts.get(old));
  if(visit){go(g,'port');g.run(g.data.quests.q007.model.entryScript);drain(g);}return g;
}
export function depart(g,id){assert.ok(g.dispatch({type:'choose',id}),id+': '+g.state.notice);drain(g);}
export function arrive(g){const a=g.data.quests.q007.story.actions[g.state.journey.action];go(g,a.journey.to);if(g.state.journey)assert.ok(g.dispatch({type:'story.resume',quest:'q007'}));drain(g);assert.equal(g.state.journey,null);}
export function choose(g,...ids){for(const id of ids){depart(g,id);if(g.state.journey)arrive(g);}}
export function resume(g){go(g,g.data.quests.q007.story.scenes[g.state.stories.q007.scene].place);assert.ok(g.dispatch({type:'story.resume',quest:'q007'}));drain(g);}
export function migrated(g){const h=new GameEngine(data);h.random=()=>.999999;h.load(g.save());return h;}
export const departures=[[[],'trace'],[['reply'],'walk'],[['trace','letters'],'return'],[['trace',...letters,'meet','ask'],'fetch'],[['trace',...letters,'meet','ask','fetch'],'escort']];
