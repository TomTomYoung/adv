import test from 'node:test';
import assert from 'node:assert/strict';
import {projectGame} from '../src/application/projection.js';
import {data,go,drain} from './library-helpers.mjs';
import {previousQ150,q150Crew,q150Cast,q150Routes,q150CoverageRoutes,q150Engine,q150AcceptedEngine,q150LegacyScene,loadQ150,chooseQ150,departQ150,arriveQ150,troupeApprenticeArtFixtures} from '../tools/troupe-apprentice-art-fixtures.mjs';
const story=g=>g.state.stories.q150,values=g=>story(g).values;
const live=g=>projectGame(g).dialog?.scene?.cast.map(c=>c.id);
const at=(path,legacy=false)=>{const g=q150Engine({legacy});for(const id of path)chooseQ150(g,id);return g;};

test('q150 only adds four existing cast references and three descriptions aligned to existing commit points',()=>{
 const q=structuredClone(data.quests.q150);assert.equal(q.story.revision,1);assert.equal(q.model.edition.revision,1);assert.equal(q.model.storyUpgrades,undefined);
 assert.equal(Object.keys(q.story.scenes).length,11);assert.equal(Object.keys(q.story.actions).length,23);assert.equal(Object.values(q.story.actions).filter(a=>a.journey).length,10);
 for(const id of q150Crew){assert.equal(q.story.entities[id].character,'q150_'+id);for(const k of ['portrait','sprite'])assert.equal(data.characters['q150_'+id][k],undefined);delete q.story.entities[id].character;}
 assert.equal(q.story.entities.walletOwner.character,undefined);
 for(const s of Object.values(q.story.scenes)){assert.deepEqual(s.cast.map(c=>c.entity),q150Crew);s.cast=[];}
 for(const a of Object.values(q.story.actions))if(a.journey)assert.deepEqual(a.journey.companions,q150Crew);
 const substitutions=new Map(['settled','tools','formed'].map(id=>[q.model.graph.find(n=>n.id===id).text,previousQ150.model.graph.find(n=>n.id===id).text]));
 const restore=v=>typeof v==='string'?(substitutions.get(v)??v):Array.isArray(v)?v.map(restore):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,restore(x)])):v;
 assert.deepEqual(restore(q),previousQ150);
});

test('q150 complete action basis covers eleven scenes, ten journeys, 23 actions and unchanged current/previous saves',()=>{
 const scenes=new Set(),journeys=new Set(),actions=new Set(),phases=new Set(),seen=new Set();
 const observe=g=>{
  const raw=g.save(),key=JSON.stringify([g.data===data?'current':'previous',story(g),g.state.journey,g.state.waiting,g.state.vm,g.state.quests.q150.stage]);
  if(seen.has(key))return;seen.add(key);
  const now=loadQ150(raw);assert.equal(now.save(),raw);assert.equal(g.save(),raw);
  const a=projectGame(g).dialog,b=projectGame(now).dialog;assert.equal(b?.text,a?.text);assert.deepEqual(b?.options,a?.options);
  const s=story(now);if(s.scene)scenes.add(s.scene);phases.add(now.state.journey?'journey':now.state.quests.q150.stage==='completed'?'completed':now.state.waiting?.type);
  if(b?.scene)assert.deepEqual(live(now),q150Cast);
  if(now.state.journey){journeys.add(now.state.journey.action);assert.equal(s.scene,null);assert.equal(b?.scene,undefined);for(const id of q150Crew)assert.equal(s.values[id+'At'],'transit');assert.equal(now.dispatch({type:'story.resume',quest:'q150'}),false);arriveQ150(now);}
 };
 assert.equal(q150Routes.length,94);
 for(const legacy of [false,true])for(const r of q150CoverageRoutes){
  const g=q150Engine({legacy});observe(g);
  for(const id of r.path){actions.add(story(g).scene+'_'+id);assert.ok(g.dispatch({type:'choose',id}),g.state.notice);observe(g);drain(g);observe(g);
   if(g.state.journey){const a=g.data.quests.q150.story.actions[g.state.journey.action];go(g,g.data.quests.q150.story.worldPlaces[a.journey.to]);observe(g);drain(g);observe(g);}
  }assert.equal(g.state.quests.q150.outcome,r.outcome);
 }
 assert.equal(scenes.size,11);assert.equal(journeys.size,10);assert.deepEqual([...actions].sort(),Object.keys(data.quests.q150.story.actions).sort());
 for(const p of ['text','choice','journey','completed'])assert.ok(phases.has(p),p);
});

