import test from 'node:test';
import assert from 'node:assert/strict';
import {projectGame} from '../src/application/projection.js';
import {data,go,drain} from './machine-helpers.mjs';
import {previousQ077,q077Routes,q077Cast,q077LegacyScene,q077Engine,q077AcceptedEngine,loadQ077,chooseQ077,departQ077,arriveQ077,stigmataWiringArtFixtures} from '../tools/stigmata-wiring-art-fixtures.mjs';
const story=g=>g.state.stories.q077,values=g=>story(g).values;

test('q077 adds two fixed roles and migration, two scene casts and two timing sentences only',()=>{
 const q=structuredClone(data.quests.q077);assert.equal(q.story.revision,2);assert.equal(q.model.edition.revision,2);
 assert.deepEqual(q.model.storyUpgrades[0].previous,previousQ077.story);
 assert.deepEqual(q.model.storyUpgrades[0].values,[{key:'pilgrimPersonAt',value:'entry'},{key:'maintainerPersonAt',value:'entry'}]);
 for(const [entity,character] of [['pilgrimPerson','q077_pilgrim'],['maintainerPerson','q077_maintainer']]){
  assert.deepEqual(q.story.entities[entity],{holder:entity+'At',kind:'person',character});
  assert.deepEqual(q.story.registry[entity+'At'].values,['entry']);assert.equal(q.story.registry[entity+'At'].initial,'entry');
  for(const key of ['portrait','sprite'])assert.equal(data.characters[character][key],undefined);
  delete q.story.entities[entity];delete q.story.registry[entity+'At'];
 }
 assert.deepEqual(q.story.registry,previousQ077.story.registry);assert.deepEqual(q.story.actions,previousQ077.story.actions);
 for(const a of Object.values(q.story.actions))if(a.journey)assert.deepEqual(a.journey.companions,[]);
 for(const [id,s] of Object.entries(q.story.scenes)){assert.deepEqual(s.cast.map(c=>c.entity),id==='entry'?['pilgrimPerson']:id==='outage'?['maintainerPerson']:[]);s.cast=[];}
 for(const id of ['repaired','detoured']){
  const n=q.model.graph.find(n=>n.id===id),now=n.text,old=previousQ077.model.graph.find(n=>n.id===id).text;assert.notEqual(now,old);n.text=old;let count=0;
  const restore=x=>{if(!x||typeof x!=='object')return;for(const k of Object.keys(x))if(x[k]===now){x[k]=old;count++;}else restore(x[k]);};restore(q.scripts);assert.equal(count,1);
 }
 delete q.model.storyUpgrades;q.story.revision=q.model.edition.revision=1;assert.deepEqual(q,previousQ077);
});

test('q077 fixtures enumerate all four paths of both acyclic decision graphs',()=>{
 function paths(graph){const result=[],nodes=new Map(graph.map(n=>[n.id,n]));const visit=(scene,route,seen)=>{assert.ok(!seen.has(scene));const next=new Set([...seen,scene]);for(const o of nodes.get(scene).options){const path=[...route,o.id];if(o.to.startsWith('@'))result.push({path,outcome:o.to.slice(1)});else visit(o.to,path,next);}};visit('entry',[],new Set());return result.map(JSON.stringify).sort();}
 assert.equal(q077Routes.length,4);
 assert.deepEqual(paths(data.quests.q077.model.graph),q077Routes.map(({path,outcome})=>JSON.stringify({path,outcome})).sort());
 assert.deepEqual(paths(data.previousQuestRoutes.q077.model.graph),q077Routes.map(({accepted:path,outcome})=>JSON.stringify({path,outcome})).sort());
});

test('q077 all five scenes, four journeys and eight actions resume across old and new save phases',()=>{
 const scenes=new Set(),journeys=new Set(),actions=new Set(),phases=new Set();
 const observe=g=>{
  const raw=g.save(),h=loadQ077(raw);assert.equal(g.save(),raw);const before=projectGame(g).dialog,after=projectGame(h).dialog;
  assert.equal(after?.text,before?.text);assert.deepEqual(after?.options,before?.options);
  for(const key of ['pilgrimPersonAt','maintainerPersonAt'])assert.equal(values(h)[key],'entry');
  assert.equal(h.state.battle,null);if(story(h).scene)scenes.add(story(h).scene);
  phases.add(h.state.journey?'journey':h.state.quests.q077.stage==='completed'?'completed':h.state.waiting?.type);
  if(after?.scene)assert.deepEqual(after.scene.cast.map(c=>c.id),q077Cast(story(h).scene));
  if(h.state.journey){journeys.add(h.state.journey.action);assert.equal(story(h).scene,null);assert.equal(after?.scene,undefined);assert.equal(h.dispatch({type:'story.resume',quest:'q077'}),false);arriveQ077(h);}
 };
 for(const legacy of [false,true])for(const route of q077Routes){const g=q077Engine({legacy});observe(g);for(const id of route.path){actions.add(story(g).scene+'_'+id);assert.ok(g.dispatch({type:'choose',id}));observe(g);drain(g);observe(g);if(g.state.journey){const a=g.data.quests.q077.story.actions[g.state.journey.action];go(g,g.data.quests.q077.story.worldPlaces[a.journey.to]);observe(g);drain(g);observe(g);}}assert.equal(g.state.quests.q077.outcome,route.outcome);}
 assert.equal(scenes.size,5);assert.equal(journeys.size,4);assert.equal(actions.size,8);assert.deepEqual([...actions].sort(),Object.keys(data.quests.q077.story.actions).sort());
 for(const phase of ['text','choice','journey','completed'])assert.ok(phases.has(phase),phase);
});

