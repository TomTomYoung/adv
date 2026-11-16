// Ordinary seeded target-quest trials. q061-linked paths are separately tested with actual handover.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createQuestTrial,questTrialReport} from '../src/application/quest-playtest.js';
import {data,go,drain} from '../tests/royal-helpers.mjs';
import {read} from '../tests/oddland-helpers.mjs';
import {fight} from '../tests/helpers.mjs';
export async function measureReturnSignal(){
 const catalog=await read('playtests/quest-parties.json'),rows=[];
 for(const [party,route,outcome] of [
  ['balanced',['source','trail','follow','reach','finish'],'informed'],
  ['sustain',['source','trail','follow','call','escort','finish'],'compromise'],
  ['support',['source','handoff','finish'],'compromise'],
  ['balanced',['recover','carry','finish'],'contract']
 ]){
  const trial=createQuestTrial(data,catalog,{quest:'q084',party,level:9,seed:1907,start:'site',battleMode:'classic',outcome}),g=trial.engine;
  const dispatch=g.dispatch.bind(g);g.dispatch=intent=>{const ok=dispatch(intent);if(ok)trial.actions++;return ok;};drain(g);
  assert.notEqual(g.state.quests.q061.outcome,'informed');
  for(const id of route){assert.ok(g.dispatch({type:'choose',id}),g.state.notice);drain(g);if(g.state.battle)fight(g);
   if(g.state.journey){const a=g.data.quests.q084.story.actions[g.state.journey.action];go(g,g.data.quests.q084.story.worldPlaces[a.journey.to]);drain(g);assert.equal(g.state.journey,null);}
  }
  const row={route,chartHistory:'q061 not handed over; no chart-copy assistance',...questTrialReport(trial)};assert.equal(row.status,'cleared');rows.push(row);
 }
 return rows;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const rows=await measureReturnSignal();if(process.argv[2])await fs.writeFile(process.argv[2],JSON.stringify(rows,null,2)+'\n');
 console.log(JSON.stringify(rows.map(r=>({party:r.config.party,route:r.route,outcome:r.outcome,status:r.status,steps:r.steps,records:r.records,gold:r.gold,rescues:r.rescues}))));
}
