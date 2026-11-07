import test from 'node:test';
import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {data,start,choose,go,drain,checkpoint} from './royal-helpers.mjs';
import {read} from '../tools/audit-regional-relocation.mjs';
import {previousQ181,previousQ181Data,q181Routes,q181AcceptedRoutes,q181Fixed,q181Cast,q181Engine,q181AcceptedEngine,loadQ181,quiverArtFixtures} from '../tools/quiver-art-fixtures.mjs';

test('q181 adds six scene roles and one ownership paragraph while retaining every action, domain and ending',()=>{
 const q=structuredClone(data.quests.q181);assert.deepEqual(q.model.storyUpgrades[0],{fromRevision:1,toRevision:2,previous:previousQ181.story,values:Object.entries(q181Fixed).map(([key,value])=>({key,value}))});
 for(const id of ['envoy','veteran','captain'])delete q.story.entities[id].character;
 for(const key of Object.keys(q181Fixed)){delete q.story.registry[key];delete q.story.entities[key.slice(0,-2)];}
 for(const s of Object.values(q.story.scenes))s.cast=[];
 const text=previousQ181.model.graph.find(n=>n.id==='entry').text;assert.notEqual(q.model.graph.find(n=>n.id==='entry').text,text);q.model.graph.find(n=>n.id==='entry').text=text;q.scripts['q181.observatory.entry'].commands.find(c=>c.op==='narrate').text=text;
 delete q.model.storyUpgrades;q.story.revision=q.model.edition.revision=1;assert.deepEqual(q,previousQ181);
 for(const id of new Set(Object.keys(q.story.scenes).flatMap(q181Cast))){assert.equal(data.characters[id].portrait,undefined);assert.equal(data.characters[id].sprite,undefined);}
});

test('q181 current and revision-one saves retain all nine scenes, eight journeys, waiting phases and completed results',()=>{
 const scenes=new Set(),journeys=new Set(),phases=new Set();
 const observe=g=>{const raw=g.save(),now=loadQ181(raw),before=projectGame(g).dialog,after=projectGame(now).dialog;assert.equal(g.save(),raw);assert.equal(after?.text,before?.text);assert.deepEqual(after?.options,before?.options);phases.add(g.state.journey?'journey':g.state.quests.q181.stage==='completed'?'completed':g.state.waiting?.type);if(g.state.stories.q181.scene)scenes.add(g.state.stories.q181.scene);if(after?.scene)assert.deepEqual(after.scene.cast.map(c=>c.id),q181Cast(now.state.stories.q181.scene));
  for(const [k,v] of Object.entries(q181Fixed))assert.equal(now.state.stories.q181.values[k],v);
  if(now.state.journey){const j=now.state.journey,a=data.quests.q181.story.actions[j.action];journeys.add(j.action);assert.equal(now.state.stories.q181.scene,null);assert.equal(after?.scene,undefined);assert.equal(now.dispatch({type:'story.resume',quest:'q181'}),false);now.random=()=>.999999;go(now,data.quests.q181.story.worldPlaces[a.journey.to]);drain(now);assert.equal(now.state.journey,null);checkpoint(now);assert.deepEqual(projectGame(now).dialog.scene.cast.map(c=>c.id),q181Cast(now.state.stories.q181.scene));}
 };
 for(const legacy of [false,true])for(const route of q181Routes){const g=q181Engine({legacy});observe(g);for(const id of route.path){assert.ok(g.dispatch({type:'choose',id}));observe(g);drain(g);observe(g);if(g.state.journey){const a=g.data.quests.q181.story.actions[g.state.journey.action];go(g,g.data.quests.q181.story.worldPlaces[a.journey.to]);observe(g);drain(g);observe(g);}}assert.equal(g.state.quests.q181.outcome,route.outcome);}
 assert.equal(scenes.size,9);assert.equal(journeys.size,8);for(const p of ['text','choice','journey','completed'])assert.ok(phases.has(p),p);
});

test('q181 separates notification, agreement, reporting and the single quiver handover across all four paths',()=>{
 for(const legacy of [false,true])for(const route of q181Routes){const g=loadQ181(q181Engine({legacy}).save());g.random=()=>.999999;const members=[...g.state.members],inventory=structuredClone(g.state.inventory),gold=g.state.gold;let rewards=0;const award=g.award.bind(g);g.award=(gold,xp,recipients)=>{assert.deepEqual([gold,xp],[153,99]);rewards++;return award(gold,xp,recipients);};const v=()=>g.state.stories.q181.values;
  for(const id of route.path){const scene=g.state.stories.q181.scene;assert.equal(v().captainAt,'entry');assert.equal(v().quiverAt,'envoy');assert.equal(v().envoyAt,v().partyAt);assert.equal(v().veteranAt,v().partyAt);for(const [k,value] of Object.entries(q181Fixed))assert.equal(v()[k],value);
   if(scene==='entry')assert.equal(v().notice,false);if(scene==='meeting')assert.equal(v().agreed,false);if(scene==='agreed')assert.equal(v().agreed,true);
   assert.ok(g.dispatch({type:'choose',id}));drain(g);
   if(g.state.journey){assert.equal(v().envoyAt,'transit');assert.equal(v().veteranAt,'transit');assert.equal(v().captainAt,'entry');assert.equal(v().quiverAt,'envoy');if(scene==='entry'&&id==='ask')assert.equal(v().notice,false);if(scene==='meeting')assert.equal(v().agreed,true);const a=data.quests.q181.story.actions[g.state.journey.action];go(g,data.quests.q181.story.worldPlaces[a.journey.to]);drain(g);if(scene==='entry'&&id==='ask')assert.equal(v().notice,true);}checkpoint(g);
  }
  assert.equal(v().quiverAt,route.outcome==='meet'?'veteran':'envoy');assert.equal(v().agreed,route.outcome==='meet');assert.equal(v().notice,route.path.includes('ask'));assert.equal(v().partyAt,'entry');assert.equal(v().envoyAt,'entry');assert.equal(v().veteranAt,'entry');assert.equal(v().captainAt,'entry');assert.equal(g.state.quests.q181.outcome,route.outcome);assert.equal(g.state.gold,gold+153);assert.equal(rewards,1);assert.deepEqual(g.state.members,members);assert.deepEqual(g.state.inventory,inventory);const raw=g.save();assert.throws(()=>g.complete('q181',route.outcome));assert.equal(g.save(),raw);g.run(data.quests.q181.model.entryScript);drain(g);assert.equal(rewards,1);
 }
});

