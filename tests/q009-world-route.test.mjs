import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {GameEngine} from '../src/core/engine.js';
import {validateSave,migrateSave} from '../src/core/save.js';
import {nextQuestPlace} from '../src/core/quest-navigation.js';
import {projectGame} from '../src/application/projection.js';
import {objectVisible} from '../src/core/quest-events.js';
import {ratRouteSource,ratRouteLocations} from '../authoring/editions/e2/story-q009.mjs';
import {data,previous,previousData,ready,values,checkpoint,depart,arrive,choose,go,town,resume,migrated,drain,fight,enumerate,informed,delivery,walk} from './q009-helpers.mjs';

const source=ratRouteSource(),graph=enumerate(),oldGraph=enumerate({old:true});
const oldRows=[...oldGraph.active,...oldGraph.endings];
const translate=path=>{
  let scene='entry';const result=[];
  const expansions={entry_trace:['trace','work','listen'],entry_hunt:['hunt','hunt'],granary_holes:['guide','holes'],granary_work:['work','listen'],granary_verify:['verify','survey','return','finish'],granary_grain:delivery};
  for(const id of path){const key=scene+'_'+id,a=previous.story.actions[key];result.push(...(expansions[key]??[id]));scene=a.to;}
  return result;
};
test('q009 preserves the exact original bytes, commands and outcomes',()=>{
  const bytes=fs.readFileSync(new URL('./fixtures/e2-q009-before-world.json',import.meta.url));
  assert.equal(createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),'1c995946394f49ddfd890001ce464552bd8e1ec6');
  assert.deepEqual(previousData.quests.q009,previous);assert.deepEqual(data.quests.q009.outcomes,previous.outcomes);
  for(const [id,s] of Object.entries(previous.scripts))assert.deepEqual(data.scripts[id],s,id);
  assert.equal(source.nodes.length,14);assert.equal(Object.keys(source.story.actions).length,21);assert.equal(Object.values(source.story.actions).filter(a=>a.journey).length,10);
});
test('q009 cyclic graph reaches a finite fixed point and keeps the seven newly separable partial-work endings',()=>{
  assert.equal(oldGraph.active.length,29);assert.equal(oldGraph.endings.length,18);
  assert.equal(graph.active.length,174);assert.equal(graph.endings.length,25);
  assert.deepEqual(['contract','informed','compromise'].map(k=>graph.endings.filter(r=>r.outcome===k).length),[1,3,21]);
  const g=ready();for(const r of [...graph.active,...graph.endings]){g.load(r.save);checkpoint(g);}
  assert.ok(graph.endings.some(r=>r.outcome==='compromise'&&r.values.ratsCleared&&!r.values.holes));
  assert.deepEqual([...new Set(graph.active.map(r=>r.scene))].sort(),Object.keys(source.story.scenes).sort());
  const exercised=new Set([...graph.active,...graph.endings].flatMap(r=>JSON.parse(r.save).state.stories.q009.events));
  assert.deepEqual([...exercised].sort(),Object.keys(source.story.actions).sort());
});
for(const [i,r] of oldGraph.endings.entries())test(`q009 original ending-state ${i} retains its facts after physical travel`,()=>{
  const g=ready();choose(g,...translate(r.path));checkpoint(g);
  assert.equal(g.state.quests.q009.outcome,r.outcome);
  assert.deepEqual(Object.fromEntries(Object.keys(previous.story.registry).map(k=>[k,values(g)[k]])),r.values);
  assert.deepEqual(g.state.stories.q009.knowledge,r.knowledge);
});
test('q009 underground points and ground warehouses are connected without changing terrain or water controls',()=>{
  const g=ready();assert.equal(nextQuestPlace(data,g.state,'q009').map,'region_1_f1');
  for(const id of Object.keys(ratRouteLocations)){assert.ok(data.locations[id]);assert.equal(previousData.locations[id],undefined);}
  assert.equal(data.locations.e2_rat_granary.parent,'e2_rat_lane');assert.equal(data.locations.e2_rat_store.parent,'e2_rat_lane');assert.equal(data.locations.e2_rat_lane.parent,'e2_wharf');
  assert.deepEqual(data.dungeons,previousData.dungeons);
  for(const id of Object.keys(data.maps))for(const field of ['tiles','cells']){assert.ok(data.maps[id][field]);assert.deepEqual(data.maps[id][field],previousData.maps[id][field]);}
  const before=structuredClone(g.state.dungeons.persistent.region_1.systems.water);depart(g,'move');walk(g,1,1);checkpoint(g);assert.equal(g.state.journey.action,'entry_move');assert.ok(g.dispatch({type:'world.cross',route:'waterway_surface'}));drain(g);
  assert.equal(g.state.townLocation,'e2_wharf');assert.equal(g.state.stories.q009.scene,null);
  town(g,'e2_rat_lane');assert.equal(g.dispatch({type:'story.resume',quest:'q009'}),false);town(g,'e2_rat_granary');drain(g);assert.equal(g.state.stories.q009.scene,'granary');assert.deepEqual(g.state.dungeons.persistent.region_1.systems.water.controls,before.controls);checkpoint(g);
});
test('q009 structure, arrival, cause and agreement commit at separate local actions',()=>{
  const g=ready();choose(g,'trace');assert.equal(values(g).structureChecked,true);assert.equal(values(g).causeKnown,false);assert.deepEqual(g.state.stories.q009.knowledge.party,['plans','structure']);assert.equal(values(g).plansAt,'eda');
  depart(g,'work');assert.equal(values(g).causeKnown,false);arrive(g);assert.equal(values(g).causeKnown,false);assert.equal(values(g).zones,false);choose(g,'listen');assert.equal(values(g).causeKnown,true);assert.equal(values(g).zones,false);choose(g,'zones');
  const save=g.save();assert.equal(g.dispatch({type:'choose',id:'zones'}),false);assert.equal(g.save(),save);checkpoint(g);
});
test('q009 hearing the cause and sealing first never invent structural proof',()=>{
  const g=ready();choose(g,'move');const before=g.save();assert.equal(g.dispatch({type:'choose',id:'holes'}),false);assert.equal(g.save(),before);
  assert.ok(g.dispatch({type:'choose',id:'guide'}));assert.ok(projectGame(g).dialog.text.includes('封鎖は終わっていない'));drain(g);assert.equal(values(g).ratsAt,'work');assert.equal(values(g).ratsCleared,true);assert.equal(values(g).holes,false);assert.equal(values(g).structureChecked,false);
  choose(g,'holes','work');assert.equal(values(g).causeKnown,false);choose(g,'listen','zones','granary');assert.equal(values(g).structureChecked,false);assert.equal(values(g).verified,false);
  choose(g,'verify');assert.equal(values(g).structureChecked,false);choose(g,'survey','return');assert.equal(values(g).structureChecked,true);assert.equal(values(g).verified,false);choose(g,'finish');assert.equal(g.state.quests.q009.outcome,'informed');
});
test('q009 receiving consent, escort, loading, transport and receipt keep one grain holder',()=>{
  const g=ready();choose(g,'move','grain');assert.equal(values(g).storeConsent,false);assert.equal(values(g).grainAt,'granary');assert.equal(values(g).received,false);
  choose(g,'request');depart(g,'escort');assert.equal(values(g).clerksAt,'transit');town(g,'e2_rat_lane');checkpoint(g);assert.equal(values(g).grainAt,'granary');arrive(g);
  assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['storekeeper','clerks']);assert.equal(values(g).grainAt,'granary');choose(g,'load');assert.equal(values(g).grainAt,'party');assert.equal(values(g).received,false);
  depart(g,'transport');assert.equal(values(g).clerksAt,'transit');assert.equal(values(g).storekeeperAt,'granary');town(g,'e2_rat_lane');checkpoint(g);arrive(g);assert.equal(values(g).grainAt,'party');assert.equal(values(g).received,false);assert.equal(values(g).clerksAt,'store');
  const before=g.save();assert.throws(()=>g.complete('q009','compromise'));assert.equal(g.save(),before);choose(g,'receive');assert.equal(values(g).grainAt,'clerks');assert.equal(values(g).received,true);assert.equal(values(g).structureChecked,false);assert.equal(values(g).holes,false);assert.equal(values(g).ratsAt,'granary');checkpoint(g);
});
test('q009 hunting starts only in the ground granary and commits only on victory',()=>{
  const g=ready();depart(g,'hunt');assert.equal(g.state.battle,null);assert.equal(values(g).hunted,false);arrive(g);assert.equal(g.state.mode,'town');assert.equal(g.state.townLocation,'e2_rat_granary');depart(g,'hunt');assert.ok(g.state.battle);assert.equal(values(g).hunted,false);assert.equal(values(g).ratsAt,'granary');checkpoint(g);fight(g);assert.equal(g.state.quests.q009.outcome,'contract');assert.equal(values(g).ratsAt,'work');assert.equal(values(g).grainAt,'granary');assert.equal(values(g).holes,false);checkpoint(g);
});
for(const result of ['escape','lose'])test('q009 hunting '+result+' keeps the uncompleted work and permits retry',()=>{
  const g=ready();choose(g,'hunt');depart(g,'hunt');g.finishBattle(result);drain(g);assert.equal(values(g).ratsAt,'granary');assert.equal(values(g).hunted,false);assert.equal(values(g).ratsCleared,false);checkpoint(g);resume(g);choose(g,'hunt');assert.equal(g.state.quests.q009.outcome,'contract');checkpoint(g);
});
const departures=new Map(),work=new Map();
for(const r of graph.active){for(const [key,a] of Object.entries(source.story.actions))if(a.journey&&a.from.includes(r.scene)&&!departures.has(key)){const g=ready();g.load(r.save);if(projectGame(g).dialog.options.find(o=>o.id===key.slice(r.scene.length+1))?.enabled)departures.set(key,{save:r.save,id:key.slice(r.scene.length+1)});}if(r.path.length&&!work.has(r.scene))work.set(r.scene,r.save);}
assert.equal(departures.size,10);
for(const [key,row] of departures)for(const kind of ['retreat','defeat'])test(`q009 ${key} preserves the journey and holders across ${kind}`,()=>{
  const g=ready();g.load(row.save);depart(g,row.id);const before=structuredClone(g.state.stories.q009),journey=structuredClone(g.state.journey);
  if(g.state.mode==='town'){town(g,'e2_wharf');assert.ok(g.dispatch({type:'world.cross',route:'waterway_surface'}));drain(g);}
  if(kind==='retreat')assert.ok(g.dispatch({type:'retreat'}));else g.defeat();drain(g);checkpoint(g);assert.deepEqual(g.state.stories.q009,before);assert.deepEqual(g.state.journey,journey);arrive(g);checkpoint(g);
});
for(const [scene,save] of work)test('q009 local work at '+scene+' remains committed after rescue',()=>{
  const g=ready();g.load(save);const before=structuredClone(g.state.stories.q009);g.defeat();drain(g);checkpoint(g);resume(g);assert.deepEqual(g.state.stories.q009,before);checkpoint(g);
});
test('q009 all original cyclic states and VM frames are retained exactly',()=>{
  for(const row of oldRows){const old=new GameEngine(previousData);old.load(row.save);const expected=JSON.parse(row.save);(expected.state.flags.preservedStoryRoutes??={}).q009=true;const g=migrated(old);assert.deepEqual(JSON.parse(g.save()),expected);assert.deepEqual(g.data.quests.q009.story,previous.story);checkpoint(g);}
});
for(const r of oldGraph.endings)test('q009 accepted original route '+r.path.join('/'),()=>{
  const g=migrated(ready({old:true}));for(const id of r.path){choose(g,id);checkpoint(g);}assert.equal(g.state.quests.q009.outcome,r.outcome);
});
for(const frame of ['unvisited','text','battle'])test('q009 preserves original '+frame+' continuation',()=>{
  const old=ready({old:true,visit:false});if(frame!=='unvisited'){go(old,'junction');old.run(previous.model.entryScript);if(frame==='battle'){drain(old);depart(old,'hunt');}}
  const g=migrated(old);assert.deepEqual(g.state.vm,old.state.vm);assert.deepEqual(g.state.waiting,old.state.waiting);assert.deepEqual(g.state.battle,old.state.battle);checkpoint(g);
  if(frame==='battle')fight(g);else{if(frame==='unvisited'){go(g,'junction');g.run(previous.model.entryScript);}drain(g);choose(g,'move','grain');}checkpoint(g);
});
test('q009 legacy acceptance and current saves can alternate without showing old events',()=>{
  const old=ready({old:true}),current=ready(),g=ready();
  for(const [raw,preserved] of [[old.save(),true],[current.save(),false],[old.save(),true]]){g.load(raw);checkpoint(g);assert.equal(Boolean(g.state.flags.preservedStoryRoutes?.q009),preserved);assert.equal(Boolean(g.data.quests.q009.story.worldPlaces),!preserved);for(const map of Object.values(g.data.maps))for(const o of map.objects.filter(o=>o.quest==='q009'&&objectVisible(g.state,map,o)))assert.equal(o.id.startsWith('q009_rat_route_'),!preserved);}
  const legacy=ready({old:true,visit:false});(legacy.state.flags.legacyStoryRoutes??={}).q009=true;const l=migrated(legacy);go(l,'junction');l.run(l.data.quests.q009.model.entryScript);drain(l);assert.equal(l.state.stories.q009,undefined);checkpoint(l);
  const fresh=new GameEngine(previousData);drain(fresh);g.load(fresh.save());assert.equal(g.data,data);assert.ok(g.accept('q009'));assert.equal(g.state.flags.currentStoryRoutes.q009,true);go(g,'junction');g.run(g.data.quests.q009.model.entryScript);drain(g);assert.equal(g.state.stories.q009.revision,2);checkpoint(g);
});
test('q009 invalid partial states and mixed revisions are rejected atomically',()=>{
  const g=ready(),before=g.save(),definition=g.data,old=ready({old:true});
  for(const mutate of [s=>s.state.inventory.rope=-1,s=>s.state.stories.q009.values.grainAt='missing',s=>s.state.vm.at(-1).index=99999]){const bad=JSON.parse(old.save());mutate(bad);assert.deepEqual(migrateSave(bad,data),bad);assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),before);assert.equal(g.data,definition);}
  for(const mutate of [s=>s.state.stories.q009.values.holes=true,s=>s.state.stories.q009.values.received=true,s=>s.state.stories.q009.values.edaAt='store',s=>s.state.stories.q009.revision=1,s=>s.state.vm.at(-1).script='q009.v11.entry',s=>(s.state.flags.preservedStoryRoutes??={}).q009=true]){const bad=JSON.parse(before);mutate(bad);assert.ok(validateSave(bad,data).length);assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),before);}
});
test('q009 every outcome reward is paid once after reload and revisit',()=>{
  for(const outcome of ['informed','compromise','contract']){const row=graph.endings.find(r=>r.outcome===outcome),g=ready();g.load(row.save);checkpoint(g);const before=g.save(),reward=JSON.stringify([g.state.gold,g.state.actors,g.state.vars]);assert.throws(()=>g.complete('q009',outcome));assert.equal(g.save(),before);g.run(g.data.quests.q009.model.entryScript);drain(g);assert.equal(JSON.stringify([g.state.gold,g.state.actors,g.state.vars]),reward);checkpoint(g);}
});
