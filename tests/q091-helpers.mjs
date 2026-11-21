import {beforeWorldRoute} from './abyss-world-helpers.mjs';
import {collectStates} from './world-route-helpers.mjs';
export {data,catalog,migrated} from './abyss-world-helpers.mjs';
export {arrive} from './world-route-helpers.mjs';
export const {previous,ready}=await beforeWorldRoute('q091');

const route=(old,path,outcome)=>({old:old.split(' '),path:path.split(' '),outcome});
export const routes={q091:[
  route('erase','erase smooth','contract'),
  route('mark','mark score','compromise'),
  route('step different','step compare different score','compromise'),
  route('step equipment own','step compare equipment read own score','compromise'),
  route('step equipment inherit','step compare equipment read inherit check return borrow','informed')
]};
export function states(q){return collectStates(q,routes[q],ready);}
export function expectedValues(q,route){
  const studied=route.old.includes('step'),borrowed=route.outcome==='informed';
  return {oldTrail:route.outcome==='contract'?'erased':'intact',comparisonLine:studied,
    ownMark:route.outcome==='compromise',restChecked:borrowed,journalAt:borrowed?'party':'noa',bootsAt:'party',noaAt:'desk'};
}
