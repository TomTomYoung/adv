import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {data,ready,start,choose,checkpoint,go,drain,read} from '../tests/library-helpers.mjs';

export const previousQ149=await read('tests/fixtures/e2-q149-before-cast.json');
export const previousQ149Data={...data,quests:{...data.quests,q149:previousQ149},scripts:{...data.scripts,...previousQ149.scripts},characters:Object.fromEntries(Object.entries(data.characters).filter(([id])=>!['q149_farmer','q149_collector','q149_smithPerson'].includes(id)))};
const accepted=data.previousQuestRoutes.q149;
const acceptedData={...previousQ149Data,quests:{...previousQ149Data.quests,q149:accepted},scripts:{...previousQ149Data.scripts,...accepted.scripts}};
export const q149Routes=[
 {path:['carry','collector','finish'],accepted:['collector'],outcome:'collector',fee:0},
 {path:['carry','withdraw','finish'],accepted:['withdraw'],outcome:'withdraw',fee:0},
 {path:['carry','user','pay','continue','finish'],accepted:['user','pay'],outcome:'user',fee:40},
 {path:['carry','user','collector','finish'],accepted:['user','collector'],outcome:'collector',fee:0},
 {path:['carry','user','withdraw','finish'],accepted:['user','withdraw'],outcome:'withdraw',fee:0}
];
export const q149Cast=scene=>({entry:[],auction:['q149_farmer'],user:['q149_farmer','q149_smithPerson'],user_pay_ready:['q149_farmer','q149_smithPerson'],sold:['q149_farmer','q149_collector'],delivered:['q149_farmer'],withdrawn:[]})[scene];
export const q149LegacyScene=g=>g.state.flags.flow?.q149?.node??g.state.flags.quest?.q149?.node;
export function loadQ149(raw){
 const g=new GameEngine(data);g.random=()=>.999999;g.load(raw);
 const expected=JSON.parse(raw),s=expected.state.stories.q149;
 if(!s)(expected.state.flags.legacyStoryRoutes??={}).q149=true;
 else if(s.revision===1){s.revision=2;s.values.smithPersonAt='smith';}
 assert.deepEqual(JSON.parse(g.save()),expected);checkpoint(g);return g;
}
export function q149Engine({legacy=false}={}){
 const base=ready(),g=legacy?new GameEngine(previousQ149Data):base;
 if(legacy)g.load(base.save());g.random=()=>.999999;start(g,'q149');return g;
}
export function q149AcceptedEngine(){
 const g=new GameEngine(acceptedData);g.load(ready().save());g.random=()=>.999999;
 go(g,{kind:'town',location:'salome_board'});assert.ok(g.accept('q149'));
 const p=accepted.locations.find(p=>p.role==='decision')??accepted.locations[0];
 go(g,{kind:'dungeon',dungeon:'region_5',map:p.map,x:p.x,y:p.y});
 g.run(accepted.model.entryScript??'q149.visit');drain(g);return g;
}
export const chooseQ149=(g,id)=>choose(g,'q149',id);
export async function unsoldSwordArtFixtures(){
 const fixtures=[],outcomes=new Set();
 const available={entry:'carry',auction:'user',user:'pay',user_pay_ready:'continue',sold:'finish',delivered:'finish',withdrawn:'finish'};
 for(const legacy of [false,true]){
  const seen=new Set(),generation=legacy?'previous':'current';
  for(const route of q149Routes){
   const g=q149Engine({legacy}),observe=()=>{
    if(g.state.quests.q149.stage==='completed')return;
    const s=g.state.stories.q149,scene=s.scene,variant=generation+'-'+s.values.farmerAt+'-'+(s.values.costPaid?'paid':'unpaid');
    if(seen.has(scene+'/'+variant))return;seen.add(scene+'/'+variant);
    const save=g.save(),now=loadQ149(save),cast=q149Cast(scene);
    assert.deepEqual(projectGame(now).dialog.scene.cast.map(c=>c.id),cast);
    fixtures.push({edition:'e2',quest:'q149',scene,variant,cast,textOnlyCast:cast,save,expectedText:projectGame(g).dialog.text,availableChoice:available[scene]});
   };
   observe();for(const id of route.path){chooseQ149(g,id);observe();}
   assert.equal(g.state.quests.q149.outcome,route.outcome);outcomes.add('e2/q149/'+route.outcome);
  }
  const g=q149Engine({legacy});chooseQ149(g,'carry');chooseQ149(g,'user');g.state.gold=39;const save=g.save();loadQ149(save);
  fixtures.push({edition:'e2',quest:'q149',scene:'user',variant:generation+'-shortage',cast:q149Cast('user'),textOnlyCast:q149Cast('user'),save,expectedText:projectGame(g).dialog.text,blockedChoice:'pay',availableChoice:'collector'});
 }
 const seen=new Set();
 for(const route of q149Routes){
  const g=loadQ149(q149AcceptedEngine().save()),observe=()=>{
   if(g.state.quests.q149.stage==='completed')return;
   const scene=q149LegacyScene(g);assert.ok(scene);
   if(seen.has(scene))return;seen.add(scene);
   assert.equal(projectGame(loadQ149(g.save())).dialog.scene,undefined);
   fixtures.push({edition:'e2',quest:'q149',scene,variant:'accepted',cast:[],absentStoryScene:true,save:g.save(),expectedText:projectGame(g).dialog.text,availableChoice:scene==='entry'?'user':'collector'});
  };
  observe();for(const id of route.accepted){assert.ok(g.dispatch({type:'choose',id}));drain(g);observe();}
  assert.equal(g.state.quests.q149.outcome,route.outcome);
 }
 return {fixtures,outcomes:[...outcomes]};
}
