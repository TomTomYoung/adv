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
    route('shop buy cancel','shop read buy cancel fold bring hand repay','compromise')],
  q056:[route('break','break snap','contract'),route('move','move lift carry install','compromise'),
    route('sold practice','sold uncover practice lift carry install','compromise'),
    route('sold switch announce','sold uncover switch make verify announce speak return give','informed'),
    route('sold switch backstage','sold uncover switch make verify backstage lift_card carry install','compromise')],
  q057:[route('clear','clear pack carry close','contract'),route('permit','permit issue bring post','compromise'),
    route('wait permit','wait watch permit issue bring post','compromise'),
    route('wait evening register','wait watch evening call agree register file','informed'),
    route('wait evening temporary','wait watch evening call agree temporary issue bring post','compromise')],
  q058:[route('seize','seize collect bring seal','contract'),route('exchange','exchange count carry swap store seal','compromise'),
    route('baker stop','baker match stop count carry swap store seal','compromise'),
    route('baker porter trace','baker match porter compare trace file','informed'),
    route('baker porter hold','baker match porter compare hold count carry swap store seal','compromise')],
  q059:[route('guard','guard fight load carry serve','contract'),route('preserve','preserve pack carry give','compromise'),
    route('prepare packs','prepare hear packs pack carry give','compromise'),
    route('prepare share contract','prepare hear share record contract sign','informed'),
    route('prepare share rations','prepare hear share record rations pack carry give','compromise')],
  q060:[route('break','break fight lift','contract'),route('hours','hours rotate','compromise'),
    route('guarantors hours','guarantors sign hours rotate','compromise'),
    route('guarantors test open','guarantors sign test unlatch verify open open','informed'),
    route('guarantors test limited','guarantors sign test unlatch verify limited one','compromise')]
};
const read=async path=>JSON.parse(await fs.readFile(new URL('../'+path,import.meta.url),'utf8'));
export const data=await loadContent(read,{edition:'e2'});
export const catalog=await read('playtests/quest-parties.json');
async function loadBefore(ids){return loadContent(async file=>{
  const value=await read(file);
  if(file==='data/scenario-editions.json')for(const id of ids)delete value.editions.e2.questOverrides[id];
  return value;
},{edition:'e2'});}
export const original=await loadBefore(Object.keys(routes));
export const beforeSecondFloor=await loadBefore(Object.keys(routes).filter(q=>q>='q056'));
export function ready(quest,{old=false,start='site'}={}){
  const g=createQuestTrial(old?(quest>='q056'?beforeSecondFloor:original):data,catalog,{quest,start,level:6,party:'balanced',seed:1907}).engine;
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
    case 'q056':return {testedSeats:has('sold'),testedStop:has('switch'),explained:informed,board:has('sold')?'oneOpen':'unsold',
      machineAt:contract||informed?'wings':'studio',use:contract?'broken':informed?'manual':'practice',stopCardAt:informed?'operator':has('switch')?'machine':'wings'};
    case 'q057':return {sawNoon:has('wait'),assent:has('evening'),bagAt:has('evening')?'late':has('wait')?'noon':'morning',
      goodsAt:contract?'zen':'stall',permitAt:!contract&&!informed?'stall':'zen',licence:contract?'cleared':informed?'joint':'temporary'};
    case 'q058':return {chain:has('baker'),origin:has('porter'),limited:informed,seized:contract,exchanged:!contract&&!informed,
      coinsAt:informed?'baker':'en',changeAt:informed?'customer':'en',bakerMoneyAt:contract||informed?'en':'baker',customerMoneyAt:contract||informed?'en':'customer'};
    case 'q059':return {metGuests:has('prepare'),roster:has('share'),beastDefeated:contract,packed:!contract&&!informed,
      foodAt:contract?'hall':informed?'pantry':'guests',agreement:contract?'banquet':informed?'cooperative':'ration'};
    case 'q060':return {signed:has('guarantors'),tested:has('test'),passed:has('test'),guardDefeated:contract,timetable:!informed&&!contract,
      pledgeAt:informed?'clerk':has('guarantors')?'party':'merchants',gates:informed?'all':contract?'free':has('limited')?'trialTimed':'rotating',
      protection:informed?'joint':contract?'lost':has('limited')?'trial':'night'};
    case 'q055':return {wantsPurchase:has('buy'),readReceipt:has('shop'),customerSigned:informed,shopSigned:informed,
      title:informed?'customer':'shop',payment:informed?'applied':contract?'held':'refunded',mark:contract?'cut':'released',
      depositAt:contract||informed?'miku':'customer',coatAt:contract||informed?'customer':'miku'};
  }
}
export function assertValues(g,q,route){
  for(const [key,value] of Object.entries(expectedValues(q,route)))assert.equal(g.state.stories[q].values[key],value,q+'/'+key);
}
