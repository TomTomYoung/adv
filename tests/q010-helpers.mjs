import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {loadContent} from '../src/core/loader.js';
import {GameEngine} from '../src/core/engine.js';
import {validateSave} from '../src/core/save.js';
import {projectGame} from '../src/application/projection.js';
import {createQuestTrial} from '../src/application/quest-playtest.js';
import {drain,walk,fight,navigateMaps,exploreSpot} from './helpers.mjs';
import {town} from './oddland-helpers.mjs';
export {drain,walk,fight,town};
export const read=file=>fs.readFile(new URL('../'+file,import.meta.url),'utf8').then(JSON.parse);
export const data=await loadContent(read,{edition:'e2'}),catalog=await read('playtests/quest-parties.json');
export const previous=await read('tests/fixtures/e2-q010-before-world.json');
export const previousData=await loadContent(async path=>{
  const d=await read(path);
  if(path==='data/scenario-editions.json')delete d.editions.e2.questOverrides.q010;
  if(path.endsWith('/geography.json')){
    for(const id of Object.keys(d.additions.maps))if(id.startsWith('e2_sluice_'))delete d.additions.maps[id];
    const p=d.patches.find(p=>p.group==='dungeons'&&p.id==='region_1').value;
    p.maps=p.maps.filter(id=>!id.startsWith('e2_sluice_'));p.systems.connections.links=p.systems.connections.links.filter(l=>!l.id.startsWith('q010_'));
  }
  if(d.travel)d.travel.routes=d.travel.routes.filter(r=>!r.id.startsWith('q010_'));
  return d;
},{edition:'e2'});
export const values=g=>g.state.stories.q010.values;
export function checkpoint(g){const raw=g.save();assert.deepEqual(validateSave(JSON.parse(raw),data),[]);g.load(raw);assert.equal(g.save(),raw);}
export function ready({old=false,visit=true}={}){
  const g=createQuestTrial(old?previousData:data,catalog,{quest:'q010',party:'balanced',level:1,start:visit?'site':'reception',seed:1907}).engine;
  g.random=()=>.999999;drain(g);return g;
}
export function go(g,key,options={}){
  const p=g.data.quests.q010.story.worldPlaces?.[key];
  if(!p){exploreSpot(g,previous.locations.find(p=>p.role==='decision'),{interact:false,heal:true});return;}
  if(g.state.mode==='town'){town(g,'e2_wharf');assert.ok(g.dispatch({type:'world.cross',route:'q010_surface'}),g.state.notice);drain(g);}
  navigateMaps(g,p.map,options);walk(g,p.x,p.y,options);drain(g);
}
export function depart(g,id){assert.ok(g.dispatch({type:'choose',id}),id+': '+g.state.notice);drain(g);}
export function arrive(g,options){const a=g.data.quests.q010.story.actions[g.state.journey.action];go(g,a.journey.to,options);if(g.state.journey)assert.ok(g.dispatch({type:'story.resume',quest:'q010'}));drain(g);assert.equal(g.state.journey,null);}
export function choose(g,...ids){for(const id of ids){depart(g,id);if(g.state.journey)arrive(g);}}
export function resume(g){go(g,g.data.quests.q010.story.scenes[g.state.stories.q010.scene].place);assert.ok(g.dispatch({type:'story.resume',quest:'q010'}));drain(g);}
export function migrated(g){const h=new GameEngine(data);h.random=()=>.999999;h.load(g.save());return h;}
export const inspection=['shaft','open','inspect','climb','inspect','contact','register','return','listen'];
export const rescueNear=['near','escort','confirm','return'],rescueDeep=['deep','near','rig','deep','escort','confirm','return'],rescueBook=['book','take','read','carry','deposit','return'];
export const closeAll=['all','recover','return','close','escape'];
export const handover=['pump','summon','escort','handover','escape','pump'];
export function translate(path){
  const expansion={entry_shaft:inspection,entry_close:['close','escape','contract'],entry_pump:['pump','open','inspect','climb','inspect','contact','register','summon','escort','handover','escape','pump'],operations_near:rescueNear,operations_deep:rescueDeep,operations_book:rescueBook,operations_all:closeAll,operations_close:['close','escape','contract'],operations_partial:['partial','escape','partial'],operations_pump:handover};
  let scene='entry';const out=[];
  for(const id of path){const key=scene+'_'+id;out.push(...(expansion[key]??[id]));scene=previous.story.actions[key].to;}
  return out;
}
let cached,cachedOld;
export function enumerate({old=false}={}){
  if(old?cachedOld:cached)return old?cachedOld:cached;
  const g=ready({old}),queue=[{save:g.save(),path:[]}],seen=new Set(),active=[],endings=[];
  for(let i=0;i<queue.length;i++){
    assert.ok(i<10000,'finite story state graph');const row=queue[i];g.load(row.save);const s=g.state.stories.q010,key=JSON.stringify({...s,events:[...s.events].sort()});
    if(seen.has(key))continue;seen.add(key);
    const result={...row,scene:s.scene,values:structuredClone(s.values),knowledge:structuredClone(s.knowledge)};
    if(g.state.quests.q010.stage==='completed'){endings.push({...result,outcome:g.state.quests.q010.outcome});continue;}
    active.push(result);
    for(const o of projectGame(g).dialog.options.filter(o=>o.enabled)){g.load(row.save);choose(g,o.id);queue.push({save:g.save(),path:[...row.path,o.id]});}
  }
  const result={active,endings};if(old)cachedOld=result;else cached=result;return result;
}