test('q150 rehearsed and unrehearsed accidents keep their distinct text and the same four actual companions',()=>{
 for(const legacy of [false,true])for(const prepared of [false,true]){
  const g=at(prepared?['practice','stage']:['stage'],legacy),now=loadQ150(g.save());
  assert.equal(values(now).prepared,prepared);assert.match(projectGame(now).dialog.text,prepared?/練習で見た三人/:/仕込んだ試験ではない/);assert.deepEqual(live(now),q150Cast);
  assert.equal(values(now).walletOwnerAt,'stage');for(const id of q150Crew)assert.equal(values(now)[id+'At'],'stage');
 }
});

test('q150 demonstrating work grants eligibility but never counts as apprentice consent or fee settlement',()=>{
 for(const legacy of [false,true]){
  const g=loadQ150(at(['stage','porter','finish'],legacy).save()),s=structuredClone(story(g)),gold=g.state.gold;
  assert.equal(values(g).porter,true);assert.equal(values(g).singer,false);assert.equal(values(g).thief,false);
  for(const k of ['porterAgreed','thiefAgreed','singerAgreed','companyAgreed','feesSettled'])assert.equal(values(g)[k],false);
  for(const id of ['singer','thief']){assert.equal(g.dispatch({type:'choose',id}),false);assert.deepEqual(story(g),s);assert.equal(g.state.gold,gold);}
  chooseQ150(g,'porter');assert.equal(values(g).porterAgreed,true);assert.equal(values(g).feesSettled,true);assert.equal(values(g).thiefAgreed,false);assert.equal(values(g).singerAgreed,false);
 }
});

test('q150 repairing a fastener does not return a wallet; the return act occurs only at departure from the audience',()=>{
 for(const legacy of [false,true]){
  const repaired=loadQ150(at(['stage','singer','thief','finish'],legacy).save());
  assert.equal(values(repaired).thief,true);assert.equal(values(repaired).walletReturned,false);assert.equal(values(repaired).walletAt,'stage');
  chooseQ150(repaired,'thief');assert.equal(values(repaired).thiefAgreed,true);assert.equal(values(repaired).walletReturned,false);
  const g=loadQ150(at(['stage','porter'],legacy).save());assert.equal(values(g).walletAt,'stage');
  departQ150(g,'thief');assert.equal(values(g).walletAt,'walletOwner');assert.equal(values(g).walletReturned,true);assert.equal(values(g).walletOwnerAt,'stage');
  assert.equal(values(g).thief,false);assert.equal(values(g).thiefAgreed,false);arriveQ150(g);
  assert.equal(values(g).thief,true);assert.equal(values(g).walletOwnerAt,'stage');assert.deepEqual(live(g),q150Cast);
 }
});

