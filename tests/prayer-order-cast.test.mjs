import test from 'node:test';
import assert from 'node:assert/strict';
import {projectGame} from '../src/application/projection.js';
import {data,go,drain} from './machine-helpers.mjs';
import {previousQ074,q074Routes,q074Cast,q074LegacyScene,q074Engine,q074AcceptedEngine,loadQ074,chooseQ074,departQ074,arriveQ074,resolveQ074,returnQ074AfterLoss,prayerOrderArtFixtures} from '../tools/prayer-order-art-fixtures.mjs';
const story=g=>g.state.stories.q074,values=g=>story(g).values;

test('q074 adds only a fixed Yua role, one scene cast, save migration and three timing descriptions',()=>{
 const q=structuredClone(data.quests.q074);
 assert.equal(q.story.revision,2);assert.equal(q.model.edition.revision,2);
 assert.deepEqual(q.model.storyUpgrades[0].previous,previousQ074.story);
 assert.deepEqual(q.model.storyUpgrades[0].values,[{key:'yuaPersonAt',value:'copy'}]);
 assert.deepEqual(q.story.entities.yuaPerson,{holder:'yuaPersonAt',kind:'person',character:'q074_yua'});
 assert.deepEqual(q.story.registry.yuaPersonAt.values,['copy']);assert.equal(q.story.registry.yuaPersonAt.initial,'copy');
 for(const field of ['portrait','sprite'])assert.equal(data.characters.q074_yua[field],undefined);
 delete q.story.entities.yuaPerson;delete q.story.registry.yuaPersonAt;
 assert.deepEqual(q.story.registry,previousQ074.story.registry);assert.deepEqual(q.story.actions,previousQ074.story.actions);
 for(const a of Object.values(q.story.actions))if(a.journey)assert.deepEqual(a.journey.companions,[]);
 for(const [id,s] of Object.entries(q.story.scenes)){assert.deepEqual(s.cast.map(c=>c.entity),id==='corrected'?['yuaPerson']:[]);s.cast=[];}
 for(const scene of ['opened','corrected','manual']){
  const n=q.model.graph.find(n=>n.id===scene),now=n.text,old=previousQ074.model.graph.find(n=>n.id===scene).text;assert.notEqual(now,old);n.text=old;let count=0;
  const restore=x=>{if(!x||typeof x!=='object')return;for(const k of Object.keys(x))if(x[k]===now){x[k]=old;count++;}else restore(x[k]);};restore(q.scripts);assert.equal(count,1);
 }
 delete q.model.storyUpgrades;q.story.revision=q.model.edition.revision=1;assert.deepEqual(q,previousQ074);
});

test('q074 route fixtures enumerate every path of the acyclic current and accepted decision graphs',()=>{
 function paths(graph){
  const result=[],nodes=new Map(graph.map(n=>[n.id,n]));
  const visit=(scene,route,seen)=>{assert.ok(!seen.has(scene),'unexpected cycle');const next=new Set([...seen,scene]);for(const o of nodes.get(scene).options){const path=[...route,o.id];if(o.to.startsWith('@'))result.push({path,outcome:o.to.slice(1)});else visit(o.to,path,next);}};
  visit('entry',[],new Set());return result.map(r=>JSON.stringify(r)).sort();
 }
 assert.equal(q074Routes.length,9);
 assert.deepEqual(paths(data.quests.q074.model.graph),q074Routes.map(({path,outcome})=>JSON.stringify({path,outcome})).sort());
 assert.deepEqual(paths(data.previousQuestRoutes.q074.model.graph),q074Routes.map(({accepted:path,outcome})=>JSON.stringify({path,outcome})).sort());
});

