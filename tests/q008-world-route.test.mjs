import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import {GameEngine} from '../src/core/engine.js';
import {validateSave,migrateSave} from '../src/core/save.js';
import {nextQuestPlace} from '../src/core/quest-navigation.js';
import {projectGame} from '../src/application/projection.js';
import {objectVisible} from '../src/core/quest-events.js';
import {pathTo} from './helpers.mjs';
import {storyPlace} from '../src/core/story.js';
import {floatingCoffinSource} from '../authoring/editions/e2/story-q008.mjs';
import {data,previous,previousData,routes,oldRoutes,inspection,ready,choose,depart,arrive,resume,checkpoint,values,go,migrated,drain,fight} from './q008-helpers.mjs';

test('q008 retains the exact shipped definition and scripts alongside three physical routes',()=>{
  assert.deepEqual(previousData.quests.q008,previous);
  const bytes=fs.readFileSync(new URL('./fixtures/e2-q008-before-world.json',import.meta.url));
  assert.equal(createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),'f642d1ba3efd0796c83b02ee217a4eae444aa140');
  for(const [key,script] of Object.entries(previous.scripts))assert.deepEqual(data.scripts[key],script,key);
  const s=floatingCoffinSource(),all=[];
  assert.equal(Object.keys(s.story.scenes).length,28);assert.equal(Object.keys(s.story.actions).length,30);
  assert.equal(Object.values(s.story.actions).filter(a=>a.journey).length,16);
  function visit(id,path){for(const o of s.nodes.find(n=>n.id===id).options){const p=[...path,o.id];if(o.to.startsWith('@'))all.push({path:p,outcome:o.to.slice(1)});else visit(o.to,p);}}
  visit('entry',[]);assert.deepEqual(all.map(JSON.stringify).sort(),routes.map(JSON.stringify).sort());
  assert.deepEqual(data.quests.q008.outcomes,previous.outcomes);
});
for(const r of routes)test('q008 complete physical route '+r.outcome,()=>{
  const g=ready(),gold=g.state.gold;checkpoint(g);
  for(const id of r.path){choose(g,id);checkpoint(g);assert.equal(values(g).bodyAt,'coffin');}
  assert.equal(g.state.quests.q008.outcome,r.outcome);assert.ok(g.state.gold>=gold+data.quests.q008.outcomes[r.outcome].gold);
  const s=g.state.stories.q008,d=g.data.quests.q008.story;
  assert.equal(storyPlace(d,s,'body'),r.outcome==='compromise'?'mortuary':'river');
  assert.equal(storyPlace(d,s,'outerBase'),{contract:'jetty',informed:'shore',compromise:'mortuary'}[r.outcome]);
  assert.equal(storyPlace(d,s,'food'),'jetty');
  const before=g.save();assert.throws(()=>g.complete('q008',r.outcome));assert.equal(g.save(),before);
  const reward=JSON.stringify([g.state.gold,g.state.actors,g.state.vars]);g.run(g.data.quests.q008.model.entryScript);drain(g);assert.equal(JSON.stringify([g.state.gold,g.state.actors,g.state.vars]),reward);
  if(r.outcome==='contract'){assert.deepEqual(s.knowledge.party??[],[]);assert.equal(values(g).inspected,false);assert.equal(values(g).permit,false);}
});
test('q008 consent, retrieval and actual exterior inspection commit separately',()=>{
  const g=ready();choose(g,'inspect');assert.equal(values(g).consent,true);assert.equal(values(g).coffinAt,'threshold');assert.equal(values(g).inspected,false);
  depart(g,'retrieve');assert.equal(values(g).bearersAt,'transit');assert.equal(values(g).familyAt,'shore');arrive(g);assert.equal(values(g).coffinAt,'threshold');
  choose(g,'lift');assert.equal(values(g).coffinAt,'party');assert.equal(values(g).foodAt,'outerBase');depart(g,'return');checkpoint(g);arrive(g);
  assert.equal(values(g).inspected,false);assert.deepEqual(g.state.stories.q008.knowledge.party??[],[]);choose(g,'inspect');assert.equal(values(g).coffinAt,'shore');assert.equal(values(g).inspected,true);assert.deepEqual(g.state.stories.q008.knowledge.party,['cargo']);
});
test('q008 direct tow transfers the coffin only on local victory and delivers only at the jetty',()=>{
  const g=ready(),pos={...g.state.location};depart(g,'tow');assert.deepEqual(g.state.location,pos);assert.equal(g.state.battle,null);arrive(g);
  depart(g,'tow');assert.ok(g.state.battle);assert.equal(values(g).coffinAt,'threshold');checkpoint(g);fight(g);assert.equal(values(g).coffinAt,'party');
  choose(g,'transport');assert.equal(values(g).delivered,false);assert.equal(values(g).outerBaseAt,'coffin');choose(g,'unload');assert.equal(values(g).outerBaseAt,'jetty');assert.equal(values(g).foodAt,'recipient');assert.equal(values(g).delivered,true);
  choose(g,'river');assert.equal(values(g).funeral,false);assert.equal(values(g).coffinAt,'party');choose(g,'release');assert.equal(values(g).funeral,true);checkpoint(g);
});
for(const result of ['escape','lose'])test(`q008 local tow ${result} leaves the coffin at the threshold`,()=>{
  const g=ready();choose(g,'tow');depart(g,'tow');checkpoint(g);g.finishBattle(result);drain(g);
  assert.equal(values(g).coffinAt,'threshold');assert.equal(values(g).foodAt,'outerBase');assert.equal(values(g).delivered,false);assert.equal(values(g).funeral,false);checkpoint(g);resume(g);
  choose(g,...routes[0].path.slice(1));assert.equal(g.state.quests.q008.outcome,'contract');
});
test('q008 funeral, declaration, inquiry, permit and handoff keep distinct commitment points',()=>{
  const g=ready();choose(g,...inspection,'declare');assert.equal(values(g).outerBaseAt,'shore');assert.equal(values(g).foodAt,'yoru');assert.equal(values(g).coffinAt,'party');
  choose(g,'river');assert.equal(values(g).funeral,false);assert.equal(values(g).yoruAt,'shore');choose(g,'release');assert.equal(values(g).coffinAt,'river');
  choose(g,'return','apply');assert.equal(values(g).familyAt,'shore');assert.equal(values(g).bearersAt,'shore');assert.equal(values(g).declared,false);assert.equal(values(g).permit,false);
  choose(g,'declare','fetch');assert.equal(values(g).yoruAt,'office');assert.equal(values(g).foodAt,'yoru');assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['recipient']);
  choose(g,'escort');assert.equal(values(g).permit,false);choose(g,'permit');assert.equal(values(g).permit,true);choose(g,'deliver');assert.equal(values(g).foodAt,'yoru');assert.equal(values(g).delivered,false);
  const before=g.save();assert.throws(()=>g.complete('q008','informed'));assert.equal(g.save(),before);choose(g,'deliver');assert.equal(values(g).delivered,true);
});
test('q008 postponed handoff survives rescue without treating the food as delivered downstream',()=>{
  const g=ready();choose(g,...inspection);depart(g,'quiet');assert.equal(values(g).coffinAt,'party');assert.equal(values(g).familyAt,'transit');assert.equal(values(g).postponed,false);arrive(g);
  assert.equal(values(g).coffinAt,'party');assert.equal(values(g).postponed,false);choose(g,'postpone');assert.equal(values(g).coffinAt,'mortuary');assert.equal(values(g).postponed,true);
  choose(g,'fetch');assert.equal(values(g).yoruAt,'shore');assert.equal(values(g).familyAt,'mortuary');choose(g,'escort','deliver');assert.equal(values(g).foodAt,'outerBase');
  choose(g,'give');assert.equal(values(g).foodAt,'recipient');assert.equal(values(g).delivered,false);const state=structuredClone(g.state.stories.q008);g.defeat();drain(g);checkpoint(g);resume(g);assert.deepEqual(g.state.stories.q008,state);
  depart(g,'escort');assert.equal(values(g).delivered,false);assert.equal(values(g).familyAt,'mortuary');assert.equal(values(g).bearersAt,'mortuary');assert.equal(values(g).foodAt,'recipient');checkpoint(g);arrive(g);
  assert.equal(values(g).delivered,true);assert.equal(values(g).funeral,false);assert.equal(values(g).permit,false);choose(g,'finish');checkpoint(g);
});
const source=floatingCoffinSource(),departures=new Map(),localWork=new Map();
for(const r of routes){let node='entry',path=[];for(const id of r.path){const o=source.nodes.find(n=>n.id===node).options.find(o=>o.id===id),a=source.story.actions[o.action];if(a.journey)departures.set(o.action,[path,id]);else if(!o.to.startsWith('@'))localWork.set(o.to,[...path,id]);path=[...path,id];node=o.to;}}
for(const [action,[path,id]] of departures)for(const kind of ['retreat','defeat'])test(`q008 ${action} retains holders and companions through ${kind}`,()=>{
  const g=ready();choose(g,...path);depart(g,id);const before=structuredClone(g.state.stories.q008),journey=structuredClone(g.state.journey);
  if(kind==='retreat')assert.ok(g.dispatch({type:'retreat'}));else g.defeat();drain(g);checkpoint(g);assert.deepEqual(g.state.stories.q008,before);assert.deepEqual(g.state.journey,journey);arrive(g);checkpoint(g);
});
for(const [scene,path] of localWork)test('q008 committed local work survives rescue at '+scene,()=>{
  const g=ready();choose(g,...path);const before=structuredClone(g.state.stories.q008);g.defeat();drain(g);checkpoint(g);resume(g);assert.deepEqual(g.state.stories.q008,before);checkpoint(g);
});
test('q008 six physical sites are reachable and avoid water controls, doors and supplies',()=>{
  const g=ready(),map=g.map(),points=Object.values(g.data.quests.q008.story.worldPlaces);assert.equal(new Set(points.map(p=>`${p.x},${p.y}`)).size,6);
  for(const p of points){assert.ok(g.walkable(map,p.x,p.y));assert.ok(!['1,1','9,1','2,1','8,1'].includes(`${p.x},${p.y}`));assert.ok(pathTo(g,p.x,p.y).length||g.state.location.x===p.x&&g.state.location.y===p.y);}
  for(const key of ['tiles','cells']){assert.ok(data.maps.region_1_lower_landing[key]);assert.deepEqual(data.maps.region_1_lower_landing[key],previousData.maps.region_1_lower_landing[key]);}checkpoint(g);
});
for(const version of [1,2])for(const r of oldRoutes)for(let step=0;step<=r.path.length;step++)test(`q008 revision ${version} ${r.outcome} checkpoint ${step} migrates and completes its original route`,()=>{
  const old=ready({old:version});choose(old,...r.path.slice(0,step));const before=structuredClone(old.state),g=migrated(old),s=g.state.stories.q008;
  assert.equal(s.revision,2);assert.equal(g.state.flags.preservedStoryRoutes.q008,true);assert.deepEqual(g.data.quests.q008.story,previous.story);
  for(const key of ['delivered','funeral','postponed','permit','declared','bodyAt'])assert.deepEqual(s.values[key],before.stories.q008.values[key]);
  assert.deepEqual(s.events,before.stories.q008.events);assert.deepEqual(s.knowledge,before.stories.q008.knowledge);assert.deepEqual(g.state.records,before.records);assert.equal(g.state.gold,before.gold);
  assert.equal(s.values.outerBaseAt,s.events.includes('entry_tow')?'jetty':s.values.funeral?'shore':'coffin');
  assert.equal(s.values.foodAt,before.stories.q008.values.foodAt==='coffin'?'outerBase':before.stories.q008.values.foodAt);
  if(version===2){const expected=JSON.parse(old.save());(expected.state.flags.preservedStoryRoutes??={}).q008=true;assert.deepEqual(JSON.parse(g.save()),expected);}
  checkpoint(g);if(g.state.quests.q008.stage==='active')assert.equal(nextQuestPlace(data,g.state,'q008').object,'q008_decision');
  choose(g,...r.path.slice(step));assert.equal(g.state.quests.q008.outcome,r.outcome);checkpoint(g);
});
for(const version of [1,2])for(const frame of ['unvisited','text','battle'])test(`q008 revision ${version} preserves ${frame} VM continuation`,()=>{
  const old=ready({old:version,visit:false});if(frame!=='unvisited'){go(old,'shore');old.run(previous.model.entryScript);if(frame==='battle'){drain(old);depart(old,'tow');}}
  const before=structuredClone(old.state),g=migrated(old);assert.deepEqual(g.state.vm,before.vm);assert.deepEqual(g.state.battle,before.battle);checkpoint(g);
  if(frame==='unvisited'){go(g,'shore');g.run(g.data.quests.q008.model.entryScript);drain(g);choose(g,'inspect','quiet','deliver');}
  else if(frame==='battle'){fight(g);assert.equal(g.state.quests.q008.outcome,'contract');}else{drain(g);choose(g,'inspect','declare','permit');}checkpoint(g);
});
test('q008 legacy accepted saves stay old while unaccepted saves adopt revision three',()=>{
  const old=ready({old:true,visit:false});(old.state.flags.legacyStoryRoutes??={}).q008=true;const g=migrated(old);go(g,'shore');g.run(g.data.quests.q008.model.entryScript);drain(g);assert.equal(g.state.stories.q008,undefined);checkpoint(g);
  const fresh=new GameEngine(previousData);drain(fresh);g.load(fresh.save());assert.equal(g.data,data);assert.ok(g.accept('q008'));assert.equal(g.state.flags.currentStoryRoutes.q008,true);go(g,'shore');g.run(g.data.quests.q008.model.entryScript);drain(g);assert.equal(g.state.stories.q008.revision,3);checkpoint(g);
});
test('q008 revisions one, two and three alternate with exclusive old and new events',()=>{
  const current=ready(),v1=ready({old:1}),v2=ready({old:2}),g=ready();
  for(const [save,prefix] of [[v1.save(),'q008_decision'],[current.save(),'q008_floating_coffin_'],[v2.save(),'q008_decision'],[current.save(),'q008_floating_coffin_'],[v1.save(),'q008_decision']]){
    g.load(save);checkpoint(g);const ids=g.map().objects.filter(o=>o.quest==='q008'&&objectVisible(g.state,g.map(),o)).map(o=>o.id);assert.ok(ids.length);assert.ok(ids.every(id=>id.startsWith(prefix)),ids.join(','));
  }
});
test('q008 corrupt old migrations and mixed revisions are rejected atomically',()=>{
  const g=ready(),before=g.save(),definition=g.data;
  for(const version of [1,2])for(const mutate of [s=>s.state.inventory.rope=-1,s=>delete s.state.stories.q008.values.foodAt,s=>s.state.stories.q008.values.coffinAt='body',s=>s.state.stories.q008.events=['invented'],s=>s.state.vm.at(-1).index=99999]){
    const bad=JSON.parse(ready({old:version}).save());mutate(bad);assert.deepEqual(migrateSave(bad,data),bad);assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),before);assert.equal(g.data,definition);
  }
  for(const preserved of [false,true]){const src=preserved?migrated(ready({old:2})):g;for(const mutate of [s=>(s.state.flags[preserved?'currentStoryRoutes':'preservedStoryRoutes']??={}).q008=true,s=>s.state.stories.q008.revision=preserved?3:2,s=>s.state.vm.at(-1).script=preserved?'q008.floatingcoffin.entry':'q008.v11.entry']){const bad=JSON.parse(src.save());mutate(bad);assert.ok(validateSave(bad,data).length);assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),before);assert.equal(g.data,definition);}}
});
