import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {data,ready,start,choose,go,drain,checkpoint,read} from '../tests/machine-helpers.mjs';

export const previousQ072=await read('tests/fixtures/e2-q072-before-cast.json');
const oldData={...data,quests:{...data.quests,q072:previousQ072},scripts:{...data.scripts,...previousQ072.scripts},characters:Object.fromEntries(Object.entries(data.characters).filter(([id])=>!['q072_artisan','q072_priest'].includes(id)))};
const accepted=data.previousQuestRoutes.q072;
const acceptedData={...oldData,quests:{...oldData.quests,q072:accepted},scripts:{...oldData.scripts,...accepted.scripts}};
// Two approaches, zero to two repeat consultations, and two ways out; plus direct heating and disposal.
export const q072Routes=[
 {path:['heat','keep'],outcome:'compromise'},
 {path:['discard','finish'],outcome:'contract'},
 ...[false,true].flatMap(heated=>[0,1,2].flatMap(loops=>[
  {path:[...(heated?['heat','change']:['oil']),...Array.from({length:loops},()=>['heat','change']).flat(),'separate','finish'],outcome:'informed'},
  {path:[...(heated?['heat','change']:['oil']),...Array.from({length:loops},()=>['heat','change']).flat(),'heat','keep'],outcome:'compromise'}
 ]))
];
export const q072PreviousRoutes=q072Routes.filter(r=>r.path[0]!=='heat'||r.path[1]!=='change');
export const q072AcceptedRoutes=[
 {path:['heat','keep'],outcome:'compromise'},{path:['discard'],outcome:'contract'},
 {path:['oil','separate'],outcome:'informed'},{path:['oil','heat'],outcome:'compromise'},
 {path:['heat','change','separate'],outcome:'informed'},{path:['heat','change','heat'],outcome:'compromise'}
];
export const q072Cast=scene=>scene==='oil'?['q072_artisan','q072_priest']:[];
export const q072LegacyScene=g=>g.state.flags.flow?.q072?.node??g.state.flags.quest?.q072?.node;
export function loadQ072(raw){
 const g=new GameEngine(data);g.random=()=>.999999;g.load(raw);
 const expected=JSON.parse(raw),s=expected.state.stories.q072;
 if(!s)(expected.state.flags.legacyStoryRoutes??={}).q072=true;
 else if(s.revision===1){
  if(s.values.oilSampleAt==='entry'&&(s.events.includes('entry_heat')||(expected.state.journey?.quest==='q072'&&expected.state.journey.action==='entry_heat')))s.values.oilSampleAt='party';
  s.revision=2;s.values.artisanPersonAt='oilshop';s.values.priestPersonAt='oilshop';
 }
 assert.deepEqual(JSON.parse(g.save()),expected);checkpoint(g);return g;
}
const starts=new Map();
export function q072Engine({legacy=false}={}){
 const content=legacy?oldData:data;
 if(!starts.has(legacy)){
  const base=ready(),g=legacy?new GameEngine(content):base;
  if(legacy)g.load(base.save());g.random=()=>.999999;start(g,'q072');starts.set(legacy,g.save());
 }
 const g=new GameEngine(content);g.random=()=>.999999;g.load(starts.get(legacy));return g;
}
export function q072AcceptedEngine(){
 const g=new GameEngine(acceptedData);g.load(ready().save());g.random=()=>.999999;
 go(g,{kind:'town',location:'salome_board'});assert.ok(g.accept('q072'));
 const p=accepted.locations.find(p=>p.role==='decision')??accepted.locations[0];
 go(g,{kind:'dungeon',dungeon:'region_8',map:p.map,x:p.x,y:p.y});g.run(accepted.model.entryScript);drain(g);return g;
}
export const chooseQ072=(g,id)=>choose(g,'q072',id);
export function departQ072(g,id){assert.ok(g.dispatch({type:'choose',id}),g.state.notice);drain(g);assert.ok(g.state.journey);loadQ072(g.save());}
export function arriveQ072(g){const a=g.data.quests.q072.story.actions[g.state.journey.action];go(g,g.data.quests.q072.story.worldPlaces[a.journey.to]);drain(g);assert.equal(g.state.journey,null);checkpoint(g);}
export async function oilBaptismArtFixtures(){
 const fixtures=[],outcomes=new Set(),available={entry:'oil',warm:'keep',oil:'separate',changed:'finish',discarded:'finish'};
 for(const legacy of [false,true]){
  const seen=new Set(),generation=legacy?'previous':'current';
  for(const route of legacy?q072PreviousRoutes:q072Routes){
   const g=q072Engine({legacy}),observe=()=>{
    if(g.state.quests.q072.stage==='completed')return;
    const s=g.state.stories.q072,scene=s.scene;
    const variant=generation+'-'+(s.values.heated?'heated':'cold')+'-'+s.values.oilSampleAt;
    if(seen.has(scene+'/'+variant))return;seen.add(scene+'/'+variant);
    const save=g.save(),cast=q072Cast(scene);assert.deepEqual(projectGame(loadQ072(save)).dialog.scene.cast.map(c=>c.id),cast);
    fixtures.push({edition:'e2',quest:'q072',scene,variant,cast,textOnlyCast:cast,save,expectedText:projectGame(g).dialog.text,availableChoice:available[scene]});
   };
   observe();for(const id of route.path){chooseQ072(g,id);observe();}
   assert.equal(g.state.quests.q072.outcome,route.outcome);outcomes.add('e2/q072/'+route.outcome);
  }
 }
 const seen=new Set();
 for(const route of q072AcceptedRoutes){
  const g=loadQ072(q072AcceptedEngine().save()),observe=()=>{
   if(g.state.quests.q072.stage==='completed')return;const scene=q072LegacyScene(g);assert.ok(scene);
   if(seen.has(scene))return;seen.add(scene);assert.equal(projectGame(loadQ072(g.save())).dialog.scene,undefined);
   fixtures.push({edition:'e2',quest:'q072',scene,variant:'accepted',cast:[],absentStoryScene:true,save:g.save(),expectedText:projectGame(g).dialog.text,availableChoice:scene==='entry'?'oil':scene==='warm'?'keep':'separate'});
  };
  observe();for(const id of route.path){assert.ok(g.dispatch({type:'choose',id}));drain(g);observe();}
  assert.equal(g.state.quests.q072.outcome,route.outcome);
 }
 return {fixtures,outcomes:[...outcomes]};
}