test('q074 all seven scenes, nine journeys, thirteen actions and pending battles preserve new and old save phases',()=>{
 const scenes=new Set(),journeys=new Set(),actions=new Set(),phases=new Set(),seen=new Set();
 const observe=g=>{
  const raw=g.save(),key=JSON.stringify({s:story(g),j:g.state.journey,w:g.state.waiting,vm:g.state.vm,b:g.state.battle,stage:g.state.quests.q074.stage});
  if(seen.has(key))return;seen.add(key);const h=loadQ074(raw);assert.equal(g.save(),raw);
  const before=projectGame(g).dialog,after=projectGame(h).dialog;assert.equal(after?.text,before?.text);assert.deepEqual(after?.options,before?.options);
  assert.equal(values(h).yuaPersonAt,'copy');if(story(h).scene)scenes.add(story(h).scene);
  phases.add(h.state.battle?'battle':h.state.journey?'journey':h.state.quests.q074.stage==='completed'?'completed':h.state.waiting?.type);
  if(after?.scene)assert.deepEqual(after.scene.cast.map(c=>c.id),q074Cast(story(h).scene));
  if(h.state.journey){journeys.add(h.state.journey.action);assert.equal(story(h).scene,null);assert.equal(after?.scene,undefined);assert.equal(h.dispatch({type:'story.resume',quest:'q074'}),false);arriveQ074(h);}
 };
 for(const legacy of [false,true])for(const route of q074Routes){
  const g=q074Engine({legacy});observe(g);
  for(const id of route.path){actions.add(story(g).scene+'_'+id);assert.ok(g.dispatch({type:'choose',id}));observe(g);drain(g);observe(g);
   if(g.state.battle){resolveQ074(g,'win');observe(g);}
   if(g.state.journey){const a=g.data.quests.q074.story.actions[g.state.journey.action];go(g,g.data.quests.q074.story.worldPlaces[a.journey.to]);observe(g);drain(g);observe(g);}
  }assert.equal(g.state.quests.q074.outcome,route.outcome);
 }
 assert.equal(scenes.size,7);assert.equal(journeys.size,9);assert.equal(actions.size,13);
 assert.deepEqual([...actions].sort(),Object.keys(data.quests.q074.story.actions).sort());
 for(const phase of ['text','choice','journey','battle','completed'])assert.ok(phases.has(phase),phase);
});

test('q074 cooling and furnace activate on real arrival; failed ignition stays stopped and can retry safely',()=>{
 for(const legacy of [false,true])for(const failed of [false,true]){
  let g=q074Engine({legacy});
  if(failed){departQ074(g,'heat');assert.equal(values(g).furnaceOn,false);arriveQ074(g);g=loadQ074(g.save());assert.equal(story(g).scene,'lock');assert.equal(values(g).furnaceOn,false);assert.equal(values(g).coolingOn,false);assert.equal(values(g).failedTrial,false);}
  departQ074(g,failed?'reset':'cool');assert.equal(values(g).coolingOn,false);arriveQ074(g);g=loadQ074(g.save());
  assert.equal(values(g).coolingOn,true);assert.equal(values(g).failedTrial,failed);assert.equal(values(g).furnaceOn,false);
  departQ074(g,'furnace');assert.equal(values(g).furnaceOn,false);arriveQ074(g);g=loadQ074(g.save());
  assert.equal(values(g).furnaceOn,true);assert.equal(values(g).coolingOn,true);assert.equal(values(g).doorOpened,false);assert.equal(values(g).corrected,false);
  assert.deepEqual(projectGame(g).dialog.scene.cast,[]);assert.equal(values(g).yuaPersonAt,'copy');
 }
});

test('q074 door confirmation happens on departure and Yua receives results before final written correction',()=>{
 for(const legacy of [false,true])for(const failed of [false,true]){
  let g=q074Engine({legacy});for(const id of failed?['heat','reset','furnace']:['cool','furnace'])chooseQ074(g,id);
  departQ074(g,'correct');assert.equal(values(g).doorOpened,false);arriveQ074(g);g=loadQ074(g.save());
  assert.equal(story(g).scene,'opened');assert.equal(values(g).doorOpened,false);assert.equal(values(g).corrected,false);assert.deepEqual(projectGame(g).dialog.scene.cast,[]);
  departQ074(g,'correct');assert.equal(values(g).doorOpened,true);assert.equal(values(g).corrected,false);assert.equal(values(g).yuaPersonAt,'copy');arriveQ074(g);g=loadQ074(g.save());
  assert.equal(story(g).scene,'corrected');assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['q074_yua']);assert.equal(values(g).corrected,false);assert.equal(values(g).finished,false);
  chooseQ074(g,'finish');assert.equal(values(g).corrected,true);assert.equal(values(g).manualOpened,false);assert.equal(g.state.quests.q074.outcome,'informed');
 }
});

