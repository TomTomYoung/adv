import test from 'node:test';
import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {validateSave} from '../src/core/save.js';
import {projectGame} from '../src/application/projection.js';
import {data,ready,start,choose,go,drain,checkpoint} from './pilgrimage-helpers.mjs';
import {fight} from './helpers.mjs';
import {resolveBattle} from '../tools/audit-regional-relocation.mjs';
import {q132Engine,q132Routes,q132Cast,q132ManagerAt,previousQ132,previousQ132Data,upgradedQ132Save,q132AcceptedEngine,q132AcceptedRoutes,q132AcceptedChoose,acceptedQ132Data,treasuryArtFixtures} from '../tools/treasury-art-fixtures.mjs';
import {previousQ038,upgradedQ038Save} from '../tools/water-art-fixtures.mjs';
import {previousQ039} from '../tools/mask-art-fixtures.mjs';
import {installDOM} from './view-dom.mjs';
import {replaceView} from '../src/view/view-layout.js';
let fixturePromise;const fixtures=()=>fixturePromise??=treasuryArtFixtures();

function step(g,id,check=()=>{}){
 assert.ok(g.dispatch({type:'choose',id}));check(g);drain(g);check(g);
 if(g.state.battle){g.healAll();fight(g);check(g);}
 if(g.state.journey){const action=g.data.quests.q132.story.actions[g.state.journey.action];go(g,g.data.quests.q132.story.worldPlaces[action.journey.to]);check(g);drain(g);check(g);}
}

test('q132 adds only the manager, two casts, one companion and the declared save revision',()=>{
 const q=structuredClone(data.quests.q132);assert.deepEqual(q.model.storyUpgrades[0].previous,previousQ132.story);
 assert.equal(q.story.entities.manager.character,'q132_manager');assert.equal(q.story.registry.managerAt.initial,'station');
 delete q.story.entities.manager;delete q.story.registry.managerAt;
 for(const r of Object.values(q.story.registry))if(r.values)r.values=r.values.filter(v=>v!=='manager');
 for(const [id,s] of Object.entries(q.story.scenes)){assert.deepEqual(s.cast.map(c=>c.entity),q132Cast(id).length?['manager']:[]);s.cast=[];}
 const a=q.story.actions.test_decoy;assert.deepEqual(a.journey.companions,['manager']);a.journey.companions=[];
 assert.deepEqual(a.effects[0].entities,['party','manager']);a.effects[0].entities=['party'];
 delete q.model.storyUpgrades;q.story.revision=1;q.model.edition.revision=1;assert.deepEqual(q,previousQ132);
 assert.equal(q.model.preserveAcceptedRoute,true);assert.equal(data.scenarioEditions.editions.e2.saveRevision,2);
});

test('q132 fixtures cover all scenes, both fight origins, rope shortage and accepted old routes',async()=>{
 const {fixtures:states,outcomes}=await fixtures();assert.equal(states.length,16);assert.equal(outcomes.length,2);
 assert.equal(states.filter(f=>f.blockedChoice==='seal').length,3);assert.equal(states.filter(f=>f.absentStoryScene).length,4);
 for(const f of states){const g=new GameEngine(data);g.load(f.save);assert.equal(g.save(),f.save);
  if(f.absentStoryScene){assert.equal(g.state.stories.q132,undefined);assert.equal(projectGame(g).dialog.scene,undefined);}
  else assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),q132Cast(f.scene));
 }
});

test('q132 previous physical saves add only managerAt and revision at narration, choices, journeys, battles and endings',()=>{
 const phases=new Set(),scenes=new Set(),places=new Set();let checks=0;
 const check=g=>{
  const raw=g.save();assert.deepEqual(validateSave(JSON.parse(raw),g.data),[]);const current=new GameEngine(data);current.load(raw);
  assert.deepEqual(JSON.parse(current.save()),upgradedQ132Save(raw));assert.equal(g.save(),raw);checkpoint(current);checks++;
  const before=projectGame(g).dialog,after=projectGame(current).dialog;assert.equal(after?.text,before?.text);assert.deepEqual(after?.options,before?.options);
  phases.add(g.state.battle?'battle':g.state.journey?'journey':g.state.quests.q132.stage==='completed'?'completed':g.state.waiting?.type);
  if(g.state.stories.q132.scene)scenes.add(g.state.stories.q132.scene);places.add(current.state.stories.q132.values.managerAt);
 };
 for(const route of q132Routes){const g=q132Engine({legacy:true});check(g);for(const id of route.path)step(g,id,check);assert.equal(g.state.quests.q132.outcome,route.outcome);check(g);}
 for(const phase of ['text','choice','journey','battle','completed'])assert.ok(phases.has(phase),phase);
 assert.deepEqual([...scenes].sort(),['entry','test','isolate','fight'].sort());assert.deepEqual([...places].sort(),['station','transit','seal'].sort());assert.ok(checks>=40);
});

