import test from 'node:test';
import assert from 'node:assert/strict';
import {applyStoryAction} from '../src/core/story.js';
import {projectGame} from '../src/application/projection.js';
import {data,choose,go,drain,checkpoint} from './royal-helpers.mjs';
import {previousQ182,q182Routes,q182AcceptedRoutes,q182Cast,q182Engine,q182AcceptedEngine,loadQ182,gunnerArtFixtures} from '../tools/gunner-art-fixtures.mjs';

test('q182 adds three displayed roles and only the gunner deployment while retaining prose, item holders and endings',()=>{
 const q=structuredClone(data.quests.q182);
 assert.deepEqual(q.model.storyUpgrades[0].previous,previousQ182.story);
 for(const key of Object.keys(previousQ182.story.registry))assert.deepEqual(q.story.registry[key],previousQ182.story.registry[key]);
 assert.deepEqual(q.story.registry.olAt.values,['entry','gun','transit']);assert.deepEqual(q.story.registry.commanderAt.values,['command']);
 assert.deepEqual(q.story.actions.entry_deploy.journey.companions,['ol']);
 for(const key of ['ol','commander']){delete q.story.entities[key];delete q.story.registry[key+'At'];}
 delete q.story.entities.evacuees.character;
 for(const s of Object.values(q.story.scenes))s.cast=[];
 q.story.actions.entry_deploy.journey.companions=[];
 q.story.actions.entry_deploy.effects.find(e=>e.op==='move').entities=['party'];
 delete q.model.storyUpgrades;q.story.revision=q.model.edition.revision=1;
 assert.deepEqual(q,previousQ182);
 for(const id of ['q182_ol','q182_commander','q182_evacuees']){assert.equal(data.characters[id].portrait,undefined);assert.equal(data.characters[id].sprite,undefined);}
 assert.equal(data.quests.q182.story.entities.evacuees.kind,'group');
});

test('q182 current and revision-one saves preserve eight scenes, eight journeys, waiting text and completed results',()=>{
 const scenes=new Set(),journeys=new Set(),phases=new Set();
 const observe=g=>{
  const raw=g.save(),now=loadQ182(raw),before=projectGame(g).dialog,after=projectGame(now).dialog;
  assert.equal(g.save(),raw);assert.equal(after?.text,before?.text);assert.deepEqual(after?.options,before?.options);
  phases.add(g.state.journey?'journey':g.state.quests.q182.stage==='completed'?'completed':g.state.waiting?.type);
  const s=now.state.stories.q182;if(s.scene)scenes.add(s.scene);
  assert.equal(s.values.commanderAt,'command');
  if(after?.scene)assert.deepEqual(after.scene.cast.map(c=>c.id),q182Cast(s.scene));
  if(now.state.journey){
   const j=now.state.journey,a=data.quests.q182.story.actions[j.action];journeys.add(j.action);
   assert.equal(s.scene,null);assert.equal(after?.scene,undefined);assert.equal(now.dispatch({type:'story.resume',quest:'q182'}),false);
   assert.equal(s.values.olAt,j.action==='entry_deploy'?'transit':'gun');assert.equal(s.values.evacueesAt,j.action==='evac_ready_escort'?'transit':'evac');
   now.random=()=>.999999;go(now,data.quests.q182.story.worldPlaces[a.journey.to]);drain(now);checkpoint(now);assert.equal(now.state.journey,null);
   assert.deepEqual(projectGame(now).dialog.scene.cast.map(c=>c.id),q182Cast(now.state.stories.q182.scene));
  }
 };
 for(const legacy of [false,true])for(const route of q182Routes){
  const g=q182Engine({legacy});observe(g);
  for(const id of route.path){assert.ok(g.dispatch({type:'choose',id}));observe(g);drain(g);observe(g);if(g.state.journey){const a=g.data.quests.q182.story.actions[g.state.journey.action];go(g,g.data.quests.q182.story.worldPlaces[a.journey.to]);observe(g);drain(g);observe(g);}}
  assert.equal(g.state.quests.q182.outcome,route.outcome);
 }
 assert.equal(scenes.size,8);assert.equal(journeys.size,8);for(const p of ['text','choice','journey','completed'])assert.ok(phases.has(p),p);
});