test('q074 every manual approach keeps its original furnace state until final shutdown and never corrects the book',()=>{
 for(const legacy of [false,true])for(const route of q074Routes.filter(r=>r.outcome==='compromise')){
  let g=q074Engine({legacy});for(const id of route.path.slice(0,-1))chooseQ074(g,id);g=loadQ074(g.save());
  assert.equal(story(g).scene,'manual');assert.equal(values(g).furnaceOn,route.path.includes('furnace'));assert.equal(values(g).manualOpened,false);assert.equal(values(g).doorOpened,false);assert.equal(values(g).corrected,false);assert.deepEqual(projectGame(g).dialog.scene.cast,[]);
  chooseQ074(g,'finish');assert.equal(values(g).furnaceOn,false);assert.equal(values(g).manualOpened,true);assert.equal(values(g).doorOpened,false);assert.equal(values(g).corrected,false);assert.equal(values(g).yuaPersonAt,'copy');
 }
});

test('q074 forcing the lock cannot escape or resolve before a win; defeat can retry or switch to proper order',()=>{
 for(const legacy of [false,true])for(const retry of [false,true]){
  const old=q074Engine({legacy});chooseQ074(old,'force',{combat:'pending'});const g=loadQ074(old.save());
  assert.equal(g.state.battle.encounter,'boss_8');assert.equal(g.data.encounters.boss_8.escape,false);
  const state=structuredClone(story(g));assert.equal(g.dispatch({type:'battle',action:'escape'}),false);assert.deepEqual(story(g),state);assert.equal(values(g).finished,false);loadQ074(g.save());
  resolveQ074(g,'lose');assert.equal(g.state.mode,'town');assert.equal(g.state.quests.q074.stage,'active');assert.equal(values(g).finished,false);assert.equal(values(g).resolution,'pending');assert.equal(values(g).yuaPersonAt,'copy');loadQ074(g.save());returnQ074AfterLoss(g);
  for(const id of retry?['force']:q074Routes[0].path)chooseQ074(g,id);
  assert.equal(g.state.quests.q074.outcome,retry?'contract':'informed');assert.equal(values(g).corrected,!retry);
 }
});

test('q074 every pending journey survives retreat and defeat without advancing equipment state or moving Yua',()=>{
 const seen=new Set();
 for(const legacy of [false,true])for(const route of q074Routes.filter(r=>r.outcome!=='contract')){
  const g=q074Engine({legacy});
  for(const id of route.path){assert.ok(g.dispatch({type:'choose',id}));drain(g);
   if(g.state.journey){const key=legacy+'/'+g.state.journey.action;
    if(!seen.has(key)){seen.add(key);const raw=g.save();
     for(const interruption of ['mark','defeat']){
      const h=loadQ074(raw);if(h.state.mode==='town')go(h,{kind:'dungeon',dungeon:'region_8',map:'region_8_f1',x:1,y:1});assert.ok(h.state.journey);
      const s=structuredClone(story(h)),j=structuredClone(h.state.journey);
      if(interruption==='mark')assert.ok(h.dispatch({type:'retreat'}));else h.defeat();drain(h);
      assert.equal(h.state.mode,'town');assert.deepEqual(story(h),s);assert.deepEqual(h.state.journey,j);
      const resumed=loadQ074(h.save());assert.equal(resumed.dispatch({type:'story.resume',quest:'q074'}),false);arriveQ074(resumed);assert.equal(values(resumed).finished,false);assert.equal(values(resumed).yuaPersonAt,'copy');
     }
    }arriveQ074(g);
   }
  }
 }assert.equal(seen.size,18);
});

