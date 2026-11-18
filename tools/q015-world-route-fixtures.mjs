import assert from 'node:assert/strict';
import {projectGame} from '../src/application/projection.js';
import {weepingPillarSource} from '../authoring/editions/e2/story-q015.mjs';
import {ready,enumerate,depart,arrive,migrated,resume,checkpoint,drain,choose} from '../tests/q015-helpers.mjs';
export function weepingPillarFixtures(){
 const fixtures=[],seen=new Set(),graph=enumerate(),source=weepingPillarSource();
 const capture=(g,variant)=>{
  checkpoint(g);const d=projectGame(g).dialog,scene=g.state.stories.q015?.scene??g.state.flags.flow?.q015?.scene??'legacy',key=variant+'/'+scene;
  if(seen.has(key))return;seen.add(key);const cast=d.scene?.cast.map(c=>c.id)??[],choice=d.options?.find(o=>o.enabled);assert.ok(choice);
  fixtures.push({edition:'e2',quest:'q015',scene,variant,cast,textOnlyCast:cast,save:g.save(),expectedText:d.text,availableChoice:choice.id,blockedChoices:d.options.filter(o=>!o.enabled).map(o=>o.id),...(!d.scene?{absentStoryScene:true}:{})});
 };
 const g=ready();for(const row of graph.active){g.load(row.save);capture(g,'current-'+row.values.route+'-'+Number(row.values.copied));}
 for(const path of [[],['catch']]){const old=ready({old:true});choose(old,...path);capture(migrated(old),'preserved');}
 const journeys=new Set(),work=new Set();
 for(const row of graph.active){
  g.load(row.save);for(const o of projectGame(g).dialog.options.filter(o=>o.enabled)){
   const key=row.scene+'_'+o.id;if(!source.story.actions[key]?.journey||journeys.has(key))continue;journeys.add(key);g.load(row.save);depart(g,o.id);g.defeat();drain(g);checkpoint(g);arrive(g);capture(g,'rescued-'+key);
  }
  if(row.scene!=='entry'&&!work.has(row.scene)){work.add(row.scene);g.load(row.save);g.defeat();drain(g);checkpoint(g);resume(g);capture(g,'work-saved-'+row.scene);}
 }
 assert.equal(journeys.size,11);assert.equal(work.size,30);
 return {fixtures,outcomes:[...new Set(graph.endings.map(r=>'e2/q015/'+r.outcome))]};
}
