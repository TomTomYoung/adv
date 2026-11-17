import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadContent} from '../src/core/loader.js';
import fs from 'node:fs';
import {GameEngine} from '../src/core/engine.js';
import {migrateSave,validateSave} from '../src/core/save.js';
import {nextQuestPlace} from '../src/core/quest-navigation.js';
import {projectGame} from '../src/application/projection.js';
import {objectVisible} from '../src/core/quest-events.js';
import {data,previous,previousData,routes,ready,choose,depart,arrive,resume,checkpoint,values,go,migrated,drain,read} from './q005-helpers.mjs';

test('q005 first edition and exact shipped VM script arrays remain intact',()=>{
  assert.deepEqual(previousData.quests.q005,previous);
  const bytes=fs.readFileSync(new URL('./fixtures/e2-q005-before-world.json',import.meta.url));
  assert.equal(createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),'6d390d923f3f31f9bdf71136a07a28cbdbaab855');
  for(const [key,script] of Object.entries(previous.scripts))assert.deepEqual(data.scripts[key],script,key);
  assert.equal(Object.keys(data.quests.q005.story.scenes).length,9);assert.equal(Object.keys(data.quests.q005.story.actions).length,14);
});
for(const r of routes)test('q005 physical route '+r.path.join('/'),()=>{
  const g=ready(),gold=g.state.gold;checkpoint(g);
  for(const id of r.path){choose(g,id);checkpoint(g);}
  assert.equal(g.state.quests.q005.outcome,r.outcome);assert.equal(g.state.gold,gold+data.quests.q005.outcomes[r.outcome].gold);
  const before=g.save();assert.throws(()=>g.complete('q005',r.outcome));assert.equal(g.save(),before);
  const reward=JSON.stringify([g.state.gold,g.state.actors,g.state.vars]);g.run(g.data.quests.q005.model.entryScript);drain(g);assert.equal(JSON.stringify([g.state.gold,g.state.actors,g.state.vars]),reward);
});
test('q005 bed moves at departure and arrival; pipes and both tests are local work',()=>{
  const g=ready();choose(g,'cold');assert.equal(values(g).fungus,'cooled');const steps=g.state.steps,pos={...g.state.location};depart(g,'move');
  assert.deepEqual(g.state.location,pos);assert.equal(values(g).bedAt,'party');assert.equal(values(g).totoAt,'transit');assert.equal(values(g).pipes,false);checkpoint(g);
  assert.equal(g.dispatch({type:'story.resume',quest:'q005'}),false);assert.equal(g.state.quests.q005.stage,'active');arrive(g);
  assert.ok(g.state.steps>steps);assert.equal(values(g).bedAt,'sump');assert.equal(values(g).totoAt,'sump');assert.equal(values(g).pipes,false);
  assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['toto']);choose(g,'pipes');assert.equal(values(g).pipes,true);assert.equal(values(g).overnight,false);assert.equal(values(g).foodTest,false);
  const before=g.save();assert.throws(()=>g.complete('q005','informed'));assert.equal(g.save(),before);choose(g,'verify');assert.equal(values(g).foodTest,true);
});
test('q005 burning consumes one torch at the furnace and rewards only after walking back',()=>{
  const g=ready(),torch=g.state.inventory.torch;
  assert.ok(projectGame(g).dialog.options.find(o=>o.id==='burn').text.includes(data.items.torch.name));
  depart(g,'burn');assert.equal(g.state.inventory.torch,torch);assert.equal(values(g).bedAt,'party');assert.equal(values(g).totoAt,'drain');arrive(g);
  const burn=projectGame(g).dialog.options.find(o=>o.id==='burn');assert.ok(burn.text.includes(data.items.torch.name));assert.ok(burn.requirement.includes(data.items.torch.name));
  assert.deepEqual(projectGame(g).dialog.scene.cast,[]);assert.equal(values(g).fungus,'growing');assert.equal(values(g).bedAt,'disposal');choose(g,'burn');assert.equal(g.state.inventory.torch,torch-1);assert.equal(values(g).fungus,'burned');
  assert.throws(()=>g.complete('q005','contract'));depart(g,'return');checkpoint(g);assert.equal(g.state.quests.q005.stage,'active');arrive(g);assert.equal(values(g).bedAt,'disposal');assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['toto']);choose(g,'finish');assert.equal(g.state.inventory.torch,torch-1);
});
for(const action of ['move','burn','return'])for(const kind of ['retreat','defeat'])test(`q005 ${action} journey survives ${kind}`,()=>{
  const g=ready();if(action==='move')choose(g,'warm','clean');if(action==='return')choose(g,'burn','burn');depart(g,action);
  const before=structuredClone(g.state.stories.q005),journey=structuredClone(g.state.journey),torch=g.state.inventory.torch;
  if(kind==='retreat')assert.ok(g.dispatch({type:'retreat'}));else g.defeat();drain(g);checkpoint(g);
  assert.deepEqual(g.state.stories.q005,before);assert.deepEqual(g.state.journey,journey);assert.equal(g.state.inventory.torch,torch);
  arrive(g);checkpoint(g);if(action==='move')choose(g,'pipes','verify');if(action==='burn')choose(g,'burn','return','finish');if(action==='return')choose(g,'finish');assert.equal(g.state.quests.q005.stage,'completed');
});
for(const scene of ['overflow','unpacked','test','furnace','burned'])test(`q005 ${scene} work survives defeat before next choice`,()=>{
  const paths={overflow:['warm'],unpacked:['warm','clean','move'],test:['cold','move','pipes'],furnace:['burn'],burned:['burn','burn']},g=ready();choose(g,...paths[scene]);
  const before=structuredClone(values(g)),torch=g.state.inventory.torch;g.defeat();checkpoint(g);resume(g);checkpoint(g);
  assert.deepEqual(values(g),before);assert.equal(g.state.inventory.torch,torch);assert.equal(g.state.stories.q005.scene,scene);
});
for(const where of ['entry','furnace'])test(`q005 ${where} torch shortage offers a real return without work`,()=>{
  const g=ready();if(where==='furnace')choose(g,'burn');g.state.inventory.torch=0;const before=g.save();assert.equal(g.dispatch({type:'choose',id:'burn'}),false);assert.equal(g.save(),before);
  depart(g,'burn_supplies');assert.equal(g.state.waiting,null);checkpoint(g);assert.equal(values(g).fungus,'growing');assert.ok(g.dispatch({type:'retreat'}));g.give('torch',1);go(g,where==='entry'?'drain':'disposal');assert.ok(g.dispatch({type:'story.resume',quest:'q005'}));drain(g);choose(g,'burn');if(where==='entry')choose(g,'burn');choose(g,'return','finish');assert.equal(g.state.inventory.torch,0);
});
for(const path of [[],['cold'],['warm'],['cold','move'],['cold','move','verify'],['burn'],['net','accept']])test('q005 preserves old accepted story '+path.join('/'),()=>{
  const old=ready({old:true});choose(old,...path);const raw=JSON.parse(old.save()),g=migrated(old),expected=structuredClone(raw);
  (expected.state.flags.preservedStoryRoutes??={}).q005=true;assert.deepEqual(JSON.parse(g.save()),expected);assert.deepEqual(g.data.quests.q005.story,previous.story);checkpoint(g);
  if(g.state.quests.q005.stage==='active')assert.equal(nextQuestPlace(data,g.state,'q005').object,'q005_decision');
  if(!path.length){choose(g,'burn');assert.equal(g.state.quests.q005.outcome,'contract');checkpoint(g);}
});
test('q005 old acceptance without story is pinned, while an unaccepted save uses current route',()=>{
  const old=ready({old:true,visit:false}),g=migrated(old);assert.equal(g.state.stories.q005,undefined);assert.equal(g.state.flags.preservedStoryRoutes.q005,true);go(g,'drain');g.run(g.data.quests.q005.model.entryScript);drain(g);choose(g,'burn');checkpoint(g);
  const fresh=new GameEngine(previousData);drain(fresh);g.load(fresh.save());assert.equal(g.data,data);assert.ok(g.accept('q005'));assert.equal(g.state.flags.currentStoryRoutes.q005,true);checkpoint(g);
});
test('q005 invalid old saves are rejected before adoption and leave engine definition/state intact',()=>{
  const old=ready({old:true}),g=ready(),before=g.save(),definition=g.data;
  for(const mutate of [s=>{s.state.inventory.torch=-1;},s=>{s.state.stories.q005.values.fungus='unknown';},s=>{s.state.vm.at(-1).index=99999;}]){
    const bad=JSON.parse(old.save());mutate(bad);assert.deepEqual(migrateSave(bad,data),bad);assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),before);assert.equal(g.data,definition);
  }
});
test('q005 mixed route flags, revisions and VM script prefixes are rejected',()=>{
  for(const old of [false,true]){
    const g=old?migrated(ready({old:true})):ready();
    for(const mutate of [s=>{(s.state.flags[old?'currentStoryRoutes':'preservedStoryRoutes']??={}).q005=true;},s=>{s.state.stories.q005.revision=old?2:1;},s=>{s.state.vm.at(-1).script=old?'q005.drainage.entry':'q005.v11.entry';}]){
      const bad=JSON.parse(g.save());mutate(bad);assert.ok(validateSave(bad,data).length);const before=g.save(),definition=g.data;assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),before);assert.equal(g.data,definition);
    }
  }
});
test('q005 loading current then old then current selects matching routes and visible events',()=>{
  const current=ready(),old=ready({old:true}),g=migrated(old);const oldSave=g.save();
  for(const [save,prefix] of [[current.save(),'q005_drainage_'],[oldSave,'q005_decision'],[current.save(),'q005_drainage_']]){
    g.load(save);checkpoint(g);const ids=g.map().objects.filter(o=>o.quest==='q005'&&objectVisible(g.state,g.map(),o)).map(o=>o.id);assert.ok(ids.length);assert.ok(ids.every(id=>id.startsWith(prefix)),ids.join(','));
  }
});
test('q005 old text frames and shortage resume survive migration without changing VM positions',()=>{
  const old=ready({old:true,visit:false});go(old,'drain');old.run(previous.model.entryScript);assert.equal(old.state.waiting.type,'text');
  const g=migrated(old);assert.deepEqual(g.state.vm,old.state.vm);assert.deepEqual(g.state.waiting,old.state.waiting);drain(g);g.state.inventory.torch=0;depart(g,'burn_supplies');checkpoint(g);
  g.give('torch',1);g.run(g.data.quests.q005.model.entryScript);drain(g);choose(g,'burn');assert.equal(g.state.quests.q005.outcome,'contract');checkpoint(g);
});
test('q005 older event routing is retained without falsely starting a v1.1 story',()=>{
  const old=ready({old:true,visit:false});(old.state.flags.legacyStoryRoutes??={}).q005=true;const g=migrated(old);assert.equal(g.state.flags.preservedStoryRoutes.q005,true);assert.equal(g.state.flags.legacyStoryRoutes.q005,true);go(g,'drain');g.run(g.data.quests.q005.model.entryScript);drain(g);assert.equal(g.state.stories.q005,undefined);checkpoint(g);
});
test('q005 forged old shortage target cannot be injected into current save',()=>{
  const g=ready();g.state.inventory.torch=0;depart(g,'burn_supplies');const before=g.save(),bad=JSON.parse(before);bad.state.flags.questResume.q005='q005.v11.entry.burn.resume';assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),before);
});
test('q005 loader rejects changes to retained scripts and overlapping script namespaces',async()=>{
  for(const mutate of [q=>{q.scripts['q005.v11.entry'].commands[1].text+='変更';},q=>{q.model.currentStoryScriptPrefix='q005.v11.';}])await assert.rejects(loadContent(async p=>{const d=await read(p);if(p==='data/scenario-editions/e2/q005.json')mutate(d);return d;},{edition:'e2'}));
});
