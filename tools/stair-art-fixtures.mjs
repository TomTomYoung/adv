import assert from 'node:assert/strict';
import {loadContent} from '../src/core/loader.js';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {read} from '../tests/oddland-helpers.mjs';
import {data,ready,start,choose,checkpoint,go,drain} from '../tests/pilgrimage-helpers.mjs';

export const previousQ133=await read('tests/fixtures/e2-q133-before-cast.json');
export const previousQ133Data={...data,quests:{...data.quests,q133:previousQ133},scripts:{...data.scripts,...previousQ133.scripts},characters:Object.fromEntries(Object.entries(data.characters).filter(([id])=>!id.startsWith('q133_')))};
export const acceptedQ133=data.previousQuestRoutes.q133;
export const acceptedQ133Data={...previousQ133Data,quests:{...previousQ133Data.quests,q133:acceptedQ133},scripts:{...previousQ133Data.scripts,...acceptedQ133.scripts}};
export const q133Routes=['weight','fix'].flatMap(preparation=>['save','stairs'].map(outcome=>({path:[preparation,outcome,'finish'],outcome,preparation})));
export const q133Cast=['q133_doma','q133_mason'];
export function upgradedQ133Save(raw){const save=JSON.parse(raw),s=save.state.stories.q133;s.revision=2;s.values.domaAt=s.values.partyAt;s.values.masonAt=s.values.partyAt;return save;}
export function q133Engine({legacy=false}={}){const base=ready(),g=legacy?new GameEngine(previousQ133Data):base;if(legacy)g.load(base.save());g.random=()=>.999999;start(g,'q133');return g;}
export function q133AcceptedEngine({accepted=true,entered=true,started=true}={}){
 const g=new GameEngine(acceptedQ133Data);g.load(ready().save());g.random=()=>.999999;go(g,{kind:'town',location:'pilgrim_board'});if(accepted)assert.ok(g.accept('q133'));
 if(entered){const p=acceptedQ133.locations.find(p=>p.role==='decision');go(g,{kind:'dungeon',dungeon:p.dungeon,map:p.map,x:p.x,y:p.y});}
 if(started)g.run(acceptedQ133.model.entryScript??'q133.visit');return g;
}
export function q133AcceptedChoose(g,id){assert.ok(g.dispatch({type:'choose',id}));drain(g);}

export async function stairArtFixtures(){
 const first=await loadContent(read,{edition:'e1'});for(const id of q133Cast)assert.equal(first.characters[id],undefined);assert.deepEqual(first.quests.q133,await read('data/quests/q133.json'));
 const fixtures=[],outcomes=new Set(),choices={entry:'weight',warning:'back',platform:'save',drawing:'finish',stairs:'finish'};
 for(const legacy of [false,true]){
  const seen=new Set();
  const capture=g=>{
   const s=g.state.stories.q133,scene=s.scene,preparation=s.values.fixed?'fixed':s.values.weightChecked?'weight':'',key=scene+(preparation?'-'+preparation:'');if(seen.has(key))return;seen.add(key);
   const raw=g.save(),current=new GameEngine(data);current.load(raw);if(legacy)assert.deepEqual(JSON.parse(current.save()),upgradedQ133Save(raw));else assert.equal(current.save(),raw);checkpoint(current);
   for(const role of ['doma','mason'])assert.equal(current.state.stories.q133.values[role+'At'],s.values.partyAt);
   assert.deepEqual(projectGame(current).dialog.scene.cast.map(c=>c.id),q133Cast);
   fixtures.push({edition:'e2',quest:'q133',scene,variant:(legacy?'migrated':'current')+(preparation?'-'+preparation:''),cast:q133Cast,save:current.save(),faces:{q133_doma:[.48,.075,.54,.105],q133_mason:[.49,.065,.56,.095]},clearOfHud:true,availableChoice:choices[scene],expectedText:previousQ133.model.graph.find(n=>n.id===scene).text});
  };
  for(const route of q133Routes){const g=q133Engine({legacy});capture(g);choose(g,'q133','step');capture(g);choose(g,'q133','back');capture(g);for(const action of route.path){choose(g,'q133',action);if(g.state.quests.q133.stage!=='completed')capture(g);}assert.equal(g.state.quests.q133.outcome,route.outcome);outcomes.add('e2/q133/'+route.outcome);}
  assert.equal(seen.size,8);
 }
 const seen=new Set();
 const capture=g=>{const scene=g.state.flags.quest.q133.node;if(seen.has(scene))return;seen.add(scene);const current=new GameEngine(data);current.load(g.save());checkpoint(current);assert.equal(current.state.flags.legacyStoryRoutes.q133,true);assert.equal(current.state.stories.q133,undefined);assert.equal(projectGame(current).dialog.scene,undefined);
  fixtures.push({edition:'e2',quest:'q133',scene,variant:'accepted-legacy',cast:[],absentStoryScene:true,save:current.save(),availableChoice:choices[scene],expectedText:acceptedQ133.model.graph.find(n=>n.id===scene).text});
 };
 for(const route of q133Routes){const g=q133AcceptedEngine();drain(g);capture(g);q133AcceptedChoose(g,'step');capture(g);q133AcceptedChoose(g,'back');for(const action of route.path.slice(0,-1)){q133AcceptedChoose(g,action);if(g.state.quests.q133.stage!=='completed')capture(g);}assert.equal(g.state.quests.q133.outcome,route.outcome);outcomes.add('e2/q133/'+route.outcome);}
 assert.deepEqual([...seen].sort(),['entry','warning','platform'].sort());return {fixtures,outcomes:[...outcomes]};
}
