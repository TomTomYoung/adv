import test from 'node:test';
import assert from 'node:assert/strict';
import {projectGame} from '../src/application/projection.js';
import {data,go,drain,checkpoint} from './machine-helpers.mjs';
import {previousQ072,q072Routes,q072PreviousRoutes,q072AcceptedRoutes,q072Cast,q072LegacyScene,q072Engine,q072AcceptedEngine,loadQ072,chooseQ072,departQ072,arriveQ072,oilBaptismArtFixtures} from '../tools/oil-baptism-art-fixtures.mjs';
const story=g=>g.state.stories.q072,values=g=>story(g).values;

test('q072 adds only two fixed workshop roles, migration, heating pickup repair and three timing descriptions',()=>{
 const q=structuredClone(data.quests.q072);
 assert.equal(q.story.revision,2);assert.equal(q.model.edition.revision,2);
 assert.deepEqual(q.model.storyUpgrades[0].previous,previousQ072.story);
 for(const [id,char] of [['artisanPerson','q072_artisan'],['priestPerson','q072_priest']]){
  assert.deepEqual(q.story.entities[id],{holder:id+'At',kind:'person',character:char});
  assert.deepEqual(q.story.registry[id+'At'].values,['oilshop']);assert.equal(q.story.registry[id+'At'].initial,'oilshop');
  for(const k of ['portrait','sprite'])assert.equal(data.characters[char][k],undefined);
  delete q.story.entities[id];delete q.story.registry[id+'At'];
 }
 assert.deepEqual(q.story.registry,previousQ072.story.registry);
 assert.deepEqual(q.story.actions.entry_heat.depart,[{op:'transfer',entity:'oilSample',from:'entry',to:'party'}]);
 q.story.actions.entry_heat=structuredClone(previousQ072.story.actions.entry_heat);
 assert.deepEqual(q.story.actions,previousQ072.story.actions);
 for(const a of Object.values(q.story.actions))if(a.journey)assert.deepEqual(a.journey.companions,[]);
 for(const [id,s] of Object.entries(q.story.scenes)){assert.deepEqual(s.cast.map(c=>data.quests.q072.story.entities[c.entity].character),q072Cast(id));s.cast=[];}
 for(const scene of ['entry','changed','discarded']){
  const n=q.model.graph.find(n=>n.id===scene),now=n.text,old=previousQ072.model.graph.find(n=>n.id===scene).text;assert.notEqual(now,old);n.text=old;let count=0;
  const restore=x=>{if(!x||typeof x!=='object')return;for(const k of Object.keys(x))if(x[k]===now){x[k]=old;count++;}else restore(x[k]);};restore(q.scripts);assert.equal(count,1);
 }
 delete q.model.storyUpgrades;q.story.revision=q.model.edition.revision=1;assert.deepEqual(q,previousQ072);
});

