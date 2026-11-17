import assert from 'node:assert/strict';
import {projectGame} from '../src/application/projection.js';
import {ratRouteSource} from '../authoring/editions/e2/story-q009.mjs';
import {ready,enumerate,depart,arrive,migrated,resume,checkpoint,drain} from '../tests/q009-helpers.mjs';

export function ratRouteFixtures(){
  const fixtures=[],seen=new Set(),graph=enumerate(),oldGraph=enumerate({old:true}),source=ratRouteSource();
  const corners={eda:[0,0,0,0],cleaners:[0,0,241,246],storekeeper:[0,0,0,0],clerks:[0,0,247,251]};
  const images={scene:Object.fromEntries(Object.keys(corners).map(id=>[id,{src:`assets/images/characters/sprites/${id}.webp`,size:[1173,1341],cornerAlphas:corners[id]}])),classic:Object.fromEntries(Object.keys(corners).map(id=>[id,{src:`assets/images/characters/generated/${id}.webp`,size:[896,id==='storekeeper'?1023:1024],cornerAlphas:[255,255,255,255]}]))};
  const faces={eda:[.39,.14,.59,.31],cleaners:[.12,.08,.87,.35],storekeeper:[.36,.06,.62,.31],clerks:[.12,.11,.89,.36]};
  const capture=(g,variant,{pageOnly=false}={})=>{
    const scene=g.state.stories.q009.scene,key=variant+'/'+scene;if(seen.has(key))return;seen.add(key);checkpoint(g);
    const d=projectGame(g).dialog,cast=d.scene.cast.map(c=>c.id),choice=d.options?.find(o=>o.enabled);assert.ok(pageOnly||choice);
    fixtures.push({edition:'e2',quest:'q009',scene,variant,cast,save:g.save(),expectedText:d.text,imageExpectationsByLayout:images,...(!pageOnly?{availableChoice:choice.id,blockedChoices:d.options.filter(o=>!o.enabled).map(o=>o.id)}:{}),...(!variant.startsWith('preserved')?{faces:Object.fromEntries(cast.map(id=>[id,faces[id]])),clearOfHud:true,...(g.state.mode==='town'?{townCast:cast}:{})}:{})});
  };
  const g=ready();
  for(const row of graph.active){
    g.load(row.save);const v=row.values,variant='current'+(row.scene==='granary'?`-${Number(v.ratsCleared)}${Number(v.holes)}${Number(v.zones)}`:row.scene==='work'?`-${Number(v.zones)}`:row.scene==='work_arrival'?`-${Number(v.causeKnown)}`:'');
    capture(g,variant);
    if(row.scene==='granary'){const story=structuredClone(g.state.stories.q009);g.state.vm=[];g.state.waiting=null;g.run('q009.ratroute.granary');assert.deepEqual(g.state.stories.q009,story);capture(g,variant+'-opening',{pageOnly:true});}
  }
  for(const row of oldGraph.active){const old=ready({old:true});old.load(row.save);capture(migrated(old),'preserved');}
  const journeys=new Set(),work=new Set();
  for(const row of graph.active){
    g.load(row.save);
    for(const o of projectGame(g).dialog.options.filter(o=>o.enabled)){
      const key=row.scene+'_'+o.id;if(!source.story.actions[key].journey||journeys.has(key))continue;
      journeys.add(key);g.load(row.save);depart(g,o.id);g.defeat();drain(g);checkpoint(g);arrive(g);capture(g,'rescued-'+key);
    }
    if(row.path.length&&!work.has(row.scene)){work.add(row.scene);g.load(row.save);g.defeat();drain(g);checkpoint(g);resume(g);capture(g,'work-saved');}
  }
  assert.equal(journeys.size,10);assert.equal(work.size,13);
  assert.equal(new Set(fixtures.filter(f=>f.variant.startsWith('current')).map(f=>f.scene)).size,14);
  return {fixtures,outcomes:[...new Set(graph.endings.map(r=>'e2/q009/'+r.outcome))]};
}
