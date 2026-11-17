import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import {GameEngine} from '../src/core/engine.js';
import {validateSave,migrateSave} from '../src/core/save.js';
import {nextQuestPlace} from '../src/core/quest-navigation.js';
import {projectGame} from '../src/application/projection.js';
import {objectVisible} from '../src/core/quest-events.js';
import {wageBoxSource} from '../authoring/editions/e2/story-q006.mjs';
import {data,previous,previousData,routes,oldRoutes,privateLift,jointLift,investigation,ready,choose,depart,arrive,resume,checkpoint,values,go,migrated,drain,fight} from './q006-helpers.mjs';

test('q006 original edition, accepted scripts and seven historical paths stay intact',()=>{
  assert.deepEqual(previousData.quests.q006,previous);
  const bytes=fs.readFileSync(new URL('./fixtures/e2-q006-before-world.json',import.meta.url));
  assert.equal(createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),'7410dc5c0ea075ed295b142428419dba754e813a');
  for(const [key,script] of Object.entries(previous.scripts))assert.deepEqual(data.scripts[key],script,key);
  assert.equal(Object.keys(data.quests.q006.story.scenes).length,16);assert.equal(Object.keys(data.quests.q006.story.actions).length,21);
  const source=wageBoxSource(),all=[];
  function visit(id,path){for(const o of source.nodes.find(n=>n.id===id).options){const p=[...path,o.id];if(o.to.startsWith('@'))all.push({path:p,outcome:o.to.slice(1)});else visit(o.to,p);}}
  visit('entry',[]);assert.deepEqual(all.map(JSON.stringify).sort(),routes.map(JSON.stringify).sort());
});
for(const r of routes)test('q006 current route '+r.path.join('/'),()=>{
  const g=ready(),gold=g.state.gold,rope=g.state.inventory.rope;checkpoint(g);
  for(const id of r.path){choose(g,id);checkpoint(g);}
  assert.equal(g.state.quests.q006.outcome,r.outcome);
  assert.equal(g.state.inventory.rope,rope-(r.path[0]==='lift'&&r.path[1]==='lift'?1:0));
  assert.ok(g.state.gold>=gold+data.quests.q006.outcomes[r.outcome].gold);
  const before=g.save();assert.throws(()=>g.complete('q006',r.outcome));assert.equal(g.save(),before);
  const reward=JSON.stringify([g.state.gold,g.state.actors,g.state.vars]);g.run(g.data.quests.q006.model.entryScript);drain(g);assert.equal(JSON.stringify([g.state.gold,g.state.actors,g.state.vars]),reward);
  if(r.outcome==='contract'){assert.deepEqual(g.state.stories.q006.knowledge.party??[],[]);assert.equal(values(g).opened,false);}
});
test('q006 rope and box transfer occur only on a local combat victory, before return travel',()=>{
  const g=ready(),rope=g.state.inventory.rope,pos={...g.state.location};depart(g,'lift');assert.deepEqual(g.state.location,pos);assert.equal(g.state.battle,null);assert.equal(values(g).boxAt,'water');arrive(g);
  assert.equal(g.state.stories.q006.scene,'water_private');depart(g,'lift');checkpoint(g);assert.ok(g.state.battle);assert.equal(g.state.inventory.rope,rope);assert.equal(values(g).boxAt,'water');
  fight(g);assert.equal(values(g).boxAt,'party');assert.equal(g.state.inventory.rope,rope-1);assert.equal(values(g).partyAt,'water');assert.equal(values(g).garoAt,'landing');checkpoint(g);
  const before=g.save();assert.throws(()=>g.complete('q006','contract'));assert.equal(g.save(),before);depart(g,'return');assert.equal(values(g).boxAt,'party');arrive(g);assert.equal(values(g).partyAt,'landing');
});
for(const result of ['escape','lose'])test(`q006 battle ${result} retains unspent rope and unrecovered box`,()=>{
  const g=ready();choose(g,'lift');const rope=g.state.inventory.rope;depart(g,'lift');checkpoint(g);
  g.finishBattle(result);drain(g);assert.equal(g.state.inventory.rope,rope);assert.equal(values(g).boxAt,'water');checkpoint(g);resume(g);
  choose(g,'witness','recover','lift','return',...investigation,'delegate');assert.equal(g.state.inventory.rope,rope);assert.equal(g.state.quests.q006.outcome,'compromise');
});
test('q006 joint recovery is free, carries people, and opens the lock only at the shore',()=>{
  const g=ready();g.state.inventory.rope=0;choose(g,'witness');depart(g,'recover');assert.equal(values(g).workersAt,'transit');assert.equal(values(g).accusedAt,'transit');assert.equal(values(g).boxAt,'water');checkpoint(g);arrive(g);
  assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['workers','accused']);choose(g,'lift');assert.equal(values(g).boxAt,'party');assert.equal(values(g).opened,false);
  depart(g,'return');assert.equal(values(g).garoAt,'landing');arrive(g);assert.equal(values(g).opened,false);assert.deepEqual(g.state.stories.q006.knowledge.party??[],[]);
  assert.ok(projectGame(g).dialog.options.find(o=>o.id==='open').text.includes('留め金'));choose(g,'open');assert.equal(values(g).opened,true);assert.deepEqual(g.state.stories.q006.knowledge.party,['stones']);
});
test('q006 reclaiming the closed box transfers it before walking and does not reveal stones',()=>{
  const g=ready();choose(g,...privateLift,'return');assert.equal(values(g).boxAt,'garo');depart(g,'retract');assert.equal(values(g).boxAt,'party');assert.equal(values(g).handed,false);assert.equal(values(g).opened,false);assert.deepEqual(g.state.stories.q006.knowledge.party??[],[]);arrive(g);checkpoint(g);choose(g,'open');
});
test('q006 reads both ledgers locally and proves debt only after returning for public comparison',()=>{
  const g=ready();choose(g,...jointLift,'open','ledger');assert.equal(values(g).garoAt,'landing');depart(g,'ask');assert.equal(values(g).garoAt,'transit');assert.equal(values(g).workersAt,'shore');arrive(g);depart(g,'office');assert.equal(values(g).ledgerAt,'office');arrive(g);
  assert.equal(values(g).ledgerRead,false);choose(g,'read');assert.equal(values(g).ledgerAt,'party');assert.deepEqual(g.state.stories.q006.knowledge.party,['stones','wages','deposits']);
  const before=g.save();assert.throws(()=>g.complete('q006','informed'));assert.equal(g.save(),before);depart(g,'return');checkpoint(g);arrive(g);assert.ok(!g.state.stories.q006.knowledge.party.includes('debt'));choose(g,'compare');assert.ok(g.state.stories.q006.knowledge.party.includes('debt'));
  choose(g,'delegate');assert.equal(values(g).partialPaid,false);assert.equal(values(g).delegated,true);assert.equal(values(g).ledgerAt,'workers');
});
const departures=[
  [[], 'lift'],[[], 'witness'],[['lift'],'witness'],[['lift','lift'],'return'],[['witness'],'recover'],[['witness','recover','lift'],'return'],
  [privateLift,'public'],[[...privateLift,'return'],'retract'],[[...jointLift,'open'],'ledger'],[[...jointLift,'open','ledger'],'ask'],
  [[...jointLift,'open','ledger','ask'],'office'],[[...jointLift,'open','ledger','ask','office','read'],'return']
];
for(const [path,id] of departures)for(const kind of ['retreat','defeat'])test(`q006 ${path.join('/')}/${id} journey survives ${kind}`,()=>{
  const g=ready();choose(g,...path);depart(g,id);const before=structuredClone(g.state.stories.q006),journey=structuredClone(g.state.journey),rope=g.state.inventory.rope;
  if(kind==='retreat')assert.ok(g.dispatch({type:'retreat'}));else g.defeat();drain(g);checkpoint(g);
  assert.deepEqual(g.state.stories.q006,before);assert.deepEqual(g.state.journey,journey);assert.equal(g.state.inventory.rope,rope);arrive(g);checkpoint(g);
});
for(const path of [['lift','lift'],[...jointLift,'open'],[...jointLift,'open','ledger','ask','office','read'],[...jointLift,...investigation]])test('q006 committed local work survives rescue '+path.join('/'),()=>{
  const g=ready();choose(g,...path);const before=structuredClone(g.state.stories.q006),rope=g.state.inventory.rope;g.defeat();drain(g);checkpoint(g);resume(g);checkpoint(g);assert.deepEqual(g.state.stories.q006,before);assert.equal(g.state.inventory.rope,rope);
});
test('q006 rope shortage can use free recovery or leave for real supplies without committing work',()=>{
  for(const supply of [false,true]){
    const g=ready();choose(g,'lift');g.state.inventory.rope=0;const before=g.save();assert.equal(g.dispatch({type:'choose',id:'lift'}),false);assert.equal(g.save(),before);
    if(supply){depart(g,'lift_supplies');checkpoint(g);assert.ok(g.dispatch({type:'retreat'}));g.give('rope',1);go(g,'water');assert.ok(g.dispatch({type:'story.resume',quest:'q006'}));drain(g);choose(g,'lift','return','return','leave');}
    else choose(g,'witness','recover','lift','return',...investigation,'delegate');
    assert.equal(g.state.inventory.rope,0);assert.equal(g.state.quests.q006.stage,'completed');checkpoint(g);
  }
});
test('q006 scene sites avoid doors and supplies; flooded compartments remain inaccessible',()=>{
  const g=ready(),map=g.map(),points=Object.values(g.data.quests.q006.story.worldPlaces);assert.equal(new Set(points.map(p=>`${p.x},${p.y}`)).size,4);
  for(const p of points){assert.ok(g.walkable(map,p.x,p.y));assert.ok(!['1,1','9,1','1,5'].includes(`${p.x},${p.y}`));}
  checkpoint(g);g.defeat();drain(g);g.state.dungeons.persistent.region_1.systems.water.controls.lower_gate=true;
  for(const p of points)assert.equal(g.walkable(map,p.x,p.y),false);checkpoint(g);
  go(g,'landing');assert.equal(g.state.dungeons.persistent.region_1.systems.water.controls.lower_gate,false);resume(g);checkpoint(g);
});
for(const r of oldRoutes)test('q006 old accepted path remains playable '+r.path.join('/'),()=>{
  const old=ready({old:true}),g=migrated(old);assert.deepEqual(g.data.quests.q006.story,previous.story);
  for(const id of r.path){choose(g,id);checkpoint(g);}assert.equal(g.state.quests.q006.outcome,r.outcome);
});
for(const path of [[],['lift'],['lift','return'],['witness'],['witness','ledger'],['witness','ledger','delegate']])test('q006 preserves old VM and knowledge at '+path.join('/'),()=>{
  const old=ready({old:true});choose(old,...path);const expected=JSON.parse(old.save());(expected.state.flags.preservedStoryRoutes??={}).q006=true;
  const g=migrated(old);assert.deepEqual(JSON.parse(g.save()),expected);checkpoint(g);if(g.state.quests.q006.stage==='active')assert.equal(nextQuestPlace(data,g.state,'q006').object,'q006_decision');
});
test('q006 old battle, text and supply frames retain exact continuation when loaded',()=>{
  for(const type of ['text','battle','shortage']){
    const old=ready({old:true,visit:false});go(old,'landing');old.run(previous.model.entryScript);
    if(type!=='text'){drain(old);if(type==='shortage'){old.state.inventory.rope=0;depart(old,'lift_supplies');}else depart(old,'lift');}
    const expected=JSON.parse(old.save());(expected.state.flags.preservedStoryRoutes??={}).q006=true;const g=migrated(old);assert.deepEqual(JSON.parse(g.save()),expected);checkpoint(g);
    if(type==='battle'){fight(g);choose(g,'return','leave');assert.equal(g.state.quests.q006.outcome,'contract');}
  }
});
test('q006 accepted and legacy saves pin the old route; unaccepted saves adopt the new one',()=>{
  const old=ready({old:true,visit:false});(old.state.flags.legacyStoryRoutes??={}).q006=true;const g=migrated(old);assert.equal(g.state.flags.preservedStoryRoutes.q006,true);assert.equal(g.state.stories.q006,undefined);go(g,'landing');g.run(g.data.quests.q006.model.entryScript);drain(g);checkpoint(g);assert.equal(g.state.stories.q006,undefined);
  const fresh=new GameEngine(previousData);drain(fresh);g.load(fresh.save());assert.equal(g.data,data);assert.ok(g.accept('q006'));assert.equal(g.state.flags.currentStoryRoutes.q006,true);checkpoint(g);
});
test('q006 current and preserved saves can alternate in one engine with correct visible events',()=>{
  const current=ready(),old=migrated(ready({old:true})),g=ready();
  for(const [save,prefix] of [[old.save(),'q006_decision'],[current.save(),'q006_wage_box_'],[old.save(),'q006_decision']]){
    g.load(save);checkpoint(g);const ids=g.map().objects.filter(o=>o.quest==='q006'&&objectVisible(g.state,g.map(),o)).map(o=>o.id);assert.ok(ids.length);assert.ok(ids.every(id=>id.startsWith(prefix)));
  }
});
test('q006 invalid old saves and mixed routes are rejected without changing the running definition',()=>{
  const g=ready(),before=g.save(),definition=g.data,old=ready({old:true});
  for(const mutate of [s=>s.state.inventory.rope=-1,s=>s.state.stories.q006.values.boxAt='missing',s=>s.state.vm.at(-1).index=99999]){const bad=JSON.parse(old.save());mutate(bad);assert.deepEqual(migrateSave(bad,data),bad);assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),before);assert.equal(g.data,definition);}
  for(const preserved of [false,true]){const src=preserved?migrated(old):g;for(const mutate of [s=>(s.state.flags[preserved?'currentStoryRoutes':'preservedStoryRoutes']??={}).q006=true,s=>s.state.stories.q006.revision=preserved?2:1,s=>s.state.vm.at(-1).script=preserved?'q006.wagebox.entry':'q006.v11.entry']){const bad=JSON.parse(src.save());mutate(bad);assert.ok(validateSave(bad,data).length);assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),before);assert.equal(g.data,definition);}}
});
