import assert from 'node:assert/strict';
import {projectGame} from '../src/application/projection.js';
import {returnCartSource} from '../authoring/editions/e2/story-q014.mjs';
import {ready,enumerate,depart,arrive,migrated,resume,checkpoint,drain,choose} from '../tests/q014-helpers.mjs';
export function returnCartFixtures(){
 const fixtures=[],seen=new Set(),graph=enumerate(),source=returnCartSource();
 const capture=(g,variant)=>{
  checkpoint(g);const d=projectGame(g).dialog,scene=g.state.stories.q014?.scene??g.state.flags.flow?.q014?.scene??'legacy',key=variant+'/'+scene;
  if(seen.has(key))return;seen.add(key);const cast=d.scene?.cast.map(c=>c.id)??[],choice=d.options?.find(o=>o.enabled);assert.ok(choice);
  fixtures.push({edition:'e2',quest:'q014',scene,variant,cast,textOnlyCast:cast,save:g.save(),expectedText:d.text,availableChoice:choice.id,blockedChoices:d.options.filter(o=>!o.enabled).map(o=>o.id),...(!d.scene?{absentStoryScene:true}:{})});
 };
 const g=ready();for(const row of graph.active){g.load(row.save);capture(g,'current-'+row.values.route+'-'+Number(row.values.treated));}
 for(const path of [[],['unload'],['unload','medical']]){const old=ready({old:true});choose(old,...path);capture(migrated(old),'preserved');}
 const journeys=new Set(),work=new Set();
 for(const row of graph.active){
  g.load(row.save);for(const o of projectGame(g).dialog.options.filter(o=>o.enabled)){
   const key=row.scene+'_'+o.id;if(!source.story.actions[key]?.journey||journeys.has(key))continue;journeys.add(key);g.load(row.save);depart(g,o.id);g.defeat();drain(g);checkpoint(g);arrive(g);capture(g,'rescued-'+key);
  }
  if(row.scene!=='entry'&&!work.has(row.scene)){work.add(row.scene);g.load(row.save);g.defeat();drain(g);checkpoint(g);resume(g);capture(g,'work-saved-'+row.scene);}
 }
 assert.equal(journeys.size,8);assert.equal(work.size,28);
 return {fixtures,outcomes:[...new Set(graph.endings.map(r=>'e2/q014/'+r.outcome))]};
}
