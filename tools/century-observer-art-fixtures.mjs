import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {data,ready,start,go,drain,checkpoint} from '../tests/royal-helpers.mjs';
import {read} from '../tests/oddland-helpers.mjs';
export const previousQ086=await read('tests/fixtures/e2-q086-before-cast.json');
export const previousQ086Data={...data,quests:{...data.quests,q086:previousQ086},scripts:{...data.scripts,...previousQ086.scripts},characters:Object.fromEntries(Object.entries(data.characters).filter(([id])=>!id.startsWith('q086_')))};
const accepted=data.previousQuestRoutes.q086;
const acceptedData={...previousQ086Data,quests:{...previousQ086Data.quests,q086:accepted},scripts:{...previousQ086Data.scripts,...accepted.scripts}};
export const q086Routes=[
 {path:['reply','repair','verify','table','finish'],accepted:['reply','repair','table'],outcome:'informed'},
 {path:['reply','repair','verify','daily','save','finish'],accepted:['reply','repair','daily'],outcome:'compromise'},
 {path:['reply','manual','save','finish'],accepted:['reply','manual'],outcome:'compromise'},
 {path:['old','save','finish'],accepted:['old'],outcome:'compromise'},
 {path:['discard'],accepted:['discard'],outcome:'contract'}
];
export const q086Cast=()=>[];
export const q086LegacyScene=g=>g.state.flags.flow?.q086?.node??g.state.flags.quest?.q086?.node;
export function loadQ086(raw){
 const g=new GameEngine(data);g.random=()=>.999999;g.load(raw);
 const expected=JSON.parse(raw);if(!expected.state.stories.q086)(expected.state.flags.legacyStoryRoutes??={}).q086=true;
 assert.deepEqual(JSON.parse(g.save()),expected);checkpoint(g);return g;
}
const starts=new Map();
export function q086Engine({legacy=false}={}){
 const content=legacy?previousQ086Data:data;
 if(!starts.has(legacy)){const base=ready(),g=legacy?new GameEngine(content):base;if(legacy)g.load(base.save());g.random=()=>.999999;start(g,'q086');starts.set(legacy,g.save());}
 const g=new GameEngine(content);g.random=()=>.999999;g.load(starts.get(legacy));return g;
}
export function q086AcceptedEngine(){
 const g=new GameEngine(acceptedData);g.load(ready().save());g.random=()=>.999999;
 go(g,{kind:'town',location:'royal_board'});assert.ok(g.accept('q086'));
 const p=accepted.locations.find(p=>p.role==='decision')??accepted.locations[0];
 go(g,{kind:'dungeon',dungeon:'region_9',map:p.map,x:p.x,y:p.y});g.run(accepted.model.entryScript);drain(g);return g;
}
export function arriveQ086(g){const a=g.data.quests.q086.story.actions[g.state.journey.action];go(g,g.data.quests.q086.story.worldPlaces[a.journey.to]);drain(g);assert.equal(g.state.journey,null);checkpoint(g);}
export function chooseQ086(g,id){assert.ok(g.dispatch({type:'choose',id}),g.state.notice);drain(g);assert.equal(g.state.battle,null);if(g.state.journey)arriveQ086(g);checkpoint(g);}
export function departQ086(g,id){assert.ok(g.dispatch({type:'choose',id}),g.state.notice);drain(g);assert.ok(g.state.journey);loadQ086(g.save());}
export function q086Paths(graph){
 const nodes=new Map(graph.map(n=>[n.id,n])),rows=[];
 const visit=(id,path,seen)=>{assert.ok(!seen.has(id),'graph must be acyclic');const next=new Set([...seen,id]);for(const o of nodes.get(id).options){const p=[...path,o.id];if(o.to.startsWith('@'))rows.push({path:p,outcome:o.to.slice(1)});else visit(o.to,p,next);}};
 visit('entry',[],new Set());return rows;
}
export async function centuryObserverArtFixtures(){
 const fixtures=[],outcomes=new Set(),available={entry:'reply',mail:'repair',mapping:'table',repaired:'verify',mapped:'finish',annotate:'save',annotated:'finish'};
 for(const legacy of [false,true]){
  const generation=legacy?'previous':'current',seen=new Set();
  const observe=(g,suffix)=>{
   if(g.state.quests.q086.stage==='completed')return;
   const s=g.state.stories.q086,scene=s.scene,v=s.values,variant=generation+'-'+(suffix??[v.noticeAt,v.receiverFixed?'repaired':'unrepaired',v.reportsAt].join('-'));
   if(seen.has(scene+'/'+variant))return;seen.add(scene+'/'+variant);
   const save=g.save();assert.deepEqual(projectGame(loadQ086(save)).dialog.scene.cast,[]);
   fixtures.push({edition:'e2',quest:'q086',scene,variant,cast:[],save,expectedText:projectGame(g).dialog.text,availableChoice:available[scene]});
  };
  for(const route of q086Routes){const g=q086Engine({legacy});observe(g);for(const id of route.path){chooseQ086(g,id);observe(g);}assert.equal(g.state.quests.q086.outcome,route.outcome);outcomes.add('e2/q086/'+route.outcome);}
  for(const kind of ['notice','reports']){const g=q086Engine({legacy});if(kind==='reports')chooseQ086(g,'old');departQ086(g,kind==='notice'?'reply':'save');g.defeat();drain(g);arriveQ086(g);observe(g,'rescued-'+kind);}
 }
 const seen=new Set();for(const route of q086Routes){const g=loadQ086(q086AcceptedEngine().save()),observe=()=>{
  if(g.state.quests.q086.stage==='completed')return;const scene=q086LegacyScene(g);if(seen.has(scene))return;seen.add(scene);assert.equal(projectGame(g).dialog.scene,undefined);
  fixtures.push({edition:'e2',quest:'q086',scene,variant:'accepted',cast:[],absentStoryScene:true,save:g.save(),expectedText:projectGame(g).dialog.text,availableChoice:{entry:'reply',mail:'repair',mapping:'table'}[scene]});
 };observe();for(const id of route.accepted){assert.ok(g.dispatch({type:'choose',id}));drain(g);observe();}assert.equal(g.state.quests.q086.outcome,route.outcome);}
 return {fixtures,outcomes:[...outcomes]};
}
