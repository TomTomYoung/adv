import {beforeWorldRoute} from './abyss-world-helpers.mjs';
import {collectStates} from './world-route-helpers.mjs';
export {arrive} from './world-route-helpers.mjs';
export {data,catalog,migrated} from './abyss-world-helpers.mjs';
export const {previous,ready}=await beforeWorldRoute('q093');

const passes=['stamp','deliver','hand','next','hand','gate','check'];
function route(old,outcome){
  const actions={contract:['contract'],one:['one','restore','back'],two:['two','date','back'],
    release:['release','undo','visit','leave','farewell'],renew:['renew','file'],
    certificate:['certificate',...passes],paper:['paper',...passes]};
  return {old,path:old.flatMap(id=>actions[id]),outcome};
}
const choices=[[],['one'],['two'],['one','two'],['two','one']];
export const routes={q093:[
  route(['release'],'contract'),route(['certificate'],'compromise'),
  ...choices.map(sequence=>route(['contract',...sequence,'paper'],'compromise')),
  ...choices.filter(sequence=>sequence.length===2).map(sequence=>route(['contract',...sequence,'renew'],'informed'))
]};
export function states(q){return collectStates(q,routes[q],ready);}
export function expectedValues(q,route){
  const released=route.outcome==='contract',passes=route.outcome==='compromise';
  return {oneName:released||route.old.includes('one')?'returned':'sealed',twoName:released?'returned':'sealed',dated:route.old.includes('two'),
    ledger:released?'released':passes?'numbered':'separate',issued:passes,checked:passes,keeperAt:'desk',
    passOneAt:passes?'guestOne':'keeper',passTwoAt:passes?'guestTwo':'keeper',
    guestOneAt:passes?'door':'first',guestTwoAt:released||passes?'door':'second',partyAt:released||passes?'door':'desk'};
}
