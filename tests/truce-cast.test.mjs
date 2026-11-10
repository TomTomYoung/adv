import test from 'node:test';
import assert from 'node:assert/strict';
import {projectGame} from '../src/application/projection.js';
import {data,go,drain,checkpoint} from './royal-helpers.mjs';
import {previousQ186,q186Routes,q186AcceptedRoutes,q186People,q186Cast,q186Engine,q186AcceptedEngine,loadQ186,resolveQ186,chooseQ186,truceArtFixtures} from '../tools/truce-art-fixtures.mjs';

test('q186 only adds four existing character links and seven casts, preserving prose, revision, domains and actions',()=>{
 const q=structuredClone(data.quests.q186);assert.equal(q.story.revision,1);assert.equal(q.model.edition.revision,1);assert.equal(q.model.storyUpgrades,undefined);
 for(const id of ['communicator','ours','theirs','captives']){assert.equal(q.story.entities[id].character,'q186_'+id);delete q.story.entities[id].character;assert.equal(data.characters['q186_'+id].portrait,undefined);assert.equal(data.characters['q186_'+id].sprite,undefined);}
 assert.equal(Object.values(q.story.scenes).filter(s=>s.cast.length).length,7);for(const s of Object.values(q.story.scenes))s.cast=[];assert.deepEqual(q,previousQ186);
});

test('q186 current and previous saves preserve all scenes, journeys, pending battles, dialogue and completion',()=>{
 const scenes=new Set(),journeys=new Set(),phases=new Set();
 const observe=g=>{const raw=g.save(),now=loadQ186(raw),before=projectGame(g).dialog,after=projectGame(now).dialog;assert.equal(now.save(),raw);assert.equal(g.save(),raw);assert.equal(after?.text,before?.text);assert.deepEqual(after?.options,before?.options);
  phases.add(g.state.journey?'journey':g.state.quests.q186.stage==='completed'?'completed':g.state.battle?'battle':g.state.waiting?.type);
  if(g.state.stories.q186.scene)scenes.add(g.state.stories.q186.scene);
  if(after?.scene)assert.deepEqual(after.scene.cast.map(c=>c.id),q186Cast(now.state.stories.q186.scene));
  if(now.state.journey){const a=data.quests.q186.story.actions[now.state.journey.action],v=now.state.stories.q186.values;journeys.add(now.state.journey.action);assert.equal(now.state.stories.q186.scene,null);assert.equal(after?.scene,undefined);assert.equal(now.dispatch({type:'story.resume',quest:'q186'}),false);for(const who of a.journey.companions)assert.equal(v[who+'At'],'transit');assert.equal(v.communicatorAt,'parley');now.random=()=>.999999;go(now,data.quests.q186.story.worldPlaces[a.journey.to]);drain(now);checkpoint(now);assert.equal(now.state.journey,null);for(const who of a.journey.companions)assert.equal(now.state.stories.q186.values[who+'At'],a.journey.to);}
 };
 for(const legacy of [false,true])for(const route of q186Routes){const g=q186Engine({legacy});let battles=0;observe(g);for(const id of route.path){assert.ok(g.dispatch({type:'choose',id}));observe(g);drain(g);observe(g);if(g.state.battle)resolveQ186(g,route.battles?.[battles++]??'win',{observe});if(g.state.journey){const a=g.data.quests.q186.story.actions[g.state.journey.action];go(g,g.data.quests.q186.story.worldPlaces[a.journey.to]);observe(g);drain(g);observe(g);}}assert.equal(g.state.quests.q186.outcome,route.outcome);}
 assert.equal(scenes.size,13);assert.equal(journeys.size,14);for(const phase of ['text','choice','journey','battle','completed'])assert.ok(phases.has(phase),phase);
});