test('q132 current and migrated routes keep the manager outside battle and transfer the decoy only at arrival',()=>{
 for(const legacy of [false,true])for(const route of q132Routes){
  const old=q132Engine({legacy}),g=new GameEngine(data);g.load(old.save());g.random=()=>.999999;
  const members=[...g.state.members];let payments=0;const complete=g.complete.bind(g);
  g.complete=(id,outcome)=>{const gold=g.state.gold;const result=complete(id,outcome);if(id==='q132'){payments++;assert.equal(g.state.gold-gold,data.quests.q132.outcomes[outcome].gold);}return result;};
  for(const id of route.path)step(g,id,current=>{
   const s=current.state.stories.q132,j=current.state.journey;assert.equal(s.values.managerAt,q132ManagerAt(current.state));assert.equal(s.values.boxAt,'entry');assert.deepEqual(current.state.members,members);checkpoint(current);
   if(j){const action=data.quests.q132.story.actions[j.action];assert.deepEqual(action.journey.companions,j.action==='test_decoy'?['manager']:[]);assert.equal(s.scene,null);assert.equal(s.values.partyAt,'transit');if(j.action==='test_decoy'){assert.equal(s.values.decoyAt,'party');assert.equal(s.values.signal,false);}assert.equal(current.dispatch({type:'story.resume',quest:'q132'}),false);}
   if(current.state.battle){assert.equal(current.state.battle.encounter,'story_132');assert.deepEqual(projectGame(current).dialog?.scene?.cast??[],[]);assert.equal(s.values.finished,false);}
  });
  const v=g.state.stories.q132.values,decoy=route.path.includes('decoy');assert.equal(g.state.quests.q132.outcome,route.outcome);
  assert.equal(v.managerAt,decoy?'seal':'station');assert.equal(v.decoyAt,decoy?'seal':'station');assert.equal(v.signal,decoy);assert.equal(v.sealed,route.outcome==='isolate');assert.equal(g.state.inventory.rope,route.outcome==='isolate'?0:1);assert.equal(payments,1);
  const before=g.save();assert.throws(()=>complete('q132',route.outcome));assert.equal(g.save(),before);const gold=g.state.gold;g.run(data.quests.q132.model.entryScript);drain(g);assert.equal(g.state.gold,gold);assert.equal(payments,1);
 }
});

test('q132 every old journey resumes and the escorted manager survives retreat without delivering the decoy early',()=>{
 const journeys=new Set();
 for(const route of q132Routes){const old=q132Engine({legacy:true});for(const id of route.path)step(old,id,g=>{
  if(!g.state.journey)return;const raw=g.save(),current=new GameEngine(data);current.load(raw);const j=current.state.journey;journeys.add(j.action);
  go(current,data.quests.q132.story.worldPlaces[data.quests.q132.story.actions[j.action].journey.to]);drain(current);assert.equal(current.state.journey,null);assert.equal(current.state.stories.q132.values.managerAt,q132ManagerAt(current.state));checkpoint(current);
 });}
 assert.deepEqual([...journeys].sort(),['entry_room','test_decoy','test_destroy','isolate_destroy'].sort());
 const old=q132Engine({legacy:true});choose(old,'q132','room');assert.ok(old.dispatch({type:'choose',id:'decoy'}));drain(old);
 const g=new GameEngine(data);g.load(old.save());assert.equal(g.state.stories.q132.values.managerAt,'transit');assert.equal(g.state.stories.q132.values.decoyAt,'party');
 assert.ok(g.dispatch({type:'retreat'}));go(g,{kind:'town',location:'pilgrim_board'});assert.equal(g.dispatch({type:'story.resume',quest:'q132'}),false);checkpoint(g);
 assert.equal(g.state.stories.q132.values.managerAt,'transit');assert.equal(g.state.stories.q132.values.decoyAt,'party');assert.equal(g.state.stories.q132.values.signal,false);
 go(g,data.quests.q132.story.worldPlaces.seal);drain(g);assert.equal(g.state.stories.q132.values.managerAt,'seal');assert.equal(g.state.stories.q132.values.decoyAt,'seal');assert.equal(g.state.inventory.rope,1);checkpoint(g);
 choose(g,'q132','seal');assert.equal(g.state.inventory.rope,0);
});

