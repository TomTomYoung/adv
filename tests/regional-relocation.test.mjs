import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {GameEngine} from '../src/core/engine.js';
import {validateSave} from '../src/core/save.js';
import {validateContent} from '../src/core/validation.js';
import {worldTravelView,returnLocation} from '../src/core/world-travel.js';
import {locationRoot} from '../src/core/world.js';
import {auditQuest,candidates,loadStages,verifyMigration,verifyReturns,reportMarkdown,fixture,read} from '../tools/audit-regional-relocation.mjs';
import {drain,inspect} from './helpers.mjs';
import {town} from './oddland-helpers.mjs';

const stages=await loadStages(),data=stages.firstTen,report=await read('doc/dungeons/REGIONAL_RELOCATION_CHECK.json');
for(const {q,group} of candidates(data))test(`${q.id}: relocation preflight replays every ending and preserves seven save phases across four e2 generations`,()=>{
 const actual=auditQuest(data,q.id);actual.dungeon=group.dungeon;actual.destination=group.destination;
 actual.migrations=Object.fromEntries(Object.entries(stages).map(([stage,old])=>[stage,verifyMigration(old,data,q.id,Object.values(actual.endings)[0])]));
 assert.deepEqual(actual,report.quests.find(row=>row.id===q.id),'update the measured report when authored behavior changes');
});
for(const group of report.dungeons)test(`${group.dungeon}: current surface exit, return mark and rescue preserve the departure town`,()=>{
 assert.deepEqual(verifyReturns(data,group.dungeon),group.returns);
});

// Exercise non-default system state through real actions, then compare the old
// engine with its migrated counterpart through exit and the next expedition.
const at=(g,p)=>g.teleport(p.map,p.x,p.y);
const act=(g,system,action,target,extra={})=>assert.ok(g.dispatch({type:'dungeon.action',system,action,target,...extra}),g.state.notice);
const prepareSystems={
 region_4:g=>{const p=g.data.dungeons.region_4.systems.mirrors.portals[0];at(g,p);act(g,'mirrors','warp',p.id);},
 region_5:g=>{const s=g.data.dungeons.region_5.systems.library,b=s.books.find(b=>b.skill==='read_path');at(g,b);act(g,'library','borrow',b.id,{actor:'ada',sealed:'attack'});at(g,s.gates[0]);act(g,'library','unlock',s.gates[0].id,{actor:'ada'});},
 region_7:g=>{const s=g.data.dungeons.region_7.systems.air;at(g,s.devices[0]);act(g,'air','raise',s.devices[0].id);g.teleport('region_7_f1',1,1,'south');assert.ok(g.dispatch({type:'move',direction:'forward'}));},
 region_8:g=>{const s=g.data.dungeons.region_8.systems.power,guardian=s.devices.find(d=>d.kind==='guardian');at(g,guardian);act(g,'power','disconnect',guardian.id);at(g,s.controls[1]);act(g,'power','toggle',s.controls[1].id);const repair=s.devices.find(d=>d.kind==='repair');at(g,repair);g.state.actors.ada.hp=1;act(g,'power','repair',repair.id);},
 region_9:g=>{const p=g.data.dungeons.region_9.systems.terrain.controls[0];at(g,p);act(g,'terrain','shift',p.id,{phase:'west'});}
};
const withoutQuests=g=>{const s=structuredClone(g.state);delete s.quests;s.worldTravel??={version:1,visited:{hikarigaeri:true},registrations:{},returnAnchor:'hikarigaeri',oilStores:{}};return s;};
for(const [dungeon,prepare] of Object.entries(prepareSystems))test(`${dungeon}: operated systems, resources and expedition number survive every legacy stage and all return modes`,()=>{
 for(const before of Object.values(stages))for(const kind of ['exit','mark','defeat']){
  const old=new GameEngine(before,1907);drain(old);assert.ok(old.dispatch({type:'travel',dungeon}));
  const pristine=structuredClone(old.state.dungeons);prepare(old);assert.notDeepEqual(old.state.dungeons,pristine);
  const raw=old.save(),g=new GameEngine(data);g.load(raw);assert.deepEqual(withoutQuests(g),withoutQuests(old));
  for(const engine of [old,g]){
   if(kind==='exit'){const map=engine.data.maps[engine.data.dungeons[dungeon].entries.main.map],exit=map.objects.find(o=>o.kind==='exit');engine.teleport(map.id,exit.x,exit.y);inspect(engine,exit.id);drain(engine);}
   else if(kind==='mark')assert.ok(engine.dispatch({type:'retreat'}));else engine.defeat();
   assert.equal(engine.state.townLocation,'hikarigaeri_square');assert.deepEqual(validateSave(JSON.parse(engine.save()),engine.data),[]);
  }
  assert.deepEqual(withoutQuests(g),withoutQuests(old));
  const retainedLight=g.state.light;
  for(const engine of [old,g])assert.ok(engine.dispatch({type:'travel',dungeon}));
  const expected=withoutQuests(old);
  // The border release deliberately stopped refilling light on town departure.
  // Only pre-border definitions refill to 90; loading itself must never do so.
  if(!before.worldTravel){assert.equal(old.state.light,90);assert.equal(g.state.light,retainedLight);expected.light=retainedLight;}
  assert.deepEqual(withoutQuests(g),expected);assert.deepEqual(validateSave(JSON.parse(g.save()),data),[]);
 }
});

