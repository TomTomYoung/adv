import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {resolveBattle} from './audit-regional-relocation.mjs';
import {data,ready,start,choose,go,drain,checkpoint,read} from '../tests/machine-helpers.mjs';

export const previousQ074=await read('tests/fixtures/e2-q074-before-cast.json');
export const previousQ074Data={...data,quests:{...data.quests,q074:previousQ074},scripts:{...data.scripts,...previousQ074.scripts},characters:Object.fromEntries(Object.entries(data.characters).filter(([id])=>id!=='q074_yua'))};
const accepted=data.previousQuestRoutes.q074;
const acceptedData={...previousQ074Data,quests:{...previousQ074Data.quests,q074:accepted},scripts:{...previousQ074Data.scripts,...accepted.scripts}};
// The graph is acyclic: these are all nine decision routes, not just ending samples.
export const q074Routes=[
 {path:['cool','furnace','correct','correct','finish'],accepted:['cool','furnace','correct'],outcome:'informed'},
 {path:['heat','reset','furnace','correct','correct','finish'],accepted:['heat','reset','furnace','correct'],outcome:'informed'},
 {path:['manual','finish'],accepted:['manual'],outcome:'compromise'},
 {path:['heat','manual','finish'],accepted:['heat','manual'],outcome:'compromise'},
 {path:['cool','manual','finish'],accepted:['cool','manual'],outcome:'compromise'},
 {path:['heat','reset','manual','finish'],accepted:['heat','reset','manual'],outcome:'compromise'},
 {path:['cool','furnace','stop','finish'],accepted:['cool','furnace','stop'],outcome:'compromise'},
 {path:['heat','reset','furnace','stop','finish'],accepted:['heat','reset','furnace','stop'],outcome:'compromise'},
 {path:['force'],accepted:['force'],outcome:'contract'}
];
export const q074Cast=scene=>scene==='corrected'?['q074_yua']:[];
export const q074LegacyScene=g=>g.state.flags.flow?.q074?.node??g.state.flags.quest?.q074?.node;
export function loadQ074(raw){
 const g=new GameEngine(data);g.random=()=>.999999;g.load(raw);
 const expected=JSON.parse(raw),s=expected.state.stories.q074;
 if(!s)(expected.state.flags.legacyStoryRoutes??={}).q074=true;
 else if(s.revision===1){s.revision=2;s.values.yuaPersonAt='copy';}
 assert.deepEqual(JSON.parse(g.save()),expected);checkpoint(g);return g;
}
const starts=new Map();
export function q074Engine({legacy=false}={}){
 const content=legacy?previousQ074Data:data;
 if(!starts.has(legacy)){
  const base=ready(),g=legacy?new GameEngine(content):base;
  if(legacy)g.load(base.save());g.random=()=>.999999;start(g,'q074');starts.set(legacy,g.save());
 }
 const g=new GameEngine(content);g.random=()=>.999999;g.load(starts.get(legacy));return g;
}
export function q074AcceptedEngine(){
 const g=new GameEngine(acceptedData);g.load(ready().save());g.random=()=>.999999;
 go(g,{kind:'town',location:'salome_board'});assert.ok(g.accept('q074'));
 const p=accepted.locations.find(p=>p.role==='decision')??accepted.locations[0];
 go(g,{kind:'dungeon',dungeon:'region_8',map:p.map,x:p.x,y:p.y});g.run(accepted.model.entryScript);drain(g);return g;
}
export const chooseQ074=(g,id,options)=>choose(g,'q074',id,options);
export function departQ074(g,id){assert.ok(g.dispatch({type:'choose',id}),g.state.notice);drain(g);assert.ok(g.state.journey);loadQ074(g.save());}
export function arriveQ074(g){const a=g.data.quests.q074.story.actions[g.state.journey.action];go(g,g.data.quests.q074.story.worldPlaces[a.journey.to]);drain(g);assert.equal(g.state.journey,null);checkpoint(g);}
export function resolveQ074(g,result){g.random=()=>.5;resolveBattle(g,result);g.random=()=>.999999;}
export function returnQ074AfterLoss(g){go(g,g.data.quests.q074.story.worldPlaces.entry);assert.ok(g.dispatch({type:'story.resume',quest:'q074'}));drain(g);checkpoint(g);}
export async function prayerOrderArtFixtures(){
 const fixtures=[],outcomes=new Set(),available={entry:'cool',lock:'reset',furnace:'furnace',door:'correct',opened:'correct',corrected:'finish',manual:'finish'};
 for(const legacy of [false,true]){
  const generation=legacy?'previous':'current',seen=new Set();
  const observe=(g,suffix)=>{
   if(g.state.quests.q074.stage==='completed')return;
   const s=g.state.stories.q074,scene=s.scene,v=s.values,variant=generation+'-'+(suffix??[v.coolingOn?'cooled':'cold',v.furnaceOn?'firing':'stopped',v.failedTrial?'retried':'direct'].join('-'));
   if(seen.has(scene+'/'+variant))return;seen.add(scene+'/'+variant);
   const save=g.save(),cast=q074Cast(scene);assert.deepEqual(projectGame(loadQ074(save)).dialog.scene.cast.map(c=>c.id),cast);
   fixtures.push({edition:'e2',quest:'q074',scene,variant,cast,textOnlyCast:cast,save,expectedText:projectGame(g).dialog.text,availableChoice:available[scene]});
  };
  for(const route of q074Routes){const g=q074Engine({legacy});observe(g);for(const id of route.path){chooseQ074(g,id);observe(g);}assert.equal(g.state.quests.q074.outcome,route.outcome);outcomes.add('e2/q074/'+route.outcome);}
  const g=q074Engine({legacy});chooseQ074(g,'force',{combat:'pending'});resolveQ074(g,'lose');returnQ074AfterLoss(g);observe(g,'lose');
 }
 const seen=new Set();
 for(const route of q074Routes){
  const g=loadQ074(q074AcceptedEngine().save()),observe=()=>{
   if(g.state.quests.q074.stage==='completed')return;const scene=q074LegacyScene(g);assert.ok(scene);if(seen.has(scene))return;seen.add(scene);
   assert.equal(projectGame(loadQ074(g.save())).dialog.scene,undefined);
   fixtures.push({edition:'e2',quest:'q074',scene,variant:'accepted',cast:[],absentStoryScene:true,save:g.save(),expectedText:projectGame(g).dialog.text,availableChoice:scene==='entry'?'cool':scene==='lock'?'reset':scene==='furnace'?'furnace':'correct'});
  };
  observe();for(const id of route.accepted){assert.ok(g.dispatch({type:'choose',id}));drain(g);if(g.state.battle)resolveQ074(g,'win');observe();}
  assert.equal(g.state.quests.q074.outcome,route.outcome);
 }
 return {fixtures,outcomes:[...outcomes]};
}
