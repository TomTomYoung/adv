import test from 'node:test';
import assert from 'node:assert/strict';
import {projectGame} from '../src/application/projection.js';
import {data,go,drain} from './royal-helpers.mjs';
import {previousQ083,q083Routes,q083Cast,q083LegacyScene,q083Engine,q083AcceptedEngine,loadQ083,chooseQ083,departQ083,arriveQ083,undergroundEclipseArtFixtures} from '../tools/underground-eclipse-art-fixtures.mjs';
const story=g=>g.state.stories.q083,values=g=>story(g).values;
const fixed=g=>{assert.equal(values(g).calendarMakerAt,'entry');assert.equal(values(g).maintainerAt,'scaffold');};

test('q083 changes only two fixed actors, migration, two casts and three pending-action sentences',()=>{
 const q=structuredClone(data.quests.q083);assert.equal(q.story.revision,2);assert.equal(q.model.edition.revision,2);
 assert.deepEqual(q.model.storyUpgrades[0].previous,previousQ083.story);
 assert.deepEqual(q.model.storyUpgrades[0].values,[{key:'calendarMakerAt',value:'entry'},{key:'maintainerAt',value:'scaffold'}]);
 for(const [id,place] of [['calendarMaker','entry'],['maintainer','scaffold']]){
  assert.deepEqual(q.story.entities[id],{holder:id+'At',kind:'person',character:'q083_'+id});
  assert.deepEqual(q.story.registry[id+'At'].values,[place]);assert.equal(q.story.registry[id+'At'].initial,place);
  for(const prop of ['portrait','sprite'])assert.equal(data.characters['q083_'+id][prop],undefined);
  delete q.story.entities[id];delete q.story.registry[id+'At'];
 }
 assert.deepEqual(q.story.registry,previousQ083.story.registry);assert.deepEqual(q.story.actions,previousQ083.story.actions);
 for(const a of Object.values(q.story.actions))if(a.journey)assert.deepEqual(a.journey.companions,[]);
 for(const [id,s] of Object.entries(q.story.scenes)){assert.deepEqual(s.cast.map(c=>c.entity),id==='entry'?['calendarMaker']:id==='scaffold'?['maintainer']:[]);s.cast=[];}
 for(const id of ['stopped','corrected','shade']){
  const n=q.model.graph.find(n=>n.id===id),now=n.text,old=previousQ083.model.graph.find(n=>n.id===id).text;assert.notEqual(now,old);n.text=old;let count=0;
  const restore=x=>{if(!x||typeof x!=='object')return;for(const k of Object.keys(x))if(x[k]===now){x[k]=old;count++;}else restore(x[k]);};restore(q.scripts);assert.equal(count,1);
 }
 delete q.model.storyUpgrades;q.story.revision=q.model.edition.revision=1;assert.deepEqual(q,previousQ083);
});

test('q083 five routes exactly enumerate current and accepted acyclic graphs',()=>{
 function paths(graph){const result=[],nodes=new Map(graph.map(n=>[n.id,n]));const visit=(scene,route,seen)=>{assert.ok(!seen.has(scene));const next=new Set([...seen,scene]);for(const o of nodes.get(scene).options){const path=[...route,o.id];if(o.to.startsWith('@'))result.push({path,outcome:o.to.slice(1)});else visit(o.to,path,next);}};visit('entry',[],new Set());return result.map(JSON.stringify).sort();}
 assert.equal(q083Routes.length,5);
 assert.deepEqual(paths(data.quests.q083.model.graph),q083Routes.map(({path,outcome})=>JSON.stringify({path,outcome})).sort());
 assert.deepEqual(paths(data.previousQuestRoutes.q083.model.graph),q083Routes.map(({accepted:path,outcome})=>JSON.stringify({path,outcome})).sort());
});

test('q083 all six scenes, five journeys and ten actions preserve waiting text and options across save generations',()=>{
 const scenes=new Set(),journeys=new Set(),actions=new Set(),phases=new Set();
 const observe=g=>{
  const raw=g.save(),h=loadQ083(raw);assert.equal(g.save(),raw);const before=projectGame(g).dialog,after=projectGame(h).dialog;
  assert.equal(after?.text,before?.text);assert.deepEqual(after?.options,before?.options);fixed(h);
  assert.equal(h.state.battle,null);if(story(h).scene)scenes.add(story(h).scene);
  phases.add(h.state.journey?'journey':h.state.quests.q083.stage==='completed'?'completed':h.state.waiting?.type);
  if(after?.scene)assert.deepEqual(after.scene.cast.map(c=>c.id),q083Cast(story(h).scene));
  if(h.state.journey){journeys.add(h.state.journey.action);assert.equal(story(h).scene,null);assert.equal(after?.scene,undefined);assert.equal(h.dispatch({type:'story.resume',quest:'q083'}),false);arriveQ083(h);}
 };
 for(const legacy of [false,true])for(const route of q083Routes){const g=q083Engine({legacy});observe(g);for(const id of route.path){actions.add(story(g).scene+'_'+id);assert.ok(g.dispatch({type:'choose',id}));observe(g);drain(g);observe(g);if(g.state.journey){const a=g.data.quests.q083.story.actions[g.state.journey.action];go(g,g.data.quests.q083.story.worldPlaces[a.journey.to]);observe(g);drain(g);observe(g);}}assert.equal(g.state.quests.q083.outcome,route.outcome);}
 assert.equal(scenes.size,6);assert.equal(journeys.size,5);assert.equal(actions.size,10);assert.deepEqual([...actions].sort(),Object.keys(data.quests.q083.story.actions).sort());
 for(const phase of ['text','choice','journey','completed'])assert.ok(phases.has(phase),phase);
});

