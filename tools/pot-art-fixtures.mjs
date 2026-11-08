import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {data,ready,start,choose,checkpoint,go,drain} from '../tests/royal-helpers.mjs';
import {read} from './audit-regional-relocation.mjs';
export const previousQ184=await read('tests/fixtures/e2-q184-before-cast.json');
export const previousQ184Data={...data,quests:{...data.quests,q184:previousQ184},scripts:{...data.scripts,...previousQ184.scripts},characters:Object.fromEntries(Object.entries(data.characters).filter(([id])=>!id.startsWith('q184_')))};
const accepted=data.previousQuestRoutes.q184,acceptedData={...previousQ184Data,quests:{...previousQ184Data.quests,q184:accepted},scripts:{...previousQ184Data.scripts,...accepted.scripts}};
export const q184Routes=[{path:['take','finish'],outcome:'take'},{path:['other','carry','return','finish'],outcome:'other'},{path:['joint','other','carry','return','finish'],outcome:'other'},{path:['joint','agree','invite','escort','finish'],outcome:'joint'}];
export const q184AcceptedRoutes=[{path:['take'],outcome:'take'},{path:['other'],outcome:'other'},{path:['joint','other'],outcome:'other'},{path:['joint','agree'],outcome:'joint'}];
export const q184People={entry:['jarl','prisoners'],joint:['jarl','supervisor'],taken:['cook'],checked:['jarl','supervisor'],invite:['jarl','supervisor','cook'],joint_cooking:['jarl','supervisor','cook'],spare:['jarl'],swap:['jarl'],parallel:['cook']};
export const q184Cast=scene=>(q184People[scene]??[]).map(id=>'q184_'+id);
export function expectedQ184Save(raw){const saved=JSON.parse(raw);if(!saved.state.stories.q184)(saved.state.flags.legacyStoryRoutes??={}).q184=true;return saved;}
export function loadQ184(raw){const g=new GameEngine(data);g.load(raw);assert.deepEqual(JSON.parse(g.save()),expectedQ184Save(raw));checkpoint(g);return g;}
export function q184Engine({legacy=false}={}){const base=ready(),g=legacy?new GameEngine(previousQ184Data):base;if(legacy)g.load(base.save());g.random=()=>.999999;start(g,'q184');return g;}
export function q184AcceptedEngine(){const g=new GameEngine(acceptedData);g.load(ready().save());g.random=()=>.999999;go(g,{kind:'town',location:'royal_board'});assert.ok(g.accept('q184'));const p=accepted.locations.find(p=>p.role==='decision')??accepted.locations[0];go(g,{kind:'dungeon',dungeon:'region_9',map:p.map,x:p.x,y:p.y});g.run(accepted.model.entryScript??'q184.visit');drain(g);return g;}
export async function potArtFixtures(){
 const fixtures=[],outcomes=new Set();
 for(const legacy of [false,true]){const seen=new Set();for(const route of q184Routes){const g=q184Engine({legacy}),observe=()=>{
  const scene=g.state.stories.q184.scene;if(g.state.quests.q184.stage==='completed')return;const detail=scene==='spare'?'-'+g.state.stories.q184.values.ingredientsAt:'',key=scene+detail;if(seen.has(key))return;seen.add(key);
  const save=g.save(),now=loadQ184(save),cast=q184Cast(scene);assert.deepEqual(projectGame(now).dialog.scene.cast.map(c=>c.id),cast);
  fixtures.push({edition:'e2',quest:'q184',scene,variant:(legacy?'previous':'current')+detail,cast,textOnlyCast:cast,save,expectedText:projectGame(g).dialog.text,availableChoice:{entry:'joint',joint:'agree',taken:'finish',checked:'invite',invite:'escort',joint_cooking:'finish',spare:'carry',swap:'return',parallel:'finish'}[scene]});
 };observe();for(const id of route.path){choose(g,'q184',id);observe();}assert.equal(g.state.quests.q184.outcome,route.outcome);outcomes.add('e2/q184/'+route.outcome);}assert.equal(seen.size,10);}
 const seen=new Set();for(const route of q184AcceptedRoutes){const g=q184AcceptedEngine(),observe=()=>{if(g.state.quests.q184.stage==='completed')return;const scene=g.state.flags.quest.q184.node;if(seen.has(scene))return;seen.add(scene);const now=loadQ184(g.save());assert.equal(now.state.stories.q184,undefined);assert.equal(projectGame(now).dialog.scene,undefined);fixtures.push({edition:'e2',quest:'q184',scene,variant:'accepted-legacy',cast:[],absentStoryScene:true,save:now.save(),expectedText:projectGame(g).dialog.text,availableChoice:scene==='entry'?'joint':'agree'});};observe();for(const id of route.path){assert.ok(g.dispatch({type:'choose',id}));drain(g);observe();}assert.equal(g.state.quests.q184.outcome,route.outcome);}assert.equal(seen.size,2);
 return{fixtures,outcomes:[...outcomes]};
}
