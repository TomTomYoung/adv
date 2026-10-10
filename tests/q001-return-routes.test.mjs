import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,drain,walk} from './helpers.mjs';
import {prepareQuest,finishJourney} from './structure-routes.mjs';
import {edgeBetween} from '../src/core/edge-layers.js';
import {nextQuestPlace} from '../src/core/quest-navigation.js';
import {dungeonRestrictionReason} from '../src/core/dungeon-restrictions.js';
import {fireContext,fireEnvironment} from '../src/core/systems/fire-network.js';
import {validateSave} from '../src/core/save.js';
import {projectGame} from '../src/application/projection.js';

const mapId='kagaribi_f1';
const north=[[13,2],[13,1],[12,1],[11,1],[10,1],[9,1]];
const south=[[13,4],[13,5]];
const choose=(g,id)=>{assert.ok(g.dispatch({type:'choose',id}),id);drain(g);};
const story=g=>g.state.stories.q001;
const point=g=>[g.state.location.x,g.state.location.y];
const nextPoint=g=>{const p=nextQuestPlace(g.data,g.state,'q001');return [p.x,p.y];};
const sceneMarkerPoints=g=>projectGame(g).dungeon.objects.filter(o=>o.kind==='decision').map(o=>[o.x,o.y]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
function roundtrip(g){const save=g.save();assert.deepEqual(validateSave(JSON.parse(save),g.data),[]);g.load(save);assert.equal(g.save(),save);}

// Take each real neighboring cell and stop at its conversation or battle. The
// general walk helper settles combat, which would conceal an early trigger here.
function step(g,x,y){
 const loc=g.state.location,dx=x-loc.x,dy=y-loc.y;
 assert.equal(Math.abs(dx)+Math.abs(dy),1,'test routes contain only adjacent steps');
 const facing=dx===1?'east':dx===-1?'west':dy===1?'south':'north';
 for(let turns=0;g.state.location.facing!==facing;turns++){
  assert.ok(turns<4);assert.ok(g.dispatch({type:'move',direction:'right'}));
 }
 assert.ok(g.dispatch({type:'move',direction:'forward'}));
 assert.deepEqual(point(g),[x,y]);drain(g);
}
function elder(){
 const g=prepareQuest('q001');g.random=()=>.999999;
 for(const id of ['talk','inspect','follow']){choose(g,id);finishJourney(g);}
 assert.equal(story(g).scene,'old');assert.deepEqual(point(g),[13,3]);
 assert.ok(dungeonRestrictionReason(g.state,'return'));return g;
}
function returning(){const g=elder();choose(g,'support');assert.equal(g.state.journey.action,'old_support');return g;}
function outbreak(g,route){
 const steps=g.state.steps;
 for(let i=0;i<route.length;i++){
  step(g,...route[i]);
  if(i<route.length-1){assert.equal(g.state.battle,null);assert.equal(g.state.waiting,null);assert.equal(g.state.journey.action,'old_support');}
 }
 assert.equal(g.state.steps,steps+route.length);
 assert.equal(g.state.battle?.encounter,'kuragari_hunt');
 assert.equal(g.state.battle.continuations.frame.script,'q001.v11.outage','all approaches use the authored forced battle');
 assert.equal(story(g).scene,'outage');assert.equal(g.state.journey,null);
 assert.equal(story(g).events.filter(id=>id==='old_support').length,1);
 assert.equal(fireContext(g.data,g.state).run.portable.fuel,0);
 assert.equal(g.state.objects[`${mapId}/q001_last_lamp`],'extinguished');
 assert.ok(dungeonRestrictionReason(g.state,'return'));return g;
}
function rescue(g){
 const origin=structuredClone(g.state.location);
 for(let actions=0;!g.state.battle.event;actions++){
  assert.ok(actions<10);assert.ok(g.dispatch({type:'battle',action:'skill',skill:'guard'}));
 }
 assert.equal(g.state.battle.round,2);assert.equal(g.state.battle.event.id,'q001-B-rookie');
 assert.equal(g.state.waiting.speaker,'新人灯番');roundtrip(g);drain(g);
 assert.equal(g.state.battle,null);assert.equal(story(g).scene,'rescue');
 assert.deepEqual(g.state.location,origin);assert.equal(g.state.waiting.type,'choice');
 assert.equal(story(g).values.newOil,0);assert.equal(story(g).values.oilUsed,2);
 assert.equal(story(g).events.filter(id=>id==='outage_call').length,1);
 assert.equal(fireContext(g.data,g.state).run.portable.fuel,25);
 assert.equal(dungeonRestrictionReason(g.state,'return'),'');
 assert.deepEqual(g.state.eventCheckpoints,[]);roundtrip(g);
}
function reachable(g,blocked){
 const map=g.map(),excluded=new Set(blocked.map(p=>p.join(','))),seen=new Set(['13,3']),queue=[{x:13,y:3}];
 for(let i=0;i<queue.length;i++){
  const from=queue[i];
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const to={x:from.x+dx,y:from.y+dy},key=`${to.x},${to.y}`;
   if(excluded.has(key)||seen.has(key)||!g.walkable(map,to.x,to.y)||edgeBetween(g.data,map,from,to)?.passage==='#')continue;
   seen.add(key);queue.push(to);
  }
 }
 return seen;
}

