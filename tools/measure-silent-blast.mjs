import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {createQuestTrial,dispatchQuestTrial,questTrialReport} from '../src/application/quest-playtest.js';
import {data,catalog,routes,drain,fight,go,arrive} from '../tests/q016-helpers.mjs';
export function measureSilentBlast({levels=[1,2],starts=['site','reception']}={}){
 const results=[];
 for(const start of starts)for(const level of levels)for(const party of ['balanced','sustain','explore'])for(const route of routes){
  const t=createQuestTrial(data,catalog,{quest:'q016',party,level,start,seed:1907,outcome:route.outcome}),g=t.engine;drain(g);const options={maintain:true};
  if(start==='reception'){go(g,'works',options);if(!g.state.stories.q016){assert.ok(g.dispatch({type:'story.resume',quest:'q016'}));drain(g);}}
  for(const id of route.path){assert.ok(dispatchQuestTrial(t,{type:'choose',id}),`${party}/${level}/${start}/${id}: ${g.state.notice}`);drain(g);if(g.state.battle)fight(g);if(g.state.journey)arrive(g,options);const save=g.save();g.load(save);assert.equal(g.save(),save);}
  const r=questTrialReport(t);assert.equal(r.status,'cleared');assert.equal(r.outcome,route.outcome);assert.equal(r.records.losses,0);assert.equal(r.rescues,0);
  results.push({party,level,start,path:route.path,outcome:r.outcome,status:r.status,steps:r.steps,records:r.records,rescues:r.rescues,items:r.items});
 }
 return results;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(measureSilentBlast(),null,2));