test('q181 browser fixtures cover current and preserved entry prose without giving remote or stationary roles an extra scene',async()=>{
 const r=await quiverArtFixtures();assert.equal(r.fixtures.length,20);assert.equal(r.outcomes.length,3);assert.equal(new Set(r.fixtures.map(f=>f.scene+'/'+f.variant)).size,20);
 for(const f of r.fixtures){const dialog=projectGame(loadQ181(f.save)).dialog;assert.equal(dialog.text,f.expectedText);if(f.absentStoryScene)assert.equal(dialog.scene,undefined);else assert.deepEqual(dialog.scene.cast.map(c=>c.id),f.cast);}
 const entry=variant=>r.fixtures.find(f=>f.scene==='entry'&&f.variant===variant).expectedText;assert.notEqual(entry('previous'),entry('current'));assert.match(entry('current'),/使者は白い矢筒を掲げ/);
 for(const [role,scenes] of [['q181_post_mercenaries',['briefed']],['q181_front_mercenaries',['misfire']],['q181_counterpart',['meeting']],['q181_captain',['entry','agreed','rescue_report','withdrawn']]])assert.deepEqual(Object.keys(data.quests.q181.story.scenes).filter(s=>q181Cast(s).includes(role)),scenes);
});

test('q181 rejects invalid holders, moved fixed roles, missing fields and mixed route flags atomically',()=>{
 const g=q181Engine(),raw=g.save(),old=q181Engine({legacy:true}).save();
 for(const input of [raw,old])for(const mutate of [s=>s.stories.q181.values.quiverAt='unknown',s=>s.stories.q181.values.envoyAt='unknown',s=>s.stories.q181.revision=3,s=>(s.flags.legacyStoryRoutes??={}).q181=true]){const saved=JSON.parse(input);mutate(saved.state);assert.throws(()=>g.load(JSON.stringify(saved)));assert.equal(g.save(),raw);}
 for(const key of Object.keys(q181Fixed))for(const invalid of ['entry',undefined]){const saved=JSON.parse(raw);if(invalid===undefined)delete saved.state.stories.q181.values[key];else saved.state.stories.q181.values[key]=invalid;assert.throws(()=>g.load(JSON.stringify(saved)));assert.equal(g.save(),raw);}assert.equal(loadQ181(raw).save(),raw);
});

test('q181 accepted pre-relocation saves retain all four paths, three endings and one reward without new scene roles',()=>{
 for(const route of q181AcceptedRoutes){const g=loadQ181(q181AcceptedEngine().save()),gold=g.state.gold;let rewards=0;const award=g.award.bind(g);g.award=(...args)=>{rewards++;return award(...args);};for(const id of route.path){assert.ok(g.dispatch({type:'choose',id}));drain(g);assert.equal(g.state.journey,null);assert.equal(g.state.stories.q181,undefined);assert.equal(projectGame(g).dialog?.scene,undefined);checkpoint(g);}assert.equal(g.state.quests.q181.outcome,route.outcome);assert.equal(g.state.gold,gold+153);assert.equal(rewards,1);}
});

test('q181 migration retains a completed revision-one q180 save and its prior prose and reward',async()=>{
 const previous=await read('tests/fixtures/e2-q180-before-cast.json'),oldData={...previousQ181Data,quests:{...previousQ181Data.quests,q180:previous},scripts:{...previousQ181Data.scripts,...previous.scripts}},g=new GameEngine(oldData);g.load(q181Engine({legacy:true}).save());g.random=()=>.999999;for(const id of ['withdraw','finish'])choose(g,'q181',id);
 const helpers=await import('./machine-helpers.mjs');helpers.start(g,'q180');for(const id of ['visit','ban','finish'])helpers.choose(g,'q180',id);const raw=g.save(),expected=JSON.parse(raw);expected.state.stories.q181.revision=2;Object.assign(expected.state.stories.q181.values,q181Fixed);const now=loadQ181(raw);assert.deepEqual(JSON.parse(now.save()),expected);assert.equal(now.state.stories.q180.revision,1);checkpoint(now);
});