test('q001 north and south placements cover every walkable route out of the elder area',()=>{
 const g=returning(),objects=['q001_return','q001_return_south'].map(id=>g.map().objects.find(o=>o.id===id));
 assert.ok(objects.every(Boolean),'both placements must be distributed to the runtime map');
 const positions=objects.map(o=>[o.x,o.y]);assert.deepEqual(positions,[[9,1],[13,5]]);
 assert.ok(objects.every(o=>o.trigger==='enter'&&o.script==='q001.v11.visit'));
 assert.deepEqual(sceneMarkerPoints(g),positions,'the return journey marks both possible approaches');
 assert.ok(reachable(g,[positions[0]]).has('1,1'),'the old northern point alone leaves a bypass');
 assert.ok(reachable(g,[positions[1]]).has('1,1'),'the northern passage still needs its event');
 const seen=reachable(g,positions);
 for(const target of ['1,1','8,5','9,7','13,7','3,7'])assert.equal(seen.has(target),false,`the party cannot reach ${target} without an event`);
 assert.deepEqual([...seen].sort(),['10,1','11,1','12,1','13,1','13,2','13,3','13,4']);
 for(const position of positions){
  g.teleport(mapId,...position);g.setPortableFire({fuel:0,effect:null});
  assert.equal(fireEnvironment(fireContext(g.data,g.state)).protected,false,'the climax is outside fixed flames');
 }
});

test('q001 outbound travel can cross the southern event without skipping the original wall-lamp scene',()=>{
 const g=prepareQuest('q001');g.random=()=>.999999;choose(g,'talk');
 const journey=structuredClone(g.state.journey);
 const detour=[[3,1],[4,1],[5,1],[5,2],[5,3],[6,3],[7,3],[7,4],[7,5],[8,5],[9,5],[9,4],[9,3],[10,3],[11,3],[11,4],[11,5],[12,5],[13,5]];
 for(const position of detour){step(g,...position);assert.equal(g.state.battle,null);assert.equal(g.state.waiting,null);}
 assert.deepEqual(g.state.journey,journey);assert.equal(story(g).scene,null);assert.deepEqual(nextPoint(g),[9,1]);
 assert.equal(g.state.events[`${mapId}/q001_return_south`],undefined);
 assert.equal(g.state.flags.worldSceneEffects.q001.outage,undefined);
 assert.equal(dungeonRestrictionReason(g.state,'return'),'');assert.deepEqual(sceneMarkerPoints(g),[[9,1]]);roundtrip(g);
});

for(const [name,route] of [['north',north],['south',south]])test(`q001 ${name} return fires on its own cell, preserves walking and saves the shared battle`,()=>{
 const g=returning(),origin=structuredClone(g.state.location),steps=g.state.steps;
 roundtrip(g);assert.deepEqual(g.state.location,origin);assert.equal(g.state.steps,steps);
 outbreak(g,route);assert.deepEqual(nextPoint(g),route.at(-1));roundtrip(g);
});

