import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {createQuestTrial,dispatchQuestTrial,questTrialReport} from '../src/application/quest-playtest.js';
import {data,catalog,routes,drain,fight,go,arrive} from '../tests/q030-helpers.mjs';

export function measureRootMorning({levels=[3,4],starts=['site','reception']}={}){
  const results=[];
  for(const start of starts)for(const level of levels)for(const party of ['balanced','sustain','explore'])for(const route of routes){
    const t=createQuestTrial(data,catalog,{quest:'q030',party,level,start,seed:1907,outcome:route.outcome}),g=t.engine;
    drain(g);const options={maintain:true};
    if(start==='reception'){
      go(g,'garden',options);
      if(!g.state.stories.q030){assert.ok(g.dispatch({type:'story.resume',quest:'q030'}));drain(g);}
    }
    for(const id of route.path){
      assert.ok(dispatchQuestTrial(t,{type:'choose',id}),[party,level,start,id].join('/')+': '+g.state.notice);
      drain(g);
      if(g.state.battle)fight(g);
      if(g.state.journey)arrive(g,options);
      const saved=g.save();g.load(saved);assert.equal(g.save(),saved);
    }
    const r=questTrialReport(t);
    assert.equal(r.status,'cleared');
    assert.equal(r.outcome,route.outcome);
    assert.equal(r.records.losses,0);
    assert.equal(r.rescues,0);
    results.push({party,level,start,path:route.old,outcome:r.outcome,status:r.status,steps:r.steps,records:r.records,rescues:r.rescues,items:r.items});
  }
  return results;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(measureRootMorning(),null,2));
