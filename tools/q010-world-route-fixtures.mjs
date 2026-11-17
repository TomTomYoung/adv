import assert from 'node:assert/strict';
import {projectGame} from '../src/application/projection.js';
import {sluiceSource} from '../authoring/editions/e2/story-q010.mjs';
import {ready,enumerate,depart,arrive,migrated,resume,checkpoint,drain} from '../tests/q010-helpers.mjs';

export function sluiceFixtures(){
  const fixtures=[],seen=new Set(),graph=enumerate(),oldGraph=enumerate({old:true}),source=sluiceSource();
  const corners={gatekeeper:[0,0,249,0],rine:[0,0,0,0],nearpeople:[0,0,252,252],deeppeople:[0,0,252,250],pumpcrew:[0,0,251,250]};
  const images={scene:Object.fromEntries(Object.keys(corners).map(id=>[id,{src:`assets/images/characters/sprites/${id}.webp`,size:[1173,1341],cornerAlphas:corners[id]}])),classic:Object.fromEntries(Object.keys(corners).map(id=>[id,{src:`assets/images/characters/generated/${id}.webp`,size:[896,id==='nearpeople'?1023:1024],cornerAlphas:[255,255,255,255]}]))};
  const faces={gatekeeper:[.37,.07,.62,.28],rine:[.33,.11,.6,.33],nearpeople:[.12,.08,.91,.4],deeppeople:[.18,.09,.84,.36],pumpcrew:[.1,.09,.9,.31]};
  const capture=(g,variant,{pageOnly=false}={})=>{
    const scene=g.state.stories.q010.scene,key=variant+'/'+scene;if(seen.has(key))return;seen.add(key);checkpoint(g);
    const d=projectGame(g).dialog,cast=d.scene.cast.map(c=>c.id),choice=d.options?.find(o=>o.enabled);assert.ok(pageOnly||choice);
    fixtures.push({edition:'e2',quest:'q010',scene,variant,cast,save:g.save(),expectedText:pageOnly?d.text.split('。')[0]+'。':d.text,imageExpectationsByLayout:images,...(!pageOnly?{availableChoice:choice.id,blockedChoices:d.options.filter(o=>!o.enabled).map(o=>o.id)}:{}),...(!variant.startsWith('preserved')?{faces:Object.fromEntries(cast.map(id=>[id,faces[id]])),clearOfHud:true}:{})});
  };
  const g=ready();
  for(const row of graph.active){
    g.load(row.save);const v=row.values,variant='current'+(['operations','closed','ground','crew_control'].includes(row.scene)?`-${Number(v.nearSaved)}${Number(v.deepSaved)}${Number(v.bookSaved)}${Number(v.closed)}`:'');
    capture(g,variant);
    if(['operations','closed','ground','crew_control'].includes(row.scene)){const story=structuredClone(g.state.stories.q010);g.state.vm=[];g.state.waiting=null;g.run('q010.sluice.'+row.scene);assert.deepEqual(g.state.stories.q010,story);capture(g,variant+'-opening',{pageOnly:true});}
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
  assert.equal(journeys.size,21);assert.equal(work.size,32);
  assert.equal(new Set(fixtures.filter(f=>f.variant.startsWith('current')).map(f=>f.scene)).size,33);
  return {fixtures,outcomes:[...new Set(graph.endings.map(r=>'e2/q010/'+r.outcome))]};
}
