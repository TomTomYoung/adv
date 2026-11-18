import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {objectVisible} from '../src/core/quest-events.js';
import {breathingVeinSource} from '../authoring/editions/e2/story-q013.mjs';
import {data,previous,previousData,ready,values,checkpoint,depart,arrive,choose,go,resume,migrated,drain,enumerate,routes,oldFrames} from './q013-helpers.mjs';
const source=breathingVeinSource(),graph=enumerate();
test('q013 keeps the original catalog, every command, rewards and ending prose',()=>{
 const bytes=fs.readFileSync(new URL('./fixtures/e2-q013-before-world.json',import.meta.url));
 assert.equal(createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),'900db47c1f8f02bd0ec3e16b38bcdab645b70da5');assert.deepEqual(previousData.quests.q013,previous);
 for(const [id,s] of Object.entries(previous.scripts))assert.deepEqual(data.scripts[id],s,id);
 for(const [id,o] of Object.entries(previous.outcomes)){const {requires,...old}=o,{requires:_,...current}=data.quests.q013.outcomes[id];assert.deepEqual(current,old);}
});
test('q013 covers every scene and action through the four original decision paths',()=>{
 assert.equal(graph.endings.length,4);
 assert.deepEqual([...new Set(graph.active.map(r=>r.scene))].sort(),Object.keys(source.story.scenes).sort());
 assert.deepEqual([...new Set(graph.endings.flatMap(r=>JSON.parse(r.save).state.stories.q013.events))].sort(),Object.keys(source.story.actions).sort());
 const g=ready();for(const row of [...graph.active,...graph.endings]){g.load(row.save);checkpoint(g);}
});
for(const route of routes)test('q013 preserves original final facts for '+route.old.join('/'),()=>{
 const old=ready({old:true});choose(old,...route.old);const g=ready();choose(g,...route.path);checkpoint(g);
 assert.equal(g.state.quests.q013.outcome,route.outcome);
 for(const key of ['rootKnown','waterRouteKnown','rangeMeasured','rootCut','miningStopped','detourMarked','monitoring'])assert.deepEqual(values(g)[key],old.state.flags.flow.q013[key],key);
 const knowledge=g.state.stories.q013.knowledge.party??[];
 assert.equal(knowledge.includes('root'),route.old[0]!=='stop');
 assert.equal(knowledge.includes('waterRoute'),route.old[0]==='sample');
});
test('q013 exposing a root, observing its cycle and tracing water are separate',()=>{
 const g=ready();choose(g,'sample');assert.equal(values(g).rootKnown,false);choose(g,'peel');assert.equal(values(g).rootKnown,true);assert.equal(values(g).waterRouteKnown,false);assert.equal(values(g).cycleRecorded,false);
 choose(g,'cycle');depart(g,'lake');assert.equal(values(g).waterRouteKnown,false);assert.equal(values(g).notesAt,'party');arrive(g);assert.equal(values(g).waterRouteKnown,false);choose(g,'trace_water');assert.equal(values(g).waterRouteKnown,true);assert.equal(values(g).rangeMeasured,false);choose(g,'return');assert.equal(g.state.stories.q013.scene,'root');checkpoint(g);
});
test('q013 detour measures both hazards before marking a line and an observation post',()=>{
 const g=ready();choose(g,...routes[2].path.slice(0,8));assert.equal(g.state.stories.q013.scene,'outside_arrival');
 assert.equal(values(g).rootRangeMeasured,false);choose(g,'measure');assert.equal(values(g).rootRangeMeasured,true);assert.equal(values(g).rangeMeasured,false);choose(g,'lake');assert.equal(values(g).bankMeasured,false);choose(g,'measure_bank');assert.equal(values(g).rangeMeasured,true);assert.equal(values(g).detourMarked,false);choose(g,'outside');assert.equal(values(g).detourMarked,false);choose(g,'line');assert.equal(values(g).detourMarked,true);assert.equal(values(g).monitoring,false);choose(g,'mark');assert.equal(values(g).monitoring,true);assert.equal(values(g).miningStopped,false);checkpoint(g);
});
for(const route of [routes[0],routes[3]])test('q013 stopping retains exactly the knowledge from '+route.old.join('/'),()=>{
 const g=ready();choose(g,...route.path.slice(0,-3));assert.equal(values(g).notesDelivered,true);assert.equal(values(g).miningStopped,false);
 choose(g,'return');assert.equal(values(g).stopReported,false);assert.equal(values(g).miningStopped,false);choose(g,'report');assert.equal(values(g).miningStopped,true);assert.equal(values(g).stopReported,true);choose(g,'finish');
 assert.equal(values(g).rootKnown,route.old[0]==='sample');assert.equal(values(g).waterRouteKnown,route.old[0]==='sample');assert.equal(values(g).rangeMeasured,false);assert.equal(values(g).detourMarked,false);assert.equal(values(g).rootCut,false);checkpoint(g);
});
test('q013 carrying records and physically handing them over are separate',()=>{
 const g=ready();choose(g,...routes[0].path.slice(0,7));assert.equal(g.state.stories.q013.scene,'monitor_done');assert.equal(values(g).notesAt,'party');assert.equal(values(g).notesDelivered,false);
 depart(g,'station');assert.equal(values(g).notesAt,'party');assert.equal(values(g).notesDelivered,false);arrive(g);assert.equal(values(g).notesAt,'party');choose(g,'handover');assert.equal(values(g).notesAt,'expert');assert.equal(values(g).notesDelivered,true);assert.equal(values(g).miningStopped,false);checkpoint(g);
});
test('q013 cutting needs disclosure, assent, return, cutting and salt extraction in order',()=>{
 const g=ready();choose(g,'cut');assert.equal(values(g).rootKnown,false);choose(g,'open');assert.equal(values(g).rootKnown,true);assert.equal(values(g).cutAgreed,false);choose(g,'agree');assert.equal(values(g).rootCut,false);choose(g,'outside');assert.equal(values(g).cutWindowReady,false);choose(g,'wait');depart(g,'return');assert.equal(values(g).rootCut,false);arrive(g);assert.equal(values(g).rootCut,false);choose(g,'sever');assert.equal(values(g).rootCut,true);assert.equal(values(g).saltTaken,false);choose(g,'take_salt','outside','finish');
 for(const k of ['waterRouteKnown','rangeMeasured','miningStopped','detourMarked','monitoring','notesDelivered'])assert.equal(values(g)[k],false,k);assert.equal(values(g).notesAt,'party');checkpoint(g);
});
test('q013 routes cannot skip investigation or turn a stop into a completed detour',()=>{
 const g=ready();choose(g,'stop','outside');const before=g.save();assert.equal(g.dispatch({type:'choose',id:'measure'}),false);assert.equal(g.save(),before);choose(g,'check','lake');assert.equal(projectGame(g).dialog.options.find(o=>o.id==='measure_bank').enabled,false);choose(g,'record_level','outside');assert.equal(projectGame(g).dialog.options.find(o=>o.id==='line').enabled,false);choose(g,'mark','station','handover','return');assert.equal(projectGame(g).dialog.options.find(o=>o.id==='trace_report').enabled,false);
});
const departures=new Map();for(const row of graph.active){const g=ready();g.load(row.save);for(const o of projectGame(g).dialog.options.filter(o=>o.enabled)){const key=row.scene+'_'+o.id;if(source.story.actions[key]?.journey&&!departures.has(key))departures.set(key,{...row,id:o.id});}}
for(const [key,row] of departures)for(const kind of ['retreat','defeat'])test(`q013 ${key} resumes after ${kind} with the same records and completed work`,()=>{
 const g=ready();g.load(row.save);depart(g,row.id);const before=structuredClone(g.state.stories.q013),journey=structuredClone(g.state.journey);
 if(kind==='retreat')assert.ok(g.dispatch({type:'retreat'}));else g.defeat();drain(g);checkpoint(g);assert.deepEqual(g.state.stories.q013,before);assert.deepEqual(g.state.journey,journey);arrive(g);checkpoint(g);
});
for(const scene of ['root_exposed','sample_cycle','water_known','root','outside_measured','lake_measured','line_done','monitor_done','station_arrival','notes_delivered','trace_reported','stop_reported','cut_root','cut_agreed','cut_window','cut_done','salt_taken'])test('q013 local work survives rescue at '+scene,()=>{
 const g=ready();g.load(graph.active.find(r=>r.scene===scene).save);const before=structuredClone(g.state.stories.q013);g.defeat();drain(g);checkpoint(g);resume(g);assert.deepEqual(g.state.stories.q013,before);checkpoint(g);
});
test('q013 all original pending VM frames and completed saves migrate exactly',()=>{
 for(const raw of oldFrames()){const expected=JSON.parse(raw);(expected.state.flags.legacyStoryRoutes??={}).q013=true;const g=new GameEngine(data);g.load(raw);assert.deepEqual(JSON.parse(g.save()),expected);checkpoint(g);}
});
for(const route of routes)test('q013 accepted original route '+route.old.join('/'),()=>{
 const g=migrated(ready({old:true}));choose(g,...route.old);assert.equal(g.state.quests.q013.outcome,route.outcome);assert.equal(g.state.stories.q013,undefined);checkpoint(g);
});
test('q013 accepted catalog completion still checks the original flow facts',()=>{
 const g=migrated(ready({old:true})),before=g.save();for(const key of Object.keys(previous.outcomes))assert.throws(()=>g.complete('q013',key));assert.equal(g.save(),before);
});
test('q013 accepted old flow uses its original ending conditions',()=>{
 const old=ready({old:true});old.state.vm=[];old.state.waiting=null;delete old.state.flags.flow.q013;old.run('q013.flow.visit');drain(old);const g=migrated(old);assert.equal(g.state.stories.q013,undefined);
 const option=projectGame(g).dialog.options.find(o=>o.id==='cut');assert.ok(option);choose(g,'cut');assert.equal(g.state.quests.q013.outcome,'contract');checkpoint(g);
});
test('q013 new and accepted saves select the matching events',()=>{
 const old=ready({old:true}),current=ready(),g=new GameEngine(data);
 for(const [raw,legacy] of [[old.save(),true],[current.save(),false],[old.save(),true]]){g.load(raw);checkpoint(g);for(const m of Object.values(g.data.maps))for(const o of m.objects.filter(o=>o.quest==='q013'&&o.trigger!=='action'&&objectVisible(g.state,m,o)))assert.equal(o.id.startsWith('q013_breathing_vein_'),!legacy);}
});
for(const route of routes)test('q013 ending and rewards are one-time '+route.old.join('/'),()=>{
 const g=ready();choose(g,...route.path);const before=g.save();assert.throws(()=>g.complete('q013',route.outcome));assert.equal(g.save(),before);const rewards=JSON.stringify([g.state.gold,g.state.actors,g.state.vars]);g.run(g.data.quests.q013.model.entryScript);drain(g);assert.equal(JSON.stringify([g.state.gold,g.state.actors,g.state.vars]),rewards);checkpoint(g);
});

test('q013 trial sites do not overlap another quest or alter mine terrain',()=>{
 const q=data.quests.q013;
 for(const p of Object.values(q.story.worldPlaces)){
  assert.equal(data.maps[p.map].tiles[p.y][p.x],'.');
  for(const other of Object.values(data.quests).filter(other=>other.id!==q.id))for(const loc of [...(other.locations??[]),...Object.values(other.story?.worldPlaces??{})])assert.ok(loc.map!==p.map||loc.x!==p.x||loc.y!==p.y,other.id+' overlaps '+p.event);
 }
 for(const [id,map] of Object.entries(previousData.maps))assert.deepEqual(data.maps[id].tiles,map.tiles);
});
