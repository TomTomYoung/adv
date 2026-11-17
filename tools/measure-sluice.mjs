import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {createQuestTrial,dispatchQuestTrial,questTrialReport} from '../src/application/quest-playtest.js';
import {data,enumerate,drain,fight,go,arrive} from '../tests/q010-helpers.mjs';
const catalog=JSON.parse(fs.readFileSync(new URL('../playtests/quest-parties.json',import.meta.url)));

export function measureSluice({levels=[1],starts=['site','reception']}={}){
  const routes=enumerate().endings,results=[];
  for(const start of starts)for(const level of levels)for(const party of ['balanced','sustain','explore'])for(const route of routes){
    const t=createQuestTrial(data,catalog,{quest:'q010',party,level,start,seed:1907,outcome:route.outcome}),g=t.engine;drain(g);
    let townMoves=0;const options={maintain:true,onMove:()=>townMoves++};
    if(start==='reception'){go(g,'control',options);if(!g.state.stories.q010){assert.ok(g.dispatch({type:'story.resume',quest:'q010'}));drain(g);}}
    for(const id of route.path){
      assert.ok(dispatchQuestTrial(t,{type:'choose',id}),party+'/'+id+': '+g.state.notice);drain(g);if(g.state.battle)fight(g);
      if(g.state.journey)arrive(g,options);
      const save=g.save();g.load(save);assert.equal(g.save(),save);
    }
    const r=questTrialReport(t);assert.equal(r.status,'cleared');assert.equal(r.outcome,route.outcome);assert.equal(r.records.losses,0);assert.equal(r.rescues,0);
    results.push({party,level,start,path:route.path,outcome:r.outcome,status:r.status,steps:r.steps,townMoves,records:r.records,rescues:r.rescues,items:r.items});
  }
  return results;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(measureSluice(),null,2));
