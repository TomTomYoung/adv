import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {data,ready,start,go,drain,checkpoint} from '../tests/royal-helpers.mjs';
import {read} from '../tests/oddland-helpers.mjs';
export const previousQ083=await read('tests/fixtures/e2-q083-before-cast.json');
export const previousQ083Data={...data,quests:{...data.quests,q083:previousQ083},scripts:{...data.scripts,...previousQ083.scripts},characters:Object.fromEntries(Object.entries(data.characters).filter(([id])=>!id.startsWith('q083_')))};
const accepted=data.previousQuestRoutes.q083;
const acceptedData={...previousQ083Data,quests:{...previousQ083Data.quests,q083:accepted},scripts:{...previousQ083Data.scripts,...accepted.scripts}};
export const q083Routes=[
 {path:['cycle','dates','record','finish'],accepted:['cycle','dates'],outcome:'informed',removed:true,stopped:false},
 {path:['cycle','only'],accepted:['cycle','only'],outcome:'repaired',removed:true,stopped:false},
 {path:['cycle','shade','finish'],accepted:['cycle','shade'],outcome:'compromise',removed:false,stopped:false},
 {path:['stop','finish'],accepted:['stop'],outcome:'contract',removed:false,stopped:true},
 {path:['calendar','finish'],accepted:['calendar'],outcome:'compromise',removed:false,stopped:false}
];
export const q083Cast=scene=>scene==='entry'?['q083_calendarMaker']:scene==='scaffold'?['q083_maintainer']:[];
export const q083LegacyScene=g=>g.state.flags.flow?.q083?.node??g.state.flags.quest?.q083?.node;
export function loadQ083(raw){
 const g=new GameEngine(data);g.random=()=>.999999;g.load(raw);
 const expected=JSON.parse(raw),s=expected.state.stories.q083;
 if(!s)(expected.state.flags.legacyStoryRoutes??={}).q083=true;
 else if(s.revision===1){s.revision=2;s.values.calendarMakerAt='entry';s.values.maintainerAt='scaffold';}
 assert.deepEqual(JSON.parse(g.save()),expected);checkpoint(g);return g;
}
const starts=new Map();
export function q083Engine({legacy=false}={}){
 const content=legacy?previousQ083Data:data;
 if(!starts.has(legacy)){const base=ready(),g=legacy?new GameEngine(content):base;if(legacy)g.load(base.save());g.random=()=>.999999;start(g,'q083');starts.set(legacy,g.save());}
 const g=new GameEngine(content);g.random=()=>.999999;g.load(starts.get(legacy));return g;
}
export function q083AcceptedEngine(){
 const g=new GameEngine(acceptedData);g.load(ready().save());g.random=()=>.999999;
 go(g,{kind:'town',location:'royal_board'});assert.ok(g.accept('q083'));
 const p=accepted.locations.find(p=>p.role==='decision')??accepted.locations[0];
 go(g,{kind:'dungeon',dungeon:'region_9',map:p.map,x:p.x,y:p.y});g.run(accepted.model.entryScript);drain(g);return g;
}
export function arriveQ083(g){const a=g.data.quests.q083.story.actions[g.state.journey.action];go(g,g.data.quests.q083.story.worldPlaces[a.journey.to]);drain(g);assert.equal(g.state.journey,null);checkpoint(g);}
export function chooseQ083(g,id){assert.ok(g.dispatch({type:'choose',id}),g.state.notice);drain(g);assert.equal(g.state.battle,null);if(g.state.journey)arriveQ083(g);checkpoint(g);}
export function departQ083(g,id){assert.ok(g.dispatch({type:'choose',id}),g.state.notice);drain(g);assert.ok(g.state.journey);loadQ083(g.save());}
export async function undergroundEclipseArtFixtures(){
 const fixtures=[],outcomes=new Set(),available={entry:'cycle',scaffold:'dates',removed:'record',corrected:'finish',stopped:'finish',shade:'finish'};
 for(const legacy of [false,true]){
  const generation=legacy?'previous':'current',seen=new Set();
  const observe=(g,suffix)=>{
   if(g.state.quests.q083.stage==='completed')return;
   const s=g.state.stories.q083,scene=s.scene,v=s.values,variant=generation+'-'+(suffix??[v.removed?'removed':'standing',s.events.includes('entry_cycle')?'observed':'unobserved'].join('-'));
   if(seen.has(scene+'/'+variant))return;seen.add(scene+'/'+variant);
   const save=g.save(),cast=q083Cast(scene);assert.deepEqual(projectGame(loadQ083(save)).dialog.scene.cast.map(c=>c.id),cast);
   fixtures.push({edition:'e2',quest:'q083',scene,variant,cast,textOnlyCast:cast,save,expectedText:projectGame(g).dialog.text,availableChoice:available[scene]});
  };
  for(const route of q083Routes){const g=q083Engine({legacy});observe(g);for(const id of route.path){chooseQ083(g,id);observe(g);}assert.equal(g.state.quests.q083.outcome,route.outcome);outcomes.add('e2/q083/'+route.outcome);}
  for(const before of [[],['cycle','dates']]){const g=q083Engine({legacy});for(const id of before)chooseQ083(g,id);departQ083(g,before.length?'record':'cycle');g.defeat();drain(g);arriveQ083(g);observe(g,'rescued');}
 }
 const seen=new Set();
 for(const route of q083Routes){const g=loadQ083(q083AcceptedEngine().save()),observe=()=>{
  if(g.state.quests.q083.stage==='completed')return;const scene=q083LegacyScene(g);assert.ok(scene);if(seen.has(scene))return;seen.add(scene);
  assert.equal(projectGame(loadQ083(g.save())).dialog.scene,undefined);
  fixtures.push({edition:'e2',quest:'q083',scene,variant:'accepted',cast:[],absentStoryScene:true,save:g.save(),expectedText:projectGame(g).dialog.text,availableChoice:available[scene]});
 };
 observe();for(const id of route.accepted){assert.ok(g.dispatch({type:'choose',id}));drain(g);assert.equal(g.state.battle,null);observe();}assert.equal(g.state.quests.q083.outcome,route.outcome);}
 return {fixtures,outcomes:[...outcomes]};
}
