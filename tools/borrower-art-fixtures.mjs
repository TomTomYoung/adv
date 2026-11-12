import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {data,ready,start,choose,checkpoint,go,drain,read} from '../tests/library-helpers.mjs';
export const previousQ041=await read('tests/fixtures/e2-q041-before-cast.json');
export const previousQ041Data={...data,quests:{...data.quests,q041:previousQ041},scripts:{...data.scripts,...previousQ041.scripts},characters:Object.fromEntries(Object.entries(data.characters).filter(([id])=>!id.startsWith('q041_')))};
const accepted=data.previousQuestRoutes.q041,acceptedData={...previousQ041Data,quests:{...previousQ041Data.quests,q041:accepted},scripts:{...previousQ041Data.scripts,...accepted.scripts}};
export const q041Routes=[
 {path:['recover','finish'],outcome:'contract'},
 {path:['visit','deadline','return','finish'],outcome:'compromise'},
 {path:['visit','registry','escort','temporary','return','finish'],outcome:'compromise'},
 {path:['visit','registry','escort','rewrite','finish'],outcome:'informed'}
];
export const q041AcceptedRoutes=[{path:['recover'],outcome:'contract'},{path:['visit','deadline'],outcome:'compromise'},{path:['visit','registry','temporary'],outcome:'compromise'},{path:['visit','registry','rewrite'],outcome:'informed'}];
export const q041People={entry:[],resident:['borrower'],clerk:['borrower','clerk'],recovered:[],invite:['clerk'],collect:['borrower'],returned:['borrower'],registered:['borrower','clerk']};
export const q041Cast=scene=>(q041People[scene]??[]).map(id=>'q041_'+id);
export function loadQ041(raw){const g=new GameEngine(data);g.random=()=>.999999;g.load(raw);const expected=JSON.parse(raw);if(!expected.state.stories.q041)(expected.state.flags.legacyStoryRoutes??={}).q041=true;assert.deepEqual(JSON.parse(g.save()),expected);checkpoint(g);return g;}
export function q041Engine({legacy=false}={}){const base=ready(),g=legacy?new GameEngine(previousQ041Data):base;if(legacy)g.load(base.save());g.random=()=>.999999;start(g,'q041');return g;}
export function q041AcceptedEngine(){const g=new GameEngine(acceptedData);g.load(ready().save());g.random=()=>.999999;go(g,{kind:'town',location:'salome_board'});assert.ok(g.accept('q041'));const p=accepted.locations.find(p=>p.role==='decision')??accepted.locations[0];go(g,{kind:'dungeon',dungeon:'region_5',map:p.map,x:p.x,y:p.y});g.run(accepted.model.entryScript??'q041.visit');drain(g);return g;}
export const chooseQ041=(g,id)=>choose(g,'q041',id);
export async function borrowerArtFixtures(){
 const fixtures=[],outcomes=new Set();
 for(const legacy of [false,true]){const seen=new Set();for(const route of q041Routes){const g=q041Engine({legacy}),observe=()=>{
  const s=g.state.stories.q041,scene=s.scene;if(g.state.quests.q041.stage==='completed')return;
  const variant=(legacy?'previous':'current')+(['collect','returned'].includes(scene)?'-clerk-'+s.values.clerkAt:'');
  const key=scene+'/'+variant;if(seen.has(key))return;seen.add(key);
  const save=g.save(),now=loadQ041(save),cast=q041Cast(scene);assert.deepEqual(projectGame(now).dialog.scene.cast.map(c=>c.id),cast);
  fixtures.push({edition:'e2',quest:'q041',scene,variant,cast,textOnlyCast:cast,save,expectedText:projectGame(g).dialog.text,
   availableChoice:{entry:'visit',resident:'deadline',clerk:'rewrite',recovered:'finish',invite:'escort',collect:'return',returned:'finish',registered:'finish'}[scene]});
 };observe();for(const id of route.path){chooseQ041(g,id);observe();}assert.equal(g.state.quests.q041.outcome,route.outcome);outcomes.add('e2/q041/'+route.outcome);}}
 const seen=new Set();for(const route of q041AcceptedRoutes){const g=loadQ041(q041AcceptedEngine().save()),observe=()=>{if(g.state.quests.q041.stage==='completed')return;const scene=g.state.flags.flow?.q041?.node??g.state.flags.quest?.q041?.node;if(seen.has(scene))return;seen.add(scene);const now=loadQ041(g.save());assert.equal(projectGame(now).dialog.scene,undefined);fixtures.push({edition:'e2',quest:'q041',scene,variant:'accepted-legacy',cast:[],absentStoryScene:true,save:now.save(),expectedText:projectGame(g).dialog.text,availableChoice:{entry:'visit',resident:'deadline',clerk:'rewrite'}[scene]});};observe();for(const id of route.path){assert.ok(g.dispatch({type:'choose',id}));drain(g);observe();}assert.equal(g.state.quests.q041.outcome,route.outcome);}
 return{fixtures,outcomes:[...outcomes]};
}
