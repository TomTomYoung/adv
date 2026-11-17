import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {createQuestTrial,dispatchQuestTrial,questTrialReport} from '../src/application/quest-playtest.js';
import {data,routes,town,drain} from '../tests/q007-helpers.mjs';
const catalog=JSON.parse(fs.readFileSync(new URL('../playtests/quest-parties.json',import.meta.url)));
export function measureVoiceWall(){
  const results=[];
  for(const start of ['reception','site'])for(const party of ['balanced','sustain','explore'])for(const route of routes){
    const t=createQuestTrial(data,catalog,{quest:'q007',party,level:1,start,seed:1907,outcome:route.outcome}),g=t.engine;drain(g);let moves=0;
    const move=place=>town(g,place,()=>moves++);
    if(start==='reception'){move('e2_voice_port');assert.ok(dispatchQuestTrial(t,{type:'story.resume',quest:'q007'}));drain(g);}
    for(const id of route.path){
      assert.ok(dispatchQuestTrial(t,{type:'choose',id}),party+'/'+id+': '+g.state.notice);drain(g);
      if(g.state.journey){const a=g.data.quests.q007.story.actions[g.state.journey.action];move(g.data.quests.q007.story.worldPlaces[a.journey.to].location);if(g.state.journey)assert.ok(dispatchQuestTrial(t,{type:'story.resume',quest:'q007'}));drain(g);}
      const saved=g.save();g.load(saved);assert.equal(g.save(),saved);
    }
    const r=questTrialReport(t);assert.equal(r.status,'cleared');assert.equal(r.outcome,route.outcome);assert.equal(r.records.battles,0);results.push({start,party,path:route.path,outcome:r.outcome,moves,steps:r.steps,records:r.records,rescues:r.rescues});
  }
  return results;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(measureVoiceWall(),null,2));
