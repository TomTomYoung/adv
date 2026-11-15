import test from 'node:test';
import assert from 'node:assert/strict';
import {projectGame} from '../src/application/projection.js';
import {data,go,drain} from './machine-helpers.mjs';
import {previousQ073,q073Routes,q073Cast,q073LegacyScene,q073Engine,q073AcceptedEngine,loadQ073,chooseQ073,departQ073,arriveQ073,spareArmArtFixtures} from '../tools/spare-arm-art-fixtures.mjs';
const story=g=>g.state.stories.q073,values=g=>story(g).values;

test('q073 adds only one fixed artisan, migration, four casts and four timing descriptions',()=>{
 const q=structuredClone(data.quests.q073);
 assert.equal(q.story.revision,2);assert.equal(q.model.edition.revision,2);
 assert.deepEqual(q.model.storyUpgrades[0].previous,previousQ073.story);
 assert.deepEqual(q.model.storyUpgrades[0].values,[{key:'artisanPersonAt',value:'smith'}]);
 assert.deepEqual(q.story.entities.artisanPerson,{holder:'artisanPersonAt',kind:'person',character:'q073_artisan'});
 assert.deepEqual(q.story.registry.artisanPersonAt.values,['smith']);assert.equal(q.story.registry.artisanPersonAt.initial,'smith');
 for(const field of ['portrait','sprite'])assert.equal(data.characters.q073_artisan[field],undefined);
 delete q.story.entities.artisanPerson;delete q.story.registry.artisanPersonAt;
 assert.deepEqual(q.story.registry,previousQ073.story.registry);assert.deepEqual(q.story.actions,previousQ073.story.actions);
 for(const a of Object.values(q.story.actions))if(a.journey)assert.deepEqual(a.journey.companions,[]);
 for(const [id,s] of Object.entries(q.story.scenes)){assert.deepEqual(s.cast.map(c=>c.entity),q073Cast(id).length?['artisanPerson']:[]);s.cast=[];}
 for(const scene of ['returned','tested','recovered','taken']){
  const n=q.model.graph.find(n=>n.id===scene),now=n.text,old=previousQ073.model.graph.find(n=>n.id===scene).text;assert.notEqual(now,old);n.text=old;let count=0;
  const restore=x=>{if(!x||typeof x!=='object')return;for(const k of Object.keys(x))if(x[k]===now){x[k]=old;count++;}else restore(x[k]);};restore(q.scripts);assert.equal(count,1);
 }
 delete q.model.storyUpgrades;q.story.revision=q.model.edition.revision=1;assert.deepEqual(q,previousQ073);
});

test('q073 all eight scenes, nine journeys and twelve actions preserve current and old save phases',()=>{
 const scenes=new Set(),journeys=new Set(),actions=new Set(),phases=new Set(),seen=new Set();
 const observe=g=>{
  const raw=g.save(),key=JSON.stringify({s:story(g),j:g.state.journey,w:g.state.waiting,vm:g.state.vm,stage:g.state.quests.q073.stage});
  if(seen.has(key))return;seen.add(key);
  const h=loadQ073(raw);assert.equal(g.save(),raw);
  const before=projectGame(g).dialog,after=projectGame(h).dialog;
  assert.equal(after?.text,before?.text);assert.deepEqual(after?.options,before?.options);
  assert.equal(values(h).artisanPersonAt,'smith');
  const s=story(h);if(s.scene)scenes.add(s.scene);
  phases.add(h.state.journey?'journey':h.state.quests.q073.stage==='completed'?'completed':h.state.waiting?.type);
  if(after?.scene)assert.deepEqual(after.scene.cast.map(c=>c.id),q073Cast(s.scene));
  if(h.state.journey){journeys.add(h.state.journey.action);assert.equal(s.scene,null);assert.equal(s.values.partyAt,'transit');assert.equal(after?.scene,undefined);assert.equal(h.dispatch({type:'story.resume',quest:'q073'}),false);arriveQ073(h);}
 };
 for(const legacy of [false,true])for(const route of q073Routes){
  const g=q073Engine({legacy});observe(g);
  for(const id of route.path){actions.add(story(g).scene+'_'+id);assert.ok(g.dispatch({type:'choose',id}));observe(g);drain(g);observe(g);
   if(g.state.journey){const a=g.data.quests.q073.story.actions[g.state.journey.action];go(g,g.data.quests.q073.story.worldPlaces[a.journey.to]);observe(g);drain(g);observe(g);}
  }assert.equal(g.state.quests.q073.outcome,route.outcome);
 }
 assert.equal(scenes.size,8);assert.equal(journeys.size,9);assert.equal(actions.size,12);
 assert.deepEqual([...actions].sort(),Object.keys(data.quests.q073.story.actions).sort());
 for(const phase of ['text','choice','journey','completed'])assert.ok(phases.has(phase),phase);
});

