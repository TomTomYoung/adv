import test from 'node:test';
import assert from 'node:assert/strict';
import {projectGame} from '../src/application/projection.js';
import {data,go,drain,checkpoint} from './royal-helpers.mjs';
import {previousQ185,q185Routes,q185AcceptedRoutes,q185People,q185Cast,q185Engine,q185AcceptedEngine,loadQ185,resolveQ185,chooseQ185,bridgeArtFixtures} from '../tools/bridge-art-fixtures.mjs';
const oldEarly='橋を閉じ、自軍を先に退く。通れなかった組の位置を救援の受付へ届ける。';
const newEarly='橋を閉じて自軍を先に退く方針を決めた。通れなかった組の位置を救援の受付へ届ける。';
test('q185 adds only four character links, casts and pre-closure prose while retaining revision one',()=>{
 const q=structuredClone(data.quests.q185);assert.equal(q.story.revision,1);assert.equal(q.model.edition.revision,1);assert.equal(q.model.storyUpgrades,undefined);
 for(const id of ['nev','troops','families','unarmed']){assert.equal(q.story.entities[id].character,'q185_'+id);delete q.story.entities[id].character;assert.equal(data.characters['q185_'+id].portrait,undefined);assert.equal(data.characters['q185_'+id].sprite,undefined);}
 for(const s of Object.values(q.story.scenes))s.cast=[];
 assert.ok(JSON.stringify(q).includes(newEarly));assert.deepEqual(JSON.parse(JSON.stringify(q).replaceAll(newEarly,oldEarly)),previousQ185);
});
test('q185 preserves current and old saves through all scenes, journeys, waiting phases and battle recovery',()=>{
 const scenes=new Set(),journeys=new Set(),phases=new Set();
 const observe=g=>{const raw=g.save(),now=loadQ185(raw),before=projectGame(g).dialog,after=projectGame(now).dialog;assert.equal(now.save(),raw);assert.equal(after?.text,before?.text);assert.deepEqual(after?.options,before?.options);phases.add(g.state.battle?'battle':g.state.journey?'journey':g.state.quests.q185.stage==='completed'?'completed':g.state.waiting?.type);
  if(g.state.stories.q185.scene)scenes.add(g.state.stories.q185.scene);
  if(after?.scene)assert.deepEqual(after.scene.cast.map(c=>c.id),q185Cast(now.state.stories.q185.scene));
  if(now.state.journey){const j=now.state.journey,a=data.quests.q185.story.actions[j.action],v=now.state.stories.q185.values;journeys.add(j.action);assert.equal(now.state.stories.q185.scene,null);assert.equal(after?.scene,undefined);assert.equal(now.dispatch({type:'story.resume',quest:'q185'}),false);for(const who of a.journey.companions)assert.equal(v[who+'At'],'transit');assert.equal(v.weaponsAt,'near');now.random=()=>.999999;go(now,data.quests.q185.story.worldPlaces[a.journey.to]);drain(now);checkpoint(now);assert.equal(now.state.journey,null);for(const who of a.journey.companions)assert.equal(now.state.stories.q185.values[who+'At'],a.journey.to);}
 };
 for(const legacy of [false,true])for(const route of q185Routes){const g=q185Engine({legacy});observe(g);for(const id of route.path){assert.ok(g.dispatch({type:'choose',id}));observe(g);drain(g);observe(g);if(g.state.battle)resolveQ185(g,route.result??'win',{observe});if(g.state.journey){const a=g.data.quests.q185.story.actions[g.state.journey.action];go(g,g.data.quests.q185.story.worldPlaces[a.journey.to]);observe(g);drain(g);observe(g);}}assert.equal(g.state.quests.q185.outcome,route.outcome);}
 assert.equal(scenes.size,13);assert.equal(journeys.size,11);for(const p of ['text','choice','journey','battle','completed'])assert.ok(phases.has(p),p);
});
test('q185 crossings preserve people, weapons, one boat payment, closure timing and one quest reward',()=>{
 for(const legacy of [false,true])for(const route of q185Routes){const g=loadQ185(q185Engine({legacy}).save());g.random=()=>.999999;const inventory=structuredClone(g.state.inventory),members=[...g.state.members];let rewards=0,payments=0;const award=g.award.bind(g);g.award=(gold,xp,who)=>{if(gold===153&&xp===99)rewards++;return award(gold,xp,who);};const v=()=>g.state.stories.q185.values;
  for(const id of route.path){const scene=g.state.stories.q185.scene,gold=g.state.gold;assert.equal(v().closed,scene==='early_done');assert.equal(v().weaponsAt,'near');assert.equal(v().boatPaid,payments===1);for(const who of q185People(scene))assert.equal(v()[who+'At'],data.quests.q185.story.scenes[scene].place);
   assert.ok(g.dispatch({type:'choose',id}));drain(g);if(id==='pay'){payments++;assert.equal(g.state.gold,gold-40);assert.equal(v().boatPaid,true);const raw=g.save();assert.equal(g.dispatch({type:'choose',id:'pay'}),false);assert.equal(g.save(),raw);}
   if(id==='back')assert.equal(g.state.gold,gold);
   if(g.state.battle)resolveQ185(g,route.result??'win');
   if(g.state.journey){const action=g.state.journey.action,a=data.quests.q185.story.actions[action];assert.equal(v().closed,action==='early_report');assert.equal(v().boatAt,action==='board_cross'?'transit':scene==='landed'?'landing':'dock');go(g,data.quests.q185.story.worldPlaces[a.journey.to]);drain(g);}
   checkpoint(g);
  }
  const destination=route.outcome==='families'?'bank':route.outcome==='boat'?'landing':'near';for(const who of ['families','carts','unarmed'])assert.equal(v()[who+'At'],destination);for(const who of ['nev','troops'])assert.equal(v()[who+'At'],route.outcome==='early'?'report':'entry');assert.equal(v().weaponsAt,'near');assert.equal(v().boatAt,route.outcome==='boat'?'landing':'dock');assert.equal(v().closed,true);assert.equal(payments,route.outcome==='boat'?1:0);assert.equal(rewards,1);assert.deepEqual(g.state.inventory,inventory);assert.deepEqual(g.state.members,members);
  const raw=g.save();assert.throws(()=>g.complete('q185',route.outcome));assert.equal(g.save(),raw);g.run(data.quests.q185.model.entryScript);drain(g);assert.equal(rewards,1);
 }
});
test('q185 insufficient gold and free return preserve an unclosed bridge and let the party choose another route',()=>{
 for(const legacy of [false,true]){const g=loadQ185(q185Engine({legacy}).save());g.random=()=>.999999;chooseQ185(g,'boat');g.state.gold=39;const raw=g.save();assert.equal(g.dispatch({type:'choose',id:'pay'}),false);assert.equal(g.save(),raw);chooseQ185(g,'back');assert.equal(g.state.gold,39);assert.equal(g.state.stories.q185.values.boatPaid,false);assert.equal(g.state.stories.q185.values.closed,false);for(const id of ['early','report','finish'])chooseQ185(g,id);assert.equal(g.state.quests.q185.outcome,'early');assert.equal(g.state.gold,192);}
});
test('q185 escape and loss survive a pending-battle save, disable fighting again, and retain early evacuation',()=>{
 for(const legacy of [false,true])for(const result of ['escape','lose']){const old=q185Engine({legacy});chooseQ185(old,'hold');assert.ok(old.dispatch({type:'choose',id:'battle'}));drain(old);assert.ok(old.state.battle);const g=loadQ185(old.save());resolveQ185(g,result);assert.equal(g.state.flags.relocatedBattleResult.q185,result);assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),q185Cast('guard'));const raw=g.save();assert.equal(g.dispatch({type:'choose',id:'battle'}),false);assert.equal(g.save(),raw);for(const id of ['early','report','finish'])chooseQ185(g,id);assert.equal(g.state.quests.q185.outcome,'early');assert.equal(g.state.stories.q185.values.familiesAt,'near');}
});
test('q185 accepted pre-relocation saves keep all battle results and direct endings with only the original boat cost',()=>{
 for(const route of q185AcceptedRoutes){let g=loadQ185(q185AcceptedEngine().save());const gold=g.state.gold;assert.ok(g.dispatch({type:'choose',id:route.choice}));drain(g);if(g.state.battle){g=loadQ185(g.save());resolveQ185(g,route.result);}assert.equal(g.state.quests.q185.outcome,route.outcome);assert.equal(g.state.stories.q185,undefined);assert.equal(g.state.journey,null);assert.equal(projectGame(g).dialog?.scene,undefined);if(route.choice!=='hold')assert.equal(g.state.gold,gold+153-(route.choice==='boat'?40:0));checkpoint(g);}
});
test('q185 malformed saves reject atomically without weakening co-location or revision-one compatibility',()=>{
 const g=q185Engine(),raw=g.save();for(const input of [raw,q185Engine({legacy:true}).save()])for(const mutate of [s=>s.stories.q185.values.nevAt='dock',s=>s.stories.q185.values.boatAt='invented',s=>s.stories.q185.revision=2,s=>delete s.stories.q185.values.unarmedAt,s=>(s.flags.legacyStoryRoutes??={}).q185=true]){const saved=JSON.parse(input);mutate(saved.state);assert.throws(()=>g.load(JSON.stringify(saved)));assert.equal(g.save(),raw);}
});
test('q185 browser fixtures cover 13 scenes, failed battles, unaffordable boats and accepted legacy saves',async()=>{
 const r=await bridgeArtFixtures();assert.equal(r.fixtures.length,33);assert.equal(r.outcomes.length,3);assert.equal(new Set(r.fixtures.map(f=>f.scene+'/'+f.variant)).size,33);for(const f of r.fixtures){const dialog=projectGame(loadQ185(f.save)).dialog;assert.equal(dialog.text,f.expectedText);if(f.absentStoryScene)assert.equal(dialog.scene,undefined);else assert.deepEqual(dialog.scene.cast.map(c=>c.id),f.cast);}assert.equal(r.fixtures.filter(f=>f.blockedChoice).length,6);
});
