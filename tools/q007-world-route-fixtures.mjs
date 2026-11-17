import assert from 'node:assert/strict';
import {projectGame} from '../src/application/projection.js';
import {routes,oldRoutes,letters,departures,ready,choose,depart,arrive,migrated,resume,checkpoint,town} from '../tests/q007-helpers.mjs';

export function voiceWallFixtures(){
  const fixtures=[],outcomes=new Set(),seen=new Set();
  const images={scene:Object.fromEntries(['mire','brother'].map(id=>[id,{src:`assets/images/characters/sprites/${id}.webp`,size:[1173,1341],cornerAlphas:id==='brother'?[0,0,0,250]:[0,0,0,0]}])),classic:Object.fromEntries(['mire','brother'].map(id=>[id,{src:`assets/images/characters/generated/${id}.webp`,size:[896,1024],cornerAlphas:[255,255,255,255]}]))};
  const capture=(g,variant)=>{
    if(g.state.quests.q007.stage==='completed')return;
    const scene=g.state.stories.q007.scene,key=variant+'/'+scene;if(seen.has(key))return;seen.add(key);checkpoint(g);
    const old=variant==='preserved',remote=['letters','mire_consent','agreed'].includes(scene),cast=scene==='meeting'||remote?['mire','brother']:['booth','carrying','collect'].includes(scene)?['brother']:['mire'];
    const model=projectGame(g),dialog=model.dialog;assert.deepEqual(dialog.scene.cast.map(c=>c.id),cast);const choice=dialog.options.find(o=>o.enabled);assert.ok(choice);
    const remoteCast=remote?['brother']:[];assert.deepEqual(dialog.scene.cast.filter(c=>c.remote).map(c=>c.id),remoteCast);
    const townCast=cast.filter(id=>!remoteCast.includes(id));if(!old)assert.deepEqual(model.town.cast.map(c=>c.id),townCast);
    fixtures.push({edition:'e2',quest:'q007',scene,variant,cast,remoteCast,...(!old?{townCast}:{}),save:g.save(),expectedText:dialog.text,availableChoice:choice.id,imageExpectationsByLayout:images});
  };
  for(const r of routes){const g=ready();capture(g,'current');for(const id of r.path){choose(g,id);capture(g,'current');}assert.equal(g.state.quests.q007.outcome,r.outcome);outcomes.add('e2/q007/'+r.outcome);}
  for(const r of oldRoutes){const g=migrated(ready({old:true}));capture(g,'preserved');for(const id of r.path){choose(g,id);capture(g,'preserved');}}
  for(const [path,id] of departures){const g=ready();choose(g,...path);depart(g,id);town(g,'e2_voice_corridor');g.defeat();checkpoint(g);arrive(g);capture(g,'rescued');}
  for(const path of [['trace','letters'],['trace',...letters],['trace',...letters,'meet'],['trace',...letters,'meet','ask']]){const g=ready();choose(g,...path);g.defeat();resume(g);capture(g,'work-saved');}
  return {fixtures,outcomes:[...outcomes]};
}
