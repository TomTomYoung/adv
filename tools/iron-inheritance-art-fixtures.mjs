import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {resolveBattle} from './audit-regional-relocation.mjs';
import {data,ready,start,choose,go,drain,checkpoint,read} from '../tests/machine-helpers.mjs';
export const q080Roles=['maintenance','users','guardians'];
export const previousQ080=await read('tests/fixtures/e2-q080-before-cast.json');
export const previousQ080Data={...data,quests:{...data.quests,q080:previousQ080},scripts:{...data.scripts,...previousQ080.scripts},characters:Object.fromEntries(Object.entries(data.characters).filter(([id])=>!q080Roles.some(k=>id==='q080_'+k)))};
const accepted=data.previousQuestRoutes.q080;
const acceptedData={...previousQ080Data,quests:{...previousQ080Data.quests,q080:accepted},scripts:{...previousQ080Data.scripts,...accepted.scripts}};
// Independent combinatorial enumeration: 16 ordered partial approvals can
// defer, six full permutations can restore, plus two immediate choices.
export const q080Routes=[{path:['minimum'],accepted:['minimum'],outcome:'compromise',signatures:[]},{path:['rule'],accepted:['rule'],outcome:'contract',signatures:[]}];
function enumerate(order){
 const current=['council',...order.flatMap(k=>[k,'return'])],old=['council',...order];
 q080Routes.push({path:[...current,'defer'],accepted:[...old,'defer'],outcome:'compromise',signatures:order});
 if(order.length===3)q080Routes.push({path:[...current,'restore','return','finish'],accepted:[...old,'restore'],outcome:'informed',signatures:order});
 else for(const k of q080Roles.filter(k=>!order.includes(k)))enumerate([...order,k]);
}enumerate([]);
export const q080Cast=scene=>{const key=q080Roles.find(k=>scene===k+'_signed');return key?['q080_'+key]:[];};
export const q080LegacyScene=g=>g.state.flags.flow?.q080?.node??g.state.flags.quest?.q080?.node;
export function loadQ080(raw){
 const g=new GameEngine(data);g.random=()=>.999999;g.load(raw);
 const expected=JSON.parse(raw),s=expected.state.stories.q080;
 if(!s)(expected.state.flags.legacyStoryRoutes??={}).q080=true;
 else if(s.revision===1){s.revision=2;for(const k of q080Roles)s.values[k+'PersonAt']=k+'_place';}
 assert.deepEqual(JSON.parse(g.save()),expected);checkpoint(g);return g;
}
let unlocked;
export function q080Ready(){
 if(!unlocked){const g=ready();assert.equal(g.state.vars.region_8??0,0);
  for(const [id,key] of [['q076','off'],['q077','scrape'],['q078','manual']]){start(g,id);choose(g,id,key);assert.equal(g.state.quests[id].stage,'completed');}
  assert.equal(g.state.vars.region_8,3);checkpoint(g);unlocked=g.save();
 }
 const g=new GameEngine(data);g.random=()=>.999999;g.load(unlocked);return g;
}
const starts=new Map();
export function q080Engine({legacy=false}={}){
 const content=legacy?previousQ080Data:data;
 if(!starts.has(legacy)){const g=new GameEngine(content);g.load(q080Ready().save());g.random=()=>.999999;start(g,'q080');starts.set(legacy,g.save());}
 const g=new GameEngine(content);g.random=()=>.999999;g.load(starts.get(legacy));return g;
}
let acceptedStart;
export function q080AcceptedEngine(){
 if(!acceptedStart){const g=new GameEngine(acceptedData);g.load(q080Ready().save());g.random=()=>.999999;
  go(g,{kind:'town',location:'salome_board'});assert.ok(g.accept('q080'));
  const p=accepted.locations.find(p=>p.role==='decision')??accepted.locations[0];
  go(g,{kind:'dungeon',dungeon:'region_8',map:p.map,x:p.x,y:p.y});g.run(accepted.model.entryScript);drain(g);acceptedStart=g.save();
 }
 const g=new GameEngine(acceptedData);g.random=()=>.999999;g.load(acceptedStart);return g;
}
export const chooseQ080=(g,id,options)=>choose(g,'q080',id,options);
export function departQ080(g,id){assert.ok(g.dispatch({type:'choose',id}),g.state.notice);drain(g);assert.ok(g.state.journey);loadQ080(g.save());}
export function arriveQ080(g){const a=g.data.quests.q080.story.actions[g.state.journey.action];go(g,g.data.quests.q080.story.worldPlaces[a.journey.to]);drain(g);assert.equal(g.state.journey,null);checkpoint(g);}
export function resolveQ080(g,result){g.random=()=>.5;resolveBattle(g,result);g.random=()=>.999999;}
export function returnQ080AfterLoss(g){go(g,g.data.quests.q080.story.worldPlaces.entry);assert.ok(g.dispatch({type:'story.resume',quest:'q080'}));drain(g);checkpoint(g);}
const mask=v=>q080Roles.map(k=>v[k]?'1':'0').join('');
export async function ironInheritanceArtFixtures(){
 const fixtures=[],outcomes=new Set();
 for(const legacy of [false,true]){
  const generation=legacy?'previous':'current',seen=new Set();
  const observe=(g,suffix)=>{
   if(g.state.quests.q080.stage==='completed')return;
   const s=g.state.stories.q080,scene=s.scene,v=s.values,variant=generation+'-'+(suffix??[mask(v),v.singleKeyAt,v.singleKeyDestroyed?'broken':'intact'].join('-'));
   if(seen.has(scene+'/'+variant))return;seen.add(scene+'/'+variant);
   const save=g.save(),cast=q080Cast(scene);assert.deepEqual(projectGame(loadQ080(save)).dialog.scene.cast.map(c=>c.id),cast);
   const blockedChoices=scene==='council'?[...q080Roles.filter(k=>v[k]),...(!q080Roles.every(k=>v[k])?['restore']:[])]:[];
   const availableChoice=scene==='entry'?'council':scene==='council'?'defer':scene==='restored'?'finish':'return';
   fixtures.push({edition:'e2',quest:'q080',scene,variant,cast,textOnlyCast:cast,save,expectedText:projectGame(g).dialog.text,availableChoice,...(blockedChoices.length?{blockedChoices}:{})});
  };
  for(const route of q080Routes){const g=q080Engine({legacy});observe(g);for(const id of route.path){chooseQ080(g,id);observe(g);}assert.equal(g.state.quests.q080.outcome,route.outcome);outcomes.add('e2/q080/'+route.outcome);}
  const lost=q080Engine({legacy});chooseQ080(lost,'rule',{combat:'pending'});resolveQ080(lost,'lose');returnQ080AfterLoss(lost);observe(lost,'lose');
  const rescued=q080Engine({legacy});chooseQ080(rescued,'council');departQ080(rescued,'guardians');rescued.defeat();drain(rescued);arriveQ080(rescued);observe(rescued,'rescued');
 }
 const seen=new Set();
 for(const route of q080Routes){
  const g=loadQ080(q080AcceptedEngine().save()),observe=()=>{
   if(g.state.quests.q080.stage==='completed')return;
   const scene=q080LegacyScene(g),flags=g.state.flags.flow?.q080??g.state.flags.quest?.q080,variant='accepted-'+mask(flags);
   assert.ok(scene);if(seen.has(scene+'/'+variant))return;seen.add(scene+'/'+variant);
   assert.equal(projectGame(loadQ080(g.save())).dialog.scene,undefined);
   fixtures.push({edition:'e2',quest:'q080',scene,variant,cast:[],absentStoryScene:true,save:g.save(),expectedText:projectGame(g).dialog.text,availableChoice:scene==='entry'?'council':'defer'});
  };
  observe();for(const id of route.accepted){assert.ok(g.dispatch({type:'choose',id}));drain(g);if(g.state.battle)resolveQ080(g,'win');observe();}assert.equal(g.state.quests.q080.outcome,route.outcome);
 }
 return {fixtures,outcomes:[...outcomes]};
}