test('the relocation inventory covers exactly 60 Oddland and 40 Salome candidates, preserves q100 dependencies and rejects adoption shortcuts',async()=>{
 const list=candidates(data),ids=list.map(({q})=>q.id),allocation=await read('doc/scenarios/REGIONAL_QUEST_ALLOCATION.json');
 assert.equal(new Set(ids).size,100);assert.equal(list.filter(({group})=>group.destination==='oddland').length,60);assert.equal(list.filter(({group})=>group.destination==='salome').length,40);
 assert.ok(list.every(({q,group})=>allocation.primary[group.destination].includes(q.id)));
 assert.equal(report.summary.endings,321);assert.equal(report.summary.migrationFixtures,2800);
 assert.equal(await fs.readFile(new URL('../doc/dungeons/REGIONAL_RELOCATION_CHECK.md',import.meta.url),'utf8'),reportMarkdown(report));
 const prerequisiteIds=data.quests.q100.requires.args.map(c=>c.left.ref.split('.')[1]);assert.equal(prerequisiteIds.length,99);assert.ok(prerequisiteIds.every(id=>data.quests[id]&&allocation.primary.hikarigaeri.concat(allocation.primary.oddland,allocation.primary.salome).includes(id)));
 const g=new GameEngine(data);drain(g);
 // Probe the prerequisite predicate, not a natural-play campaign.
 for(const id of prerequisiteIds)g.state.quests[id].stage='completed';assert.ok(g.unlocked(data.quests.q100));
 for(const id of ids.filter(id=>data.quests[id].number<=100)){g.state.quests[id].stage='active';assert.equal(g.unlocked(data.quests.q100),false,id);g.state.quests[id].stage='completed';}
 assert.ok(report.quests.every(q=>!q.physicalWorldPlaces&&q.adoption==='blocked-pending-world-routes'));
});

test('moving only a map country silently changes the country of a valid old expedition: adoption needs an explicit geography migration',()=>{
 const old=fixture(data,'q031',{started:false}),raw=old.save(),candidate=structuredClone(data);
 for(const id of candidate.dungeons.region_4.maps)candidate.worldTravel.mapCountries[id]='oddland';
 assert.deepEqual(validateContent(candidate),[],'this definition edit alone is not a migration contract');
 const proposed=new GameEngine(candidate);proposed.load(raw);
 assert.equal(worldTravelView(old).country,'聖王国トルネア領');assert.equal(worldTravelView(proposed).country,'オッドランド');
 assert.equal(proposed.state.worldTravel.visited.oddland,undefined);assert.equal(returnLocation(candidate,proposed.state),'hikarigaeri_square');
 assert.equal(proposed.save(),raw,'no state change does not imply unchanged geographical meaning');
});

test('reparenting the existing academy to Salome rejects an in-facility old save until its actual visit is migrated',()=>{
 const old=new GameEngine(data);drain(old);town(old,'e2_archive');const raw=old.save(),candidate=structuredClone(data);
 candidate.locations.e2_academy.parent=null;
 candidate.worldTravel.settlements.salome={name:'サロメ',root:'e2_academy',country:'tornea'};
 assert.deepEqual(validateContent(candidate),[]);
 const proposed=new GameEngine(candidate),before=proposed.save();assert.throws(()=>proposed.load(raw));assert.equal(proposed.save(),before);
 const corrected=JSON.parse(raw);corrected.state.worldTravel.visited.salome=true;
 assert.deepEqual(validateSave(corrected,candidate),[],'actual in-facility presence is evidence, mere acceptance is not');
 assert.equal(old.save(),raw);
});

test('Salome retains exactly the existing six facility IDs and twenty personal quests independently of the forty regional candidates',()=>{
 const locations=['e2_academy','e2_archive','e2_stacks','e2_workshop','e2_relic','e2_storage'];
 assert.ok(locations.every(id=>locationRoot(data,id).id==='hikarigaeri_square'));
 const linked=Object.values(data.quests).filter(q=>Object.values(q.story?.worldPlaces??{}).some(p=>locations.includes(p.location))).map(q=>q.id);
 assert.deepEqual(linked,[...Array.from({length:10},(_,i)=>'q'+(241+i)),...Array.from({length:10},(_,i)=>'q'+(281+i))]);
 assert.ok(linked.every(id=>!report.quests.some(q=>q.id===id)));
});
