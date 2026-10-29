import test from 'node:test';
import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {validateSave} from '../src/core/save.js';
import {projectGame} from '../src/application/projection.js';
import {data,ready,start,choose,drain,checkpoint,go} from './pilgrimage-helpers.mjs';
import {q038Engine,q038Routes,q038Cast,previousQ038,upgradedQ038Save,waterArtFixtures} from '../tools/water-art-fixtures.mjs';
import {previousQ032} from '../tools/chapel-art-fixtures.mjs';
import {previousQ036} from '../tools/choir-art-fixtures.mjs';
import {read} from './oddland-helpers.mjs';
import {installDOM} from './view-dom.mjs';
import {replaceView} from '../src/view/view-layout.js';
let fixturePromise;
const fixtures=()=>fixturePromise??=waterArtFixtures();

// Each save boundary is exercised with both shipped and current definitions.
function step(g,id,check=()=>{}){
 assert.ok(g.dispatch({type:'choose',id}));check(g);drain(g);check(g);
 if(g.state.journey){
  const action=g.state.journey.action;
  assert.equal(g.dispatch({type:'story.resume',quest:'q038'}),false);check(g);
  go(g,data.quests.q038.story.worldPlaces[data.quests.q038.story.actions[action].journey.to]);check(g);
  if(g.state.journey)assert.ok(g.dispatch({type:'story.resume',quest:'q038'}));
  drain(g);check(g);
 }
}

test('q038 adds only the inspector, two casts, one companion and declared revision',()=>{
 const q=structuredClone(data.quests.q038);
 assert.deepEqual(q.model.storyUpgrades[0].previous,previousQ038.story);
 assert.equal(q.story.entities.inspector.character,'q038_inspector');assert.equal(q.story.registry.inspectorAt.initial,'lab');
 delete q.story.entities.inspector;delete q.story.registry.inspectorAt;
 for(const r of Object.values(q.story.registry))if(r.values)r.values=r.values.filter(v=>v!=='inspector');
 for(const [id,s] of Object.entries(q.story.scenes)){assert.deepEqual(s.cast.map(c=>c.entity),q038Cast(id).length?['inspector']:[]);s.cast=[];}
 const action=q.story.actions.water_filter;assert.deepEqual(action.journey.companions,['inspector']);action.journey.companions=[];
 assert.deepEqual(action.effects[0].entities,['party','inspector']);action.effects[0].entities=['party'];
 delete q.model.storyUpgrades;q.story.revision=1;q.model.edition.revision=1;
 assert.deepEqual(q,previousQ038);assert.equal(data.scenarioEditions.editions.e2.saveRevision,2);
});

test('q038 fixtures cover all scenes and both supply origins before and after migration',async()=>{
 const {fixtures:states,outcomes}=await fixtures();assert.equal(states.length,16);assert.equal(outcomes.length,3);
 for(const f of states){const g=new GameEngine(data);g.load(f.save);assert.equal(g.save(),f.save);assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),q038Cast(f.scene));}
});

test('q038 old narration, choices, journeys and completions migrate without resetting progress',()=>{
 let checks=0;const locations=new Set(),phases=new Set(),journeys=new Set();
 const check=g=>{
  const raw=g.save();assert.deepEqual(validateSave(JSON.parse(raw),g.data),[]);
  const current=new GameEngine(data);current.load(raw);assert.deepEqual(JSON.parse(current.save()),upgradedQ038Save(raw));
  assert.equal(g.save(),raw);checkpoint(current);checks++;
  locations.add(current.state.stories.q038.values.inspectorAt);phases.add(g.state.quests.q038.stage==='completed'?'completed':g.state.waiting?.type);
  if(g.state.journey)journeys.add(g.state.journey.action);
 };
 for(const route of q038Routes){const g=q038Engine({legacy:true});check(g);for(const id of route.path)step(g,id,check);assert.equal(g.state.quests.q038.outcome,route.outcome);check(g);}
 assert.ok(checks>=60);assert.ok(phases.has('text'));assert.ok(phases.has('choice'));assert.ok(phases.has('completed'));
 assert.deepEqual([...locations].sort(),['entry','lab','transit']);assert.equal(journeys.size,6);
});

test('q038 inspector accompanies only water_filter and every migrated journey can finish',()=>{
 for(const legacy of [false,true])for(const route of q038Routes){
  const g=q038Engine({legacy});
  for(const id of route.path)step(g,id,old=>{
   const raw=old.save(),current=new GameEngine(data);current.load(raw);const s=current.state.stories.q038,j=current.state.journey;
   assert.equal(s.values.inspectorAt,j?.quest==='q038'&&j.action==='water_filter'?'transit':s.events.includes('water_filter')?'entry':'lab');
   if(j){
    assert.equal(s.scene,null);assert.equal(s.events.includes(j.action),false);
    assert.deepEqual(projectGame(current).dialog?.scene?.cast??[],[]);
    const target=data.quests.q038.story.actions[j.action].journey.to;
    go(current,data.quests.q038.story.worldPlaces[target]);if(current.state.journey)assert.ok(current.dispatch({type:'story.resume',quest:'q038'}));drain(current);
    assert.equal(current.state.journey,null);assert.equal(current.state.stories.q038.values.inspectorAt,j.action==='water_filter'?'entry':'lab');checkpoint(current);
   }
  });
 }
});

