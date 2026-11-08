import test from 'node:test';
import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {data,start,choose,go,drain,checkpoint} from './royal-helpers.mjs';
import {previousQ184,previousQ184Data,q184Routes,q184AcceptedRoutes,q184People,q184Cast,q184Engine,q184AcceptedEngine,loadQ184,potArtFixtures} from '../tools/pot-art-fixtures.mjs';

test('q184 only connects four existing entities and scene casts, retaining revision one and all prose, domains and actions',()=>{
 const q=structuredClone(data.quests.q184);assert.equal(q.story.revision,1);assert.equal(q.model.edition.revision,1);assert.equal(q.model.storyUpgrades,undefined);
 for(const id of ['jarl','cook','supervisor','prisoners']){assert.equal(q.story.entities[id].character,'q184_'+id);delete q.story.entities[id].character;assert.equal(data.characters['q184_'+id].portrait,undefined);assert.equal(data.characters['q184_'+id].sprite,undefined);}
 for(const scene of Object.values(q.story.scenes))scene.cast=[];assert.deepEqual(q,previousQ184);
});

test('q184 current and previous saves preserve every scene, waiting phase, journey and completion byte-for-byte',()=>{
 const scenes=new Set(),journeys=new Set(),phases=new Set();
 const observe=g=>{
  const raw=g.save(),now=loadQ184(raw),before=projectGame(g).dialog,after=projectGame(now).dialog;assert.equal(now.save(),raw);assert.equal(g.save(),raw);assert.equal(after?.text,before?.text);assert.deepEqual(after?.options,before?.options);
  phases.add(g.state.journey?'journey':g.state.quests.q184.stage==='completed'?'completed':g.state.waiting?.type);
  if(g.state.stories.q184.scene)scenes.add(g.state.stories.q184.scene);
  if(after?.scene)assert.deepEqual(after.scene.cast.map(c=>c.id),q184Cast(now.state.stories.q184.scene));
  if(now.state.journey){const j=now.state.journey,a=data.quests.q184.story.actions[j.action],v=now.state.stories.q184.values;journeys.add(j.action);assert.equal(now.state.stories.q184.scene,null);assert.equal(after?.scene,undefined);assert.equal(now.dispatch({type:'story.resume',quest:'q184'}),false);
   for(const who of a.journey.companions)assert.equal(v[who+'At'],'transit');assert.equal(v.prisonersAt,'entry');
   now.random=()=>.999999;go(now,data.quests.q184.story.worldPlaces[a.journey.to]);drain(now);checkpoint(now);assert.equal(now.state.journey,null);
   for(const who of a.journey.companions)assert.equal(now.state.stories.q184.values[who+'At'],a.journey.to);
   assert.deepEqual(projectGame(now).dialog.scene.cast.map(c=>c.id),q184Cast(now.state.stories.q184.scene));
  }
 };
 for(const legacy of [false,true])for(const route of q184Routes){const g=q184Engine({legacy});observe(g);for(const id of route.path){assert.ok(g.dispatch({type:'choose',id}));observe(g);drain(g);observe(g);if(g.state.journey){const a=g.data.quests.q184.story.actions[g.state.journey.action];go(g,g.data.quests.q184.story.worldPlaces[a.journey.to]);observe(g);drain(g);observe(g);}}assert.equal(g.state.quests.q184.outcome,route.outcome);}
 assert.equal(scenes.size,9);assert.equal(journeys.size,8);for(const p of ['text','choice','journey','completed'])assert.ok(phases.has(p),p);
});

