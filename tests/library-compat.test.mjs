import test from 'node:test';
import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {loadContent} from '../src/core/loader.js';
import {nextQuestPlace} from '../src/core/quest-navigation.js';
import {fixture,auditQuest,replay} from '../tools/audit-regional-relocation.mjs';
import {data,read,checkpoint,drain} from './library-helpers.mjs';
const numbers=[41,71,141,171].flatMap(start=>Array.from({length:10},(_,i)=>start+i));
export const historical=async version=>loadContent(async file=>{
 if(file==='data/scenario-editions/e2/salome-geography.json')return read('tests/fixtures/e2-geography-before-library.json');
 const value=await read(file);if(file==='data/scenario-editions.json'){for(let n=41;n<=50;n++)delete value.editions.e2.questOverrides['q0'+n];for(let n=141;n<=150;n++)delete value.editions.e2.questOverrides['q'+n];if(version===1)delete value.editions.e2.geographyUpgrade;}return value;
},{edition:'e2'});
for(const version of [1,2]){
 const previous=await historical(version);
 for(const n of numbers){const id='q'+String(n).padStart(3,'0');test(`${id}: geography ${version}, seven old save phases and every inherited ending remain playable`,()=>{
  const report=auditQuest(previous,id),path=Object.values(report.endings)[0];
  for(const stage of ['unaccepted','accepted','dungeon','text','choice','battle','completed']){
   const old=fixture(previous,id,{accepted:stage!=='unaccepted',entered:!['unaccepted','accepted'].includes(stage),started:!['unaccepted','accepted','dungeon','battle'].includes(stage)});
   if(stage==='choice')drain(old);if(stage==='battle')old.startBattle(old.map().encounter,{win:[],escape:[],lose:[]});if(stage==='completed')replay(old,id,path);
   const raw=old.save(),expected=JSON.parse(raw),g=new GameEngine(data);g.load(raw);expected.state.worldTravel.version=2;
   for(const [qid,q] of Object.entries(expected.state.quests))if(data.previousQuestRoutes[qid]&&q.stage!=='available'&&!expected.state.flags.currentStoryRoutes?.[qid])(expected.state.flags.legacyStoryRoutes??={})[qid]=true;
   assert.deepEqual(JSON.parse(g.save()),expected,id+'/'+stage);assert.equal(old.save(),raw);assert.equal(g.state.worldTravel.visited.salome,undefined);checkpoint(g);
   if(!['unaccepted','completed'].includes(stage))assert.equal(nextQuestPlace(data,g.state,id).map,previous.quests[id].locations[0].map);
  }
  auditQuest(data,id,{makeFixture:()=>{const old=fixture(previous,id),g=new GameEngine(data);g.load(old.save());return g;}});
  assert.deepEqual(data.quests[id].requires,previous.quests[id].requires);assert.deepEqual(data.quests[id].outcomes,previous.quests[id].outcomes);
 });}
}
