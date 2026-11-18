import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {objectVisible} from '../src/core/quest-events.js';
import {town} from './oddland-helpers.mjs';
import {weepingPillarSource} from '../authoring/editions/e2/story-q015.mjs';
import {data,previous,previousData,ready,values,checkpoint,depart,arrive,choose,go,resume,migrated,drain,enumerate,routes,oldFrames} from './q015-helpers.mjs';
const source=weepingPillarSource(),graph=enumerate();
test('q015 diverting water, protecting the original and copying are separate',()=>{
 const g=ready();choose(g,'catch');assert.equal(values(g).diverted,false);choose(g,'divert');assert.equal(values(g).diverted,true);assert.equal(values(g).protected,false);assert.equal(values(g).lostNames,3);
 depart(g,'storage');assert.equal(values(g).mayaAt,'transit');assert.equal(values(g).rosterAt,'underPillar');checkpoint(g);arrive(g);assert.equal(values(g).protected,false);
 choose(g,'protect');assert.equal(values(g).protected,true);assert.equal(values(g).copied,false);choose(g,'copy');assert.equal(values(g).copied,true);assert.equal(values(g).copyAt,'party');assert.equal(values(g).restoredNames,0);assert.equal(values(g).rosterAt,'underPillar');checkpoint(g);
});
test('q015 selecting full investigation commits no answers or restoration',()=>{
 const g=ready();choose(g,'catch','divert','storage','protect','copy','complete');
 for(const k of ['recordsChecked','familiesChecked','waterStudied','published','deposited'])assert.equal(values(g)[k],false,k);
 assert.equal(values(g).restoredNames,0);assert.equal(values(g).rosterAt,'underPillar');checkpoint(g);
});
test('q015 collection, transport, arrival and original deposit have distinct holders',()=>{
 const g=ready();choose(g,'chapel','storage','protect','carry');assert.equal(values(g).rosterAt,'underPillar');choose(g,'take');assert.equal(values(g).rosterAt,'party');depart(g,'archive');assert.equal(values(g).rosterAt,'party');assert.equal(values(g).mayaAt,'transit');assert.equal(values(g).deposited,false);checkpoint(g);arrive(g);
 assert.equal(values(g).rosterAt,'party');assert.equal(values(g).deposited,false);choose(g,'deposit');assert.equal(values(g).rosterAt,'dryRoom');assert.equal(values(g).deposited,true);assert.equal(values(g).copied,false);checkpoint(g);
});
function atScene(scene){const g=ready(),row=graph.active.find(r=>r.scene===scene&&r.values.route==='informed');assert.ok(row,scene);g.load(row.save);return g;}
test('q015 archive and family requests do not imply receipt or restoration',()=>{
 const g=atScene('records_arrival');assert.equal(values(g).mayaAt,'dryRoom');choose(g,'request');assert.equal(values(g).recordsRequested,true);assert.equal(values(g).recordsChecked,false);assert.equal(values(g).recordAt,'clerk');
 choose(g,'receive');assert.equal(values(g).recordsChecked,true);assert.equal(values(g).recordAt,'party');assert.equal(values(g).familiesChecked,false);assert.equal(values(g).restoredNames,0);
 choose(g,'families','consult');assert.equal(values(g).familyHeard,true);assert.equal(values(g).familiesChecked,false);assert.equal(values(g).confirmationAt,'family');choose(g,'receive');assert.equal(values(g).familiesChecked,true);assert.equal(values(g).confirmationAt,'party');assert.equal(values(g).restoredNames,0);checkpoint(g);
});
test('q015 restoration requires comparison of both sources and preserves the original loss',()=>{
 const g=atScene('evidence_ready');depart(g,'return');assert.equal(values(g).restoredNames,0);assert.equal(values(g).recordAt,'party');assert.equal(values(g).confirmationAt,'party');arrive(g);assert.equal(values(g).restoredNames,0);choose(g,'reconcile');
 assert.equal(values(g).restoredNames,3);assert.equal(values(g).lostNames,3);assert.equal(values(g).recordAt,'dryRoom');assert.equal(values(g).confirmationAt,'dryRoom');assert.equal(values(g).rosterAt,'dryRoom');assert.equal(values(g).waterStudied,false);assert.ok(g.state.stories.q015.knowledge.party.includes('names'));checkpoint(g);
});
test('q015 water sample, crack investigation, return and interpretation are separate',()=>{
 const g=atScene('water_arrival');assert.equal(values(g).sampleCollected,false);assert.equal(values(g).crackInspected,false);assert.equal(values(g).waterStudied,false);
 choose(g,'sample');assert.equal(values(g).sampleAt,'party');assert.equal(values(g).sampleCollected,true);assert.equal(values(g).waterStudied,false);choose(g,'inspect');assert.equal(values(g).crackInspected,true);assert.equal(values(g).waterStudied,false);
 depart(g,'return');assert.equal(values(g).sampleAt,'party');checkpoint(g);arrive(g);assert.equal(values(g).waterStudied,false);choose(g,'study');assert.equal(values(g).waterStudied,true);assert.equal(values(g).sampleAt,'dryRoom');assert.equal(values(g).published,false);checkpoint(g);
});
for(const route of [routes[2],routes[3]])test('q015 physical posting publishes only the verified scope '+route.outcome,()=>{
 const g=ready();choose(g,...route.path.slice(0,-2));assert.equal(g.state.stories.q015.scene,'display_arrival');assert.equal(values(g).published,false);assert.equal(values(g).blankPublished,false);assert.equal(values(g).copyAt,'party');assert.equal(values(g).reportAt,'party');
 choose(g,'publish');assert.equal(values(g).published,true);assert.equal(values(g).blankPublished,route.outcome==='missing');assert.equal(values(g).copyAt,'display');assert.equal(values(g).reportAt,'display');assert.equal(values(g).rosterAt,'dryRoom');
 if(route.outcome==='missing'){assert.equal(values(g).restoredNames,0);for(const k of ['recordsChecked','familiesChecked','waterStudied','sampleCollected','crackInspected'])assert.equal(values(g)[k],false,k);assert.deepEqual(g.state.stories.q015.knowledge.party??[],[]);}
 checkpoint(g);
});
test('q015 stopping the drops leaves the original wet, untransported and unreadable',()=>{
 const g=ready();depart(g,'exorcise');assert.equal(values(g).sealed,false);assert.equal(values(g).mayaAt,'pillar');arrive(g);assert.equal(values(g).sealed,false);choose(g,'seal');assert.equal(values(g).sealed,true);choose(g,'return','finish');
 for(const k of ['protected','copied','published','waterStudied','deposited'])assert.equal(values(g)[k],false,k);assert.equal(values(g).rosterAt,'underPillar');assert.equal(values(g).lostNames,3);assert.equal(values(g).restoredNames,0);checkpoint(g);
});
test('q015 deferring publication preserves the existing copy and deposits it separately',()=>{
 const g=ready();choose(g,...routes[4].path.slice(0,-2));assert.equal(values(g).rosterAt,'dryRoom');assert.equal(values(g).copyAt,'party');choose(g,'store_copy','finish');assert.equal(values(g).copyAt,'dryRoom');assert.equal(values(g).copied,true);assert.equal(values(g).published,false);assert.equal(values(g).restoredNames,0);checkpoint(g);
});
test('q015 premature endings and unavailable branches leave saves unchanged',()=>{
 const g=ready(),before=g.save();for(const key of Object.keys(previous.outcomes))assert.throws(()=>g.complete('q015',key));assert.equal(g.save(),before);assert.equal(g.dispatch({type:'choose',id:'publish'}),false);assert.equal(g.save(),before);
 choose(g,'chapel','storage','protect');assert.equal(projectGame(g).dialog.options.find(o=>o.id==='copy').enabled,false);
});
test('q015 people are only shown at their actual site and Maya remains with the archive',()=>{
 const g=ready();for(const row of graph.active){g.load(row.save);for(const c of projectGame(g).dialog.scene.cast){const entity=Object.entries(source.story.entities).find(([,e])=>e.character===c.id)?.[0];assert.ok(entity);assert.equal(values(g)[entity+'At'],source.story.scenes[row.scene].place);}}
 const h=atScene('records_arrival');assert.equal(values(h).mayaAt,'dryRoom');assert.deepEqual(projectGame(h).dialog.scene.cast.map(c=>c.id),['e2_weeping_pillar_clerk']);
});
test('q015 keeps the original catalog, every command, rewards and ending prose',()=>{
 const bytes=fs.readFileSync(new URL('./fixtures/e2-q015-before-world.json',import.meta.url));
 assert.equal(createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),'4012fc8a4ed40a6e6cda96afeb78d10022eb73a8');assert.deepEqual(previousData.quests.q015,previous);
 for(const [id,s] of Object.entries(previous.scripts))assert.deepEqual(data.scripts[id],s,id);
 for(const [id,o] of Object.entries(previous.outcomes)){const {requires,...old}=o,{requires:_,...current}=data.quests.q015.outcomes[id];assert.deepEqual(current,old);}
});
test('q015 covers every scene and action through the five original decision paths',()=>{
 assert.equal(graph.endings.length,5);
 assert.deepEqual([...new Set(graph.active.map(r=>r.scene))].sort(),Object.keys(source.story.scenes).sort());
 assert.deepEqual([...new Set(graph.endings.flatMap(r=>JSON.parse(r.save).state.stories.q015.events))].sort(),Object.keys(source.story.actions).sort());
 const g=ready();for(const row of [...graph.active,...graph.endings]){g.load(row.save);checkpoint(g);}
});
for(const route of routes)test('q015 preserves original final facts for '+route.old.join('/'),()=>{
 const old=ready({old:true});choose(old,...route.old);const g=ready();choose(g,...route.path);checkpoint(g);
 assert.equal(g.state.quests.q015.outcome,route.outcome);
 for(const key of ['lostNames','restoredNames','protected','copied','recordsChecked','familiesChecked','waterStudied','published','blankPublished','sealed','rosterAt'])assert.deepEqual(values(g)[key],old.state.flags.flow.q015[key],key);
});

