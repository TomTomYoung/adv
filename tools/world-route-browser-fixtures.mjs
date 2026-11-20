import assert from 'node:assert/strict';
import {projectGame} from '../src/application/projection.js';
import {drain} from '../tests/helpers.mjs';
import {depart,arrive,checkpoint} from '../tests/world-route-helpers.mjs';

export function worldRouteFixtures(quest,{data,routes,ready,states,migrated}){
  const {current,legacy}=states(quest),g=ready(quest),old=ready(quest,{old:true}),fixtures=[],trips=new Set();
  function capture(engine,scene,variant){
    const save=checkpoint(engine),dialog=projectGame(engine).dialog,cast=dialog.scene?.cast.map(c=>c.id)??[];
    fixtures.push({edition:'e2',quest,scene,variant,cast,textOnlyCast:cast,checkMobileChoiceFit:!!dialog.scene,save,
      expectedText:dialog.text,availableChoice:dialog.options.find(o=>o.enabled).id,
      blockedChoices:dialog.options.filter(o=>!o.enabled).map(o=>o.id),...(!dialog.scene&&{absentStoryScene:true})});
  }
  for(const [i,row] of current.entries()){
    g.load(row.save);capture(g,row.scene,'current-'+i);
    for(const o of projectGame(g).dialog.options.filter(o=>o.enabled)){
      const key=row.scene+'_'+o.id;
      if(!data.quests[quest].story.actions[key]?.journey||trips.has(key))continue;
      trips.add(key);g.load(row.save);depart(g,o.id);g.defeat();drain(g);checkpoint(g);arrive(g,quest);
      capture(g,g.state.stories[quest].scene,'rescued-'+key);
    }
  }
  for(const [i,row] of legacy.entries()){old.load(row.save);capture(migrated(old),row.scene,'legacy-'+i);}
  assert.equal(trips.size,Object.values(data.quests[quest].story.actions).filter(a=>a.journey).length);
  return {fixtures,outcomes:[...new Set(routes[quest].map(r=>'e2/'+quest+'/'+r.outcome))]};
}
