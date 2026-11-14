import test from 'node:test';
import assert from 'node:assert/strict';
import {projectGame} from '../src/application/projection.js';
import {data,go,drain} from './library-helpers.mjs';
import {previousQ148,q148Routes,q148Cast,q148LegacyScene,q148Engine,q148AcceptedEngine,loadQ148,chooseQ148,departQ148,arriveQ148,scaleComparisonArtFixtures} from '../tools/scale-comparison-art-fixtures.mjs';
const story=g=>g.state.stories.q148,values=g=>story(g).values;
const live=g=>projectGame(g).dialog?.scene?.cast.map(c=>c.id);

test('q148 only attaches two existing character references and five casts, retaining every original state, script, route and reward',()=>{
 const q=structuredClone(data.quests.q148);assert.equal(q.story.revision,1);assert.equal(q.model.edition.revision,1);assert.equal(q.model.storyUpgrades,undefined);
 assert.equal(Object.keys(q.story.scenes).length,8);assert.equal(Object.keys(q.story.actions).length,13);assert.equal(Object.values(q.story.actions).filter(a=>a.journey).length,8);
 for(const id of ['egi','customer']){assert.equal(q.story.entities[id].character,'q148_'+id);for(const k of ['portrait','sprite'])assert.equal(data.characters['q148_'+id][k],undefined);delete q.story.entities[id].character;}
 for(const [id,s] of Object.entries(q.story.scenes)){assert.deepEqual(s.cast.map(c=>'q148_'+c.entity),q148Cast(id));s.cast=[];}
 assert.deepEqual(q,previousQ148);
});

test('q148 every scene, journey and action resumes without modifying current or pre-cast save bytes',()=>{
 const scenes=new Set(),journeys=new Set(),actions=new Set(),phases=new Set();
 const observe=g=>{
  const raw=g.save(),now=loadQ148(raw);assert.equal(g.save(),raw);assert.equal(now.save(),raw);
  const before=projectGame(g).dialog,after=projectGame(now).dialog;
  assert.equal(after?.text,before?.text);assert.deepEqual(after?.options,before?.options);
  const s=story(now);phases.add(now.state.journey?'journey':now.state.quests.q148.stage==='completed'?'completed':now.state.waiting?.type);
  if(s.scene)scenes.add(s.scene);if(after?.scene)assert.deepEqual(live(now),q148Cast(s.scene));
  if(now.state.journey){journeys.add(now.state.journey.action);assert.equal(s.scene,null);assert.equal(after?.scene,undefined);assert.equal(s.values.partyAt,'transit');assert.equal(now.dispatch({type:'story.resume',quest:'q148'}),false);arriveQ148(now);}
 };
 for(const legacy of [false,true])for(const route of q148Routes){
  const g=q148Engine({legacy});observe(g);
  for(const id of route.path){actions.add(story(g).scene+'_'+id);assert.ok(g.dispatch({type:'choose',id}));observe(g);drain(g);observe(g);
   if(g.state.journey){const a=g.data.quests.q148.story.actions[g.state.journey.action];go(g,g.data.quests.q148.story.worldPlaces[a.journey.to]);observe(g);drain(g);observe(g);}
  }assert.equal(g.state.quests.q148.outcome,route.outcome);
 }
 assert.equal(scenes.size,8);assert.equal(journeys.size,8);assert.equal(actions.size,13);assert.deepEqual([...actions].sort(),Object.keys(data.quests.q148.story.actions).sort());
 for(const phase of ['text','choice','journey','completed'])assert.ok(phases.has(phase));
});

test('q148 repeated accusation and rebuttal carry both people but leave the same coin and scale at the market',()=>{
 for(const legacy of [false,true]){
  let g=loadQ148(q148Engine({legacy}).save());chooseQ148(g,'visit');
  for(let i=0;i<3;i++){
   departQ148(g,'accuse');assert.equal(values(g).egiAt,'transit');assert.equal(values(g).customerAt,'transit');
   assert.equal(values(g).scaleAt,'market');assert.equal(values(g).coinAt,'market');assert.equal(values(g).proof,false);
   arriveQ148(g);assert.equal(story(g).scene,'denied');assert.equal(values(g).egiAt,'office');assert.equal(values(g).customerAt,'office');assert.deepEqual(live(g),['q148_egi','q148_customer']);
   departQ148(g,'test');arriveQ148(g);g=loadQ148(g.save());assert.equal(values(g).egiAt,'market');assert.equal(values(g).customerAt,'market');assert.equal(values(g).proof,false);
  }
  chooseQ148(g,'test');assert.equal(values(g).proof,true);assert.equal(values(g).scaleAt,'market');assert.equal(values(g).coinAt,'market');assert.deepEqual(live(g),['q148_egi','q148_customer']);
 }
});