test('q132 no rope prevents isolation atomically and leaves the original battle route available',()=>{
 for(const legacy of [false,true]){const old=q132Engine({legacy,rope:0});choose(old,'q132','room');choose(old,'q132','decoy');const g=new GameEngine(data);g.load(old.save());const before=g.save();
  assert.equal(g.dispatch({type:'choose',id:'seal'}),false);assert.equal(g.save(),before);assert.equal(g.state.stories.q132.values.sealed,false);
  choose(g,'q132','destroy');assert.equal(g.state.stories.q132.values.managerAt,'seal');assert.deepEqual(projectGame(g).dialog.scene.cast,[]);choose(g,'q132','destroy');assert.equal(g.state.quests.q132.outcome,'destroy');assert.equal(g.state.stories.q132.values.sealed,false);assert.equal(g.state.inventory.rope,0);
 }
});

test('q132 saved battles retain escape and defeat retries without moving the manager into combat',()=>{
 for(const legacy of [false,true])for(const route of q132Routes.filter(r=>r.outcome==='destroy'))for(const result of ['escape','lose']){
  const old=q132Engine({legacy});for(const id of route.path.slice(0,-1))choose(old,'q132',id);choose(old,'q132','destroy',{combat:'pending'});
  const g=new GameEngine(data);g.load(old.save());assert.equal(g.state.battle.encounter,'story_132');const manager=g.state.stories.q132.values.managerAt,scene=g.state.stories.q132.scene;
  resolveBattle(g,result);checkpoint(g);assert.equal(g.state.quests.q132.stage,'active');assert.equal(g.state.stories.q132.values.finished,false);assert.equal(g.state.stories.q132.values.sealed,false);assert.equal(g.state.stories.q132.values.managerAt,manager);
  if(result==='lose'){go(g,data.quests.q132.story.worldPlaces.entry);assert.ok(g.dispatch({type:'story.resume',quest:'q132'}));drain(g);}
  assert.equal(g.state.stories.q132.scene,scene);assert.deepEqual(projectGame(g).dialog.scene.cast,[]);choose(g,'q132','destroy');assert.equal(g.state.quests.q132.outcome,'destroy');assert.equal(g.state.stories.q132.values.managerAt,manager);
 }
});

test('q132 accepted legacy saves retain seven phases without acquiring typed story state or portraits',()=>{
 for(const phase of ['available','accepted','dungeon','text','choice','battle','completed']){
  const old=q132AcceptedEngine({accepted:phase!=='available',entered:!['available','accepted'].includes(phase),started:['text','choice','battle','completed'].includes(phase)});
  if(['choice','battle','completed'].includes(phase))drain(old);
  if(phase==='battle')q132AcceptedChoose(old,'destroy',{combat:false});
  if(phase==='completed')for(const id of q132AcceptedRoutes.at(-1).path)q132AcceptedChoose(old,id);
  const raw=old.save(),expected=JSON.parse(raw),g=new GameEngine(data);assert.deepEqual(validateSave(expected,acceptedQ132Data),[]);g.load(raw);
  if(phase!=='available')(expected.state.flags.legacyStoryRoutes??={}).q132=true;
  assert.deepEqual(JSON.parse(g.save()),expected);assert.equal(old.save(),raw);assert.equal(g.state.stories.q132,undefined);checkpoint(g);
  if(phase==='available'){assert.ok(g.accept('q132'));assert.equal(g.state.flags.currentStoryRoutes.q132,true);go(g,data.quests.q132.story.worldPlaces.entry);assert.ok(g.dispatch({type:'story.resume',quest:'q132'}));drain(g);choose(g,'q132','room');assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['q132_manager']);}
 }
});

