import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {data,read,ready,start,choose,checkpoint,go,drain} from '../tests/machine-helpers.mjs';
export const previousQ174=await read('tests/fixtures/e2-q174-before-cast.json');
export const previousQ174Data={...data,quests:{...data.quests,q174:previousQ174},scripts:{...data.scripts,...previousQ174.scripts},characters:Object.fromEntries(Object.entries(data.characters).filter(([id])=>!['q174_daughter','q174_injured'].includes(id)))};
export const acceptedQ174=data.previousQuestRoutes.q174;
export const acceptedQ174Data={...previousQ174Data,quests:{...previousQ174Data.quests,q174:acceptedQ174},scripts:{...previousQ174Data.scripts,...acceptedQ174.scripts}};
export const q174Routes=[
 {path:['visit','hut','name','finish'],outcome:'name'},
 {path:['visit','seal','finish'],outcome:'seal'},
 {path:['visit','hut','seal','finish'],outcome:'seal'},
 {path:['visit','people','finish'],outcome:'rescue'}
];
export const q174Cast=scene=>({entry:[],letter:[],onsite:['q174_daughter','q174_injured'],sealed:['q174_daughter','q174_injured'],named:['q174_daughter','q174_injured'],rescued:['q174_injured']})[scene];
export function q174Engine({legacy=false}={}){const base=ready(),g=legacy?new GameEngine(previousQ174Data):base;if(legacy)g.load(base.save());g.random=()=>.999999;start(g,'q174');return g;}
export function q174AcceptedEngine(){
 const g=new GameEngine(acceptedQ174Data);g.load(ready().save());g.random=()=>.999999;go(g,{kind:'town',location:'salome_board'});assert.ok(g.accept('q174'));
 const p=acceptedQ174.locations.find(p=>p.role==='decision')??acceptedQ174.locations[0];go(g,{kind:'dungeon',dungeon:'region_8',map:p.map,x:p.x,y:p.y});g.run(acceptedQ174.model.entryScript??'q174.visit');drain(g);return g;
}
export async function funeralArtFixtures(){
 const fixtures=[],outcomes=new Set();
 for(const legacy of [false,true]){
  const seen=new Set(),capture=g=>{
   const scene=g.state.stories.q174.scene;if(seen.has(scene))return;seen.add(scene);
   const raw=g.save(),current=new GameEngine(data);current.load(raw);assert.equal(current.save(),raw);checkpoint(current);
   const cast=q174Cast(scene);assert.deepEqual(projectGame(current).dialog.scene.cast.map(c=>c.id),cast);
   fixtures.push({edition:'e2',quest:'q174',scene,variant:legacy?'previous':'current',cast,textOnlyCast:cast,save:raw,availableChoice:{entry:'visit',onsite:'hut',letter:'name',sealed:'finish',named:'finish',rescued:'finish'}[scene],expectedText:projectGame(g).dialog.text});
  };
  for(const route of q174Routes){const g=q174Engine({legacy});capture(g);for(const action of route.path){choose(g,'q174',action);if(g.state.quests.q174.stage!=='completed')capture(g);}assert.equal(g.state.quests.q174.outcome,route.outcome);outcomes.add('e2/q174/'+route.outcome);}
  assert.equal(seen.size,6);
 }
 const old=q174AcceptedEngine(),current=new GameEngine(data);current.load(old.save());checkpoint(current);assert.equal(current.state.flags.legacyStoryRoutes.q174,true);assert.equal(current.state.stories.q174,undefined);assert.equal(projectGame(current).dialog.scene,undefined);
 fixtures.push({edition:'e2',quest:'q174',scene:'entry',variant:'accepted-legacy',cast:[],absentStoryScene:true,save:current.save(),availableChoice:'hut',expectedText:projectGame(old).dialog.text});
 return {fixtures,outcomes:[...outcomes]};
}
