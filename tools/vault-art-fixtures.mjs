import assert from 'node:assert/strict';
import {loadContent} from '../src/core/loader.js';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {read} from '../tests/oddland-helpers.mjs';
import {fight} from '../tests/helpers.mjs';
import {data,ready,start,choose,checkpoint,go,drain} from '../tests/pilgrimage-helpers.mjs';

export const previousQ134=await read('tests/fixtures/e2-q134-before-cast.json');
export const previousQ134Data={...data,quests:{...data.quests,q134:previousQ134},scripts:{...data.scripts,...previousQ134.scripts},characters:Object.fromEntries(Object.entries(data.characters).filter(([id])=>!id.startsWith('q134_')))};
export const acceptedQ134=data.previousQuestRoutes.q134;
export const acceptedQ134Data={...previousQ134Data,quests:{...previousQ134Data.quests,q134:acceptedQ134},scripts:{...previousQ134Data.scripts,...acceptedQ134.scripts}};
export const q134Routes=[
 {path:['rule','sword','finish'],outcome:'sword'},
 {path:['rule','parcel','back','enter','finish'],outcome:'parcel'},
 {path:['break','continue','finish'],outcome:'break'},
 {path:['decline'],outcome:'decline'},
 {path:['rule','decline'],outcome:'decline'}
];
export const q134AcceptedRoutes=q134Routes.map(r=>({...r,path:r.outcome==='sword'||r.outcome==='parcel'?r.path.slice(0,2):r.outcome==='break'?['break']:r.path}));
export const q134Cast=scene=>({entry:['zag'],return:['zag','keeper'],broken:[],sword_home:['zag','master'],delivered:['owner'],receipt:['zag','keeper'],parcel_end:['keeper'],entry_break_ready:['zag']}[scene]??[]).map(r=>'q134_'+r);
export const q134KeeperAt=s=>s.journey?.quest==='q134'&&s.journey.action==='receipt_enter'?'transit':s.stories.q134.events.includes('receipt_enter')?'vault':'keeper';
export function upgradedQ134Save(raw){const save=JSON.parse(raw),s=save.state.stories.q134;s.revision=2;s.values.custodianAt=q134KeeperAt(save.state);return save;}
export function q134Engine({legacy=false}={}){const base=ready(),g=legacy?new GameEngine(previousQ134Data):base;if(legacy)g.load(base.save());g.random=()=>.999999;start(g,'q134');return g;}
export function q134AcceptedEngine({accepted=true,entered=true,started=true}={}){
 const g=new GameEngine(acceptedQ134Data);g.load(ready().save());g.random=()=>.999999;go(g,{kind:'town',location:'pilgrim_board'});if(accepted)assert.ok(g.accept('q134'));
 if(entered){const p=acceptedQ134.locations.find(p=>p.role==='decision');go(g,{kind:'dungeon',dungeon:p.dungeon,map:p.map,x:p.x,y:p.y});}
 if(started)g.run(acceptedQ134.model.entryScript??'q134.visit');return g;
}
export function q134AcceptedChoose(g,id,{combat=true}={}){assert.ok(g.dispatch({type:'choose',id}));drain(g);if(combat&&g.state.battle){g.healAll();fight(g);}}

export async function vaultArtFixtures(){
 const first=await loadContent(read,{edition:'e1'});for(const role of ['zag','master','owner','keeper'])assert.equal(first.characters['q134_'+role],undefined);assert.deepEqual(first.quests.q134,await read('data/quests/q134.json'));
 const fixtures=[],outcomes=new Set(),choices={entry:'rule',return:'sword',broken:'finish',sword_home:'finish',delivered:'back',receipt:'enter',parcel_end:'finish',entry_break_ready:'continue'};
 const faces={q134_zag:[.48,.07,.54,.1],q134_master:[.48,.055,.54,.09],q134_owner:[.49,.065,.55,.1],q134_keeper:[.48,.05,.54,.085]};
 for(const legacy of [false,true]){
  const seen=new Set();
  const capture=g=>{const scene=g.state.stories.q134.scene;if(seen.has(scene))return;seen.add(scene);const raw=g.save(),current=new GameEngine(data);current.load(raw);if(legacy)assert.deepEqual(JSON.parse(current.save()),upgradedQ134Save(raw));else assert.equal(current.save(),raw);checkpoint(current);
   assert.equal(current.state.stories.q134.values.custodianAt,q134KeeperAt(current.state));const cast=q134Cast(scene);assert.deepEqual(projectGame(current).dialog.scene.cast.map(c=>c.id),cast);
   fixtures.push({edition:'e2',quest:'q134',scene,variant:legacy?'migrated':'current',cast,save:current.save(),faces:Object.fromEntries(cast.map(id=>[id,faces[id]])),clearOfHud:true,availableChoice:choices[scene],expectedText:previousQ134.model.graph.find(n=>n.id===scene).text});
  };
  for(const route of q134Routes){const g=q134Engine({legacy});capture(g);for(const action of route.path){choose(g,'q134',action);if(g.state.quests.q134.stage!=='completed')capture(g);}assert.equal(g.state.quests.q134.outcome,route.outcome);outcomes.add('e2/q134/'+route.outcome);}
  assert.equal(seen.size,8);
 }
 const seen=new Set();
 const capture=g=>{const scene=g.state.flags.quest.q134.node;if(seen.has(scene))return;seen.add(scene);const current=new GameEngine(data);current.load(g.save());checkpoint(current);assert.equal(current.state.flags.legacyStoryRoutes.q134,true);assert.equal(current.state.stories.q134,undefined);assert.equal(projectGame(current).dialog.scene,undefined);
  fixtures.push({edition:'e2',quest:'q134',scene,variant:'accepted-legacy',cast:[],absentStoryScene:true,save:current.save(),availableChoice:choices[scene],expectedText:acceptedQ134.model.graph.find(n=>n.id===scene).text});
 };
 for(const route of q134AcceptedRoutes){const g=q134AcceptedEngine();drain(g);capture(g);for(const action of route.path){q134AcceptedChoose(g,action);if(g.state.quests.q134.stage!=='completed')capture(g);}assert.equal(g.state.quests.q134.outcome,route.outcome);outcomes.add('e2/q134/'+route.outcome);}
 assert.deepEqual([...seen].sort(),['entry','return']);return {fixtures,outcomes:[...outcomes]};
}
