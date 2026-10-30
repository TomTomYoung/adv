import test from 'node:test';
import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {validateSave} from '../src/core/save.js';
import {projectGame} from '../src/application/projection.js';
import {data,ready,start,choose,drain,checkpoint,go} from './pilgrimage-helpers.mjs';
import {q039Engine,q039Routes,q039Cast,previousQ039,upgradedQ039Save,maskArtFixtures} from '../tools/mask-art-fixtures.mjs';
import {previousQ032} from '../tools/chapel-art-fixtures.mjs';
import {previousQ036} from '../tools/choir-art-fixtures.mjs';
import {previousQ038} from '../tools/water-art-fixtures.mjs';
import {read} from './oddland-helpers.mjs';
import {installDOM} from './view-dom.mjs';
import {replaceView} from '../src/view/view-layout.js';
let fixturePromise;
const fixtures=()=>fixturePromise??=maskArtFixtures();

test('q039 changes only stationary roles, casts and declared story revision',()=>{
 const q=structuredClone(data.quests.q039);
 assert.deepEqual(q.model.storyUpgrades[0].previous,previousQ039.story);
 assert.equal(q.story.entities.repairer.kind,'person');assert.equal(q.story.entities.claimants.kind,'group');
 assert.deepEqual(q.story.entities.buyer,previousQ039.story.entities.buyer);
 for(const key of ['repairer','claimants']){
  assert.equal(q.story.entities[key].character,'q039_'+key);
  delete q.story.entities[key];delete q.story.registry[key+'At'];
 }
 for(const r of Object.values(q.story.registry))if(r.values)r.values=r.values.filter(v=>!['repairer','claimants'].includes(v));
 for(const s of Object.values(q.story.scenes)){assert.deepEqual(s.cast.map(c=>c.entity),['repairer','claimants']);s.cast=[];}
 delete q.model.storyUpgrades;q.story.revision=1;q.model.edition.revision=1;
 assert.deepEqual(q,previousQ039);assert.equal(data.scenarioEditions.editions.e2.saveRevision,2);
 const group=data.characters.q039_claimants;
 assert.equal(group.name,'仮面の所有を主張する三人');assert.equal(group.portrait,undefined);assert.equal(group.sprite,undefined);
});

test('q039 fixtures cover all scenes before and after revision migration',async()=>{
 const {fixtures:states,outcomes}=await fixtures();assert.equal(states.length,6);assert.equal(outcomes.length,3);
 for(const f of states){const g=new GameEngine(data);g.load(f.save);assert.equal(g.save(),f.save);assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),q039Cast);}
});

test('q039 old narration, choices and completions migrate without resetting progress',()=>{
 let checks=0;const phases=new Set(),scenes=new Set();
 const check=g=>{
  const raw=g.save();assert.deepEqual(validateSave(JSON.parse(raw),g.data),[]);
  const current=new GameEngine(data);current.load(raw);assert.deepEqual(JSON.parse(current.save()),upgradedQ039Save(raw));
  assert.equal(g.save(),raw);checkpoint(current);checks++;
  phases.add(g.state.quests.q039.stage==='completed'?'completed':g.state.waiting?.type);scenes.add(g.state.stories.q039.scene);
 };
 for(const route of q039Routes){
  const g=q039Engine({legacy:true});check(g);
  for(const id of route.path){assert.ok(g.dispatch({type:'choose',id}));check(g);drain(g);check(g);}
  assert.equal(g.state.quests.q039.outcome,route.outcome);check(g);
 }
 assert.ok(checks>=24);for(const phase of ['text','choice','completed'])assert.ok(phases.has(phase));
 assert.deepEqual([...scenes].filter(Boolean).sort(),['account','entry','owners']);
});

test('q039 current and migrated routes retain the buyer, private repair marks and one reward',()=>{
 for(const legacy of [false,true])for(const route of q039Routes){
  const old=q039Engine({legacy}),g=new GameEngine(data);g.load(old.save());
  const inventory=structuredClone(g.state.inventory),members=[...g.state.members],location=structuredClone(g.state.location),gold=g.state.gold;
  const xp=Object.fromEntries(members.map(id=>[id,g.state.actors[id].xp]));
  for(const id of route.path){
   assert.throws(()=>g.complete('q039',route.outcome));choose(g,'q039',id);
   const v=g.state.stories.q039.values;
   for(const key of ['partyAt','buyerAt','repairerAt','claimantsAt'])assert.equal(v[key],'entry');
   assert.equal(v.jointMarks,g.state.stories.q039.events.includes('owners_marks'));
   assert.equal(v.maskAt,route.outcome==='contract'?'buyer':'entry');
   assert.equal(g.state.journey,null);assert.deepEqual(g.state.location,location);
   assert.deepEqual(g.state.inventory,inventory);assert.deepEqual(g.state.members,members);checkpoint(g);
  }
  // Switching from agreed marks to copies keeps the historical marks flag.
  assert.equal(g.state.stories.q039.values.jointMarks,route.path.includes('marks'));
  const reward=data.quests.q039.outcomes[route.outcome];assert.equal(g.state.quests.q039.outcome,route.outcome);
  assert.equal(g.state.gold,gold+reward.gold);for(const id of members)assert.equal(g.state.actors[id].xp,xp[id]+reward.xp);
  const before=g.save();assert.throws(()=>g.complete('q039',route.outcome));assert.equal(g.save(),before);
 }
});

