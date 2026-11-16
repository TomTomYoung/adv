import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {data,ready,start,go,drain,checkpoint} from '../tests/royal-helpers.mjs';
import {read} from '../tests/oddland-helpers.mjs';
export const previousQ088=await read('tests/fixtures/e2-q088-before-cast.json');
export const previousQ088Data={...data,quests:{...data.quests,q088:previousQ088},scripts:{...data.scripts,...previousQ088.scripts},characters:Object.fromEntries(Object.entries(data.characters).filter(([id])=>!id.startsWith('q088_')))};
const accepted=data.previousQuestRoutes.q088;
const acceptedData={...previousQ088Data,quests:{...previousQ088Data.quests,q088:accepted},scripts:{...previousQ088Data.scripts,...accepted.scripts}};
export const q088Routes=[
 {path:['layers','replace','carry','test','observe','sky','finish'],accepted:['layers','replace','sky'],outcome:'informed'},
 {path:['layers','replace','carry','test','observe','cancel','finish'],accepted:['layers','replace','cancel'],outcome:'compromise'},
 {path:['layers','expert','escort','finish'],accepted:['layers','expert'],outcome:'compromise'},
 {path:['inspection','escort','finish'],accepted:['inspection'],outcome:'compromise'},
 {path:['metal'],accepted:['metal'],outcome:'contract'}
];
export const q088Cast=scene=>['experts','inspected'].includes(scene)?['q088_experts']:[];
export const q088LegacyScene=g=>g.state.flags.flow?.q088?.node??g.state.flags.quest?.q088?.node;
export function loadQ088(raw){
 const g=new GameEngine(data);g.random=()=>.999999;g.load(raw);
 const expected=JSON.parse(raw);if(!expected.state.stories.q088)(expected.state.flags.legacyStoryRoutes??={}).q088=true;
 assert.deepEqual(JSON.parse(g.save()),expected);checkpoint(g);return g;
}
const starts=new Map();
export function q088Engine({legacy=false}={}){
 const content=legacy?previousQ088Data:data;
 if(!starts.has(legacy)){const base=ready(),g=legacy?new GameEngine(content):base;if(legacy)g.load(base.save());g.random=()=>.999999;start(g,'q088');starts.set(legacy,g.save());}
 const g=new GameEngine(content);g.random=()=>.999999;g.load(starts.get(legacy));return g;
}
export function q088AcceptedEngine(){
 const g=new GameEngine(acceptedData);g.load(ready().save());g.random=()=>.999999;
 go(g,{kind:'town',location:'royal_board'});assert.ok(g.accept('q088'));
 const p=accepted.locations.find(p=>p.role==='decision')??accepted.locations[0];
 go(g,{kind:'dungeon',dungeon:'region_9',map:p.map,x:p.x,y:p.y});g.run(accepted.model.entryScript);drain(g);return g;
}
export function arriveQ088(g){const a=g.data.quests.q088.story.actions[g.state.journey.action];go(g,g.data.quests.q088.story.worldPlaces[a.journey.to]);drain(g);assert.equal(g.state.journey,null);checkpoint(g);}
export function chooseQ088(g,id){assert.ok(g.dispatch({type:'choose',id}),g.state.notice);drain(g);assert.equal(g.state.battle,null);if(g.state.journey)arriveQ088(g);checkpoint(g);}
export function departQ088(g,id){assert.ok(g.dispatch({type:'choose',id}),g.state.notice);drain(g);assert.ok(g.state.journey);loadQ088(g.save());}
export function q088Paths(graph){
 const nodes=new Map(graph.map(n=>[n.id,n])),rows=[];
 const visit=(id,path,seen)=>{assert.ok(!seen.has(id),'graph must be acyclic');const next=new Set([...seen,id]);for(const o of nodes.get(id).options){const p=[...path,o.id];if(o.to.startsWith('@'))rows.push({path:p,outcome:o.to.slice(1)});else visit(o.to,p,next);}};
 visit('entry',[],new Set());return rows;
}
export async function observationWindowArtFixtures(){
 const fixtures=[],outcomes=new Set(),available={entry:'layers',panel:'replace',observe:'sky',spare:'carry',install:'test',checked:'observe',lesson:'finish',experts:'escort',inspected:'finish',cancelled:'finish'};
 for(const legacy of [false,true]){
  const generation=legacy?'previous':'current',seen=new Set();
  const observe=(g,suffix)=>{
   if(g.state.quests.q088.stage==='completed')return;
   const s=g.state.stories.q088,scene=s.scene,v=s.values,variant=generation+'-'+(suffix??[v.crackedAt,v.spareAt,v.expertsAt,v.checked?'checked':'unchecked',v.observed?'observed':'unobserved'].join('-'));
   if(seen.has(scene+'/'+variant))return;seen.add(scene+'/'+variant);
   const save=g.save(),cast=q088Cast(scene);assert.deepEqual(projectGame(loadQ088(save)).dialog.scene.cast.map(c=>c.id),cast);
   fixtures.push({edition:'e2',quest:'q088',scene,variant,cast,textOnlyCast:cast,save,expectedText:projectGame(g).dialog.text,availableChoice:available[scene]});
  };
  for(const route of q088Routes){const g=q088Engine({legacy});observe(g);for(const id of route.path){chooseQ088(g,id);observe(g);}assert.equal(g.state.quests.q088.outcome,route.outcome);outcomes.add('e2/q088/'+route.outcome);}
  for(const [prefix,id,suffix] of [
   [['layers','replace'],'carry','material'],
   [['layers','replace','carry','test','observe'],'sky','old-panel'],
   [['inspection'],'escort','experts-direct'],
   [['layers','expert'],'escort','experts-detached']
  ]){const g=q088Engine({legacy});for(const c of prefix)chooseQ088(g,c);departQ088(g,id);g.defeat();drain(g);arriveQ088(g);observe(g,'rescued-'+suffix);}
 }
 const seen=new Set();for(const route of q088Routes){const g=loadQ088(q088AcceptedEngine().save()),observe=()=>{
  if(g.state.quests.q088.stage==='completed')return;const scene=q088LegacyScene(g);if(seen.has(scene))return;seen.add(scene);assert.equal(projectGame(g).dialog.scene,undefined);
  fixtures.push({edition:'e2',quest:'q088',scene,variant:'accepted',cast:[],absentStoryScene:true,save:g.save(),expectedText:projectGame(g).dialog.text,availableChoice:{entry:'layers',panel:'replace',observe:'sky'}[scene]});
 };observe();for(const id of route.accepted){assert.ok(g.dispatch({type:'choose',id}));drain(g);observe();}assert.equal(g.state.quests.q088.outcome,route.outcome);}
 return {fixtures,outcomes:[...outcomes]};
}
