import test from 'node:test';
import assert from 'node:assert/strict';
import {projectGame} from '../src/application/projection.js';
import {data,go,drain} from './royal-helpers.mjs';
import {previousQ082,q082Routes,q082Cast,q082LegacyScene,q082Engine,q082AcceptedEngine,loadQ082,chooseQ082,departQ082,arriveQ082,starBottleArtFixtures} from '../tools/star-bottle-art-fixtures.mjs';
const story=g=>g.state.stories.q082,values=g=>story(g).values;

test('q082 changes only two character links, three casts, fixed El migration and three pending handoff sentences',()=>{
 const q=structuredClone(data.quests.q082);assert.equal(q.story.revision,2);assert.equal(q.model.edition.revision,2);
 assert.deepEqual(q.model.storyUpgrades[0].previous,previousQ082.story);
 assert.deepEqual(q.model.storyUpgrades[0].values,[{key:'elPersonAt',value:'entry'}]);
 assert.deepEqual(q.story.entities.elPerson,{holder:'elPersonAt',kind:'person',character:'q082_el'});
 assert.deepEqual(q.story.registry.elPersonAt.values,['entry']);assert.equal(q.story.registry.elPersonAt.initial,'entry');
 assert.equal(q.story.entities.customer.character,'q082_customer');
 for(const id of ['q082_el','q082_customer'])for(const key of ['portrait','sprite'])assert.equal(data.characters[id][key],undefined);
 delete q.story.entities.elPerson;delete q.story.registry.elPersonAt;delete q.story.entities.customer.character;
 assert.deepEqual(q.story.registry,previousQ082.story.registry);assert.deepEqual(q.story.actions,previousQ082.story.actions);
 for(const a of Object.values(q.story.actions))if(a.journey)assert.deepEqual(a.journey.companions,[]);
 for(const [id,s] of Object.entries(q.story.scenes)){assert.deepEqual(s.cast.map(c=>c.entity),id==='label'?['elPerson']:['sold','sold_spent'].includes(id)?['customer']:[]);s.cast=[];}
 for(const id of ['sold','sold_spent','returned']){
  const n=q.model.graph.find(n=>n.id===id),now=n.text,old=previousQ082.model.graph.find(n=>n.id===id).text;assert.notEqual(now,old);n.text=old;let count=0;
  const restore=x=>{if(!x||typeof x!=='object')return;for(const k of Object.keys(x))if(x[k]===now){x[k]=old;count++;}else restore(x[k]);};restore(q.scripts);assert.equal(count,1);
 }
 delete q.model.storyUpgrades;q.story.revision=q.model.edition.revision=1;assert.deepEqual(q,previousQ082);
});

test('q082 seven routes exactly enumerate both acyclic decision graphs',()=>{
 function paths(graph){const result=[],nodes=new Map(graph.map(n=>[n.id,n]));const visit=(scene,route,seen)=>{assert.ok(!seen.has(scene));const next=new Set([...seen,scene]);for(const o of nodes.get(scene).options){const p=[...route,o.id];if(o.to.startsWith('@'))result.push({path:p,outcome:o.to.slice(1)});else visit(o.to,p,next);}};visit('entry',[],new Set());return result.map(JSON.stringify).sort();}
 assert.equal(q082Routes.length,7);
 assert.deepEqual(paths(data.quests.q082.model.graph),q082Routes.map(({path,outcome})=>JSON.stringify({path,outcome})).sort());
 assert.deepEqual(paths(data.previousQuestRoutes.q082.model.graph),q082Routes.map(({accepted:path,outcome})=>JSON.stringify({path,outcome})).sort());
});

test('q082 all eight scenes, seven journeys and fourteen actions resume across old and current save phases',()=>{
 const scenes=new Set(),journeys=new Set(),actions=new Set(),phases=new Set();
 const observe=g=>{
  const raw=g.save(),h=loadQ082(raw);assert.equal(g.save(),raw);const before=projectGame(g).dialog,after=projectGame(h).dialog;
  assert.equal(after?.text,before?.text);assert.deepEqual(after?.options,before?.options);assert.equal(values(h).elPersonAt,'entry');assert.equal(values(h).customerAt,'vendor');
  assert.equal(h.state.battle,null);if(story(h).scene)scenes.add(story(h).scene);
  phases.add(h.state.journey?'journey':h.state.quests.q082.stage==='completed'?'completed':h.state.waiting?.type);
  if(after?.scene)assert.deepEqual(after.scene.cast.map(c=>c.id),q082Cast(story(h).scene));
  if(h.state.journey){journeys.add(h.state.journey.action);assert.equal(story(h).scene,null);assert.equal(after?.scene,undefined);assert.equal(h.dispatch({type:'story.resume',quest:'q082'}),false);arriveQ082(h);}
 };
 for(const legacy of [false,true])for(const route of q082Routes){const g=q082Engine({legacy});observe(g);for(const id of route.path){actions.add(story(g).scene+'_'+id);assert.ok(g.dispatch({type:'choose',id}));observe(g);drain(g);observe(g);if(g.state.journey){const a=g.data.quests.q082.story.actions[g.state.journey.action];go(g,g.data.quests.q082.story.worldPlaces[a.journey.to]);observe(g);drain(g);observe(g);}}assert.equal(g.state.quests.q082.outcome,route.outcome);}
 assert.equal(scenes.size,8);assert.equal(journeys.size,7);assert.equal(actions.size,14);assert.deepEqual([...actions].sort(),Object.keys(data.quests.q082.story.actions).sort());
 for(const phase of ['text','choice','journey','completed'])assert.ok(phases.has(phase),phase);
});

