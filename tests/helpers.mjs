import {commandDialog,commandTargets} from '../src/core/player-commands.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {loadContent} from '../src/core/loader.js';
import {GameEngine,DIRECTIONS} from '../src/core/engine.js';
import {activeActor} from '../src/core/battle.js';
import {dungeonInterior,locationRoot} from '../src/core/world.js';
export const data=await loadContent(file=>fs.readFile(path.resolve(import.meta.dirname,'..',file),'utf8').then(JSON.parse));
export function newGame(seed=42){const engine=new GameEngine(data,seed);drain(engine);return engine;}
export function drain(engine){let fuel=1000;while(engine.state.waiting?.type==='text'||engine.state.waiting?.type==='command'&&engine.state.waiting.command==='result'){assert.ok(--fuel);engine.dispatch({type:'advance'});}}
// Select the same physical object a test intends to inspect when several
// nearby objects now share the message window. Never choose story decisions.
export function inspect(engine,objectId){
  const object=engine.interactionObjects().find(o=>objectId===undefined||o.id===objectId);
  assert.ok(engine.dispatch({type:'player.command',id:'inspect'}));
  if(engine.state.waiting?.type!=='command'||engine.state.waiting.command==='result')return;
  let dialog=commandDialog(engine);
  const intended=object?`object:${object.id}`:commandTargets(engine,'inspect').find(t=>t.actions.some(a=>a.intent.type==='dungeon.action'&&a.intent.action==='cross'))?.id;
  const target=dialog.options.find(o=>o.target===intended);
  if(target){assert.ok(engine.dispatch({type:'choose',id:target.id}));dialog=commandDialog(engine);}
  const action=dialog?.options.find(o=>o.enabled&&(o.intent?.type==='field.object'&&o.intent.id===object?.id||!object&&o.intent?.type==='dungeon.action'&&o.intent.action==='cross'));
  if(action)assert.ok(engine.dispatch({type:'choose',id:action.id}));
}
export function fight(engine){let fuel=800;while(engine.state.battle){assert.ok(--fuel,'battle must terminate');if(engine.state.waiting?.type==='text'){drain(engine);continue;}const id=activeActor(engine),actor=engine.state.actors[id],skills=engine.skills(id),alive=engine.state.members.filter(id=>engine.state.actors[id].hp>0),injured=alive.sort((a,b)=>engine.state.actors[a].hp/engine.stats(a).hp-engine.state.actors[b].hp/engine.stats(b).hp)[0];let skill='attack',target=engine.state.battle.enemies.find(e=>e.hp>0).instance;
    if(skills.includes('heal')&&actor.mp>=4&&engine.state.actors[injured].hp<engine.stats(injured).hp*.7){skill='heal';target=injured;}
    else if(skills.includes('fire')&&actor.mp>=4)skill='fire';
    else if(skills.includes('power')&&actor.mp>=3)skill='power';
    assert.ok(engine.dispatch({type:'battle',action:'skill',skill,target}));
  }drain(engine);}
export function settle(engine){drain(engine);if(engine.state.battle)fight(engine);}
export function pathTo(engine,x,y){const loc=engine.state.location,map=engine.map(),queue=[[loc.x,loc.y]],seen=new Map([[`${loc.x},${loc.y}`,null]]);let found=false;
  for(let i=0;i<queue.length;i++){const [cx,cy]=queue[i];if(cx===x&&cy===y){found=true;break;}for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const key=`${cx+dx},${cy+dy}`;if(engine.walkable(map,cx+dx,cy+dy)&&!seen.has(key)){seen.set(key,[cx,cy]);queue.push([cx+dx,cy+dy]);}}}
  assert.ok(found,`Path to ${x},${y}`);const steps=[];let p=[x,y];while(p){steps.push(p);p=seen.get(p.join(','));}return steps.reverse().slice(1);
}
export function walk(engine,x,y,{heal=false,maintain=false,settleDestination=true}={}){for(const [nx,ny] of pathTo(engine,x,y)){if(maintain)maintainParty(engine);const loc=engine.state.location,dx=nx-loc.x,dy=ny-loc.y,wanted=dx===1?'east':dx===-1?'west':dy===1?'south':'north';while(loc.facing!==wanted)assert.ok(engine.dispatch({type:'move',direction:'right'}));assert.ok(engine.dispatch({type:'move',direction:'forward'}));if(heal)engine.healAll();if(!settleDestination&&nx===x&&ny===y)drain(engine);else settle(engine);assert.equal(engine.state.mode,'dungeon','party survived route');}}
export function maintainParty(g){
  for(const id of g.state.members){const actor=g.state.actors[id];if(actor.statuses.includes('poison')&&g.state.inventory.antidote>0){g.dispatch({type:'item',item:'antidote',actor:id});drain(g);}if(actor.hp<g.stats(id).hp*.45&&g.state.inventory.potion>0){g.dispatch({type:'item',item:'potion',actor:id});drain(g);}}
  const needsFood=g.state.members.some(id=>g.state.actors[id].hp<g.stats(id).hp*.55)||g.state.actors.sera.mp<4;
  if(needsFood&&g.state.inventory.ration>0){g.dispatch({type:'item',item:'ration',actor:'ada'});drain(g);}
}
export function exploreSpot(engine,spot,options={}){
  leaveInterior(engine);
  const dungeon=Object.values(data.dungeons).find(d=>d.maps.includes(spot.map));
  if(engine.state.mode==='town'){goTownLocation(engine,data.game.world.townRoot);assert.ok(engine.dispatch({type:'travel',dungeon:dungeon.id}));}
  if(dungeon.systems.connections?.use==='map_connections'){
    navigateMaps(engine,spot.map,options);
    walk(engine,spot.x,spot.y,options);if(options.interact!==false&&!engine.state.waiting&&!engine.state.battle)inspect(engine);drain(engine);return;
  }
  const drainFloor=()=>{if(engine.state.dungeons.active?.id==='region_1'&&!engine.map().voxels){const target=engine.state.location.map.endsWith('f1')?'upper_gate':'lower_gate';if(engine.state.dungeons.persistent.region_1.systems.water.controls[target])assert.ok(engine.dispatch({type:'dungeon.action',system:'water',action:'close',target}));}};
  if(engine.state.location.x===1&&engine.state.location.y===1)drainFloor();
  if(engine.state.location.map!==spot.map){const stairs=engine.map().objects.find(o=>o.id==='stairs');walk(engine,stairs.x,stairs.y,options);
    if(dungeon.id==='region_1')for(let n=0;!engine.walkable(data.maps[spot.map],1,1)&&n<200;n++)assert.ok(engine.dispatch({type:'dungeon.action',system:'water',action:'wait'}));
    inspect(engine);settle(engine);assert.equal(engine.state.location.map,spot.map);drainFloor();}
  walk(engine,spot.x,spot.y,options);if(options.interact!==false&&!engine.state.waiting&&!engine.state.battle)inspect(engine);drain(engine);
}

