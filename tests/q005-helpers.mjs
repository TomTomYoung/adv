import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {loadContent} from '../src/core/loader.js';
import {GameEngine} from '../src/core/engine.js';
import {validateSave} from '../src/core/save.js';
import {drain,exploreSpot,walk} from './helpers.mjs';
export {drain,walk};
export const read=file=>fs.readFile(new URL('../'+file,import.meta.url),'utf8').then(JSON.parse);
export const data=await loadContent(read,{edition:'e2'});
export const previous=await read('tests/fixtures/e2-q005-before-world.json');
export const previousData=await loadContent(async p=>{const d=await read(p);if(p==='data/scenario-editions.json')delete d.editions.e2.questOverrides.q005;return d;},{edition:'e2'});
export const routes=[
  {path:['cold','move','pipes','verify'],outcome:'informed'},
  {path:['cold','net','accept'],outcome:'compromise'},
  {path:['warm','clean','move','pipes','verify'],outcome:'informed'},
  {path:['warm','clean','net','accept'],outcome:'compromise'},
  {path:['warm','net','accept'],outcome:'compromise'},
  {path:['burn','burn','return','finish'],outcome:'contract'},
  {path:['net','accept'],outcome:'compromise'}
];
export function checkpoint(g){const raw=g.save();assert.deepEqual(validateSave(JSON.parse(raw),data),[]);g.load(raw);assert.equal(g.save(),raw);}
export const values=g=>g.state.stories.q005.values;
export function go(g,key){
  const p=g.data.quests.q005.story.worldPlaces?.[key]??previous.locations.find(p=>p.role==='decision');
  exploreSpot(g,p,{interact:false,heal:true});
}
const starts=new Map();
export function ready({old=false,visit=true}={}){
  const content=old?previousData:data;
  if(!starts.has(old)){
    const g=new GameEngine(content,1907);drain(g);g.random=()=>.999999;
    g.state.gold=1000;for(const item of ['torch','ration','potion'])g.give(item,20);
    assert.ok(g.accept('q005'));starts.set(old,g.save());
  }
  const g=new GameEngine(content);g.random=()=>.999999;g.load(starts.get(old));
  if(visit){go(g,'drain');g.run(g.data.quests.q005.model.entryScript);drain(g);}
  return g;
}
export function depart(g,id){assert.ok(g.dispatch({type:'choose',id}),id+': '+g.state.notice);drain(g);}
export function arrive(g){const a=g.data.quests.q005.story.actions[g.state.journey.action];go(g,a.journey.to);if(g.state.journey)assert.ok(g.dispatch({type:'story.resume',quest:'q005'}));drain(g);assert.equal(g.state.journey,null);}
export function choose(g,...ids){for(const id of ids){depart(g,id);if(g.state.journey)arrive(g);}}
export function resume(g){const s=g.state.stories.q005;go(g,g.data.quests.q005.story.scenes[s.scene].place);assert.ok(g.dispatch({type:'story.resume',quest:'q005'}));drain(g);}
export function migrated(g){const h=new GameEngine(data);h.random=()=>.999999;h.load(g.save());return h;}