test('q077 power stops at the wall, lamps travel with the party and transfer only at actual clinic arrival',()=>{
 for(const legacy of [false,true]){
  let g=loadQ077(q077Engine({legacy}).save());assert.equal(values(g).outage,false);assert.equal(values(g).lampsAt,'entry');assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['q077_pilgrim']);
  chooseQ077(g,'cutpower');g=loadQ077(g.save());assert.equal(g.state.journey,null);assert.equal(values(g).outage,true);assert.equal(values(g).lampsDelivered,false);assert.equal(values(g).lampsAt,'entry');assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['q077_maintainer']);
  departQ077(g,'lamps');assert.equal(values(g).lampsAt,'party');assert.equal(values(g).lampsDelivered,false);assert.equal(values(g).outage,true);
  g=loadQ077(g.save());arriveQ077(g);assert.equal(values(g).lampsAt,'clinic');assert.equal(values(g).lampsDelivered,true);assert.equal(values(g).outage,true);assert.equal(values(g).repaired,false);assert.deepEqual(projectGame(g).dialog.scene.cast,[]);
 }
});

test('q077 returning to the wall leaves power off until repair and restoration are confirmed at finish',()=>{
 for(const legacy of [false,true]){
  let g=q077Engine({legacy});chooseQ077(g,'cutpower');chooseQ077(g,'lamps');departQ077(g,'return');
  assert.equal(values(g).outage,true);assert.equal(values(g).repaired,false);assert.equal(values(g).lampsAt,'clinic');
  g=loadQ077(g.save());arriveQ077(g);assert.equal(story(g).scene,'repaired');assert.equal(values(g).outage,true);assert.equal(values(g).repaired,false);assert.equal(values(g).finished,false);assert.deepEqual(projectGame(g).dialog.scene.cast,[]);
  chooseQ077(g,'finish');assert.equal(values(g).outage,false);assert.equal(values(g).repaired,true);assert.equal(values(g).lampsAt,'clinic');assert.equal(values(g).fenced,false);assert.equal(values(g).detourChecked,false);
 }
});

test('q077 both detours fence at departure, retain lamps at the wall and confirm the route only at finish',()=>{
 for(const legacy of [false,true])for(const restore of [false,true]){
  let g=q077Engine({legacy});if(restore)chooseQ077(g,'cutpower');assert.equal(values(g).outage,restore);
  departQ077(g,restore?'restore':'fence');assert.equal(values(g).fenced,true);assert.equal(values(g).outage,false);assert.equal(values(g).detourChecked,false);assert.equal(values(g).lampsAt,'entry');
  g=loadQ077(g.save());arriveQ077(g);assert.equal(story(g).scene,'detoured');assert.equal(values(g).detourChecked,false);assert.deepEqual(projectGame(g).dialog.scene.cast,[]);
  chooseQ077(g,'finish');assert.equal(values(g).detourChecked,true);assert.equal(values(g).repaired,false);assert.equal(values(g).lampsDelivered,false);assert.equal(values(g).lampsAt,'entry');
 }
});

test('q077 cosmetic scraping stays the existing non-combat ending and does not imply a safe repaired wall',()=>{
 for(const legacy of [false,true]){const g=loadQ077(q077Engine({legacy}).save());chooseQ077(g,'scrape');assert.equal(g.state.battle,null);assert.equal(g.state.quests.q077.outcome,'contract');assert.equal(values(g).cosmeticOnly,true);
  for(const key of ['outage','fenced','lampsDelivered','repaired','detourChecked'])assert.equal(values(g)[key],false);
  assert.equal(values(g).lampsAt,'entry');loadQ077(g.save());
 }
});

test('q077 all pending journeys survive retreat and defeat with custody, outage and actors unchanged',()=>{
 const seen=new Set();
 for(const legacy of [false,true])for(const route of q077Routes){
  const g=q077Engine({legacy});for(const id of route.path){assert.ok(g.dispatch({type:'choose',id}));drain(g);
   if(g.state.journey){const key=legacy+'/'+g.state.journey.action;if(!seen.has(key)){seen.add(key);const raw=g.save();
    for(const interruption of ['mark','defeat']){const h=loadQ077(raw);if(h.state.mode==='town')go(h,{kind:'dungeon',dungeon:'region_8',map:'region_8_f1',x:1,y:1});assert.ok(h.state.journey);
     const s=structuredClone(story(h)),j=structuredClone(h.state.journey);if(interruption==='mark')assert.ok(h.dispatch({type:'retreat'}));else h.defeat();drain(h);
     assert.equal(h.state.mode,'town');assert.deepEqual(story(h),s);assert.deepEqual(h.state.journey,j);const resumed=loadQ077(h.save());assert.equal(resumed.dispatch({type:'story.resume',quest:'q077'}),false);arriveQ077(resumed);
     assert.equal(values(resumed).finished,false);for(const k of ['pilgrimPersonAt','maintainerPersonAt'])assert.equal(values(resumed)[k],'entry');
    }
   }arriveQ077(g);}
  }
 }assert.equal(seen.size,8);
});

