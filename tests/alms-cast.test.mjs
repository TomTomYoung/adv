import test from 'node:test';
import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {validateSave} from '../src/core/save.js';
import {storyCanAct} from '../src/core/story.js';
import {projectGame} from '../src/application/projection.js';
import {data,ready,start,choose,go,drain,checkpoint} from './pilgrimage-helpers.mjs';
import {q035Engine,q035Routes,q035Cast,previousQ035,previousQ035Data,almsArtFixtures} from '../tools/alms-art-fixtures.mjs';
import {previousQ032} from '../tools/chapel-art-fixtures.mjs';
import {installDOM} from './view-dom.mjs';
import {replaceView} from '../src/view/view-layout.js';
let fixturePromise;
const fixtures=()=>fixturePromise??=almsArtFixtures();

test('q035 changes only character bindings and casts, preserving the whole previous quest and revision',()=>{
 const q=structuredClone(data.quests.q035);
 for(const id of ['server','patient']){assert.equal(q.story.entities[id].character,'q035_'+id);delete q.story.entities[id].character;}
 for(const [id,s] of Object.entries(q.story.scenes)){assert.deepEqual(s.cast.map(c=>c.entity),id==='entry'?['server']:['server','patient']);s.cast=[];}
 assert.deepEqual(q,previousQ035);assert.equal(q.story.revision,1);
});

test('q035 fixtures cover both save generations, all scenes, and the zero/one ration threshold',async()=>{
 const {fixtures:states,outcomes}=await fixtures();assert.equal(states.length,12);assert.equal(outcomes.length,4);
 for(const f of states){const g=new GameEngine(data);g.load(f.save);assert.equal(g.save(),f.save);assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),f.cast);
  if(f.scene==='patient')assert.equal(storyCanAct(g,'q035','patient_food'),g.state.inventory.ration===1);
 }
});

test('q035 old dialogue, choices, travel, arrival and completion resume byte-for-byte',()=>{
 let checks=0;const phases=new Set();
 const check=g=>{const raw=g.save();assert.deepEqual(validateSave(JSON.parse(raw),g.data),[]);const current=new GameEngine(data);current.load(raw);assert.equal(current.save(),raw);checkpoint(current);checks++;phases.add(g.state.journey?'journey':g.state.quests.q035.stage==='completed'?'completed':g.state.waiting?.type);};
 for(const route of q035Routes){
  const g=q035Engine({legacy:true});check(g);
  for(const id of route.path){assert.ok(g.dispatch({type:'choose',id}));check(g);drain(g);check(g);if(g.state.journey){go(g,g.data.quests.q035.story.worldPlaces.patient);check(g);drain(g);check(g);}}
  assert.equal(g.state.quests.q035.outcome,route.outcome);check(g);
 }
 assert.ok(checks>=44);for(const phase of ['choice','journey','completed'])assert.ok(phases.has(phase));
});

test('q035 escorts only the server, delivers the plate on arrival, and charges only the extra meal once',()=>{
 for(const route of q035Routes){
  const g=q035Engine(),members=[...g.state.members],inventory=structuredClone(g.state.inventory),gold=g.state.gold,xp=Object.fromEntries(members.map(id=>[id,g.state.actors[id].xp]));
  for(const id of route.path){
   assert.throws(()=>g.complete('q035',route.outcome));assert.ok(g.dispatch({type:'choose',id}));drain(g);
   if(g.state.journey){
    const s=g.state.stories.q035,a=data.quests.q035.story.actions[g.state.journey.action];
    assert.deepEqual(a.journey.companions,['server']);assert.equal(s.values.partyAt,'transit');assert.equal(s.values.serverAt,'transit');assert.equal(s.values.patientAt,'patient');assert.equal(s.values.mealAt,'party');assert.equal(s.values.repairConsent,false);assert.equal(s.knowledge.party?.includes('truth')??false,false);checkpoint(g);
    const expected=JSON.parse(g.save());expected.state.notice='';assert.equal(g.dispatch({type:'choose',id:'food'}),false);assert.deepEqual(JSON.parse(g.save()),expected);
    go(g,data.quests.q035.story.worldPlaces.patient);drain(g);assert.equal(g.state.stories.q035.values.serverAt,'patient');assert.equal(g.state.stories.q035.values.mealAt,'patient');assert.equal(g.state.stories.q035.values.repairConsent,false);assert.deepEqual(g.state.inventory,inventory);
   }
   assert.equal(g.state.stories.q035.values.patientAt,'patient');assert.deepEqual(g.state.members,members);checkpoint(g);
  }
  const s=g.state.stories.q035,reward=data.quests.q035.outcomes[route.outcome],expectedInventory={...inventory,ration:inventory.ration-(route.outcome==='meal'?1:0)};
  assert.equal(s.values.mealAt,route.path[0]==='deliver'?'patient':'server');assert.equal(s.values.repairConsent,route.path.includes('ask'));assert.deepEqual(g.state.inventory,expectedInventory);assert.equal(g.state.gold,gold+reward.gold);
  for(const id of members){assert.ok(g.state.actors[id].hp>0);assert.equal(g.state.actors[id].xp,xp[id]+reward.xp);}
  assert.equal(g.state.quests.q035.outcome,route.outcome);const before=g.save();assert.throws(()=>g.complete('q035',route.outcome));assert.equal(g.save(),before);
 }
});

