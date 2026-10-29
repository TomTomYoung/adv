import test from 'node:test';
import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {validateSave} from '../src/core/save.js';
import {projectGame} from '../src/application/projection.js';
import {data,ready,start,choose,go,drain,checkpoint} from './pilgrimage-helpers.mjs';
import {q033Engine,q033Routes,previousQ033,previousQ033Data,pilgrimArtFixtures} from '../tools/pilgrim-art-fixtures.mjs';
import {previousQ032} from '../tools/chapel-art-fixtures.mjs';
import {installDOM} from './view-dom.mjs';
import {replaceView} from '../src/view/view-layout.js';
let fixturePromise;
const fixtures=()=>fixturePromise??=pilgrimArtFixtures();

test('q033 preserves state definitions, routes and rewards while connecting the existing pilgrim',()=>{
 const q=data.quests.q033;
 for(const key of ['registry','actions','worldPlaces','revision','endings','initialKnowledge','propositions'])assert.deepEqual(q.story[key],previousQ033.story[key]);
 assert.deepEqual(q.outcomes,previousQ033.outcomes);assert.deepEqual(q.story.entities.cloak,previousQ033.story.entities.cloak);
 assert.equal(q.story.entities.pilgrim.character,'q033_pilgrim');assert.equal(q.story.revision,1);assert.equal(q.model.storyUpgrades,undefined);
 for(const s of Object.values(q.story.scenes))assert.deepEqual(s.cast.map(c=>c.entity),['pilgrim']);
 assert.match(q.model.graph.find(n=>n.id==='guest').text,/外套を握ったまま/);
 for(const n of q.model.graph.filter(n=>n.id!=='guest'))assert.deepEqual(n,previousQ033.model.graph.find(p=>p.id===n.id));
});

test('q033 fixtures preserve both guest knowledge states and all current and legacy casts',async()=>{
 const {fixtures:states,outcomes}=await fixtures();assert.equal(states.length,12);assert.equal(outcomes.length,3);
 for(const f of states){
  const s=JSON.parse(f.save).state.stories.q033;
  if(f.scene==='guest')assert.equal(s.knowledge.party?.includes('truth')??false,f.variant.endsWith('-informed'));
  const g=new GameEngine(data);g.load(f.save);assert.equal(g.save(),f.save);assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['q033_pilgrim']);
 }
});

test('q033 old text, choices, journeys and completed saves resume byte-for-byte on every route',()=>{
 const seen=new Set();let checkpoints=0;
 const check=g=>{
  const raw=g.save();assert.deepEqual(validateSave(JSON.parse(raw),g.data),[]);
  const current=new GameEngine(data);current.load(raw);assert.equal(current.save(),raw);checkpoint(current);checkpoints++;
  if(g.state.stories.q033.scene)seen.add(g.state.stories.q033.scene);
 };
 for(const route of q033Routes){
  const g=q033Engine({legacy:true});check(g);
  for(const id of route.path){
   assert.ok(g.dispatch({type:'choose',id}));check(g);drain(g);check(g);
   assert.equal(g.state.battle,null);
   if(g.state.journey){const a=g.data.quests.q033.story.actions[g.state.journey.action];go(g,g.data.quests.q033.story.worldPlaces[a.journey.to]);drain(g);check(g);}
  }
  assert.equal(g.state.quests.q033.outcome,route.outcome);check(g);
 }
 assert.deepEqual([...seen].sort(),Object.keys(data.quests.q033.story.scenes).sort());assert.ok(checkpoints>=30);
});

