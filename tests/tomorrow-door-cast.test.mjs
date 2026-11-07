import test from 'node:test';
import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {data,read,start,choose,go,drain,checkpoint} from './machine-helpers.mjs';
import {previousQ178,previousQ178Data,q178Routes,q178AcceptedRoutes,q178Cast,q178Engine,q178AcceptedEngine,upgradedQ178Save,upgradeQ178,tomorrowDoorArtFixtures} from '../tools/tomorrow-door-art-fixtures.mjs';

test('q178 adds three role displays and corrects three timing paragraphs while preserving every action and item owner',()=>{
 const q=structuredClone(data.quests.q178);assert.deepEqual(q.model.storyUpgrades[0],{fromRevision:1,toRevision:2,previous:previousQ178.story,values:[{key:'hostPersonAt',value:'host'}]});
 for(const id of ['daughterPerson','parentPerson'])delete q.story.entities[id].character;delete q.story.entities.hostPerson;delete q.story.registry.hostPersonAt;
 for(const scene of Object.values(q.story.scenes))scene.cast=[];
 for(const id of ['daughter_door','player_door','delivered']){const old=previousQ178.model.graph.find(n=>n.id===id).text,node=q.model.graph.find(n=>n.id===id);assert.notEqual(node.text,old);node.text=old;q.scripts['q178.machine.'+id].commands.find(c=>c.op==='narrate').text=old;}
 delete q.model.storyUpgrades;q.story.revision=q.model.edition.revision=1;assert.deepEqual(q,previousQ178);
 for(const id of ['q178_daughter','q178_parent','q178_host']){assert.equal(data.characters[id].portrait,undefined);assert.equal(data.characters[id].sprite,undefined);}
});

test('q178 current and revision-one saves preserve every waiting phase, scene, journey and completion',()=>{
 const phases=new Set(),scenes=new Set(),journeys=new Set();
 const observe=g=>{const raw=g.save(),now=upgradeQ178(raw),before=projectGame(g).dialog,after=projectGame(now).dialog;assert.equal(g.save(),raw);assert.equal(after?.text,before?.text);assert.deepEqual(after?.options,before?.options);assert.equal(now.state.stories.q178.values.hostPersonAt,'host');
  phases.add(g.state.journey?'journey':g.state.quests.q178.stage==='completed'?'completed':g.state.waiting?.type);if(g.state.stories.q178.scene)scenes.add(g.state.stories.q178.scene);if(after?.scene)assert.deepEqual(after.scene.cast.map(c=>c.id),q178Cast(now.state.stories.q178.scene));
  if(now.state.journey){const j=now.state.journey,a=data.quests.q178.story.actions[j.action];journeys.add(j.action);assert.equal(now.state.stories.q178.scene,null);assert.equal(after?.scene,undefined);assert.equal(now.dispatch({type:'story.resume',quest:'q178'}),false);now.random=()=>.999999;go(now,data.quests.q178.story.worldPlaces[a.journey.to]);drain(now);assert.equal(now.state.journey,null);checkpoint(now);assert.deepEqual(projectGame(now).dialog.scene.cast.map(c=>c.id),q178Cast(now.state.stories.q178.scene));}
 };
 for(const legacy of [false,true])for(const route of q178Routes){const g=q178Engine({legacy});observe(g);for(const id of route.path){assert.ok(g.dispatch({type:'choose',id}));observe(g);drain(g);observe(g);if(g.state.journey){const a=g.data.quests.q178.story.actions[g.state.journey.action];go(g,g.data.quests.q178.story.worldPlaces[a.journey.to]);observe(g);drain(g);observe(g);}}assert.equal(g.state.quests.q178.outcome,route.outcome);}
 for(const phase of ['text','choice','journey','completed'])assert.ok(phases.has(phase),phase);assert.deepEqual([...scenes].sort(),Object.keys(data.quests.q178.story.scenes).sort());assert.equal(journeys.size,8);
});