test('q132 accepted old routes retain both endings and their original escape-to-entry behavior',()=>{
 for(const route of q132AcceptedRoutes){const old=q132AcceptedEngine();drain(old);const g=new GameEngine(data);g.load(old.save());
  for(const id of route.path){assert.equal(projectGame(g).dialog.scene,undefined);q132AcceptedChoose(g,id);checkpoint(g);assert.equal(g.state.stories.q132,undefined);assert.equal(g.state.journey,null);}
  assert.equal(g.state.quests.q132.outcome,route.outcome);assert.equal(g.state.inventory.rope,route.outcome==='isolate'?0:1);
 }
 for(const result of ['escape','lose']){const old=q132AcceptedEngine();drain(old);q132AcceptedChoose(old,'room');q132AcceptedChoose(old,'decoy');q132AcceptedChoose(old,'destroy',{combat:false});const g=new GameEngine(data);g.load(old.save());resolveBattle(g,result);checkpoint(g);assert.equal(g.state.stories.q132,undefined);assert.equal(g.state.quests.q132.stage,'active');
  if(result==='lose'){const p=data.previousQuestRoutes.q132.locations.find(p=>p.role==='decision');go(g,{kind:'dungeon',dungeon:p.dungeon,map:p.map,x:p.x,y:p.y});g.run(data.quests.q132.model.entryScript);drain(g);}
  assert.equal(projectGame(g).dialog.scene,undefined);q132AcceptedChoose(g,'destroy');assert.equal(g.state.quests.q132.outcome,'destroy');
 }
});

test('q132 corrupt old and current saves are rejected before adding or accepting manager locations',()=>{
 const old=q132Engine({legacy:true}),g=q132Engine(),before=g.save();
 for(const mutate of [s=>s.stories.q132.values.boxAt='nowhere',s=>delete s.stories.q132.values.decoyAt,s=>s.stories.q132.values.managerAt='station',s=>s.stories.q132.values.extra=true,s=>s.stories.q132.events.push('unwritten'),s=>s.stories.q132.knowledge.party=['unwritten'],s=>s.stories.q132.revision=99,s=>(s.flags.legacyStoryRoutes??={}).q132=true]){
  const raw=JSON.parse(old.save());mutate(raw.state);assert.throws(()=>g.load(JSON.stringify(raw)));assert.equal(g.save(),before);
 }
 const raw=JSON.parse(before);raw.state.stories.q132.values.managerAt='nowhere';assert.throws(()=>g.load(JSON.stringify(raw)));assert.equal(g.save(),before);
});

test('q132 migration composes with older q038 and q039 revisions while preserving a current q131',()=>{
 const oldData={...previousQ132Data,quests:{...previousQ132Data.quests,q038:previousQ038,q039:previousQ039},scripts:{...previousQ132Data.scripts,...previousQ038.scripts,...previousQ039.scripts}};
 const old=new GameEngine(oldData);old.load(ready().save());old.random=()=>.999999;
 start(old,'q131');for(const id of ['test','sample','finish'])choose(old,'q131',id);
 start(old,'q038');for(const id of ['sample','filter','finish'])choose(old,'q038',id);
 start(old,'q039');for(const id of ['gather','copies'])choose(old,'q039',id);
 start(old,'q132');choose(old,'q132','room');assert.ok(old.dispatch({type:'choose',id:'decoy'}));drain(old);
 const raw=old.save(),expected=upgradedQ038Save(JSON.stringify(upgradedQ132Save(raw)));expected.state.stories.q039.revision=2;Object.assign(expected.state.stories.q039.values,{repairerAt:'entry',claimantsAt:'entry'});
 const g=new GameEngine(data);g.load(raw);assert.deepEqual(JSON.parse(g.save()),expected);checkpoint(g);go(g,data.quests.q132.story.worldPlaces.seal);drain(g);choose(g,'q132','seal');assert.equal(g.state.stories.q131.values.teacherAt,'room');
});

for(const layout of ['classic','scene'])test(layout+': q132 shows only the present manager and keeps accepted old routes portrait-free',async()=>{
 const dom=installDOM();let view;
 try{for(const f of (await fixtures()).fixtures){const g=new GameEngine(data);g.load(f.save);view=replaceView(view,layout,dom.root,intent=>g.dispatch(intent),{status(){},menu(){},help(){},soundEnabled:()=>false,effectsMode:()=> 'off'});view.render(projectGame(g));assert.equal(dom.root.querySelectorAll('[data-character]').length,f.cast.length);
  for(const id of f.cast){const person=dom.root.querySelector(`[data-character="${id}"]`);assert.ok(person.textContent.includes(data.characters[id].name));assert.equal(person.querySelector('img').src,data.assets.images['npc_'+id]);}
 }}finally{view?.destroy();dom.restore();}
});
