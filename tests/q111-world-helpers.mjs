import assert from 'node:assert/strict';
import {beforeWorldRoute,data,catalog,migrated} from './abyss-world-helpers.mjs';
import {arrive,depart} from './world-route-helpers.mjs';
import {drain,fight} from './helpers.mjs';
export {arrive,data,catalog,migrated};
const q='q111';
export const {previous,ready}=await beforeWorldRoute(q,{level:2});

const paths=[];
function add(old,path,outcome,escape=false){
  paths.push({old:old.split(' '),path:path.split(' '),outcome,escape});
}
for(const [old,start,escape] of [
  ['flag','flag fight advance',false],
  ['ferry cross','ferry cross',false],
  ['flag cross','flag fight cross',true]
]){
  for(const [decision,after,outcome] of [
    ['anonymous','anonymous unload finish','anonymous'],['name agree','name agree unload date','named'],
    ['name anonymous','name anonymous unload finish','anonymous'],['home','home store','home']
  ])add(old+' '+decision,start+' match hear '+after,outcome,escape);
}
const appraisal='smith leave collect bring confirm hear';
for(const [old,start,decision,after,outcome] of [
  ['flag','flag fight advance','anonymous','anonymous unload finish','anonymous'],
  ['ferry cross','ferry cross','name agree','name agree unload date','named'],
  ['ferry cross','flag detour cross','name anonymous','name anonymous unload finish','anonymous'],
  ['ferry cross','ferry cross','home','home store','home']
])add(old+' '+decision,start+' '+appraisal+' '+after,outcome);
add('ferry home','ferry home store','home');
add('flag home','flag fight home store','home',true);
add('ferry home','flag detour home store','home');
add('flag home','flag fight advance home store','home');
export const routes={q111:paths};

export function settleBattle(g,quest,route){
  if(!route.escape)return fight(g);
  const before=g.state.records.escapes;
  for(let i=0;g.state.battle&&i<100;i++){
    drain(g);if(g.state.battle)assert.ok(g.dispatch({type:'battle',action:'escape'}));
  }
  drain(g);assert.equal(g.state.records.escapes,before+1,quest+' escapes to the ferry');
}
export function step(g,id,route){
  depart(g,id);
  if(g.state.battle){settleBattle(g,q,route);drain(g);}
  if(g.state.journey)arrive(g,q);
}
export function expectedValues(_,r){
  const did=id=>r.path.includes(id),home=r.outcome==='home';
  const destination=home?'depot':'village';
  return {flag:did('advance')?'white':'covered',cleared:did('advance'),
    marks:did('match')||did('confirm'),consulted:did('leave'),appraised:did('bring'),
    confession:did('hear'),consent:did('name'),form:home?'unset':r.outcome,repairDate:r.outcome==='named',
    stored:home,toolsAt:home?'depot':'owner',clothAt:home?'depot':'owner',wagonAt:'hanna',rubbingAt:'wagon',
    hannaAt:destination,gusAt:destination,guardAt:'gate',smithAt:'workshop',ownerAt:'village'};
}
export function states(){
  const current=new Map(),legacy=new Map();
  for(const r of paths)for(const old of [false,true]){
    const g=ready(q,{old});delete g.random;
    for(const id of old?r.old:r.path){
      const s=old?g.state.flags.quest[q]:g.state.stories[q];
      const map=old?legacy:current,key=JSON.stringify(s);
      if(!map.has(key))map.set(key,{scene:old?s.node:s.scene,save:g.save()});
      step(g,id,r);
    }
    assert.equal(g.state.quests[q].outcome,r.outcome);
  }
  return {current:[...current.values()],legacy:[...legacy.values()]};
}
