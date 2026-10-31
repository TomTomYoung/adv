import assert from 'node:assert/strict';
import {loadContent} from '../src/core/loader.js';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {read} from '../tests/oddland-helpers.mjs';
import {data,ready,start,choose,checkpoint,go,drain} from '../tests/royal-helpers.mjs';
export const previousQ061=await read('tests/fixtures/e2-q061-before-cast.json');
export const previousQ061Data={...data,quests:{...data.quests,q061:previousQ061},scripts:{...data.scripts,...previousQ061.scripts},characters:Object.fromEntries(Object.entries(data.characters).filter(([id])=>id!=='q061_rescuers'))};
export const acceptedQ061=data.previousQuestRoutes.q061;
export const acceptedQ061Data={...previousQ061Data,quests:{...previousQ061Data.quests,q061:acceptedQ061},scripts:{...previousQ061Data.scripts,...acceptedQ061.scripts}};
export const q061Routes=[{path:['local'],outcome:'compromise'},{path:['sea','finish'],outcome:'contract'},{path:['trial','keep'],outcome:'compromise'},{path:['trial','next','keep'],outcome:'compromise'},{path:['trial','next','rescue','finish'],outcome:'informed'}];
export const q061AcceptedRoutes=q061Routes.map(r=>({...r,path:r.path.filter(id=>id!=='finish')}));
export const q061Cast=scene=>scene==='rescue_report'?['q061_rescuers']:[];
export function upgradedQ061Save(raw){const save=JSON.parse(raw),s=save.state.stories.q061;if(s){s.revision=2;s.values.rescuersAt='rescue';}return save;}
export function q061Engine({legacy=false}={}){const base=ready(),g=legacy?new GameEngine(previousQ061Data):base;if(legacy)g.load(base.save());g.random=()=>.999999;start(g,'q061');return g;}
export function q061AcceptedEngine({accepted=true,entered=true,started=true}={}){
 const g=new GameEngine(acceptedQ061Data);g.load(ready().save());g.random=()=>.999999;go(g,{kind:'town',location:'royal_board'});if(accepted)assert.ok(g.accept('q061'));
 if(entered){const p=acceptedQ061.locations.find(p=>p.role==='decision');go(g,{kind:'dungeon',dungeon:p.dungeon??'region_7',map:p.map,x:p.x,y:p.y});}if(started)g.run(acceptedQ061.model.entryScript??'q061.visit');return g;
}
export function q061AcceptedChoose(g,id){assert.ok(g.dispatch({type:'choose',id}));drain(g);}
export async function sunkenArtFixtures(){
 const first=await loadContent(read,{edition:'e1'});assert.equal(first.characters.q061_rescuers,undefined);assert.deepEqual(first.quests.q061,await read('data/quests/q061.json'));
 const fixtures=[],outcomes=new Set(),choices={entry:'trial',air:'next',second_air:'rescue',rescue_report:'finish',sea_report:'finish'};
 for(const legacy of [false,true]){
  const seen=new Set(),capture=g=>{
   const scene=g.state.stories.q061.scene;if(seen.has(scene))return;seen.add(scene);
   const raw=g.save(),current=new GameEngine(data);current.load(raw);assert.deepEqual(JSON.parse(current.save()),legacy?upgradedQ061Save(raw):JSON.parse(raw));checkpoint(current);
   const cast=q061Cast(scene),text=projectGame(g).dialog.text;assert.deepEqual(projectGame(current).dialog.scene.cast.map(c=>c.id),cast);
   fixtures.push({edition:'e2',quest:'q061',scene,variant:legacy?'migrated':'current',cast,textOnlyCast:cast,save:current.save(),availableChoice:choices[scene],...(scene==='air'?{blockedChoice:'rescue'}:{}),expectedText:text});
  };
  for(const route of q061Routes){const g=q061Engine({legacy});capture(g);for(const action of route.path){choose(g,'q061',action);if(g.state.quests.q061.stage!=='completed')capture(g);}assert.equal(g.state.quests.q061.outcome,route.outcome);outcomes.add('e2/q061/'+route.outcome);}
  assert.equal(seen.size,5);
 }
 const seen=new Set(),capture=g=>{
  const scene=g.state.flags.flow.q061.node,tested=g.state.flags.flow.q061?.tested??0,key=scene+'-'+tested;if(seen.has(key))return;seen.add(key);
  const current=new GameEngine(data);current.load(g.save());checkpoint(current);assert.equal(current.state.flags.legacyStoryRoutes.q061,true);assert.equal(current.state.stories.q061,undefined);assert.equal(projectGame(current).dialog.scene,undefined);
  fixtures.push({edition:'e2',quest:'q061',scene,variant:'accepted-legacy-'+tested,cast:[],absentStoryScene:true,save:current.save(),availableChoice:scene==='air'&&tested?'rescue':choices[scene],...(scene==='air'&&!tested?{blockedChoice:'rescue'}:{}),expectedText:projectGame(g).dialog.text});
 };
 for(const route of q061AcceptedRoutes){const g=q061AcceptedEngine();drain(g);capture(g);for(const action of route.path){q061AcceptedChoose(g,action);if(g.state.quests.q061.stage!=='completed')capture(g);}assert.equal(g.state.quests.q061.outcome,route.outcome);}
 assert.equal(seen.size,3);return {fixtures,outcomes:[...outcomes]};
}
