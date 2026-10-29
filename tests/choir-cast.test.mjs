import test from 'node:test';
import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {validateSave} from '../src/core/save.js';
import {projectGame} from '../src/application/projection.js';
import {data,ready,start,choose,drain,checkpoint,go} from './pilgrimage-helpers.mjs';
import {q036Engine,q036Routes,q036Cast,previousQ036,previousQ036Data,upgradedQ036Save,choirArtFixtures} from '../tools/choir-art-fixtures.mjs';
import {previousQ032} from '../tools/chapel-art-fixtures.mjs';
import {read} from './oddland-helpers.mjs';
import {installDOM} from './view-dom.mjs';
import {replaceView} from '../src/view/view-layout.js';
let fixturePromise;
const fixtures=()=>fixturePromise??=choirArtFixtures();

test('q036 changes only stationary roles, casts and declared story revision',()=>{
 const q=structuredClone(data.quests.q036);
 assert.deepEqual(q.model.storyUpgrades[0].previous,previousQ036.story);
 assert.equal(q.story.entities.conductor.kind,'person');assert.equal(q.story.entities.choir.kind,'group');
 for(const key of ['conductor','choir']){
  assert.equal(q.story.entities[key].character,'q036_'+key);
  delete q.story.entities[key];delete q.story.registry[key+'At'];
 }
 for(const s of Object.values(q.story.scenes)){assert.deepEqual(s.cast.map(c=>c.entity),['conductor','choir']);s.cast=[];}
 delete q.model.storyUpgrades;q.story.revision=1;q.model.edition.revision=1;
 assert.deepEqual(q,previousQ036);
 assert.equal(data.scenarioEditions.editions.e2.saveRevision,2);
 const group=data.characters.q036_choir;
 assert.equal(group.name,'六人の歌い手');assert.equal(group.portrait,undefined);assert.equal(group.sprite,undefined);
});

test('q036 fixtures cover all scenes before and after revision migration',async()=>{
 const {fixtures:states,outcomes}=await fixtures();assert.equal(states.length,6);assert.equal(outcomes.length,3);
 for(const f of states){const g=new GameEngine(data);g.load(f.save);assert.equal(g.save(),f.save);assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),q036Cast);}
});

test('q036 old text, choices and completions migrate without resetting any saved progress',()=>{
 let checks=0;const phases=new Set(),scenes=new Set();
 const check=g=>{
  const raw=g.save();assert.deepEqual(validateSave(JSON.parse(raw),g.data),[]);
  const current=new GameEngine(data);current.load(raw);assert.deepEqual(JSON.parse(current.save()),upgradedQ036Save(raw));
  assert.equal(g.save(),raw);checkpoint(current);checks++;
  phases.add(g.state.quests.q036.stage==='completed'?'completed':g.state.waiting?.type);scenes.add(g.state.stories.q036.scene);
 };
 for(const route of q036Routes){
  const g=q036Engine({legacy:true});check(g);
  for(const id of route.path){assert.ok(g.dispatch({type:'choose',id}));check(g);drain(g);check(g);}
  assert.equal(g.state.quests.q036.outcome,route.outcome);check(g);
 }
 assert.ok(checks>=24);assert.ok(phases.has('choice'));assert.ok(phases.has('completed'));
 assert.deepEqual([...scenes].filter(Boolean).sort(),['credit','entry','recording']);
});

