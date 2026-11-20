import assert from 'node:assert/strict';
import {projectGame} from '../src/application/projection.js';
import {data,ready,enumerate,choose,depart,arrive,migrated,resume,checkpoint,drain} from '../tests/q030-helpers.mjs';

export function rootMorningFixtures(){
  const graph=enumerate(),story=data.quests.q030.story,fixtures=[];
  function capture(g,variant){
    checkpoint(g);
    const dialog=projectGame(g).dialog;
    const scene=g.state.stories.q030?.scene??g.state.flags.flow.q030.node;
    const cast=dialog.scene?.cast.map(c=>c.id)??[];
    fixtures.push({edition:'e2',quest:'q030',scene,variant,cast,textOnlyCast:cast,checkMobileChoiceFit:!!dialog.scene,save:g.save(),expectedText:dialog.text,
      availableChoice:dialog.options.find(o=>o.enabled).id,blockedChoices:dialog.options.filter(o=>!o.enabled).map(o=>o.id),
      ...(!dialog.scene&&{absentStoryScene:true})});
  }
  const g=ready(),journeys=new Set(),work=new Set();
  for(const [index,row] of graph.active.entries()){
    g.load(row.save);
    capture(g,'current-'+index);
    for(const o of projectGame(g).dialog.options.filter(o=>o.enabled)){
      const key=row.scene+'_'+o.id;
      if(!story.actions[key]?.journey||journeys.has(key))continue;
      journeys.add(key);
      g.load(row.save);depart(g,o.id);g.defeat();drain(g);checkpoint(g);arrive(g);
      capture(g,'rescued-'+key);
    }
    if(row.scene!=='entry'&&!work.has(row.scene)){
      work.add(row.scene);g.load(row.save);g.defeat();drain(g);checkpoint(g);resume(g);
      capture(g,'work-saved-'+row.scene);
    }
  }
  assert.equal(journeys.size,6);
  assert.equal(work.size,Object.keys(story.scenes).length-1);
  for(const before of [[],['brace'],['move'],['brace','evacuate'],['move','return']]){
    const old=ready({old:true});choose(old,...before);
    capture(migrated(old),'preserved-'+(before.join('-')||'entry'));
  }
  const lost=ready();depart(lost,'stop');lost.defeat();drain(lost);checkpoint(lost);resume(lost);
  capture(lost,'boss-defeat');
  assert.equal(fixtures.length,graph.active.length+journeys.size+work.size+6);
  assert.equal(fixtures.length,new Set(fixtures.map(f=>f.scene+'/'+f.variant)).size);
  return {fixtures,outcomes:[...new Set(graph.endings.map(r=>'e2/q030/'+r.outcome))]};
}
