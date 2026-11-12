import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {data,ready,start,choose,checkpoint,go,drain} from '../tests/royal-helpers.mjs';
import {read,resolveBattle} from './audit-regional-relocation.mjs';
export const previousQ190=await read('tests/fixtures/e2-q190-before-cast.json');
export const previousQ190Data={...data,quests:{...data.quests,q190:previousQ190},scripts:{...data.scripts,...previousQ190.scripts},characters:Object.fromEntries(Object.entries(data.characters).filter(([id])=>!id.startsWith('q190_')))};
const accepted=data.previousQuestRoutes.q190,acceptedData={...previousQ190Data,quests:{...previousQ190Data.quests,q190:accepted},scripts:{...previousQ190Data.scripts,...accepted.scripts}};
export const q190Orders=[[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]];
const seals=order=>order.flatMap(i=>['site','site'+i,'seal','return']);
export const q190Routes=[
 {path:['battle','battle','continue','only'],outcome:'only'},
 {path:['evac','escort','finish'],outcome:'evac'},
 {path:['battle','evac','escort','finish'],outcome:'evac'},
 ...['escape','lose'].map(result=>({path:['battle','battle','evac','escort','finish'],outcome:'evac',result})),
 ...q190Orders.map(order=>({path:['battle','battle','continue',...seals(order),'store','return','collect','first','carry','carry','carry','finish'],outcome:'collect'})),
 {path:['battle','battle','continue','site','back','store','return',...seals([1,2,3]),'collect','first','carry','carry','carry','finish'],outcome:'collect'}
];
export const q190AcceptedRoutes=[
 {path:['battle','only'],outcome:'only'},
 {path:['battle','site','site','site','store','collect'],outcome:'collect'},
 {path:['evac'],outcome:'evac'},
 ...['escape','lose'].map(result=>({path:['battle'],outcome:'evac',result}))
];
export const q190People=scene=>['fuu',...(['entry','evac_ready','evacuated'].includes(scene)?['villagers']:[]),...(['collectors','collect1','collect2','collect3','collected'].includes(scene)?['collectors']:[])];
export const q190Cast=scene=>q190People(scene).map(id=>'q190_'+id);
export function expectedQ190Save(raw){const expected=JSON.parse(raw);if(!expected.state.stories.q190)(expected.state.flags.legacyStoryRoutes??={}).q190=true;return expected;}
export function loadQ190(raw){const g=new GameEngine(data);g.load(raw);assert.deepEqual(JSON.parse(g.save()),expectedQ190Save(raw));checkpoint(g);return g;}
export function q190Engine({legacy=false}={}){const base=ready(),g=legacy?new GameEngine(previousQ190Data):base;if(legacy)g.load(base.save());g.random=()=>.999999;start(g,'q190');return g;}
export function q190AcceptedEngine(){const g=new GameEngine(acceptedData);g.load(ready().save());g.random=()=>.999999;go(g,{kind:'town',location:'royal_board'});assert.ok(g.accept('q190'));const p=accepted.locations.find(p=>p.role==='decision')??accepted.locations[0];go(g,{kind:'dungeon',dungeon:'region_9',map:p.map,x:p.x,y:p.y});g.run(accepted.model.entryScript??'q190.visit');drain(g);return g;}
export function resolveQ190(g,result,{observe=()=>{}}={}){
 delete g.random;resolveBattle(g,result);observe(g);checkpoint(g);g.random=()=>.999999;
 if(result==='lose'&&g.state.stories.q190){assert.equal(g.state.townLocation,'oddland_village');assert.equal(g.state.stories.q190.values.fuuAt,'battle');go(g,data.quests.q190.story.worldPlaces.battle);assert.ok(g.dispatch({type:'story.resume',quest:'q190'}));drain(g);observe(g);checkpoint(g);}
}
export function chooseQ190(g,id,{result='win'}={}){choose(g,'q190',id,{combat:'pending'});if(g.state.battle)resolveQ190(g,result);}
function fixture(g,variant,extra={}){
 const scene=g.state.stories.q190.scene,v=g.state.stories.q190.values,failed=['escape','lose'].includes(g.state.flags.relocatedBattleResult?.q190),cast=q190Cast(scene),save=g.save(),now=loadQ190(save);
 assert.deepEqual(projectGame(now).dialog.scene.cast.map(c=>c.id),cast);
 const availableChoice=scene==='cleanup'?(v.sites===3&&v.store?'collect':'only'):scene==='select_site'?([1,2,3].find(i=>!v['sealed'+i])?'site'+[1,2,3].find(i=>!v['sealed'+i]):'back'):({entry:'battle',defend:failed?'evac':'battle',defend_battle_ready:'continue',evac_ready:'escort',evacuated:'finish',store_checked:'return',collectors:'first',collected:'finish'}[scene]??(scene.startsWith('sealed')?'return':scene.startsWith('site')?'seal':'carry'));
 const blockedChoices=[...(scene==='defend'&&failed?['battle']:[]),...(scene==='cleanup'&&!(v.sites===3&&v.store)?['collect']:[]),...(scene==='select_site'?[1,2,3].filter(i=>v['sealed'+i]).map(i=>'site'+i):[])];
 return{edition:'e2',quest:'q190',scene,variant,cast,textOnlyCast:cast,save,expectedText:projectGame(g).dialog.text,availableChoice,...(blockedChoices.length?{blockedChoices}:{}),...extra};
}
export async function postwarArtFixtures(){
 const fixtures=[],outcomes=new Set();
 for(const legacy of [false,true]){const variant=legacy?'previous':'current',seen=new Set(),gates=new Set(['0-false']);let partial=false;
  for(const route of q190Routes){const g=q190Engine({legacy}),observe=()=>{
   if(g.state.quests.q190.stage==='completed')return;const s=g.state.stories.q190,scene=s.scene,v=s.values;
   if(!seen.has(scene)){seen.add(scene);fixtures.push(fixture(g,variant));}
   if(scene==='cleanup'){const gate=v.sites+'-'+v.store;if(!gates.has(gate)){gates.add(gate);fixtures.push(fixture(g,variant+'-gate-'+gate));}}
   if(scene==='select_site'&&!partial&&v.sealed1&&v.sealed2&&!v.sealed3&&!v.store){partial=true;fixtures.push(fixture(g,variant+'-two-sealed'));}
  };observe();for(const id of route.path){chooseQ190(g,id,{result:route.result});observe();}assert.equal(g.state.quests.q190.outcome,route.outcome);outcomes.add('e2/q190/'+route.outcome);}
  assert.equal(seen.size,19);assert.equal(gates.size,8);assert.ok(partial);
  for(const result of ['escape','lose']){const g=q190Engine({legacy});chooseQ190(g,'battle');chooseQ190(g,'battle',{result});fixtures.push(fixture(g,variant+'-'+result));}
 }
 const seen=new Set();for(const route of q190AcceptedRoutes){const g=loadQ190(q190AcceptedEngine().save()),observe=()=>{
  if(g.state.quests.q190.stage==='completed')return;const scene=g.state.flags.quest.q190.node;if(seen.has(scene))return;seen.add(scene);const now=loadQ190(g.save());assert.equal(projectGame(now).dialog.scene,undefined);fixtures.push({edition:'e2',quest:'q190',scene,variant:'accepted-legacy',cast:[],absentStoryScene:true,save:now.save(),expectedText:projectGame(g).dialog.text,availableChoice:scene==='entry'?'evac':'only'});
 };observe();for(const id of route.path){assert.ok(g.dispatch({type:'choose',id}));drain(g);if(g.state.battle)resolveQ190(g,route.result??'win');observe();}assert.equal(g.state.quests.q190.outcome,route.outcome);}
 assert.equal(seen.size,2);return{fixtures,outcomes:[...outcomes]};
}
