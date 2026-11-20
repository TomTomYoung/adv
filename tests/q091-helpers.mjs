import fs from 'node:fs/promises';
import {loadContent} from '../src/core/loader.js';
import {GameEngine} from '../src/core/engine.js';
import {createQuestTrial} from '../src/application/quest-playtest.js';
import {drain} from './helpers.mjs';
import {collectStates} from './world-route-helpers.mjs';
export {arrive} from './world-route-helpers.mjs';

const read=async file=>JSON.parse(await fs.readFile(new URL('../'+file,import.meta.url),'utf8'));
export const data=await loadContent(read,{edition:'e2'});
export const catalog=await read('playtests/quest-parties.json');
export const previous=await loadContent(async file=>{
  const value=await read(file);
  if(file==='data/scenario-editions.json')delete value.editions.e2.questOverrides.q091;
  return value;
},{edition:'e2'});
export function ready(quest,{old=false,start='site'}={}){
  const g=createQuestTrial(old?previous:data,catalog,{quest,party:'balanced',level:10,start,seed:1907}).engine;
  g.random=()=>0.999999;drain(g);return g;
}
export function migrated(old){const g=new GameEngine(data);g.load(old.save());return g;}
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