test('q178 five routes keep crossing irreversible, handovers at their original times, parent whereabouts and exactly one reward',()=>{
 for(const legacy of [false,true])for(const route of q178Routes){const g=upgradeQ178(q178Engine({legacy}).save());g.random=()=>.999999;const members=[...g.state.members],gold=g.state.gold;let rewards=0;const award=g.award.bind(g);g.award=(amount,xp,recipients)=>{assert.deepEqual([amount,xp],[141,93]);rewards++;return award(amount,xp,recipients);};
  for(const id of route.path){let s=g.state.stories.q178;const scene=s.scene,action=data.quests.q178.model.graph.find(n=>n.id===scene).options.find(o=>o.id===id).action;
   if(['daughter_door','player_door'].includes(scene)){assert.equal(s.values.daughterCrossed,false);assert.equal(s.values.playerCrossed,false);assert.equal(s.values.nightClosed,false);assert.equal(s.values.daughterPersonAt,'entry');assert.equal(s.values.parentPersonAt,'family_place');}
   if(scene==='delivered'){assert.equal(s.values.letterSheetAt,'party');assert.equal(s.values.letterDelivered,false);}
   if(scene==='wait')assert.equal(s.values.ribbonAt,'morning_place');
   assert.ok(g.dispatch({type:'choose',id}));drain(g);s=g.state.stories.q178;
   if(action==='entry_test')assert.equal(s.values.objectReturned,false);
   if(['daughter_door_morning','player_door_cross'].includes(action)){assert.equal(s.values.daughterCrossed,true);assert.equal(s.values.nightClosed,true);assert.equal(s.values.playerCrossed,action==='player_door_cross');assert.equal(s.values.daughterPersonAt,'transit');}
   if(action==='wait_talk_morning'){assert.equal(s.values.talked,true);assert.equal(s.values.ordinaryMorning,true);assert.equal(s.values.parentPersonAt,'transit');}
   if(action==='morning_finish'){assert.equal(s.values.letterSheetAt,'party');assert.equal(s.values.letterDelivered,false);assert.equal(s.values.daughterPersonAt,'morning_place');}
   if(g.state.journey){const a=data.quests.q178.story.actions[g.state.journey.action];go(g,data.quests.q178.story.worldPlaces[a.journey.to]);drain(g);}checkpoint(g);s=g.state.stories.q178;
   if(action==='entry_test')assert.equal(s.values.objectReturned,true);assert.equal(s.values.hostPersonAt,'host');assert.equal(s.values.testObjectAt,'entry');assert.deepEqual(g.state.members,members);
   if(s.values.nightClosed&&g.state.waiting?.type==='choice'){const story=structuredClone(s);for(const forbidden of ['test','close','wait'])assert.equal(g.dispatch({type:'choose',id:forbidden}),false);assert.deepEqual(g.state.stories.q178,story);}
  }
  const v=g.state.stories.q178.values;assert.equal(g.state.quests.q178.outcome,route.outcome);assert.equal(rewards,1);assert.equal(g.state.gold,gold+141);assert.equal(v.objectReturned,route.path.includes('test'));assert.equal(v.daughterAgreed,route.path.includes('daughter'));assert.equal(v.playerAgreed,route.path.includes('player'));assert.equal(v.daughterCrossed,route.outcome==='cross');assert.equal(v.playerCrossed,route.path.includes('player'));assert.equal(v.nightClosed,route.outcome==='cross');assert.equal(v.talked,route.outcome==='wait');assert.equal(v.ordinaryMorning,route.outcome==='wait');assert.equal(v.doorSealed,route.outcome==='close');assert.equal(v.letterDelivered,route.outcome==='cross');assert.equal(v.letterSheetAt,route.outcome==='cross'?'host':'morning_place');assert.equal(v.ribbonAt,route.outcome==='wait'?'daughterPerson':'morning_place');assert.equal(v.parentPersonAt,route.outcome==='wait'?'morning_place':'family_place');assert.equal(v.daughterPersonAt,route.outcome==='close'?'family_place':'morning_place');
  const raw=g.save();assert.throws(()=>g.complete('q178',route.outcome));assert.equal(g.save(),raw);g.run(data.quests.q178.model.entryScript);drain(g);assert.equal(rewards,1);
 }
});

