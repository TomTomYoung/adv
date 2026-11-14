import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {data,ready,start,choose,checkpoint,go,drain,read} from '../tests/library-helpers.mjs';

export const previousQ148=await read('tests/fixtures/e2-q148-before-cast.json');
export const previousQ148Data={...data,quests:{...data.quests,q148:previousQ148},scripts:{...data.scripts,...previousQ148.scripts},characters:Object.fromEntries(Object.entries(data.characters).filter(([id])=>!['q148_egi','q148_customer'].includes(id)))};
const accepted=data.previousQuestRoutes.q148;
const acceptedData={...previousQ148Data,quests:{...previousQ148Data.quests,q148:accepted},scripts:{...previousQ148Data.scripts,...accepted.scripts}};
const tails=[
 {tail:['test','public','finish'],accepted:['test','public'],outcome:'public'},
 {tail:['test','private','finish'],accepted:['test','private'],outcome:'private'},
 {tail:['remove','finish'],accepted:['remove'],outcome:'remove'},
 {tail:['test','remove','finish'],accepted:['test','remove'],outcome:'remove'},
 {tail:['accuse','remove','carry','finish'],accepted:['accuse','remove'],outcome:'remove'}
];
export const q148Routes=[0,1,2].flatMap(loops=>tails.map(r=>{const repeat=Array.from({length:loops},()=>['accuse','test']).flat();return {path:['visit',...repeat,...r.tail],accepted:[...repeat,...r.accepted],outcome:r.outcome,loops};}));
export const q148Cast=scene=>['market','proof','denied','public_demo','private_refund'].includes(scene)?['q148_egi','q148_customer']:[];
export const q148LegacyScene=g=>g.state.flags.flow?.q148?.node??g.state.flags.quest?.q148?.node;
export function loadQ148(raw){
 const g=new GameEngine(data);g.random=()=>.999999;g.load(raw);
 const expected=JSON.parse(raw);
 if(!expected.state.stories.q148)(expected.state.flags.legacyStoryRoutes??={}).q148=true;
 assert.deepEqual(JSON.parse(g.save()),expected);checkpoint(g);return g;
}
// Immutable starting saves avoid replaying setup for each independent test case.
const startingSaves=new Map();
export function q148Engine({legacy=false}={}){
 const content=legacy?previousQ148Data:data;
 if(!startingSaves.has(legacy)){
  const base=ready(),initial=legacy?new GameEngine(content):base;
  if(legacy)initial.load(base.save());initial.random=()=>.999999;start(initial,'q148');startingSaves.set(legacy,initial.save());
 }
 const g=new GameEngine(content);g.random=()=>.999999;g.load(startingSaves.get(legacy));return g;
}
export function q148AcceptedEngine(){
 const g=new GameEngine(acceptedData);g.load(ready().save());g.random=()=>.999999;
 go(g,{kind:'town',location:'salome_board'});assert.ok(g.accept('q148'));
 const p=accepted.locations.find(p=>p.role==='decision')??accepted.locations[0];
 go(g,{kind:'dungeon',dungeon:'region_5',map:p.map,x:p.x,y:p.y});
 g.run(accepted.model.entryScript??'q148.visit');drain(g);return g;
}
export const chooseQ148=(g,id)=>choose(g,'q148',id);
export function departQ148(g,id){assert.ok(g.dispatch({type:'choose',id}),g.state.notice);drain(g);assert.ok(g.state.journey);loadQ148(g.save());}
export function arriveQ148(g){const a=g.data.quests.q148.story.actions[g.state.journey.action];go(g,g.data.quests.q148.story.worldPlaces[a.journey.to]);drain(g);assert.equal(g.state.journey,null);checkpoint(g);}
export async function scaleComparisonArtFixtures(){
 const fixtures=[],outcomes=new Set();
 const available={entry:'visit',market:'test',proof:'public',denied:'test',public_demo:'finish',private_refund:'finish',fetch_scale:'carry',removed:'finish'};
 for(const legacy of [false,true]){
  const seen=new Set(),generation=legacy?'previous':'current';
  for(const route of q148Routes){
   const g=q148Engine({legacy}),observe=()=>{
    if(g.state.quests.q148.stage==='completed')return;
    const s=g.state.stories.q148,scene=s.scene,variant=generation+'-'+s.values.egiAt+'-'+(s.values.proof?'proof':'unproven');
    if(seen.has(scene+'/'+variant))return;seen.add(scene+'/'+variant);
    const save=g.save(),cast=q148Cast(scene);assert.deepEqual(projectGame(loadQ148(save)).dialog.scene.cast.map(c=>c.id),cast);
    fixtures.push({edition:'e2',quest:'q148',scene,variant,cast,textOnlyCast:cast,save,expectedText:projectGame(g).dialog.text,availableChoice:available[scene]});
   };
   observe();for(const id of route.path){chooseQ148(g,id);observe();}
   assert.equal(g.state.quests.q148.outcome,route.outcome);outcomes.add('e2/q148/'+route.outcome);
  }
 }
 const seen=new Set();
 for(const route of q148Routes){
  const g=loadQ148(q148AcceptedEngine().save()),observe=()=>{
   if(g.state.quests.q148.stage==='completed')return;
   const scene=q148LegacyScene(g);assert.ok(scene);if(seen.has(scene))return;seen.add(scene);
   assert.equal(projectGame(loadQ148(g.save())).dialog.scene,undefined);
   fixtures.push({edition:'e2',quest:'q148',scene,variant:'accepted',cast:[],absentStoryScene:true,save:g.save(),expectedText:projectGame(g).dialog.text,availableChoice:scene==='proof'?'public':'test'});
  };
  observe();for(const id of route.accepted){assert.ok(g.dispatch({type:'choose',id}));drain(g);observe();}
  assert.equal(g.state.quests.q148.outcome,route.outcome);
 }
 return {fixtures,outcomes:[...outcomes]};
}
