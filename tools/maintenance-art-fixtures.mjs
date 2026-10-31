import assert from 'node:assert/strict';
import {loadContent} from '../src/core/loader.js';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {read} from '../tests/oddland-helpers.mjs';
import {data,ready,start,choose,checkpoint,go,drain} from '../tests/pilgrimage-helpers.mjs';
export const previousQ140=await read('tests/fixtures/e2-q140-before-cast.json');
export const previousQ140Data={...data,quests:{...data.quests,q140:previousQ140},scripts:{...data.scripts,...previousQ140.scripts},characters:Object.fromEntries(Object.entries(data.characters).filter(([id])=>!id.startsWith('q140_')))};
export const acceptedQ140=data.previousQuestRoutes.q140;
export const acceptedQ140Data={...previousQ140Data,quests:{...previousQ140Data.quests,q140:acceptedQ140},scripts:{...previousQ140Data.scripts,...acceptedQ140.scripts}};
export const q140Routes=[{path:['loot','leave','finish'],outcome:'loot',help:false},...[false,true].flatMap(help=>['declare','close','leave'].map(action=>({path:[...(help?['rescue','carry']:['talk']),action,'finish'],outcome:action==='declare'?'treaty':action,help})))];
export const q140AcceptedRoutes=[{path:['loot'],outcome:'loot'},...['talk','rescue'].flatMap(first=>['declare','close','leave'].map(action=>({path:[first,action],outcome:action==='declare'?'treaty':action})))];
export const q140Cast=(scene,help=false)=>scene==='accident'?['q140_worker']:scene==='talk'?['q140_boro',...(help?['q140_worker']:[])]:[];
export const q140NewTake='止まった罠の先の庫へ着いた。持ち出す品を確かめ、地上への帰路を選ぶ。';
export function upgradedQ140Save(raw){const save=JSON.parse(raw),s=save.state.stories.q140;if(s){s.revision=2;s.values.boroAt='maintenance';}return save;}
export function q140Engine({legacy=false}={}){const base=ready(),g=legacy?new GameEngine(previousQ140Data):base;if(legacy)g.load(base.save());g.random=()=>.999999;start(g,'q140');return g;}
export function q140AcceptedEngine({accepted=true,entered=true,started=true}={}){
 const g=new GameEngine(acceptedQ140Data);g.load(ready().save());g.random=()=>.999999;go(g,{kind:'town',location:'pilgrim_board'});if(accepted)assert.ok(g.accept('q140'));
 if(entered){const p=acceptedQ140.locations.find(p=>p.role==='decision');go(g,{kind:'dungeon',dungeon:p.dungeon??'region_4',map:p.map,x:p.x,y:p.y});}if(started)g.run(acceptedQ140.model.entryScript??'q140.visit');return g;
}
export function q140AcceptedChoose(g,id){assert.ok(g.dispatch({type:'choose',id}));drain(g);}
export async function maintenanceArtFixtures(){
 const first=await loadContent(read,{edition:'e1'});for(const id of ['q140_boro','q140_worker'])assert.equal(first.characters[id],undefined);assert.deepEqual(first.quests.q140,await read('data/quests/q140.json'));
 const fixtures=[],outcomes=new Set(),choices={entry:'rescue',talk:'declare',take:'leave',looted:'finish',accident:'carry',declared:'finish',closed:'finish',left:'finish'};
 for(const legacy of [false,true]){
  const seen=new Set(),capture=g=>{
   const s=g.state.stories.q140,scene=s.scene,help=s.values.helped,suffix=['talk','declared','closed','left'].includes(scene)?(help?'-help':'-direct'):'',key=scene+suffix;if(seen.has(key))return;seen.add(key);
   const raw=g.save(),current=new GameEngine(data);current.load(raw);if(legacy)assert.deepEqual(JSON.parse(current.save()),upgradedQ140Save(raw));else assert.equal(current.save(),raw);checkpoint(current);
   const cast=q140Cast(scene,help);assert.deepEqual(projectGame(current).dialog.scene.cast.map(c=>c.id),cast);
   const faces=Object.fromEntries(cast.map(id=>[id,id==='q140_boro'?[.49,.065,.55,.1]:[.4,.08,.46,.12]]));
   fixtures.push({edition:'e2',quest:'q140',scene,variant:(legacy?'migrated':'current')+suffix,cast,save:current.save(),...(cast.length?{faces,clearOfHud:true}:{}),availableChoice:choices[scene],expectedText:g.data.quests.q140.model.graph.find(n=>n.id===scene).text});
  };
  for(const route of q140Routes){const g=q140Engine({legacy});capture(g);for(const action of route.path){choose(g,'q140',action);if(g.state.quests.q140.stage!=='completed')capture(g);}assert.equal(g.state.quests.q140.outcome,route.outcome);outcomes.add('e2/q140/'+route.outcome);}
  assert.equal(seen.size,12);
 }
 const seen=new Set(),capture=g=>{
  const scene=g.state.flags.quest.q140.node;if(seen.has(scene))return;seen.add(scene);
  const current=new GameEngine(data);current.load(g.save());checkpoint(current);assert.equal(current.state.flags.legacyStoryRoutes.q140,true);assert.equal(current.state.stories.q140,undefined);assert.equal(projectGame(current).dialog.scene,undefined);
  fixtures.push({edition:'e2',quest:'q140',scene,variant:'accepted-legacy',cast:[],absentStoryScene:true,save:current.save(),availableChoice:choices[scene],expectedText:acceptedQ140.model.graph.find(n=>n.id===scene).text});
 };
 for(const route of q140AcceptedRoutes){const g=q140AcceptedEngine();drain(g);capture(g);for(const action of route.path){q140AcceptedChoose(g,action);if(g.state.quests.q140.stage!=='completed')capture(g);}assert.equal(g.state.quests.q140.outcome,route.outcome);}
 assert.equal(seen.size,2);return {fixtures,outcomes:[...outcomes]};
}
