import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {data,ready,start,choose,checkpoint,go,drain,read} from '../tests/library-helpers.mjs';
export const previousQ150=await read('tests/fixtures/e2-q150-before-cast.json');
export const q150Crew=['ritz','porterPerson','thiefPerson','singerPerson'];
export const q150Cast=q150Crew.map(id=>'q150_'+id);
export const previousQ150Data={...data,quests:{...data.quests,q150:previousQ150},scripts:{...data.scripts,...previousQ150.scripts},characters:Object.fromEntries(Object.entries(data.characters).filter(([id])=>!q150Cast.includes(id)))};
const accepted=data.previousQuestRoutes.q150;
const acceptedData={...previousQ150Data,quests:{...previousQ150Data.quests,q150:accepted},scripts:{...previousQ150Data.scripts,...accepted.scripts}};
// Enumerate the finite first-edition graph using its original role prerequisites.
const routes=[];
function enumerate(id,flags,path){
 const node=accepted.model.graph.find(n=>n.id===id);assert.ok(node,id);
 for(const o of node.options){
  if(o.need?.some(k=>!flags[k]))continue;
  const next=[...path,o.id],state={...flags,...o.set};
  if(o.to.startsWith('@')){
   const actual=next.flatMap(k=>k==='practice'?['practice','stage']:k==='agree'?['agree','continue','carry','finish']:['cancel','none','decline'].includes(k)?[k,'finish']:[k]);
   routes.push({path:actual,accepted:next,outcome:o.to.slice(1),fee:o.to==='@company'?40:0,prepared:next[0]==='practice'});
  }else enumerate(o.to,state,next);
 }
}
enumerate('entry',{},[]);
export const q150Routes=routes;
// Minimal deterministic path basis covers every action; all 94 outcomes are
// tested separately so save-phase checks do not repeat identical prefixes.
const coverage=new Set(Object.keys(data.quests.q150.story.actions)),basis=[];
const keys=route=>{let scene='entry';return route.path.map(id=>{const a=data.quests.q150.story.actions[scene+'_'+id];assert.ok(a,scene+'/'+id);const key=scene+'_'+id;scene=a.to;return key;});};
while(coverage.size){
 const ranked=routes.map(r=>({r,keys:keys(r)})).sort((a,b)=>b.keys.filter(k=>coverage.has(k)).length-a.keys.filter(k=>coverage.has(k)).length);
 const best=ranked[0];assert.ok(best.keys.some(k=>coverage.has(k)));basis.push(best.r);for(const k of best.keys)coverage.delete(k);
}
export const q150CoverageRoutes=basis;
export const q150LegacyScene=g=>g.state.flags.flow?.q150?.node??g.state.flags.quest?.q150?.node;
export function loadQ150(raw){
 const g=new GameEngine(data);g.random=()=>.999999;g.load(raw);
 const expected=JSON.parse(raw);if(!expected.state.stories.q150)(expected.state.flags.legacyStoryRoutes??={}).q150=true;
 assert.deepEqual(JSON.parse(g.save()),expected);checkpoint(g);return g;
}
const starts=new Map();
export function q150Engine({legacy=false}={}){
 const content=legacy?previousQ150Data:data;
 if(!starts.has(legacy)){
  const base=ready(),g=legacy?new GameEngine(content):base;
  if(legacy)g.load(base.save());g.random=()=>.999999;start(g,'q150');starts.set(legacy,g.save());
 }
 const g=new GameEngine(content);g.random=()=>.999999;g.load(starts.get(legacy));return g;
}
let oldStart;
export function q150AcceptedEngine(){
 if(!oldStart){
  const g=new GameEngine(acceptedData);g.load(ready().save());g.random=()=>.999999;
  go(g,{kind:'town',location:'salome_board'});assert.ok(g.accept('q150'));
  const p=accepted.locations.find(p=>p.role==='decision')??accepted.locations[0];
  go(g,{kind:'dungeon',dungeon:'region_5',map:p.map,x:p.x,y:p.y});g.run(accepted.model.entryScript??'q150.visit');drain(g);oldStart=g.save();
 }
 const g=new GameEngine(acceptedData);g.random=()=>.999999;g.load(oldStart);return g;
}
export const chooseQ150=(g,id)=>choose(g,'q150',id);
export function departQ150(g,id){assert.ok(g.dispatch({type:'choose',id}),g.state.notice);drain(g);assert.ok(g.state.journey);loadQ150(g.save());}
export function arriveQ150(g){const a=g.data.quests.q150.story.actions[g.state.journey.action];go(g,g.data.quests.q150.story.worldPlaces[a.journey.to]);drain(g);assert.equal(g.state.journey,null);checkpoint(g);}
export async function troupeApprenticeArtFixtures(){
 const fixtures=[],outcomes=new Set();
 const available={entry:'practice',practice:'stage',accident:'porter',repair:'thief',audience:'thief',contracts:'company',company:'agree',company_agree_ready:'continue',tools:'carry',formed:'finish',settled:'finish'};
 for(const legacy of [false,true]){
  const seen=new Set(),generation=legacy?'previous':'current';
  for(const route of q150Routes){
   const g=q150Engine({legacy}),observe=()=>{
    if(g.state.quests.q150.stage==='completed')return;
    const s=g.state.stories.q150,v=s.values,scene=s.scene;
    const detail=scene==='accident'?(v.prepared?'prepared':'unprepared'):scene==='contracts'?['porter','thief','singer','walletReturned'].map(k=>+v[k]).join(''):'site';
    const variant=generation+'-'+detail;if(seen.has(scene+'/'+variant))return;seen.add(scene+'/'+variant);
    const save=g.save();assert.deepEqual(projectGame(loadQ150(save)).dialog.scene.cast.map(c=>c.id),q150Cast);
    fixtures.push({edition:'e2',quest:'q150',scene,variant,cast:q150Cast,textOnlyCast:q150Cast,save,expectedText:projectGame(g).dialog.text,availableChoice:available[scene]});
   };
   observe();for(const id of route.path){chooseQ150(g,id);observe();}assert.equal(g.state.quests.q150.outcome,route.outcome);outcomes.add('e2/q150/'+route.outcome);
  }
  const g=q150Engine({legacy});for(const id of ['stage','porter','finish','company'])chooseQ150(g,id);g.state.gold=39;const save=g.save();loadQ150(save);
  fixtures.push({edition:'e2',quest:'q150',scene:'company',variant:generation+'-shortage',cast:q150Cast,textOnlyCast:q150Cast,save,expectedText:projectGame(g).dialog.text,blockedChoice:'agree',availableChoice:'decline'});
 }
 const seen=new Set();
 for(const route of q150Routes){
  const g=loadQ150(q150AcceptedEngine().save()),observe=()=>{
   if(g.state.quests.q150.stage==='completed')return;
   const scene=q150LegacyScene(g);if(seen.has(scene))return;seen.add(scene);assert.equal(projectGame(g).dialog.scene,undefined);
   fixtures.push({edition:'e2',quest:'q150',scene,variant:'accepted',cast:[],absentStoryScene:true,save:g.save(),expectedText:projectGame(g).dialog.text,availableChoice:available[scene]});
  };
  observe();for(const id of route.accepted){assert.ok(g.dispatch({type:'choose',id}));drain(g);observe();}assert.equal(g.state.quests.q150.outcome,route.outcome);
 }
 return {fixtures,outcomes:[...outcomes]};
}