test('q073 preparing a brace does not install it before arrival and never transports the artisan',()=>{
 for(const legacy of [false,true]){
  let g=q073Engine({legacy});departQ073(g,'brace');assert.equal(values(g).supported,false);assert.equal(values(g).armAt,'entry');
  arriveQ073(g);g=loadQ073(g.save());assert.equal(values(g).supported,false);assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['q073_artisan']);
  departQ073(g,'carry');assert.equal(values(g).supported,false);assert.equal(values(g).artisanPersonAt,'smith');arriveQ073(g);
  assert.equal(values(g).supported,true);assert.equal(values(g).loadTested,false);assert.equal(values(g).armAt,'entry');assert.equal(values(g).otherArmsAt,'entry');assert.deepEqual(projectGame(g).dialog.scene.cast,[]);
 }
});

test('q073 borrowing moves only the original, collects the copy on departure and returns the original only at finish',()=>{
 for(const legacy of [false,true])for(const braced of [false,true]){
  let g=q073Engine({legacy});if(braced){chooseQ073(g,'brace');chooseQ073(g,'carry');}
  departQ073(g,braced?'one':'borrow');assert.equal(values(g).armAt,'party');assert.equal(values(g).otherArmsAt,'entry');assert.equal(values(g).copyArmAt,'smith');
  arriveQ073(g);g=loadQ073(g.save());assert.equal(values(g).artisanPersonAt,'smith');assert.equal(values(g).returned,false);
  departQ073(g,'return');assert.equal(values(g).copyArmAt,'party');assert.equal(values(g).armAt,'party');arriveQ073(g);
  assert.equal(values(g).returned,false);assert.equal(values(g).armAt,'party');assert.equal(values(g).finished,false);assert.deepEqual(projectGame(g).dialog.scene.cast,[]);
  chooseQ073(g,'finish');assert.equal(values(g).armAt,'entry');assert.equal(values(g).copyArmAt,'party');assert.equal(values(g).otherArmsAt,'entry');assert.equal(values(g).returned,true);assert.equal(values(g).supported,braced);assert.equal(values(g).evacuationBlocked,false);
 }
});

test('q073 recovery keeps arms carried until handoff and records the load test only when leaving tested',()=>{
 for(const legacy of [false,true])for(const borrowed of [false,true]){
  let g=q073Engine({legacy});for(const id of borrowed?['borrow','support']:['brace','carry'])chooseQ073(g,id);
  g=loadQ073(g.save());assert.equal(values(g).supported,true);assert.equal(values(g).loadTested,false);
  departQ073(g,'recover');assert.equal(values(g).armAt,'party');assert.equal(values(g).otherArmsAt,'party');arriveQ073(g);
  assert.equal(values(g).loadTested,false);assert.deepEqual(projectGame(g).dialog.scene.cast,[]);
  departQ073(g,'deliver');assert.equal(values(g).loadTested,true);arriveQ073(g);assert.equal(values(g).armAt,'party');assert.equal(values(g).otherArmsAt,'party');assert.equal(values(g).finished,false);
  chooseQ073(g,'finish');assert.equal(values(g).armAt,'smith');assert.equal(values(g).otherArmsAt,'smith');assert.equal(values(g).copyArmAt,'smith');assert.equal(values(g).evacuationBlocked,false);assert.equal(values(g).returned,false);
 }
});

