import {beforeWorldRoute} from './abyss-world-helpers.mjs';
import {collectStates} from './world-route-helpers.mjs';
import {drain} from './helpers.mjs';
export {data,catalog,migrated} from './abyss-world-helpers.mjs';
export {arrive} from './world-route-helpers.mjs';
export const {previous,ready}=await beforeWorldRoute('q095');

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
    g.run(q+'.'+scene);drain(g);
    graph.legacy.push({scene,save:g.save(),availableChoice:'contract'});
  }
  return graph;
}
export function expectedValues(q,route){
  const studied=route.old[0]==='timeline',bound=route.outcome==='compromise';
  return {teoAt:'desk',masonAt:'wall',stripAt:studied?'teo':'rack',sheetAt:bound?'archive':'mason',
    partyAt:bound?'archive':'wall',form:{informed:'wall',compromise:'actions',contract:'statue'}[route.outcome],finished:true};
}