test('q150 39G cannot pay, and paying 40G once neither picks up tools nor forms a company',()=>{
 for(const legacy of [false,true]){
  const g=loadQ150(at(['stage','porter','finish','company'],legacy).save());g.state.gold=39;const before=structuredClone(story(g));
  assert.equal(g.dispatch({type:'choose',id:'agree'}),false);assert.equal(g.state.gold,39);assert.deepEqual(story(g),before);assert.equal(g.state.journey,null);
  g.state.gold=40;chooseQ150(g,'agree');assert.equal(g.state.gold,0);assert.equal(story(g).scene,'company_agree_ready');assert.equal(values(g).toolsPaid,true);assert.equal(values(g).sharedToolsAt,'tools');
  assert.equal(values(g).companyAgreed,false);assert.equal(values(g).feesSettled,false);assert.deepEqual(live(g),q150Cast);
  const now=loadQ150(g.save());assert.equal(now.state.gold,0);assert.equal(now.dispatch({type:'choose',id:'agree'}),false);assert.equal(now.state.gold,0);
  chooseQ150(now,'continue');assert.equal(now.state.gold,0);assert.equal(values(now).sharedToolsAt,'tools');assert.equal(values(now).walletOwnerAt,'stage');
 }
});

test('q150 tool custody changes only on workshop departure and the final handoff, with all four escorts',()=>{
 for(const legacy of [false,true]){
  const g=loadQ150(at(['stage','porter','thief','company','agree','continue'],legacy).save()),gold=g.state.gold;
  assert.equal(values(g).sharedToolsAt,'tools');assert.equal(values(g).companyAgreed,false);departQ150(g,'carry');assert.equal(values(g).sharedToolsAt,'party');
  for(const id of q150Crew)assert.equal(values(g)[id+'At'],'transit');assert.equal(values(g).walletAt,'walletOwner');assert.equal(values(g).walletOwnerAt,'stage');
  arriveQ150(g);assert.equal(story(g).scene,'formed');assert.equal(values(g).sharedToolsAt,'party');assert.equal(values(g).companyAgreed,false);assert.equal(values(g).feesSettled,false);assert.equal(g.state.gold,gold);
  chooseQ150(g,'finish');assert.equal(values(g).sharedToolsAt,'stage');assert.equal(values(g).companyAgreed,true);assert.equal(values(g).feesSettled,true);assert.equal(g.state.gold,gold+105);
 }
});

test('q150 cancellation, no apprentice and company refusal settle fees only at finish without giving consent',()=>{
 for(const legacy of [false,true])for(const route of [['stage','cancel'],['stage','singer','cancel'],['stage','porter','finish','none'],['stage','porter','finish','company','decline']]){
  const g=loadQ150(at(route,legacy).save());assert.equal(story(g).scene,'settled');assert.equal(values(g).feesSettled,false);assert.deepEqual(live(g),q150Cast);
  chooseQ150(g,'finish');assert.equal(values(g).feesSettled,true);assert.equal(g.state.quests.q150.outcome,'none');for(const k of ['porterAgreed','thiefAgreed','singerAgreed','companyAgreed'])assert.equal(values(g)[k],false);
 }
});

test('q150 retreat and defeat preserve all ten pending journeys, four escorts, payment, tools and wallet',()=>{
 const seen=new Set();
 for(const legacy of [false,true])for(const route of q150CoverageRoutes){
  const g=q150Engine({legacy});
  for(const id of route.path){assert.ok(g.dispatch({type:'choose',id}));drain(g);
   if(g.state.journey){const key=legacy+'/'+g.state.journey.action;
    if(!seen.has(key)){seen.add(key);const raw=g.save();for(const interruption of ['mark','defeat']){
     const now=loadQ150(raw);if(now.state.mode==='town')go(now,{kind:'dungeon',dungeon:'region_5',map:'region_5_f1',x:1,y:1});
     const s=structuredClone(story(now)),j=structuredClone(now.state.journey);
     if(interruption==='mark')assert.ok(now.dispatch({type:'retreat'}));else now.defeat();drain(now);
     assert.equal(now.state.mode,'town');assert.deepEqual(story(now),s);assert.deepEqual(now.state.journey,j);
     const resumed=loadQ150(now.save());assert.equal(resumed.dispatch({type:'story.resume',quest:'q150'}),false);arriveQ150(resumed);assert.equal(values(resumed).finished,false);
    }}arriveQ150(g);
   }
  }
  if(seen.size===(legacy?20:10))break;
 }
 assert.equal(seen.size,20);
});

