import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {resolveBattle} from './audit-regional-relocation.mjs';
import {data,ready,start,choose,go,drain,checkpoint,read} from '../tests/machine-helpers.mjs';
export const previousQ079=await read('tests/fixtures/e2-q079-before-audit.json');
export const previousQ079Data={...data,quests:{...data.quests,q079:previousQ079},scripts:{...data.scripts,...previousQ079.scripts}};
const accepted=data.previousQuestRoutes.q079;
const acceptedData={...previousQ079Data,quests:{...previousQ079Data.quests,q079:accepted},scripts:{...previousQ079Data.scripts,...accepted.scripts}};
export const q079Routes=[{"path":["test","shutdown","clear","finish"],"accepted":["test","shutdown","clear"],"outcome":"informed"},{"path":["test","shutdown","replace","finish"],"accepted":["test","shutdown","replace"],"outcome":"compromise"},{"path":["test","small","finish"],"accepted":["test","small"],"outcome":"compromise"},{"path":["storage","shutdown","clear","finish"],"accepted":["storage","shutdown","clear"],"outcome":"informed"},{"path":["storage","shutdown","replace","finish"],"accepted":["storage","shutdown","replace"],"outcome":"compromise"},{"path":["storage","small","finish"],"accepted":["storage","small"],"outcome":"compromise"},{"path":["bypass"],"accepted":["bypass"],"outcome":"contract"}];
export const q079Cast=()=>[];
export const q079LegacyScene=g=>g.state.flags.flow?.q079?.node??g.state.flags.quest?.q079?.node;
export function loadQ079(raw){
 const g=new GameEngine(data);g.random=()=>.999999;g.load(raw);
 const expected=JSON.parse(raw);if(!expected.state.stories.q079)(expected.state.flags.legacyStoryRoutes??={}).q079=true;
 assert.deepEqual(JSON.parse(g.save()),expected);checkpoint(g);return g;
}
const starts=new Map();
export function q079Engine({legacy=false}={}){
 const content=legacy?previousQ079Data:data;
 if(!starts.has(legacy)){const base=ready(),g=legacy?new GameEngine(content):base;if(legacy)g.load(base.save());g.random=()=>.999999;start(g,'q079');starts.set(legacy,g.save());}
 const g=new GameEngine(content);g.random=()=>.999999;g.load(starts.get(legacy));return g;
}
export function q079AcceptedEngine(){
 const g=new GameEngine(acceptedData);g.load(ready().save());g.random=()=>.999999;
 go(g,{kind:'town',location:'salome_board'});assert.ok(g.accept('q079'));
 const p=accepted.locations.find(p=>p.role==='decision')??accepted.locations[0];
 go(g,{kind:'dungeon',dungeon:'region_8',map:p.map,x:p.x,y:p.y});g.run(accepted.model.entryScript);drain(g);return g;
}
export const chooseQ079=(g,id,options)=>choose(g,'q079',id,options);
export function departQ079(g,id){assert.ok(g.dispatch({type:'choose',id}),g.state.notice);drain(g);assert.ok(g.state.journey);loadQ079(g.save());}
export function arriveQ079(g){const a=g.data.quests.q079.story.actions[g.state.journey.action];go(g,g.data.quests.q079.story.worldPlaces[a.journey.to]);drain(g);assert.equal(g.state.journey,null);checkpoint(g);}
export function resolveQ079(g,result){g.random=()=>.5;resolveBattle(g,result);g.random=()=>.999999;}
export function returnQ079AfterLoss(g){go(g,g.data.quests.q079.story.worldPlaces.entry);assert.ok(g.dispatch({type:'story.resume',quest:'q079'}));drain(g);checkpoint(g);}
export async function restartLedgerArtFixtures(){
 const fixtures=[],outcomes=new Set(),available={entry:'test',full:'shutdown',archive:'clear',restarted:'finish',small:'finish'};
 for(const legacy of [false,true]){
  const generation=legacy?'previous':'current',seen=new Set();
  const observe=(g,suffix)=>{
   if(g.state.quests.q079.stage==='completed')return;
   const s=g.state.stories.q079,scene=s.scene,v=s.values,variant=generation+'-'+(suffix??[v.hundredthObserved?'observed':'unobserved',v.recordBoardAt,v.backupVerified?'verified':'unverified'].join('-'));
   if(seen.has(scene+'/'+variant))return;seen.add(scene+'/'+variant);
   const save=g.save(),cast=q079Cast(scene);assert.deepEqual(projectGame(loadQ079(save)).dialog.scene.cast.map(c=>c.id),cast);
   fixtures.push({edition:'e2',quest:'q079',scene,variant,cast,textOnlyCast:cast,save,expectedText:projectGame(g).dialog.text,availableChoice:available[scene]});
  };
  for(const route of q079Routes){const g=q079Engine({legacy});observe(g);for(const id of route.path){chooseQ079(g,id);observe(g);}assert.equal(g.state.quests.q079.outcome,route.outcome);outcomes.add('e2/q079/'+route.outcome);}
  const g=q079Engine({legacy});chooseQ079(g,'bypass',{combat:'pending'});resolveQ079(g,'lose');returnQ079AfterLoss(g);observe(g,'lose');
 }
 const seen=new Set();
 for(const route of q079Routes){
  const g=loadQ079(q079AcceptedEngine().save()),observe=()=>{
   if(g.state.quests.q079.stage==='completed')return;const scene=q079LegacyScene(g);assert.ok(scene);if(seen.has(scene))return;seen.add(scene);
   assert.equal(projectGame(loadQ079(g.save())).dialog.scene,undefined);
   fixtures.push({edition:'e2',quest:'q079',scene,variant:'accepted',cast:[],absentStoryScene:true,save:g.save(),expectedText:projectGame(g).dialog.text,availableChoice:scene==='entry'?'test':scene==='full'?'shutdown':'clear'});
  };
  observe();for(const id of route.accepted){assert.ok(g.dispatch({type:'choose',id}));drain(g);if(g.state.battle)resolveQ079(g,'win');observe();}assert.equal(g.state.quests.q079.outcome,route.outcome);
 }
 return {fixtures,outcomes:[...outcomes]};
}
