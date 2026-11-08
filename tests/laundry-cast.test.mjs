import test from 'node:test';
import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {data,start,choose,go,drain,checkpoint} from './royal-helpers.mjs';
import {previousQ183,previousQ183Data,q183Routes,q183AcceptedRoutes,q183Fixed,q183Cast,q183Engine,q183AcceptedEngine,loadQ183,laundryArtFixtures} from '../tools/laundry-art-fixtures.mjs';

test('q183 only adds two fixed groups and cast, preserving all prose, actions, domains, payments and endings',()=>{
 const q=structuredClone(data.quests.q183);
 assert.deepEqual(q.model.storyUpgrades[0],{fromRevision:1,toRevision:2,previous:previousQ183.story,values:Object.entries(q183Fixed).map(([key,value])=>({key,value}))});
 for(const [key,value] of Object.entries(q183Fixed)){assert.deepEqual(q.story.registry[key].values,[value]);assert.equal(q.story.entities[key.slice(0,-2)].kind,'group');delete q.story.registry[key];delete q.story.entities[key.slice(0,-2)];}
 for(const s of Object.values(q.story.scenes))s.cast=[];
 delete q.model.storyUpgrades;q.story.revision=q.model.edition.revision=1;assert.deepEqual(q,previousQ183);
 for(const id of ['q183_soldiers','q183_bereaved']){assert.equal(data.characters[id].portrait,undefined);assert.equal(data.characters[id].sprite,undefined);}
});

test('q183 current and revision-one saves preserve eight scenes, eight journeys, waiting phases and completed results',()=>{
 const scenes=new Set(),journeys=new Set(),phases=new Set();
 const observe=g=>{
  const raw=g.save(),now=loadQ183(raw),before=projectGame(g).dialog,after=projectGame(now).dialog;assert.equal(g.save(),raw);assert.equal(after?.text,before?.text);assert.deepEqual(after?.options,before?.options);
  phases.add(g.state.journey?'journey':g.state.quests.q183.stage==='completed'?'completed':g.state.waiting?.type);
  if(g.state.stories.q183.scene)scenes.add(g.state.stories.q183.scene);
  if(after?.scene)assert.deepEqual(after.scene.cast.map(c=>c.id),q183Cast(now.state.stories.q183.scene));
  for(const [key,value] of Object.entries(q183Fixed))assert.equal(now.state.stories.q183.values[key],value);
  if(now.state.journey){const j=now.state.journey,a=data.quests.q183.story.actions[j.action];journeys.add(j.action);assert.equal(now.state.stories.q183.scene,null);assert.equal(after?.scene,undefined);assert.equal(now.dispatch({type:'story.resume',quest:'q183'}),false);now.random=()=>.999999;go(now,data.quests.q183.story.worldPlaces[a.journey.to]);drain(now);checkpoint(now);assert.equal(now.state.journey,null);assert.deepEqual(projectGame(now).dialog.scene.cast.map(c=>c.id),q183Cast(now.state.stories.q183.scene));}
 };
 for(const legacy of [false,true])for(const route of q183Routes){const g=q183Engine({legacy});observe(g);for(const id of route.path){assert.ok(g.dispatch({type:'choose',id}));observe(g);drain(g);observe(g);if(g.state.journey){const a=g.data.quests.q183.story.actions[g.state.journey.action];go(g,g.data.quests.q183.story.worldPlaces[a.journey.to]);observe(g);drain(g);observe(g);}}assert.equal(g.state.quests.q183.outcome,route.outcome);}
 assert.equal(scenes.size,8);assert.equal(journeys.size,8);for(const p of ['text','choice','journey','completed'])assert.ok(phases.has(p),p);
});

