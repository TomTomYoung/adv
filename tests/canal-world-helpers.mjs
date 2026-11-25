import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {loadContent} from '../src/core/loader.js';
import {createQuestTrial} from '../src/application/quest-playtest.js';
import {data,catalog,migrated} from './abyss-world-helpers.mjs';
import {drain} from './helpers.mjs';
import {choose} from './world-route-helpers.mjs';
export {data,catalog,migrated};
export {arrive} from './world-route-helpers.mjs';

const ids=['q101','q102','q103','q104','q105','q106','q107'];
export const routes=Object.fromEntries(ids.map(id=>[id,[]]));
function add(q,old,path,outcome){
  const words=text=>text.trim().split(/\s+/);
  routes[q].push({old:words(old),path:words(path),outcome});
}
for(const first of ['watch','wish listen']){
  const endings=[['report','report tell','report'],['quiet','quiet finish','quiet']];
  for(const [old,path,end] of endings)add('q101',first+' '+old,first+' '+path,end);
  for(const later of ['', ' wish listen talk',' wish listen talk wish listen talk']){
    const pre=first+' talk'+later;
    for(const [old,path,end] of endings)add('q101',pre+' '+old,pre+' '+path,end);
    if(pre.includes('wish'))for(const [decision,last,end] of [['agree','agree hand','visit'],['decline','decline tell','report']])
      add('q101',pre+' visit '+decision,pre+' visit '+last,end);
  }
  for(const [old,path,end] of endings)add('q101',first+' talk wish listen '+old,first+' talk wish listen '+path,end);
}
function bellRoutes(steps){
  const prefix=steps.map(k=>k==='notice'?k:k+' heard').join(' '),walk=steps.map(k=>k==='notice'?'notice post':k+' heard').join(' ');
  for(const end of ['hand','silent',...(steps.includes('family')?['bell']:[])])
    add('q102','begin '+prefix+' go '+end,'begin '+walk+' go escort '+end+(end==='bell'?' ring join walk':''),end);
  for(const next of ['family','inn','notice'])if(!steps.includes(next)&&(next!=='notice'||steps.includes('family')))bellRoutes([...steps,next]);
}
bellRoutes([]);
add('q103','stop','stop check','stop');
for(const loop of ['', 'consent back ', 'join back ', 'consent back join back ', 'join back consent back ', 'join back join back ']){
  for(const [old,path,end] of [['stop','stop check','stop'],['consent write','consent write file','write'],['join food','join food roster record','joint']])
    add('q103','source '+loop+old,'source '+loop+path,end);
}
for(const pre of ['sound repeat','ask find','sound learn find']){
  for(const [old,path,end] of [['return','return shelf place','return'],['buy','buy gift','buy'],['lease agree','lease agree record','lease'],['lease return','lease return shelf place','return']])
    add('q104',pre+' '+old,pre+' '+path,end);
}
for(const trail of ['shop','canal'])for(const pre of ['', 'report ', 'roles back ', 'report roles back ', 'roles back report ', 'roles back roles back ']){
  for(const [old,path,end] of [['return','return seat','return'],['delay','delay back plan','delay'],['roles agree','roles agree confirm hand escort seat','roles']])
    add('q105',trail+' '+pre+old,'bridge '+trail+' follow '+pre.replace('report','report tell')+path,end);
}

add('q106','seal','chase seal report finish','seal');
add('q106','guard','chase guard keep finish','guard');
for(const retry of [false,true]){
  const visit='chase owner compare '+(retry?'guard keep retry ':'');
  const finish=retry?'finish':'keep finish';
  add('q106','owner guard',visit+'guard '+finish,'guard');
  const meal=visit+'learn back ask admit ';
  add('q106','owner ask guard',meal+'guard '+finish,'guard');
  add('q106','owner ask eat',meal+'eat finish','meal');
}
const observed='look watch ';
const spoken=observed+'courier ';
const sent=spoken+'letter carry send ';
const replied=sent+'sleep receive share ';
add('q107','stop',observed+'stop close','stop');
add('q107','courier stop',spoken+'stop close','stop');
add('q107','courier alive',spoken+'alive finish','alive');
add('q107','courier letter alive',sent+'alive finish','alive');
add('q107','courier letter sleep alive',replied+'alive','alive');
add('q107','courier letter sleep meet',replied+'meet invite enter sit','meet');

const breadShortages=[
  {choice:'seal',old:[],path:['chase'],legacyScene:'entry',scene:'trail',place:'alley',cost:{gold:30},finish:['report','finish'],outcome:'seal'},
  {choice:'eat',old:['owner','ask'],path:['chase','owner','compare','learn','back','ask','admit'],legacyScene:'meal',scene:'meal',place:'table',cost:{ration:1},finish:['finish'],outcome:'meal'}
];
export {breadShortages};

