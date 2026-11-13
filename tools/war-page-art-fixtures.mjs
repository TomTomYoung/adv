import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {data,ready,start,choose,checkpoint,go,drain,read} from '../tests/library-helpers.mjs';

export const previousQ047=await read('tests/fixtures/e2-q047-before-cast.json');
export const previousQ047Data={...data,quests:{...data.quests,q047:previousQ047},scripts:{...data.scripts,...previousQ047.scripts},characters:Object.fromEntries(Object.entries(data.characters).filter(([id])=>!id.startsWith('q047_')))};
const accepted=data.previousQuestRoutes.q047;
const acceptedData={...previousQ047Data,quests:{...previousQ047Data.quests,q047:accepted},scripts:{...previousQ047Data.scripts,...accepted.scripts}};
export const q047Routes=[{path:['return','finish'],outcome:'contract'}];
for(const prefix of [['home'],['other'],['home','other']]){
 q047Routes.push({path:[...prefix,'vault','deliver'],outcome:'compromise'});
 q047Routes.push({path:[...prefix,'vault','publish','deliver','other','finish'],outcome:'informed'});
 if(prefix.at(-1)==='other')q047Routes.push({path:[...prefix,'parallel','deliver','other','finish'],outcome:'informed'});
}
export const q047AcceptedRoutes=q047Routes.map(r=>({...r,path:r.path.slice(0,r.outcome==='contract'?1:r.outcome==='informed'?r.path.findIndex(id=>id==='publish'||id==='parallel')+1:r.path.length)}));
const people={entry:[],home:['homeClerk'],other:['otherClerk'],vault:['homeRecipient','otherRecipient'],returned:['homeClerk'],home_delivered:['homeClerk'],other_delivered:['otherClerk']};
export const q047Cast=(scene,events=[])=>((scene==='parallel'?(events.includes('vault_publish')?people.vault:[]):people[scene])??[]).map(id=>'q047_'+id);
export function loadQ047(raw){
 const g=new GameEngine(data);g.random=()=>.999999;g.load(raw);const expected=JSON.parse(raw),s=expected.state.stories.q047;
 if(!s)(expected.state.flags.legacyStoryRoutes??={}).q047=true;
 else if(s.revision===1){s.revision=2;Object.assign(s.values,{homeClerkAt:'home',otherClerkAt:'other'});}
 assert.deepEqual(JSON.parse(g.save()),expected);checkpoint(g);return g;
}
export function q047Engine({legacy=false}={}){const base=ready(),g=legacy?new GameEngine(previousQ047Data):base;if(legacy)g.load(base.save());g.random=()=>.999999;start(g,'q047');return g;}
export function q047AcceptedEngine(){
 const g=new GameEngine(acceptedData);g.load(ready().save());g.random=()=>.999999;go(g,{kind:'town',location:'salome_board'});assert.ok(g.accept('q047'));
 const p=accepted.locations.find(p=>p.role==='decision')??accepted.locations[0];go(g,{kind:'dungeon',dungeon:'region_5',map:p.map,x:p.x,y:p.y});g.run(accepted.model.entryScript??'q047.visit');drain(g);return g;
}
export const chooseQ047=(g,id)=>choose(g,'q047',id);
function origin(events){
 if(events.includes('entry_return'))return 'return';
 return [events.includes('entry_home')&&'home',(events.includes('entry_other')||events.includes('home_other'))&&'other',(events.includes('home_vault')||events.includes('other_vault'))&&'vault'].filter(Boolean).join('-')||'entry';
}
export async function warPageArtFixtures(){
 const fixtures=[],outcomes=new Set();
 for(const legacy of [false,true]){
  const seen=new Set();
  for(const route of q047Routes){const g=q047Engine({legacy}),observe=()=>{
   if(g.state.quests.q047.stage==='completed')return;
   const s=g.state.stories.q047,scene=s.scene,variant=(legacy?'previous':'current')+'-'+origin(s.events),key=scene+'/'+variant;if(seen.has(key))return;seen.add(key);
   const save=g.save(),now=loadQ047(save),cast=q047Cast(scene,s.events);assert.deepEqual(projectGame(now).dialog.scene.cast.map(c=>c.id),cast);
   fixtures.push({edition:'e2',quest:'q047',scene,variant,cast,textOnlyCast:cast,save,expectedText:projectGame(g).dialog.text,availableChoice:{entry:'home',home:'other',other:'parallel',vault:'deliver',returned:'finish',parallel:'deliver',home_delivered:'other',other_delivered:'finish'}[scene]});
  };observe();for(const id of route.path){chooseQ047(g,id);observe();}assert.equal(g.state.quests.q047.outcome,route.outcome);outcomes.add('e2/q047/'+route.outcome);}
 }
 const seen=new Set();
 for(const route of q047AcceptedRoutes){const g=loadQ047(q047AcceptedEngine().save()),path=[],observe=()=>{
  if(g.state.quests.q047.stage==='completed')return;
  const scene=g.state.flags.flow.q047.node,variant='accepted-'+(path.join('-')||'entry'),key=scene+'/'+variant;if(seen.has(key))return;seen.add(key);
  assert.equal(projectGame(loadQ047(g.save())).dialog.scene,undefined);
  fixtures.push({edition:'e2',quest:'q047',scene,variant,cast:[],absentStoryScene:true,save:g.save(),expectedText:projectGame(g).dialog.text,availableChoice:{entry:'home',home:'other',other:'parallel',vault:'deliver'}[scene]});
 };observe();for(const id of route.path){path.push(id);assert.ok(g.dispatch({type:'choose',id}));drain(g);observe();}assert.equal(g.state.quests.q047.outcome,route.outcome);}
 return{fixtures,outcomes:[...outcomes]};
}