test('q073 removing all arms marks the evacuation obstruction at departure but waits for finish to hand over',()=>{
 for(const legacy of [false,true]){
  let g=q073Engine({legacy});assert.equal(values(g).evacuationBlocked,false);departQ073(g,'take');assert.equal(values(g).evacuationBlocked,true);
  assert.equal(values(g).armAt,'party');assert.equal(values(g).otherArmsAt,'party');assert.equal(values(g).supported,false);arriveQ073(g);g=loadQ073(g.save());
  assert.equal(values(g).armAt,'party');assert.equal(values(g).otherArmsAt,'party');assert.equal(values(g).finished,false);chooseQ073(g,'finish');
  assert.equal(values(g).armAt,'smith');assert.equal(values(g).otherArmsAt,'smith');assert.equal(values(g).copyArmAt,'smith');assert.equal(values(g).loadTested,false);assert.equal(values(g).evacuationBlocked,true);
 }
});

test('q073 repeated support and copy consultations keep the same original without duplicate pickup',()=>{
 for(const legacy of [false,true]){
  let g=q073Engine({legacy});chooseQ073(g,'borrow');g=loadQ073(g.save());
  for(let i=0;i<2;i++){chooseQ073(g,'support');assert.equal(values(g).armAt,'party');assert.equal(values(g).copyArmAt,'smith');chooseQ073(g,'one');assert.equal(values(g).armAt,'party');assert.equal(values(g).otherArmsAt,'entry');assert.equal(values(g).artisanPersonAt,'smith');}
  for(const id of ['return','finish'])chooseQ073(g,id);assert.equal(values(g).armAt,'entry');assert.equal(values(g).copyArmAt,'party');
 }
});

test('q073 all pending journeys preserve arms, support state and fixed artisan through retreat and defeat',()=>{
 const seen=new Set();
 for(const legacy of [false,true])for(const route of q073Routes){
  const g=q073Engine({legacy});
  for(const id of route.path){assert.ok(g.dispatch({type:'choose',id}));drain(g);
   if(g.state.journey){const key=legacy+'/'+g.state.journey.action;
    if(!seen.has(key)){seen.add(key);const raw=g.save();
     for(const interruption of ['mark','defeat']){
      const h=loadQ073(raw);if(h.state.mode==='town')go(h,{kind:'dungeon',dungeon:'region_8',map:'region_8_f1',x:1,y:1});
      const s=structuredClone(story(h)),j=structuredClone(h.state.journey);assert.ok(j);
      if(interruption==='mark')assert.ok(h.dispatch({type:'retreat'}));else h.defeat();drain(h);
      assert.equal(h.state.mode,'town');assert.deepEqual(story(h),s);assert.deepEqual(h.state.journey,j);
      const resumed=loadQ073(h.save());assert.equal(resumed.dispatch({type:'story.resume',quest:'q073'}),false);arriveQ073(resumed);assert.equal(values(resumed).finished,false);
     }
    }arriveQ073(g);
   }
  }
 }assert.equal(seen.size,18);
});

test('q073 fourteen bounded routes award unchanged rewards exactly once and never on mere arrival',()=>{
 assert.equal(q073Routes.length,14);
 for(const legacy of [false,true])for(const route of q073Routes){
  const g=loadQ073(q073Engine({legacy}).save()),gold=g.state.gold,reward=data.quests.q073.outcomes[route.outcome];let awards=0;
  const award=g.award.bind(g);g.award=(gp,xp,who)=>{if(gp===reward.gold&&xp===reward.xp)awards++;return award(gp,xp,who);};
  for(const id of route.path){assert.equal(awards,0);chooseQ073(g,id);}
  assert.equal(awards,1);assert.equal(g.state.gold,gold+reward.gold);assert.equal(g.state.quests.q073.outcome,route.outcome);
  const raw=g.save();assert.throws(()=>g.complete('q073',route.outcome));assert.equal(g.save(),raw);assert.equal(g.accept('q073'),false);
  g.run(data.quests.q073.model.entryScript);drain(g);assert.equal(awards,1);loadQ073(g.save());
 }
});

