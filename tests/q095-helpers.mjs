import {beforeWorldRoute} from './abyss-world-helpers.mjs';
import {collectStates} from './world-route-helpers.mjs';
import assert from 'node:assert/strict';
import {drain,exploreSpot} from './helpers.mjs';
export {data,catalog,migrated} from './abyss-world-helpers.mjs';
export {arrive} from './world-route-helpers.mjs';
export const {previous,ready}=await beforeWorldRoute('q095');

export function openOldDecision(engine,scene){
  const point=previous.quests.q095.events.find(event=>event.role==='decision').points[0];
  exploreSpot(engine,point,{maintain:true,interact:false});
  assert.equal(engine.map().id,point.map);
  assert.deepEqual([engine.state.location.x,engine.state.location.y],[point.x,point.y]);
  engine.run('q095.'+scene);drain(engine);
}

const route=(old,path,outcome)=>({old:old.split(' '),path:path.split(' '),outcome});
export const routes={q095:[
  route('timeline wall','timeline read take back match wall deliver hand unveil','informed'),
  route('timeline actions','timeline read take back match actions copy carry bind','compromise'),
  route('all','all copy carry bind','compromise'),
  route('single','single select deliver hand dedicate','contract')
]};
export function states(q){
  const graph=collectStates(q,routes[q],ready);
  for(const scene of ['decision','review']){
    const g=ready(q,{old:true,start:'reception'});
    openOldDecision(g,scene);
    graph.legacy.push({scene,save:g.save(),availableChoice:'contract'});
  }
  return graph;
}
export function expectedValues(q,route){
  const studied=route.old[0]==='timeline',bound=route.outcome==='compromise';
  return {teoAt:'desk',masonAt:'wall',stripAt:studied?'teo':'rack',sheetAt:bound?'archive':'mason',
    partyAt:bound?'archive':'wall',form:{informed:'wall',compromise:'actions',contract:'statue'}[route.outcome],finished:true};
}
