import test from 'node:test';
import assert from 'node:assert/strict';
import {projectGame} from '../src/application/projection.js';
import {data,go,drain,checkpoint} from './royal-helpers.mjs';
import {previousQ190,q190Routes,q190AcceptedRoutes,q190People,q190Cast,q190Engine,q190AcceptedEngine,loadQ190,resolveQ190,chooseQ190,postwarArtFixtures} from '../tools/postwar-art-fixtures.mjs';

test('q190 adds only three character links and nineteen scene casts, preserving revision one and all existing content',()=>{
 const q=structuredClone(data.quests.q190);assert.equal(q.story.revision,1);assert.equal(q.model.edition.revision,1);assert.equal(q.model.storyUpgrades,undefined);
 for(const id of ['fuu','villagers','collectors']){assert.equal(q.story.entities[id].character,'q190_'+id);delete q.story.entities[id].character;assert.equal(data.characters['q190_'+id].portrait,undefined);assert.equal(data.characters['q190_'+id].sprite,undefined);}
 for(const s of Object.values(q.story.scenes))s.cast=[];
 assert.deepEqual(q,previousQ190);
});

test('q190 current and previous saves preserve nineteen scenes, seventeen journeys, dialogue, battle and completed checkpoints',()=>{
 const scenes=new Set(),journeys=new Set(),phases=new Set();
 const observe=g=>{const raw=g.save(),now=loadQ190(raw),before=projectGame(g).dialog,after=projectGame(now).dialog;assert.equal(now.save(),raw);assert.equal(g.save(),raw);assert.equal(after?.text,before?.text);assert.deepEqual(after?.options,before?.options);
  phases.add(g.state.battle?'battle':g.state.journey?'journey':g.state.quests.q190.stage==='completed'?'completed':g.state.waiting?.type);
  const s=now.state.stories.q190;if(s.scene)scenes.add(s.scene);if(after?.scene)assert.deepEqual(after.scene.cast.map(c=>c.id),q190Cast(s.scene));
  if(now.state.journey){const a=data.quests.q190.story.actions[now.state.journey.action];journeys.add(now.state.journey.action);assert.equal(s.scene,null);assert.equal(after?.scene,undefined);assert.equal(now.dispatch({type:'story.resume',quest:'q190'}),false);for(const who of a.journey.companions)assert.equal(s.values[who+'At'],'transit');now.random=()=>.999999;go(now,data.quests.q190.story.worldPlaces[a.journey.to]);drain(now);checkpoint(now);assert.equal(now.state.journey,null);for(const who of a.journey.companions)assert.equal(now.state.stories.q190.values[who+'At'],a.journey.to);}
 };
 for(const legacy of [false,true])for(const route of q190Routes){const g=q190Engine({legacy});observe(g);for(const id of route.path){assert.ok(g.dispatch({type:'choose',id}));observe(g);drain(g);observe(g);if(g.state.battle)resolveQ190(g,route.result??'win',{observe});if(g.state.journey){const a=g.data.quests.q190.story.actions[g.state.journey.action];go(g,g.data.quests.q190.story.worldPlaces[a.journey.to]);observe(g);drain(g);observe(g);}}assert.equal(g.state.quests.q190.outcome,route.outcome);}
 assert.equal(scenes.size,19);assert.equal(journeys.size,17);for(const phase of ['text','choice','journey','battle','completed'])assert.ok(phases.has(phase),phase);
});

test('q190 all six sealing orders and early storage checks retain collection gates, three crystal transfers and one reward',()=>{
 const gates=new Set();
 for(const legacy of [false,true])for(const route of q190Routes){const g=loadQ190(q190Engine({legacy}).save()),members=[...g.state.members];let rewards=0;const award=g.award.bind(g);g.award=(gold,xp,who)=>{if(gold===153&&xp===99)rewards++;return award(gold,xp,who);};const v=()=>g.state.stories.q190.values;
  for(const id of route.path){const scene=g.state.stories.q190.scene;assert.equal(rewards,0);for(const who of q190People(scene))assert.equal(v()[who+'At'],data.quests.q190.story.scenes[scene].place);
   if(scene==='cleanup'){gates.add(v().sites+'-'+v().store);assert.equal(v().sites,[1,2,3].filter(i=>v()['sealed'+i]).length);if(!(v().sites===3&&v().store)){const raw=g.save();assert.equal(g.dispatch({type:'choose',id:'collect'}),false);assert.equal(g.save(),raw);}}
   if(scene==='select_site')for(let i=1;i<=3;i++)if(v()['sealed'+i]){const raw=g.save();assert.equal(g.dispatch({type:'choose',id:'site'+i}),false);assert.equal(g.save(),raw);}
   const collectedIndex=/^collect[123]$/.test(scene)?Number(scene.at(-1)):0;
   if(collectedIndex)for(let i=1;i<=3;i++)assert.equal(v()['crystal'+i+'At'],i<collectedIndex?'party':'site'+i);
   if(scene==='collected')for(let i=1;i<=3;i++)assert.equal(v()['crystal'+i+'At'],'party');
   const sites=v().sites;assert.ok(g.dispatch({type:'choose',id}));drain(g);
   if(id==='seal'){assert.equal(v().sites,sites+1);assert.equal(v()['sealed'+scene.at(-1)],true);assert.equal(v()['crystal'+scene.at(-1)+'At'],scene);const raw=g.save();assert.equal(g.dispatch({type:'choose',id:'seal'}),false);assert.equal(g.save(),raw);}
   if(g.state.battle)resolveQ190(g,route.result??'win');
   if(g.state.journey){const a=data.quests.q190.story.actions[g.state.journey.action];if(collectedIndex){assert.equal(v()['crystal'+collectedIndex+'At'],'party');assert.equal(v().collectorsAt,'transit');assert.equal(v().fuuAt,'transit');assert.equal(v().villagersAt,'entry');}go(g,data.quests.q190.story.worldPlaces[a.journey.to]);drain(g);}
   checkpoint(g);
  }
  assert.equal(rewards,1);assert.deepEqual(g.state.members,members);assert.equal(v().resolution,route.outcome);assert.equal(v().villagersAt,route.outcome==='evac'?'refuge':'entry');assert.equal(v().collectorsAt,'store');assert.equal(v().fuuAt,route.outcome==='evac'?'refuge':route.outcome==='collect'?'store':'entry');for(let i=1;i<=3;i++)assert.equal(v()['crystal'+i+'At'],route.outcome==='collect'?'store':'site'+i);
  const raw=g.save();assert.throws(()=>g.complete('q190',route.outcome));assert.equal(g.save(),raw);g.run(data.quests.q190.model.entryScript);drain(g);assert.equal(rewards,1);
 }
 assert.equal(gates.size,8);
});