test('q186 proxy, limited consent, supplies and exchanged groups change custody only at the authored departure or arrival',()=>{
 for(const legacy of [false,true])for(const limited of [false,true]){const g=loadQ186(q186Engine({legacy}).save());g.random=()=>.999999;const v=()=>g.state.stories.q186.values,inventory=structuredClone(g.state.inventory),members=[...g.state.members],gold=g.state.gold;let rewards=0;
  const award=g.award.bind(g);g.award=(gp,xp,who)=>{assert.deepEqual([gp,xp],[153,99]);rewards++;return award(gp,xp,who);};
  const step=(id,depart,arrive)=>{assert.ok(g.dispatch({type:'choose',id}));drain(g);depart?.();if(g.state.journey){const a=data.quests.q186.story.actions[g.state.journey.action];go(g,data.quests.q186.story.worldPlaces[a.journey.to]);drain(g);}arrive?.();checkpoint(g);};
  step('visit');assert.equal(v().localAgreed,false);assert.equal(v().proxyAt,'authority');
  if(limited){step('authority',()=>assert.equal(v().limited,false),()=>assert.equal(v().limited,true));assert.equal(v().localAgreed,false);
   step('limited',()=>{assert.equal(v().proxyAt,'party');assert.equal(v().localAgreed,false);},()=>{assert.equal(v().proxyAt,'communicator');assert.equal(v().communicatorAt,'parley');assert.equal(v().localAgreed,false);});}
  step(limited?'agree':'local',()=>assert.equal(v().localAgreed,true));assert.equal(v().suppliesAt,'entry');assert.equal(v().oursAt,'entry');
  step('escort',()=>{assert.equal(v().oursAt,'transit');assert.equal(v().theirsAt,'exchange');assert.equal(v().suppliesAt,limited?'entry':'party');},()=>{assert.equal(v().oursAt,'exchange');assert.equal(v().suppliesAt,limited?'entry':'exchange');});
  assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['q186_ours','q186_theirs']);
  step('return',()=>{assert.equal(v().theirsAt,'transit');assert.equal(v().oursAt,'exchange');},()=>{assert.equal(v().theirsAt,'entry');assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['q186_theirs']);});
  step('finish');assert.equal(g.state.quests.q186.outcome,'local');assert.equal(v().resolution,'local');assert.equal(v().communicatorAt,'parley');assert.equal(v().captivesAt,'fort');assert.equal(v().proxyAt,limited?'communicator':'authority');assert.equal(v().suppliesAt,limited?'entry':'exchange');assert.equal(g.state.gold,gold+153);assert.equal(rewards,1);assert.deepEqual(g.state.members,members);assert.deepEqual(g.state.inventory,inventory);
  const raw=g.save();assert.throws(()=>g.complete('q186','local'));assert.equal(g.save(),raw);g.run(data.quests.q186.model.entryScript);drain(g);assert.equal(rewards,1);
 }
});

test('q186 retreat leaves consent, supplies and people untouched, including the limited proxy that was never collected',()=>{
 for(const legacy of [false,true])for(const authority of [false,true]){const g=loadQ186(q186Engine({legacy}).save());chooseQ186(g,'visit');if(authority)chooseQ186(g,'authority');for(const id of ['withdraw','report','finish'])chooseQ186(g,id);const v=g.state.stories.q186.values;assert.equal(g.state.quests.q186.outcome,'withdraw');assert.equal(v.localAgreed,false);assert.equal(v.limited,authority);for(const [key,place] of Object.entries({proxyAt:'authority',suppliesAt:'entry',communicatorAt:'parley',oursAt:'entry',theirsAt:'exchange',captivesAt:'fort'}))assert.equal(v[key],place);}
});

