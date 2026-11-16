import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {data,ready,start,go,drain,checkpoint} from '../tests/royal-helpers.mjs';
import {read} from '../tests/oddland-helpers.mjs';
export const previousQ087=await read('tests/fixtures/e2-q087-before-cast.json');
export const previousQ087Data={...data,quests:{...data.quests,q087:previousQ087},scripts:{...data.scripts,...previousQ087.scripts},characters:Object.fromEntries(Object.entries(data.characters).filter(([id])=>!id.startsWith('q087_')))};
const accepted=data.previousQuestRoutes.q087;
const acceptedData={...previousQ087Data,quests:{...previousQ087Data.quests,q087:accepted},scripts:{...previousQ087Data.scripts,...accepted.scripts}};
export const q087Routes=[
 {path:['test','wording','act','finish'],accepted:['test','wording','act'],outcome:'informed'},
 {path:['test','wording','write','finish'],accepted:['test','wording','write'],outcome:'compromise'},
 {path:['test','record','finish'],accepted:['test','record'],outcome:'compromise'},
 {path:['notebook','finish'],accepted:['notebook'],outcome:'compromise'},
 {path:['break'],accepted:['break'],outcome:'contract'}
];
export const q087Cast=scene=>['entry','ticket','firststep','written','desk'].includes(scene)?['q087_haku']:[];
export const q087LegacyScene=g=>g.state.flags.flow?.q087?.node??g.state.flags.quest?.q087?.node;
export function loadQ087(raw){
 const g=new GameEngine(data);g.random=()=>.999999;g.load(raw);
 const expected=JSON.parse(raw);if(!expected.state.stories.q087)(expected.state.flags.legacyStoryRoutes??={}).q087=true;
 assert.deepEqual(JSON.parse(g.save()),expected);checkpoint(g);return g;
}
const starts=new Map();
export function q087Engine({legacy=false}={}){
 const content=legacy?previousQ087Data:data;
 if(!starts.has(legacy)){const base=ready(),g=legacy?new GameEngine(content):base;if(legacy)g.load(base.save());g.random=()=>.999999;start(g,'q087');starts.set(legacy,g.save());}
 const g=new GameEngine(content);g.random=()=>.999999;g.load(starts.get(legacy));return g;
}
export function q087AcceptedEngine(){
 const g=new GameEngine(acceptedData);g.load(ready().save());g.random=()=>.999999;
 go(g,{kind:'town',location:'royal_board'});assert.ok(g.accept('q087'));
 const p=accepted.locations.find(p=>p.role==='decision')??accepted.locations[0];
 go(g,{kind:'dungeon',dungeon:'region_9',map:p.map,x:p.x,y:p.y});g.run(accepted.model.entryScript);drain(g);return g;
}
export function arriveQ087(g){const a=g.data.quests.q087.story.actions[g.state.journey.action];go(g,g.data.quests.q087.story.worldPlaces[a.journey.to]);drain(g);assert.equal(g.state.journey,null);checkpoint(g);}
export function chooseQ087(g,id){assert.ok(g.dispatch({type:'choose',id}),g.state.notice);drain(g);assert.equal(g.state.battle,null);if(g.state.journey)arriveQ087(g);checkpoint(g);}
export function departQ087(g,id){assert.ok(g.dispatch({type:'choose',id}),g.state.notice);drain(g);assert.ok(g.state.journey);loadQ087(g.save());}
export function q087Paths(graph){
 const nodes=new Map(graph.map(n=>[n.id,n])),rows=[];
 const visit=(id,path,seen)=>{assert.ok(!seen.has(id),'graph must be acyclic');const next=new Set([...seen,id]);for(const o of nodes.get(id).options){const p=[...path,o.id];if(o.to.startsWith('@'))rows.push({path:p,outcome:o.to.slice(1)});else visit(o.to,p,next);}};
 visit('entry',[],new Set());return rows;
}
export async function wishTicketArtFixtures(){
 const fixtures=[],outcomes=new Set(),available={entry:'test',ticket:'wording',firststep:'act',written:'finish',desk:'finish'};
 for(const legacy of [false,true]){
  const generation=legacy?'previous':'current',seen=new Set();
  const observe=(g,suffix)=>{
   if(g.state.quests.q087.stage==='completed')return;
   const s=g.state.stories.q087,scene=s.scene,v=s.values,variant=generation+'-'+(suffix??[v.ticketIssued?'ticket':'untested',v.wordingFixed?'corrected':'uncorrected',v.written?'written':'unwritten',v.clutterAt].join('-'));
   if(seen.has(scene+'/'+variant))return;seen.add(scene+'/'+variant);
   const save=g.save(),cast=q087Cast(scene);assert.deepEqual(projectGame(loadQ087(save)).dialog.scene.cast.map(c=>c.id),cast);
   fixtures.push({edition:'e2',quest:'q087',scene,variant,cast,textOnlyCast:cast,save,expectedText:projectGame(g).dialog.text,availableChoice:available[scene]});
  };
  for(const route of q087Routes){const g=q087Engine({legacy});observe(g);for(const id of route.path){chooseQ087(g,id);observe(g);}assert.equal(g.state.quests.q087.outcome,route.outcome);outcomes.add('e2/q087/'+route.outcome);}
  for(const destination of ['sky','home']){const g=q087Engine({legacy});if(destination==='home')for(const id of ['test','wording'])chooseQ087(g,id);departQ087(g,destination==='sky'?'notebook':'act');g.defeat();drain(g);arriveQ087(g);observe(g,'rescued-'+destination);}
 }
 const seen=new Set();for(const route of q087Routes){const g=loadQ087(q087AcceptedEngine().save()),observe=()=>{
  if(g.state.quests.q087.stage==='completed')return;const scene=q087LegacyScene(g);if(seen.has(scene))return;seen.add(scene);assert.equal(projectGame(g).dialog.scene,undefined);
  fixtures.push({edition:'e2',quest:'q087',scene,variant:'accepted',cast:[],absentStoryScene:true,save:g.save(),expectedText:projectGame(g).dialog.text,availableChoice:{entry:'test',ticket:'wording',firststep:'act'}[scene]});
 };observe();for(const id of route.accepted){assert.ok(g.dispatch({type:'choose',id}));drain(g);observe();}assert.equal(g.state.quests.q087.outcome,route.outcome);}
 return {fixtures,outcomes:[...outcomes]};
}
