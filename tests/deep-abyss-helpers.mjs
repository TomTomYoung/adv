import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {loadContent} from '../src/core/loader.js';
import {createQuestTrial} from '../src/application/quest-playtest.js';
import {data,catalog,migrated} from './abyss-world-helpers.mjs';
import {choose,collectStates} from './world-route-helpers.mjs';
import {drain,exploreSpot} from './helpers.mjs';
export {data,catalog,migrated};
export {arrive} from './world-route-helpers.mjs';

const route=(old,path,outcome,history)=>({old:old.split(' '),path:path.split(' '),outcome,...(history&&{history})});
const visits={returner:'returner book back',resident:'resident date back'};
const interviews=[[],['returner'],['resident'],['returner','resident'],['resident','returner']];
const full={q001:'compromise',q098:'contract',q099:'contract'},blank={q001:'compromise',q098:'compromise',q099:'compromise'};
export const routes={
  q096:[route('recover','recover cart ship','contract'),route('follow label','follow read label leave','informed'),
    route('follow replace','follow read replace note','compromise'),route('follow route redirect','follow read route redirect back turn escort check','informed'),
    route('follow route fresh','follow read route fresh note','compromise')],
  q097:[route('count','count guide back escort close','contract'),route('temporary','temporary escort file','compromise'),
    route('name provisional','name hear provisional escort file','compromise'),route('name register certificate','name hear register call certificate escort check','informed'),
    route('name register town','name hear register call town escort file','compromise')],
  q098:[route('open','open enter survey report file','contract'),route('blank','blank report file','compromise'),
    route('ask withdraw','ask listen withdraw report file','compromise'),route('ask route reject','ask listen route trace return show reject report store','compromise'),
    route('ask route redact','ask listen route trace return show redact accept post file','informed')],
  q099:[route('bring','bring escort report','contract'),route('message','message carry hand','compromise'),
    ...interviews.flatMap(order=>{
      const old=['talk',...order].join(' '),path=['talk',...order.map(k=>visits[k])].join(' ');
      return [route(old+' carry',path+' carry carry hand','compromise'),...(order.length===2?[route(old+' connect',path+' connect escort link','informed')]:[])];
    })],
  q100:[route('key','key take claim','contract'),route('limited','limited bar','compromise'),
    route('records close','records read close prepare bar','compromise'),route('records privacy limit','records read privacy limit prepare bar','compromise',blank),
    ...['respect','redact'].flatMap(method=>['share','seal'].map(ending=>
      route('records privacy '+method+' '+ending,'records read privacy '+method+' bring sign '+(ending==='share'?'share entrust':'seal back bar'),
        ending==='share'?'informed':'compromise',method==='redact'?full:ending==='seal'?blank:undefined)))]
};
const read=async f=>JSON.parse(await fs.readFile(new URL('../'+f,import.meta.url),'utf8'));
export const previous=await loadContent(async f=>{
  const value=await read(f);
  if(f==='data/scenario-editions.json')for(const q of Object.keys(routes))delete value.editions.e2.questOverrides[q];
  return value;
},{edition:'e2'});
export function ready(q,{old=false,start='site'}={}){
  const trial=createQuestTrial(old?previous:data,catalog,{quest:q,party:'balanced',level:10,start,seed:1907});
  trial.engine.random=()=>0.999999;drain(trial.engine);return trial.engine;
}
export function setupRoute(g,q,route){
  for(const [id,outcome] of Object.entries(route.history??{})){
    assert.equal(q,'q100');assert.equal(g.state.quests[id].stage,'completed');g.state.quests[id].outcome=outcome;
  }
}
export function oldDecision(g,q,scene){
  const p=previous.quests[q].events.find(e=>e.role==='decision').points[0];
  exploreSpot(g,p,{maintain:true,interact:false});assert.deepEqual([g.map().id,g.state.location.x,g.state.location.y],[p.map,p.x,p.y]);
  g.run(q+'.'+scene);drain(g);
}
export function states(q){
  const graph=collectStates(q,routes[q],ready,setupRoute);
  for(const scene of ['decision','review']){
    const g=ready(q,{old:true,start:'reception'});oldDecision(g,q,scene);graph.legacy.push({scene,save:g.save()});
  }
  if(q==='q096')for(const old of [false,true])for(const deep of [false,true]){
    const g=ready(q,{old});choose(g,q,'follow');if(!old)choose(g,q,'read');if(deep)choose(g,q,'route');
    delete g.state.inventory.ration;
    graph[old?'legacy':'current'].push({scene:deep?(old?'deep':'empty'):(old?'cache':'choice'),save:g.save(),availableChoice:(deep?'fresh':'replace')+'_supplies'});
  }
  return graph;
}
export function expectedValues(q,r){
  const has=k=>r.old.includes(k),win=r.outcome==='contract',informed=r.outcome==='informed';
  switch(q){
    case 'q096':return {line:win?'stopped':has('redirect')?'deep':informed?'corner':'running',swap:has('replace')?'corner':has('fresh')?'deep':'none',
      posted:informed,shipped:win,bagAt:win?'depot':'cache',nextAt:win?'depot':has('redirect')?'deep':'belt'};
    case 'q097':return {named:has('register'),answered:has('register'),paper:win?'listed':informed?'personal':has('town')?'town':'temporary',
      passAt:informed?'porter':'yachi',porterAt:win?'side':'gate',crewAt:'gate',yachiAt:'roll'};
    case 'q098':return {drawing:win?'full':informed?'redacted':has('reject')?'draft':'blank',approved:informed,guardDown:win,cancelled:!informed&&!win,copyAt:'desk',residentAt:'window',moriAt:'desk'};
    case 'q099':return {pickup:has('returner'),oilDate:has('resident'),guardDown:win,returnerAt:win||informed?'exit':'lamp',
      residentAt:win?'exit':'lamp',letterAt:informed||win?'resident':'rine',rineAt:'exit'};
    case 'q100':return {scope:has('redact')?'redacted':has('respect')?'respected':'unchecked',signed:has('seal')||has('share'),
      guardDown:win,keyAt:win?'party':'gate',copyAt:has('share')||has('seal')?'keepers':'table',access:win?'exclusive':informed?'shared':'limited'};
  }
}
