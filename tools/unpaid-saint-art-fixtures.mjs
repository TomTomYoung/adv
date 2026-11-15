import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {resolveBattle} from './audit-regional-relocation.mjs';
import {data,ready,start,choose,go,drain,checkpoint,read} from '../tests/machine-helpers.mjs';
export const previousQ075=await read('tests/fixtures/e2-q075-before-cast.json');
export const previousQ075Data={...data,quests:{...data.quests,q075:previousQ075},scripts:{...data.scripts,...previousQ075.scripts},characters:Object.fromEntries(Object.entries(data.characters).filter(([id])=>id!=='q075_workers'))};
const accepted=data.previousQuestRoutes.q075;
const acceptedData={...previousQ075Data,quests:{...previousQ075Data.quests,q075:accepted},scripts:{...previousQ075Data.scripts,...accepted.scripts}};
export const q075Routes=[
 {path:['gear','deliver','translate','deliver','finish'],accepted:['gear','deliver','translate'],outcome:'informed'},
 {path:['gear','deliver','once'],accepted:['gear','deliver','once'],outcome:'once'},
 {path:['share','escort','finish'],accepted:['share'],outcome:'compromise'},
 {path:['gear','reduce','escort','finish'],accepted:['gear','reduce'],outcome:'compromise'},
 {path:['rewrite'],accepted:['rewrite'],outcome:'contract'}
];
export const q075Cast=scene=>['share','shared'].includes(scene)?['q075_workers']:[];
export const q075LegacyScene=g=>g.state.flags.flow?.q075?.node??g.state.flags.quest?.q075?.node;
export function loadQ075(raw){
 const g=new GameEngine(data);g.random=()=>.999999;g.load(raw);
 const expected=JSON.parse(raw);if(!expected.state.stories.q075)(expected.state.flags.legacyStoryRoutes??={}).q075=true;
 assert.deepEqual(JSON.parse(g.save()),expected);checkpoint(g);return g;
}
const starts=new Map();
export function q075Engine({legacy=false}={}){
 const content=legacy?previousQ075Data:data;
 if(!starts.has(legacy)){const base=ready(),g=legacy?new GameEngine(content):base;if(legacy)g.load(base.save());g.random=()=>.999999;start(g,'q075');starts.set(legacy,g.save());}
 const g=new GameEngine(content);g.random=()=>.999999;g.load(starts.get(legacy));return g;
}
export function q075AcceptedEngine(){
 const g=new GameEngine(acceptedData);g.load(ready().save());g.random=()=>.999999;
 go(g,{kind:'town',location:'salome_board'});assert.ok(g.accept('q075'));
 const p=accepted.locations.find(p=>p.role==='decision')??accepted.locations[0];
 go(g,{kind:'dungeon',dungeon:'region_8',map:p.map,x:p.x,y:p.y});g.run(accepted.model.entryScript);drain(g);return g;
}
export const chooseQ075=(g,id,options)=>choose(g,'q075',id,options);
export function departQ075(g,id){assert.ok(g.dispatch({type:'choose',id}),g.state.notice);drain(g);assert.ok(g.state.journey);loadQ075(g.save());}
export function arriveQ075(g){const a=g.data.quests.q075.story.actions[g.state.journey.action];go(g,g.data.quests.q075.story.worldPlaces[a.journey.to]);drain(g);assert.equal(g.state.journey,null);checkpoint(g);}
export function resolveQ075(g,result){g.random=()=>.5;resolveBattle(g,result);g.random=()=>.999999;}
export function returnQ075AfterLoss(g){go(g,g.data.quests.q075.story.worldPlaces.entry);assert.ok(g.dispatch({type:'story.resume',quest:'q075'}));drain(g);checkpoint(g);}
export async function unpaidSaintArtFixtures(){
 const fixtures=[],outcomes=new Set(),available={entry:'gear',parts:'deliver',running:'translate',share:'escort',shared:'finish',translated:'deliver',registered:'finish'};
 for(const legacy of [false,true]){
  const generation=legacy?'previous':'current',seen=new Set();
  const observe=(g,suffix)=>{
   if(g.state.quests.q075.stage==='completed')return;
   const s=g.state.stories.q075,scene=s.scene,v=s.values,variant=generation+'-'+(suffix??[v.requestSheetAt,v.supplied?'supplied':'unsupplied'].join('-'));
   if(seen.has(scene+'/'+variant))return;seen.add(scene+'/'+variant);
   const save=g.save(),cast=q075Cast(scene);assert.deepEqual(projectGame(loadQ075(save)).dialog.scene.cast.map(c=>c.id),cast);
   fixtures.push({edition:'e2',quest:'q075',scene,variant,cast,textOnlyCast:cast,save,expectedText:projectGame(g).dialog.text,availableChoice:available[scene]});
  };
  for(const route of q075Routes){const g=q075Engine({legacy});observe(g);for(const id of route.path){chooseQ075(g,id);observe(g);}assert.equal(g.state.quests.q075.outcome,route.outcome);outcomes.add('e2/q075/'+route.outcome);}
  const g=q075Engine({legacy});chooseQ075(g,'rewrite',{combat:'pending'});resolveQ075(g,'lose');returnQ075AfterLoss(g);observe(g,'lose');
 }
 const seen=new Set();
 for(const route of q075Routes){
  const g=loadQ075(q075AcceptedEngine().save()),observe=()=>{
   if(g.state.quests.q075.stage==='completed')return;const scene=q075LegacyScene(g);assert.ok(scene);if(seen.has(scene))return;seen.add(scene);
   assert.equal(projectGame(loadQ075(g.save())).dialog.scene,undefined);
   fixtures.push({edition:'e2',quest:'q075',scene,variant:'accepted',cast:[],absentStoryScene:true,save:g.save(),expectedText:projectGame(g).dialog.text,availableChoice:scene==='entry'?'gear':scene==='parts'?'deliver':'translate'});
  };
  observe();for(const id of route.accepted){assert.ok(g.dispatch({type:'choose',id}));drain(g);if(g.state.battle)resolveQ075(g,'win');observe();}assert.equal(g.state.quests.q075.outcome,route.outcome);
 }
 return {fixtures,outcomes:[...outcomes]};
}
