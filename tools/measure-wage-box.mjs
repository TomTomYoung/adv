import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {createQuestTrial,dispatchQuestTrial,questTrialReport} from '../src/application/quest-playtest.js';
import {data,routes,drain,walk,fight} from '../tests/q006-helpers.mjs';
const catalog=JSON.parse(fs.readFileSync(new URL('../playtests/quest-parties.json',import.meta.url)));
export function measureWageBox(){
  const results=[];
  for(const party of ['balanced','sustain','explore'])for(const route of routes){
    const t=createQuestTrial(data,catalog,{quest:'q006',party,level:1,start:'site',seed:1907,outcome:route.outcome}),g=t.engine;drain(g);
    for(const id of route.path){
      assert.ok(dispatchQuestTrial(t,{type:'choose',id}),party+'/'+id+': '+g.state.notice);drain(g);if(g.state.battle)fight(g);
      if(g.state.journey){const a=g.data.quests.q006.story.actions[g.state.journey.action],p=g.data.quests.q006.story.worldPlaces[a.journey.to];walk(g,p.x,p.y,{maintain:true});if(g.state.journey)assert.ok(g.dispatch({type:'story.resume',quest:'q006'}));drain(g);}
      const saved=g.save();g.load(saved);assert.equal(g.save(),saved);
    }
    const r=questTrialReport(t);assert.equal(r.status,'cleared');assert.equal(r.outcome,route.outcome);results.push({party,path:route.path,outcome:r.outcome,steps:r.steps,records:r.records,rescues:r.rescues});
  }
  return results;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(measureWageBox(),null,2));
