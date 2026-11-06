import test from 'node:test';
import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {data,read,start,choose,go,drain,checkpoint} from './machine-helpers.mjs';
import {previousQ177,previousQ177Data,q177Routes,q177AcceptedRoutes,q177Cast,q177Engine,q177AcceptedEngine,upgradedQ177Save,upgradeQ177,truthMirrorArtFixtures} from '../tools/truth-mirror-art-fixtures.mjs';

test('q177 adds only two fixed-location roles, cast and explicit migration without changing prose, routes or item owners',()=>{
 const q=structuredClone(data.quests.q177);assert.deepEqual(q.model.storyUpgrades[0],{fromRevision:1,toRevision:2,previous:previousQ177.story,values:[{key:'courierPersonAt',value:'shop'},{key:'customersAt',value:'public'}]});
 for(const id of ['courierPerson','customers']){delete q.story.entities[id];delete q.story.registry[id+'At'];}
 for(const scene of Object.values(q.story.scenes))scene.cast=[];delete q.model.storyUpgrades;q.story.revision=q.model.edition.revision=1;assert.deepEqual(q,previousQ177);
 for(const id of ['q177_courier','q177_customers']){assert.equal(data.characters[id].portrait,undefined);assert.equal(data.characters[id].sprite,undefined);}
 assert.ok(Object.values(q.story.actions).every(a=>!a.journey?.companions.length));
});

test('q177 current and revision-one saves preserve all waiting phases, journeys and completion; q176 migrates alongside it',async()=>{
 const phases=new Set(),scenes=new Set(),journeys=new Set();
 const observe=g=>{
  const raw=g.save(),now=upgradeQ177(raw);assert.equal(g.save(),raw);const before=projectGame(g).dialog,after=projectGame(now).dialog;assert.equal(after?.text,before?.text);assert.deepEqual(after?.options,before?.options);
  const story=now.state.stories.q177;assert.equal(story.values.courierPersonAt,'shop');assert.equal(story.values.customersAt,'public');
  phases.add(g.state.journey?'journey':g.state.quests.q177.stage==='completed'?'completed':g.state.waiting?.type);if(story.scene)scenes.add(story.scene);if(after?.scene)assert.deepEqual(after.scene.cast.map(c=>c.id),q177Cast(story.scene));
  if(now.state.journey){const j=now.state.journey,a=data.quests.q177.story.actions[j.action];journeys.add(j.action);assert.equal(story.scene,null);assert.equal(after?.scene,undefined);assert.equal(now.dispatch({type:'story.resume',quest:'q177'}),false);now.random=()=>.999999;go(now,data.quests.q177.story.worldPlaces[a.journey.to]);drain(now);assert.equal(now.state.journey,null);checkpoint(now);assert.deepEqual(projectGame(now).dialog.scene.cast.map(c=>c.id),q177Cast(now.state.stories.q177.scene));assert.equal(story.values.courierPersonAt,'shop');assert.equal(story.values.customersAt,'public');}
 };
 for(const legacy of [false,true])for(const route of q177Routes){const g=q177Engine({legacy});observe(g);for(const id of route.path){assert.ok(g.dispatch({type:'choose',id}));observe(g);drain(g);observe(g);if(g.state.journey){const a=g.data.quests.q177.story.actions[g.state.journey.action];go(g,g.data.quests.q177.story.worldPlaces[a.journey.to]);observe(g);drain(g);observe(g);}}assert.equal(g.state.quests.q177.outcome,route.outcome);}
 for(const phase of ['text','choice','journey','completed'])assert.ok(phases.has(phase),phase);assert.deepEqual([...scenes].sort(),Object.keys(data.quests.q177.story.scenes).sort());assert.equal(journeys.size,7);
 const previousQ176=await read('tests/fixtures/e2-q176-before-cast.json'),oldData={...previousQ177Data,quests:{...previousQ177Data.quests,q176:previousQ176},scripts:{...previousQ177Data.scripts,...previousQ176.scripts}},old=new GameEngine(oldData);
 old.load(q177Engine({legacy:true}).save());assert.ok(old.dispatch({type:'choose',id:'visit'}));drain(old);go(old,old.data.quests.q177.story.worldPlaces.shop);drain(old);choose(old,'q177','notice');choose(old,'q177','finish');start(old,'q176');for(const id of ['visit','road','agree','return','seeoff','finish'])choose(old,'q176',id);
 const raw=old.save(),expected=upgradedQ177Save(raw);expected.state.stories.q176.revision=2;Object.assign(expected.state.stories.q176.values,{priestPersonAt:'priest',roadkeepersAt:'road_place',merchantPersonAt:'departure'});const now=new GameEngine(data);now.load(raw);assert.deepEqual(JSON.parse(now.save()),expected);checkpoint(now);
});