const departures=new Map();for(const row of graph.active){const g=ready();g.load(row.save);for(const o of projectGame(g).dialog.options.filter(o=>o.enabled)){const key=row.scene+'_'+o.id;if(source.story.actions[key]?.journey&&!departures.has(key))departures.set(key,{...row,id:o.id});}}
for(const [key,row] of departures)for(const kind of ['retreat','defeat'])test(`q015 ${key} checks ${kind} availability and retains records and completed work`,()=>{
 const g=ready();g.load(row.save);depart(g,row.id);const before=structuredClone(g.state.stories.q015),journey=structuredClone(g.state.journey);
 if(kind==='retreat'&&g.state.mode==='town'){
  // A town return journey can reach its destination before any dungeon exit.
  // Return seals are unavailable here; reject without changing the save.
  const beforeSave=JSON.parse(g.save());assert.equal(g.dispatch({type:'retreat'}),false);const afterSave=JSON.parse(g.save());delete beforeSave.state.notice;delete afterSave.state.notice;assert.deepEqual(afterSave,beforeSave);arrive(g);checkpoint(g);return;
 }
 if(kind==='retreat')assert.ok(g.dispatch({type:'retreat'}));else g.defeat();drain(g);checkpoint(g);assert.deepEqual(g.state.stories.q015,before);assert.deepEqual(g.state.journey,journey);arrive(g);checkpoint(g);
});
for(const scene of Object.keys(source.story.scenes).filter(s=>s!=='entry'))test('q015 local work survives rescue at '+scene,()=>{
 const g=ready();g.load(graph.active.find(r=>r.scene===scene).save);const before=structuredClone(g.state.stories.q015);g.defeat();drain(g);checkpoint(g);resume(g);assert.deepEqual(g.state.stories.q015,before);checkpoint(g);
});
test('q015 all original pending VM frames and completed saves migrate exactly',()=>{
 for(const raw of oldFrames()){const expected=JSON.parse(raw);(expected.state.flags.legacyStoryRoutes??={}).q015=true;const g=new GameEngine(data);g.load(raw);assert.deepEqual(JSON.parse(g.save()),expected);checkpoint(g);}
});
for(const route of routes)test('q015 accepted original route '+route.old.join('/'),()=>{
 const g=migrated(ready({old:true}));choose(g,...route.old);assert.equal(g.state.quests.q015.outcome,route.outcome);assert.equal(g.state.stories.q015,undefined);checkpoint(g);
});
test('q015 accepted catalog completion still checks the original flow facts',()=>{
 const g=migrated(ready({old:true})),before=g.save();for(const key of Object.keys(previous.outcomes))assert.throws(()=>g.complete('q015',key));assert.equal(g.save(),before);
});
test('q015 accepted old flow uses its original ending conditions',()=>{
 const old=ready({old:true});old.state.vm=[];old.state.waiting=null;delete old.state.flags.flow.q015;old.run('q015.flow.visit');drain(old);const g=migrated(old);assert.equal(g.state.stories.q015,undefined);
 const option=projectGame(g).dialog.options.find(o=>o.id==='exorcise');assert.ok(option);choose(g,'exorcise');assert.equal(g.state.quests.q015.outcome,'contract');checkpoint(g);
});
test('q015 new and accepted saves select the matching events',()=>{
 const old=ready({old:true}),current=ready(),g=new GameEngine(data);
 for(const [raw,legacy] of [[old.save(),true],[current.save(),false],[old.save(),true]]){g.load(raw);checkpoint(g);for(const m of Object.values(g.data.maps))for(const o of m.objects.filter(o=>o.quest==='q015'&&o.trigger!=='action'&&objectVisible(g.state,m,o)))assert.equal(o.id.startsWith('q015_weeping_pillar_'),!legacy);}
});
for(const route of routes)test('q015 ending and rewards are one-time '+route.old.join('/'),()=>{
 const g=ready();choose(g,...route.path);const before=g.save();assert.throws(()=>g.complete('q015',route.outcome));assert.equal(g.save(),before);const rewards=JSON.stringify([g.state.gold,g.state.actors,g.state.vars]);g.run(g.data.quests.q015.model.entryScript);drain(g);assert.equal(JSON.stringify([g.state.gold,g.state.actors,g.state.vars]),rewards);checkpoint(g);
});

test('q015 trial sites do not overlap another quest or alter mine terrain',()=>{
 const q=data.quests.q015;
 for(const p of Object.values(q.story.worldPlaces).filter(p=>p.kind==='dungeon')){
  assert.equal(data.maps[p.map].tiles[p.y][p.x],'.');
  for(const other of Object.values(data.quests).filter(other=>other.id!==q.id))for(const loc of [...(other.locations??[]),...Object.values(other.story?.worldPlaces??{})])assert.ok(loc.map!==p.map||loc.x!==p.x||loc.y!==p.y,other.id+' overlaps '+p.event);
 }
 for(const [id,map] of Object.entries(previousData.maps))assert.deepEqual(data.maps[id].tiles,map.tiles);
});