test('q148 public demonstration carries the same coin and scale and only finish transfers them and starts refund procedures',()=>{
 for(const legacy of [false,true]){
  let g=q148Engine({legacy});for(const id of ['visit','test'])chooseQ148(g,id);g=loadQ148(g.save());const gold=g.state.gold;
  departQ148(g,'public');assert.equal(values(g).scaleAt,'party');assert.equal(values(g).coinAt,'party');
  assert.equal(values(g).egiAt,'transit');assert.equal(values(g).customerAt,'transit');assert.equal(values(g).demonstrated,false);assert.equal(values(g).refundProcedureStarted,false);
  arriveQ148(g);assert.equal(story(g).scene,'public_demo');assert.equal(values(g).egiAt,'office');assert.equal(values(g).customerAt,'office');
  assert.equal(values(g).scaleAt,'party');assert.equal(values(g).coinAt,'party');assert.equal(values(g).finished,false);assert.equal(g.state.gold,gold);
  chooseQ148(g,'finish');assert.equal(values(g).scaleAt,'office');assert.equal(values(g).coinAt,'customer');
  assert.equal(values(g).demonstrated,true);assert.equal(values(g).refundProcedureStarted,true);assert.equal(values(g).oneRefunded,false);assert.equal(values(g).removed,false);
 }
});

test('q148 private refund is limited to the one customer and does not move the coin or scale',()=>{
 for(const legacy of [false,true]){
  let g=q148Engine({legacy});for(const id of ['visit','test','private'])chooseQ148(g,id);g=loadQ148(g.save());
  assert.equal(story(g).scene,'private_refund');assert.equal(values(g).oneRefunded,false);assert.equal(values(g).scaleAt,'market');assert.equal(values(g).coinAt,'market');
  chooseQ148(g,'finish');assert.equal(values(g).oneRefunded,true);assert.equal(values(g).demonstrated,false);assert.equal(values(g).refundProcedureStarted,false);assert.equal(values(g).removed,false);
  assert.equal(values(g).scaleAt,'market');assert.equal(values(g).coinAt,'market');assert.equal(values(g).egiAt,'market');assert.equal(values(g).customerAt,'market');
 }
});

test('q148 retrieval after accusation leaves both people at the office and does not pick up the scale before departure',()=>{
 for(const legacy of [false,true]){
  let g=q148Engine({legacy});for(const id of ['visit','accuse'])chooseQ148(g,id);g=loadQ148(g.save());
  departQ148(g,'remove');assert.equal(values(g).scaleAt,'market');assert.equal(values(g).coinAt,'market');
  assert.equal(values(g).egiAt,'office');assert.equal(values(g).customerAt,'office');arriveQ148(g);
  assert.equal(story(g).scene,'fetch_scale');assert.deepEqual(live(g),[]);assert.equal(values(g).scaleAt,'market');
  departQ148(g,'carry');assert.equal(values(g).scaleAt,'party');assert.equal(values(g).coinAt,'market');arriveQ148(g);
  assert.equal(story(g).scene,'removed');assert.deepEqual(live(g),[]);assert.equal(values(g).scaleAt,'party');assert.equal(values(g).removed,false);
  chooseQ148(g,'finish');assert.equal(values(g).scaleAt,'storage');assert.equal(values(g).coinAt,'market');assert.equal(values(g).proof,false);
  assert.equal(values(g).egiAt,'office');assert.equal(values(g).customerAt,'office');assert.equal(values(g).removed,true);
 }
});

test('q148 direct or post-comparison removal carries only the scale and never adds the market people to storage',()=>{
 for(const legacy of [false,true])for(const tested of [false,true]){
  let g=q148Engine({legacy});chooseQ148(g,'visit');if(tested)chooseQ148(g,'test');g=loadQ148(g.save());
  departQ148(g,'remove');assert.equal(values(g).scaleAt,'party');assert.equal(values(g).coinAt,'market');assert.equal(values(g).egiAt,'market');assert.equal(values(g).customerAt,'market');
  arriveQ148(g);assert.deepEqual(live(g),[]);assert.equal(values(g).removed,false);chooseQ148(g,'finish');
  assert.equal(values(g).scaleAt,'storage');assert.equal(values(g).proof,tested);assert.equal(values(g).refundProcedureStarted,false);assert.equal(values(g).oneRefunded,false);
 }
});

