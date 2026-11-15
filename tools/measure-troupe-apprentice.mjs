// Normal seeded site-start trials; display fixtures use a separate boosted setup.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createQuestTrial,questTrialReport} from '../src/application/quest-playtest.js';
import {data,read,go,drain} from '../tests/library-helpers.mjs';
export async function measureTroupeApprentice(){
 const catalog=await read('playtests/quest-parties.json'),rows=[];
 for(const [party,route,outcome] of [
  ['balanced',['practice','stage','porter','finish','porter'],'porter'],
  ['explore',['stage','singer','thief','finish','thief'],'thief'],
  ['sustain',['stage','singer','porter','singer','singer'],'singer'],
  ['explore',['practice','stage','porter','thief','company','agree','continue','carry','finish'],'company'],
  ['balanced',['stage','cancel','finish'],'none'],
  ['sustain',['stage','singer','cancel','finish'],'none'],
  ['balanced',['stage','porter','finish','company','decline','finish'],'none']
 ]){
  const trial=createQuestTrial(data,catalog,{quest:'q150',party,level:5,seed:1907,start:'site',battleMode:'classic',outcome}),g=trial.engine;
  const dispatch=g.dispatch.bind(g);g.dispatch=intent=>{const result=dispatch(intent);if(result)trial.actions++;return result;};drain(g);
  for(const id of route){assert.ok(g.dispatch({type:'choose',id}),g.state.notice);drain(g);
   if(g.state.journey){const a=g.data.quests.q150.story.actions[g.state.journey.action];go(g,g.data.quests.q150.story.worldPlaces[a.journey.to]);drain(g);assert.equal(g.state.journey,null);}
  }
  const row={route,...questTrialReport(trial)};assert.equal(row.status,'cleared');assert.equal(row.rescues,0);rows.push(row);
 }
 return rows;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const rows=await measureTroupeApprentice();if(process.argv[2])await fs.writeFile(process.argv[2],JSON.stringify(rows,null,2)+'\n');
 console.log(JSON.stringify(rows.map(r=>({party:r.config.party,route:r.route,outcome:r.outcome,status:r.status,steps:r.steps,records:r.records,gold:r.gold,rescues:r.rescues}))));
}
