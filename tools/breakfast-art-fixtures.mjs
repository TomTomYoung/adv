import assert from 'node:assert/strict';
import {loadContent} from '../src/core/loader.js';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {read} from '../tests/oddland-helpers.mjs';
import {data,ready,start,choose,checkpoint,go,drain} from '../tests/pilgrimage-helpers.mjs';

export const previousQ135=await read('tests/fixtures/e2-q135-before-cast.json');
export const previousQ135Data={...data,quests:{...data.quests,q135:previousQ135},scripts:{...data.scripts,...previousQ135.scripts},characters:Object.fromEntries(Object.entries(data.characters).filter(([id])=>!id.startsWith('q135_')))};
export const acceptedQ135=data.previousQuestRoutes.q135;
export const acceptedQ135Data={...previousQ135Data,quests:{...previousQ135Data.quests,q135:acceptedQ135},scripts:{...previousQ135Data.scripts,...acceptedQ135.scripts}};
export const q135Routes=[
 {path:['listen','answer'],outcome:'stop'},
 {path:['lift','continue','workshop','finish'],outcome:'lift'},
 {path:['listen','lift','continue','workshop','finish'],outcome:'lift'},
 {path:['listen','back','dive','break','finish'],outcome:'break'}
];
export const q135AcceptedRoutes=[{path:['listen','answer'],outcome:'stop'},{path:['lift'],outcome:'lift'},{path:['listen','lift'],outcome:'lift'},{path:['listen','back','break'],outcome:'break'}];
export const q135Cast=scene=>(scene==='stone_report'?[]:scene==='refill'?['ane']:['ane','doll']).map(role=>'q135_'+role);
export function q135Engine({legacy=false,rope=1}={}){const base=ready(),g=legacy?new GameEngine(previousQ135Data):base;if(legacy)g.load(base.save());g.random=()=>.999999;g.state.inventory.rope=rope;start(g,'q135');return g;}
export function q135AcceptedEngine({accepted=true,entered=true,started=true,rope=1}={}){
 const g=new GameEngine(acceptedQ135Data);g.load(ready().save());g.random=()=>.999999;g.state.inventory.rope=rope;go(g,{kind:'town',location:'pilgrim_board'});if(accepted)assert.ok(g.accept('q135'));
 if(entered){const p=acceptedQ135.locations.find(p=>p.role==='decision');go(g,{kind:'dungeon',dungeon:p.dungeon,map:p.map,x:p.x,y:p.y});}
 if(started)g.run(acceptedQ135.model.entryScript??'q135.visit');return g;
}
export function q135AcceptedChoose(g,id){assert.ok(g.dispatch({type:'choose',id}));drain(g);}

export async function breakfastArtFixtures(){
 const first=await loadContent(read,{edition:'e1'});for(const role of ['ane','doll'])assert.equal(first.characters['q135_'+role],undefined);assert.deepEqual(first.quests.q135,await read('data/quests/q135.json'));
 const fixtures=[],outcomes=new Set(),choices={entry:'listen',reply:'answer',surfaced:'workshop',retrained:'finish',stone_report:'finish',refill:'dive',entry_lift_ready:'continue',reply_lift_ready:'continue'};
 const faces={q135_ane:[.48,.07,.54,.1],q135_doll:[.48,.07,.54,.1]};
 for(const legacy of [false,true]){
  const seen=new Set();
  const capture=(g,noRope=false)=>{const scene=g.state.stories.q135.scene,key=scene+(noRope?'-no-rope':'');if(seen.has(key))return;seen.add(key);const raw=g.save(),current=new GameEngine(data);current.load(raw);assert.equal(current.save(),raw);checkpoint(current);
   const cast=q135Cast(scene);assert.deepEqual(projectGame(current).dialog.scene.cast.map(c=>c.id),cast);
   fixtures.push({edition:'e2',quest:'q135',scene,variant:(legacy?'legacy':'current')+(noRope?'-no-rope':''),cast,save:raw,faces:Object.fromEntries(cast.map(id=>[id,faces[id]])),clearOfHud:true,availableChoice:choices[scene],...(noRope?{blockedChoice:'lift'}:{}),expectedText:(legacy?previousQ135:data.quests.q135).model.graph.find(n=>n.id===scene).text});
  };
  for(const route of q135Routes){const g=q135Engine({legacy});capture(g);for(const id of route.path){choose(g,'q135',id);if(g.state.quests.q135.stage!=='completed')capture(g);}assert.equal(g.state.quests.q135.outcome,route.outcome);outcomes.add('e2/q135/'+route.outcome);}
  const poor=q135Engine({legacy,rope:0});capture(poor,true);choose(poor,'q135','listen');capture(poor,true);assert.equal(seen.size,10);
 }
 const seen=new Set();
 for(const route of q135AcceptedRoutes){const g=q135AcceptedEngine();drain(g);
  const capture=()=>{const scene=g.state.flags.quest.q135.node;if(seen.has(scene))return;seen.add(scene);const current=new GameEngine(data);current.load(g.save());checkpoint(current);assert.equal(current.state.flags.legacyStoryRoutes.q135,true);assert.equal(current.state.stories.q135,undefined);assert.equal(projectGame(current).dialog.scene,undefined);
   fixtures.push({edition:'e2',quest:'q135',scene,variant:'accepted-legacy',cast:[],absentStoryScene:true,save:current.save(),availableChoice:choices[scene],expectedText:acceptedQ135.model.graph.find(n=>n.id===scene).text});
  };capture();for(const id of route.path){q135AcceptedChoose(g,id);if(g.state.quests.q135.stage!=='completed')capture();}assert.equal(g.state.quests.q135.outcome,route.outcome);
 }assert.deepEqual([...seen].sort(),['entry','reply']);return {fixtures,outcomes:[...outcomes]};
}