test('q074 all nine completed routes award unchanged rewards once, separate from battle reward',()=>{
 for(const legacy of [false,true])for(const route of q074Routes){
  const g=loadQ074(q074Engine({legacy}).save()),gold=g.state.gold,reward=data.quests.q074.outcomes[route.outcome];let awards=0,total=0;
  const award=g.award.bind(g);g.award=(gp,xp,who)=>{total+=gp;if(gp===reward.gold&&xp===reward.xp)awards++;return award(gp,xp,who);};
  for(const id of route.path){assert.equal(awards,0);chooseQ074(g,id);}
  assert.equal(awards,1);assert.equal(g.state.gold,gold+total);assert.equal(g.state.quests.q074.outcome,route.outcome);
  const raw=g.save();assert.throws(()=>g.complete('q074',route.outcome));assert.equal(g.save(),raw);assert.equal(g.accept('q074'),false);
  g.run(data.quests.q074.model.entryScript);drain(g);assert.equal(awards,1);loadQ074(g.save());
 }
});

test('q074 accepted old routes retain four scenes and nine paths, with no new cast or journeys',()=>{
 const scenes=new Set();
 for(const route of q074Routes){
  const g=loadQ074(q074AcceptedEngine().save()),reward=data.quests.q074.outcomes[route.outcome];let awards=0;
  const award=g.award.bind(g);g.award=(gp,xp,who)=>{if(gp===reward.gold&&xp===reward.xp)awards++;return award(gp,xp,who);};
  for(const id of route.accepted){scenes.add(q074LegacyScene(g));loadQ074(g.save());assert.ok(g.dispatch({type:'choose',id}));loadQ074(g.save());drain(g);
   if(g.state.battle){loadQ074(g.save());resolveQ074(g,'win');}
   assert.equal(g.state.stories.q074,undefined);assert.equal(g.state.journey,null);assert.equal(projectGame(g).dialog?.scene,undefined);
  }assert.equal(g.state.quests.q074.outcome,route.outcome);assert.equal(awards,1);loadQ074(g.save());
 }assert.deepEqual([...scenes].sort(),['door','entry','furnace','lock']);
});

test('q074 malformed old and new saves are rejected atomically before adding Yua',()=>{
 const g=q074Engine(),before=g.save(),old=q074Engine({legacy:true}).save();
 for(const raw of [before,old])for(const mutate of [
  s=>s.stories.q074.values.partyAt='yuaPerson',s=>s.stories.q074.values.furnaceOn=1,s=>s.stories.q074.values.coolingOn='true',
  s=>delete s.stories.q074.values.corrected,s=>s.stories.q074.revision=3,s=>s.stories.q074.events.push('unwritten'),s=>(s.flags.legacyStoryRoutes??={}).q074=true
 ]){const bad=JSON.parse(raw);mutate(bad.state);assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),before);}
 const bad=JSON.parse(before);bad.state.stories.q074.values.yuaPersonAt='entry';assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),before);
 const oldBad=JSON.parse(old);oldBad.state.stories.q074.values.yuaPersonAt='copy';assert.throws(()=>g.load(JSON.stringify(oldBad)));assert.equal(g.save(),before);
});

test('q074 browser fixtures preserve old waiting prose and cover direct/retried sequences, manual states and defeat',async()=>{
 const {fixtures,outcomes}=await prayerOrderArtFixtures();assert.equal(fixtures.length,36);assert.equal(outcomes.length,3);
 assert.equal(new Set(fixtures.map(f=>f.scene+'/'+f.variant)).size,fixtures.length);
 for(const gen of ['current','previous']){
  const rows=fixtures.filter(f=>f.variant.startsWith(gen));assert.equal(new Set(rows.map(f=>f.scene)).size,7);
  for(const approach of ['direct','retried'])assert.ok(rows.some(f=>f.scene==='corrected'&&f.variant===gen+'-cooled-firing-'+approach));
  for(const furnace of ['firing','stopped'])assert.ok(rows.some(f=>f.scene==='manual'&&f.variant.includes(furnace)));
  assert.ok(rows.some(f=>f.scene==='entry'&&f.variant===gen+'-lose'));
 }
 for(const scene of ['opened','corrected','manual']){
  const f=fixtures.find(f=>f.scene===scene&&f.variant.startsWith('previous'));assert.ok(f);assert.equal(projectGame(loadQ074(f.save)).dialog.text,f.expectedText);
  assert.equal(f.expectedText,previousQ074.model.graph.find(n=>n.id===scene).text);assert.notEqual(f.expectedText,data.quests.q074.model.graph.find(n=>n.id===scene).text);
 }
 assert.equal(fixtures.filter(f=>f.absentStoryScene).length,4);
});
