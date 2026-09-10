import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {loadContent} from '../src/core/loader.js';
import {GameEngine,DIRECTIONS} from '../src/core/engine.js';
import {activeActor} from '../src/core/battle.js';
export const data=await loadContent(file=>fs.readFile(path.resolve(import.meta.dirname,'..',file),'utf8').then(JSON.parse));
export function newGame(seed=42){const engine=new GameEngine(data,seed);drain(engine);return engine;}
export function drain(engine){let fuel=1000;while(engine.state.waiting?.type==='text'){assert.ok(--fuel);engine.dispatch({type:'advance'});}}
export function fight(engine){let fuel=800;while(engine.state.battle){assert.ok(--fuel,'battle must terminate');const id=activeActor(engine),actor=engine.state.actors[id],skills=engine.skills(id),alive=engine.state.members.filter(id=>engine.state.actors[id].hp>0),injured=alive.sort((a,b)=>engine.state.actors[a].hp/engine.stats(a).hp-engine.state.actors[b].hp/engine.stats(b).hp)[0];let skill='attack',target=engine.state.battle.enemies.find(e=>e.hp>0).instance;
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
export function walk(engine,x,y,{heal=false,maintain=false}={}){for(const [nx,ny] of pathTo(engine,x,y)){if(maintain)maintainParty(engine);const loc=engine.state.location,dx=nx-loc.x,dy=ny-loc.y,wanted=dx===1?'east':dx===-1?'west':dy===1?'south':'north';while(loc.facing!==wanted)assert.ok(engine.dispatch({type:'move',direction:'right'}));assert.ok(engine.dispatch({type:'move',direction:'forward'}));if(heal)engine.healAll();settle(engine);assert.equal(engine.state.mode,'dungeon','party survived route');}}
export function maintainParty(g){
  for(const id of g.state.members){const actor=g.state.actors[id];if(actor.statuses.includes('poison')&&g.state.inventory.antidote>0){g.dispatch({type:'item',item:'antidote',actor:id});drain(g);}if(actor.hp<g.stats(id).hp*.45&&g.state.inventory.potion>0){g.dispatch({type:'item',item:'potion',actor:id});drain(g);}}
  const needsFood=g.state.members.some(id=>g.state.actors[id].hp<g.stats(id).hp*.55)||g.state.actors.sera.mp<4;
  if(needsFood&&g.state.inventory.ration>0){g.dispatch({type:'item',item:'ration',actor:'ada'});drain(g);}
}
export function exploreSpot(engine,spot,options={}){
  if(engine.state.mode==='town'){const region=data.maps[spot.map].region;assert.ok(engine.dispatch({type:'travel',region}));}
  if(engine.state.location.map!==spot.map){const stairs=engine.map().objects.find(o=>o.id==='stairs');walk(engine,stairs.x,stairs.y,options);assert.ok(engine.dispatch({type:'interact'}));settle(engine);assert.equal(engine.state.location.map,spot.map);}
  walk(engine,spot.x,spot.y,options);assert.ok(engine.dispatch({type:'interact'}));drain(engine);
}