test('q035 ration shortage survives reload, keeps the delivered plate, and allows a free continuation',()=>{
 for(const legacy of [false,true])for(const next of ['ask','record']){
  const old=q035Engine({legacy});choose(old,'q035','deliver');old.state.inventory.ration=0;
  const g=new GameEngine(data);g.load(old.save());const before=g.save();assert.equal(storyCanAct(g,'q035','patient_food'),false);assert.equal(g.dispatch({type:'choose',id:'food'}),false);assert.equal(g.save(),before);checkpoint(g);
  assert.equal(g.state.stories.q035.values.mealAt,'patient');assert.equal(g.state.stories.q035.values.repairConsent,false);
  choose(g,'q035',next);if(next==='ask'){assert.equal(g.state.stories.q035.values.repairConsent,true);choose(g,'q035','repair');}
  assert.equal(g.state.quests.q035.outcome,next==='ask'?'informed':'compromise');assert.equal(g.state.inventory.ration,0);
 }
 const g=q035Engine();choose(g,'q035','deliver');g.state.inventory.ration=1;choose(g,'q035','food');assert.equal(g.state.inventory.ration,0);assert.equal(g.state.quests.q035.outcome,'meal');assert.equal(g.state.stories.q035.values.repairConsent,false);
});

test('q035 invalid holders and unknown state are rejected atomically',()=>{
 const old=q035Engine({legacy:true}),g=q035Engine(),before=g.save();
 for(const mutate of [s=>s.values.patientAt='nowhere',s=>delete s.values.mealAt,s=>s.values.extraState=true,s=>s.knowledge.party=['unwritten'],s=>s.events.push('unwritten')]){
  const raw=JSON.parse(old.save());mutate(raw.state.stories.q035);assert.throws(()=>g.load(JSON.stringify(raw)));assert.equal(g.save(),before);
 }
});

test('q035 unchanged saves coexist with the declared q032 revision migration',()=>{
 const oldData={...previousQ035Data,quests:{...previousQ035Data.quests,q032:previousQ032},scripts:{...previousQ035Data.scripts,...previousQ032.scripts},characters:Object.fromEntries(Object.entries(previousQ035Data.characters).filter(([id])=>!id.startsWith('q032_')))};
 const old=new GameEngine(oldData);old.load(ready().save());old.random=()=>.999999;start(old,'q032');choose(old,'q032','plate');start(old,'q035');choose(old,'q035','deliver');
 const raw=JSON.parse(old.save());assert.deepEqual(validateSave(raw,oldData),[]);const g=new GameEngine(data);g.load(JSON.stringify(raw));const expected=structuredClone(raw);
 expected.state.stories.q032.revision=2;Object.assign(expected.state.stories.q032.values,{prisonerAt:'cell',craftspersonAt:'workshop'});assert.deepEqual(JSON.parse(g.save()),expected);checkpoint(g);choose(g,'q035','ask');choose(g,'q035','repair');assert.equal(g.state.quests.q035.outcome,'informed');
});

for(const layout of ['classic','scene'])test(`${layout}: q035 shows the server and the covered patient only at their actual locations`,async()=>{
 const dom=installDOM();let view;
 try{for(const f of (await fixtures()).fixtures){
  const g=new GameEngine(data);g.load(f.save);view=replaceView(view,layout,dom.root,intent=>g.dispatch(intent),{status(){},menu(){},help(){},soundEnabled:()=>false,effectsMode:()=> 'off'});view.render(projectGame(g));
  const people=dom.root.querySelectorAll('[data-character]');assert.equal(people.length,q035Cast(f.scene).length);
  for(const id of f.cast){const figure=dom.root.querySelector(`[data-character="${id}"]`);assert.equal(figure.querySelector('img').src,data.assets.images['npc_'+id]);assert.equal(figure.querySelector('img').alt,data.characters[id].name);}
  if(f.scene==='entry')assert.equal(dom.root.querySelector('[data-character="q035_patient"]'),null);
  assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),f.cast);
 }}finally{view?.destroy();dom.restore();}
});