test('q001 southern rescue saves at its actual location, consumes oil once and walks through both old events to the report',()=>{
 const g=outbreak(returning(),south),gold=g.state.gold,xp=g.state.actors.ada.xp,records=structuredClone(g.state.records);
 roundtrip(g);rescue(g);assert.deepEqual(nextPoint(g),[13,5]);
 assert.equal(g.state.gold,gold);assert.equal(g.state.actors.ada.xp,xp);
 assert.equal(g.state.records.interruptions,records.interruptions+1);assert.equal(g.state.records.wins,records.wins);
 choose(g,'home');assert.deepEqual(point(g),[13,5]);assert.equal(g.state.journey.action,'rescue_home');
 assert.deepEqual(sceneMarkerPoints(g),[[2,1]]);
 for(const position of [[13,4],[13,5],[13,4],[13,3],[13,2],[13,1],[12,1],[11,1],[10,1],[9,1]]){
  step(g,...position);assert.equal(g.state.battle,null);assert.equal(g.state.waiting,null);
 }
 assert.equal(story(g).values.oilUsed,2);assert.equal(story(g).events.filter(id=>id==='outage_call').length,1);roundtrip(g);
 finishJourney(g);assert.equal(story(g).scene,'gate');choose(g,'report');finishJourney(g);choose(g,'rest');
 assert.equal(g.state.quests.q001.outcome,'compromise');assert.equal(g.state.mode,'town');roundtrip(g);
});

test('q001 southern defeat discards the arrival binding and retries the northern rescue from the elder',()=>{
 const g=outbreak(returning(),south);roundtrip(g);
 for(const id of g.state.members){g.state.actors[id].hp=1;g.state.actors[id].statuses=['poison'];}
 for(let actions=0;g.state.battle;actions++){
  assert.ok(actions<10);assert.ok(g.dispatch({type:'battle',action:'skill',skill:'guard'}));
 }
 assert.equal(g.state.mode,'town');assert.equal(story(g).scene,'old');assert.equal(story(g).values.elderAt,'branch');
 assert.equal(story(g).values.rookieAt,'entry');assert.equal(story(g).values.newOil,1);assert.equal(story(g).values.oilUsed,1);
 assert.equal(story(g).arrivals?.dark,undefined);assert.equal(g.state.journey,null);assert.deepEqual(g.state.eventCheckpoints,[]);
 assert.equal(g.state.flags.worldSceneEffects.q001.old,undefined);assert.equal(g.state.flags.worldSceneEffects.q001.outage,undefined);
 assert.equal(g.state.objects[`${mapId}/q001_last_lamp`],undefined);
 assert.ok(!g.state.dungeonRestrictions.some(r=>r.source==='q001.elder_rescue'));assert.deepEqual(nextPoint(g),[13,3]);roundtrip(g);
 g.healAll();assert.ok(g.dispatch({type:'quest.travel',id:'q001'}));walk(g,13,3);
 assert.equal(story(g).scene,'old');assert.equal(g.state.waiting.type,'choice');choose(g,'support');
 outbreak(g,north);assert.deepEqual(nextPoint(g),[9,1]);rescue(g);
});

test('q001 defeat after southern rescue preserves its location and stepping back onto that cell resumes the conversation',()=>{
 const g=outbreak(returning(),south);rescue(g);g.defeat();
 assert.equal(g.state.mode,'town');assert.equal(story(g).scene,'rescue');assert.deepEqual(nextPoint(g),[13,5]);
 assert.equal(story(g).values.oilUsed,2);assert.deepEqual(g.state.eventCheckpoints,[]);roundtrip(g);
 g.healAll();assert.ok(g.dispatch({type:'quest.travel',id:'q001'}));walk(g,13,5);
 assert.deepEqual(point(g),[13,5]);assert.equal(story(g).scene,'rescue');assert.equal(g.state.waiting?.type,'choice');
 assert.equal(g.state.battle,null);assert.equal(story(g).events.filter(id=>id==='outage_call').length,1);
 choose(g,'home');assert.equal(g.state.journey.action,'rescue_home');assert.deepEqual(point(g),[13,5]);roundtrip(g);
});

test('q001 a torch dying before a fixed point adopts the rolled kuragari encounter without moving the party',()=>{
 const g=returning();step(g,13,2);g.setPortableFire({fuel:1,effect:'ward'});
 g.state.steps=g.data.system.encounterCheckSteps-1;g.random=()=>0;
 step(g,13,1);
 assert.equal(g.state.battle?.encounter,'kuragari_hunt');assert.equal(g.state.battle.continuations.frame.script,'q001.v11.outage');
 assert.equal(story(g).scene,'outage');assert.equal(g.state.journey,null);assert.deepEqual(point(g),[13,1]);
 assert.deepEqual(nextPoint(g),[13,1]);assert.equal(story(g).events.filter(id=>id==='old_support').length,1);roundtrip(g);
 rescue(g);assert.deepEqual(nextPoint(g),[13,1]);choose(g,'home');assert.deepEqual(point(g),[13,1]);
 assert.equal(g.state.journey.action,'rescue_home');roundtrip(g);
});