test('q186 defeat permits a saved retry or return to negotiation; escape disables both and preserves withdrawal',()=>{
 for(const legacy of [false,true])for(const result of ['lose','escape']){const old=q186Engine({legacy});chooseQ186(old,'visit');chooseQ186(old,'break');assert.ok(old.dispatch({type:'choose',id:'battle'}));drain(old);assert.ok(old.state.battle);const g=loadQ186(old.save());resolveQ186(g,result);assert.equal(g.state.flags.relocatedBattleResult.q186,result);assert.deepEqual(projectGame(g).dialog.scene.cast,[]);assert.equal(g.state.stories.q186.values.captivesAt,'fort');
  if(result==='escape'){const raw=g.save();for(const id of ['battle','back']){assert.equal(g.dispatch({type:'choose',id}),false);assert.equal(g.save(),raw);}for(const id of ['withdraw','report','finish'])chooseQ186(g,id);assert.equal(g.state.quests.q186.outcome,'withdraw');}
  else {chooseQ186(g,'battle');assert.equal(g.state.stories.q186.scene,'assault_battle_ready');assert.deepEqual(projectGame(g).dialog.scene.cast,[]);assert.equal(g.state.stories.q186.values.captivesAt,'fort');chooseQ186(g,'continue');assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['q186_captives']);chooseQ186(g,'escort');assert.equal(g.state.stories.q186.values.captivesAt,'entry');assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['q186_captives']);chooseQ186(g,'finish');assert.equal(g.state.quests.q186.outcome,'battle');}
 }
});

test('q186 pre-relocation accepted saves keep two original scenes, direct endings and no journeys or new casts',()=>{
 for(const route of q186AcceptedRoutes){let g=loadQ186(q186AcceptedEngine().save());const inventory=structuredClone(g.state.inventory);let rewards=0;const award=g.award.bind(g);g.award=(gold,xp,who)=>{if(gold===153&&xp===99)rewards++;return award(gold,xp,who);};for(const id of route.path){assert.ok(g.dispatch({type:'choose',id}));drain(g);if(g.state.battle){loadQ186(g.save());resolveQ186(g,route.result);}assert.equal(g.state.journey,null);assert.equal(g.state.stories.q186,undefined);assert.equal(projectGame(g).dialog?.scene,undefined);checkpoint(g);}assert.equal(g.state.quests.q186.outcome,route.outcome);assert.equal(rewards,1);assert.deepEqual(g.state.inventory,inventory);}
});

test('q186 co-location and malformed save validation remain atomic for new and old states',()=>{
 const g=q186Engine();chooseQ186(g,'visit');const raw=g.save(),old=q186Engine({legacy:true});chooseQ186(old,'visit');
 for(const input of [raw,old.save()])for(const mutate of [s=>s.stories.q186.values.communicatorAt='entry',s=>s.stories.q186.values.proxyAt='invented',s=>s.stories.q186.revision=2,s=>delete s.stories.q186.values.theirsAt,s=>(s.flags.legacyStoryRoutes??={}).q186=true]){const saved=JSON.parse(input);mutate(saved.state);assert.throws(()=>g.load(JSON.stringify(saved)));assert.equal(g.save(),raw);}
});

test('q186 browser checkpoints preserve limited and direct exchanges, all thirteen scenes, failed battles and accepted saves',async()=>{
 const r=await truceArtFixtures();assert.equal(r.fixtures.length,42);assert.equal(r.outcomes.length,3);assert.equal(new Set(r.fixtures.map(f=>f.scene+'/'+f.variant)).size,r.fixtures.length);assert.equal(new Set(r.fixtures.filter(f=>!f.absentStoryScene).map(f=>f.scene)).size,13);
 for(const f of r.fixtures){const dialog=projectGame(loadQ186(f.save)).dialog;assert.equal(dialog.text,f.expectedText);if(f.absentStoryScene)assert.equal(dialog.scene,undefined);else assert.deepEqual(dialog.scene.cast.map(c=>c.id),f.cast);}
 for(const scene of ['gather','exchange','local_done'])assert.equal(r.fixtures.filter(f=>f.scene===scene).length,4);
 assert.equal(r.fixtures.filter(f=>f.blockedChoices?.length===2).length,2);assert.equal(r.fixtures.filter(f=>f.absentStoryScene).length,2);
});
