import test from 'node:test';
import assert from 'node:assert/strict';
import {projectGame} from '../src/application/projection.js';
import {data,go,drain,checkpoint} from './library-helpers.mjs';
import {previousQ044,q044Routes,q044AcceptedRoutes,q044Cast,q044Engine,q044AcceptedEngine,loadQ044,chooseQ044,obituaryArtFixtures} from '../tools/obituary-art-fixtures.mjs';

test('q044 changes only the existing subject character link and four casts',()=>{
 const q=structuredClone(data.quests.q044);assert.equal(q.story.revision,1);assert.equal(q.model.edition.revision,1);assert.equal(q.model.storyUpgrades,undefined);
 assert.equal(q.story.entities.subject.character,'q044_subject');assert.equal(data.characters.q044_subject.portrait,undefined);assert.equal(data.characters.q044_subject.sprite,undefined);
 assert.equal(Object.values(q.story.scenes).filter(s=>s.cast.length).length,4);
 for(const s of Object.values(q.story.scenes))s.cast=[];delete q.story.entities.subject.character;assert.deepEqual(q,previousQ044);
});

test('q044 current and previous saves resume seven scenes, eight journeys and all thirteen actions unchanged',()=>{
 const scenes=new Set(),journeys=new Set(),actions=new Set(),phases=new Set();
 const observe=g=>{
  const raw=g.save(),now=loadQ044(raw),before=projectGame(g).dialog,after=projectGame(now).dialog;assert.equal(g.save(),raw);assert.equal(now.save(),raw);assert.equal(after?.text,before?.text);assert.deepEqual(after?.options,before?.options);
  const s=now.state.stories.q044;phases.add(now.state.journey?'journey':now.state.quests.q044.stage==='completed'?'completed':now.state.waiting?.type);
  if(s.scene)scenes.add(s.scene);if(after?.scene)assert.deepEqual(after.scene.cast.map(c=>c.id),q044Cast(s.scene));
  if(now.state.journey){
   const id=now.state.journey.action,a=data.quests.q044.story.actions[id];journeys.add(id);assert.equal(s.scene,null);assert.equal(after?.scene,undefined);assert.equal(now.dispatch({type:'story.resume',quest:'q044'}),false);
   for(const who of a.journey.companions)assert.equal(s.values[who+'At'],'transit');const subject=s.values.subjectAt;
   go(now,data.quests.q044.story.worldPlaces[a.journey.to]);drain(now);checkpoint(now);assert.equal(now.state.journey,null);
   assert.equal(now.state.stories.q044.values.subjectAt,a.journey.companions.includes('subject')?a.journey.to:subject);
  }
 };
 for(const legacy of [false,true])for(const route of q044Routes){const g=q044Engine({legacy});observe(g);for(const id of route.path){
  actions.add(g.state.stories.q044.scene+'_'+id);assert.ok(g.dispatch({type:'choose',id}));observe(g);drain(g);observe(g);
  if(g.state.journey){const a=g.data.quests.q044.story.actions[g.state.journey.action];go(g,g.data.quests.q044.story.worldPlaces[a.journey.to]);observe(g);drain(g);observe(g);}
 }assert.equal(g.state.quests.q044.outcome,route.outcome);}
 assert.equal(scenes.size,7);assert.equal(journeys.size,8);assert.deepEqual([...actions].sort(),Object.keys(data.quests.q044.story.actions).sort());for(const p of ['text','choice','journey','completed'])assert.ok(phases.has(p),p);
});

test('q044 escape and signed appeal preserve different protection and submission timing',()=>{
 for(const legacy of [false,true])for(const choice of ['escape','appeal']){
  const g=loadQ044(q044Engine({legacy}).save()),v=()=>g.state.stories.q044.values;chooseQ044(g,'warn');assert.equal(v().subjectAt,'person');assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['q044_subject']);
  assert.ok(g.dispatch({type:'choose',id:choice}));drain(g);assert.equal(v().subjectAt,'transit');assert.equal(v().protected,false);assert.equal(v().appealed,false);loadQ044(g.save());
  go(g,data.quests.q044.story.worldPlaces.refuge);drain(g);assert.equal(v().subjectAt,'refuge');assert.equal(v().protected,choice==='appeal');assert.equal(v().appealed,false);assert.equal(v().reviewRequested,false);assert.equal(v().noticeAt,'party');
  assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['q044_subject']);
  if(choice==='escape'){chooseQ044(g,'finish');assert.equal(v().protected,true);assert.equal(v().appealed,false);assert.equal(v().reviewRequested,false);}
  else{
   assert.ok(g.dispatch({type:'choose',id:'appeal'}));drain(g);assert.equal(v().subjectAt,'refuge');assert.equal(v().appealed,false);loadQ044(g.save());
   go(g,data.quests.q044.story.worldPlaces.office);drain(g);assert.equal(v().appealed,true);assert.equal(v().reviewRequested,false);assert.equal(v().subjectAt,'refuge');assert.deepEqual(projectGame(g).dialog.scene.cast,[]);
   chooseQ044(g,'publish');assert.equal(v().reviewRequested,true);assert.equal(v().noticeAt,'party');
  }loadQ044(g.save());
 }
});