test('q082 normal heat and strong heat keep distinct flags and preserve the bottle before departure',()=>{
 for(const legacy of [false,true])for(const path of [['hand','normal'],['hand','high'],['heat']]){
  const g=loadQ082(q082Engine({legacy}).save());assert.equal(values(g).bottleAt,'entry');
  for(const id of path)chooseQ082(g,id);
  assert.equal(values(g).normal,path.includes('normal'));assert.equal(values(g).spent,!path.includes('normal'));
  assert.equal(values(g).bottleAt,'entry');assert.equal(values(g).finished,false);assert.equal(g.state.battle,null);
  assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),path.includes('normal')?['q082_el']:[]);
 }
});

test('q082 all seven departures carry the bottle; arrival alone does not sell or return it',()=>{
 const seen=new Set();for(const legacy of [false,true])for(const route of q082Routes){const g=loadQ082(q082Engine({legacy}).save());
  for(const id of route.path){const a=g.data.quests.q082.story.actions[story(g).scene+'_'+id];if(!a.journey){chooseQ082(g,id);continue;}
   seen.add(a.from[0]+'_'+id);assert.equal(values(g).bottleAt,'entry');const spent=values(g).spent,normal=values(g).normal;
   departQ082(g,id);assert.equal(values(g).bottleAt,'party');assert.equal(values(g).elPersonAt,'entry');assert.equal(values(g).customerAt,'vendor');
   const h=loadQ082(g.save());arriveQ082(h);assert.equal(values(h).bottleAt,'party');assert.equal(values(h).finished,false);assert.equal(values(h).resolution,'pending');
   assert.equal(values(h).spent,spent);assert.equal(values(h).normal,normal);arriveQ082(g);
  }
 }assert.equal(seen.size,7);
});

test('q082 sales give the bottle to customer only on finish and never replenish spent light',()=>{
 for(const legacy of [false,true])for(const route of q082Routes.filter(r=>r.outcome!=='compromise')){
  const g=loadQ082(q082Engine({legacy}).save());for(const id of route.path.slice(0,-1))chooseQ082(g,id);
  assert.equal(values(g).bottleAt,'party');assert.equal(values(g).finished,false);assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['q082_customer']);
  chooseQ082(g,'finish');assert.equal(values(g).bottleAt,'customer');assert.equal(values(g).spent,route.spent);assert.equal(values(g).normal,route.normal);assert.equal(values(g).finished,true);loadQ082(g.save());
 }
});

test('q082 all four refunds preserve tested temperature and spent state while returning to vendor, not customer',()=>{
 for(const legacy of [false,true])for(const route of q082Routes.filter(r=>r.outcome==='compromise')){
  const g=loadQ082(q082Engine({legacy}).save());for(const id of route.path.slice(0,-1))chooseQ082(g,id);
  assert.equal(story(g).scene,'returned');assert.equal(values(g).bottleAt,'party');assert.deepEqual(projectGame(g).dialog.scene.cast,[]);
  chooseQ082(g,'finish');assert.equal(values(g).bottleAt,'vendor');assert.equal(values(g).spent,route.spent);assert.equal(values(g).normal,route.normal);assert.equal(values(g).finished,true);loadQ082(g.save());
 }
});

test('q082 every journey survives retreat and defeat without moving either person or handing off the bottle',()=>{
 const seen=new Set();for(const legacy of [false,true])for(const route of q082Routes){const g=q082Engine({legacy});for(const id of route.path){assert.ok(g.dispatch({type:'choose',id}));drain(g);
  if(g.state.journey){const key=legacy+'/'+g.state.journey.action;if(!seen.has(key)){seen.add(key);const raw=g.save();
   for(const interruption of ['mark','defeat']){const h=loadQ082(raw);if(h.state.mode==='town')go(h,{kind:'dungeon',dungeon:'region_9',map:'region_9_f1',x:1,y:1});assert.ok(h.state.journey);
    const s=structuredClone(story(h)),j=structuredClone(h.state.journey);if(interruption==='mark')assert.ok(h.dispatch({type:'retreat'}));else h.defeat();drain(h);
    assert.equal(h.state.mode,'town');assert.deepEqual(story(h),s);assert.deepEqual(h.state.journey,j);const resumed=loadQ082(h.save());assert.equal(resumed.dispatch({type:'story.resume',quest:'q082'}),false);arriveQ082(resumed);
    assert.equal(values(resumed).finished,false);assert.equal(values(resumed).bottleAt,'party');assert.equal(values(resumed).elPersonAt,'entry');assert.equal(values(resumed).customerAt,'vendor');
   }
  }arriveQ082(g);}
 }}assert.equal(seen.size,14);
});

