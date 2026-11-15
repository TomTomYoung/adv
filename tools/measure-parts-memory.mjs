// Normal seeded site-start trials, independent of high-level display fixtures.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createQuestTrial,questTrialReport} from '../src/application/quest-playtest.js';
import {data,read,go,drain} from '../tests/machine-helpers.mjs';
import {fight} from '../tests/helpers.mjs';
export async function measurePartsMemory(){
 const catalog=await read('playtests/quest-parties.json'),rows=[];
 for(const [party,route,outcome] of [
  ['balanced',['train','hammer','return','needle','return','save','finish'],'informed'],
  ['sustain',['train','needle','return','hammer','return','save','finish'],'informed'],
  ['support',['manual'],'compromise'],
  ['balanced',['erase'],'contract'],
  ['sustain',['train','manual'],'compromise'],
  ['support',['train','hammer','return','manual'],'compromise'],
  ['balanced',['train','needle','return','manual'],'compromise'],
  ['sustain',['train','hammer','return','needle','return','manual'],'compromise'],
  ['support',['train','needle','return','hammer','return','manual'],'compromise']
 ]){
  const trial=createQuestTrial(data,catalog,{quest:'q078',party,level:8,seed:1907,start:'site',battleMode:'classic',outcome}),g=trial.engine;
  const dispatch=g.dispatch.bind(g);g.dispatch=intent=>{const ok=dispatch(intent);if(ok)trial.actions++;return ok;};drain(g);
  for(const id of route){assert.ok(g.dispatch({type:'choose',id}),g.state.notice);drain(g);if(g.state.battle)fight(g);
   if(g.state.journey){const a=g.data.quests.q078.story.actions[g.state.journey.action];go(g,g.data.quests.q078.story.worldPlaces[a.journey.to]);drain(g);assert.equal(g.state.journey,null);}
  }
  const row={route,...questTrialReport(trial)};assert.equal(row.status,'cleared');rows.push(row);
 }
 return rows;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const rows=await measurePartsMemory();if(process.argv[2])await fs.writeFile(process.argv[2],JSON.stringify(rows,null,2)+'\n');
 console.log(JSON.stringify(rows.map(r=>({party:r.config.party,route:r.route,outcome:r.outcome,status:r.status,steps:r.steps,records:r.records,gold:r.gold,rescues:r.rescues}))));
}
