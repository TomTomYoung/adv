import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {data,ready,start,choose,checkpoint,go,drain} from '../tests/royal-helpers.mjs';
import {read} from './audit-regional-relocation.mjs';
export const previousQ189=await read('tests/fixtures/e2-q189-before-cast.json');
export const previousQ189Data={...data,quests:{...data.quests,q189:previousQ189},scripts:{...data.scripts,...previousQ189.scripts},characters:Object.fromEntries(Object.entries(data.characters).filter(([id])=>!id.startsWith('q189_')))};
const accepted=data.previousQuestRoutes.q189,acceptedData={...previousQ189Data,quests:{...previousQ189Data.quests,q189:accepted},scripts:{...previousQ189Data.scripts,...accepted.scripts}};
export const q189Routes=[
 {path:['book','public','report','finish'],outcome:'explain'},
 {path:['private','finish'],outcome:'private'},
 {path:['book','private','escort','finish'],outcome:'private'},
 ...['hold','ban'].map(outcome=>({path:[outcome,'finish'],outcome}))
];
export const q189AcceptedRoutes=[{path:['book','public'],outcome:'explain'},{path:['book','private'],outcome:'private'},...['private','hold','ban'].map(outcome=>({path:[outcome],outcome}))];
export const q189People={entry:['asa','refugees','warden'],explain:[],explanation:['asa','refugees','warden'],explained:['warden'],private_permission:['asa','refugees','warden'],private_room:['asa','refugees'],hold_record:['warden'],ban_record:['warden']};
export const q189Cast=scene=>(q189People[scene]??[]).map(id=>'q189_'+id);
export function expectedQ189Save(raw){const expected=JSON.parse(raw),s=expected.state.stories.q189;if(s){s.revision=2;s.values.asaAt=s.values.refugeesAt;}else(expected.state.flags.legacyStoryRoutes??={}).q189=true;return expected;}
export function loadQ189(raw){const g=new GameEngine(data);g.load(raw);assert.deepEqual(JSON.parse(g.save()),expectedQ189Save(raw));checkpoint(g);return g;}
export function q189Engine({legacy=false}={}){const base=ready(),g=legacy?new GameEngine(previousQ189Data):base;if(legacy)g.load(base.save());g.random=()=>.999999;start(g,'q189');return g;}
export function q189AcceptedEngine(){const g=new GameEngine(acceptedData);g.load(ready().save());g.random=()=>.999999;go(g,{kind:'town',location:'royal_board'});assert.ok(g.accept('q189'));const p=accepted.locations.find(p=>p.role==='decision')??accepted.locations[0];go(g,{kind:'dungeon',dungeon:'region_9',map:p.map,x:p.x,y:p.y});g.run(accepted.model.entryScript??'q189.visit');drain(g);return g;}
export const chooseQ189=(g,id)=>choose(g,'q189',id);
export async function lullabyArtFixtures(){
 const fixtures=[],outcomes=new Set();
 for(const legacy of [false,true]){const seen=new Set();for(const route of q189Routes){const g=q189Engine({legacy}),observe=()=>{
  const scene=g.state.stories.q189.scene;if(g.state.quests.q189.stage==='completed'||seen.has(scene))return;seen.add(scene);
  const save=g.save(),now=loadQ189(save),cast=q189Cast(scene);assert.deepEqual(projectGame(now).dialog.scene.cast.map(c=>c.id),cast);
  fixtures.push({edition:'e2',quest:'q189',scene,variant:legacy?'previous':'current',cast,textOnlyCast:cast,save,expectedText:projectGame(g).dialog.text,
   availableChoice:{entry:'book',explain:'public',explanation:'report',explained:'finish',private_permission:'escort',private_room:'finish',hold_record:'finish',ban_record:'finish'}[scene]});
 };observe();for(const id of route.path){chooseQ189(g,id);observe();}assert.equal(g.state.quests.q189.outcome,route.outcome);outcomes.add('e2/q189/'+route.outcome);}}
 const seen=new Set();for(const route of q189AcceptedRoutes){const g=loadQ189(q189AcceptedEngine().save()),observe=()=>{if(g.state.quests.q189.stage==='completed')return;const scene=g.state.flags.quest.q189.node;if(seen.has(scene))return;seen.add(scene);const now=loadQ189(g.save());assert.equal(projectGame(now).dialog.scene,undefined);fixtures.push({edition:'e2',quest:'q189',scene,variant:'accepted-legacy',cast:[],absentStoryScene:true,save:now.save(),expectedText:projectGame(g).dialog.text,availableChoice:scene==='explain'?'public':'book'});};observe();for(const id of route.path){assert.ok(g.dispatch({type:'choose',id}));drain(g);observe();}assert.equal(g.state.quests.q189.outcome,route.outcome);}
 return{fixtures,outcomes:[...outcomes]};
}