test('q077 every route awards the original ending exactly once after old-save migration',()=>{
 for(const legacy of [false,true])for(const route of q077Routes){
  const g=loadQ077(q077Engine({legacy}).save()),gold=g.state.gold,reward=data.quests.q077.outcomes[route.outcome];let awards=0,total=0;const award=g.award.bind(g);
  g.award=(gp,xp,who)=>{total+=gp;if(gp===reward.gold&&xp===reward.xp)awards++;return award(gp,xp,who);};
  for(const id of route.path){assert.equal(awards,0);chooseQ077(g,id);}assert.equal(awards,1);assert.equal(g.state.gold,gold+total);assert.equal(g.state.quests.q077.outcome,route.outcome);
  const raw=g.save();assert.throws(()=>g.complete('q077',route.outcome));assert.equal(g.save(),raw);assert.equal(g.accept('q077'),false);g.run(data.quests.q077.model.entryScript);drain(g);assert.equal(awards,1);loadQ077(g.save());
 }
});

test('q077 accepted old routes retain their two scenes and all four direct outcomes without new actors',()=>{
 const scenes=new Set();for(const route of q077Routes){
  const g=loadQ077(q077AcceptedEngine().save()),reward=data.quests.q077.outcomes[route.outcome];let awards=0;const award=g.award.bind(g);g.award=(gp,xp,who)=>{if(gp===reward.gold&&xp===reward.xp)awards++;return award(gp,xp,who);};
  for(const id of route.accepted){scenes.add(q077LegacyScene(g));loadQ077(g.save());assert.ok(g.dispatch({type:'choose',id}));loadQ077(g.save());drain(g);assert.equal(g.state.battle,null);assert.equal(g.state.stories.q077,undefined);assert.equal(g.state.journey,null);assert.equal(projectGame(g).dialog?.scene,undefined);}
  assert.equal(g.state.quests.q077.outcome,route.outcome);assert.equal(awards,1);loadQ077(g.save());
 }assert.deepEqual([...scenes].sort(),['entry','outage']);
});

test('q077 malformed old and current saves reject atomically before inserting the fixed actors',()=>{
 const g=q077Engine(),before=g.save(),old=q077Engine({legacy:true}).save();
 for(const raw of [before,old])for(const mutate of [s=>s.stories.q077.values.lampsAt='maintainerPerson',s=>s.stories.q077.values.outage=1,s=>delete s.stories.q077.values.repaired,s=>s.stories.q077.revision=3,s=>s.stories.q077.events.push('unwritten'),s=>(s.flags.legacyStoryRoutes??={}).q077=true]){
  const bad=JSON.parse(raw);mutate(bad.state);assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),before);
 }
 for(const key of ['pilgrimPersonAt','maintainerPersonAt']){
  const bad=JSON.parse(before);bad.state.stories.q077.values[key]='clinic';assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),before);
  const oldBad=JSON.parse(old);oldBad.state.stories.q077.values[key]='entry';assert.throws(()=>g.load(JSON.stringify(oldBad)));assert.equal(g.save(),before);
 }
});

test('q077 browser fixtures cover restricted actors, both detours, rescued deliveries, old waiting text and accepted saves',async()=>{
 const {fixtures,outcomes}=await stigmataWiringArtFixtures();assert.equal(fixtures.length,16);assert.equal(outcomes.length,3);assert.equal(new Set(fixtures.map(f=>f.scene+'/'+f.variant)).size,fixtures.length);
 for(const gen of ['current','previous']){
  const rows=fixtures.filter(f=>f.variant.startsWith(gen));assert.equal(new Set(rows.map(f=>f.scene)).size,5);
  for(const route of ['cut','live'])assert.ok(rows.some(f=>f.scene==='detoured'&&f.variant.endsWith(route)));
  assert.ok(rows.some(f=>f.scene==='delivered'&&f.variant===gen+'-rescued'));
 }
 for(const scene of ['repaired','detoured']){const f=fixtures.find(f=>f.scene===scene&&f.variant.startsWith('previous'));assert.ok(f);assert.equal(projectGame(loadQ077(f.save)).dialog.text,f.expectedText);assert.equal(f.expectedText,previousQ077.model.graph.find(n=>n.id===scene).text);assert.notEqual(f.expectedText,data.quests.q077.model.graph.find(n=>n.id===scene).text);}
 assert.equal(fixtures.filter(f=>f.absentStoryScene).length,2);
});
