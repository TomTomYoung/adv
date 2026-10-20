import {dungeonTile,dungeonCell,dungeonBlock} from './dungeons.js';
import {objectBlocks} from './quest-events.js';
import {compartmentBlocked} from './systems/compartment-water.js';
import {connectionSide,connectionBlocked} from './systems/map-connections.js';
import {edgeBetween} from './edge-layers.js';

const directions=[['north',0,-1],['east',1,0],['south',0,1],['west',-1,0]];
const key=p=>`${p.map}/${p.x},${p.y}`;
export const sameRoutePoint=(a,b)=>!!a&&!!b&&a.map===b.map&&a.x===b.x&&a.y===b.y;
const point=p=>({map:p.map,x:p.x,y:p.y});
const links=(data,state)=>Object.values(data.dungeons[state.dungeons?.active?.id]?.systems??{}).filter(s=>s.use==='map_connections'&&s.enabled!==false).flatMap(s=>s.links);
function knownPassage(data,state,p){
 const map=data.maps[p.map];
 return !!map&&!map.voxels&&(state.discovered[p.map]??[]).includes(`${p.x},${p.y}`)&&!compartmentBlocked(data,state,p.map)&&dungeonTile(data,state,map,p.x,p.y)==='.'&&!dungeonBlock(data,state,map,p.x,p.y)&&!map.objects.some(o=>o.x===p.x&&o.y===p.y&&objectBlocks(state,map,o));
}
function neighbors(data,state,p,connections,previous){
 const map=data.maps[p.map],sides=connections.map(l=>connectionSide(l,p.map)).filter(s=>s&&sameRoutePoint(s.from,p)),result=[];
 // A sliding cell cannot be used as a turning point while the next cell in
 // the incoming direction is open. Keep each traversed cell in the step count.
 const sliding=previous?.map===p.map&&dungeonCell(data,state,map,p.x,p.y)?.parameters.slippery;
 const straight=sliding?{map:p.map,x:2*p.x-previous.x,y:2*p.y-previous.y}:null;
 const forced=straight&&knownPassage(data,state,straight)&&edgeBetween(data,map,p,straight,state)?.passage!=='#'&&!sides.length;
 for(const [direction,dx,dy] of directions){
  if(forced&&(straight.x!==p.x+dx||straight.y!==p.y+dy))continue;
  // An authored exit takes precedence over the adjacent cell, even if locked.
  if(sides.some(s=>s.from.side===direction))continue;
  const to={map:p.map,x:p.x+dx,y:p.y+dy};
  if(knownPassage(data,state,to)&&edgeBetween(data,map,p,to,state)?.passage!=='#')result.push(to);
 }
 for(const side of sides)if(!connectionBlocked(data,state,side)&&knownPassage(data,state,side.to))result.push(point(side.to));
 return result;
}
export function measureCampRoute(data,state){
 const loc=state.location,definition=data.dungeons[state.dungeons?.active?.id];
 if(!loc||!definition||data.maps[loc.map]?.voxels)return {ok:false,reason:'帰路測定は平面の迷宮で使用してください。'};
 const camps=data.expedition.camps.filter(c=>c.dungeon===definition.id&&state.expedition.camps[c.id]?.supply&&knownPassage(data,state,c));
 const connections=links(data,state),queue=[{at:point(loc),parent:-1}],seen=new Set([key(loc)]);
 for(let index=0;index<queue.length;index++){
  const node=queue[index],camp=camps.find(c=>sameRoutePoint(c,node.at));
  if(camp){const path=[];for(let i=index;i>=0;i=queue[i].parent)path.push(queue[i].at);return {ok:true,route:{camp:camp.id,path:path.reverse()}};}
  const previous=queue[node.parent]?.at;
  for(const to of neighbors(data,state,node.at,connections,previous)){
   // Sliding paths may need to reach a cell from a different direction.
   const slide=dungeonCell(data,state,data.maps[to.map],to.x,to.y)?.parameters.slippery;
   const id=key(to)+(slide?`<${key(node.at)}`:'');
   if(!seen.has(id)){seen.add(id);queue.push({at:to,parent:index});}
  }
 }
 return {ok:false,reason:'発見済みの通路では、修理済みの給油設備まで帰路を確認できません。未探索の扉・閉鎖通路は計算に含めません。'};
}
export function campRouteValid(data,state,route){
 if(!sameRoutePoint(route.path[0],state.location))return false;
 const camp=data.expedition.camps.find(c=>c.id===route.camp),connections=links(data,state);
 return camp?.dungeon===state.dungeons?.active?.id&&state.expedition.camps[camp.id]?.supply&&sameRoutePoint(route.path.at(-1),camp)&&route.path.every((p,i)=>knownPassage(data,state,p)&&(i===0||neighbors(data,state,route.path[i-1],connections,route.path[i-2]).some(n=>sameRoutePoint(n,p))));
}
export function advanceCampRoute(state){
 const route=state.expedition?.route;if(!route)return;
 if(sameRoutePoint(route.path[1],state.location))route.path.shift();
 // Keep a stale measurement as a receipt, but never present it as a live route.
}
export function campRouteText(data,state){
 const route=state.expedition?.route;if(!route)return '';
 if(!campRouteValid(data,state,route))return '測定した帰路から外れたか、通行条件が変わりました。帰路測定を使って再計算してください。';
 const camp=data.expedition.camps.find(c=>c.id===route.camp),segments=[];
 for(let i=1;i<route.path.length;i++){
  const a=route.path[i-1],b=route.path[i],name=a.map!==b.map?`${data.maps[b.map].name}へ接続口を渡る`:b.x>a.x?'東':b.x<a.x?'西':b.y>a.y?'南':'北';
  if(a.map===b.map&&segments.at(-1)?.name===name)segments.at(-1).steps++;
  else segments.push({name,steps:1});
 }
 return `${camp.name}まで残り${route.path.length-1}歩。${segments.length?segments.map(s=>`${s.name} ${s.steps}歩`).join(' → '):'給油設備に到着しています。'} 発見済みの通路だけを計算しています。戦闘・罠・移動後の通路変化は別に確認してください。`;
}
export function campRouteSaveValid(data,state,route){
 const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
 const camp=data.expedition.camps.find(c=>c.id===route?.camp);
 if(!record(route)||Object.keys(route).some(k=>!['camp','path'].includes(k))||!camp||!state.expedition.camps[camp.id]?.supply||!Array.isArray(route.path)||!route.path.length||route.path.length>10000)return false;
 const definition=data.dungeons[camp.dungeon],connections=Object.values(definition.systems).filter(s=>s.use==='map_connections'&&s.enabled!==false).flatMap(s=>s.links);
 return sameRoutePoint(route.path.at(-1),camp)&&route.path.every((p,i)=>record(p)&&Object.keys(p).length===3&&Object.keys(p).every(k=>['map','x','y'].includes(k))&&definition.maps.includes(p.map)&&Number.isInteger(p.x)&&Number.isInteger(p.y)&&!!data.maps[p.map]?.tiles[p.y]?.[p.x]&&(state.discovered[p.map]??[]).includes(`${p.x},${p.y}`)&&(i===0||p.map===route.path[i-1].map&&Math.abs(p.x-route.path[i-1].x)+Math.abs(p.y-route.path[i-1].y)===1||connections.some(l=>{const side=connectionSide(l,route.path[i-1].map);return side&&sameRoutePoint(side.from,route.path[i-1])&&sameRoutePoint(side.to,p);})));
}
