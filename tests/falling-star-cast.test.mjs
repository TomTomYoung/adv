import test from 'node:test';
import assert from 'node:assert/strict';
import {projectGame} from '../src/application/projection.js';
import {data,go,drain} from './royal-helpers.mjs';
import {previousQ081,q081Routes,q081Cast,q081LegacyScene,q081Engine,q081AcceptedEngine,loadQ081,chooseQ081,departQ081,arriveQ081,fallingStarArtFixtures} from '../tools/falling-star-art-fixtures.mjs';
const story=g=>g.state.stories.q081,values=g=>story(g).values;

test('q081 adds one fixed group and migration, one cast and two pending-action sentences only',()=>{
 const q=structuredClone(data.quests.q081);assert.equal(q.story.revision,2);assert.equal(q.model.edition.revision,2);
 assert.deepEqual(q.model.storyUpgrades[0].previous,previousQ081.story);
 assert.deepEqual(q.model.storyUpgrades[0].values,[{key:'evacuatedGroupAt',value:'refuge'}]);
 assert.deepEqual(q.story.entities.evacuatedGroup,{holder:'evacuatedGroupAt',kind:'group',character:'q081_evacuated'});
 assert.deepEqual(q.story.registry.evacuatedGroupAt.values,['refuge']);assert.equal(q.story.registry.evacuatedGroupAt.initial,'refuge');
 for(const key of ['portrait','sprite'])assert.equal(data.characters.q081_evacuated[key],undefined);
 delete q.story.entities.evacuatedGroup;delete q.story.registry.evacuatedGroupAt;
 assert.deepEqual(q.story.registry,previousQ081.story.registry);assert.deepEqual(q.story.actions,previousQ081.story.actions);
 for(const a of Object.values(q.story.actions))if(a.journey)assert.deepEqual(a.journey.companions,[]);
 for(const [id,s] of Object.entries(q.story.scenes)){assert.deepEqual(s.cast.map(c=>c.entity),id==='correction'?['evacuatedGroup']:[]);s.cast=[];}
 for(const id of ['posted','observed']){
  const n=q.model.graph.find(n=>n.id===id),now=n.text,old=previousQ081.model.graph.find(n=>n.id===id).text;assert.notEqual(now,old);n.text=old;let count=0;
  const restore=x=>{if(!x||typeof x!=='object')return;for(const k of Object.keys(x))if(x[k]===now){x[k]=old;count++;}else restore(x[k]);};restore(q.scripts);assert.equal(count,1);
 }
 delete q.model.storyUpgrades;q.story.revision=q.model.edition.revision=1;assert.deepEqual(q,previousQ081);
});

test('q081 four routes exactly enumerate both acyclic decision graphs',()=>{
 function paths(graph){const result=[],nodes=new Map(graph.map(n=>[n.id,n]));const visit=(scene,route,seen)=>{assert.ok(!seen.has(scene));const next=new Set([...seen,scene]);for(const o of nodes.get(scene).options){const path=[...route,o.id];if(o.to.startsWith('@'))result.push({path,outcome:o.to.slice(1)});else visit(o.to,path,next);}};visit('entry',[],new Set());return result.map(JSON.stringify).sort();}
 assert.equal(q081Routes.length,4);
 assert.deepEqual(paths(data.quests.q081.model.graph),q081Routes.map(({path,outcome})=>JSON.stringify({path,outcome})).sort());
 assert.deepEqual(paths(data.previousQuestRoutes.q081.model.graph),q081Routes.map(({accepted:path,outcome})=>JSON.stringify({path,outcome})).sort());
});

test('q081 all five scenes, four journeys and eight actions resume across both save generations',()=>{
 const scenes=new Set(),journeys=new Set(),actions=new Set(),phases=new Set();
 const observe=g=>{
  const raw=g.save(),h=loadQ081(raw);assert.equal(g.save(),raw);const before=projectGame(g).dialog,after=projectGame(h).dialog;
  assert.equal(after?.text,before?.text);assert.deepEqual(after?.options,before?.options);assert.equal(values(h).evacuatedGroupAt,'refuge');
  assert.equal(h.state.battle,null);if(story(h).scene)scenes.add(story(h).scene);
  phases.add(h.state.journey?'journey':h.state.quests.q081.stage==='completed'?'completed':h.state.waiting?.type);
  if(after?.scene)assert.deepEqual(after.scene.cast.map(c=>c.id),q081Cast(story(h).scene));
  if(h.state.journey){journeys.add(h.state.journey.action);assert.equal(story(h).scene,null);assert.equal(after?.scene,undefined);assert.equal(h.dispatch({type:'story.resume',quest:'q081'}),false);arriveQ081(h);}
 };
 for(const legacy of [false,true])for(const route of q081Routes){const g=q081Engine({legacy});observe(g);for(const id of route.path){actions.add(story(g).scene+'_'+id);assert.ok(g.dispatch({type:'choose',id}));observe(g);drain(g);observe(g);if(g.state.journey){const a=g.data.quests.q081.story.actions[g.state.journey.action];go(g,g.data.quests.q081.story.worldPlaces[a.journey.to]);observe(g);drain(g);observe(g);}}assert.equal(g.state.quests.q081.outcome,route.outcome);}
 assert.equal(scenes.size,5);assert.equal(journeys.size,4);assert.equal(actions.size,8);assert.deepEqual([...actions].sort(),Object.keys(data.quests.q081.story.actions).sort());
 for(const phase of ['text','choice','journey','completed'])assert.ok(phases.has(phase),phase);
});

