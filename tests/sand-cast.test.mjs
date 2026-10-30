import test from 'node:test';
import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {validateSave} from '../src/core/save.js';
import {projectGame} from '../src/application/projection.js';
import {data,start,choose,go,drain,checkpoint} from './pilgrimage-helpers.mjs';
import {q131Engine,q131Routes,q131Cast,previousQ131,previousQ131Data,q131AcceptedEngine,q131AcceptedRoutes,q131AcceptedChoose,acceptedQ131Data,sandArtFixtures} from '../tools/sand-art-fixtures.mjs';
import {previousQ039} from '../tools/mask-art-fixtures.mjs';
import {installDOM} from './view-dom.mjs';
import {replaceView} from '../src/view/view-layout.js';
let fixturePromise;const fixtures=()=>fixturePromise??=sandArtFixtures();

test('q131 adds only three character bindings and casts, preserving all prose, journeys, costs and old scripts',()=>{
 const q=structuredClone(data.quests.q131);
 for(const role of ['sher','teacher','porter']){assert.equal(q.story.entities[role].character,'q131_'+role);delete q.story.entities[role].character;}
 for(const [id,scene] of Object.entries(q.story.scenes)){assert.deepEqual(scene.cast.map(c=>'q131_'+c.entity),q131Cast(id));scene.cast=[];}
 assert.deepEqual(q,previousQ131);assert.equal(q.story.revision,1);assert.equal(q.model.preserveAcceptedRoute,true);assert.equal(q.model.storyUpgrades,undefined);
});

test('q131 fixtures distinguish current, previous physical and previously accepted routes with and without rope',async()=>{
 const result=await fixtures();assert.equal(result.fixtures.length,20);assert.equal(result.outcomes.length,4);
 for(const f of result.fixtures){const g=new GameEngine(data);g.load(f.save);assert.equal(g.save(),f.save);
  if(f.absentStoryScene){assert.equal(g.state.stories.q131,undefined);assert.equal(projectGame(g).dialog.scene,undefined);}
  else assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),f.cast);
 }
 assert.equal(result.fixtures.filter(f=>f.blockedChoice==='both').length,2);
 assert.equal(result.fixtures.filter(f=>f.absentStoryScene).length,4);
});

test('q131 previous physical saves preserve waiting prose, options, journeys and completion byte-for-byte',()=>{
 const phases=new Set(),scenes=new Set();let checks=0;
 const check=g=>{
  const raw=g.save();assert.deepEqual(validateSave(JSON.parse(raw),g.data),[]);
  const now=new GameEngine(data);now.load(raw);assert.equal(now.save(),raw);checkpoint(now);checks++;
  const before=projectGame(g).dialog,after=projectGame(now).dialog;
  assert.equal(after?.text,before?.text);assert.deepEqual(after?.options,before?.options);
  phases.add(g.state.journey?'journey':g.state.quests.q131.stage==='completed'?'completed':g.state.waiting?.type);
  if(g.state.stories.q131.scene)scenes.add(g.state.stories.q131.scene);
 };
 for(const route of q131Routes){const g=q131Engine({legacy:true});check(g);
  for(const id of ['tracks','test',...route.path]){
   assert.ok(g.dispatch({type:'choose',id}));check(g);drain(g);check(g);
   if(g.state.journey){const a=data.quests.q131.story.actions[g.state.journey.action];go(g,data.quests.q131.story.worldPlaces[a.journey.to]);check(g);drain(g);check(g);}
  }
  assert.equal(g.state.quests.q131.outcome,route.outcome);check(g);
 }
 for(const phase of ['text','choice','journey','completed'])assert.ok(phases.has(phase),phase);
 assert.deepEqual([...scenes].sort(),Object.keys(data.quests.q131.story.scenes).sort());assert.ok(checks>=70);
});