test('q082 original rewards are granted once for every route after old-save migration',()=>{
 for(const legacy of [false,true])for(const route of q082Routes){const g=loadQ082(q082Engine({legacy}).save()),gold=g.state.gold,reward=data.quests.q082.outcomes[route.outcome];let awards=0,total=0;const award=g.award.bind(g);
  g.award=(gp,xp,who)=>{total+=gp;if(gp===reward.gold&&xp===reward.xp)awards++;return award(gp,xp,who);};
  for(const id of route.path){assert.equal(awards,0);chooseQ082(g,id);}assert.equal(awards,1);assert.equal(g.state.gold,gold+total);assert.equal(g.state.quests.q082.outcome,route.outcome);
  const raw=g.save();assert.throws(()=>g.complete('q082',route.outcome));assert.equal(g.save(),raw);assert.equal(g.accept('q082'),false);g.run(data.quests.q082.model.entryScript);drain(g);assert.equal(awards,1);loadQ082(g.save());
 }
});

test('q082 accepted old routes retain four scenes and all seven paths without added story actors or journeys',()=>{
 const scenes=new Set();for(const route of q082Routes){const g=loadQ082(q082AcceptedEngine().save()),reward=data.quests.q082.outcomes[route.outcome];let awards=0;const award=g.award.bind(g);g.award=(gp,xp,who)=>{if(gp===reward.gold&&xp===reward.xp)awards++;return award(gp,xp,who);};
  for(const id of route.accepted){scenes.add(q082LegacyScene(g));loadQ082(g.save());assert.ok(g.dispatch({type:'choose',id}));loadQ082(g.save());drain(g);assert.equal(g.state.battle,null);assert.equal(g.state.stories.q082,undefined);assert.equal(g.state.journey,null);assert.equal(projectGame(g).dialog?.scene,undefined);}
  assert.equal(g.state.quests.q082.outcome,route.outcome);assert.equal(awards,1);loadQ082(g.save());
 }assert.deepEqual([...scenes].sort(),['entry','label','spent','temperature']);
});

test('q082 malformed old and current saves reject atomically before adding El',()=>{
 const g=q082Engine(),before=g.save(),old=q082Engine({legacy:true}).save();
 for(const raw of [before,old])for(const mutate of [s=>s.stories.q082.values.bottleAt='elPerson',s=>s.stories.q082.values.spent=1,s=>delete s.stories.q082.values.normal,s=>s.stories.q082.revision=3,s=>s.stories.q082.events.push('unwritten'),s=>(s.flags.legacyStoryRoutes??={}).q082=true]){
  const bad=JSON.parse(raw);mutate(bad.state);assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),before);
 }
 const bad=JSON.parse(before);bad.state.stories.q082.values.elPersonAt='vendor';assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),before);
 const oldBad=JSON.parse(old);oldBad.state.stories.q082.values.elPersonAt='entry';assert.throws(()=>g.load(JSON.stringify(oldBad)));assert.equal(g.save(),before);
});

test('q082 browser fixtures distinguish all temperature/refund states, rescue and old waiting text',async()=>{
 const {fixtures,outcomes}=await starBottleArtFixtures();assert.equal(fixtures.length,26);assert.equal(outcomes.length,3);assert.equal(new Set(fixtures.map(f=>f.scene+'/'+f.variant)).size,fixtures.length);
 for(const gen of ['current','previous']){const rows=fixtures.filter(f=>f.variant.startsWith(gen));assert.equal(new Set(rows.map(f=>f.scene)).size,8);assert.equal(rows.filter(f=>f.scene==='returned').length,3);assert.ok(rows.some(f=>f.scene==='sold'&&f.variant===gen+'-rescued'));}
 for(const scene of ['sold','sold_spent','returned']){const f=fixtures.find(f=>f.scene===scene&&f.variant.startsWith('previous'));assert.ok(f);assert.equal(projectGame(loadQ082(f.save)).dialog.text,f.expectedText);assert.equal(f.expectedText,previousQ082.model.graph.find(n=>n.id===scene).text);assert.notEqual(f.expectedText,data.quests.q082.model.graph.find(n=>n.id===scene).text);}
 assert.equal(fixtures.filter(f=>f.absentStoryScene).length,4);
});