test('q001 defeat after rescue from a random encounter resumes on that exact cell without a permanent event object',()=>{
 const g=returning();step(g,13,2);g.setPortableFire({fuel:1,effect:'ward'});
 g.state.steps=g.data.system.encounterCheckSteps-1;g.random=()=>0;step(g,13,1);rescue(g);g.defeat();
 assert.equal(g.state.mode,'town');assert.equal(story(g).scene,'rescue');assert.deepEqual(nextPoint(g),[13,1]);
 assert.equal(story(g).values.oilUsed,2);assert.deepEqual(g.state.eventCheckpoints,[]);roundtrip(g);
 g.random=()=>.999999;g.healAll();assert.ok(g.dispatch({type:'quest.travel',id:'q001'}));walk(g,12,1);
 assert.equal(g.state.waiting,null,'the former front-cell shortcut must not resume the saved scene');
 assert.equal(projectGame(g).quests.find(q=>q.id==='q001').destination.hint,'指定セルを踏むとイベントが始まる。');
 step(g,13,1);assert.equal(g.state.waiting?.type,'choice');assert.equal(story(g).scene,'rescue');
 assert.equal(g.state.battle,null);assert.equal(story(g).events.filter(id=>id==='outage_call').length,1);
 choose(g,'home');assert.equal(g.state.journey.action,'rescue_home');assert.deepEqual(point(g),[13,1]);roundtrip(g);
});

test('q001 an unsuccessful dark encounter roll keeps the rescue pending until a real trigger is reached',()=>{
 const g=returning();step(g,13,2);g.setPortableFire({fuel:1,effect:'ward'});
 g.state.steps=g.data.system.encounterCheckSteps-1;let rolls=0;g.random=()=>{rolls++;return .999999;};
 step(g,13,1);assert.equal(rolls,1);assert.equal(fireContext(g.data,g.state).run.portable.fuel,0);
 assert.equal(g.state.battle,null);assert.equal(g.state.waiting,null);assert.equal(g.state.journey.action,'old_support');
 assert.equal(story(g).scene,null);assert.equal(story(g).events.includes('old_support'),false);
 assert.equal(g.state.flags.worldSceneEffects.q001.outage,undefined);assert.equal(g.state.objects[`${mapId}/q001_last_lamp`],undefined);roundtrip(g);
 outbreak(g,[[12,1],[11,1],[10,1],[9,1]]);
});

test('q001 lit return encounters stay ordinary and do not consume the pending rescue',()=>{
 const g=returning();step(g,13,2);g.setPortableFire({fuel:10,effect:'ward'});
 g.state.steps=g.data.system.encounterCheckSteps-1;g.random=()=>0;step(g,13,1);
 assert.equal(g.state.battle?.encounter,'kagaribi_roaming');assert.equal(g.state.battle.continuations.frame,undefined);
 assert.equal(g.state.journey.action,'old_support');assert.equal(story(g).scene,null);
 assert.equal(story(g).events.includes('old_support'),false);assert.equal(g.state.flags.worldSceneEffects.q001.outage,undefined);roundtrip(g);
});

test('q001 darkness before meeting the elder and after rescue keeps ordinary kuragari battles',()=>{
 const before=newGame();before.accept('q001');before.teleport(mapId,13,2,'north');before.setPortableFire({fuel:1,effect:'ward'});
 before.state.steps=before.data.system.encounterCheckSteps-1;before.random=()=>0;step(before,13,1);
 assert.equal(before.state.battle?.encounter,'kuragari_hunt');assert.equal(before.state.battle.continuations.frame,undefined);
 assert.equal(before.state.stories.q001,undefined);roundtrip(before);
 const after=outbreak(returning(),north);rescue(after);choose(after,'home');
 after.setPortableFire({fuel:1,effect:'ward'});after.state.steps=after.data.system.encounterCheckSteps-1;after.random=()=>0;
 step(after,10,1);assert.equal(after.state.battle?.encounter,'kuragari_hunt');
 assert.equal(after.state.battle.continuations.frame,undefined);assert.equal(after.state.journey.action,'rescue_home');
 assert.equal(story(after).values.oilUsed,2);assert.equal(story(after).events.filter(id=>id==='outage_call').length,1);roundtrip(after);
});
