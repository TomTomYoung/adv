import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {loadContent} from '../src/core/loader.js';
import {GameEngine} from '../src/core/engine.js';
import {validateSave} from '../src/core/save.js';
import {createQuestTrial} from '../src/application/quest-playtest.js';
import {drain,fight,exploreSpot} from './helpers.mjs';

const route=(old,path,outcome)=>({old:old.split(' '),path:path.split(' '),outcome});
const budget=(old,path)=>[
  route(old+' keep',path+' test keep post','compromise'),
  route(old+' off',path+' test off unhook report post','informed')
];
const foodSort=(old,path)=>[
  route(old+' dates',path+' divide dates write fetch take carry hand','informed'),
  route(old+' none',path+' divide none seal order notify','compromise')
];
export const routes={
  q052:[route('warehouse','warehouse remove unlock open','contract'),...budget('limit','limit'),
    ...['',' again'].flatMap(extra=>{
      const old='observe'+extra,path='observe record'+extra;
      return [route(old+' stop',path+' stop unhook report post','informed'),...budget(old+' limit',path+' limit')];
    })],
  q053:[route('deliver','deliver take carry settle','contract'),route('isolate','isolate seal order notify','compromise'),
    route('night quarantine','night watch quarantine seal order notify','compromise'),
    ...foodSort('sort','sort'),...foodSort('night sort','night watch sort')],
  q054:[route('bright','bright take bring hand','contract'),route('all','all close report call','compromise'),
    route('customer collective','customer lead listen collective close report call','compromise'),
    route('customer receipt return','customer lead listen receipt bring inspect return','informed'),
    route('customer receipt hold','customer lead listen receipt bring inspect hold carry replace close report call','compromise')],
  q055:[route('cut','cut snip','contract'),route('shop return','shop read return fold bring hand repay','compromise'),
    route('shop buy sign','shop read buy sign accept apply release','informed'),
    route('shop buy cancel','shop read buy cancel fold bring hand repay','compromise')]
};
const read=async path=>JSON.parse(await fs.readFile(new URL('../'+path,import.meta.url),'utf8'));
export const data=await loadContent(read,{edition:'e2'});
export const catalog=await read('playtests/quest-parties.json');
export const original=await loadContent(async file=>{
  const value=await read(file);
  if(file==='data/scenario-editions.json')for(const id of Object.keys(routes))delete value.editions.e2.questOverrides[id];
  return value;
},{edition:'e2'});
export function ready(quest,{old=false,start='site'}={}){
  const g=createQuestTrial(old?original:data,catalog,{quest,start,level:6,party:'balanced',seed:1907}).engine;
  g.random=()=>0.999999;drain(g);return g;
}
export function checkpoint(g){
  const save=g.save();assert.deepEqual(validateSave(JSON.parse(save),g.data),[]);
  g.load(save);assert.equal(g.save(),save);return save;
}
export function migrated(old){const g=new GameEngine(data);g.load(old.save());return g;}
export function go(g,q,place){
  exploreSpot(g,g.data.quests[q].story.worldPlaces[place],{maintain:true,interact:false});
}
export function resume(g,q){
  assert.ok(g.dispatch({type:'story.resume',quest:q}),q+': '+g.state.notice);drain(g);
}
export function arrive(g,q){
  const story=g.data.quests[q].story,to=story.actions[g.state.journey.action].journey.to;
  go(g,q,to);if(g.state.journey)resume(g,q);
  drain(g);assert.equal(g.state.journey,null);
}
export function depart(g,id){
  assert.ok(g.dispatch({type:'choose',id}),id+': '+g.state.notice);drain(g);
}
export function choose(g,q,id){
  depart(g,id);
  if(g.state.battle){fight(g);drain(g);}
  if(g.state.journey)arrive(g,q);
}
export function states(q){
  const current=new Map(),legacy=new Map();
  for(const route of routes[q]){
    for(const [old,collection,choices] of [[false,current,route.path],[true,legacy,route.old]]){
      const g=ready(q,{old});
      for(const id of choices){
        const state=old?g.state.flags.flow[q]:g.state.stories[q],key=JSON.stringify(state);
        if(!collection.has(key))collection.set(key,{scene:old?state.node:state.scene,save:g.save()});
        choose(g,q,id);
      }
    }
  }
  return {current:[...current.values()],legacy:[...legacy.values()]};
}
export function expectedValues(q,route){
  const has=id=>route.old.includes(id),informed=route.outcome==='informed',contract=route.outcome==='contract';
  switch(q){
    case 'q052':return {mode:contract?'discarded':informed?'stopped':'limited',notice:contract?'none':informed?'reserve':'budget',
      observations:has('again')?'two':has('observe')?'one':'none',open:contract,tested:has('limit'),accounted:has('keep'),paddleAt:contract?'keeper':'seat'};
    case 'q053':return {dawn:has('night'),sorted:has('sort'),datesFixed:informed,chefLoss:contract,
      replacement:!contract&&!informed,dinersTold:!contract&&!informed,freshAt:contract||informed?'kiku':'locker',oldAt:informed?'rack':contract?'kitchen':'locker'};
    case 'q054':return {matched:has('customer'),repaid:has('receipt'),examined:has('receipt'),signed:informed,slipAt:'client',
      ownAt:informed?'client':contract?'shelf':'vault',brightAt:contract?'client':informed?'shelf':'vault',sealed:!informed&&!contract,called:!informed&&!contract};
    case 'q055':return {wantsPurchase:has('buy'),readReceipt:has('shop'),customerSigned:informed,shopSigned:informed,
      title:informed?'customer':'shop',payment:informed?'applied':contract?'held':'refunded',mark:contract?'cut':'released',
      depositAt:contract||informed?'miku':'customer',coatAt:contract||informed?'customer':'miku'};
  }
}
export function assertValues(g,q,route){
  for(const [key,value] of Object.entries(expectedValues(q,route)))assert.equal(g.state.stories[q].values[key],value,q+'/'+key);
}
