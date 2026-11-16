import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {data,ready,start,go,drain,checkpoint} from '../tests/royal-helpers.mjs';
import {read} from '../tests/oddland-helpers.mjs';
export const previousQ085=await read('tests/fixtures/e2-q085-before-cast.json');
export const previousQ085Data={...data,quests:{...data.quests,q085:previousQ085},scripts:{...data.scripts,...previousQ085.scripts},characters:Object.fromEntries(Object.entries(data.characters).filter(([id])=>!id.startsWith('q085_')))};
const accepted=data.previousQuestRoutes.q085;
const acceptedData={...previousQ085Data,quests:{...previousQ085Data.quests,q085:accepted},scripts:{...previousQ085Data.scripts,...accepted.scripts}};
export const q085Routes=[
 {path:['bag','entrance','walk','exit','finish'],accepted:['bag','entrance','exit'],outcome:'informed'},
 {path:['bag','entrance','walk','leader','leader','relay'],accepted:['bag','entrance','leader','relay'],outcome:'compromise'},
 {path:['bag','entrance','walk','leader','leader','entrance','walk','exit','finish'],accepted:['bag','entrance','leader','entrance','exit'],outcome:'informed'},
 {path:['bag','entrance','walk','leader','leader','entrance','walk','leader','leader','relay'],accepted:['bag','entrance','leader','entrance','leader','relay'],outcome:'compromise'},
 {path:['bag','leader','relay'],accepted:['bag','leader','relay'],outcome:'compromise'},
 {path:['bag','leader','entrance','walk','exit','finish'],accepted:['bag','leader','entrance','exit'],outcome:'informed'},
 {path:['bag','leader','entrance','walk','leader','leader','relay'],accepted:['bag','leader','entrance','leader','relay'],outcome:'compromise'},
 {path:['bag','leader','entrance','walk','leader','leader','entrance','walk','exit','finish'],accepted:['bag','leader','entrance','leader','entrance','exit'],outcome:'informed'},
 {path:['north'],accepted:['north'],outcome:'contract'}
];
export const q085Cast=scene=>['entrance','leader','place_marker','recover_marker','fixed'].includes(scene)?['q085_guide','q085_nextGuide']:[];
export const q085LegacyScene=g=>g.state.flags.flow?.q085?.node??g.state.flags.quest?.q085?.node;
export function loadQ085(raw){
 const g=new GameEngine(data);g.random=()=>.999999;g.load(raw);
 const expected=JSON.parse(raw);if(!expected.state.stories.q085)(expected.state.flags.legacyStoryRoutes??={}).q085=true;
 assert.deepEqual(JSON.parse(g.save()),expected);checkpoint(g);return g;
}
const starts=new Map();
export function q085Engine({legacy=false}={}){
 const content=legacy?previousQ085Data:data;
 if(!starts.has(legacy)){const base=ready(),g=legacy?new GameEngine(content):base;if(legacy)g.load(base.save());g.random=()=>.999999;start(g,'q085');starts.set(legacy,g.save());}
 const g=new GameEngine(content);g.random=()=>.999999;g.load(starts.get(legacy));return g;
}
export function q085AcceptedEngine(){
 const g=new GameEngine(acceptedData);g.load(ready().save());g.random=()=>.999999;
 go(g,{kind:'town',location:'royal_board'});assert.ok(g.accept('q085'));
 const p=accepted.locations.find(p=>p.role==='decision')??accepted.locations[0];
 go(g,{kind:'dungeon',dungeon:'region_9',map:p.map,x:p.x,y:p.y});g.run(accepted.model.entryScript);drain(g);return g;
}
export function arriveQ085(g){const a=g.data.quests.q085.story.actions[g.state.journey.action];go(g,g.data.quests.q085.story.worldPlaces[a.journey.to]);drain(g);assert.equal(g.state.journey,null);checkpoint(g);}
export function chooseQ085(g,id){assert.ok(g.dispatch({type:'choose',id}),g.state.notice);drain(g);assert.equal(g.state.battle,null);if(g.state.journey)arriveQ085(g);checkpoint(g);}
export function departQ085(g,id){assert.ok(g.dispatch({type:'choose',id}),g.state.notice);drain(g);assert.ok(g.state.journey);loadQ085(g.save());}
export function boundedQ085Paths(graph,limit=2){
 const nodes=new Map(graph.map(n=>[n.id,n])),rows=[];
 function visit(id,path,seen){if((seen[id]??0)>=limit)return;const next={...seen,[id]:(seen[id]??0)+1};for(const o of nodes.get(id).options){const p=[...path,o.id];if(o.to.startsWith('@'))rows.push({path:p,outcome:o.to.slice(1)});else visit(o.to,p,next);}}
 visit('entry',[],{});return rows;
}
export async function returnCompassArtFixtures(){
 const fixtures=[],outcomes=new Set(),available={entry:'bag',marker:'entrance',entrance:'leader',leader:'entrance',place_marker:'walk',recover_marker:'leader',fixed:'finish'};
 for(const legacy of [false,true]){
  const generation=legacy?'previous':'current',seen=new Set();
  const observe=(g,visit=1,suffix)=>{
   if(g.state.quests.q085.stage==='completed')return;
   const s=g.state.stories.q085,scene=s.scene,v=s.values,variant=generation+'-'+(suffix??v.markerAt+'-visit'+visit);
   if(seen.has(scene+'/'+variant))return;seen.add(scene+'/'+variant);
   const save=g.save(),cast=q085Cast(scene);assert.deepEqual(projectGame(loadQ085(save)).dialog.scene.cast.map(c=>c.id),cast);
   fixtures.push({edition:'e2',quest:'q085',scene,variant,cast,textOnlyCast:cast,save,expectedText:projectGame(g).dialog.text,availableChoice:available[scene]});
  };
  for(const route of q085Routes){const g=q085Engine({legacy}),visits={entry:1};observe(g);for(const id of route.path){chooseQ085(g,id);const scene=g.state.stories.q085.scene;if(scene)observe(g,visits[scene]=(visits[scene]??0)+1);}outcomes.add('e2/q085/'+g.state.quests.q085.outcome);}
  for(const step of ['recover','handover']){const g=q085Engine({legacy});chooseQ085(g,'bag');chooseQ085(g,'entrance');chooseQ085(g,'walk');if(step==='handover')chooseQ085(g,'leader');departQ085(g,'leader');g.defeat();drain(g);arriveQ085(g);observe(g,1,'rescued-'+step);}
 }
 const seen=new Set();
 for(const route of q085Routes){const g=loadQ085(q085AcceptedEngine().save()),observe=()=>{
  if(g.state.quests.q085.stage==='completed')return;const scene=q085LegacyScene(g);if(seen.has(scene))return;seen.add(scene);
  assert.equal(projectGame(g).dialog.scene,undefined);
  fixtures.push({edition:'e2',quest:'q085',scene,variant:'accepted',cast:[],absentStoryScene:true,save:g.save(),expectedText:projectGame(g).dialog.text,availableChoice:{entry:'bag',marker:'leader',entrance:'exit',leader:'relay'}[scene]});
 };observe();for(const id of route.accepted){assert.ok(g.dispatch({type:'choose',id}));drain(g);observe();}assert.equal(g.state.quests.q085.outcome,route.outcome);}
 return {fixtures,outcomes:[...outcomes]};
}