test('q044 locating the person enables only the actual market or refuge and rejects the stale destination',()=>{
 for(const legacy of [false,true])for(const evacuated of [false,true]){
  let g=loadQ044(q044Engine({legacy}).save());for(const id of evacuated?['warn','appeal','appeal','warn']:['office','warn'])chooseQ044(g,id);
  for(let i=0;i<2;i++){
   g=loadQ044(g.save());const d=projectGame(g).dialog,valid=evacuated?'refuge':'market',invalid=evacuated?'market':'refuge';assert.deepEqual(d.scene.cast,[]);assert.equal(d.options.find(o=>o.id===valid).enabled,true);assert.equal(d.options.find(o=>o.id===invalid).enabled,false);
   const raw=g.save();assert.equal(g.dispatch({type:'choose',id:invalid}),false);assert.equal(g.save(),raw);
  }
  chooseQ044(g,evacuated?'refuge':'market');assert.equal(g.state.stories.q044.scene,evacuated?'safe_refuge':'safe');assert.equal(g.state.stories.q044.values.subjectAt,evacuated?'refuge':'person');assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['q044_subject']);
 }
});

test('q044 repeated office visits keep the subject in the refuge and public review can precede evacuation',()=>{
 for(const legacy of [false,true]){
  const g=loadQ044(q044Engine({legacy}).save());for(const id of ['warn','appeal','appeal'])chooseQ044(g,id);
  for(let i=0;i<3;i++){for(const id of ['warn','refuge','appeal']){chooseQ044(g,id);assert.equal(g.state.stories.q044.values.subjectAt,'refuge');assert.equal(g.state.stories.q044.values.reviewRequested,false);loadQ044(g.save());}assert.deepEqual(projectGame(g).dialog.scene.cast,[]);}
  chooseQ044(g,'publish');assert.equal(g.state.quests.q044.outcome,'informed');
  const direct=loadQ044(q044Engine({legacy}).save());for(const id of ['office','publish'])chooseQ044(direct,id);const v=direct.state.stories.q044.values;assert.equal(v.subjectAt,'person');assert.equal(v.protected,false);assert.equal(v.appealed,false);assert.equal(v.reviewRequested,true);assert.equal(direct.state.quests.q044.outcome,'informed');
 }
});

test('q044 all bounded routes preserve three one-time rewards, custody and no invented delivery-spirit battle',()=>{
 const rewards={contract:[125,75],compromise:[68,75],informed:[105,100]};
 for(const legacy of [false,true])for(const route of q044Routes){
  const g=loadQ044(q044Engine({legacy}).save()),gold=g.state.gold,inventory=structuredClone(g.state.inventory),members=[...g.state.members],battles=g.state.records.battles;let count=0;
  const award=g.award.bind(g);g.award=(gp,xp,who)=>{assert.deepEqual([gp,xp],rewards[route.outcome]);count++;return award(gp,xp,who);};
  for(const id of route.path){assert.equal(count,0);chooseQ044(g,id);}assert.equal(g.state.quests.q044.outcome,route.outcome);assert.equal(count,1);assert.equal(g.state.gold,gold+rewards[route.outcome][0]);assert.deepEqual(g.state.inventory,inventory);assert.deepEqual(g.state.members,members);assert.equal(g.state.records.battles,battles);
  const v=g.state.stories.q044.values;assert.equal(v.noticeAt,route.outcome==='contract'?'discard':'party');assert.equal(v.destroyed,route.outcome==='contract');assert.equal(v.reviewRequested,route.outcome==='informed');if(route.outcome==='compromise'){assert.equal(v.protected,true);assert.equal(v.subjectAt,'refuge');}
  const raw=g.save();assert.throws(()=>g.complete('q044',route.outcome));assert.equal(g.save(),raw);g.run(data.quests.q044.model.entryScript);drain(g);assert.equal(count,1);loadQ044(g.save());
 }
});

test('q044 pre-relocation accepted saves preserve three scenes and direct choices without new casts or journeys',()=>{
 const scenes=new Set();
 for(const route of q044AcceptedRoutes){const g=loadQ044(q044AcceptedEngine().save());let count=0;const award=g.award.bind(g);g.award=(gold,xp,who)=>{const o=data.previousQuestRoutes.q044.outcomes[route.outcome];assert.deepEqual([gold,xp],[o.gold,o.xp]);count++;return award(gold,xp,who);};
  for(const id of route.path){scenes.add(g.state.flags.flow.q044.node);loadQ044(g.save());assert.ok(g.dispatch({type:'choose',id}));loadQ044(g.save());drain(g);assert.equal(g.state.journey,null);assert.equal(g.state.stories.q044,undefined);assert.equal(projectGame(g).dialog?.scene,undefined);checkpoint(g);}
  assert.equal(g.state.quests.q044.outcome,route.outcome);assert.equal(count,1);loadQ044(g.save());
 }assert.deepEqual([...scenes].sort(),['entry','office','safe']);
});

test('q044 invalid custody, value types, revisions and mixed old routes are rejected atomically',()=>{
 const g=q044Engine(),raw=g.save();for(const mutate of [s=>s.stories.q044.values.subjectAt='missing',s=>s.stories.q044.values.protected='true',s=>s.stories.q044.values.noticeAt='missing',s=>s.stories.q044.revision=2,s=>(s.flags.legacyStoryRoutes??={}).q044=true]){const saved=JSON.parse(raw);mutate(saved.state);assert.throws(()=>g.load(JSON.stringify(saved)));assert.equal(g.save(),raw);}
});

test('q044 browser fixtures cover current and previous casts, both blocked destinations and accepted legacy scenes',async()=>{
 const r=await obituaryArtFixtures();assert.equal(r.fixtures.length,27);assert.equal(r.outcomes.length,3);assert.equal(r.fixtures.filter(f=>f.absentStoryScene).length,3);assert.equal(r.fixtures.filter(f=>f.blockedChoice).length,4);
 for(const f of r.fixtures){const g=loadQ044(f.save),d=projectGame(g).dialog;assert.equal(d.text,f.expectedText);if(f.absentStoryScene)assert.equal(d.scene,undefined);else assert.deepEqual(d.scene.cast.map(c=>c.id),q044Cast(f.scene));}
});