test('q184 four routes preserve pot and spare handovers, optional ingredient transport, inspection timing and one reward',()=>{
 for(const legacy of [false,true])for(const route of q184Routes){
  const g=loadQ184(q184Engine({legacy}).save());g.random=()=>.999999;const members=[...g.state.members],inventory=structuredClone(g.state.inventory),gold=g.state.gold;let rewards=0;
  const award=g.award.bind(g);g.award=(gold,xp,recipients)=>{assert.deepEqual([gold,xp],[153,99]);rewards++;return award(gold,xp,recipients);};const v=()=>g.state.stories.q184.values;
  for(const id of route.path){const scene=g.state.stories.q184.scene;
   assert.equal(v().prisonersAt,'entry');assert.equal(v().cooking,false);assert.equal(v().inspected,['checked','invite','joint_cooking'].includes(scene));
   if(scene==='entry'){assert.equal(v().potAt,'jarl');assert.equal(v().spareAt,'store');assert.equal(v().ingredientsAt,'entry');}
   if(['joint','checked','invite'].includes(scene)){assert.equal(v().ingredientsAt,'party');assert.equal(v().potAt,'jarl');}
   if(scene==='spare'){assert.equal(v().spareAt,'store');assert.equal(v().ingredientsAt,route.path[0]==='joint'?'party':'entry');assert.equal(v().supervisorAt,'inspection');}
   if(scene==='swap'){assert.equal(v().spareAt,'party');assert.equal(v().potAt,'jarl');assert.equal(v().ingredientsAt,'entry');}
   if(['taken','parallel'].includes(scene)){assert.equal(v().potAt,'party');assert.equal(v().jarlAt,'entry');assert.equal(v().supervisorAt,'inspection');assert.equal(v().cookAt,'ordinary');}
   assert.ok(g.dispatch({type:'choose',id}));drain(g);
   if(g.state.journey){const action=g.state.journey.action,a=data.quests.q184.story.actions[action];
    if(['entry_take','swap_return'].includes(action))assert.equal(v().potAt,'party');
    if(action==='swap_return'){assert.equal(v().spareAt,'jarl');assert.equal(v().jarlAt,'entry');}
    if(action==='spare_carry'){assert.equal(v().spareAt,'party');assert.equal(v().ingredientsAt,route.path[0]==='joint'?'party':'entry');}
    if(['entry_joint','checked_invite','invite_escort'].includes(action))assert.equal(v().ingredientsAt,'party');
    go(g,data.quests.q184.story.worldPlaces[a.journey.to]);drain(g);
    if(['spare_carry','invite_escort'].includes(action))assert.equal(v().ingredientsAt,'entry');
   }checkpoint(g);
  }
  const joint=route.outcome==='joint';assert.equal(v().cooking,joint);assert.equal(v().inspected,joint);assert.equal(v().ingredientsAt,'entry');assert.equal(v().potAt,joint?'jarl':'cook');assert.equal(v().spareAt,route.outcome==='other'?'jarl':'store');
  assert.equal(v().jarlAt,'entry');assert.equal(v().cookAt,joint?'entry':'ordinary');assert.equal(v().supervisorAt,joint?'entry':'inspection');assert.equal(v().prisonersAt,'entry');
  assert.equal(g.state.quests.q184.outcome,route.outcome);assert.equal(g.state.gold,gold+153);assert.equal(rewards,1);assert.deepEqual(g.state.members,members);assert.deepEqual(g.state.inventory,inventory);
  const raw=g.save();assert.throws(()=>g.complete('q184',route.outcome));assert.equal(g.save(),raw);g.run(data.quests.q184.model.entryScript);drain(g);assert.equal(rewards,1);assert.deepEqual(g.state.inventory,inventory);
 }
});

test('q184 casts require both an authored appearance and actual co-location, with prisoners limited to entry',()=>{
 for(const route of q184Routes){const g=q184Engine(),observe=()=>{const s=g.state.stories.q184,dialog=projectGame(g).dialog;if(!dialog?.scene)return;assert.deepEqual(dialog.scene.cast.map(c=>c.id),q184Cast(s.scene));
  const scene=data.quests.q184.story.scenes[s.scene];for(const id of q184People[s.scene])assert.equal(s.values[id+'At'],scene.place);
  if(['joint_cooking','swap'].includes(s.scene)){assert.equal(s.values.prisonersAt,scene.place);assert.ok(!dialog.scene.cast.some(c=>c.id==='q184_prisoners'));}
 };observe();for(const id of route.path){choose(g,'q184',id);observe();}}
 const g=q184Engine(),raw=g.save(),saved=JSON.parse(raw);saved.state.stories.q184.values.jarlAt='store';assert.throws(()=>g.load(JSON.stringify(saved)),/同席していません/);assert.equal(g.save(),raw);
});

