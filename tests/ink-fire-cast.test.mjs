import test from 'node:test';
import assert from 'node:assert/strict';
import {projectGame} from '../src/application/projection.js';
import {data,go,drain,checkpoint} from './library-helpers.mjs';
import {RELOCATED_CAST_REVIEW} from '../authoring/relocated-cast-review.mjs';
import {q043Routes,q043AcceptedRoutes,q043Engine,q043AcceptedEngine,loadQ043,chooseQ043,inkFireArtFixtures,captureQ043ConditionalText,q043PreservedText,q043LostText,q043Truth} from '../tools/ink-fire-art-fixtures.mjs';

test('q043 reviews all six scenes without turning the client, light or generic finish prompt into a cast',()=>{
 const q=data.quests.q043,r=RELOCATED_CAST_REVIEW.quests.q043;
 assert.equal(q.story.revision,1);assert.equal(q.model.edition.revision,1);assert.equal(q.model.storyUpgrades,undefined);
 assert.deepEqual(Object.keys(q.story.entities).sort(),['backup','party','restored']);assert.deepEqual(r.people,{});
 assert.deepEqual(Object.keys(r.scenes).sort(),Object.keys(q.story.scenes).sort());assert.equal(Object.keys(r.scenes).length,6);
 for(const [id,s] of Object.entries(q.story.scenes)){assert.deepEqual(s.cast,[]);assert.equal(r.scenes[id].decision,'no-person-evidence');}
 assert.match(q.outcomes.informed.text,/アリ/);assert.ok(Object.values(q.story.actions).every(a=>!a.journey||a.journey.companions.length===0));
});

test('q043 saves resume all six scenes and five journeys without changing existing values',()=>{
 const scenes=new Set(),journeys=new Set(),phases=new Set();
 const observe=g=>{
  const raw=g.save(),now=loadQ043(raw),before=projectGame(g).dialog,after=projectGame(now).dialog;
  assert.equal(g.save(),raw);assert.equal(now.save(),raw);assert.deepEqual(after,before);
  phases.add(g.state.journey?'journey':g.state.quests.q043.stage==='completed'?'completed':g.state.waiting?.type);
  if(g.state.stories.q043.scene)scenes.add(g.state.stories.q043.scene);if(after?.scene)assert.deepEqual(after.scene.cast,[]);
  if(now.state.journey){
   const a=data.quests.q043.story.actions[now.state.journey.action];journeys.add(now.state.journey.action);
   assert.equal(now.state.stories.q043.scene,null);assert.equal(after?.scene,undefined);assert.equal(now.dispatch({type:'story.resume',quest:'q043'}),false);
   go(now,data.quests.q043.story.worldPlaces[a.journey.to]);drain(now);checkpoint(now);assert.equal(now.state.journey,null);
  }
 };
 for(const route of q043Routes){const g=q043Engine();observe(g);for(const id of route.path){assert.ok(g.dispatch({type:'choose',id}));observe(g);drain(g);observe(g);if(g.state.journey){const a=data.quests.q043.story.actions[g.state.journey.action];go(g,data.quests.q043.story.worldPlaces[a.journey.to]);observe(g);drain(g);observe(g);}}assert.equal(g.state.quests.q043.outcome,route.outcome);}
 assert.equal(scenes.size,6);assert.equal(journeys.size,5);for(const p of ['text','choice','journey','completed'])assert.ok(phases.has(p),p);
});

test('q043 valve arrival, carrying the backup and final handover retain their distinct timing',()=>{
 const g=q043Engine(),v=()=>g.state.stories.q043.values,textSaves=captureQ043ConditionalText(g);
 chooseQ043(g,'valve');assert.equal(v().stopped,false);assert.equal(v().lost,false);assert.equal(v().backupAt,'copy');
 assert.ok(g.dispatch({type:'choose',id:'stop'}));drain(g);assert.equal(v().stopped,false);assert.equal(g.state.journey.action,'valve_stop');loadQ043(g.save());
 go(g,data.quests.q043.story.worldPlaces.entry);drain(g);assert.equal(v().stopped,true);assert.equal(v().lost,false);
 assert.ok(textSaves.length);assert.equal(projectGame(loadQ043(textSaves.at(-1))).dialog.text,q043PreservedText);
 chooseQ043(g,'restore');assert.equal(v().backupAt,'copy');assert.equal(v().restored,false);
 assert.ok(g.dispatch({type:'choose',id:'carry'}));drain(g);assert.equal(v().backupAt,'party');assert.equal(v().partyAt,'transit');assert.equal(v().restored,false);loadQ043(g.save());
 go(g,data.quests.q043.story.worldPlaces.entry);drain(g);assert.equal(v().backupAt,'party');assert.equal(v().restored,false);
 chooseQ043(g,'finish');assert.equal(v().backupAt,'entry');assert.equal(v().restored,true);assert.equal(v().blanks,false);assert.equal(v().sealed,false);assert.equal(v().lost,false);loadQ043(g.save());
});