test('q036 current and migrated routes preserve paused singing, rehearsal, position and one reward',()=>{
 for(const legacy of [false,true])for(const route of q036Routes){
  const old=q036Engine({legacy}),g=new GameEngine(data);g.load(old.save());
  const inventory=structuredClone(g.state.inventory),members=[...g.state.members],location=structuredClone(g.state.location),gold=g.state.gold;
  const xp=Object.fromEntries(members.map(id=>[id,g.state.actors[id].xp]));
  for(const id of route.path){
   assert.throws(()=>g.complete('q036',route.outcome));choose(g,'q036',id);
   const v=g.state.stories.q036.values;
   for(const key of ['partyAt','conductorAt','choirAt'])assert.equal(v[key],'entry');
   assert.equal(v.livePaused,route.path.includes('solo')&&!v.rehearsed);
   assert.equal(v.rehearsed,['rehearse','program','separate'].includes(id));
   assert.equal(g.state.journey,null);assert.deepEqual(g.state.location,location);
   assert.deepEqual(g.state.inventory,inventory);assert.deepEqual(g.state.members,members);checkpoint(g);
  }
  const reward=data.quests.q036.outcomes[route.outcome];assert.equal(g.state.quests.q036.outcome,route.outcome);
  assert.equal(g.state.gold,gold+reward.gold);for(const id of members)assert.equal(g.state.actors[id].xp,xp[id]+reward.xp);
  const before=g.save();assert.throws(()=>g.complete('q036',route.outcome));assert.equal(g.save(),before);
 }
});

test('q036 corrupt old state is rejected atomically before defaults are added',()=>{
 const old=q036Engine({legacy:true}),g=q036Engine(),before=g.save();
 for(const mutate of [s=>s.values.partyAt='nowhere',s=>delete s.values.livePaused,s=>s.values.conductorAt='entry',s=>s.values.choirAt='entry',s=>s.knowledge.party=['unwritten'],s=>s.events.push('unwritten')]){
  const raw=JSON.parse(old.save());mutate(raw.state.stories.q036);assert.throws(()=>g.load(JSON.stringify(raw)));assert.equal(g.save(),before);
 }
});

test('q036 migration composes with q032, old geography and accepted legacy q131',async()=>{
 const first131=await read('data/quests/q131.json'),prior=data.settlementMigration.previous;
 const oldData={...prior,quests:{...prior.quests,q032:previousQ032,q036:previousQ036,q131:first131},scripts:{...prior.scripts,...previousQ032.scripts,...previousQ036.scripts,...first131.scripts}};
 const raw=JSON.parse(ready().save());raw.state.worldTravel.version=1;
 const old=new GameEngine(oldData);old.load(JSON.stringify(raw));old.random=()=>.999999;
 start(old,'q032');choose(old,'q032','plate');start(old,'q036');choose(old,'q036','solo');choose(old,'q036','memorial');
 go(old,{kind:'town',location:'pilgrim_board'});assert.ok(old.accept('q131'));
 const saved=JSON.parse(old.save());assert.deepEqual(validateSave(saved,oldData),[]);
 const g=new GameEngine(data);g.load(JSON.stringify(saved));const expected=upgradedQ036Save(JSON.stringify(saved));
 expected.state.stories.q032.revision=2;Object.assign(expected.state.stories.q032.values,{prisonerAt:'cell',craftspersonAt:'workshop'});
 expected.state.worldTravel.version=2;(expected.state.flags.legacyStoryRoutes??={}).q131=true;
 assert.deepEqual(JSON.parse(g.save()),expected);checkpoint(g);
 const before=g.save(),bad=structuredClone(saved);bad.state.stories.q036.values.livePaused='invalid';
 assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),before);
});

for(const layout of ['classic','scene'])test(layout+': q036 keeps six singers present as a collective beside the conductor',async()=>{
 const dom=installDOM();let view;
 try{for(const f of (await fixtures()).fixtures){
  const g=new GameEngine(data);g.load(f.save);view=replaceView(view,layout,dom.root,intent=>g.dispatch(intent),{status(){},menu(){},help(){},soundEnabled:()=>false,effectsMode:()=> 'off'});view.render(projectGame(g));
  assert.equal(dom.root.querySelectorAll('[data-character]').length,2);
  assert.equal(dom.root.querySelector('[data-character="q036_conductor"] img').src,data.assets.images.npc_q036_conductor);
  const group=dom.root.querySelector('[data-character="q036_choir"]');
  assert.ok(group.classList.contains('name-only'));assert.equal(group.querySelector('img'),null);assert.equal(group.querySelector('figcaption').textContent,'六人の歌い手');
 }}finally{view?.destroy();dom.restore();}
});
