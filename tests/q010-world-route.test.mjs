import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {GameEngine} from '../src/core/engine.js';
import {validateSave,migrateSave} from '../src/core/save.js';
import {projectGame} from '../src/application/projection.js';
import {objectVisible} from '../src/core/quest-events.js';
import {connectionBlocked,connectionSurfaces} from '../src/core/systems/map-connections.js';
import {sluiceSource} from '../authoring/editions/e2/story-q010.mjs';
import {data,previous,previousData,ready,values,checkpoint,depart,arrive,choose,go,resume,migrated,drain,enumerate,translate,inspection,rescueNear,rescueDeep,rescueBook,closeAll,walk} from './q010-helpers.mjs';
const source=sluiceSource(),graph=enumerate(),oldGraph=enumerate({old:true});

test('q010 keeps original bytes, commands, outcomes and rewards',()=>{
  const bytes=fs.readFileSync(new URL('./fixtures/e2-q010-before-world.json',import.meta.url));
  assert.equal(createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),'f2afe0b0b52441e9cfa32c934946268bb16eda10');
  assert.deepEqual(previousData.quests.q010,previous);assert.deepEqual(data.quests.q010.outcomes,previous.outcomes);
  for(const [id,s] of Object.entries(previous.scripts))assert.deepEqual(data.scripts[id],s,id);
});
test('q010 explores every action, all operation orders and all 19 final states',()=>{
  assert.equal(oldGraph.active.length,11);assert.equal(oldGraph.endings.length,19);
  assert.equal(graph.active.length,148);assert.equal(graph.endings.length,19);
  assert.deepEqual(['informed','rescued','partial','contract','compromise'].map(k=>graph.endings.filter(r=>r.outcome===k).length),[1,2,4,3,9]);
  const g=ready();for(const r of [...graph.active,...graph.endings]){g.load(r.save);checkpoint(g);}
  assert.deepEqual([...new Set(graph.active.map(r=>r.scene))].sort(),Object.keys(source.story.scenes).sort());
  assert.deepEqual([...new Set([...graph.active,...graph.endings].flatMap(r=>JSON.parse(r.save).state.stories.q010.events))].sort(),Object.keys(source.story.actions).sort());
});
for(const [i,r] of oldGraph.endings.entries())test(`q010 original ending-state ${i} retains every fact and known proposition`,()=>{
  const g=ready();choose(g,...translate(r.path));checkpoint(g);assert.equal(g.state.quests.q010.outcome,r.outcome);
  assert.deepEqual(Object.fromEntries(Object.keys(previous.story.registry).map(k=>[k,values(g)[k]])),r.values);
  assert.deepEqual(g.state.stories.q010.knowledge,r.knowledge);
});
test('q010 opening, lower inspection, upper arrival, upper inspection and supply are distinct',()=>{
  const g=ready();depart(g,'shaft');assert.equal(values(g).shaftOpened,false);arrive(g);choose(g,'open');assert.equal(values(g).shaftOpened,true);assert.equal(values(g).bottomChecked,false);
  const shaft=data.dungeons.region_1.systems.connections.links.find(l=>l.id==='q010_shaft');assert.ok(connectionBlocked(data,g.state,{link:shaft,from:shaft.a,to:shaft.b}));
  choose(g,'inspect');assert.equal(values(g).bottomChecked,true);assert.equal(values(g).shaftChecked,false);assert.ok(!connectionBlocked(data,g.state,{link:shaft,from:shaft.a,to:shaft.b}));
  choose(g,'climb');assert.equal(values(g).topChecked,false);choose(g,'inspect');assert.equal(values(g).topChecked,true);assert.equal(values(g).shaftChecked,false);choose(g,'contact');assert.equal(values(g).shaftChecked,false);choose(g,'register');assert.equal(values(g).shaftChecked,true);
  assert.deepEqual(g.state.stories.q010.knowledge.party??[],[]);choose(g,'return','listen');assert.deepEqual(g.state.stories.q010.knowledge.party,['delay']);checkpoint(g);
});
for(const [group,saved,path] of [['nearPeople','nearSaved',['near']],['deepPeople','deepSaved',['deep','near','rig','deep']]])test(`q010 ${group} travels through the shaft and is counted only after arrival confirmation`,()=>{
  const g=ready();choose(g,...inspection,...path);depart(g,'escort');assert.equal(values(g)[group+'At'],'transit');assert.equal(values(g)[saved],false);
  const ladder=data.dungeons.region_1.systems.connections.links.find(l=>l.id==='q010_ladder');assert.ok(connectionBlocked(data,g.state,{link:ladder,from:ladder.a,to:ladder.b}));assert.ok(connectionBlocked(data,g.state,{link:ladder,from:ladder.b,to:ladder.a}));
  checkpoint(g);arrive(g);assert.equal(values(g)[group+'At'],'ground');assert.equal(values(g)[saved],false);checkpoint(g);choose(g,'confirm');assert.equal(values(g)[saved],true);choose(g,'return');assert.equal(values(g)[group+'At'],'ground');checkpoint(g);
});
test('q010 receipt, fixing and recovery each change the rope holder at its physical site',()=>{
  const g=ready();choose(g,...inspection);assert.ok(projectGame(g).dialog.text.includes('門番が保持'));choose(g,'deep');assert.equal(values(g).rescueRopeAt,'party');assert.equal(values(g).ropeRigged,false);choose(g,'near','rig');assert.equal(values(g).rescueRopeAt,'near');assert.equal(values(g).ropeRigged,true);
  choose(g,'deep','escort','confirm','return');assert.equal(values(g).rescueRopeAt,'near');choose(g,...rescueNear,'all');assert.equal(values(g).rescueRopeAt,'near');choose(g,'recover');assert.equal(values(g).rescueRopeAt,'party');assert.equal(values(g).ropeRigged,false);assert.equal(values(g).closed,false);choose(g,'return','close');assert.equal(values(g).closed,true);assert.equal(values(g).keeperAt,'control');checkpoint(g);
});
test('q010 book pickup, reading, transport and deposit retain one holder',()=>{
  const g=ready();choose(g,...inspection,'book');assert.equal(values(g).bookAt,'landing');choose(g,'take');assert.equal(values(g).bookAt,'party');assert.equal(g.state.stories.q010.knowledge.party.includes('book'),false);choose(g,'read');assert.ok(g.state.stories.q010.knowledge.party.includes('book'));
  depart(g,'carry');assert.equal(values(g).bookAt,'party');assert.equal(values(g).bookSaved,false);checkpoint(g);arrive(g);assert.equal(values(g).bookSaved,false);choose(g,'deposit');assert.equal(values(g).bookAt,'rine');assert.equal(values(g).bookSaved,true);assert.equal(values(g).filed,false);checkpoint(g);
});
test('q010 summoning, escort arrival, handover and the keeper escape are separate',()=>{
  const g=ready();choose(g,'pump','open','inspect','climb','inspect','contact','register');assert.equal(values(g).crewCalled,false);choose(g,'summon');assert.equal(values(g).crewCalled,true);assert.equal(values(g).crewAt,'ground');assert.equal(values(g).pumpHandover,false);
  depart(g,'escort');assert.equal(values(g).crewAt,'transit');checkpoint(g);arrive(g);assert.equal(values(g).crewAt,'control');assert.equal(values(g).pumpHandover,false);choose(g,'handover');assert.equal(values(g).pumpHandover,true);assert.equal(values(g).closed,false);assert.equal(values(g).keeperAt,'control');choose(g,'escape');assert.equal(values(g).keeperAt,'ground');assert.equal(g.state.quests.q010.stage,'active');choose(g,'pump');assert.equal(g.state.quests.q010.outcome,'compromise');assert.deepEqual(g.state.stories.q010.knowledge.party??[],[]);checkpoint(g);
});
for(const outcome of ['contract','partial','rescued','informed'])test(`q010 ${outcome} closes all physical approaches to the inner districts across reload`,()=>{
  const row=graph.endings.find(r=>r.outcome===outcome),g=ready();g.load(row.save);checkpoint(g);
  const d=data.dungeons.region_1,links=d.systems.connections.links,gate=links.find(l=>l.id==='q010_gate');
  for(const [from,to] of [[gate.a,gate.b],[gate.b,gate.a]])assert.ok(connectionBlocked(data,g.state,{link:gate,from,to}));
  const seen=new Set(['e2_sluice_ground']);let changed=true;
  while(changed){changed=false;for(const link of links)for(const [from,to] of [[link.a,link.b],[link.b,link.a]])if(seen.has(from.map)&&!seen.has(to.map)&&!connectionBlocked(data,g.state,{link,from,to})){seen.add(to.map);changed=true;}}
  for(const place of ['near','deep','landing'])assert.equal(seen.has('e2_sluice_'+place),false);
  assert.ok(seen.has('e2_sluice_control'));assert.ok(seen.has('region_1_gatehouse'));assert.ok(seen.has('e2_sluice_shaft'));
  go(g,'control');walk(g,5,1);assert.equal(g.dispatch({type:'dungeon.action',system:'connections',action:'cross',target:'q010_gate'}),false);
  while(g.state.location.facing!=='east')assert.ok(g.dispatch({type:'move',direction:'right'}));assert.equal(g.dispatch({type:'move',direction:'forward'}),false);assert.equal(g.state.location.map,'e2_sluice_control');assert.equal(connectionSurfaces(data,g.state).doors['5,1/east'].closed,true);checkpoint(g);
});
test('q010 deep-only closure leaves the rescue rope fixed and the other three unconfirmed',()=>{
  const g=ready();choose(g,...inspection,...rescueDeep,'partial');assert.equal(values(g).ropeRigged,true);assert.equal(values(g).rescueRopeAt,'near');assert.equal(values(g).nearPeopleAt,'near');assert.equal(values(g).nearSaved,false);choose(g,'escape','partial');assert.equal(values(g).deepSaved,true);checkpoint(g);
});
const departures=new Map(),work=new Map();
for(const r of graph.active){const g=ready();g.load(r.save);for(const o of projectGame(g).dialog.options.filter(o=>o.enabled)){const key=r.scene+'_'+o.id;if(source.story.actions[key].journey&&!departures.has(key))departures.set(key,{save:r.save,id:o.id});}if(r.path.length&&!work.has(r.scene))work.set(r.scene,r.save);}
for(const [key,row] of departures)for(const kind of ['retreat','defeat'])test(`q010 ${key} keeps its companions and destination after ${kind}`,()=>{
  const g=ready();g.load(row.save);depart(g,row.id);const before=structuredClone(g.state.stories.q010),journey=structuredClone(g.state.journey);
  if(kind==='retreat')assert.ok(g.dispatch({type:'retreat'}));else g.defeat();drain(g);checkpoint(g);assert.deepEqual(g.state.stories.q010,before);assert.deepEqual(g.state.journey,journey);arrive(g);checkpoint(g);
});
for(const [scene,save] of work)test(`q010 committed local work at ${scene} survives rescue`,()=>{const g=ready();g.load(save);const before=structuredClone(g.state.stories.q010);g.defeat();drain(g);checkpoint(g);resume(g);assert.deepEqual(g.state.stories.q010,before);checkpoint(g);});
test('q010 all 30 original states and VM frames load exactly',()=>{
  for(const row of [...oldGraph.active,...oldGraph.endings]){const old=new GameEngine(previousData);old.load(row.save);const expected=JSON.parse(row.save);(expected.state.flags.preservedStoryRoutes??={}).q010=true;const g=migrated(old);assert.deepEqual(JSON.parse(g.save()),expected);assert.deepEqual(g.data.quests.q010.story,previous.story);checkpoint(g);}
});
for(const r of oldGraph.endings)test('q010 accepted original route '+r.path.join('/'),()=>{const g=migrated(ready({old:true}));for(const id of r.path){choose(g,id);checkpoint(g);}assert.equal(g.state.quests.q010.outcome,r.outcome);});
for(const frame of ['unvisited','text'])test(`q010 preserves original ${frame} continuation`,()=>{
  const old=ready({old:true,visit:false});if(frame==='text'){go(old,'control');old.run(previous.model.entryScript);}
  const g=migrated(old);assert.deepEqual(g.state.vm,old.state.vm);assert.deepEqual(g.state.waiting,old.state.waiting);checkpoint(g);
  if(frame==='unvisited'){go(g,'control');g.run(previous.model.entryScript);}drain(g);choose(g,'close');assert.equal(g.state.quests.q010.outcome,'contract');checkpoint(g);
});
test('q010 alternates accepted and current saves without mixing events',()=>{
  const old=ready({old:true}),current=ready(),g=ready();
  for(const [raw,preserved] of [[old.save(),true],[current.save(),false],[old.save(),true]]){g.load(raw);checkpoint(g);assert.equal(Boolean(g.state.flags.preservedStoryRoutes?.q010),preserved);for(const m of Object.values(g.data.maps))for(const o of m.objects.filter(o=>o.quest==='q010'&&objectVisible(g.state,m,o)))assert.equal(o.id.startsWith('q010_sluice_'),!preserved);}
});
test('q010 corrupt states and mixed revisions are rejected before mutation',()=>{
  const g=ready(),before=g.save(),definition=g.data,old=ready({old:true});
  for(const mutate of [s=>s.state.inventory.rope=-1,s=>s.state.stories.q010.values.bookAt='missing',s=>s.state.vm.at(-1).index=99999]){const bad=JSON.parse(old.save());mutate(bad);assert.deepEqual(migrateSave(bad,data),bad);assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),before);assert.equal(g.data,definition);}
  for(const mutate of [s=>s.state.stories.q010.values.nearSaved=true,s=>s.state.stories.q010.values.shaftChecked=true,s=>s.state.stories.q010.values.ropeRigged=true,s=>s.state.stories.q010.values.bookSaved=true,s=>s.state.stories.q010.revision=1,s=>s.state.vm.at(-1).script='q010.v11.entry',s=>(s.state.flags.preservedStoryRoutes??={}).q010=true]){const bad=JSON.parse(before);mutate(bad);assert.ok(validateSave(bad,data).length);assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),before);}
});
test('q010 every ending pays its reward only once',()=>{
  for(const outcome of Object.keys(previous.outcomes)){const row=graph.endings.find(r=>r.outcome===outcome),g=ready();g.load(row.save);checkpoint(g);const before=g.save(),reward=JSON.stringify([g.state.gold,g.state.actors,g.state.vars]);assert.throws(()=>g.complete('q010',outcome));assert.equal(g.save(),before);g.run(g.data.quests.q010.model.entryScript);drain(g);assert.equal(JSON.stringify([g.state.gold,g.state.actors,g.state.vars]),reward);checkpoint(g);}
});
