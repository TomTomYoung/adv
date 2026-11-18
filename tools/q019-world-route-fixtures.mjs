import assert from 'node:assert/strict';
import {projectGame} from '../src/application/projection.js';
import {data,ready,enumerate,choose,depart,arrive,migrated,resume,checkpoint,drain} from '../tests/q019-helpers.mjs';

export function mineScaleFixtures(){
  const graph=enumerate(),story=data.quests.q019.story,fixtures=[];
  function capture(g,variant) {
    checkpoint(g);
    const dialog=projectGame(g).dialog;
    const scene=g.state.stories.q019?.scene??g.state.flags.flow.q019.node;
    const cast=dialog.scene?.cast.map(c=>c.id)??[];
    fixtures.push({edition:'e2',quest:'q019',scene,variant,cast,textOnlyCast:cast,save:g.save(),expectedText:dialog.text,
      availableChoice:dialog.options.find(o=>o.enabled).id,blockedChoices:dialog.options.filter(o=>!o.enabled).map(o=>o.id),
      ...(!dialog.scene && {absentStoryScene:true})});
  }
  const g=ready(),journeys=new Set(),work=new Set();
  for(const [index,row] of graph.active.entries()){
    g.load(row.save);
    capture(g,'current-'+index);
    for(const o of projectGame(g).dialog.options.filter(o=>o.enabled)){
      const key=row.scene+'_'+o.id;
      if(!story.actions[key]?.journey || journeys.has(key)) continue;
      journeys.add(key);g.load(row.save);depart(g,o.id);g.defeat();drain(g);checkpoint(g);arrive(g);capture(g,'rescued-'+key);
    }
    if(row.scene!=='entry' && !work.has(row.scene)){
      work.add(row.scene);g.load(row.save);g.defeat();drain(g);checkpoint(g);resume(g);capture(g,'work-saved-'+row.scene);
    }
  }
  assert.equal(journeys.size,16);assert.equal(work.size,Object.keys(story.scenes).length-1);
  for(const before of [[],['dry'],['dry','books']]){
    const old=ready({old:true});choose(old,...before);capture(migrated(old),'preserved-'+(before.join('-')||'entry'));
  }
  assert.equal(fixtures.length,graph.active.length+journeys.size+work.size+3);
  const ids=fixtures.map(f=>f.scene+'/'+f.variant);
  assert.equal(ids.length,new Set(ids).size,'each browser checkpoint has a distinct screenshot');
  return {fixtures,outcomes:[...new Set(graph.endings.map(r=>'e2/q019/'+r.outcome))]};
}