test('q033 escorts only the pilgrim, retains the cloak, and pays each ending once',()=>{
 for(const route of q033Routes){
  const g=q033Engine(),members=[...g.state.members],inventory=structuredClone(g.state.inventory),gold=g.state.gold,experience=Object.fromEntries(g.state.members.map(id=>[id,g.state.actors[id].xp]));
  for(const id of route.path){
   assert.ok(g.dispatch({type:'choose',id}));drain(g);
   if(g.state.journey){
    const a=g.data.quests.q033.story.actions[g.state.journey.action];assert.deepEqual(a.journey.companions,['pilgrim']);
    assert.equal(g.state.stories.q033.values.partyAt,'transit');assert.equal(g.state.stories.q033.values.pilgrimAt,'transit');
    assert.equal(g.state.stories.q033.values.cloakAt,'pilgrim');assert.equal(g.state.quests.q033.stage,'active');checkpoint(g);
    go(g,data.quests.q033.story.worldPlaces[a.journey.to]);drain(g);
    assert.equal(g.state.stories.q033.values.pilgrimAt,a.journey.to);assert.equal(g.state.quests.q033.stage,'active');
   }
   assert.equal(g.state.stories.q033.values.cloakAt,'pilgrim');assert.deepEqual(g.state.members,members);assert.deepEqual(g.state.inventory,inventory);checkpoint(g);
  }
  const reward=data.quests.q033.outcomes[route.outcome];assert.equal(g.state.gold,gold+reward.gold);for(const id of members){assert.ok(g.state.actors[id].hp>0);assert.equal(g.state.actors[id].xp,experience[id]+reward.xp);}
  assert.equal(g.state.quests.q033.outcome,route.outcome);const before=g.save();assert.throws(()=>g.complete('q033',route.outcome));assert.equal(g.save(),before);
 }
});

test('q033 invalid holders, knowledge and events are rejected without changing the current game',()=>{
 const old=q033Engine({legacy:true}),g=q033Engine(),before=g.save();
 for(const mutate of [s=>s.values.pilgrimAt='nowhere',s=>delete s.values.cloakAt,s=>s.values.extraState=true,s=>s.knowledge.party=['unwritten'],s=>s.events.push('unwritten')]){
  const saved=JSON.parse(old.save());mutate(saved.state.stories.q033);assert.throws(()=>g.load(JSON.stringify(saved)));assert.equal(g.save(),before);
 }
});

test('q033 old saves coexist with the declared q032 revision migration',()=>{
 const oldData={...previousQ033Data,quests:{...previousQ033Data.quests,q032:previousQ032},scripts:{...previousQ033Data.scripts,...previousQ032.scripts},characters:Object.fromEntries(Object.entries(previousQ033Data.characters).filter(([id])=>!id.startsWith('q032_')))};
 const old=new GameEngine(oldData);old.load(ready().save());old.random=()=>.999999;
 start(old,'q032');choose(old,'q032','plate');start(old,'q033');choose(old,'q033','cloth');choose(old,'q033','room');
 const raw=JSON.parse(old.save());assert.deepEqual(validateSave(raw,oldData),[]);
 const g=new GameEngine(data);g.load(JSON.stringify(raw));const expected=structuredClone(raw);
 expected.state.stories.q032.revision=2;Object.assign(expected.state.stories.q032.values,{prisonerAt:'cell',craftspersonAt:'workshop'});
 assert.deepEqual(JSON.parse(g.save()),expected);checkpoint(g);choose(g,'q033','finish');assert.equal(g.state.quests.q033.outcome,'compromise');
});

for(const layout of ['classic','scene'])test(`${layout}: q033 shows the same pilgrim through all five scenes and both guest paths`,async()=>{
 const dom=installDOM();let view;
 try{for(const f of (await fixtures()).fixtures){
  const g=new GameEngine(data);g.load(f.save);
  view=replaceView(view,layout,dom.root,intent=>g.dispatch(intent),{status(){},menu(){},help(){},soundEnabled:()=>false,effectsMode:()=> 'off'});view.render(projectGame(g));
  const people=dom.root.querySelectorAll('[data-character]');assert.equal(people.length,1);assert.equal(people[0].dataset.character,'q033_pilgrim');
  assert.equal(people[0].querySelector('img').src,data.assets.images.npc_q033_pilgrim);assert.ok(people[0].textContent.includes(data.characters.q033_pilgrim.name));
  if(layout==='classic'&&f.scene==='guest')assert.deepEqual([...dom.root.querySelectorAll('.town-character')].map(i=>i.src),[data.assets.images.npc_q033_pilgrim]);
 }}finally{view?.destroy();dom.restore();}
});