test('q072 five scenes, six journeys and nine actions resume with fixed roles and the narrowly repaired sample pickup',()=>{
 const scenes=new Set(),journeys=new Set(),actions=new Set(),phases=new Set(),seen=new Set();
 const observe=g=>{
  const raw=g.save(),key=JSON.stringify({s:story(g),j:g.state.journey,w:g.state.waiting,vm:g.state.vm,revision:story(g).revision,stage:g.state.quests.q072.stage});
  if(seen.has(key))return;seen.add(key);
  const h=loadQ072(raw);assert.equal(g.save(),raw);
  const before=projectGame(g).dialog,after=projectGame(h).dialog;
  assert.equal(after?.text,before?.text);
  const repaired=story(g).revision===1&&values(g).oilSampleAt==='entry'&&story(g).scene==='warm';
  if(repaired&&before?.options){assert.deepEqual(after.options,before.options.map(o=>o.id==='change'?{...o,enabled:true}:o));assert.equal(before.options.find(o=>o.id==='change').enabled,false);}
  else assert.deepEqual(after?.options,before?.options);
  for(const person of ['artisanPersonAt','priestPersonAt'])assert.equal(values(h)[person],'oilshop');
  const s=story(h);if(s.scene)scenes.add(s.scene);
  phases.add(h.state.journey?'journey':h.state.quests.q072.stage==='completed'?'completed':h.state.waiting?.type);
  if(after?.scene)assert.deepEqual(after.scene.cast.map(c=>c.id),q072Cast(s.scene));
  if(h.state.journey){journeys.add(h.state.journey.action);assert.equal(s.scene,null);assert.equal(s.values.partyAt,'transit');assert.equal(after?.scene,undefined);assert.equal(h.dispatch({type:'story.resume',quest:'q072'}),false);arriveQ072(h);}
 };
 for(const legacy of [false,true])for(const route of q072Routes){
  const g=loadQ072(q072Engine({legacy}).save());observe(g);
  for(const id of route.path){actions.add(story(g).scene+'_'+id);assert.ok(g.dispatch({type:'choose',id}));observe(g);drain(g);observe(g);
   if(g.state.journey){const a=g.data.quests.q072.story.actions[g.state.journey.action];go(g,g.data.quests.q072.story.worldPlaces[a.journey.to]);observe(g);drain(g);observe(g);}
  }assert.equal(g.state.quests.q072.outcome,route.outcome);
 }
 for(const route of q072PreviousRoutes){const g=q072Engine({legacy:true});observe(g);for(const id of route.path){assert.ok(g.dispatch({type:'choose',id}));observe(g);drain(g);observe(g);if(g.state.journey){const a=g.data.quests.q072.story.actions[g.state.journey.action];go(g,g.data.quests.q072.story.worldPlaces[a.journey.to]);observe(g);drain(g);observe(g);}}}
 assert.equal(scenes.size,5);assert.equal(journeys.size,6);assert.equal(actions.size,9);
 assert.deepEqual([...actions].sort(),Object.keys(data.quests.q072.story.actions).sort());
 for(const phase of ['text','choice','journey','completed'])assert.ok(phases.has(phase),phase);
});

test('q072 heating takes effect only on arrival and does not exchange the oil or add a new ritual',()=>{
 for(const legacy of [false,true])for(const consulted of [false,true]){
  let g=q072Engine({legacy});if(consulted)chooseQ072(g,'oil');
  departQ072(g,'heat');assert.equal(values(g).heated,false);assert.equal(values(g).oilChanged,false);assert.equal(values(g).coldOilAt,'oilshop');
  arriveQ072(g);g=loadQ072(g.save());assert.equal(values(g).heated,true);assert.equal(values(g).oilSampleAt,'party');
  assert.deepEqual(projectGame(g).dialog.scene.cast,[]);assert.equal(values(g).ritualSeparated,false);
  const fuel=g.state.expedition.reserve;chooseQ072(g,'keep');assert.equal(g.state.expedition.reserve,fuel);assert.equal(values(g).oilChanged,false);assert.equal(values(g).discarded,false);
 }
});

test('q072 replacement oil is picked up on departure and delivered only at finish, never as carried fuel',()=>{
 for(const legacy of [false,true])for(const heated of [false,true]){
  let g=q072Engine({legacy});if(heated){chooseQ072(g,'heat');g=loadQ072(g.save());chooseQ072(g,'change');}else chooseQ072(g,'oil');
  assert.equal(values(g).oilSampleAt,'party');assert.equal(values(g).coldOilAt,'oilshop');
  departQ072(g,'separate');assert.equal(values(g).coldOilAt,'party');assert.equal(values(g).oilChanged,false);assert.equal(values(g).ritualSeparated,false);
  arriveQ072(g);g=loadQ072(g.save());assert.equal(values(g).coldOilAt,'party');assert.equal(values(g).oilChanged,false);assert.equal(values(g).finished,false);
  assert.deepEqual(projectGame(g).dialog.scene.cast,[]);const fuel=g.state.expedition.reserve;
  chooseQ072(g,'finish');assert.equal(values(g).coldOilAt,'cold');assert.equal(values(g).oilChanged,true);assert.equal(values(g).ritualSeparated,true);assert.equal(values(g).heated,heated);assert.equal(g.state.expedition.reserve,fuel);
 }
});