test('q039 corrupt old state is rejected atomically before locations are added',()=>{
 const old=q039Engine({legacy:true}),g=q039Engine(),before=g.save();
 for(const mutate of [s=>s.values.buyerAt='nowhere',s=>s.values.maskAt='repairer',s=>delete s.values.jointMarks,s=>s.values.repairerAt='entry',s=>s.values.claimantsAt='entry',s=>s.knowledge.party=['unwritten'],s=>s.events.push('unwritten'),s=>s.revision=99]){
  const raw=JSON.parse(old.save());mutate(raw.state.stories.q039);assert.throws(()=>g.load(JSON.stringify(raw)));assert.equal(g.save(),before);
 }
});

test('q039 migration composes with three old stories, an inspector in transit, old geography and legacy q131',async()=>{
 const first131=await read('data/quests/q131.json'),prior=data.settlementMigration.previous;
 const oldQuests={q032:previousQ032,q036:previousQ036,q038:previousQ038,q039:previousQ039,q131:first131};
 const oldData={...prior,quests:{...prior.quests,...oldQuests},scripts:{...prior.scripts,...Object.assign({},...Object.values(oldQuests).map(q=>q.scripts))}};
 const raw=JSON.parse(ready().save());raw.state.worldTravel.version=1;
 const old=new GameEngine(oldData);old.load(JSON.stringify(raw));old.random=()=>.999999;
 start(old,'q032');choose(old,'q032','plate');start(old,'q036');choose(old,'q036','cut');
 start(old,'q039');for(const id of ['gather','marks','register'])choose(old,'q039',id);
 go(old,{kind:'town',location:'pilgrim_board'});assert.ok(old.accept('q131'));
 // Normalize the accepted legacy route before helper checkpoints require byte identity.
 old.load(old.save());
 start(old,'q038');choose(old,'q038','sample');assert.ok(old.dispatch({type:'choose',id:'filter'}));assert.equal(old.state.journey.action,'water_filter');
 const saved=JSON.parse(old.save());assert.deepEqual(validateSave(saved,oldData),[]);
 const g=new GameEngine(data);g.load(JSON.stringify(saved));const expected=upgradedQ039Save(JSON.stringify(saved));
 expected.state.stories.q032.revision=2;Object.assign(expected.state.stories.q032.values,{prisonerAt:'cell',craftspersonAt:'workshop'});
 expected.state.stories.q036.revision=2;Object.assign(expected.state.stories.q036.values,{conductorAt:'entry',choirAt:'entry'});
 expected.state.stories.q038.revision=2;expected.state.stories.q038.values.inspectorAt='transit';
 expected.state.worldTravel.version=2;(expected.state.flags.legacyStoryRoutes??={}).q131=true;
 assert.deepEqual(JSON.parse(g.save()),expected);checkpoint(g);
 const before=g.save(),bad=structuredClone(saved);bad.state.stories.q036.values.livePaused='invalid';
 assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),before);
 go(g,data.quests.q038.story.worldPlaces.entry);if(g.state.journey)assert.ok(g.dispatch({type:'story.resume',quest:'q038'}));drain(g);
 assert.equal(g.state.stories.q038.values.inspectorAt,'entry');choose(g,'q038','finish');assert.equal(g.state.quests.q038.outcome,'informed');checkpoint(g);
});

for(const layout of ['classic','scene'])test(layout+': q039 shows the repairer and exactly one three-person label without duplicating the buyer',async()=>{
 const dom=installDOM();let view;
 try{for(const f of (await fixtures()).fixtures){
  const g=new GameEngine(data);g.load(f.save);view=replaceView(view,layout,dom.root,intent=>g.dispatch(intent),{status(){},menu(){},help(){},soundEnabled:()=>false,effectsMode:()=> 'off'});view.render(projectGame(g));
  assert.equal(dom.root.querySelectorAll('[data-character]').length,2);
  assert.equal(dom.root.querySelector('[data-character="q039_repairer"] img').src,data.assets.images.npc_q039_repairer);
  const group=dom.root.querySelector('[data-character="q039_claimants"]');
  assert.ok(group.classList.contains('name-only'));assert.equal(group.querySelector('img'),null);assert.equal(group.querySelector('figcaption').textContent,'仮面の所有を主張する三人');
 }}finally{view?.destroy();dom.restore();}
});