test('q043 lost additions stay lost and restoration remains disabled after saving and rereading',()=>{
 let g=q043Engine();const textSaves=captureQ043ConditionalText(g);chooseQ043(g,'copy');assert.equal(g.state.stories.q043.values.lost,true);assert.ok(textSaves.length);
 for(let i=0;i<2;i++){
  g=loadQ043(textSaves.at(-1));assert.equal(projectGame(g).dialog.text,q043LostText);drain(g);
  const d=projectGame(g).dialog;assert.equal(d.text,q043Truth);assert.equal(d.options.find(o=>o.id==='restore').enabled,false);
  const raw=g.save();assert.equal(g.dispatch({type:'choose',id:'restore'}),false);assert.equal(g.save(),raw);
  assert.equal(g.state.stories.q043.values.stopped,false);assert.equal(g.state.stories.q043.values.backupAt,'copy');
 }
 chooseQ043(g,'blanks');assert.equal(g.state.stories.q043.values.blanks,false);chooseQ043(g,'finish');
 const v=g.state.stories.q043.values;assert.equal(v.lost,true);assert.equal(v.restored,false);assert.equal(v.stopped,false);assert.equal(v.blanks,true);assert.equal(v.backupAt,'copy');
});

test('q043 all six routes retain distinct one-time rewards and do not invent a fire-spirit battle',()=>{
 const rewards={contract:[125,75],compromise:[68,75],informed:[105,100]};
 for(const route of q043Routes){
  const g=q043Engine(),gold=g.state.gold,inventory=structuredClone(g.state.inventory),members=[...g.state.members],battles=g.state.records.battles;let count=0;
  const award=g.award.bind(g);g.award=(gp,xp,who)=>{assert.deepEqual([gp,xp],rewards[route.outcome]);count++;return award(gp,xp,who);};
  for(const id of route.path){assert.equal(count,0);chooseQ043(g,id);}assert.equal(g.state.quests.q043.outcome,route.outcome);assert.equal(count,1);
  assert.equal(g.state.gold,gold+rewards[route.outcome][0]);assert.deepEqual(g.state.inventory,inventory);assert.deepEqual(g.state.members,members);assert.equal(g.state.records.battles,battles);
  const v=g.state.stories.q043.values;assert.equal(v.sealed,route.outcome==='contract');assert.equal(v.restored,route.outcome==='informed');assert.equal(v.blanks,route.outcome==='compromise');assert.equal(v.lost,route.path[0]==='copy');
  const raw=g.save();assert.throws(()=>g.complete('q043',route.outcome));assert.equal(g.save(),raw);g.run(data.quests.q043.model.entryScript);drain(g);assert.equal(count,1);loadQ043(g.save());
 }
});

test('q043 pre-relocation accepted saves retain both text branches and six direct routes',()=>{
 const scenes=new Set();
 for(const route of q043AcceptedRoutes){
  const g=loadQ043(q043AcceptedEngine().save());let rewards=0;const award=g.award.bind(g);g.award=(gold,xp,who)=>{const o=data.previousQuestRoutes.q043.outcomes[route.outcome];assert.deepEqual([gold,xp],[o.gold,o.xp]);rewards++;return award(gold,xp,who);};
  for(const id of route.path){
   scenes.add(g.state.flags.flow.q043.node);loadQ043(g.save());assert.ok(g.dispatch({type:'choose',id}));
   if(['valve','copy'].includes(id)&&g.state.waiting?.type==='text')assert.equal(projectGame(g).dialog.text,route.path[0]==='valve'?q043PreservedText:q043LostText);
   drain(g);assert.equal(g.state.journey,null);assert.equal(g.state.stories.q043,undefined);assert.equal(projectGame(g).dialog?.scene,undefined);checkpoint(g);
   if(id==='copy'){assert.equal(projectGame(g).dialog.options.find(o=>o.id==='restore').enabled,false);const raw=g.save();assert.equal(g.dispatch({type:'choose',id:'restore'}),false);assert.equal(g.save(),raw);}
  }
  assert.equal(g.state.quests.q043.outcome,route.outcome);assert.equal(rewards,1);loadQ043(g.save());
 }
 assert.deepEqual([...scenes].sort(),['entry','restore']);
});

test('q043 invalid saved locations, value types and mixed routes are rejected atomically',()=>{
 const g=q043Engine(),raw=g.save();
 for(const mutate of [s=>s.stories.q043.values.backupAt='missing',s=>s.stories.q043.values.stopped='true',s=>s.stories.q043.revision=2,s=>(s.flags.legacyStoryRoutes??={}).q043=true]){
  const saved=JSON.parse(raw);mutate(saved.state);assert.throws(()=>g.load(JSON.stringify(saved)));assert.equal(g.save(),raw);
 }
});

test('q043 browser checkpoints show both conditional sentences and reject lost-copy restoration',async()=>{
 const r=await inkFireArtFixtures();assert.equal(r.fixtures.length,13);assert.equal(r.outcomes.length,3);assert.equal(r.fixtures.filter(f=>f.absentStoryScene).length,4);
 assert.equal(r.fixtures.filter(f=>f.blockedChoice==='restore').length,2);assert.equal(r.fixtures.filter(f=>f.absentText).length,4);
 for(const f of r.fixtures){const g=loadQ043(f.save),d=projectGame(g).dialog;assert.ok(f.expectedText.startsWith(d.text));if(f.absentStoryScene)assert.equal(d.scene,undefined);else assert.deepEqual(d.scene.cast,[]);}
});
