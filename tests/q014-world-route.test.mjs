import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {objectVisible} from '../src/core/quest-events.js';
import {town} from './oddland-helpers.mjs';
import {returnCartSource} from '../authoring/editions/e2/story-q014.mjs';
import {data,previous,previousData,ready,values,checkpoint,depart,arrive,choose,go,resume,migrated,drain,enumerate,routes,oldFrames} from './q014-helpers.mjs';
const source=returnCartSource(),graph=enumerate();
test('q014 securing a cart does not open it or disclose the hidden patient',()=>{
 const g=ready();choose(g,'unload');assert.equal(values(g).secured,true);assert.equal(values(g).opened,false);assert.equal(values(g).injuryKnown,false);assert.equal(values(g).workerAt,'underfloor');
 assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['e2_return_cart_hodo']);choose(g,'open');assert.equal(values(g).injuryKnown,true);assert.equal(values(g).workerAt,'underfloor');assert.equal(values(g).onStretcher,false);checkpoint(g);
});
test('q014 transferring the patient and actually arriving on the surface are separate',()=>{
 const g=ready();choose(g,'unload','open','medical','stretcher');assert.equal(values(g).stretcherReady,true);assert.equal(values(g).workerAt,'underfloor');choose(g,'lift');assert.equal(values(g).workerAt,'stretcher');
 depart(g,'cage');assert.equal(values(g).patientAt,'transit');assert.equal(values(g).crewAt,'transit');assert.equal(values(g).hodoAt,'cargo');assert.equal(values(g).safeTransport,false);checkpoint(g);arrive(g);assert.equal(values(g).inCage,false);
 choose(g,'board');assert.equal(values(g).workerAt,'cage');assert.equal(values(g).surfaceReached,false);depart(g,'surface');assert.equal(values(g).safeTransport,false);checkpoint(g);arrive(g);assert.equal(values(g).safeTransport,true);assert.equal(values(g).workerAt,'cage');assert.equal(values(g).offloaded,false);choose(g,'unload');assert.equal(values(g).workerAt,'surface');assert.equal(values(g).treated,false);checkpoint(g);
});
test('q014 clinic arrival, reception, treatment, explanation, consent and submission remain distinct',()=>{
 const g=ready();choose(g,...routes[2].path.slice(0,10));assert.equal(g.state.stories.q014.scene,'clinic_arrival');assert.equal(values(g).clinicAccepted,false);assert.equal(values(g).treated,false);choose(g,'admit');assert.equal(values(g).workerAt,'clinic');assert.equal(values(g).treated,false);
 choose(g,'treat');assert.equal(values(g).treated,true);assert.equal(values(g).consent,false);assert.equal(values(g).explained,false);choose(g,'explain');assert.equal(values(g).explained,true);assert.equal(values(g).consent,false);choose(g,'register');assert.equal(values(g).consent,true);assert.equal(values(g).registered,false);assert.equal(values(g).formAt,'party');
 choose(g,'fill');assert.equal(values(g).formFilled,true);assert.equal(values(g).registered,false);choose(g,'submit');assert.equal(values(g).formAt,'clerk');assert.equal(values(g).registered,true);assert.equal(values(g).familyArrived,false);assert.equal(values(g).equipmentRequested,false);checkpoint(g);
});
test('q014 family arrives only after registration and Hodo submits an application at his own site',()=>{
 const g=ready();choose(g,...routes[2].path.slice(0,16));assert.equal(g.state.stories.q014.scene,'registered');assert.equal(values(g).familyAt,'home');assert.ok(!projectGame(g).dialog.scene.cast.some(c=>c.id==='e2_return_cart_family'));
 choose(g,'family');assert.equal(values(g).familyAt,'clinic');depart(g,'hodo');assert.equal(values(g).patientAt,'clinic');assert.equal(values(g).familyAt,'clinic');assert.equal(values(g).formAt,'clerk');assert.equal(values(g).equipmentRequested,false);arrive(g);assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['e2_return_cart_hodo']);choose(g,'request');assert.equal(values(g).equipmentRequested,true);choose(g,'return','finish');assert.equal(values(g).home,false);assert.equal(values(g).workerAt,'clinic');assert.equal(values(g).patientAt,'clinic');checkpoint(g);
});
for(const route of [routes[1],routes[3]])test('q014 home arrival needs a handover; clinic records remain '+route.old.join('/'),()=>{
 const g=ready();choose(g,...route.path.slice(0,-2));assert.equal(g.state.stories.q014.scene,'home_arrival');assert.equal(values(g).patientAt,'home');assert.equal(values(g).home,false);assert.equal(values(g).treated,route.old.includes('medical'));assert.equal(values(g).consent,false);assert.equal(values(g).registered,false);choose(g,'confirm','finish');assert.equal(values(g).workerAt,'home');assert.equal(values(g).home,true);assert.equal(values(g).treated,route.old.includes('medical'));checkpoint(g);
});
test('q014 unopened haul separates raising, offloading and the crews offscreen home report without adding knowledge',()=>{
 const g=ready();choose(g,'haul');assert.equal(values(g).forcedHaul,false);depart(g,'raise');assert.equal(values(g).forcedHaul,false);assert.equal(values(g).workerAt,'underfloor');arrive(g);assert.equal(values(g).forcedHaul,true);assert.equal(values(g).home,false);assert.equal(values(g).patientAt,'surface');assert.deepEqual(projectGame(g).dialog.scene.cast,[]);
 choose(g,'offload');assert.equal(values(g).home,false);choose(g,'wait');assert.equal(values(g).patientAt,'home');assert.equal(values(g).crewAt,'home');assert.equal(values(g).partyAt,'surface');assert.equal(values(g).home,true);choose(g,'finish');for(const k of ['opened','injuryKnown','safeTransport','treated','registered','consent'])assert.equal(values(g)[k],false,k);assert.deepEqual(g.state.stories.q014.knowledge.party??[],[]);checkpoint(g);
});
test('q014 casts require actual colocated people; remote home reports reveal no patient',()=>{
 const g=ready();for(const row of graph.active){g.load(row.save);const scene=projectGame(g).dialog.scene;for(const c of scene.cast){const entity=Object.entries(source.story.entities).find(([,e])=>e.character===c.id)?.[0];assert.ok(entity);assert.equal(values(g)[entity+'At'],source.story.scenes[row.scene].place);if(entity==='family')assert.equal(values(g).familyArrived,true);if(entity==='patient')assert.equal(values(g).injuryKnown,true);}}
});
test('q014 unavailable branch actions and premature endings cannot commit state',()=>{
 const g=ready();choose(g,'unload');const before=g.save();assert.equal(g.dispatch({type:'choose',id:'submit'}),false);assert.equal(g.save(),before);for(const key of ['informed','contract','compromise'])assert.throws(()=>g.complete('q014',key));assert.equal(g.save(),before);
 choose(g,'open','split','stretcher','lift','cage','board','surface','unload');assert.equal(projectGame(g).dialog.options.find(o=>o.id==='clinic').enabled,false);
});
test('q014 keeps the original catalog, every command, rewards and ending prose',()=>{
 const bytes=fs.readFileSync(new URL('./fixtures/e2-q014-before-world.json',import.meta.url));
 assert.equal(createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),'ca8ce68aa81345f565f29476d3e7b3bb4823e817');assert.deepEqual(previousData.quests.q014,previous);
 for(const [id,s] of Object.entries(previous.scripts))assert.deepEqual(data.scripts[id],s,id);
 for(const [id,o] of Object.entries(previous.outcomes)){const {requires,...old}=o,{requires:_,...current}=data.quests.q014.outcomes[id];assert.deepEqual(current,old);}
});
test('q014 covers every scene and action through the four original decision paths',()=>{
 assert.equal(graph.endings.length,4);
 assert.deepEqual([...new Set(graph.active.map(r=>r.scene))].sort(),Object.keys(source.story.scenes).sort());
 assert.deepEqual([...new Set(graph.endings.flatMap(r=>JSON.parse(r.save).state.stories.q014.events))].sort(),Object.keys(source.story.actions).sort());
 const g=ready();for(const row of [...graph.active,...graph.endings]){g.load(row.save);checkpoint(g);}
});
for(const route of routes)test('q014 preserves original final facts for '+route.old.join('/'),()=>{
 const old=ready({old:true});choose(old,...route.old);const g=ready();choose(g,...route.path);checkpoint(g);
 assert.equal(g.state.quests.q014.outcome,route.outcome);
 for(const key of ['opened','injuryKnown','treated','consent','registered','home','workerAt','safeTransport','forcedHaul'])assert.deepEqual(values(g)[key],old.state.flags.flow.q014[key],key);
});