test('q072 disposal keeps the current oil with the party until sealing is confirmed',()=>{
 for(const legacy of [false,true]){
  let g=q072Engine({legacy});departQ072(g,'discard');assert.equal(values(g).oilSampleAt,'party');assert.equal(values(g).discarded,false);
  arriveQ072(g);g=loadQ072(g.save());assert.equal(values(g).oilSampleAt,'party');assert.equal(values(g).discarded,false);assert.equal(values(g).coldOilAt,'oilshop');
  const fuel=g.state.expedition.reserve;chooseQ072(g,'finish');assert.equal(values(g).oilSampleAt,'discard');assert.equal(values(g).discarded,true);assert.equal(values(g).oilChanged,false);assert.equal(values(g).heated,false);assert.equal(g.state.expedition.reserve,fuel);
 }
});

test('q072 repairs old heating-first saves and repeated workshop consultations retain the same sample and leave both people at the workshop',()=>{
 for(const legacy of [false,true]){
  let g=q072Engine({legacy});
  assert.equal(values(loadQ072(g.save())).oilSampleAt,'entry');
  chooseQ072(g,'heat');if(legacy){assert.equal(values(g).oilSampleAt,'entry');assert.equal(g.dispatch({type:'choose',id:'change'}),false);}
  g=loadQ072(g.save());assert.equal(values(g).oilSampleAt,'party');chooseQ072(g,'change');
  for(let i=0;i<2;i++){
   assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),q072Cast('oil'));
   chooseQ072(g,'heat');assert.equal(values(g).oilSampleAt,'party');assert.equal(values(g).coldOilAt,'oilshop');assert.deepEqual(projectGame(g).dialog.scene.cast,[]);
   departQ072(g,'change');assert.equal(values(g).oilSampleAt,'party');for(const p of ['artisanPersonAt','priestPersonAt'])assert.equal(values(g)[p],'oilshop');
   arriveQ072(g);g=loadQ072(g.save());assert.equal(values(g).oilChanged,false);assert.equal(values(g).finished,false);
  }
  chooseQ072(g,'separate');chooseQ072(g,'finish');assert.equal(g.state.quests.q072.outcome,'informed');
 }
});

test('q072 every pending journey survives retreat or defeat with state and oil custody intact',()=>{
 const seen=new Set();
 for(const legacy of [false,true])for(const route of legacy?q072PreviousRoutes:q072Routes){
  const g=q072Engine({legacy});
  for(const id of route.path){assert.ok(g.dispatch({type:'choose',id}));drain(g);
   if(g.state.journey){const key=legacy+'/'+g.state.journey.action;
    if(!seen.has(key)){seen.add(key);const raw=g.save();
     for(const interruption of ['mark','defeat']){
      const h=loadQ072(raw);if(h.state.mode==='town')go(h,{kind:'dungeon',dungeon:'region_8',map:'region_8_f1',x:1,y:1});
      const s=structuredClone(story(h)),j=structuredClone(h.state.journey);assert.ok(j);
      if(interruption==='mark')assert.ok(h.dispatch({type:'retreat'}));else h.defeat();drain(h);
      assert.equal(h.state.mode,'town');assert.deepEqual(story(h),s);assert.deepEqual(h.state.journey,j);
      const resumed=loadQ072(h.save());assert.equal(resumed.dispatch({type:'story.resume',quest:'q072'}),false);arriveQ072(resumed);assert.equal(values(resumed).finished,false);
     }
    }arriveQ072(g);
   }
  }
 }assert.equal(seen.size,12);
});

