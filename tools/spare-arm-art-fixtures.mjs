import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {data,ready,start,choose,go,drain,checkpoint,read} from '../tests/machine-helpers.mjs';
export const previousQ073=await read('tests/fixtures/e2-q073-before-cast.json');
export const previousQ073Data={...data,quests:{...data.quests,q073:previousQ073},scripts:{...data.scripts,...previousQ073.scripts},characters:Object.fromEntries(Object.entries(data.characters).filter(([id])=>id!=='q073_artisan'))};
const accepted=data.previousQuestRoutes.q073;
const acceptedData={...previousQ073Data,quests:{...previousQ073Data.quests,q073:accepted},scripts:{...previousQ073Data.scripts,...accepted.scripts}};
// Bound repeat consultations to zero, one and two loops; do not claim all loop counts.
export const q073Routes=[
 {path:['take','finish'],accepted:['take'],outcome:'contract'},
 {path:['brace','carry','recover','deliver','finish'],accepted:['brace','recover'],outcome:'informed'},
 ...[false,true].flatMap(braced=>[0,1,2].flatMap(loops=>['return','recover'].map(end=>({
  path:[...(braced?['brace','carry','one']:['borrow']),...Array.from({length:loops},()=>['support','one']).flat(),...(end==='return'?['return','finish']:['support','recover','deliver','finish'])],
  accepted:[...(braced?['brace','one']:['borrow']),...Array.from({length:loops},()=>['support','one']).flat(),...(end==='return'?['return']:['support','recover'])],
  outcome:end==='return'?'compromise':'informed',braced,loops
 }))))
];
export const q073Cast=scene=>['copy','brace','recovered','taken'].includes(scene)?['q073_artisan']:[];
export const q073LegacyScene=g=>g.state.flags.flow?.q073?.node??g.state.flags.quest?.q073?.node;
export function loadQ073(raw){
 const g=new GameEngine(data);g.random=()=>.999999;g.load(raw);
 const expected=JSON.parse(raw),s=expected.state.stories.q073;
 if(!s)(expected.state.flags.legacyStoryRoutes??={}).q073=true;
 else if(s.revision===1){s.revision=2;s.values.artisanPersonAt='smith';}
 assert.deepEqual(JSON.parse(g.save()),expected);checkpoint(g);return g;
}
const starts=new Map();
export function q073Engine({legacy=false}={}){
 const content=legacy?previousQ073Data:data;
 if(!starts.has(legacy)){
  const base=ready(),g=legacy?new GameEngine(content):base;
  if(legacy)g.load(base.save());g.random=()=>.999999;start(g,'q073');starts.set(legacy,g.save());
 }
 const g=new GameEngine(content);g.random=()=>.999999;g.load(starts.get(legacy));return g;
}
export function q073AcceptedEngine(){
 const g=new GameEngine(acceptedData);g.load(ready().save());g.random=()=>.999999;
 go(g,{kind:'town',location:'salome_board'});assert.ok(g.accept('q073'));
 const p=accepted.locations.find(p=>p.role==='decision')??accepted.locations[0];
 go(g,{kind:'dungeon',dungeon:'region_8',map:p.map,x:p.x,y:p.y});g.run(accepted.model.entryScript);drain(g);return g;
}
export const chooseQ073=(g,id)=>choose(g,'q073',id);
export function departQ073(g,id){assert.ok(g.dispatch({type:'choose',id}),g.state.notice);drain(g);assert.ok(g.state.journey);loadQ073(g.save());}
export function arriveQ073(g){const a=g.data.quests.q073.story.actions[g.state.journey.action];go(g,g.data.quests.q073.story.worldPlaces[a.journey.to]);drain(g);assert.equal(g.state.journey,null);checkpoint(g);}
export async function spareArmArtFixtures(){
 const fixtures=[],outcomes=new Set(),available={entry:'brace',support:'recover',copy:'return',brace:'carry',returned:'finish',tested:'deliver',recovered:'finish',taken:'finish'};
 for(const legacy of [false,true]){
  const seen=new Set(),generation=legacy?'previous':'current';
  for(const route of q073Routes){
   const g=q073Engine({legacy}),observe=()=>{
    if(g.state.quests.q073.stage==='completed')return;
    const s=g.state.stories.q073,scene=s.scene,variant=generation+'-'+(s.values.supported?'supported':'bare')+'-'+s.values.armAt;
    if(seen.has(scene+'/'+variant))return;seen.add(scene+'/'+variant);
    const save=g.save(),cast=q073Cast(scene);assert.deepEqual(projectGame(loadQ073(save)).dialog.scene.cast.map(c=>c.id),cast);
    fixtures.push({edition:'e2',quest:'q073',scene,variant,cast,textOnlyCast:cast,save,expectedText:projectGame(g).dialog.text,availableChoice:available[scene]});
   };
   observe();for(const id of route.path){chooseQ073(g,id);observe();}
   assert.equal(g.state.quests.q073.outcome,route.outcome);outcomes.add('e2/q073/'+route.outcome);
  }
 }
 const seen=new Set();
 for(const route of q073Routes){
  const g=loadQ073(q073AcceptedEngine().save()),observe=()=>{
   if(g.state.quests.q073.stage==='completed')return;const scene=q073LegacyScene(g);assert.ok(scene);
   if(seen.has(scene))return;seen.add(scene);assert.equal(projectGame(loadQ073(g.save())).dialog.scene,undefined);
   fixtures.push({edition:'e2',quest:'q073',scene,variant:'accepted',cast:[],absentStoryScene:true,save:g.save(),expectedText:projectGame(g).dialog.text,availableChoice:scene==='entry'?'brace':scene==='support'?'recover':'return'});
  };
  observe();for(const id of route.accepted){assert.ok(g.dispatch({type:'choose',id}));drain(g);observe();}
  assert.equal(g.state.quests.q073.outcome,route.outcome);
 }
 return {fixtures,outcomes:[...outcomes]};
}
