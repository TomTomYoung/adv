import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {data,ready,start,go,drain,checkpoint} from '../tests/royal-helpers.mjs';
import {read} from '../tests/oddland-helpers.mjs';
export const previousQ082=await read('tests/fixtures/e2-q082-before-cast.json');
export const previousQ082Data={...data,quests:{...data.quests,q082:previousQ082},scripts:{...data.scripts,...previousQ082.scripts},characters:Object.fromEntries(Object.entries(data.characters).filter(([id])=>!id.startsWith('q082_')))};
const accepted=data.previousQuestRoutes.q082;
const acceptedData={...previousQ082Data,quests:{...previousQ082Data.quests,q082:accepted},scripts:{...previousQ082Data.scripts,...accepted.scripts}};
export const q082Routes=[
 {path:['hand','normal','instructions','finish'],accepted:['hand','normal','instructions'],outcome:'informed',spent:false,normal:true},
 {path:['hand','normal','return','finish'],accepted:['hand','normal','return'],outcome:'compromise',spent:false,normal:true},
 {path:['hand','high','sell','finish'],accepted:['hand','high','sell'],outcome:'contract',spent:true,normal:false},
 {path:['hand','high','refund','finish'],accepted:['hand','high','refund'],outcome:'compromise',spent:true,normal:false},
 {path:['hand','refund','finish'],accepted:['hand','refund'],outcome:'compromise',spent:false,normal:false},
 {path:['heat','carry','finish'],accepted:['heat'],outcome:'contract',spent:true,normal:false},
 {path:['refund','finish'],accepted:['refund'],outcome:'compromise',spent:false,normal:false}
];
export const q082Cast=scene=>scene==='label'?['q082_el']:['sold','sold_spent'].includes(scene)?['q082_customer']:[];
export const q082LegacyScene=g=>g.state.flags.flow?.q082?.node??g.state.flags.quest?.q082?.node;
export function loadQ082(raw){
 const g=new GameEngine(data);g.random=()=>.999999;g.load(raw);
 const expected=JSON.parse(raw),s=expected.state.stories.q082;
 if(!s)(expected.state.flags.legacyStoryRoutes??={}).q082=true;
 else if(s.revision===1){s.revision=2;s.values.elPersonAt='entry';}
 assert.deepEqual(JSON.parse(g.save()),expected);checkpoint(g);return g;
}
const starts=new Map();
export function q082Engine({legacy=false}={}){
 const content=legacy?previousQ082Data:data;
 if(!starts.has(legacy)){const base=ready(),g=legacy?new GameEngine(content):base;if(legacy)g.load(base.save());g.random=()=>.999999;start(g,'q082');starts.set(legacy,g.save());}
 const g=new GameEngine(content);g.random=()=>.999999;g.load(starts.get(legacy));return g;
}
export function q082AcceptedEngine(){
 const g=new GameEngine(acceptedData);g.load(ready().save());g.random=()=>.999999;
 go(g,{kind:'town',location:'royal_board'});assert.ok(g.accept('q082'));
 const p=accepted.locations.find(p=>p.role==='decision')??accepted.locations[0];
 go(g,{kind:'dungeon',dungeon:'region_9',map:p.map,x:p.x,y:p.y});g.run(accepted.model.entryScript);drain(g);return g;
}
export function arriveQ082(g){const a=g.data.quests.q082.story.actions[g.state.journey.action];go(g,g.data.quests.q082.story.worldPlaces[a.journey.to]);drain(g);assert.equal(g.state.journey,null);checkpoint(g);}
export function chooseQ082(g,id){assert.ok(g.dispatch({type:'choose',id}),g.state.notice);drain(g);assert.equal(g.state.battle,null);if(g.state.journey)arriveQ082(g);checkpoint(g);}
export function departQ082(g,id){assert.ok(g.dispatch({type:'choose',id}),g.state.notice);drain(g);assert.ok(g.state.journey);loadQ082(g.save());}
export async function starBottleArtFixtures(){
 const fixtures=[],outcomes=new Set(),available={entry:'hand',temperature:'normal',label:'instructions',spent:'sell',heated:'carry',sold:'finish',sold_spent:'finish',returned:'finish'};
 for(const legacy of [false,true]){
  const generation=legacy?'previous':'current',seen=new Set();
  const observe=(g,suffix)=>{
   if(g.state.quests.q082.stage==='completed')return;
   const s=g.state.stories.q082,scene=s.scene,v=s.values,variant=generation+'-'+(suffix??[v.bottleAt,v.normal?'normal':'untested',v.spent?'spent':'charged'].join('-'));
   if(seen.has(scene+'/'+variant))return;seen.add(scene+'/'+variant);
   const save=g.save(),cast=q082Cast(scene);assert.deepEqual(projectGame(loadQ082(save)).dialog.scene.cast.map(c=>c.id),cast);
   fixtures.push({edition:'e2',quest:'q082',scene,variant,cast,textOnlyCast:cast,save,expectedText:projectGame(g).dialog.text,availableChoice:available[scene]});
  };
  for(const route of q082Routes){const g=q082Engine({legacy});observe(g);for(const id of route.path){chooseQ082(g,id);observe(g);}assert.equal(g.state.quests.q082.outcome,route.outcome);outcomes.add('e2/q082/'+route.outcome);}
  const g=q082Engine({legacy});chooseQ082(g,'hand');chooseQ082(g,'normal');departQ082(g,'instructions');g.defeat();drain(g);arriveQ082(g);observe(g,'rescued');
 }
 const seen=new Set();
 for(const route of q082Routes){
  const g=loadQ082(q082AcceptedEngine().save()),observe=()=>{
   if(g.state.quests.q082.stage==='completed')return;const scene=q082LegacyScene(g);assert.ok(scene);if(seen.has(scene))return;seen.add(scene);
   assert.equal(projectGame(loadQ082(g.save())).dialog.scene,undefined);
   fixtures.push({edition:'e2',quest:'q082',scene,variant:'accepted',cast:[],absentStoryScene:true,save:g.save(),expectedText:projectGame(g).dialog.text,availableChoice:available[scene]});
  };
  observe();for(const id of route.accepted){assert.ok(g.dispatch({type:'choose',id}));drain(g);assert.equal(g.state.battle,null);observe();}assert.equal(g.state.quests.q082.outcome,route.outcome);
 }
 return {fixtures,outcomes:[...outcomes]};
}