test('q150 all 94 routes yield five once-only rewards, charging 40G only for the company',()=>{
 for(const legacy of [false,true])for(const r of q150Routes){
  const g=loadQ150(q150Engine({legacy}).save()),gold=g.state.gold;let awards=0;const award=g.award.bind(g);
  g.award=(gp,xp,who)=>{assert.deepEqual([gp,xp],[105,75]);awards++;return award(gp,xp,who);};
  for(const id of r.path){assert.equal(awards,0);chooseQ150(g,id);}assert.equal(awards,1);assert.equal(g.state.gold,gold+105-r.fee);assert.equal(g.state.quests.q150.outcome,r.outcome);
  assert.equal(values(g).toolsPaid,r.outcome==='company');assert.equal(values(g).feesSettled,true);assert.equal(values(g).companyAgreed,r.outcome==='company');
  const raw=g.save();assert.throws(()=>g.complete('q150',r.outcome));assert.equal(g.save(),raw);g.run(data.quests.q150.model.entryScript);drain(g);assert.equal(awards,1);loadQ150(g.save());
 }
});

test('q150 old accepted routes retain six scenes, all 94 paths, five endings, and original 40G cost',()=>{
 const scenes=new Set();
 for(const r of q150Routes){const g=loadQ150(q150AcceptedEngine().save()),gold=g.state.gold;
  for(const id of r.accepted){scenes.add(q150LegacyScene(g));loadQ150(g.save());assert.ok(g.dispatch({type:'choose',id}));loadQ150(g.save());drain(g);assert.equal(g.state.journey,null);assert.equal(g.state.stories.q150,undefined);assert.equal(projectGame(g).dialog?.scene,undefined);}
  assert.equal(g.state.quests.q150.outcome,r.outcome);assert.equal(g.state.gold,gold+105-r.fee);loadQ150(g.save());
 }
 assert.equal(scenes.size,6);
});

test('q150 malformed current and pre-cast saves fail atomically without repairing roles, flags or object cycles',()=>{
 const g=q150Engine(),raw=g.save(),old=q150Engine({legacy:true}).save();
 for(const input of [raw,old])for(const mutate of [s=>s.stories.q150.values.walletAt='unknown',s=>s.stories.q150.values.toolsPaid=1,s=>s.stories.q150.revision=2,s=>delete s.stories.q150.values.ritzAt,s=>(s.flags.legacyStoryRoutes??={}).q150=true,s=>{s.stories.q150.values.walletAt='sharedTools';s.stories.q150.values.sharedToolsAt='wallet';}]){
  const broken=JSON.parse(input);mutate(broken.state);assert.throws(()=>g.load(JSON.stringify(broken)));assert.equal(g.save(),raw);
 }
});

test('q150 browser checkpoints cover both generations, role-dependent choices, practice text, 39G and accepted routes',async()=>{
 const {fixtures,outcomes}=await troupeApprenticeArtFixtures();assert.equal(outcomes.length,5);assert.equal(new Set(fixtures.map(f=>f.scene+'/'+f.variant)).size,fixtures.length);
 for(const prefix of ['current','previous']){
  const rows=fixtures.filter(f=>f.variant.startsWith(prefix));assert.equal(new Set(rows.map(f=>f.scene)).size,11);
  assert.ok(rows.some(f=>f.scene==='accident'&&f.variant===prefix+'-prepared'));assert.ok(rows.some(f=>f.scene==='accident'&&f.variant===prefix+'-unprepared'));
  assert.ok(rows.some(f=>f.blockedChoice==='agree'));for(const f of rows)assert.deepEqual(f.cast,q150Cast);
 }
 assert.equal(fixtures.filter(f=>f.absentStoryScene).length,6);
});
