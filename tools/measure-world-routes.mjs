import assert from 'node:assert/strict';
import {createQuestTrial,dispatchQuestTrial,questTrialReport} from '../src/application/quest-playtest.js';
import {go,resume} from '../tests/world-route-helpers.mjs';
import {drain,fight} from '../tests/helpers.mjs';

export function measureWorldRoutes({data,catalog,routes,expectedValues,arrive,setupRoute,settleBattle=fight},levels,parties){
  const results=[];
  for(const [quest,paths] of Object.entries(routes))for(const route of paths){
    for(const start of ['site','reception'])for(const level of levels)for(const party of parties){
      const trial=createQuestTrial(data,catalog,{quest,start,party,level,seed:1907,outcome:route.outcome}),g=trial.engine;
      setupRoute?.(g,quest,route);drain(g);
      if(start==='reception'){
        go(g,quest,data.quests[quest].story.scenes.entry.place);
        if(!g.state.stories[quest])resume(g,quest);
      }
      for(const id of route.path){
        assert.ok(dispatchQuestTrial(trial,{type:'choose',id}),[quest,start,level,party,id,g.state.notice].join('/'));drain(g);
        if(g.state.battle){settleBattle(g,quest,route);drain(g);}
        if(g.state.journey)arrive(g,quest);
        const save=g.save();g.load(save);assert.equal(g.save(),save);
      }
      const report=questTrialReport(trial);
      assert.equal(report.status,'cleared');assert.equal(report.outcome,route.outcome);
      for(const [key,value] of Object.entries(expectedValues(quest,route)))assert.equal(g.state.stories[quest].values[key],value,quest+'/'+key);
      assert.equal(report.records.losses,0);assert.equal(report.rescues,0);
      results.push({quest,start,level,party,path:route.path,...report});
    }
  }
  return results;
}