test('q190 pending battle saves preserve victory at the outer village and leave residents and collectors behind',()=>{
 for(const legacy of [false,true]){const old=q190Engine({legacy});chooseQ190(old,'battle');assert.ok(old.dispatch({type:'choose',id:'battle'}));drain(old);assert.ok(old.state.battle);const g=loadQ190(old.save());resolveQ190(g,'win');assert.equal(g.state.stories.q190.scene,'defend_battle_ready');assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['q190_fuu']);assert.equal(g.state.stories.q190.values.fuuAt,'battle');assert.equal(g.state.stories.q190.values.villagersAt,'entry');assert.equal(g.state.stories.q190.values.collectorsAt,'store');assert.equal(g.state.journey,null);chooseQ190(g,'continue');assert.equal(g.state.stories.q190.scene,'cleanup');assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['q190_fuu']);chooseQ190(g,'only');assert.equal(g.state.quests.q190.outcome,'only');}
});

test('q190 escape and loss resume old pending battles, block a retry, and evacuate only after rejoining Fuu',()=>{
 for(const legacy of [false,true])for(const result of ['escape','lose']){const old=q190Engine({legacy});chooseQ190(old,'battle');assert.ok(old.dispatch({type:'choose',id:'battle'}));drain(old);const g=loadQ190(old.save());resolveQ190(g,result,{observe:state=>{if(result==='lose'&&state.state.mode==='town'){assert.equal(state.state.townLocation,'oddland_village');assert.equal(state.dispatch({type:'story.resume',quest:'q190'}),false);assert.equal(projectGame(state).dialog?.scene,undefined);}}});assert.equal(g.state.flags.relocatedBattleResult.q190,result);assert.equal(g.state.stories.q190.scene,'defend');assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['q190_fuu']);const raw=g.save();assert.equal(g.dispatch({type:'choose',id:'battle'}),false);assert.equal(g.save(),raw);for(const id of ['evac','escort','finish'])chooseQ190(g,id);assert.equal(g.state.quests.q190.outcome,'evac');for(let i=1;i<=3;i++)assert.equal(g.state.stories.q190.values['crystal'+i+'At'],'site'+i);}
});

test('q190 accepted pre-relocation saves preserve two scenes, all battle results and direct endings',()=>{
 for(const route of q190AcceptedRoutes){let g=loadQ190(q190AcceptedEngine().save());let rewards=0;const award=g.award.bind(g);g.award=(gold,xp,who)=>{if(gold===153&&xp===99)rewards++;return award(gold,xp,who);};for(const id of route.path){loadQ190(g.save());assert.ok(g.dispatch({type:'choose',id}));drain(g);if(g.state.battle)resolveQ190(g,route.result??'win');assert.equal(g.state.stories.q190,undefined);assert.equal(g.state.journey,null);assert.equal(projectGame(g).dialog?.scene,undefined);checkpoint(g);}assert.equal(g.state.quests.q190.outcome,route.outcome);assert.equal(rewards,1);loadQ190(g.save());}
});

test('q190 malformed saves fail atomically while valid revision-one saves remain byte-for-byte compatible',()=>{
 const g=q190Engine(),raw=g.save();for(const input of [raw,q190Engine({legacy:true}).save()])for(const mutate of [s=>s.stories.q190.values.fuuAt='store',s=>s.stories.q190.values.crystal1At='invented',s=>s.stories.q190.values.sites=4,s=>delete s.stories.q190.values.collectorsAt,s=>s.stories.q190.revision=2,s=>(s.flags.legacyStoryRoutes??={}).q190=true]){const saved=JSON.parse(input);mutate(saved.state);assert.throws(()=>g.load(JSON.stringify(saved)));assert.equal(g.save(),raw);}
});

test('q190 browser checkpoints cover all scenes, eight collection gates, failed battles and accepted legacy routes',async()=>{
 const r=await postwarArtFixtures();assert.equal(r.fixtures.length,60);assert.equal(r.outcomes.length,3);assert.equal(new Set(r.fixtures.map(f=>f.scene+'/'+f.variant)).size,60);assert.equal(r.fixtures.filter(f=>f.absentStoryScene).length,2);
 for(const f of r.fixtures){const d=projectGame(loadQ190(f.save)).dialog;assert.equal(d.text,f.expectedText);if(f.absentStoryScene)assert.equal(d.scene,undefined);else assert.deepEqual(d.scene.cast.map(c=>c.id),f.cast);}
});
