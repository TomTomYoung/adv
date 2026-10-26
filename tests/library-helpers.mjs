import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {commandsAt} from '../src/core/script.js';
import {storyCanAct} from '../src/core/story.js';
import {atWorldPlace,locationRoot} from '../src/core/world.js';
import {validateSave} from '../src/core/save.js';
import {data,read,go as roadGo,walk,drain,inspect} from './oddland-helpers.mjs';
import {navigateMaps} from './helpers.mjs';
export {data,read,walk,drain,inspect};
export function checkpoint(g){const raw=g.save();assert.deepEqual(validateSave(JSON.parse(raw),g.data),[]);g.load(raw);assert.equal(g.save(),raw);}
export function ready(){const g=new GameEngine(data,1907);drain(g);g.random=()=>.999999;g.award(0,data.system.xpBase*24*25);g.healAll();g.state.gold=5000;for(const item of ['rope','ration','potion','torch'])g.state.inventory[item]=99;return g;}
function floor(g,map){if(g.state.location.map===map)return;const stairs=g.map().objects.find(o=>o.id==='stairs');walk(g,stairs.x,stairs.y);inspect(g,stairs.id);drain(g);assert.equal(g.state.location.map,map);}
const surfaces={region_5:'library_surface',region_8:'machine_surface'};
export function go(g,p){
 const d=g.data,active=g.state.dungeons.active?.id;
 if(g.state.mode==='dungeon'&&surfaces[active]&&(p.kind==='town'||p.dungeon!==active)){floor(g,active+'_f1');walk(g,1,1);assert.ok(g.dispatch({type:'world.cross',route:surfaces[active]}));drain(g);}
 const country=place=>place.kind==='town'?Object.values(d.worldTravel.settlements).find(s=>s.root===locationRoot(d,place.location).id).country:d.worldTravel.mapCountries[place.map]??'tornea';
 const current=g.state.mode==='town'?{kind:'town',location:g.state.townLocation}:{kind:'dungeon',...g.state.location};
 if(country(current)!==country(p)){
  if(country(p)==='oddland'){
   roadGo(g,{kind:'town',location:'hikarigaeri_square'});assert.ok(g.dispatch({type:'world.cross',route:'waterway_surface'}));drain(g);navigateMaps(g,'region_1_landing');walk(g,15,3);roadGo(g,{kind:'town',location:'oddland_border'});
  }else{
   roadGo(g,{kind:'town',location:'oddland_border'});roadGo(g,{kind:'dungeon',dungeon:'region_1',map:'region_1_landing',x:15,y:3});navigateMaps(g,'region_1_f1');walk(g,1,1);assert.ok(g.dispatch({type:'world.cross',route:'waterway_surface'}));drain(g);
  }
 }
 if(p.kind==='dungeon'&&surfaces[p.dungeon]){
  if(g.state.mode!=='dungeon'||g.state.dungeons.active.id!==p.dungeon){roadGo(g,{kind:'town',location:'e2_academy'});assert.ok(g.dispatch({type:'world.cross',route:surfaces[p.dungeon]}));drain(g);}
  floor(g,p.map);walk(g,p.x,p.y);drain(g);
 }else roadGo(g,p);
 assert.ok(atWorldPlace(g.state,p));
}
export function start(g,id){const q=g.data.quests[id];go(g,{kind:'town',location:'salome_board'});assert.ok(g.accept(id),g.state.notice);go(g,q.story.worldPlaces.entry);assert.ok(g.dispatch({type:'story.resume',quest:id}));drain(g);checkpoint(g);}
export function choose(g,id,choice){
 assert.ok(g.dispatch({type:'choose',id:choice}),`${id}/${g.state.stories[id].scene}/${choice}: ${g.state.notice}`);checkpoint(g);drain(g);
 if(g.state.journey){const a=g.data.quests[id].story.actions[g.state.journey.action];go(g,g.data.quests[id].story.worldPlaces[a.journey.to]);if(g.state.journey)assert.ok(g.dispatch({type:'story.resume',quest:id}));assert.equal(g.state.journey,null);drain(g);}
 checkpoint(g);
}
export function audit(id){
 const g=ready();if(id==='q050')g.state.vars.region_5=3;start(g,id);
 const queue=[{state:structuredClone(g.state),path:[]}],seen=new Set(),ends={},actions=new Set();
 for(let i=0;i<queue.length;i++){
  const e=queue[i];g.state=structuredClone(e.state);checkpoint(g);
  const key=JSON.stringify({story:{...g.state.stories[id],events:[...g.state.stories[id].events].sort()},outcome:g.state.quests[id].outcome});if(seen.has(key))continue;seen.add(key);assert.ok(seen.size<3000,id+' finite');
  if(g.state.quests[id].stage==='completed'){
   ends[g.state.quests[id].outcome]??=e.path;const reward=JSON.stringify({gold:g.state.gold,actors:g.state.actors,vars:g.state.vars});assert.equal(g.accept(id),false);assert.throws(()=>g.complete(id,g.state.quests[id].outcome));g.run(data.quests[id].model.entryScript);drain(g);assert.equal(JSON.stringify({gold:g.state.gold,actors:g.state.actors,vars:g.state.vars}),reward);continue;
  }
  assert.equal(g.state.waiting?.type,'choice',id+'/'+e.path.join(','));const options=commandsAt(data,g.state.vm.at(-1))[g.state.waiting.index].options,usable=o=>(!o.condition||g.value(o.condition))&&storyCanAct(g,id,o.storyAction.action),enabled=options.filter(usable);
  g.state.gold=0;for(const k of Object.keys(g.state.inventory))g.state.inventory[k]=0;assert.ok(options.some(usable),id+'/'+e.path.join(',')+' resource-free continuation '+JSON.stringify(g.state.stories[id].values));
  for(const o of enabled){g.state=structuredClone(e.state);actions.add(o.storyAction.action);choose(g,id,o.id);queue.push({state:structuredClone(g.state),path:[...e.path,o.id]});}
 }
 assert.deepEqual(Object.keys(ends).sort(),Object.keys(data.quests[id].outcomes).sort());assert.deepEqual([...actions].sort(),Object.keys(data.quests[id].story.actions).sort());return {ends,states:seen.size};
}
