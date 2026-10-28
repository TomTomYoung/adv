import test from 'node:test';
import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {validateSave} from '../src/core/save.js';
import {data,choose,go,drain,checkpoint} from './pilgrimage-helpers.mjs';
import {q032Engine,q032Routes,previousQ032,chapelArtFixtures} from '../tools/chapel-art-fixtures.mjs';
import {projectGame} from '../src/application/projection.js';
import {fight} from './helpers.mjs';
import {read} from './oddland-helpers.mjs';
import {installDOM} from './view-dom.mjs';
import {replaceView} from '../src/view/view-layout.js';
let fixturePromise;
const fixtures=()=>fixturePromise??=chapelArtFixtures();

test('q032 retains its shipped previous story and only revises presentation and two stationary people',()=>{
 const q=data.quests.q032;
 assert.deepEqual(q.model.storyUpgrades[0].previous,previousQ032.story);
 assert.deepEqual(q.story.actions,previousQ032.story.actions);
 assert.deepEqual(q.outcomes,previousQ032.outcomes);
 assert.deepEqual(q.story.worldPlaces,previousQ032.story.worldPlaces);
 for(const key of ['resolution','finished','partyAt'])assert.deepEqual(q.story.registry[key],previousQ032.story.registry[key]);
 assert.equal(q.story.revision,2);assert.equal(data.scenarioEditions.editions.e2.saveRevision,2);
 assert.match(q.model.graph.find(n=>n.id==='workshop').text,/棚にある元の宝玉/);
});

test('q032 current and migrated checkpoints display only the local speaker in every scene',async()=>{
 const {fixtures:states,outcomes}=await fixtures();assert.equal(states.length,12);assert.equal(outcomes.length,3);
 for(const f of states){const g=new GameEngine(data);g.load(f.save);assert.equal(g.state.stories.q032.revision,2);assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),f.cast);}
});

test('q032 revision-one text, choices, journeys, battles and completions migrate atomically',()=>{
 const seen=new Set();let checkpoints=0;
 const check=g=>{
  const raw=g.save(),saved=JSON.parse(raw);assert.deepEqual(validateSave(saved,g.data),[]);
  const newer=new GameEngine(data);newer.load(raw);const expected=structuredClone(saved);
  Object.assign(expected.state.stories.q032.values,{prisonerAt:'cell',craftspersonAt:'workshop'});expected.state.stories.q032.revision=2;
  assert.deepEqual(JSON.parse(newer.save()),expected,'only stationary holder fields and story revision are added');
  assert.equal(g.save(),raw);checkpoint(newer);checkpoints++;
  if(g.state.stories.q032.scene)seen.add(g.state.stories.q032.scene);
 };
 for(const route of q032Routes){
  const g=q032Engine({legacy:true});check(g);
  for(const id of route.path){
   assert.ok(g.dispatch({type:'choose',id}));check(g);drain(g);check(g);
   if(g.state.battle){g.healAll();fight(g);check(g);}
   if(g.state.journey){const to=g.data.quests.q032.story.actions[g.state.journey.action].journey.to;go(g,g.data.quests.q032.story.worldPlaces[to]);drain(g);check(g);}
  }
  assert.equal(g.state.quests.q032.outcome,route.outcome);check(g);
 }
 assert.deepEqual([...seen].sort(),Object.keys(data.quests.q032.story.scenes).sort());assert.ok(checkpoints>=40);
});

test('q032 corrupt old holders and unknown state do not gain migration defaults',()=>{
 const old=q032Engine({legacy:true}),g=q032Engine(),before=g.save();
 for(const mutate of [s=>s.values.stoneAt='nowhere',s=>delete s.values.jewelAt,s=>s.values.prisonerAt='cell',s=>s.events.push('unwritten')]){
  const bad=JSON.parse(old.save());mutate(bad.state.stories.q032);assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),before);
 }
});

test('q032 stone transfers on departure and finish, with stationary people and unchanged inventory',()=>{
 const g=q032Engine(),inventory=structuredClone(g.state.inventory),members=[...g.state.members];
 choose(g,'q032','look');choose(g,'q032','opaque');
 assert.ok(g.dispatch({type:'choose',id:'stone'}));drain(g);const v=()=>g.state.stories.q032.values;
 assert.equal(v().stoneAt,'party');assert.equal(v().prisonerAt,'cell');assert.equal(v().craftspersonAt,'workshop');assert.equal(v().jewelAt,'entry');checkpoint(g);
 go(g,data.quests.q032.story.worldPlaces.entry);drain(g);assert.equal(v().stoneAt,'party');assert.deepEqual(projectGame(g).dialog.scene.cast,[]);
 const before=g.state.gold;choose(g,'q032','finish');assert.equal(v().stoneAt,'entry');assert.equal(g.state.gold,before+93);
 assert.deepEqual(g.state.inventory,inventory);assert.deepEqual(g.state.members,members);checkpoint(g);
});

test('q032 migration composes with geography one and an unmarked old accepted q131 route',async()=>{
 const first131=await read('data/quests/q131.json'),prior=data.settlementMigration.previous;
 const oldData={...prior,quests:{...prior.quests,q032:previousQ032,q131:first131},scripts:{...prior.scripts,...previousQ032.scripts,...first131.scripts}};
 const raw=JSON.parse(q032Engine({legacy:true}).save());raw.state.worldTravel.version=1;
 assert.deepEqual(validateSave(raw,oldData),[]);
 const old=new GameEngine(oldData);old.load(JSON.stringify(raw));old.random=()=>.999999;choose(old,'q032','plate');go(old,{kind:'town',location:'pilgrim_board'});assert.ok(old.accept('q131'));
 const saved=JSON.parse(old.save());assert.deepEqual(validateSave(saved,oldData),[]);assert.equal(saved.state.flags.legacyStoryRoutes?.q131,undefined);
 const g=new GameEngine(data);g.load(JSON.stringify(saved));const expected=structuredClone(saved);
 expected.state.worldTravel.version=2;(expected.state.flags.legacyStoryRoutes??={}).q131=true;
 Object.assign(expected.state.stories.q032.values,{prisonerAt:'cell',craftspersonAt:'workshop'});expected.state.stories.q032.revision=2;
 assert.deepEqual(JSON.parse(g.save()),expected);checkpoint(g);
 const before=g.save(),bad=structuredClone(saved);bad.state.stories.q032.values.stoneAt='nowhere';
 assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),before);
});

for(const layout of ['classic','scene'])test(`${layout}: all six q032 scenes render exact local casts in current and migrated saves`,async()=>{
 const dom=installDOM();let view;
 try{for(const f of (await fixtures()).fixtures){
  const g=new GameEngine(data);g.load(f.save);
  view=replaceView(view,layout,dom.root,intent=>g.dispatch(intent),{status(){},menu(){},help(){},soundEnabled:()=>false,effectsMode:()=> 'off'});view.render(projectGame(g));
  assert.equal(dom.root.querySelectorAll('[data-character]').length,f.cast.length);
  for(const id of f.cast){const person=dom.root.querySelector(`[data-character="${id}"]`);assert.ok(person);assert.ok(person.textContent.includes(data.characters[id].name));assert.equal(person.querySelector('img').src,data.assets.images['npc_'+id]);}
 }}finally{view?.destroy();dom.restore();}
});