test('q184 browser fixtures cover both ingredient states at the store and every new, old and accepted scene',async()=>{
 const r=await potArtFixtures();assert.equal(r.fixtures.length,22);assert.equal(r.outcomes.length,3);assert.equal(new Set(r.fixtures.map(f=>f.scene+'/'+f.variant)).size,22);
 for(const f of r.fixtures){const dialog=projectGame(loadQ184(f.save)).dialog;assert.equal(dialog.text,f.expectedText);if(f.absentStoryScene)assert.equal(dialog.scene,undefined);else assert.deepEqual(dialog.scene.cast.map(c=>c.id),f.cast);}
 assert.deepEqual(r.fixtures.filter(f=>f.scene==='spare').map(f=>f.variant).sort(),['current-entry','current-party','previous-entry','previous-party']);
});

test('q184 invalid save values and mixed legacy route flags reject atomically without changing revision-one compatibility',()=>{
 const g=q184Engine(),raw=g.save(),old=q184Engine({legacy:true}).save();
 for(const input of [raw,old])for(const mutate of [s=>s.stories.q184.values.potAt='invented',s=>s.stories.q184.values.spareAt='invented',s=>s.stories.q184.values.jarlAt='invented',s=>s.stories.q184.revision=2,s=>delete s.stories.q184.values.cookAt,s=>(s.flags.legacyStoryRoutes??={}).q184=true]){const saved=JSON.parse(input);mutate(saved.state);assert.throws(()=>g.load(JSON.stringify(saved)));assert.equal(g.save(),raw);}
 assert.equal(loadQ184(raw).save(),raw);assert.equal(loadQ184(old).save(),old);
});

test('q184 accepted pre-relocation saves retain all four paths and three direct endings without new cast, journeys or costs',()=>{
 for(const route of q184AcceptedRoutes){const g=loadQ184(q184AcceptedEngine().save()),gold=g.state.gold,inventory=structuredClone(g.state.inventory);let rewards=0;const award=g.award.bind(g);g.award=(...args)=>{rewards++;return award(...args);};
  for(const id of route.path){assert.ok(g.dispatch({type:'choose',id}));drain(g);assert.equal(g.state.journey,null);assert.equal(g.state.stories.q184,undefined);assert.equal(projectGame(g).dialog?.scene,undefined);checkpoint(g);}
  assert.equal(g.state.quests.q184.outcome,route.outcome);assert.equal(g.state.gold,gold+153);assert.deepEqual(g.state.inventory,inventory);assert.equal(rewards,1);
 }
});

test('q184 remains unchanged alongside a q183 revision-one save migration',async()=>{
 const {previousQ183,expectedQ183Save}=await import('../tools/laundry-art-fixtures.mjs');
 const oldData={...previousQ184Data,quests:{...previousQ184Data.quests,q183:previousQ183},scripts:{...previousQ184Data.scripts,...previousQ183.scripts}},g=new GameEngine(oldData);
 g.load(q184Engine({legacy:true}).save());g.random=()=>.999999;for(const id of ['other','carry','return','finish'])choose(g,'q184',id);start(g,'q183');choose(g,'q183','hidden');
 const raw=g.save(),expected=expectedQ183Save(raw),now=new GameEngine(data);now.load(raw);assert.deepEqual(JSON.parse(now.save()),expected);assert.deepEqual(now.state.stories.q184,g.state.stories.q184);checkpoint(now);
});