test('q083 observing the scaffold does not remove it or stop rotation and does not escort the calendar maker',()=>{
 for(const legacy of [false,true]){const g=loadQ083(q083Engine({legacy}).save());
  assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['q083_calendarMaker']);
  departQ083(g,'cycle');fixed(g);assert.equal(values(g).removed,false);assert.equal(values(g).stopped,false);
  arriveQ083(g);assert.equal(story(g).scene,'scaffold');assert.equal(values(g).removed,false);assert.equal(values(g).stopped,false);
  assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['q083_maintainer']);fixed(g);
 }
});

test('q083 removal is immediate but calendar correction remains pending until its own finish',()=>{
 for(const legacy of [false,true]){const g=loadQ083(q083Engine({legacy}).save());chooseQ083(g,'cycle');chooseQ083(g,'dates');
  assert.equal(story(g).scene,'removed');assert.equal(values(g).removed,true);assert.equal(g.state.journey,null);assert.equal(values(g).finished,false);assert.equal(values(g).resolution,'pending');
  assert.deepEqual(projectGame(g).dialog.scene.cast,[]);departQ083(g,'record');const h=loadQ083(g.save());arriveQ083(h);
  assert.equal(story(h).scene,'corrected');assert.equal(values(h).removed,true);assert.equal(values(h).stopped,false);assert.equal(values(h).finished,false);fixed(h);
  assert.deepEqual(projectGame(h).dialog.scene.cast,[]);chooseQ083(h,'finish');assert.equal(values(h).resolution,'informed');assert.equal(values(h).finished,true);
 }
});

test('q083 removal-only remains a distinct ending and control arrival does not stop rotation',()=>{
 for(const legacy of [false,true]){
  const a=loadQ083(q083Engine({legacy}).save());chooseQ083(a,'cycle');chooseQ083(a,'only');assert.equal(a.state.quests.q083.outcome,'repaired');assert.equal(values(a).removed,true);assert.equal(values(a).stopped,false);assert.equal(values(a).partyAt,'scaffold');fixed(a);
  const g=loadQ083(q083Engine({legacy}).save());departQ083(g,'stop');assert.equal(values(g).stopped,false);arriveQ083(g);assert.equal(story(g).scene,'stopped');assert.equal(values(g).stopped,false);assert.equal(values(g).finished,false);
  assert.deepEqual(projectGame(g).dialog.scene.cast,[]);chooseQ083(g,'finish');assert.equal(values(g).stopped,true);assert.equal(values(g).removed,false);assert.equal(g.state.quests.q083.outcome,'contract');fixed(g);
 }
});

test('q083 both shade agreements leave the scaffold and rotation unchanged; all routes remain non-combat',()=>{
 for(const legacy of [false,true])for(const route of q083Routes){const g=loadQ083(q083Engine({legacy}).save());const terrain=structuredClone(g.state.dungeons.persistent.region_9.systems.terrain);
  for(const id of route.path){chooseQ083(g,id);assert.equal(g.state.battle,null);if(g.state.quests.q083.stage!=='completed'&&story(g).scene==='shade'){assert.equal(values(g).removed,false);assert.equal(values(g).stopped,false);assert.equal(values(g).finished,false);assert.deepEqual(projectGame(g).dialog.scene.cast,[]);}}
  assert.equal(values(g).removed,route.removed);assert.equal(values(g).stopped,route.stopped);assert.deepEqual(g.state.dungeons.persistent.region_9.systems.terrain,terrain);fixed(g);
 }
});

test('q083 every journey survives retreat and defeat with stationary actors and resolution state intact',()=>{
 const seen=new Set();for(const legacy of [false,true])for(const route of q083Routes){const g=q083Engine({legacy});for(const id of route.path){assert.ok(g.dispatch({type:'choose',id}));drain(g);
  if(g.state.journey){const key=legacy+'/'+g.state.journey.action;if(!seen.has(key)){seen.add(key);const raw=g.save();
   for(const interruption of ['mark','defeat']){const h=loadQ083(raw);if(h.state.mode==='town')go(h,{kind:'dungeon',dungeon:'region_9',map:'region_9_f1',x:1,y:1});assert.ok(h.state.journey);
    const s=structuredClone(story(h)),j=structuredClone(h.state.journey);if(interruption==='mark')assert.ok(h.dispatch({type:'retreat'}));else h.defeat();drain(h);
    assert.equal(h.state.mode,'town');assert.deepEqual(story(h),s);assert.deepEqual(h.state.journey,j);const resumed=loadQ083(h.save());assert.equal(resumed.dispatch({type:'story.resume',quest:'q083'}),false);arriveQ083(resumed);
    assert.equal(values(resumed).finished,false);fixed(resumed);
   }
  }arriveQ083(g);}
 }}assert.equal(seen.size,10);
});