// Town navigation is deliberate; services and dungeon entrances do not relocate the party.
export function goTownLocation(g,destination){
  assert.equal(g.state.mode,'town');
  while(data.locations[g.state.townLocation].parent)assert.ok(g.dispatch({type:'location.move',id:data.locations[g.state.townLocation].parent}));
  const route=[];let id=destination;
  while(data.locations[id].parent){route.unshift(id);id=data.locations[id].parent;}
  for(const next of route)assert.ok(g.dispatch({type:'location.move',id:next}));
  assert.equal(g.state.townLocation,destination);
}
export function leaveDungeonOnFoot(g){
  leaveInterior(g);
  if(g.state.mode!=='dungeon')return;
  const dungeon=data.dungeons[g.state.dungeons.active.id],entry=dungeon.entries.main;
  exploreSpot(g,{map:entry.map,...data.maps[entry.map][entry.point]},{maintain:true,interact:false});
  const exit=g.map().objects.find(o=>o.type==='exit'||o.id==='exit');
  assert.ok(exit,'normal dungeon exit');
  walk(g,exit.x,exit.y,{maintain:true});inspect(g,exit.id);drain(g);
  assert.equal(g.state.mode,'town');
}

export function leaveInterior(g){
  if(!dungeonInterior(data,g.state))return;
  while(data.locations[g.state.townLocation].parent)assert.ok(g.dispatch({type:'location.move',id:data.locations[g.state.townLocation].parent}));
  assert.ok(g.dispatch({type:'location.exit'}));drain(g);
}
export function goWorldLocation(g,destination){
  const root=locationRoot(data,destination),entrance=root.dungeonEntrance;
  if(!entrance){leaveDungeonOnFoot(g);goTownLocation(g,destination);return;}
  if(g.state.mode!=='town'||locationRoot(data,g.state.townLocation)?.id!==root.id){
    leaveInterior(g);
    if(g.state.mode==='dungeon'&&g.state.dungeons.active.id!==entrance.dungeon)leaveDungeonOnFoot(g);
    exploreSpot(g,entrance,{maintain:true,interact:false});
    assert.ok(g.dispatch({type:'location.enter',id:root.id}));
  }
  if(g.state.townLocation!==destination)goTownLocation(g,destination);
}

export function navigateMaps(engine,target,options={}){
  const d=engine.data.dungeons[engine.state.dungeons.active.id],links=d.systems.connections.links;
  const route=new Map([[engine.state.location.map,null]]),queue=[engine.state.location.map];
  for(let i=0;i<queue.length;i++)for(const link of links)for(const [from,to] of [[link.a,link.b],[link.b,link.a]])if(from.map===queue[i]&&!route.has(to.map)){route.set(to.map,{from,to,link});queue.push(to.map);}
  assert.ok(route.has(target),`Connected route to ${target}`);
  const edges=[];for(let next=route.get(target);next;next=route.get(next.from.map))edges.unshift(next);
  for(const {from,to,link} of edges){
    const water=d.systems.water,zone=water?.use==='compartment_water'&&water.zones.find(z=>z.map===to.map);
    if(zone&&engine.state.dungeons.persistent[d.id].systems.water.controls[zone.control]){
      const handle=water.controls.find(c=>c.id===zone.control&&c.map===from.map);assert.ok(handle,'reachable dry handle');walk(engine,handle.x,handle.y,{...options,settleDestination:true});
      assert.ok(engine.dispatch({type:'dungeon.action',system:'water',action:'close',target:handle.id}),engine.state.notice);
    }
    walk(engine,from.x,from.y,{...options,settleDestination:true});
    assert.ok(engine.dispatch({type:'dungeon.action',system:'connections',action:'cross',target:link.id}),JSON.stringify({link:link.id,loc:engine.state.location,waiting:engine.state.waiting,notice:engine.state.notice,journey:engine.state.journey}));settle(engine);assert.equal(engine.state.location.map,to.map);
  }
}