test('q073 accepted older routes retain three scenes and fourteen paths without new cast or journeys',()=>{
 const scenes=new Set();
 for(const route of q073Routes){
  const g=loadQ073(q073AcceptedEngine().save()),gold=g.state.gold;
  for(const id of route.accepted){scenes.add(q073LegacyScene(g));loadQ073(g.save());assert.ok(g.dispatch({type:'choose',id}));loadQ073(g.save());drain(g);
   assert.equal(g.state.stories.q073,undefined);assert.equal(g.state.journey,null);assert.equal(projectGame(g).dialog?.scene,undefined);
  }assert.equal(g.state.quests.q073.outcome,route.outcome);assert.equal(g.state.gold,gold+data.quests.q073.outcomes[route.outcome].gold);loadQ073(g.save());
 }assert.deepEqual([...scenes].sort(),['copy','entry','support']);
});

test('q073 rejects malformed old and new saves atomically before adding the artisan',()=>{
 const g=q073Engine(),before=g.save(),old=q073Engine({legacy:true}).save();
 for(const raw of [before,old])for(const mutate of [
  s=>s.stories.q073.values.armAt='artisanPerson',s=>s.stories.q073.values.copyArmAt='artisanPerson',s=>s.stories.q073.values.otherArmsAt='artisanPerson',
  s=>s.stories.q073.values.supported=1,s=>delete s.stories.q073.values.loadTested,s=>s.stories.q073.revision=3,
  s=>s.stories.q073.events.push('unwritten'),s=>(s.flags.legacyStoryRoutes??={}).q073=true
 ]){const bad=JSON.parse(raw);mutate(bad.state);assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),before);}
 const bad=JSON.parse(before);bad.state.stories.q073.values.artisanPersonAt='entry';assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),before);
 const oldBad=JSON.parse(old);oldBad.state.stories.q073.values.artisanPersonAt='smith';assert.throws(()=>g.load(JSON.stringify(oldBad)));assert.equal(g.save(),before);
});

test('q073 fixtures retain old waiting prose and cover support state, custody and accepted routes',async()=>{
 const {fixtures,outcomes}=await spareArmArtFixtures();assert.equal(outcomes.length,3);
 assert.equal(new Set(fixtures.map(f=>f.scene+'/'+f.variant)).size,fixtures.length);
 for(const gen of ['current','previous']){
  const rows=fixtures.filter(f=>f.variant.startsWith(gen));assert.equal(new Set(rows.map(f=>f.scene)).size,8);
  for(const state of ['supported','bare'])assert.ok(rows.some(f=>f.scene==='returned'&&f.variant===gen+'-'+state+'-party'));
  for(const holder of ['entry','party'])assert.ok(rows.some(f=>f.scene==='support'&&f.variant===gen+'-supported-'+holder));
 }
 for(const scene of ['returned','tested','recovered','taken']){
  const f=fixtures.find(f=>f.scene===scene&&f.variant.startsWith('previous'));assert.ok(f);
  assert.equal(projectGame(loadQ073(f.save)).dialog.text,f.expectedText);
  assert.equal(f.expectedText,previousQ073.model.graph.find(n=>n.id===scene).text);
  assert.notEqual(f.expectedText,data.quests.q073.model.graph.find(n=>n.id===scene).text);
 }
 assert.equal(fixtures.filter(f=>f.absentStoryScene).length,3);assert.equal(fixtures.length,25);
});
