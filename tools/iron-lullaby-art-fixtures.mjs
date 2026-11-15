import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {data,ready,start,choose,go,drain,checkpoint,read} from '../tests/machine-helpers.mjs';
export const previousQ076=await read('tests/fixtures/e2-q076-before-audit.json');
export const previousQ076Data={...data,quests:{...data.quests,q076:previousQ076},scripts:{...data.scripts,...previousQ076.scripts}};
const accepted=data.previousQuestRoutes.q076;
const acceptedData={...previousQ076Data,quests:{...previousQ076Data.quests,q076:accepted},scripts:{...previousQ076Data.scripts,...accepted.scripts}};
export const q076Routes=[
 {path:['line','rewire','finish'],outcome:'informed'},
 {path:['medicine','stop','finish'],outcome:'compromise'},
 {path:['line','move','carry','stop','finish'],outcome:'compromise'},
 {path:['medicine','keep','rewire','finish'],outcome:'informed'},
 {path:['line','move','carry','keep','rewire','finish'],outcome:'informed'},
 {path:['off'],outcome:'contract'}
];
// The accepted edition has an unbounded revisit loop; bound move to two uses.
export function acceptedQ076Routes(maxMoves=2){
 const nodes=new Map(accepted.model.graph.map(n=>[n.id,n])),out=[];
 const visit=(scene,path)=>{for(const o of nodes.get(scene).options){const next=[...path,o.id];if(next.filter(x=>x==='move').length>maxMoves)continue;if(o.to.startsWith('@'))out.push({path:next,outcome:o.to.slice(1)});else visit(o.to,next);}};
 visit('entry',[]);return out;
}
export const q076LegacyScene=g=>g.state.flags.flow?.q076?.node??g.state.flags.quest?.q076?.node;
export function loadQ076(raw){
 const g=new GameEngine(data);g.random=()=>.999999;g.load(raw);
 const expected=JSON.parse(raw);if(!expected.state.stories.q076)(expected.state.flags.legacyStoryRoutes??={}).q076=true;
 assert.deepEqual(JSON.parse(g.save()),expected);checkpoint(g);return g;
}
const starts=new Map();
export function q076Engine({legacy=false}={}){
 const content=legacy?previousQ076Data:data;
 if(!starts.has(legacy)){const base=ready(),g=legacy?new GameEngine(content):base;if(legacy)g.load(base.save());g.random=()=>.999999;start(g,'q076');starts.set(legacy,g.save());}
 const g=new GameEngine(content);g.random=()=>.999999;g.load(starts.get(legacy));return g;
}
export function q076AcceptedEngine(){
 const g=new GameEngine(acceptedData);g.load(ready().save());g.random=()=>.999999;
 go(g,{kind:'town',location:'salome_board'});assert.ok(g.accept('q076'));
 const p=accepted.locations.find(p=>p.role==='decision')??accepted.locations[0];
 go(g,{kind:'dungeon',dungeon:'region_8',map:p.map,x:p.x,y:p.y});g.run(accepted.model.entryScript);drain(g);return g;
}
export const chooseQ076=(g,id,options)=>choose(g,'q076',id,options);
export function departQ076(g,id){assert.ok(g.dispatch({type:'choose',id}),g.state.notice);drain(g);assert.ok(g.state.journey);loadQ076(g.save());}
export function arriveQ076(g){const a=g.data.quests.q076.story.actions[g.state.journey.action];go(g,g.data.quests.q076.story.worldPlaces[a.journey.to]);drain(g);assert.equal(g.state.journey,null);checkpoint(g);}
export async function ironLullabyArtFixtures(){
 const fixtures=[],outcomes=new Set(),available={entry:'line',control:'rewire',moved:'stop',fetch:'carry',stopped:'finish',recorded:'finish'};
 for(const legacy of [false,true]){
  const generation=legacy?'previous':'current',seen=new Set();
  const observe=(g,suffix)=>{
   if(g.state.quests.q076.stage==='completed')return;
   const s=g.state.stories.q076,scene=s.scene,v=s.values,variant=generation+'-'+(suffix??[v.medicineBoxAt,v.protected?'protected':'unprotected',v.separateCircuit?'separate':'linked'].join('-'));
   if(seen.has(scene+'/'+variant))return;seen.add(scene+'/'+variant);
   const save=g.save();assert.deepEqual(projectGame(loadQ076(save)).dialog.scene.cast,[]);
   fixtures.push({edition:'e2',quest:'q076',scene,variant,cast:[],save,expectedText:projectGame(g).dialog.text,availableChoice:available[scene],...(scene==='control'&&v.protected?{blockedChoice:'move'}:{})});
  };
  for(const route of q076Routes){const g=q076Engine({legacy});observe(g);for(const id of route.path){chooseQ076(g,id);observe(g);}assert.equal(g.state.quests.q076.outcome,route.outcome);outcomes.add('e2/q076/'+route.outcome);}
  const g=q076Engine({legacy});departQ076(g,'line');g.defeat();drain(g);arriveQ076(g);observe(g,'rescued');
 }
 const seen=new Set();
 for(const route of acceptedQ076Routes()){
  const g=loadQ076(q076AcceptedEngine().save()),observe=()=>{
   if(g.state.quests.q076.stage==='completed')return;const scene=q076LegacyScene(g);assert.ok(scene);if(seen.has(scene))return;seen.add(scene);
   assert.equal(projectGame(loadQ076(g.save())).dialog.scene,undefined);
   fixtures.push({edition:'e2',quest:'q076',scene,variant:'accepted',cast:[],absentStoryScene:true,save:g.save(),expectedText:projectGame(g).dialog.text,availableChoice:scene==='entry'?'line':scene==='control'?'rewire':'stop'});
  };
  observe();for(const id of route.path){assert.ok(g.dispatch({type:'choose',id}));drain(g);assert.equal(g.state.battle,null);observe();}assert.equal(g.state.quests.q076.outcome,route.outcome);
 }
 return {fixtures,outcomes:[...outcomes]};
}