test('q178 browser fixtures distinguish preserved old prose, corrected arrival prose and accepted legacy decisions',async()=>{
 const r=await tomorrowDoorArtFixtures();assert.equal(r.fixtures.length,24);assert.equal(r.outcomes.length,3);assert.equal(new Set(r.fixtures.map(f=>f.scene+'/'+f.variant)).size,24);
 for(const f of r.fixtures){const g=upgradeQ178(f.save),dialog=projectGame(g).dialog;assert.equal(dialog.text,f.expectedText);if(f.absentStoryScene)assert.equal(dialog.scene,undefined);else assert.deepEqual(dialog.scene.cast.map(c=>c.id),f.cast);}
 for(const scene of ['daughter_door','player_door','delivered']){const get=variant=>r.fixtures.find(f=>f.scene===scene&&f.variant===variant).expectedText;assert.notEqual(get('previous'),get('current'));assert.equal(get('previous-arrived'),get('current'));}
});

test('q178 rejects invalid host positions, new item owners and mixed legacy saves atomically and migrates idempotently',()=>{
 const current=q178Engine(),saved=current.save(),old=q178Engine({legacy:true}).save();
 for(const mutate of [s=>s.stories.q178.values.hostPersonAt='family_place',...['testObjectAt','ribbonAt','letterSheetAt'].map(key=>s=>s.stories.q178.values[key]='hostPerson'),s=>(s.flags.legacyStoryRoutes??={}).q178=true]){const raw=JSON.parse(saved);mutate(raw.state);assert.throws(()=>current.load(JSON.stringify(raw)));assert.equal(current.save(),saved);}
 for(const mutate of [s=>s.stories.q178.values.letterSheetAt='unknown',s=>s.stories.q178.values.hostPersonAt='host']){const raw=JSON.parse(old);mutate(raw.state);assert.throws(()=>current.load(JSON.stringify(raw)));assert.equal(current.save(),saved);}
 assert.equal(upgradeQ178(saved).save(),saved);
});

test('q178 accepted pre-relocation saves retain five routes, three endings and the original single reward',()=>{
 for(const route of q178AcceptedRoutes){const g=upgradeQ178(q178AcceptedEngine().save());g.random=()=>.999999;const gold=g.state.gold;let rewards=0;const award=g.award.bind(g);g.award=(amount,xp,recipients)=>{assert.deepEqual([amount,xp],[141,93]);rewards++;return award(amount,xp,recipients);};for(const id of route.path){assert.ok(g.dispatch({type:'choose',id}));drain(g);assert.equal(g.state.journey,null);assert.equal(g.state.stories.q178,undefined);assert.equal(projectGame(g).dialog?.scene,undefined);checkpoint(g);}assert.equal(g.state.quests.q178.outcome,route.outcome);assert.equal(rewards,1);assert.equal(g.state.gold,gold+141);assert.equal(g.state.flags.legacyStoryRoutes.q178,true);}
});

test('q178 migration composes with a completed revision-one q177 without changing either quest progress',async()=>{
 const previous=await read('tests/fixtures/e2-q177-before-cast.json'),oldData={...previousQ178Data,quests:{...previousQ178Data.quests,q177:previous},scripts:{...previousQ178Data.scripts,...previous.scripts}},old=new GameEngine(oldData);old.load(q178Engine({legacy:true}).save());old.random=()=>.999999;for(const id of ['close','finish'])choose(old,'q178',id);start(old,'q177');for(const id of ['visit','notice','finish'])choose(old,'q177',id);
 const raw=old.save(),expected=upgradedQ178Save(raw);expected.state.stories.q177.revision=2;Object.assign(expected.state.stories.q177.values,{courierPersonAt:'shop',customersAt:'public'});const now=new GameEngine(data);now.load(raw);assert.deepEqual(JSON.parse(now.save()),expected);checkpoint(now);
});