test('q183 six paths preserve aid before correction, exact handovers, ration cost and a single reward',()=>{
 for(const legacy of [false,true])for(const route of q183Routes){
  const g=loadQ183(q183Engine({legacy}).save());g.random=()=>.999999;const members=[...g.state.members],inventory=structuredClone(g.state.inventory),gold=g.state.gold;let rewards=0;
  const award=g.award.bind(g);g.award=(gold,xp,recipients)=>{assert.deepEqual([gold,xp],[153,99]);rewards++;return award(gold,xp,recipients);};const v=()=>g.state.stories.q183.values;
  for(const id of route.path){const scene=g.state.stories.q183.scene;
   for(const [key,value] of Object.entries(q183Fixed))assert.equal(v()[key],value);
   if(scene==='entry'){assert.equal(v().uniformsAt,'entry');assert.equal(v().certificateAt,'relief');}
   if(scene==='support'||scene==='official'){assert.equal(v().uniformsAt,'party');assert.equal(v().certificateAt,'relief');assert.equal(v().aidSecured,false);}
   if(['supported_ready','confirmed','supported'].includes(scene)){assert.equal(v().aidSecured,true);assert.equal(v().corrected,false);assert.equal(v().uniformsAt,'families');}
   if(scene==='report_now'){assert.equal(v().corrected,false);assert.equal(v().aidSecured,false);}
   if(scene==='reported'){assert.equal(v().corrected,true);assert.equal(v().uniformsAt,'families');}
   assert.ok(g.dispatch({type:'choose',id}));drain(g);
   if(g.state.journey){const action=g.state.journey.action,a=data.quests.q183.story.actions[action];
    for(const [key,value] of Object.entries(q183Fixed))assert.equal(v()[key],value);
    if(['entry_families','entry_report','support_official','support_report','official_deliver','report_now_deliver'].includes(action))assert.equal(v().uniformsAt,'party');
    if(action==='official_deliver'){assert.equal(v().certificateAt,'party');assert.equal(v().aidSecured,false);}
    if(action==='report_now_deliver')assert.equal(v().corrected,true);
    go(g,data.quests.q183.story.worldPlaces[a.journey.to]);drain(g);
    if(action==='official_deliver'){assert.equal(v().certificateAt,'families');assert.equal(v().uniformsAt,'families');assert.equal(v().aidSecured,true);}
   }checkpoint(g);
  }
  const goods=route.path.includes('goods'),official=route.path.includes('official'),hidden=route.outcome==='hidden';
  assert.equal(v().rationsGiven,goods?2:0);assert.equal(v().aidSecured,route.outcome==='supported');assert.equal(v().corrected,!hidden);
  assert.equal(v().uniformsAt,route.path.length===1?'entry':'families');assert.equal(v().certificateAt,official?'families':'relief');
  assert.equal(g.state.quests.q183.outcome,route.outcome);assert.equal(g.state.gold,gold+153);assert.equal(rewards,1);assert.deepEqual(g.state.members,members);
  if(goods)inventory.ration-=2;assert.deepEqual(g.state.inventory,inventory);
  const raw=g.save();assert.throws(()=>g.complete('q183',route.outcome));assert.equal(g.save(),raw);g.run(data.quests.q183.model.entryScript);drain(g);assert.equal(rewards,1);assert.deepEqual(g.state.inventory,inventory);
 }
});

test('q183 zero or one ration blocks goods atomically while free official aid, reporting and concealment remain usable',()=>{
 for(const legacy of [false,true])for(const amount of [0,1])for(const next of ['official','report','hidden']){
  const g=loadQ183(q183Engine({legacy}).save());g.random=()=>.999999;choose(g,'q183','families');g.state.inventory.ration=amount;const raw=g.save();
  assert.equal(g.dispatch({type:'choose',id:'goods'}),false);assert.equal(g.save(),raw);assert.equal(g.state.stories.q183.values.aidSecured,false);
  for(const id of next==='official'?['official','deliver','correct','finish']:next==='report'?['report','deliver','finish']:['hidden'])choose(g,'q183',id);
  assert.equal(g.state.inventory.ration,amount);assert.equal(g.state.quests.q183.outcome,next==='official'?'supported':next);
 }
});

