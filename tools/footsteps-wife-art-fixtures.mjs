import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {resolveBattle} from './audit-regional-relocation.mjs';
import {data,ready,start,go,drain,checkpoint,read} from '../tests/machine-helpers.mjs';

export const previousQ171=await read('tests/fixtures/e2-q171-before-wife.json');
export const previousQ171Data={...data,quests:{...data.quests,q171:previousQ171},scripts:{...data.scripts,...previousQ171.scripts}};
const accepted=data.previousQuestRoutes.q171;
const acceptedData={...previousQ171Data,quests:{...previousQ171Data.quests,q171:accepted},scripts:{...previousQ171Data.scripts,...accepted.scripts}};
export const q171Investigation=['visit','begin'];
export const q171Threat=[...q171Investigation,'wait','return','wait','return','wait','return'];
export const q171Routes=[
 {path:[...q171Investigation,'rule','return','ward','continue','return','loop','home','finish'],outcome:'loop'},
 {path:[...q171Investigation,'ward','continue','return','rule','return','loop','home','finish'],outcome:'loop'},
 {path:[...q171Investigation,'return','home','finish'],outcome:'return'},
 {path:[...q171Investigation,'rule','return','return','home','finish'],outcome:'return'},
 {path:[...q171Investigation,'ward','continue','return','return','home','finish'],outcome:'return'},
 {path:[...q171Threat,'fight','fight','finish'],outcome:'fight'},
 {path:[...q171Threat,'fight','evacuate','finish'],outcome:'evacuate'},
 {path:[...q171Investigation,'leave','escort','finish'],outcome:'evacuate'},
 {path:[...q171Threat,'leave','escort','finish'],outcome:'evacuate'}
];
export const q171AcceptedRoutes=[
 {path:['begin','rule','ward','loop'],outcome:'loop'},
 {path:['begin','return'],outcome:'return'},
 {path:['begin','wait','wait','wait','fight'],outcome:'fight'},
 {path:['begin','leave'],outcome:'evacuate'}
];
export const q171WifeScenes=['onsite','loop_home','return_home','defended'];
export const q171FamilyScenes=['defense','collect_family','evacuated'];
export const q171Cast=scene=>scene==='entry'?[]:['q171_dai',...(q171WifeScenes.includes(scene)?['q171_wife']:q171FamilyScenes.includes(scene)?['q171_family']:[])];
export function loadQ171(raw){
 const g=new GameEngine(data);g.random=()=>.999999;g.load(raw);
 const expected=JSON.parse(raw),s=expected.state.stories.q171;
 if(!s)(expected.state.flags.legacyStoryRoutes??={}).q171=true;
 else if(s.revision===1){s.revision=2;s.values.wifeAt='family';}
 assert.deepEqual(JSON.parse(g.save()),expected);checkpoint(g);return g;
}
const starts=new Map();
export function q171Engine({legacy=false}={}){
 const content=legacy?previousQ171Data:data;
 if(!starts.has(legacy)){const g=new GameEngine(content);g.load(ready().save());g.random=()=>.999999;start(g,'q171');starts.set(legacy,g.save());}
 const g=new GameEngine(content);g.random=()=>.999999;g.load(starts.get(legacy));return g;
}
export function q171AcceptedEngine(){
 const g=new GameEngine(acceptedData);g.load(ready().save());g.random=()=>.999999;
 go(g,{kind:'town',location:'salome_board'});assert.ok(g.accept('q171'));
 const p=accepted.locations.find(p=>p.role==='decision')??accepted.locations[0];
 go(g,{kind:'dungeon',dungeon:'region_8',map:p.map,x:p.x,y:p.y});g.run(accepted.model.entryScript??'q171.visit');drain(g);return g;
}
export function arriveQ171(g){
 const a=g.data.quests.q171.story.actions[g.state.journey.action];go(g,g.data.quests.q171.story.worldPlaces[a.journey.to]);
 if(g.state.journey)assert.ok(g.dispatch({type:'story.resume',quest:'q171'}));drain(g);assert.equal(g.state.journey,null);checkpoint(g);
}
export function resolveQ171(g,result){g.random=()=>.5;resolveBattle(g,result);g.random=()=>.999999;checkpoint(g);}
export function resumeQ171(g){const s=g.state.stories.q171;go(g,g.data.quests.q171.story.worldPlaces[g.data.quests.q171.story.scenes[s.scene].place]);assert.ok(g.dispatch({type:'story.resume',quest:'q171'}));drain(g);checkpoint(g);}
export function chooseQ171(g,id,{combat='win'}={}){assert.ok(g.dispatch({type:'choose',id}),g.state.notice);drain(g);if(g.state.battle){if(combat==='pending')return;resolveQ171(g,combat);}if(g.state.journey)arriveQ171(g);checkpoint(g);}
export function departQ171(g,id){assert.ok(g.dispatch({type:'choose',id}),g.state.notice);drain(g);assert.ok(g.state.journey);}
export async function footstepsWifeArtFixtures(){
 const fixtures=[],outcomes=new Set();
 for(const legacy of [false,true]){
  const seen=new Set(),observe=(g,suffix)=>{
   if(g.state.quests.q171.stage==='completed')return;
   const s=g.state.stories.q171,scene=s.scene,variant=(legacy?'previous':'current')+'-'+(suffix??'scene');
   if(seen.has(scene+'/'+variant))return;seen.add(scene+'/'+variant);
   const save=g.save(),current=loadQ171(save),cast=q171Cast(scene);
   assert.deepEqual(projectGame(current).dialog.scene.cast.map(c=>c.id),cast);
   const options=projectGame(current).dialog.options,option=options.find(o=>o.enabled);
   assert.ok(option);fixtures.push({edition:'e2',quest:'q171',scene,variant,cast,textOnlyCast:cast,save,expectedText:projectGame(g).dialog.text,availableChoice:option.id,blockedChoices:options.filter(o=>!o.enabled).map(o=>o.id)});
  };
  for(const r of q171Routes){const g=q171Engine({legacy});observe(g);for(const id of r.path){chooseQ171(g,id);observe(g);}assert.equal(g.state.quests.q171.outcome,r.outcome);outcomes.add('e2/q171/'+r.outcome);}
  for(const result of ['escape','lose']){
   const g=q171Engine({legacy});for(const id of [...q171Threat,'fight'])chooseQ171(g,id);chooseQ171(g,'fight',{combat:'pending'});resolveQ171(g,result);if(result==='lose')resumeQ171(g);observe(g,'battle-'+result);
   departQ171(g,'evacuate');g.defeat();drain(g);arriveQ171(g);observe(g,'evacuation-rescued-'+result);
  }
 }
 const seen=new Set();for(const r of q171AcceptedRoutes){const g=loadQ171(q171AcceptedEngine().save()),observe=()=>{
  if(g.state.quests.q171.stage==='completed')return;const scene=g.state.flags.flow?.q171?.node??g.state.flags.quest?.q171?.node;
  if(seen.has(scene))return;seen.add(scene);const dialog=projectGame(g).dialog;assert.equal(dialog.scene,undefined);
  fixtures.push({edition:'e2',quest:'q171',scene,variant:'accepted',cast:[],absentStoryScene:true,save:g.save(),expectedText:dialog.text,availableChoice:dialog.options.find(o=>o.enabled).id,blockedChoices:dialog.options.filter(o=>!o.enabled).map(o=>o.id)});
 };observe();for(const id of r.path){assert.ok(g.dispatch({type:'choose',id}));drain(g);if(g.state.battle)resolveQ171(g,'win');observe();}assert.equal(g.state.quests.q171.outcome,r.outcome);}
 return {fixtures,outcomes:[...outcomes]};
}
