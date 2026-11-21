import {beforeWorldRoute} from './abyss-world-helpers.mjs';
import {choose,collectStates} from './world-route-helpers.mjs';
export {arrive} from './world-route-helpers.mjs';
export {data,catalog,migrated} from './abyss-world-helpers.mjs';
export const {previous,ready}=await beforeWorldRoute('q094');

const lift=['board','load','rise','unload'];
const route=(old,path,outcome)=>({old:old.split(' '),path,outcome});
export const routes={q094:[
  route('advance receipt',['advance',...lift,'receipt','record'],'compromise'),
  route('advance reform leave',['advance',...lift,'reform','inspect','leave','record'],'compromise'),
  route('advance reform change',['advance',...lift,'reform','inspect','change','file'],'informed'),
  route('cost pay',['cost','inspect','pay',...lift,'receipt','record'],'compromise'),
  route('cost change',['cost','inspect','change',...lift,'file','file'],'informed'),
  route('free',['free','open',...lift,'finish'],'contract')
]};
export function states(q){
  const graph=collectStates(q,routes[q],ready);
  for(const old of [false,true])for(const afterReview of [false,true]){
    const g=ready(q,{old});
    if(afterReview){
      choose(g,q,'cost');
      if(!old)choose(g,q,'inspect');
    }
    g.state.gold=29;
    const scene=afterReview?'budget':'entry',availableChoice=(afterReview?'pay':'advance')+'_supplies';
    graph[old?'legacy':'current'].push({scene,save:g.save(),availableChoice});
  }
  return graph;
}
export function expectedValues(q,route){
  const payment=route.old.includes('advance')?'advance':route.old.includes('pay')?'afterReview':'none';
  const tariff={contract:'freeToday',compromise:'flat',informed:'shared'}[route.outcome];
  return {payment,tariff,rescue:'ashore',woundedAt:'upper',moriAt:'office',clerkAt:'office',guardStopped:route.outcome==='contract',
    receiptFiled:route.outcome==='compromise',partyAt:route.outcome==='contract'?'upper':'office'};
}