const departures=new Map();for(const row of graph.active){const g=ready();g.load(row.save);for(const o of projectGame(g).dialog.options.filter(o=>o.enabled)){const key=row.scene+'_'+o.id;if(source.story.actions[key]?.journey&&!departures.has(key))departures.set(key,{...row,id:o.id});}}
for(const [key,row] of departures)for(const kind of ['retreat','defeat'])test(`q014 ${key} resumes after ${kind} with the same records and completed work`,()=>{
 const g=ready();g.load(row.save);depart(g,row.id);const before=structuredClone(g.state.stories.q014),journey=structuredClone(g.state.journey);
 if(g.state.mode==='town'){
  // A return seal is a dungeon action. Walk from town to the lift before
  // interrupting the still-pending journey; do not pretend town has retreat.
  town(g,'e2_cart_surface');assert.ok(g.dispatch({type:'world.cross',route:'return_cart_surface'}));drain(g);
 }
 if(kind==='retreat')assert.ok(g.dispatch({type:'retreat'}));else g.defeat();drain(g);checkpoint(g);assert.deepEqual(g.state.stories.q014,before);assert.deepEqual(g.state.journey,journey);arrive(g);checkpoint(g);
});
for(const scene of Object.keys(source.story.scenes).filter(s=>s!=='entry'))test('q014 local work survives rescue at '+scene,()=>{
 const g=ready();g.load(graph.active.find(r=>r.scene===scene).save);const before=structuredClone(g.state.stories.q014);g.defeat();drain(g);checkpoint(g);resume(g);assert.deepEqual(g.state.stories.q014,before);checkpoint(g);
});
test('q014 all original pending VM frames and completed saves migrate exactly',()=>{
 for(const raw of oldFrames()){const expected=JSON.parse(raw);(expected.state.flags.legacyStoryRoutes??={}).q014=true;const g=new GameEngine(data);g.load(raw);assert.deepEqual(JSON.parse(g.save()),expected);checkpoint(g);}
});
for(const route of routes)test('q014 accepted original route '+route.old.join('/'),()=>{
 const g=migrated(ready({old:true}));choose(g,...route.old);assert.equal(g.state.quests.q014.outcome,route.outcome);assert.equal(g.state.stories.q014,undefined);checkpoint(g);
});
test('q014 accepted catalog completion still checks the original flow facts',()=>{
 const g=migrated(ready({old:true})),before=g.save();for(const key of Object.keys(previous.outcomes))assert.throws(()=>g.complete('q014',key));assert.equal(g.save(),before);
});
test('q014 accepted old flow uses its original ending conditions',()=>{
 const old=ready({old:true});old.state.vm=[];old.state.waiting=null;delete old.state.flags.flow.q014;old.run('q014.flow.visit');drain(old);const g=migrated(old);assert.equal(g.state.stories.q014,undefined);
 const option=projectGame(g).dialog.options.find(o=>o.id==='haul');assert.ok(option);choose(g,'haul');assert.equal(g.state.quests.q014.outcome,'contract');checkpoint(g);
});
test('q014 new and accepted saves select the matching events',()=>{
 const old=ready({old:true}),current=ready(),g=new GameEngine(data);
 for(const [raw,legacy] of [[old.save(),true],[current.save(),false],[old.save(),true]]){g.load(raw);checkpoint(g);for(const m of Object.values(g.data.maps))for(const o of m.objects.filter(o=>o.quest==='q014'&&o.trigger!=='action'&&objectVisible(g.state,m,o)))assert.equal(o.id.startsWith('q014_return_cart_'),!legacy);}
});
for(const route of routes)test('q014 ending and rewards are one-time '+route.old.join('/'),()=>{
 const g=ready();choose(g,...route.path);const before=g.save();assert.throws(()=>g.complete('q014',route.outcome));assert.equal(g.save(),before);const rewards=JSON.stringify([g.state.gold,g.state.actors,g.state.vars]);g.run(g.data.quests.q014.model.entryScript);drain(g);assert.equal(JSON.stringify([g.state.gold,g.state.actors,g.state.vars]),rewards);checkpoint(g);
});

test('q014 trial sites do not overlap another quest or alter mine terrain',()=>{
 const q=data.quests.q014;
 for(const p of Object.values(q.story.worldPlaces).filter(p=>p.kind==='dungeon')){
  assert.equal(data.maps[p.map].tiles[p.y][p.x],'.');
  for(const other of Object.values(data.quests).filter(other=>other.id!==q.id))for(const loc of [...(other.locations??[]),...Object.values(other.story?.worldPlaces??{})])assert.ok(loc.map!==p.map||loc.x!==p.x||loc.y!==p.y,other.id+' overlaps '+p.event);
 }
 for(const [id,map] of Object.entries(previousData.maps))assert.deepEqual(data.maps[id].tiles,map.tiles);
});