test('q182 all twelve paths keep one charge, two agreements, real custody, stationary roles and a single reward',()=>{
 assert.equal(q182Routes.length,12);
 for(const legacy of [false,true])for(const route of q182Routes){
  const g=loadQ182(q182Engine({legacy}).save());g.random=()=>.999999;
  const members=[...g.state.members],inventory=structuredClone(g.state.inventory),gold=g.state.gold;let rewards=0;
  const award=g.award.bind(g);g.award=(gold,xp,recipients)=>{assert.deepEqual([gold,xp],[153,99]);rewards++;return award(gold,xp,recipients);};
  const v=()=>g.state.stories.q182.values;
  for(const id of route.path){
   const scene=g.state.stories.q182.scene;
   assert.equal(v().commanderAt,'command');assert.equal(v().olAt,scene==='entry'?'entry':'gun');
   assert.equal(v().cannonAt,scene==='entry'?'entry':'gun');assert.equal(v().crystalAt,scene==='stored'?'party':'cannon');
   assert.equal(v().evacueesAt,scene==='safe'?'safe':'evac');assert.equal(v().charge+v().spent,1);
   if(scene==='gun'&&!(v().command&&v().evac)){const raw=g.save();assert.equal(g.dispatch({type:'choose',id:'light'}),false);assert.equal(g.save(),raw);}
   assert.ok(g.dispatch({type:'choose',id}));drain(g);
   if(g.state.journey){
    assert.equal(v().partyAt,'transit');assert.equal(v().olAt,id==='deploy'?'transit':'gun');assert.equal(v().commanderAt,'command');
    assert.equal(v().evacueesAt,id==='escort'?'transit':'evac');assert.equal(v().cannonAt,id==='deploy'?'party':'gun');
    assert.equal(v().crystalAt,id==='hold'?'party':'cannon');
    if(id==='command'||id==='evac')assert.equal(v()[id],false);
    const a=data.quests.q182.story.actions[g.state.journey.action];go(g,data.quests.q182.story.worldPlaces[a.journey.to]);drain(g);
    if(id==='command'||id==='evac')assert.equal(v()[id],true);
   }
   checkpoint(g);
  }
  const held=route.outcome==='hold',lit=route.outcome==='light';
  assert.equal(v().charge,held?1:0);assert.equal(v().spent,held?0:1);assert.equal(v().crystalAt,held?'entry':'cannon');
  assert.equal(v().olAt,'gun');assert.equal(v().cannonAt,'gun');assert.equal(v().commanderAt,'command');
  assert.equal(v().evacueesAt,lit?'safe':'evac');assert.equal(v().partyAt,lit?'safe':held?'entry':'gun');
  assert.equal(v().lit,lit);assert.equal(v().attacked,route.outcome==='attack');assert.equal(g.state.quests.q182.outcome,route.outcome);
  assert.equal(g.state.gold,gold+153);assert.equal(rewards,1);assert.deepEqual(g.state.members,members);assert.deepEqual(g.state.inventory,inventory);
  const raw=g.save();assert.throws(()=>g.complete('q182',route.outcome));assert.equal(g.save(),raw);g.run(data.quests.q182.model.entryScript);drain(g);assert.equal(rewards,1);assert.equal(v().spent,held?0:1);
 }
});

test('q182 a consumed charge cannot be spent again or returned as an unused crystal',()=>{
 const g=q182Engine();for(const id of ['deploy','command','return','evac','return','light'])choose(g,'q182',id);
 const raw=g.save();for(const action of ['gun_light','gun_attack','gun_hold']){assert.throws(()=>applyStoryAction(g,'q182',action));assert.equal(g.save(),raw);}
 assert.equal(g.state.stories.q182.values.charge,0);assert.equal(g.state.stories.q182.values.spent,1);
});