test('q038 current and migrated routes preserve samples, water tests, filter changes and one reward',()=>{
 for(const legacy of [false,true])for(const route of q038Routes){
  const old=q038Engine({legacy}),g=new GameEngine(data);g.load(old.save());g.random=()=>.999999;
  const inventory=structuredClone(g.state.inventory),members=[...g.state.members],gold=g.state.gold,xp=Object.fromEntries(members.map(id=>[id,g.state.actors[id].xp]));
  for(const id of route.path){assert.throws(()=>g.complete('q038',route.outcome));choose(g,'q038',id);checkpoint(g);}
  const v=g.state.stories.q038.values,reward=data.quests.q038.outcomes[route.outcome];
  assert.equal(v.filterChanged,route.path.includes('replace')||route.path.includes('filter'));
  assert.equal(v.waterTested,route.path.includes('sample')||route.path.includes('test'));
  assert.equal(v.sampleAt,route.path.includes('sample')?'lab':'entry');assert.equal(v.afterSampleAt,route.path.includes('test')?'lab':'entry');
  assert.equal(v.inspectorAt,route.path.includes('filter')?'entry':'lab');
  assert.deepEqual(g.state.inventory,inventory);assert.deepEqual(g.state.members,members);assert.equal(g.state.gold,gold+reward.gold);
  for(const id of members)assert.equal(g.state.actors[id].xp,xp[id]+reward.xp);
  const before=g.save();assert.throws(()=>g.complete('q038',route.outcome));assert.equal(g.save(),before);
 }
});

test('q038 invalid legacy state and unsupported revision are rejected atomically',()=>{
 const old=q038Engine({legacy:true}),g=q038Engine(),before=g.save();
 for(const mutate of [s=>s.values.partyAt='nowhere',s=>delete s.values.waterTested,s=>s.values.inspectorAt='lab',s=>s.events.push('unwritten'),s=>s.knowledge.party=['unwritten'],s=>s.revision=99]){
  const raw=JSON.parse(old.save());mutate(raw.state.stories.q038);assert.throws(()=>g.load(JSON.stringify(raw)));assert.equal(g.save(),before);
 }
});

test('q038 migration composes with q032, q036, old geography and accepted legacy q131',async()=>{
 const first131=await read('data/quests/q131.json'),prior=data.settlementMigration.previous;
 const oldData={...prior,quests:{...prior.quests,q032:previousQ032,q036:previousQ036,q038:previousQ038,q131:first131},scripts:{...prior.scripts,...previousQ032.scripts,...previousQ036.scripts,...previousQ038.scripts,...first131.scripts}};
 const raw=JSON.parse(ready().save());raw.state.worldTravel.version=1;
 const old=new GameEngine(oldData);old.load(JSON.stringify(raw));old.random=()=>.999999;
 start(old,'q032');choose(old,'q032','plate');start(old,'q036');choose(old,'q036','cut');
 start(old,'q038');choose(old,'q038','sample');choose(old,'q038','filter');choose(old,'q038','finish');
 go(old,{kind:'town',location:'pilgrim_board'});assert.ok(old.accept('q131'));
 const saved=JSON.parse(old.save());assert.deepEqual(validateSave(saved,oldData),[]);
 const g=new GameEngine(data);g.load(JSON.stringify(saved));const expected=upgradedQ038Save(JSON.stringify(saved));
 expected.state.stories.q032.revision=2;Object.assign(expected.state.stories.q032.values,{prisonerAt:'cell',craftspersonAt:'workshop'});
 expected.state.stories.q036.revision=2;Object.assign(expected.state.stories.q036.values,{conductorAt:'entry',choirAt:'entry'});
 expected.state.worldTravel.version=2;(expected.state.flags.legacyStoryRoutes??={}).q131=true;
 assert.deepEqual(JSON.parse(g.save()),expected);checkpoint(g);
 const before=g.save(),bad=structuredClone(saved);bad.state.stories.q036.values.livePaused='invalid';
 assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),before);
});

for(const layout of ['classic','scene'])test(layout+': q038 inspector appears only at the two supported scenes',async()=>{
 const dom=installDOM();let view;
 try{for(const f of (await fixtures()).fixtures){
  const g=new GameEngine(data);g.load(f.save);view=replaceView(view,layout,dom.root,intent=>g.dispatch(intent),{status(){},menu(){},help(){},soundEnabled:()=>false,effectsMode:()=> 'off'});view.render(projectGame(g));
  assert.equal(dom.root.querySelectorAll('[data-character]').length,f.cast.length);
  if(f.cast.length)assert.equal(dom.root.querySelector('[data-character="q038_inspector"] img').src,data.assets.images.npc_q038_inspector);
 }}finally{view?.destroy();dom.restore();}
});
