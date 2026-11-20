import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {createQuestTrial,dispatchQuestTrial,questTrialReport} from '../src/application/quest-playtest.js';
import {data,catalog,routes,arrive,go,resume,assertValues} from '../tests/market-world-helpers.mjs';
import {drain,fight} from '../tests/helpers.mjs';

export function measureMarketRoutes(){
  const results=[];
  for(const [quest,paths] of Object.entries(routes))for(const route of paths){
    for(const start of ['site','reception'])for(const level of [6,7])for(const party of ['balanced','sustain','explore']){
      const trial=createQuestTrial(data,catalog,{quest,start,party,level,seed:1907,outcome:route.outcome}),g=trial.engine;
      drain(g);
      if(start==='reception'){
        go(g,quest,data.quests[quest].story.scenes.entry.place);
        if(!g.state.stories[quest])resume(g,quest);
      }
      for(const id of route.path){
        assert.ok(dispatchQuestTrial(trial,{type:'choose',id}),[quest,start,level,party,id,g.state.notice].join('/'));drain(g);
        if(g.state.battle){fight(g);drain(g);}
        if(g.state.journey)arrive(g,quest);
        const save=g.save();g.load(save);assert.equal(g.save(),save);
      }
      const report=questTrialReport(trial);
      assert.equal(report.status,'cleared');assert.equal(report.outcome,route.outcome);assertValues(g,quest,route);
      assert.equal(report.records.losses,0);assert.equal(report.rescues,0);
      results.push({quest,start,level,party,path:route.old,...report});
    }
  }
  return results;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(measureMarketRoutes()));
