import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {commandsAt} from '../src/core/script.js';
import {storyCanAct} from '../src/core/story.js';
import {atWorldPlace} from '../src/core/world.js';
import {validateSave} from '../src/core/save.js';
import {data,go as roadGo,border,drain,walk,inspect} from './oddland-helpers.mjs';
import {fight} from './helpers.mjs';
export {data,border,drain,walk,inspect,roadGo};
export function checkpoint(g){const raw=g.save();assert.deepEqual(validateSave(JSON.parse(raw),g.data),[]);g.load(raw);assert.equal(g.save(),raw);}
function chapelFloor(g,map){
 if(g.state.location.map===map)return;
 const stairs=g.map().objects.find(o=>o.id==='stairs');walk(g,stairs.x,stairs.y);inspect(g,stairs.id);drain(g);assert.equal(g.state.location.map,map);
}
export function go(g,p){
 if(g.state.mode==='dungeon'&&g.state.dungeons.active.id==='region_4'&&(p.kind==='town'||p.dungeon!=='region_4')){
  chapelFloor(g,'region_4_f1');walk(g,1,1);assert.ok(g.dispatch({type:'world.cross',route:'chapel_surface'}));drain(g);
 }
 if(p.kind==='dungeon'&&p.dungeon==='region_4'){
  if(g.state.mode!=='dungeon'||g.state.dungeons.active.id!=='region_4'){roadGo(g,{kind:'town',location:'oddland_plateau'});assert.ok(g.dispatch({type:'world.cross',route:'chapel_surface'}));drain(g);}
  chapelFloor(g,p.map);walk(g,p.x,p.y);drain(g);
 }else roadGo(g,p);
 assert.ok(atWorldPlace(g.state,p));
}
export function start(g,id){const q=data.quests[id];go(g,{kind:'town',location:'pilgrim_board'});assert.ok(g.accept(id),g.state.notice);go(g,q.story.worldPlaces[q.story.scenes.entry.place]);assert.ok(g.dispatch({type:'story.resume',quest:id}));drain(g);checkpoint(g);}
export function choose(g,id,choice,{combat='win'}={}){
 assert.ok(g.dispatch({type:'choose',id:choice}),`${id}/${choice}: ${g.state.notice}`);checkpoint(g);drain(g);
 if(g.state.battle){if(combat==='win'){g.healAll();fight(g);}else return;}
 if(g.state.journey){const a=data.quests[id].story.actions[g.state.journey.action];go(g,data.quests[id].story.worldPlaces[a.journey.to]);if(g.state.journey)assert.ok(g.dispatch({type:'story.resume',quest:id}));assert.equal(g.state.journey,null);drain(g);}
 checkpoint(g);
}
export function ready(){const g=border();g.award(0,data.system.xpBase*24*25);g.healAll();g.state.gold=5000;for(const item of ['rope','ration','potion','torch'])g.state.inventory[item]=99;return g;}
let base;
export function audit(id){
 base??=ready().save();const g=new GameEngine(data);g.load(base);g.random=()=>.999999;
 // Isolate q040's branches; a separate campaign earns this prerequisite.
 if(id==='q040')g.state.vars.region_4=3;
 start(g,id);const queue=[{state:structuredClone(g.state),path:[]}],seen=new Set(),ends={};let saves=0,journeys=0;
 for(let i=0;i<queue.length;i++){
  const entry=queue[i];g.state=structuredClone(entry.state);
  const key=JSON.stringify({story:g.state.stories[id],outcome:g.state.quests[id].outcome});if(seen.has(key))continue;seen.add(key);assert.ok(seen.size<1500,id+' finite');
  checkpoint(g);saves++;
  if(g.state.quests[id].stage==='completed'){
   ends[g.state.quests[id].outcome]??=entry.path;
   const reward=JSON.stringify({gold:g.state.gold,actors:g.state.actors,vars:g.state.vars});assert.equal(g.accept(id),false);assert.throws(()=>g.complete(id,g.state.quests[id].outcome));g.run(data.quests[id].model.entryScript);drain(g);assert.equal(JSON.stringify({gold:g.state.gold,actors:g.state.actors,vars:g.state.vars}),reward);continue;
  }
  assert.equal(g.state.waiting?.type,'choice',id+JSON.stringify(entry.path));
  const options=commandsAt(data,g.state.vm.at(-1))[g.state.waiting.index].options;
  const enabled=options.filter(o=>(!o.condition||g.value(o.condition))&&storyCanAct(g,id,o.storyAction.action));
  g.state.gold=0;for(const key of Object.keys(g.state.inventory))g.state.inventory[key]=0;
  assert.ok(options.some(o=>(!o.condition||g.value(o.condition))&&storyCanAct(g,id,o.storyAction.action)),id+' free continuation');
  for(const o of enabled){g.state=structuredClone(entry.state);if(data.quests[id].story.actions[o.storyAction.action].journey)journeys++;choose(g,id,o.id);queue.push({state:structuredClone(g.state),path:[...entry.path,o.id]});}
 }
 assert.deepEqual(Object.keys(ends).sort(),Object.keys(data.quests[id].outcomes).sort());return {ends,states:seen.size,saves,journeys};
}