export const previous=await loadContent(async f=>{
  const x=JSON.parse(await fs.readFile(new URL('../'+f,import.meta.url)));
  if(f==='data/scenario-editions.json')for(const id of ids)delete x.editions.e2.questOverrides[id];
  return x;
},{edition:'e2'});
export function ready(quest,{old=false,start='site'}={}){
  const {engine}=createQuestTrial(old?previous:data,catalog,{quest,start,party:'balanced',level:1,seed:1907});
  engine.random=()=>0.999999;drain(engine);return engine;
}
export function expectedValues(q,r){
  const has=k=>r.old.includes(k),end=r.outcome;
  switch(q){
    case 'q101':return {wish:has('wish'),keySeen:has('talk'),unlocked:true,promise:end==='visit',reported:end==='report',silent:end==='quiet',keyAt:end==='visit'?'mina':'garo',garoAt:has('visit')?'counter':has('talk')?'bench':'door'};
    case 'q102':return {family:has('family'),inn:has('inn'),notice:has('notice'),time:['family','inn','notice'].filter(has).length,sound:end,rouAt:'lane',familyAt:'lane'};
    case 'q103':return {asked:end==='write',filed:end==='write',formAt:end==='write'?'toma':'elder',paid:end==='joint',shared:end==='joint',stopped:end==='stop',hostAt:end==='joint'?'kitchen':'inn'};
    case 'q104':return {rule:has('find'),paid:end==='buy',lease:end==='lease',owner:end==='buy'?'vero':'boy',bottleAt:end==='return'?'stall':'vero',use:{return:'returned',buy:'gift',lease:'overnight'}[end]};
    case 'q107':{
      const sent=has('letter'),slept=has('sleep'),met=end==='meet';
      return {courierSeen:true,message:sent,slept,reply:slept,meeting:slept,seated:met,reported:end==='alive',stopped:end==='stop',
        letterAt:sent&&!slept?'courier':'guests',parcelAt:'courier',courierAt:sent&&!slept?'neighbor':'door',
        missingAt:met?'dining':'neighbor',guestsAt:'dining',moraAt:'desk'};
    }
    case 'q106':{
      const took=id=>r.path.includes(id);
      return {theft:true,owner:took('compare'),rule:took('back'),admitted:took('admit'),shared:end==='meal',
        deferred:took('compare')&&r.path[r.path.indexOf('compare')+1]==='guard',guarded:took('keep'),retried:took('retry'),
        shadowState:{seal:'sealed',guard:'loose',meal:'rejoined'}[end],porterAt:took('ask')?'table':'door',
        shadowAt:took('ask')?'table':took('compare')?'door':'alley',mageAt:'alley',familyAt:'table',bakerAt:'bakery'};
    }
    case 'q105':return {trail:r.old[0],reported:has('report')||end==='roles',work:end==='roles',postponed:end==='delay',returned:end==='return',shoeAt:{roles:'sister',return:'dan',delay:'lise'}[end],sisterAt:end==='roles'?'hall':'cart',liseAt:end==='delay'?'cart':'hall'};
  }
}
export function states(q){
  const current=new Map(),legacy=new Map();
  for(const route of routes[q])for(const [old,collection,choices] of [[false,current,route.path],[true,legacy,route.old]]){
    const g=ready(q,{old});
    for(const id of choices){
      const state=old?g.state.flags.quest[q]:g.state.stories[q],scene=old?state.node:state.scene;
      // Distinct local histories matter even if the visible scene has the same name.
      const key=JSON.stringify(state);
      if(!collection.has(key))collection.set(key,{scene,save:g.save()});
      choose(g,q,id);
    }
    assert.equal(g.state.quests[q].outcome,route.outcome,q+'/'+choices.join('/'));
  }
  if(['q103','q104'].includes(q))for(const [old,rows] of [[false,current],[true,legacy]]){
    const g=ready(q,{old}),food=q==='q103';
    for(const id of food?['source','join']:['ask','find'])choose(g,q,id);
    if(food)delete g.state.inventory.ration;else g.state.gold=39;
    rows.set('short',{scene:food?'joint':'found',save:g.save(),availableChoice:(food?'food':'buy')+'_supplies'});
  }
  if(q==='q106')for(const row of breadShortages)for(const [old,rows] of [[false,current],[true,legacy]]){
    const g=ready(q,{old});for(const id of old?row.old:row.path)choose(g,q,id);
    if(row.cost.gold)g.state.gold=row.cost.gold-1;else delete g.state.inventory.ration;
    rows.set('short-'+row.choice,{scene:old?row.legacyScene:row.scene,save:g.save(),availableChoice:row.choice+'_supplies'});
  }
  return {current:[...current.values()],legacy:[...legacy.values()]};
}