test('q072 all fourteen bounded routes award unchanged rewards once and never for mere arrival',()=>{
 assert.equal(q072Routes.length,14);
 for(const legacy of [false,true])for(const route of q072Routes){
  const g=loadQ072(q072Engine({legacy}).save()),gold=g.state.gold,reward=data.quests.q072.outcomes[route.outcome];let awards=0;
  const award=g.award.bind(g);g.award=(gp,xp,who)=>{if(gp===reward.gold&&xp===reward.xp)awards++;return award(gp,xp,who);};
  for(const id of route.path){assert.equal(awards,0);chooseQ072(g,id);}
  assert.equal(awards,1);assert.equal(g.state.gold,gold+reward.gold);assert.equal(g.state.quests.q072.outcome,route.outcome);
  const raw=g.save();assert.throws(()=>g.complete('q072',route.outcome));assert.equal(g.save(),raw);assert.equal(g.accept('q072'),false);
  g.run(data.quests.q072.model.entryScript);drain(g);assert.equal(awards,1);loadQ072(g.save());
 }
});

test('q072 accepted older routes retain three scenes, six direct paths, old text and no new cast or journeys',()=>{
 const scenes=new Set();
 for(const route of q072AcceptedRoutes){
  const g=loadQ072(q072AcceptedEngine().save()),gold=g.state.gold;
  for(const id of route.path){scenes.add(q072LegacyScene(g));loadQ072(g.save());assert.ok(g.dispatch({type:'choose',id}));loadQ072(g.save());drain(g);
   assert.equal(g.state.stories.q072,undefined);assert.equal(g.state.journey,null);assert.equal(projectGame(g).dialog?.scene,undefined);
  }assert.equal(g.state.quests.q072.outcome,route.outcome);assert.equal(g.state.gold,gold+data.quests.q072.outcomes[route.outcome].gold);loadQ072(g.save());
 }assert.deepEqual([...scenes].sort(),['entry','oil','warm']);
});

test('q072 rejects malformed current and previous saves atomically before adding people',()=>{
 const g=q072Engine(),before=g.save(),old=q072Engine({legacy:true}).save();
 for(const raw of [before,old])for(const mutate of [
  s=>s.stories.q072.values.oilSampleAt='artisanPerson',s=>s.stories.q072.values.coldOilAt='priestPerson',
  s=>s.stories.q072.values.heated=1,s=>delete s.stories.q072.values.oilChanged,
  s=>s.stories.q072.revision=3,s=>s.stories.q072.events.push('unwritten'),s=>(s.flags.legacyStoryRoutes??={}).q072=true
 ]){const bad=JSON.parse(raw);mutate(bad.state);assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),before);}
 for(const p of ['artisanPersonAt','priestPersonAt']){const bad=JSON.parse(before);bad.state.stories.q072.values[p]='cold';assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),before);}
 const oldBad=JSON.parse(old);oldBad.state.stories.q072.values.artisanPersonAt='oilshop';assert.throws(()=>g.load(JSON.stringify(oldBad)));assert.equal(g.save(),before);
});

test('q072 display fixtures cover all scenes, hot and cold approaches, sample custody and old accepted saves',async()=>{
 const {fixtures,outcomes}=await oilBaptismArtFixtures();assert.equal(outcomes.length,3);
 assert.equal(new Set(fixtures.map(f=>f.scene+'/'+f.variant)).size,fixtures.length);
 for(const gen of ['current','previous']){
  const rows=fixtures.filter(f=>f.variant.startsWith(gen));assert.equal(new Set(rows.map(f=>f.scene)).size,5);
  for(const heated of ['heated','cold'])assert.ok(rows.some(f=>f.scene==='changed'&&f.variant===gen+'-'+heated+'-party'));
  for(const holder of gen==='previous'?['entry','party']:['party'])assert.ok(rows.some(f=>f.scene==='warm'&&f.variant===gen+'-heated-'+holder));
 }
 assert.equal(fixtures.filter(f=>f.absentStoryScene).length,3);
 assert.equal(fixtures.length,18);
});
