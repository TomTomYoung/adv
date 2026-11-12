import test from 'node:test';
import assert from 'node:assert/strict';
import {projectGame} from '../src/application/projection.js';
import {data,go,drain,checkpoint} from './royal-helpers.mjs';
import {previousQ189,q189Routes,q189AcceptedRoutes,q189Cast,q189Engine,q189AcceptedEngine,loadQ189,chooseQ189,lullabyArtFixtures} from '../tools/lullaby-art-fixtures.mjs';

test('q189 adds Asa and three displayed roles while preserving prose, item holders, eight journeys and four endings',()=>{
 const q=structuredClone(data.quests.q189);assert.equal(q.story.revision,2);assert.equal(q.model.edition.revision,2);
 assert.deepEqual(q.model.storyUpgrades[0],{fromRevision:1,toRevision:2,previous:previousQ189.story,values:[{key:'asaAt',value:{ref:'stories.q189.values.refugeesAt'}}]});
 for(const key of Object.keys(previousQ189.story.registry))assert.deepEqual(q.story.registry[key],previousQ189.story.registry[key]);
 assert.deepEqual(q.story.registry.asaAt.values,['entry','private','transit']);
 delete q.story.entities.asa;delete q.story.registry.asaAt;
 for(const id of ['refugees','warden'])delete q.story.entities[id].character;
 for(const s of Object.values(q.story.scenes))s.cast=[];
 for(const key of ['entry_private','private_permission_escort']){assert.deepEqual(q.story.actions[key].journey.companions,['refugees','asa']);q.story.actions[key].journey.companions=['refugees'];q.story.actions[key].effects.find(e=>e.op==='move').entities=['party','refugees'];}
 assert.equal(q.story.invariants.pop().id,'asa_with_refugees');delete q.model.storyUpgrades;q.story.revision=q.model.edition.revision=1;
 assert.deepEqual(q,previousQ189);
 for(const id of ['asa','refugees','warden']){assert.equal(data.characters['q189_'+id].portrait,undefined);assert.equal(data.characters['q189_'+id].sprite,undefined);}
});

test('q189 current and revision-one saves resume all scenes, eight journeys, dialogue phases and completed results',()=>{
 const scenes=new Set(),journeys=new Set(),phases=new Set();
 const observe=g=>{const raw=g.save(),now=loadQ189(raw),before=projectGame(g).dialog,after=projectGame(now).dialog;
  assert.equal(g.save(),raw);assert.equal(after?.text,before?.text);assert.deepEqual(after?.options,before?.options);
  phases.add(g.state.journey?'journey':g.state.quests.q189.stage==='completed'?'completed':g.state.waiting?.type);
  const s=now.state.stories.q189;assert.equal(s.values.asaAt,s.values.refugeesAt);if(s.scene)scenes.add(s.scene);if(after?.scene)assert.deepEqual(after.scene.cast.map(c=>c.id),q189Cast(s.scene));
  if(now.state.journey){const a=data.quests.q189.story.actions[now.state.journey.action];journeys.add(now.state.journey.action);assert.equal(s.scene,null);assert.equal(after?.scene,undefined);assert.equal(now.dispatch({type:'story.resume',quest:'q189'}),false);for(const who of a.journey.companions)assert.equal(s.values[who+'At'],'transit');now.random=()=>.999999;go(now,data.quests.q189.story.worldPlaces[a.journey.to]);drain(now);checkpoint(now);assert.equal(now.state.journey,null);for(const who of a.journey.companions)assert.equal(now.state.stories.q189.values[who+'At'],a.journey.to);assert.equal(now.state.stories.q189.values.asaAt,now.state.stories.q189.values.refugeesAt);}
 };
 for(const legacy of [false,true])for(const route of q189Routes){const g=q189Engine({legacy});observe(g);for(const id of route.path){assert.ok(g.dispatch({type:'choose',id}));observe(g);drain(g);observe(g);if(g.state.journey){const a=g.data.quests.q189.story.actions[g.state.journey.action];go(g,g.data.quests.q189.story.worldPlaces[a.journey.to]);observe(g);drain(g);observe(g);}}assert.equal(g.state.quests.q189.outcome,route.outcome);}
 assert.equal(scenes.size,8);assert.equal(journeys.size,8);for(const p of ['text','choice','journey','completed'])assert.ok(phases.has(p),p);
});

test('q189 archive visit leaves the refugees and warden behind and transfers the songbook exactly at departure',()=>{
 for(const legacy of [false,true]){const g=loadQ189(q189Engine({legacy}).save()),v=()=>g.state.stories.q189.values;
  chooseQ189(g,'book');assert.equal(v().asaAt,'entry');assert.equal(v().refugeesAt,'entry');assert.equal(v().wardenAt,'entry');assert.equal(v().songbookAt,'archive');assert.deepEqual(projectGame(g).dialog.scene.cast,[]);
  assert.ok(g.dispatch({type:'choose',id:'public'}));drain(g);assert.ok(g.state.journey);assert.equal(v().songbookAt,'party');assert.equal(v().wardenAt,'entry');
  const saved=loadQ189(g.save());assert.equal(saved.state.stories.q189.values.songbookAt,'party');
  go(g,data.quests.q189.story.worldPlaces.entry);drain(g);assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),q189Cast('explanation'));assert.equal(v().songbookAt,'party');
  assert.ok(g.dispatch({type:'choose',id:'report'}));drain(g);assert.equal(v().songbookAt,'warden');assert.equal(v().wardenAt,'transit');assert.equal(v().asaAt,'entry');assert.equal(v().refugeesAt,'entry');
  go(g,data.quests.q189.story.worldPlaces.guard);drain(g);assert.equal(v().wardenAt,'guard');assert.equal(v().songbookAt,'warden');assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['q189_warden']);chooseQ189(g,'finish');assert.equal(g.state.quests.q189.outcome,'explain');
 }
});