test('q081 ceiling projection proves the distinction without changing terrain or completing correction',()=>{
 for(const legacy of [false,true]){const g=loadQ081(q081Engine({legacy}).save()),terrain=structuredClone(g.state.dungeons.persistent.region_9.systems.terrain);
  chooseQ081(g,'project');assert.equal(story(g).scene,'show');assert.equal(values(g).partyAt,'entry');assert.equal(values(g).evacuatedGroupAt,'refuge');assert.deepEqual(projectGame(g).dialog.scene.cast,[]);
  for(const key of ['delayed','destroyed','corrected','observed','finished'])assert.equal(values(g)[key],false);
  assert.deepEqual(g.state.dungeons.persistent.region_9.systems.terrain,terrain);
 }
});

test('q081 explaining at the refuge shows its group but does not complete the public correction',()=>{
 for(const legacy of [false,true]){let g=q081Engine({legacy});chooseQ081(g,'project');departQ081(g,'correct');assert.equal(values(g).corrected,false);
  g=loadQ081(g.save());arriveQ081(g);assert.equal(story(g).scene,'correction');assert.equal(values(g).corrected,false);assert.equal(values(g).evacuatedGroupAt,'refuge');
  assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['q081_evacuated']);departQ081(g,'post');assert.equal(values(g).evacuatedGroupAt,'refuge');assert.equal(values(g).corrected,false);
  g=loadQ081(g.save());arriveQ081(g);assert.equal(story(g).scene,'posted');assert.deepEqual(projectGame(g).dialog.scene.cast,[]);assert.equal(values(g).finished,false);assert.equal(values(g).corrected,false);
  chooseQ081(g,'finish');assert.equal(values(g).corrected,true);assert.equal(values(g).observed,false);assert.equal(values(g).delayed,false);assert.equal(values(g).evacuatedGroupAt,'refuge');
 }
});

test('q081 both postponements start at departure and finish observation only at the confirmation',()=>{
 for(const legacy of [false,true])for(const project of [false,true]){let g=q081Engine({legacy});if(project)chooseQ081(g,'project');
  assert.equal(values(g).delayed,false);departQ081(g,project?'postpone':'delay');assert.equal(values(g).delayed,true);assert.equal(values(g).observed,false);
  g=loadQ081(g.save());arriveQ081(g);assert.equal(story(g).scene,'observed');assert.equal(values(g).observed,false);assert.equal(values(g).finished,false);assert.deepEqual(projectGame(g).dialog.scene.cast,[]);
  chooseQ081(g,'finish');assert.equal(values(g).observed,true);assert.equal(values(g).corrected,false);assert.equal(values(g).destroyed,false);assert.equal(values(g).evacuatedGroupAt,'refuge');
 }
});

test('q081 destroying the forecast remains the existing non-combat ending, not a weather correction',()=>{
 for(const legacy of [false,true]){const g=loadQ081(q081Engine({legacy}).save());chooseQ081(g,'destroy');assert.equal(g.state.battle,null);assert.equal(g.state.quests.q081.outcome,'contract');assert.equal(values(g).destroyed,true);
  for(const key of ['delayed','corrected','observed'])assert.equal(values(g)[key],false);assert.equal(values(g).evacuatedGroupAt,'refuge');loadQ081(g.save());
 }
});

test('q081 every journey survives retreat and defeat with group location and pending flags unchanged',()=>{
 const seen=new Set();for(const legacy of [false,true])for(const route of q081Routes){const g=q081Engine({legacy});for(const id of route.path){assert.ok(g.dispatch({type:'choose',id}));drain(g);
  if(g.state.journey){const key=legacy+'/'+g.state.journey.action;if(!seen.has(key)){seen.add(key);const raw=g.save();
   for(const interruption of ['mark','defeat']){const h=loadQ081(raw);if(h.state.mode==='town')go(h,{kind:'dungeon',dungeon:'region_9',map:'region_9_f1',x:1,y:1});assert.ok(h.state.journey);
    const s=structuredClone(story(h)),j=structuredClone(h.state.journey);if(interruption==='mark')assert.ok(h.dispatch({type:'retreat'}));else h.defeat();drain(h);
    assert.equal(h.state.mode,'town');assert.deepEqual(story(h),s);assert.deepEqual(h.state.journey,j);const resumed=loadQ081(h.save());assert.equal(resumed.dispatch({type:'story.resume',quest:'q081'}),false);arriveQ081(resumed);
    assert.equal(values(resumed).finished,false);assert.equal(values(resumed).evacuatedGroupAt,'refuge');
   }
  }arriveQ081(g);}
 }}assert.equal(seen.size,8);
});