test('q131 all current and resumed routes keep the right companions and transfer the sample only at arrival',()=>{
 for(const legacy of [false,true])for(const route of q131Routes){
  const prior=q131Engine({legacy}),g=new GameEngine(data);g.load(prior.save());g.random=()=>.999999;
  const members=[...g.state.members];let payments=0;const complete=g.complete.bind(g);
  g.complete=(id,outcome)=>{const gold=g.state.gold;const result=complete(id,outcome);if(id==='q131'){payments++;assert.equal(g.state.gold-gold,data.quests.q131.outcomes[outcome].gold);}return result;};
  for(const id of ['tracks','test',...route.path]){
   assert.ok(g.dispatch({type:'choose',id}));drain(g);
   if(g.state.journey){
    const a=data.quests.q131.story.actions[g.state.journey.action],v=g.state.stories.q131.values;
    const carriesPerson=['room_person','room_both_ready_continue'].includes(g.state.journey.action),carriesSample=['room_sample','room_both_ready_continue'].includes(g.state.journey.action);
    assert.deepEqual(a.journey.companions,carriesPerson?['teacher','sher','porter']:['sher','porter']);
    assert.equal(v.sherAt,'transit');assert.equal(v.porterAt,'transit');assert.equal(v.teacherAt,carriesPerson?'transit':'room');assert.equal(v.sampleAt,carriesSample?'party':'room');
    checkpoint(g);go(g,data.quests.q131.story.worldPlaces[a.journey.to]);drain(g);
   }
   checkpoint(g);assert.deepEqual(g.state.members,members);
  }
  const v=g.state.stories.q131.values;
  assert.equal(g.state.quests.q131.outcome,route.outcome);assert.equal(v.sherAt,'report');assert.equal(v.porterAt,'report');
  assert.equal(v.teacherAt,route.outcome==='sample'?'room':'report');assert.equal(v.sampleAt,route.outcome==='person'?'room':'report');
  assert.equal(g.state.inventory.rope,['all','school'].includes(route.outcome)?0:1);assert.equal(payments,1);
  const before=g.save();assert.throws(()=>complete('q131',route.outcome));assert.equal(g.save(),before);
  const gold=g.state.gold;g.run(data.quests.q131.model.entryScript);drain(g);assert.equal(g.state.gold,gold);assert.equal(payments,1);
 }
});

test('q131 missing rope leaves a free route and paid preparation survives retreat without spending twice',()=>{
 const poor=q131Engine({rope:0});choose(poor,'q131','test');const before=poor.save();
 assert.equal(poor.dispatch({type:'choose',id:'both'}),false);assert.equal(poor.save(),before);
 choose(poor,'q131','sample');assert.equal(poor.state.stories.q131.values.teacherAt,'room');choose(poor,'q131','finish');
 const old=q131Engine({legacy:true});choose(old,'q131','test');choose(old,'q131','both');
 const g=new GameEngine(data);g.load(old.save());assert.equal(g.state.inventory.rope,0);assert.equal(g.state.stories.q131.values.sampleAt,'room');assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),q131Cast('room_both_ready'));
 assert.ok(g.dispatch({type:'choose',id:'continue'}));drain(g);assert.equal(g.state.stories.q131.values.teacherAt,'transit');assert.equal(g.state.stories.q131.values.sampleAt,'party');checkpoint(g);
 assert.ok(g.dispatch({type:'retreat'}));go(g,{kind:'town',location:'pilgrim_board'});
 assert.ok(g.state.journey);assert.equal(g.dispatch({type:'story.resume',quest:'q131'}),false);assert.equal(g.state.stories.q131.values.sampleAt,'party');
 go(g,data.quests.q131.story.worldPlaces.report);drain(g);checkpoint(g);
 assert.equal(g.state.inventory.rope,0);assert.equal(g.state.stories.q131.values.sampleAt,'report');assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),q131Cast('credit'));
 choose(g,'q131','school');assert.equal(g.state.quests.q131.outcome,'school');
});

