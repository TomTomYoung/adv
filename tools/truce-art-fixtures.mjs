import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {data,ready,start,choose,checkpoint,go,drain} from '../tests/royal-helpers.mjs';
import {read,resolveBattle} from './audit-regional-relocation.mjs';
export const previousQ186=await read('tests/fixtures/e2-q186-before-cast.json');
export const previousQ186Data={...data,quests:{...data.quests,q186:previousQ186},scripts:{...data.scripts,...previousQ186.scripts},characters:Object.fromEntries(Object.entries(data.characters).filter(([id])=>!id.startsWith('q186_')))};
const accepted=data.previousQuestRoutes.q186,acceptedData={...previousQ186Data,quests:{...previousQ186Data.quests,q186:accepted},scripts:{...previousQ186Data.scripts,...accepted.scripts}};
export const q186Routes=[
 {path:['visit','local','escort','return','finish'],outcome:'local'},
 {path:['visit','authority','limited','agree','escort','return','finish'],outcome:'local'},
 {path:['visit','break','battle','continue','escort','finish'],outcome:'battle'},
 {path:['visit','withdraw','report','finish'],outcome:'withdraw'},
 {path:['visit','authority','withdraw','report','finish'],outcome:'withdraw'},
 {path:['visit','break','withdraw','report','finish'],outcome:'withdraw'},
 {path:['visit','break','back','local','escort','return','finish'],outcome:'local'},
 ...['escape','lose'].map(result=>({path:['visit','break','battle','withdraw','report','finish'],outcome:'withdraw',battles:[result]})),
 {path:['visit','break','battle','battle','continue','escort','finish'],outcome:'battle',battles:['lose','win']},
 {path:['visit','break','battle','back','authority','limited','agree','escort','return','finish'],outcome:'local',battles:['lose']}
];
export const q186AcceptedRoutes=[
 {path:['local'],outcome:'local'}, {path:['authority','limited'],outcome:'local'},
 {path:['withdraw'],outcome:'withdraw'}, {path:['authority','withdraw'],outcome:'withdraw'},
 {path:['break'],outcome:'battle',result:'win'}, {path:['break'],outcome:'withdraw',result:'escape'}
];
export const q186People={parley:['communicator'],limited_offer:['communicator'],gather:['ours'],exchange:['ours','theirs'],local_done:['theirs'],secured:['captives'],battle_done:['captives']};
export const q186Cast=scene=>(q186People[scene]??[]).map(id=>'q186_'+id);
export function expectedQ186Save(raw){const s=JSON.parse(raw);if(!s.state.stories.q186)(s.state.flags.legacyStoryRoutes??={}).q186=true;return s;}
export function loadQ186(raw){const g=new GameEngine(data);g.load(raw);assert.deepEqual(JSON.parse(g.save()),expectedQ186Save(raw));checkpoint(g);return g;}
export function q186Engine({legacy=false}={}){const base=ready(),g=legacy?new GameEngine(previousQ186Data):base;if(legacy)g.load(base.save());g.random=()=>.999999;start(g,'q186');return g;}
export function q186AcceptedEngine(){const g=new GameEngine(acceptedData);g.load(ready().save());g.random=()=>.999999;go(g,{kind:'town',location:'royal_board'});assert.ok(g.accept('q186'));const p=accepted.locations.find(p=>p.role==='decision')??accepted.locations[0];go(g,{kind:'dungeon',dungeon:'region_9',map:p.map,x:p.x,y:p.y});g.run(accepted.model.entryScript??'q186.visit');drain(g);return g;}
export function resolveQ186(g,result,{observe=()=>{}}={}){
 delete g.random;resolveBattle(g,result);observe(g);checkpoint(g);g.random=()=>.999999;
 if(result==='lose'&&g.state.stories.q186){assert.equal(g.state.townLocation,'oddland_village');go(g,data.quests.q186.story.worldPlaces.gate);assert.ok(g.dispatch({type:'story.resume',quest:'q186'}));drain(g);observe(g);checkpoint(g);}
}
export function chooseQ186(g,id,{result='win'}={}){choose(g,'q186',id,{combat:'pending'});if(g.state.battle)resolveQ186(g,result);}
export async function truceArtFixtures(){
 const fixtures=[],outcomes=new Set();
 for(const legacy of [false,true]){const seen=new Set();for(const route of q186Routes){const g=q186Engine({legacy});let battles=0;const observe=()=>{
  const story=g.state.stories.q186,scene=story.scene;if(g.state.quests.q186.stage==='completed')return;
  const result=g.state.flags.relocatedBattleResult?.q186,failed=scene==='assault'&&['escape','lose'].includes(result),detail=(story.values.limited?'-limited':'')+(failed?'-'+result:''),key=scene+detail;if(seen.has(key))return;seen.add(key);
  const save=g.save(),now=loadQ186(save),cast=q186Cast(scene);assert.deepEqual(projectGame(now).dialog.scene.cast.map(c=>c.id),cast);
  fixtures.push({edition:'e2',quest:'q186',scene,variant:(legacy?'previous':'current')+detail,cast,textOnlyCast:cast,save,expectedText:projectGame(g).dialog.text,
   availableChoice:{entry:'visit',parley:'local',authority:'limited',limited_offer:'agree',gather:'escort',exchange:'return',local_done:'finish',assault:result==='escape'?'withdraw':'battle',assault_battle_ready:'continue',secured:'escort',battle_done:'finish',withdrawn:'report',withdraw_report:'finish'}[scene],
   ...(scene==='assault'&&result==='escape'?{blockedChoices:['battle','back']}:{})});
  };observe();for(const id of route.path){chooseQ186(g,id,{result:id==='battle'?(route.battles?.[battles++]??'win'):'win'});observe();}assert.equal(g.state.quests.q186.outcome,route.outcome);outcomes.add('e2/q186/'+route.outcome);}
 }
 const seen=new Set();for(const route of q186AcceptedRoutes){const g=loadQ186(q186AcceptedEngine().save()),observe=()=>{if(g.state.quests.q186.stage==='completed')return;const scene=g.state.flags.quest.q186.node;if(seen.has(scene))return;seen.add(scene);const now=loadQ186(g.save());assert.equal(projectGame(now).dialog.scene,undefined);fixtures.push({edition:'e2',quest:'q186',scene,variant:'accepted-legacy',cast:[],absentStoryScene:true,save:now.save(),expectedText:projectGame(g).dialog.text,availableChoice:scene==='authority'?'limited':'local'});};observe();for(const id of route.path){assert.ok(g.dispatch({type:'choose',id}));drain(g);if(g.state.battle)resolveQ186(g,route.result);observe();}assert.equal(g.state.quests.q186.outcome,route.outcome);}
 return{fixtures,outcomes:[...outcomes]};
}
