import assert from 'node:assert/strict';
import {loadContent} from '../src/core/loader.js';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {read} from '../tests/oddland-helpers.mjs';
import {data,ready,start,choose,checkpoint,go,drain} from '../tests/royal-helpers.mjs';
export const previousQ062=await read('tests/fixtures/e2-q062-before-cast.json');
export const previousQ062Data={...data,quests:{...data.quests,q062:previousQ062},scripts:{...data.scripts,...previousQ062.scripts},characters:Object.fromEntries(Object.entries(data.characters).filter(([id])=>id!=='q062_heirs'))};
export const acceptedQ062=data.previousQuestRoutes.q062;
export const acceptedQ062Data={...previousQ062Data,quests:{...previousQ062Data.quests,q062:acceptedQ062},scripts:{...previousQ062Data.scripts,...acceptedQ062.scripts}};
export const q062Routes=[{path:['names','finish'],outcome:'informed'},{path:['heirs','finish'],outcome:'compromise'},{path:['treasure','finish'],outcome:'contract'}];
export const q062Cast=scene=>['entry','testimony'].includes(scene)?['q062_heirs']:[];
export function q062Engine({legacy=false}={}){const base=ready(),g=legacy?new GameEngine(previousQ062Data):base;if(legacy)g.load(base.save());g.random=()=>.999999;start(g,'q062');return g;}
export function q062AcceptedEngine({accepted=true,entered=true,started=true}={}){
 const g=new GameEngine(acceptedQ062Data);g.load(ready().save());g.random=()=>.999999;go(g,{kind:'town',location:'royal_board'});if(accepted)assert.ok(g.accept('q062'));
 if(entered){const p=acceptedQ062.locations.find(p=>p.role==='decision');go(g,{kind:'dungeon',dungeon:p.dungeon??'region_7',map:p.map,x:p.x,y:p.y});}if(started)g.run(acceptedQ062.model.entryScript??'q062.visit');return g;
}
export function q062AcceptedChoose(g,id){assert.ok(g.dispatch({type:'choose',id}));drain(g);}
export async function heirsArtFixtures(){
 const first=await loadContent(read,{edition:'e1'});assert.equal(first.characters.q062_heirs,undefined);assert.deepEqual(first.quests.q062,await read('data/quests/q062.json'));
 const fixtures=[],outcomes=new Set();
 for(const legacy of [false,true]){
  const seen=new Set(),capture=g=>{
   const scene=g.state.stories.q062.scene;if(seen.has(scene))return;seen.add(scene);
   const raw=g.save(),current=new GameEngine(data);current.load(raw);assert.equal(current.save(),raw);checkpoint(current);
   const cast=q062Cast(scene);assert.deepEqual(projectGame(current).dialog.scene.cast.map(c=>c.id),cast);
   fixtures.push({edition:'e2',quest:'q062',scene,variant:legacy?'previous':'current',cast,textOnlyCast:cast,save:raw,availableChoice:scene==='entry'?'names':'finish',expectedText:projectGame(g).dialog.text});
  };
  for(const route of q062Routes){const g=q062Engine({legacy});capture(g);for(const action of route.path){choose(g,'q062',action);if(g.state.quests.q062.stage!=='completed')capture(g);}assert.equal(g.state.quests.q062.outcome,route.outcome);outcomes.add('e2/q062/'+route.outcome);}
  assert.equal(seen.size,4);
 }
 const old=q062AcceptedEngine();drain(old);const current=new GameEngine(data);current.load(old.save());checkpoint(current);assert.equal(current.state.flags.legacyStoryRoutes.q062,true);assert.equal(current.state.stories.q062,undefined);assert.equal(projectGame(current).dialog.scene,undefined);
 fixtures.push({edition:'e2',quest:'q062',scene:'entry',variant:'accepted-legacy',cast:[],absentStoryScene:true,save:current.save(),availableChoice:'names',expectedText:projectGame(old).dialog.text});
 return {fixtures,outcomes:[...outcomes]};
}
