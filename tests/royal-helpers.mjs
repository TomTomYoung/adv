import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {commandsAt} from '../src/core/script.js';
import {storyCanAct} from '../src/core/story.js';
import {atWorldPlace} from '../src/core/world.js';
import {data,ready,checkpoint,drain,inspect,roadGo,walk as ordinaryWalk} from './pilgrimage-helpers.mjs';
import {fight} from './helpers.mjs';
export {data,ready,checkpoint,drain,inspect,roadGo};
// Walk real cells, including detours for breath. No refills or healing are
// injected into the traversal; only ordinary encounters are suppressed.
export function walk(g,x,y){
 if(g.state.dungeons.active?.id!=='region_7')return ordinaryWalk(g,x,y);
 const loc=g.state.location,s=data.dungeons.region_7.systems.air,map=g.map(),raised=g.state.dungeons.persistent.region_7.systems.air.raised;
 const cells=ps=>new Set(ps.filter(p=>p.map===map.id).map(p=>`${p.x},${p.y}`));
 const water=cells(s.water),air=cells([...s.pockets,...s.devices.filter(d=>raised.includes(d.id)).flatMap(d=>d.pockets)]);
 const queue=[{x:loc.x,y:loc.y,air:g.state.dungeons.active.systems.air.air,parent:null}],seen=new Map([[`${loc.x},${loc.y}`,queue[0].air]]);let found;
 for(let i=0;i<queue.length;i++){
  const p=queue[i];if(p.x===x&&p.y===y){found=p;break;}
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=p.x+dx,ny=p.y+dy,key=`${nx},${ny}`,left=water.has(key)&&!air.has(key)?p.air-s.perStep:s.capacity;
   if(left>0&&g.walkable(map,nx,ny)&&(seen.get(key)??-1)<left){seen.set(key,left);queue.push({x:nx,y:ny,air:left,parent:p});}
  }
 }
 assert.ok(found,`air-safe path ${map.id} (${loc.x},${loc.y}) -> (${x},${y}), air ${queue[0].air}`);
 const steps=[];for(let p=found;p.parent;p=p.parent)steps.unshift(p);
 for(const p of steps){const loc=g.state.location,wanted=p.x>loc.x?'east':p.x<loc.x?'west':p.y>loc.y?'south':'north';while(loc.facing!==wanted)assert.ok(g.dispatch({type:'move',direction:'right'}));assert.ok(g.dispatch({type:'move',direction:'forward'}));drain(g);assert.equal(g.state.battle,null);assert.equal(g.state.mode,'dungeon');assert.ok(g.state.dungeons.active.systems.air.air>0);}
}
function floor(g,map){if(g.state.location.map===map)return;const stairs=g.map().objects.find(o=>o.id==='stairs');walk(g,stairs.x,stairs.y);inspect(g,stairs.id);drain(g);assert.equal(g.state.location.map,map);}
const surface={region_7:'sunken_surface',region_9:'observatory_surface'};
export function go(g,p){
 const active=g.state.dungeons.active?.id;
 if(surface[active]&&(p.kind==='town'||p.dungeon!==active)){floor(g,active+'_f1');walk(g,1,1);assert.ok(g.dispatch({type:'world.cross',route:surface[active]}));drain(g);}
 if(p.kind==='dungeon'&&surface[p.dungeon]){
  if(g.state.dungeons.active?.id!==p.dungeon){roadGo(g,{kind:'town',location:'oddland_village'});assert.ok(g.dispatch({type:'world.cross',route:surface[p.dungeon]}));drain(g);}
  floor(g,p.map);walk(g,p.x,p.y);drain(g);
 }else roadGo(g,p);
 assert.ok(atWorldPlace(g.state,p));
}
export function start(g,id){const q=data.quests[id];go(g,{kind:'town',location:'royal_board'});assert.ok(g.accept(id),g.state.notice);go(g,q.story.worldPlaces.entry);assert.ok(g.dispatch({type:'story.resume',quest:id}));drain(g);checkpoint(g);}
export function choose(g,id,choice,{combat='win'}={}){
 assert.ok(g.dispatch({type:'choose',id:choice}),`${id}/${choice}: ${g.state.notice}`);checkpoint(g);drain(g);
 if(g.state.battle){if(combat==='win'){g.healAll();fight(g);}else return;}
 if(g.state.journey){const a=data.quests[id].story.actions[g.state.journey.action];go(g,data.quests[id].story.worldPlaces[a.journey.to]);if(g.state.journey)assert.ok(g.dispatch({type:'story.resume',quest:id}));assert.equal(g.state.journey,null);drain(g);}
 checkpoint(g);
}
let base;
export function audit(id){
 base??=ready().save();const g=new GameEngine(data);g.load(base);g.random=()=>.999999;
 if(id==='q070')g.state.vars.region_7=3; // Campaign test earns the prerequisite.
 start(g,id);const queue=[{state:structuredClone(g.state),path:[]}],seen=new Set(),ends={};let saves=0,journeys=0;
 for(let i=0;i<queue.length;i++){
  const entry=queue[i];g.state=structuredClone(entry.state);
  const key=JSON.stringify({story:g.state.stories[id],outcome:g.state.quests[id].outcome});if(seen.has(key))continue;seen.add(key);assert.ok(seen.size<1500,id+' finite');checkpoint(g);saves++;
  if(g.state.quests[id].stage==='completed'){
   ends[g.state.quests[id].outcome]??=entry.path;const reward=JSON.stringify({gold:g.state.gold,actors:g.state.actors,vars:g.state.vars});assert.equal(g.accept(id),false);assert.throws(()=>g.complete(id,g.state.quests[id].outcome));g.run(data.quests[id].model.entryScript);drain(g);assert.equal(JSON.stringify({gold:g.state.gold,actors:g.state.actors,vars:g.state.vars}),reward);continue;
  }
  assert.equal(g.state.waiting?.type,'choice',id+JSON.stringify(entry.path));const options=commandsAt(data,g.state.vm.at(-1))[g.state.waiting.index].options;
  const usable=o=>(!o.condition||g.value(o.condition))&&storyCanAct(g,id,o.storyAction.action),enabled=options.filter(usable);
  g.state.gold=0;for(const key of Object.keys(g.state.inventory))g.state.inventory[key]=0;assert.ok(options.some(usable),id+' free continuation');
  for(const o of enabled){g.state=structuredClone(entry.state);if(data.quests[id].story.actions[o.storyAction.action].journey)journeys++;choose(g,id,o.id);queue.push({state:structuredClone(g.state),path:[...entry.path,o.id]});}
 }
 assert.deepEqual(Object.keys(ends).sort(),Object.keys(data.quests[id].outcomes).sort());return {ends,states:seen.size,saves,journeys};
}