test('q177 all current and migrated routes retain evidence handover timing, uncertainty, consent, stationary roles and one reward',()=>{
 for(const legacy of [false,true])for(const route of q177Routes){const g=upgradeQ177(q177Engine({legacy}).save());g.random=()=>.999999;const members=[...g.state.members],gold=g.state.gold;let rewards=0;const award=g.award.bind(g);g.award=(amount,xp,recipients)=>{assert.deepEqual([amount,xp],[141,93]);rewards++;return award(amount,xp,recipients);};
  for(const id of route.path){const action=data.quests.q177.model.graph.find(n=>n.id===g.state.stories.q177.scene).options.find(o=>o.id===id).action;
   assert.ok(g.dispatch({type:'choose',id}));drain(g);let s=g.state.stories.q177;
   if(action==='onsite_compare'){assert.equal(s.values.evidenceAt,'party');assert.equal(s.values.proof,false);}
   if(action==='close_notice'){assert.equal(s.values.evidenceAt,'shop');assert.equal(s.values.closed,true);assert.equal(s.values.evidencePreserved,true);}
   if(action==='consent_return'){assert.equal(s.values.consentReceived,true);assert.equal(s.values.windowConfigured,false);assert.equal(s.values.evidenceAt,'party');}
   if(g.state.journey){const a=data.quests.q177.story.actions[g.state.journey.action];go(g,data.quests.q177.story.worldPlaces[a.journey.to]);drain(g);}
   checkpoint(g);s=g.state.stories.q177;assert.equal(s.values.courierPersonAt,'shop');assert.equal(s.values.customersAt,'public');assert.equal(s.values.mirrorDeviceAt,'shop');assert.deepEqual(g.state.members,members);
   if(action==='onsite_compare')assert.equal(s.values.proof,true);
   if(['correct','consent','window'].includes(s.scene)&&g.state.quests.q177.stage!=='completed')assert.equal(s.values.evidenceAt,'party');
  }
  const v=g.state.stories.q177.values;assert.equal(g.state.quests.q177.outcome,route.outcome);assert.equal(rewards,1);assert.equal(g.state.gold,gold+141);assert.equal(v.proof,route.path.includes('compare'));assert.equal(v.corrected,route.outcome==='correct');assert.equal(v.noticePosted,route.outcome==='notice');assert.equal(v.consentReceived,route.outcome==='window');assert.equal(v.windowConfigured,route.outcome==='window');assert.equal(v.closed,route.outcome==='close');assert.equal(v.evidencePreserved,route.outcome==='close');assert.equal(v.closurePosted,route.outcome==='close');assert.equal(v.evidenceAt,route.outcome==='correct'?'public':'shop');
  const raw=g.save();assert.throws(()=>g.complete('q177',route.outcome));assert.equal(g.save(),raw);g.run(data.quests.q177.model.entryScript);drain(g);assert.equal(rewards,1);
 }
});

test('q177 rejects corrupt old saves, impossible role locations and new item owners atomically',()=>{
 const current=q177Engine(),saved=current.save(),old=q177Engine({legacy:true}).save();
 for(const mutate of [s=>s.stories.q177.values.courierPersonAt='post',s=>s.stories.q177.values.customersAt='shop',s=>s.stories.q177.values.evidenceAt='courierPerson',s=>s.stories.q177.values.mirrorDeviceAt='courierPerson',s=>(s.flags.legacyStoryRoutes??={}).q177=true]){const raw=JSON.parse(saved);mutate(raw.state);assert.throws(()=>current.load(JSON.stringify(raw)));assert.equal(current.save(),saved);}
 for(const mutate of [s=>s.stories.q177.values.evidenceAt='unknown',s=>s.stories.q177.values.courierPersonAt='shop']){const raw=JSON.parse(old);mutate(raw.state);assert.throws(()=>current.load(JSON.stringify(raw)));assert.equal(current.save(),saved);}
 assert.equal(upgradeQ177(saved).save(),saved);
});

test('q177 browser fixtures cover every current and previous scene plus both accepted legacy decisions',async()=>{
 const r=await truthMirrorArtFixtures();assert.equal(r.fixtures.length,20);assert.equal(r.outcomes.length,4);assert.equal(new Set(r.fixtures.map(f=>f.scene+'/'+f.variant)).size,20);
 for(const f of r.fixtures){const g=upgradeQ177(f.save),dialog=projectGame(g).dialog;assert.equal(dialog.text,f.expectedText);if(f.absentStoryScene)assert.equal(dialog.scene,undefined);else assert.deepEqual(dialog.scene.cast.map(c=>c.id),f.cast);}
});

test('q177 accepted pre-relocation saves retain five direct routes, four endings and one original reward',()=>{
 for(const route of q177AcceptedRoutes){const old=q177AcceptedEngine(),g=upgradeQ177(old.save());g.random=()=>.999999;const gold=g.state.gold;let rewards=0;const award=g.award.bind(g);g.award=(amount,xp,recipients)=>{assert.deepEqual([amount,xp],[141,93]);rewards++;return award(amount,xp,recipients);};
  for(const id of route.path){assert.ok(g.dispatch({type:'choose',id}));drain(g);assert.equal(g.state.journey,null);assert.equal(g.state.stories.q177,undefined);assert.equal(projectGame(g).dialog?.scene,undefined);checkpoint(g);}
  assert.equal(g.state.quests.q177.outcome,route.outcome);assert.equal(rewards,1);assert.equal(g.state.gold,gold+141);assert.equal(g.state.flags.legacyStoryRoutes.q177,true);
 }
});
