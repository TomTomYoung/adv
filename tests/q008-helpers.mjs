import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {loadContent} from '../src/core/loader.js';
import {GameEngine} from '../src/core/engine.js';
import {validateSave} from '../src/core/save.js';
import {drain,exploreSpot,walk,fight} from './helpers.mjs';
export {drain,walk,fight};
export const read=file=>fs.readFile(new URL('../'+file,import.meta.url),'utf8').then(JSON.parse);
export const data=await loadContent(read,{edition:'e2'});
export const previous=await read('tests/fixtures/e2-q008-before-world.json');
export const previousData=await loadContent(async p=>{const d=await read(p);if(p==='data/scenario-editions.json')delete d.editions.e2.questOverrides.q008;return d;},{edition:'e2'});
export const inspection=['inspect','retrieve','lift','return','inspect'];
export const routes=[
  {path:['tow','tow','transport','unload','river','release'],outcome:'contract'},
  {path:[...inspection,'declare','river','release','return','apply','declare','fetch','escort','permit','deliver','deliver'],outcome:'informed'},
  {path:[...inspection,'quiet','postpone','fetch','escort','deliver','give','escort','finish'],outcome:'compromise'}
];
export const oldRoutes=[{path:['tow'],outcome:'contract'},{path:['inspect','declare','permit'],outcome:'informed'},{path:['inspect','quiet','deliver'],outcome:'compromise'}];
export const revision1Data={...previousData,quests:{...previousData.quests,q008:{...previousData.quests.q008,story:previous.model.storyUpgrades[0].previous}}};
export function checkpoint(g){const raw=g.save();assert.deepEqual(validateSave(JSON.parse(raw),data),[]);g.load(raw);assert.equal(g.save(),raw);}
export const values=g=>g.state.stories.q008.values;
export function go(g,key){
  const p=g.data.quests.q008.story.worldPlaces?.[key]??previous.locations.find(p=>p.role==='decision');
  exploreSpot(g,p,{interact:false,heal:true});
}
const starts=new Map();
export function ready({old=false,visit=true}={}){
  const content=old===1?revision1Data:old?previousData:data;
  if(!starts.has(old)){
    const g=new GameEngine(content,1907);drain(g);g.random=()=>.999999;
    g.award(0,10000);g.state.gold=1000;for(const item of ['torch','ration','potion','rope'])g.give(item,20);
    assert.ok(g.accept('q008'));starts.set(old,g.save());
  }
  const g=new GameEngine(content);g.random=()=>.999999;g.load(starts.get(old));
  if(visit){go(g,'shore');g.run(g.data.quests.q008.model.entryScript);drain(g);}
  return g;
}
export function depart(g,id){assert.ok(g.dispatch({type:'choose',id}),id+': '+g.state.notice);drain(g);}
export function arrive(g){const a=g.data.quests.q008.story.actions[g.state.journey.action];go(g,a.journey.to);if(g.state.journey)assert.ok(g.dispatch({type:'story.resume',quest:'q008'}));drain(g);assert.equal(g.state.journey,null);}
export function choose(g,...ids){for(const id of ids){depart(g,id);if(g.state.battle)fight(g);if(g.state.journey)arrive(g);}}
export function resume(g){const s=g.state.stories.q008;go(g,g.data.quests.q008.story.scenes[s.scene].place);assert.ok(g.dispatch({type:'story.resume',quest:'q008'}));drain(g);}
export function migrated(g){const h=new GameEngine(data);h.random=()=>.999999;h.load(g.save());return h;}