test('q182 browser fixtures cover all scenes, all agreement states and previous-route saves',async()=>{
 const r=await gunnerArtFixtures();assert.equal(r.fixtures.length,26);assert.equal(r.outcomes.length,3);
 assert.equal(new Set(r.fixtures.map(f=>f.scene+'/'+f.variant)).size,26);
 for(const f of r.fixtures){const dialog=projectGame(loadQ182(f.save)).dialog;assert.equal(dialog.text,f.expectedText);if(f.absentStoryScene)assert.equal(dialog.scene,undefined);else assert.deepEqual(dialog.scene.cast.map(c=>c.id),f.cast);}
 for(const [role,scenes] of [['q182_ol',['gun','entry','lit']],['q182_commander',['command_agreed']],['q182_evacuees',['evac_agreed','evac_ready','safe']]])assert.deepEqual(Object.keys(data.quests.q182.story.scenes).filter(s=>q182Cast(s).includes(role)),scenes);
 assert.deepEqual(q182Cast('stored'),[]);
});

test('q182 rejects invalid holders, moved commander, missing locations and invalid revisions atomically',()=>{
 const g=q182Engine(),raw=g.save(),old=q182Engine({legacy:true}).save();
 for(const input of [raw,old])for(const mutate of [s=>s.stories.q182.values.crystalAt='ol',s=>s.stories.q182.values.cannonAt='commander',s=>s.stories.q182.values.charge=2,s=>s.stories.q182.revision=3,s=>(s.flags.legacyStoryRoutes??={}).q182=true]){const saved=JSON.parse(input);mutate(saved.state);assert.throws(()=>g.load(JSON.stringify(saved)));assert.equal(g.save(),raw);}
 for(const mutate of [s=>s.stories.q182.values.commanderAt='gun',s=>s.stories.q182.values.olAt='safe',s=>delete s.stories.q182.values.olAt,s=>delete s.stories.q182.values.commanderAt]){const saved=JSON.parse(raw);mutate(saved.state);assert.throws(()=>g.load(JSON.stringify(saved)));assert.equal(g.save(),raw);}
 assert.equal(loadQ182(raw).save(),raw);
});

test('q182 accepted pre-relocation saves retain twelve paths, three endings and one reward without new cast or journeys',()=>{
 for(const route of q182AcceptedRoutes){const g=loadQ182(q182AcceptedEngine().save()),gold=g.state.gold;let rewards=0;const award=g.award.bind(g);g.award=(...args)=>{rewards++;return award(...args);};
  for(const id of route.path){assert.ok(g.dispatch({type:'choose',id}));drain(g);assert.equal(g.state.journey,null);assert.equal(g.state.stories.q182,undefined);assert.equal(projectGame(g).dialog?.scene,undefined);checkpoint(g);}
  assert.equal(g.state.quests.q182.outcome,route.outcome);assert.equal(g.state.gold,gold+153);assert.equal(rewards,1);
 }
});

test('q182 mid-deployment revision-one saves migrate the gunner in transit and finish every ending',()=>{
 for(const route of q182Routes){
  const old=q182Engine({legacy:true});assert.ok(old.dispatch({type:'choose',id:'deploy'}));drain(old);
  const g=loadQ182(old.save());g.random=()=>.999999;assert.equal(g.state.stories.q182.values.olAt,'transit');
  go(g,data.quests.q182.story.worldPlaces.gun);drain(g);assert.equal(g.state.stories.q182.values.olAt,'gun');
  for(const id of route.path.slice(1))choose(g,'q182',id);
  assert.equal(g.state.quests.q182.outcome,route.outcome);checkpoint(g);
 }
});
