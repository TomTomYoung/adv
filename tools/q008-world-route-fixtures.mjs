import assert from 'node:assert/strict';
import {projectGame} from '../src/application/projection.js';
import {floatingCoffinSource} from '../authoring/editions/e2/story-q008.mjs';
import {routes,oldRoutes,ready,choose,depart,arrive,migrated,resume,checkpoint,fight} from '../tests/q008-helpers.mjs';

export function floatingCoffinFixtures(){
  const fixtures=[],outcomes=new Set(),seen=new Set();
  const groups=[
    [['entry','consented','shore_loaded','cargo','separated','returned'],['yoru','family','bearers']],
    [['inspect_threshold','inspect_lifted','tow_threshold','tow_lifted','tow_river'],['bearers']],
    [['tow_jetty','tow_unloaded'],['bearers','recipient']],
    [['funeral_pending','funeral_done','mortuary_arrival','stored'],['family','bearers']],
    [['application_ready','declared'],['yoru','inspector']],
    [['applicant_jetty','quiet_jetty'],['recipient']],
    [['application','permitted'],['yoru','recipient','inspector']],
    [['permitted_jetty','postponed','quiet_arrival'],['yoru','recipient']],
    [['handover','handed'],['yoru','recipient','family','bearers']]
  ];
  const corners={yoru:[0,0,244,250],family:[0,0,250,249],bearers:[0,0,251,251],recipient:[0,0,0,0],inspector:[0,0,0,0]};
  const images={scene:Object.fromEntries(Object.keys(corners).map(id=>[id,{src:`assets/images/characters/sprites/${id}.webp`,size:[1173,1341],cornerAlphas:corners[id]}])),classic:Object.fromEntries(Object.keys(corners).map(id=>[id,{src:`assets/images/characters/generated/${id}.webp`,size:[896,1024],cornerAlphas:[255,255,255,255]}]))};
  const capture=(g,variant)=>{
    if(g.state.quests.q008.stage==='completed')return;
    const scene=g.state.stories.q008.scene,key=variant+'/'+scene;if(seen.has(key))return;seen.add(key);checkpoint(g);
    const cast=variant.startsWith('preserved')&&scene==='application'?['yoru','inspector']:groups.find(([scenes])=>scenes.includes(scene))?.[1];assert.ok(cast,scene);
    const dialog=projectGame(g).dialog;assert.deepEqual(dialog.scene.cast.map(c=>c.id),cast);
    const choice=dialog.options.find(o=>o.enabled);assert.ok(choice);
    fixtures.push({edition:'e2',quest:'q008',scene,variant,cast,save:g.save(),expectedText:dialog.text,availableChoice:choice.id,blockedChoices:dialog.options.filter(o=>!o.enabled).map(o=>o.id),imageExpectationsByLayout:images});
  };
  for(const r of routes){const g=ready();capture(g,'current');for(const id of r.path){choose(g,id);capture(g,'current');}assert.equal(g.state.quests.q008.outcome,r.outcome);outcomes.add('e2/q008/'+r.outcome);}
  for(const old of [1,2])for(const r of oldRoutes){const g=migrated(ready({old}));capture(g,'preserved-r'+old);for(const id of r.path){choose(g,id);capture(g,'preserved-r'+old);}}
  const source=floatingCoffinSource();
  for(const r of routes){const g=ready();let scene='entry';for(const id of r.path){const option=source.nodes.find(n=>n.id===scene).options.find(o=>o.id===id);depart(g,id);if(g.state.battle)fight(g);if(g.state.journey){g.defeat();checkpoint(g);arrive(g);capture(g,'rescued');}else if(!option.to.startsWith('@')){g.defeat();resume(g);capture(g,'work-saved');}scene=option.to;}}
  assert.equal(fixtures.filter(f=>f.variant==='current').length,28);
  return {fixtures,outcomes:[...outcomes]};
}
