import test from 'node:test';
import assert from 'node:assert/strict';
import {projectGame} from '../src/application/projection.js';
import {data,go,drain,checkpoint} from './library-helpers.mjs';
import {previousQ045,q045Routes,q045AcceptedRoutes,q045Engine,q045AcceptedEngine,loadQ045,chooseQ045,inheritanceArtFixtures} from '../tools/inheritance-art-fixtures.mjs';

test('q045 adds only the existing heirs group character link and four casts',()=>{
 const q=structuredClone(data.quests.q045);assert.equal(q.story.revision,1);assert.equal(q.model.edition.revision,1);assert.equal(q.model.storyUpgrades,undefined);
 assert.equal(q.story.entities.heirs.kind,'group');assert.equal(q.story.entities.heirs.character,'q045_heirs');assert.equal(data.characters.q045_heirs.name,'相続人たち');
 for(const key of ['portrait','sprite'])assert.equal(data.characters.q045_heirs[key],undefined);
 assert.equal(Object.keys(q.story.scenes).length,4);for(const s of Object.values(q.story.scenes)){assert.deepEqual(s.cast,[{entity:'heirs',display:{x:50}}]);s.cast=[];}
 delete q.story.entities.heirs.character;assert.deepEqual(q,previousQ045);
});

test('q045 current and previous saves resume four scenes, four journeys and all eight actions unchanged',()=>{
 const scenes=new Set(),journeys=new Set(),actions=new Set(),phases=new Set();
 const observe=g=>{
  const raw=g.save(),now=loadQ045(raw),before=projectGame(g).dialog,after=projectGame(now).dialog;assert.equal(g.save(),raw);assert.equal(now.save(),raw);assert.equal(after?.text,before?.text);assert.deepEqual(after?.options,before?.options);
  const s=now.state.stories.q045;phases.add(now.state.journey?'journey':now.state.quests.q045.stage==='completed'?'completed':now.state.waiting?.type);
  if(s.scene)scenes.add(s.scene);if(after?.scene)assert.deepEqual(after.scene.cast.map(c=>c.id),['q045_heirs']);
  if(now.state.journey){
   const id=now.state.journey.action,a=data.quests.q045.story.actions[id];journeys.add(id);assert.equal(s.scene,null);assert.equal(after?.scene,undefined);assert.equal(s.values.heirsAt,'transit');assert.equal(s.values.draftAt,'party');assert.equal(now.dispatch({type:'story.resume',quest:'q045'}),false);
   go(now,data.quests.q045.story.worldPlaces[a.journey.to]);drain(now);checkpoint(now);assert.equal(now.state.journey,null);assert.equal(now.state.stories.q045.values.heirsAt,a.journey.to);assert.equal(now.state.stories.q045.values.draftAt,'party');assert.equal(now.state.stories.q045.values.held,false);assert.equal(now.state.stories.q045.values.minutes,false);
  }
 };
 for(const legacy of [false,true])for(const route of q045Routes){const g=q045Engine({legacy});observe(g);for(const id of route.path){
  actions.add(g.state.stories.q045.scene+'_'+id);assert.ok(g.dispatch({type:'choose',id}));observe(g);drain(g);observe(g);
  if(g.state.journey){const a=g.data.quests.q045.story.actions[g.state.journey.action];go(g,g.data.quests.q045.story.worldPlaces[a.journey.to]);observe(g);drain(g);observe(g);}
 }assert.equal(g.state.quests.q045.outcome,route.outcome);}
 assert.equal(scenes.size,4);assert.equal(journeys.size,4);assert.deepEqual([...actions].sort(),Object.keys(data.quests.q045.story.actions).sort());for(const p of ['text','choice','journey','completed'])assert.ok(phases.has(p),p);
});

test('q045 all three deposit routes escort the heirs and transfer the carried draft only on confirmation',()=>{
 for(const legacy of [false,true])for(const path of [['witness'],['cool','hold'],['cool','gather','deposit']]){
  const g=loadQ045(q045Engine({legacy}).save()),v=()=>g.state.stories.q045.values;
  for(const id of path){
   if(id==='cool'){chooseQ045(g,id);continue;}
   const before=v().draftAt;assert.ok(['entry','party'].includes(before));assert.ok(g.dispatch({type:'choose',id}));drain(g);
   assert.equal(v().heirsAt,'transit');assert.equal(v().draftAt,'party');assert.equal(v().held,false);assert.equal(v().minutes,false);loadQ045(g.save());
   const destination=id==='gather'?'council':'deposit';go(g,data.quests.q045.story.worldPlaces[destination]);drain(g);assert.equal(v().heirsAt,destination);assert.equal(v().draftAt,'party');assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['q045_heirs']);
  }
  assert.equal(v().unsigned,path.includes('cool'));assert.equal(v().held,false);assert.equal(v().minutes,false);assert.equal(v().treatedAsFinal,false);chooseQ045(g,'finish');
  assert.equal(v().held,true);assert.equal(v().draftAt,'deposit');assert.equal(v().heirsAt,'deposit');assert.equal(v().minutes,false);loadQ045(g.save());
 }
});

