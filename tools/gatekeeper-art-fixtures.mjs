import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {resolveBattle} from './audit-regional-relocation.mjs';
import {data,ready,start,choose,go,drain,checkpoint,read} from '../tests/machine-helpers.mjs';

export const previousQ071=await read('tests/fixtures/e2-q071-before-cast.json');
export const previousQ071Data={...data,quests:{...data.quests,q071:previousQ071},scripts:{...data.scripts,...previousQ071.scripts},characters:Object.fromEntries(Object.entries(data.characters).filter(([id])=>id!=='q071_worker'))};
const accepted=data.previousQuestRoutes.q071;
export const acceptedQ071Data={...previousQ071Data,quests:{...previousQ071Data.quests,q071:accepted},scripts:{...previousQ071Data.scripts,...accepted.scripts}};
export const q071Routes=[
 {path:['retired','carry','call','escort','finish'],accepted:['retired','call'],outcome:'informed'},
 {path:['power','repair','finish'],accepted:['power'],outcome:'compromise'},
 {path:['retired','carry','temporary','repair','finish'],accepted:['retired','temporary'],outcome:'compromise'},
 {path:['dismantle'],accepted:['dismantle'],outcome:'contract'}
];
export const q071Cast=scene=>['call','returned'].includes(scene)?['q071_worker']:[];
export const q071LegacyScene=g=>g.state.flags.flow?.q071?.node??g.state.flags.quest?.q071?.node;
export function loadQ071(raw){
 const g=new GameEngine(data);g.random=()=>.999999;g.load(raw);
 const expected=JSON.parse(raw);if(!expected.state.stories.q071)(expected.state.flags.legacyStoryRoutes??={}).q071=true;
 assert.deepEqual(JSON.parse(g.save()),expected);checkpoint(g);return g;
}
const starts=new Map();
export function q071Engine({legacy=false}={}){
 const content=legacy?previousQ071Data:data;
 if(!starts.has(legacy)){
  const base=ready(),g=legacy?new GameEngine(content):base;
  if(legacy)g.load(base.save());g.random=()=>.999999;start(g,'q071');starts.set(legacy,g.save());
 }
 const g=new GameEngine(content);g.random=()=>.999999;g.load(starts.get(legacy));return g;
}
export function q071AcceptedEngine(){
 const g=new GameEngine(acceptedQ071Data);g.load(ready().save());g.random=()=>.999999;
 go(g,{kind:'town',location:'salome_board'});assert.ok(g.accept('q071'));
 const p=accepted.locations.find(p=>p.role==='decision')??accepted.locations[0];
 go(g,{kind:'dungeon',dungeon:'region_8',map:p.map,x:p.x,y:p.y});
 g.run(accepted.model.entryScript??'q071.visit');drain(g);return g;
}
export const chooseQ071=(g,id,options)=>choose(g,'q071',id,options);
export function resolveQ071(g,result){
 // This helper is for outcome/restart coverage, not normal balance trials.
 g.random=()=>result==='escape'?0:.5;resolveBattle(g,result);g.random=()=>.999999;
}
export function returnQ071AfterLoss(g){
 go(g,g.data.quests.q071.story.worldPlaces.entry);assert.ok(g.dispatch({type:'story.resume',quest:'q071'}));drain(g);checkpoint(g);
}
export async function gatekeeperArtFixtures(){
 const fixtures=[],outcomes=new Set();
 const available={entry:'retired',worker:'call',record:'carry',call:'escort',returned:'finish',cut:'repair',repaired:'finish'};
 for(const legacy of [false,true]){
  const generation=legacy?'previous':'current',seen=new Set();
  const observe=(g,suffix)=>{
   if(g.state.quests.q071.stage==='completed')return;
   const s=g.state.stories.q071,scene=s.scene,variant=generation+'-'+(suffix??(s.values.retiredChecked?'checked':'unread'));
   if(seen.has(scene+'/'+variant))return;seen.add(scene+'/'+variant);
   const save=g.save(),now=loadQ071(save),cast=q071Cast(scene);
   assert.deepEqual(projectGame(now).dialog.scene.cast.map(c=>c.id),cast);
   fixtures.push({edition:'e2',quest:'q071',scene,variant,cast,textOnlyCast:cast,save,expectedText:projectGame(g).dialog.text,availableChoice:available[scene]});
  };
  for(const route of q071Routes){const g=q071Engine({legacy});observe(g);for(const id of route.path){chooseQ071(g,id);observe(g);}assert.equal(g.state.quests.q071.outcome,route.outcome);outcomes.add('e2/q071/'+route.outcome);}
  for(const result of ['lose']){
   const g=q071Engine({legacy});chooseQ071(g,'dismantle',{combat:'pending'});resolveQ071(g,result);
   if(result==='lose')returnQ071AfterLoss(g);observe(g,result);
  }
 }
 const seen=new Set();
 for(const route of q071Routes){
  const g=loadQ071(q071AcceptedEngine().save()),observe=()=>{
   if(g.state.quests.q071.stage==='completed')return;const scene=q071LegacyScene(g);assert.ok(scene);
   if(seen.has(scene))return;seen.add(scene);
   assert.equal(projectGame(loadQ071(g.save())).dialog.scene,undefined);
   fixtures.push({edition:'e2',quest:'q071',scene,variant:'accepted',cast:[],absentStoryScene:true,save:g.save(),expectedText:projectGame(g).dialog.text,availableChoice:scene==='entry'?'retired':'call'});
  };
  observe();for(const id of route.accepted){assert.ok(g.dispatch({type:'choose',id}));drain(g);if(g.state.battle)resolveQ071(g,'win');observe();}
  assert.equal(g.state.quests.q071.outcome,route.outcome);
 }
 return {fixtures,outcomes:[...outcomes]};
}
