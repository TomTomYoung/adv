import assert from 'node:assert/strict';
import {drain,fight} from './helpers.mjs';
import {beforeWorldRoute} from './abyss-world-helpers.mjs';
import {arrive as arriveWorld,collectStates} from './world-route-helpers.mjs';
export {data,catalog,migrated} from './abyss-world-helpers.mjs';
function escapeRoadEncounter(g){
  for(let attempts=0;g.state.battle&&attempts<32;attempts++){
    if(!g.dispatch({type:'battle',action:'escape'})){fight(g);break;}
    drain(g);
  }
  assert.equal(g.state.battle,null);
}
export function arrive(g,q){return arriveWorld(g,q,{settleEncounter:escapeRoadEncounter});}
export const {previous,ready}=await beforeWorldRoute('q092');

function route(choices,outcome){
  const old=choices.split(' ');
  const actions={cut:['cut','breach','carry','report'],signal:['signal','listen'],guide:['guide'],lead:['lead'],
    stop:['stop','open','escort','count'],walk:['walk','unload','receive']};
  return {old,path:old.flatMap(id=>actions[id]),outcome};
}
export const routes={q092:[
  route('cut','contract'),route('lead walk','compromise'),route('signal stop','informed'),
  route('signal guide walk','compromise'),route('lead signal stop','informed'),
  route('signal guide signal stop','informed'),route('lead signal guide walk','compromise'),
  route('signal guide signal guide signal guide walk','compromise'),
  route('lead signal guide signal guide signal stop','informed')
]};
export function states(q){return collectStates(q,routes[q],ready);}
export function expectedValues(q,route){
  const broken=route.outcome==='contract',docked=route.outcome==='compromise';
  return {aboard:false,crewAt:'gate',partyAt:'gate',usedLamp:route.old.includes('guide')||route.old.includes('lead'),
    shellAt:docked?'gate':'track',shellState:broken?'disabled':docked?'docked':'searching',opening:broken?'breach':'hatch'};
}