test('q183 browser fixtures cover eighteen new/old checkpoints and the no-rations alternative',async()=>{
 const r=await laundryArtFixtures();assert.equal(r.fixtures.length,19);assert.equal(r.outcomes.length,3);assert.equal(new Set(r.fixtures.map(f=>f.scene+'/'+f.variant)).size,19);
 for(const f of r.fixtures){const dialog=projectGame(loadQ183(f.save)).dialog;assert.equal(dialog.text,f.expectedText);if(f.absentStoryScene)assert.equal(dialog.scene,undefined);else assert.deepEqual(dialog.scene.cast.map(c=>c.id),f.cast);}
 assert.deepEqual(Object.keys(data.quests.q183.story.scenes).filter(s=>q183Cast(s).length===0),['official','supported','report_now']);
 assert.equal(r.fixtures.find(f=>f.variant==='no-rations').blockedChoice,'goods');
});

test('q183 invalid holders, moved groups, missing locations and mixed route flags are rejected atomically',()=>{
 const g=q183Engine(),raw=g.save(),old=q183Engine({legacy:true}).save();
 for(const input of [raw,old])for(const mutate of [s=>s.stories.q183.values.uniformsAt='soldiers',s=>s.stories.q183.values.certificateAt='bereaved',s=>s.stories.q183.values.rationsGiven=3,s=>s.stories.q183.revision=3,s=>(s.flags.legacyStoryRoutes??={}).q183=true]){const saved=JSON.parse(input);mutate(saved.state);assert.throws(()=>g.load(JSON.stringify(saved)));assert.equal(g.save(),raw);}
 for(const key of Object.keys(q183Fixed))for(const value of ['transit',undefined]){const saved=JSON.parse(raw);if(value===undefined)delete saved.state.stories.q183.values[key];else saved.state.stories.q183.values[key]=value;assert.throws(()=>g.load(JSON.stringify(saved)));assert.equal(g.save(),raw);}
 assert.equal(loadQ183(raw).save(),raw);
});

test('q183 accepted pre-relocation saves retain six paths, three endings and ration costs without new cast or journeys',()=>{
 for(const route of q183AcceptedRoutes){const g=loadQ183(q183AcceptedEngine().save()),gold=g.state.gold,rations=g.state.inventory.ration;let rewards=0;const award=g.award.bind(g);g.award=(...args)=>{rewards++;return award(...args);};
  for(const id of route.path){assert.ok(g.dispatch({type:'choose',id}));drain(g);assert.equal(g.state.journey,null);assert.equal(g.state.stories.q183,undefined);assert.equal(projectGame(g).dialog?.scene,undefined);checkpoint(g);}
  assert.equal(g.state.quests.q183.outcome,route.outcome);assert.equal(g.state.gold,gold+153);assert.equal(g.state.inventory.ration,rations-(route.path.includes('goods')?2:0));assert.equal(rewards,1);
 }
});

test('q183 and completed revision-one q182 can migrate together without replaying either quest',async()=>{
 const {previousQ182,expectedQ182Save}=await import('../tools/gunner-art-fixtures.mjs');
 const oldData={...previousQ183Data,quests:{...previousQ183Data.quests,q182:previousQ182},scripts:{...previousQ183Data.scripts,...previousQ182.scripts}},g=new GameEngine(oldData);
 g.load(q183Engine({legacy:true}).save());g.random=()=>.999999;choose(g,'q183','hidden');start(g,'q182');for(const id of ['deploy','hold','finish'])choose(g,'q182',id);
 const raw=g.save(),expected=expectedQ182Save(raw);expected.state.stories.q183.revision=2;Object.assign(expected.state.stories.q183.values,q183Fixed);
 const now=new GameEngine(data);now.load(raw);assert.deepEqual(JSON.parse(now.save()),expected);checkpoint(now);
});
