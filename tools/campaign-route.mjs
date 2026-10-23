// Measurement-only navigation over authored Kagaribi / waterway / mine / garden floor plans. Unlike
// the purchased survey, this knows the map in advance; it never reveals cells.
// Every returned move must still be dispatched through the real game engine.
import assert from 'node:assert/strict';
import {connectionSide,connectionBlocked} from '../src/core/systems/map-connections.js';
import {edgeBetween} from '../src/core/edge-layers.js';

const key=p=>`${p.map}/${p.x},${p.y}`;
const directions=[['east',1,0],['west',-1,0],['south',0,1],['north',0,-1]];
export function campaignRoute(g,target){
 const definition=g.data.dungeons[g.state.dungeons.active.id];
 assert.ok(['kagaribi','region_1','region_2','region_3'].includes(definition.id),'this policy measures the four expedition dungeons only');
 const links=definition.systems.connections.links,queue=[{at:{...g.state.location},parent:-1}],seen=new Set([key(g.state.location)]);
 for(let i=0;i<queue.length;i++){
  const {at}=queue[i];
  if(at.map===target.map&&(target.x===undefined||at.x===target.x&&at.y===target.y)){
   const route=[];for(let n=i;queue[n].parent>=0;n=queue[n].parent)route.push(queue[n]);return route.reverse();
  }
  const map=g.data.maps[at.map],sides=links.map(l=>connectionSide(l,at.map)).filter(s=>s&&s.from.x===at.x&&s.from.y===at.y);
  const next=[];
  for(const [direction,dx,dy] of directions){
   if(sides.some(s=>s.from.side===direction))continue;
   const to={map:at.map,x:at.x+dx,y:at.y+dy};
   if(g.walkable(map,to.x,to.y)&&edgeBetween(g.data,map,at,to,g.state)?.passage!=='#')next.push({at:to,direction});
  }
  for(const s of sides)if(!connectionBlocked(g.data,g.state,s)&&g.walkable(g.data.maps[s.to.map],s.to.x,s.to.y))next.push({at:{map:s.to.map,x:s.to.x,y:s.to.y},connection:s.link.id});
  for(const step of next)if(!seen.has(key(step.at))){seen.add(key(step.at));queue.push({...step,parent:i});}
 }
 throw Error(`No walkable campaign route to ${JSON.stringify(target)}`);
}