test('q148 retreat and defeat preserve all eight pending journeys, companions, evidence and object custody',()=>{
 const seen=new Set();
 for(const legacy of [false,true])for(const route of q148Routes.filter(r=>r.loops===1)){
  const g=q148Engine({legacy});
  for(const id of route.path){assert.ok(g.dispatch({type:'choose',id}));drain(g);
   if(g.state.journey){const key=legacy+'/'+g.state.journey.action;
    if(!seen.has(key)){seen.add(key);const raw=g.save();
     for(const interruption of ['mark','defeat']){
      const now=loadQ148(raw);if(now.state.mode==='town')go(now,{kind:'dungeon',dungeon:'region_5',map:'region_5_f1',x:1,y:1});assert.ok(now.state.journey);
      const s=structuredClone(story(now)),j=structuredClone(now.state.journey);
      if(interruption==='mark')assert.ok(now.dispatch({type:'retreat'}));else now.defeat();drain(now);
      assert.equal(now.state.mode,'town');assert.deepEqual(story(now),s);assert.deepEqual(now.state.journey,j);
      const resumed=loadQ148(now.save());assert.equal(resumed.dispatch({type:'story.resume',quest:'q148'}),false);arriveQ148(resumed);assert.equal(values(resumed).finished,false);
     }
    }arriveQ148(g);
   }
  }
 }
 assert.equal(seen.size,16);
});

test('q148 fifteen paths keep all three rewards exactly once and do not award for arriving',()=>{
 assert.equal(q148Routes.length,15);
 for(const legacy of [false,true])for(const route of q148Routes){
  const g=loadQ148(q148Engine({legacy}).save()),gold=g.state.gold;let awards=0;
  const award=g.award.bind(g);g.award=(gp,xp,who)=>{assert.deepEqual([gp,xp],[105,75]);awards++;return award(gp,xp,who);};
  for(const id of route.path){assert.equal(awards,0);chooseQ148(g,id);}
  assert.equal(awards,1);assert.equal(g.state.gold,gold+105);assert.equal(g.state.quests.q148.outcome,route.outcome);
  const raw=g.save();assert.throws(()=>g.complete('q148',route.outcome));assert.equal(g.save(),raw);
  g.run(data.quests.q148.model.entryScript);drain(g);assert.equal(awards,1);loadQ148(g.save());
 }
});

test('q148 accepted old routes preserve all three scenes and repeated local accusations without new journeys or cast',()=>{
 const scenes=new Set();
 for(const route of q148Routes){const g=loadQ148(q148AcceptedEngine().save()),gold=g.state.gold;let awards=0;const award=g.award.bind(g);g.award=(gp,xp,who)=>{assert.deepEqual([gp,xp],[105,75]);awards++;return award(gp,xp,who);};
  for(const id of route.accepted){scenes.add(q148LegacyScene(g));loadQ148(g.save());assert.ok(g.dispatch({type:'choose',id}));loadQ148(g.save());drain(g);assert.equal(g.state.journey,null);assert.equal(g.state.stories.q148,undefined);assert.equal(projectGame(g).dialog?.scene,undefined);}
  assert.equal(g.state.quests.q148.outcome,route.outcome);assert.equal(awards,1);assert.equal(g.state.gold,gold+105);loadQ148(g.save());
 }
 assert.deepEqual([...scenes].sort(),['denied','entry','proof']);
});

test('q148 invalid current and pre-cast saves are rejected atomically, rather than repaired by the new cast',()=>{
 const g=q148Engine(),raw=g.save(),old=q148Engine({legacy:true}).save();
 for(const input of [raw,old])for(const mutate of [s=>s.stories.q148.values.scaleAt='unknown',s=>s.stories.q148.values.proof=1,s=>s.stories.q148.revision=2,s=>(s.flags.legacyStoryRoutes??={}).q148=true,s=>delete s.stories.q148.values.coinAt,s=>{s.stories.q148.values.coinAt='scale';s.stories.q148.values.scaleAt='coin';}]){
  const broken=JSON.parse(input);mutate(broken.state);assert.throws(()=>g.load(JSON.stringify(broken)));assert.equal(g.save(),raw);
 }
});

test('q148 browser checkpoints distinguish market versus office people, proof state and accepted scenes',async()=>{
 const {fixtures,outcomes}=await scaleComparisonArtFixtures();assert.equal(outcomes.length,3);assert.equal(new Set(fixtures.map(f=>f.scene+'/'+f.variant)).size,fixtures.length);
 for(const prefix of ['current','previous']){
  const rows=fixtures.filter(f=>f.variant.startsWith(prefix));assert.equal(new Set(rows.map(f=>f.scene)).size,8);
  assert.ok(rows.some(f=>f.scene==='removed'&&f.variant===prefix+'-office-unproven'));
  assert.ok(rows.some(f=>f.scene==='removed'&&f.variant===prefix+'-market-proof'));
  assert.ok(rows.some(f=>f.scene==='removed'&&f.variant===prefix+'-market-unproven'));
  for(const f of rows)assert.deepEqual(f.cast,q148Cast(f.scene));
 }
 assert.equal(fixtures.filter(f=>f.absentStoryScene).length,3);
});