test('q081 original rewards are granted once for every route after old-save migration',()=>{
 for(const legacy of [false,true])for(const route of q081Routes){const g=loadQ081(q081Engine({legacy}).save()),gold=g.state.gold,reward=data.quests.q081.outcomes[route.outcome];let awards=0,total=0;const award=g.award.bind(g);
  g.award=(gp,xp,who)=>{total+=gp;if(gp===reward.gold&&xp===reward.xp)awards++;return award(gp,xp,who);};
  for(const id of route.path){assert.equal(awards,0);chooseQ081(g,id);}assert.equal(awards,1);assert.equal(g.state.gold,gold+total);assert.equal(g.state.quests.q081.outcome,route.outcome);
  const raw=g.save();assert.throws(()=>g.complete('q081',route.outcome));assert.equal(g.save(),raw);assert.equal(g.accept('q081'),false);g.run(data.quests.q081.model.entryScript);drain(g);assert.equal(awards,1);loadQ081(g.save());
 }
});

test('q081 accepted old routes retain two scenes and four paths without story actors or journeys',()=>{
 const scenes=new Set();for(const route of q081Routes){const g=loadQ081(q081AcceptedEngine().save()),reward=data.quests.q081.outcomes[route.outcome];let awards=0;const award=g.award.bind(g);g.award=(gp,xp,who)=>{if(gp===reward.gold&&xp===reward.xp)awards++;return award(gp,xp,who);};
  for(const id of route.accepted){scenes.add(q081LegacyScene(g));loadQ081(g.save());assert.ok(g.dispatch({type:'choose',id}));loadQ081(g.save());drain(g);assert.equal(g.state.battle,null);assert.equal(g.state.stories.q081,undefined);assert.equal(g.state.journey,null);assert.equal(projectGame(g).dialog?.scene,undefined);}
  assert.equal(g.state.quests.q081.outcome,route.outcome);assert.equal(awards,1);loadQ081(g.save());
 }assert.deepEqual([...scenes].sort(),['entry','show']);
});

test('q081 malformed current and old saves reject atomically before adding the refuge group',()=>{
 const g=q081Engine(),before=g.save(),old=q081Engine({legacy:true}).save();
 for(const raw of [before,old])for(const mutate of [s=>s.stories.q081.values.partyAt='evacuatedGroup',s=>s.stories.q081.values.corrected=1,s=>delete s.stories.q081.values.observed,s=>s.stories.q081.revision=3,s=>s.stories.q081.events.push('unwritten'),s=>(s.flags.legacyStoryRoutes??={}).q081=true]){
  const bad=JSON.parse(raw);mutate(bad.state);assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),before);
 }
 const bad=JSON.parse(before);bad.state.stories.q081.values.evacuatedGroupAt='notice';assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),before);
 const oldBad=JSON.parse(old);oldBad.state.stories.q081.values.evacuatedGroupAt='refuge';assert.throws(()=>g.load(JSON.stringify(oldBad)));assert.equal(g.save(),before);
});

test('q081 browser fixtures cover group limits, both postponements, rescue, old waiting text and accepted routes',async()=>{
 const {fixtures,outcomes}=await fallingStarArtFixtures();assert.equal(fixtures.length,16);assert.equal(outcomes.length,3);assert.equal(new Set(fixtures.map(f=>f.scene+'/'+f.variant)).size,fixtures.length);
 for(const gen of ['current','previous']){const rows=fixtures.filter(f=>f.variant.startsWith(gen));assert.equal(new Set(rows.map(f=>f.scene)).size,5);assert.equal(rows.filter(f=>f.scene==='observed').length,2);assert.ok(rows.some(f=>f.scene==='correction'&&f.variant===gen+'-rescued'));}
 for(const scene of ['posted','observed']){const f=fixtures.find(f=>f.scene===scene&&f.variant.startsWith('previous'));assert.ok(f);assert.equal(projectGame(loadQ081(f.save())).dialog.text,f.expectedText);assert.equal(f.expectedText,previousQ081.model.graph.find(n=>n.id===scene).text);assert.notEqual(f.expectedText,data.quests.q081.model.graph.find(n=>n.id===scene).text);}
 assert.equal(fixtures.filter(f=>f.absentStoryScene).length,2);
});