test('q083 original rewards are granted once for every route after old-save migration',()=>{
 for(const legacy of [false,true])for(const route of q083Routes){const g=loadQ083(q083Engine({legacy}).save()),gold=g.state.gold,reward=data.quests.q083.outcomes[route.outcome];let awards=0,total=0;const award=g.award.bind(g);
  g.award=(gp,xp,who)=>{total+=gp;if(gp===reward.gold&&xp===reward.xp)awards++;return award(gp,xp,who);};
  for(const id of route.path){assert.equal(awards,0);chooseQ083(g,id);}assert.equal(awards,1);assert.equal(g.state.gold,gold+total);assert.equal(g.state.quests.q083.outcome,route.outcome);
  const raw=g.save();assert.throws(()=>g.complete('q083',route.outcome));assert.equal(g.save(),raw);assert.equal(g.accept('q083'),false);g.run(data.quests.q083.model.entryScript);drain(g);assert.equal(awards,1);loadQ083(g.save());
 }
});

test('q083 accepted routes keep two scenes and all five paths without story actors, journeys or shadow-beast battles',()=>{
 const scenes=new Set();for(const route of q083Routes){const g=loadQ083(q083AcceptedEngine().save()),reward=data.quests.q083.outcomes[route.outcome];let awards=0;const award=g.award.bind(g);g.award=(gp,xp,who)=>{if(gp===reward.gold&&xp===reward.xp)awards++;return award(gp,xp,who);};
  for(const id of route.accepted){scenes.add(q083LegacyScene(g));loadQ083(g.save());assert.ok(g.dispatch({type:'choose',id}));loadQ083(g.save());drain(g);assert.equal(g.state.battle,null);assert.equal(g.state.stories.q083,undefined);assert.equal(g.state.journey,null);assert.equal(projectGame(g).dialog?.scene,undefined);}
  assert.equal(g.state.quests.q083.outcome,route.outcome);assert.equal(awards,1);loadQ083(g.save());
 }assert.deepEqual([...scenes].sort(),['entry','scaffold']);
});

test('q083 malformed current and old saves reject atomically before injecting actors',()=>{
 const g=q083Engine(),before=g.save(),old=q083Engine({legacy:true}).save();
 for(const raw of [before,old])for(const mutate of [s=>s.stories.q083.values.partyAt='maintainer',s=>s.stories.q083.values.removed=1,s=>delete s.stories.q083.values.stopped,s=>s.stories.q083.revision=3,s=>s.stories.q083.events.push('unwritten'),s=>(s.flags.legacyStoryRoutes??={}).q083=true]){
  const bad=JSON.parse(raw);mutate(bad.state);assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),before);
 }
 for(const field of ['calendarMakerAt','maintainerAt']){const bad=JSON.parse(before);bad.state.stories.q083.values[field]='calendar';assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),before);
  const oldBad=JSON.parse(old);oldBad.state.stories.q083.values[field]=field==='calendarMakerAt'?'entry':'scaffold';assert.throws(()=>g.load(JSON.stringify(oldBad)));assert.equal(g.save(),before);}
});

test('q083 display fixtures cover all scenes, both shade routes, rescues, old waiting sentences and accepted routes',async()=>{
 const {fixtures,outcomes}=await undergroundEclipseArtFixtures();assert.equal(fixtures.length,20);assert.equal(outcomes.length,4);assert.equal(new Set(fixtures.map(f=>f.scene+'/'+f.variant)).size,fixtures.length);
 for(const gen of ['current','previous']){const rows=fixtures.filter(f=>f.variant.startsWith(gen));assert.equal(new Set(rows.map(f=>f.scene)).size,6);assert.equal(rows.filter(f=>f.scene==='shade').length,2);for(const scene of ['scaffold','corrected'])assert.ok(rows.some(f=>f.scene===scene&&f.variant===gen+'-rescued'));}
 for(const scene of ['stopped','corrected','shade']){const f=fixtures.find(f=>f.scene===scene&&f.variant.startsWith('previous'));assert.ok(f);assert.equal(projectGame(loadQ083(f.save)).dialog.text,f.expectedText);assert.equal(f.expectedText,previousQ083.model.graph.find(n=>n.id===scene).text);assert.notEqual(f.expectedText,data.quests.q083.model.graph.find(n=>n.id===scene).text);}
 assert.equal(fixtures.filter(f=>f.absentStoryScene).length,2);
});
