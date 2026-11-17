import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {loadContent} from '../src/core/loader.js';
import {GameEngine} from '../src/core/engine.js';
import {validateSave} from '../src/core/save.js';
import {drain,exploreSpot,walk,fight} from './helpers.mjs';
export {drain,walk,fight};
export const read=file=>fs.readFile(new URL('../'+file,import.meta.url),'utf8').then(JSON.parse);
export const data=await loadContent(read,{edition:'e2'});
export const previous=await read('tests/fixtures/e2-q006-before-world.json');
export const previousData=await loadContent(async p=>{const d=await read(p);if(p==='data/scenario-editions.json')delete d.editions.e2.questOverrides.q006;return d;},{edition:'e2'});
export const investigation=['open','ledger','ask','office','read','return','compare'];
export const privateLift=['lift','lift','return'];
export const jointLift=['witness','recover','lift','return'];
export const routes=[
  {path:[...privateLift,'return','leave'],outcome:'contract'},
  ...['settle','delegate'].flatMap(end=>[
    {path:[...privateLift,'public',...investigation,end],outcome:end==='settle'?'informed':'compromise'},
    {path:[...privateLift,'return','retract',...investigation,end],outcome:end==='settle'?'informed':'compromise'},
    {path:[...jointLift,...investigation,end],outcome:end==='settle'?'informed':'compromise'},
    {path:['lift',...jointLift,...investigation,end],outcome:end==='settle'?'informed':'compromise'}
  ])
];
export const oldRoutes=[{path:['lift','return','leave'],outcome:'contract'},...['settle','delegate'].flatMap(end=>[['lift','public'],['lift','return','retract'],['witness']].map(start=>({path:[...start,'ledger',end],outcome:end==='settle'?'informed':'compromise'})))];
export function checkpoint(g){const raw=g.save();assert.deepEqual(validateSave(JSON.parse(raw),data),[]);g.load(raw);assert.equal(g.save(),raw);}
export const values=g=>g.state.stories.q006.values;
export function go(g,key){
  const p=g.data.quests.q006.story.worldPlaces?.[key]??previous.locations.find(p=>p.role==='decision');
  exploreSpot(g,p,{interact:false,heal:true});
}
const starts=new Map();
export function ready({old=false,visit=true}={}){
  const content=old?previousData:data;
  if(!starts.has(old)){
    const g=new GameEngine(content,1907);drain(g);g.random=()=>.999999;
    g.award(0,10000);g.state.gold=1000;for(const item of ['torch','ration','potion','rope'])g.give(item,20);
    assert.ok(g.accept('q006'));starts.set(old,g.save());
  }
  const g=new GameEngine(content);g.random=()=>.999999;g.load(starts.get(old));
  if(visit){go(g,'landing');g.run(g.data.quests.q006.model.entryScript);drain(g);}
  return g;
}
export function depart(g,id){assert.ok(g.dispatch({type:'choose',id}),id+': '+g.state.notice);drain(g);}
export function arrive(g){const a=g.data.quests.q006.story.actions[g.state.journey.action];go(g,a.journey.to);if(g.state.journey)assert.ok(g.dispatch({type:'story.resume',quest:'q006'}));drain(g);assert.equal(g.state.journey,null);}
export function choose(g,...ids){for(const id of ids){depart(g,id);if(g.state.battle)fight(g);if(g.state.journey)arrive(g);}}
export function resume(g){const s=g.state.stories.q006;go(g,g.data.quests.q006.story.scenes[s.scene].place);assert.ok(g.dispatch({type:'story.resume',quest:'q006'}));drain(g);}
export function migrated(g){const h=new GameEngine(data);h.random=()=>.999999;h.load(g.save());return h;}