test('q131 routes accepted before physical relocation retain seven save phases and only acquire their route marker',()=>{
 for(const stage of ['available','accepted','dungeon','text','choice','battle','completed']){
  const old=q131AcceptedEngine({accepted:stage!=='available',entered:!['available','accepted'].includes(stage),started:['text','choice','completed'].includes(stage)});
  if(['choice','completed'].includes(stage))drain(old);
  if(stage==='battle')old.startBattle(old.map().encounter,{win:[],escape:[],lose:[]});
  if(stage==='completed')for(const id of q131AcceptedRoutes[0].path)q131AcceptedChoose(old,id);
  const raw=old.save(),expected=JSON.parse(raw),g=new GameEngine(data);assert.deepEqual(validateSave(expected,acceptedQ131Data),[]);g.load(raw);
  if(stage!=='available')(expected.state.flags.legacyStoryRoutes??={}).q131=true;
  assert.deepEqual(JSON.parse(g.save()),expected,stage);assert.equal(old.save(),raw);assert.equal(g.state.stories.q131,undefined);checkpoint(g);
  if(stage==='available'){assert.ok(g.accept('q131'));assert.equal(g.state.flags.currentStoryRoutes.q131,true);go(g,data.quests.q131.story.worldPlaces.entry);assert.ok(g.dispatch({type:'story.resume',quest:'q131'}));drain(g);assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),q131Cast('entry'));}
 }
});

test('q131 accepted old routes still reach all four endings without adopting physical story states or casts',()=>{
 for(const route of q131AcceptedRoutes){const old=q131AcceptedEngine();drain(old);const g=new GameEngine(data);g.load(old.save());
  const gold=g.state.gold,members=[...g.state.members];
  for(const id of ['tracks','test',...route.path]){assert.equal(projectGame(g).dialog.scene,undefined);q131AcceptedChoose(g,id);checkpoint(g);assert.equal(g.state.stories.q131,undefined);assert.equal(g.state.journey,null);}
  assert.equal(g.state.quests.q131.outcome,route.outcome);assert.equal(g.state.gold-gold,data.quests.q131.outcomes[route.outcome].gold);assert.deepEqual(g.state.members,members);
  assert.equal(g.state.inventory.rope,['all','school'].includes(route.outcome)?0:1);
 }
});

test('q131 corrupt role locations and mixed old/current routes are rejected atomically',()=>{
 const valid=q131Engine(),g=q131Engine(),before=g.save();
 for(const mutate of [s=>s.stories.q131.values.teacherAt='nowhere',s=>delete s.stories.q131.values.sherAt,s=>s.stories.q131.values.extra=true,s=>s.stories.q131.knowledge.party=['unwritten'],s=>s.stories.q131.events.push('unwritten'),s=>(s.flags.legacyStoryRoutes??={}).q131=true]){
  const raw=JSON.parse(valid.save());mutate(raw.state);assert.throws(()=>g.load(JSON.stringify(raw)));assert.equal(g.save(),before);
 }
});

test('q131 completed physical saves remain unchanged alongside the q039 revision migration',()=>{
 const oldData={...previousQ131Data,quests:{...previousQ131Data.quests,q039:previousQ039},scripts:{...previousQ131Data.scripts,...previousQ039.scripts}};
 const old=new GameEngine(oldData);old.load(q131Engine({legacy:true}).save());old.random=()=>.999999;
 for(const id of q131Routes[1].path)choose(old,'q131',id);start(old,'q039');choose(old,'q039','gather');
 const raw=JSON.parse(old.save()),expected=structuredClone(raw),g=new GameEngine(data);g.load(JSON.stringify(raw));
 expected.state.stories.q039.revision=2;Object.assign(expected.state.stories.q039.values,{repairerAt:'entry',claimantsAt:'entry'});
 assert.deepEqual(JSON.parse(g.save()),expected);checkpoint(g);choose(g,'q039','copies');assert.equal(g.state.stories.q131.values.teacherAt,'room');
});

for(const layout of ['classic','scene'])test(layout+': q131 shows the present roles and leaves accepted old routes without added portraits',async()=>{
 const dom=installDOM();let view;
 try{for(const f of (await fixtures()).fixtures){const g=new GameEngine(data);g.load(f.save);
  view=replaceView(view,layout,dom.root,intent=>g.dispatch(intent),{status(){},menu(){},help(){},soundEnabled:()=>false,effectsMode:()=> 'off'});view.render(projectGame(g));
  assert.equal(dom.root.querySelectorAll('[data-character]').length,f.cast.length);
  for(const id of f.cast){const person=dom.root.querySelector(`[data-character="${id}"]`);assert.ok(person.textContent.includes(data.characters[id].name));assert.equal(person.querySelector('img').src,data.assets.images['npc_'+id]);}
 }}finally{view?.destroy();dom.restore();}
});
