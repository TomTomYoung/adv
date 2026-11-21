import fs from 'node:fs/promises';
import {loadContent} from '../src/core/loader.js';
import {GameEngine} from '../src/core/engine.js';
import {createQuestTrial} from '../src/application/quest-playtest.js';
import {drain} from './helpers.mjs';

const read=async file=>JSON.parse(await fs.readFile(new URL('../'+file,import.meta.url),'utf8'));
export const data=await loadContent(read,{edition:'e2'});
export const catalog=await read('playtests/quest-parties.json');
export async function beforeWorldRoute(id){
  const previous=await loadContent(async file=>{
    const value=await read(file);
    if(file==='data/scenario-editions.json')delete value.editions.e2.questOverrides[id];
    return value;
  },{edition:'e2'});
  function ready(quest,{old=false,start='site'}={}){
    const g=createQuestTrial(old?previous:data,catalog,{quest,party:'balanced',level:10,start,seed:1907}).engine;
    g.random=()=>0.999999;drain(g);return g;
  }
  return {previous,ready};
}
export function migrated(old){const g=new GameEngine(data);g.load(old.save());return g;}