test('q045 cooling and agreement that the document is unsigned do not finalize the distribution or custody',()=>{
 for(const legacy of [false,true]){
  const g=loadQ045(q045Engine({legacy}).save()),v=()=>g.state.stories.q045.values;assert.equal(v().unsigned,false);assert.deepEqual(g.state.stories.q045.knowledge,{});
  chooseQ045(g,'cool');assert.equal(v().unsigned,true);assert.deepEqual(g.state.stories.q045.knowledge.party,['truth']);assert.equal(v().draftAt,'entry');assert.equal(v().heirsAt,'entry');assert.equal(v().treatedAsFinal,false);
  chooseQ045(g,'gather');assert.equal(v().heirsAt,'council');assert.equal(v().draftAt,'party');assert.equal(v().minutes,false);assert.equal(v().held,false);assert.equal(v().finished,false);assert.match(projectGame(g).dialog.text,/配分にまだ合意していない/);
  chooseQ045(g,'minutes');assert.equal(v().minutes,true);assert.equal(v().draftAt,'council');assert.equal(v().heirsAt,'council');assert.equal(v().held,false);assert.equal(v().treatedAsFinal,false);loadQ045(g.save());
  const direct=loadQ045(q045Engine({legacy}).save());chooseQ045(direct,'restore');const d=direct.state.stories.q045.values;assert.equal(d.treatedAsFinal,true);assert.equal(d.unsigned,false);assert.equal(d.draftAt,'entry');assert.equal(d.heirsAt,'entry');assert.equal(d.minutes,false);assert.equal(d.held,false);
 }
});

test('q045 all five routes preserve three one-time rewards and do not invent a blank-paper spirit battle',()=>{
 const rewards={contract:[125,75],compromise:[68,75],informed:[105,100]};
 for(const legacy of [false,true])for(const route of q045Routes){
  const g=loadQ045(q045Engine({legacy}).save()),gold=g.state.gold,inventory=structuredClone(g.state.inventory),members=[...g.state.members],battles=g.state.records.battles;let count=0;
  const award=g.award.bind(g);g.award=(gp,xp,who)=>{assert.deepEqual([gp,xp],rewards[route.outcome]);count++;return award(gp,xp,who);};
  for(const id of route.path){assert.equal(count,0);chooseQ045(g,id);}assert.equal(g.state.quests.q045.outcome,route.outcome);assert.equal(count,1);assert.equal(g.state.gold,gold+rewards[route.outcome][0]);assert.deepEqual(g.state.inventory,inventory);assert.deepEqual(g.state.members,members);assert.equal(g.state.records.battles,battles);
  const raw=g.save();assert.throws(()=>g.complete('q045',route.outcome));assert.equal(g.save(),raw);g.run(data.quests.q045.model.entryScript);drain(g);assert.equal(count,1);loadQ045(g.save());
 }
});

test('q045 pre-relocation accepted saves preserve three scenes and all five direct routes',()=>{
 const scenes=new Set();
 for(const route of q045AcceptedRoutes){const g=loadQ045(q045AcceptedEngine().save());let count=0;const award=g.award.bind(g);g.award=(gold,xp,who)=>{const o=data.previousQuestRoutes.q045.outcomes[route.outcome];assert.deepEqual([gold,xp],[o.gold,o.xp]);count++;return award(gold,xp,who);};
  for(const id of route.path){scenes.add(g.state.flags.flow.q045.node);loadQ045(g.save());assert.ok(g.dispatch({type:'choose',id}));loadQ045(g.save());drain(g);assert.equal(g.state.journey,null);assert.equal(g.state.stories.q045,undefined);assert.equal(projectGame(g).dialog?.scene,undefined);checkpoint(g);}
  assert.equal(g.state.quests.q045.outcome,route.outcome);assert.equal(count,1);loadQ045(g.save());
 }assert.deepEqual([...scenes].sort(),['conference','draft','entry']);
});

test('q045 invalid custody, value types, revisions and mixed accepted routes are rejected atomically',()=>{
 const g=q045Engine(),raw=g.save();for(const mutate of [s=>s.stories.q045.values.heirsAt='missing',s=>s.stories.q045.values.unsigned='true',s=>s.stories.q045.values.draftAt='missing',s=>s.stories.q045.revision=2,s=>(s.flags.legacyStoryRoutes??={}).q045=true]){const saved=JSON.parse(raw);mutate(saved.state);assert.throws(()=>g.load(JSON.stringify(saved)));assert.equal(g.save(),raw);}
});

test('q045 browser fixtures cover all three deposit origins, previous saves and accepted scenes',async()=>{
 const {fixtures,outcomes}=await inheritanceArtFixtures();assert.equal(fixtures.length,15);assert.equal(outcomes.length,3);
 for(const prefix of ['current','previous']){const rows=fixtures.filter(f=>f.variant.startsWith(prefix));assert.equal(rows.length,6);assert.deepEqual(rows.filter(f=>f.scene==='deposited').map(f=>f.variant).sort(),['after-conference','after-cooling','direct'].map(x=>prefix+'-'+x).sort());for(const f of rows)assert.deepEqual(f.cast,['q045_heirs']);}
 assert.equal(fixtures.filter(f=>f.absentStoryScene).length,3);
});
