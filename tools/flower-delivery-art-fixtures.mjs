import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {data,ready,start,choose,checkpoint,go,drain,read} from '../tests/library-helpers.mjs';

export const previousQ147=await read('tests/fixtures/e2-q147-before-cast.json');
export const previousQ147Data={...data,quests:{...data.quests,q147:previousQ147},scripts:{...data.scripts,...previousQ147.scripts},characters:Object.fromEntries(Object.entries(data.characters).filter(([id])=>id!=='q147_recipient'))};
const accepted=data.previousQuestRoutes.q147;
const acceptedData={...previousQ147Data,quests:{...previousQ147Data.quests,q147:accepted},scripts:{...previousQ147Data.scripts,...accepted.scripts}};
export const q147Routes=[
 {path:['water','deliver','finish'],accepted:['water'],outcome:'quiet',fee:0},
 {path:['car','continue','deliver','finish'],accepted:['car'],outcome:'quiet',fee:30},
 {path:['run','deliver','tomorrow','next','finish'],accepted:['run','tomorrow'],outcome:'tomorrow',fee:0},
 {path:['run','deliver','record','finish'],accepted:['run','record'],outcome:'record',fee:0}
];
export const q147Cast=scene=>['closed','quiet_arrival','tomorrow_arrival'].includes(scene)?['q147_recipient']:[];
export const q147LegacyScene=g=>g.state.flags.flow?.q147?.node??g.state.flags.quest?.q147?.node;
export function loadQ147(raw){
 const g=new GameEngine(data);g.random=()=>.999999;g.load(raw);
 const expected=JSON.parse(raw),s=expected.state.stories.q147;
 if(!s)(expected.state.flags.legacyStoryRoutes??={}).q147=true;
 else if(s.revision===1){s.revision=2;s.values.recipientAt='receiver';}
 assert.deepEqual(JSON.parse(g.save()),expected);checkpoint(g);return g;
}
export function q147Engine({legacy=false}={}){
 const base=ready(),g=legacy?new GameEngine(previousQ147Data):base;
 if(legacy)g.load(base.save());g.random=()=>.999999;start(g,'q147');return g;
}
export function q147AcceptedEngine(){
 const g=new GameEngine(acceptedData);g.load(ready().save());g.random=()=>.999999;
 go(g,{kind:'town',location:'salome_board'});assert.ok(g.accept('q147'));
 const p=accepted.locations.find(p=>p.role==='decision')??accepted.locations[0];
 go(g,{kind:'dungeon',dungeon:'region_5',map:p.map,x:p.x,y:p.y});
 g.run(accepted.model.entryScript??'q147.visit');drain(g);return g;
}
export const chooseQ147=(g,id)=>choose(g,'q147',id);
export async function flowerDeliveryArtFixtures(){
 const fixtures=[],outcomes=new Set();
 const available={entry:'water',entry_car_ready:'continue',mountain:'deliver',water:'deliver',car:'deliver',closed:'tomorrow',rest:'next',quiet_arrival:'finish',tomorrow_arrival:'finish',recorded:'finish'};
 for(const legacy of [false,true]){
  const seen=new Set(),generation=legacy?'previous':'current';
  for(const route of q147Routes){
   const g=q147Engine({legacy}),observe=()=>{
    if(g.state.quests.q147.stage==='completed')return;
    const s=g.state.stories.q147,scene=s.scene,variant=generation+'-'+s.values.deliveryMode;
    if(seen.has(scene+'/'+variant))return;seen.add(scene+'/'+variant);
    const save=g.save(),now=loadQ147(save),cast=q147Cast(scene);
    assert.deepEqual(projectGame(now).dialog.scene.cast.map(c=>c.id),cast);
    fixtures.push({edition:'e2',quest:'q147',scene,variant,cast,textOnlyCast:cast,save,expectedText:projectGame(g).dialog.text,availableChoice:available[scene]});
   };
   observe();for(const id of route.path){chooseQ147(g,id);observe();}
   assert.equal(g.state.quests.q147.outcome,route.outcome);outcomes.add('e2/q147/'+route.outcome);
  }
  const g=q147Engine({legacy});g.state.gold=29;const save=g.save();loadQ147(save);
  fixtures.push({edition:'e2',quest:'q147',scene:'entry',variant:generation+'-shortage',cast:[],textOnlyCast:[],save,expectedText:projectGame(g).dialog.text,blockedChoice:'car',availableChoice:'water'});
 }
 const seen=new Set();
 for(const route of q147Routes){
  const g=loadQ147(q147AcceptedEngine().save()),observe=()=>{
   if(g.state.quests.q147.stage==='completed')return;
   const scene=q147LegacyScene(g);assert.ok(scene);
   if(seen.has(scene))return;seen.add(scene);
   assert.equal(projectGame(loadQ147(g.save())).dialog.scene,undefined);
   fixtures.push({edition:'e2',quest:'q147',scene,variant:'accepted',cast:[],absentStoryScene:true,save:g.save(),expectedText:projectGame(g).dialog.text,availableChoice:scene==='entry'?'water':'tomorrow'});
  };
  observe();for(const id of route.accepted){assert.ok(g.dispatch({type:'choose',id}));drain(g);observe();}
  assert.equal(g.state.quests.q147.outcome,route.outcome);
 }
 return {fixtures,outcomes:[...outcomes]};
}