test('q189 private use moves Asa with the refugees, leaves the warden behind and never takes the songbook',()=>{
 for(const legacy of [false,true])for(const research of [false,true]){const g=loadQ189(q189Engine({legacy}).save()),v=()=>g.state.stories.q189.values;
  if(research){chooseQ189(g,'book');chooseQ189(g,'private');assert.equal(g.state.stories.q189.scene,'private_permission');assert.equal(v().asaAt,'entry');}
  assert.ok(g.dispatch({type:'choose',id:research?'escort':'private'}));drain(g);assert.equal(v().asaAt,'transit');assert.equal(v().refugeesAt,'transit');assert.equal(v().wardenAt,'entry');assert.equal(v().songbookAt,'archive');
  go(g,data.quests.q189.story.worldPlaces.private);drain(g);assert.equal(v().asaAt,'private');assert.equal(v().refugeesAt,'private');assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['q189_asa','q189_refugees']);chooseQ189(g,'finish');assert.equal(g.state.quests.q189.outcome,'private');loadQ189(g.save());
 }
});

test('q189 all five paths preserve one-time rewards, inventory, party and the distinction between ban, hold and explanation',()=>{
 for(const legacy of [false,true])for(const route of q189Routes){const g=loadQ189(q189Engine({legacy}).save()),gold=g.state.gold,inventory=structuredClone(g.state.inventory),members=[...g.state.members];let rewards=0;const award=g.award.bind(g);g.award=(gp,xp,who)=>{assert.deepEqual([gp,xp],[153,99]);rewards++;return award(gp,xp,who);};
  for(const id of route.path){assert.equal(rewards,0);chooseQ189(g,id);}assert.equal(g.state.quests.q189.outcome,route.outcome);assert.equal(g.state.stories.q189.values.resolution,route.outcome);assert.equal(g.state.gold,gold+153);assert.equal(rewards,1);assert.deepEqual(g.state.inventory,inventory);assert.deepEqual(g.state.members,members);
  if(['hold','ban'].includes(route.outcome)){const v=g.state.stories.q189.values;assert.equal(v.asaAt,'entry');assert.equal(v.refugeesAt,'entry');assert.equal(v.wardenAt,'guard');assert.equal(v.songbookAt,'archive');}
  const raw=g.save();assert.throws(()=>g.complete('q189',route.outcome));assert.equal(g.save(),raw);g.run(data.quests.q189.model.entryScript);drain(g);assert.equal(rewards,1);
 }
});

test('q189 rejects invalid holders, missing or separated Asa locations and conflicting legacy routes atomically',()=>{
 const g=q189Engine(),raw=g.save(),old=q189Engine({legacy:true}).save();
 for(const input of [raw,old])for(const mutate of [s=>s.stories.q189.values.songbookAt='asa',s=>s.stories.q189.revision=3,s=>(s.flags.legacyStoryRoutes??={}).q189=true]){const saved=JSON.parse(input);mutate(saved.state);assert.throws(()=>g.load(JSON.stringify(saved)));assert.equal(g.save(),raw);}
 for(const value of [undefined,'guard','private','transit']){const saved=JSON.parse(raw);if(value===undefined)delete saved.state.stories.q189.values.asaAt;else saved.state.stories.q189.values.asaAt=value;assert.throws(()=>g.load(JSON.stringify(saved)));assert.equal(g.save(),raw);}
});

test('q189 pre-relocation accepted saves keep both scenes and all five paths to four direct endings',()=>{
 for(const route of q189AcceptedRoutes){const g=loadQ189(q189AcceptedEngine().save());let rewards=0;const award=g.award.bind(g);g.award=(gold,xp,who)=>{assert.deepEqual([gold,xp],[153,99]);rewards++;return award(gold,xp,who);};for(const id of route.path){loadQ189(g.save());assert.ok(g.dispatch({type:'choose',id}));drain(g);assert.equal(g.state.journey,null);assert.equal(g.state.stories.q189,undefined);assert.equal(projectGame(g).dialog?.scene,undefined);checkpoint(g);}assert.equal(g.state.quests.q189.outcome,route.outcome);assert.equal(rewards,1);loadQ189(g.save());}
});

test('q189 browser checkpoints cover all eight scenes with current and previous saves plus both accepted legacy scenes',async()=>{
 const r=await lullabyArtFixtures();assert.equal(r.fixtures.length,18);assert.equal(r.outcomes.length,4);assert.equal(new Set(r.fixtures.map(f=>f.scene+'/'+f.variant)).size,18);assert.equal(r.fixtures.filter(f=>f.absentStoryScene).length,2);
 for(const f of r.fixtures){const d=projectGame(loadQ189(f.save)).dialog;assert.equal(d.text,f.expectedText);if(f.absentStoryScene)assert.equal(d.scene,undefined);else assert.deepEqual(d.scene.cast.map(c=>c.id),f.cast);}
});
