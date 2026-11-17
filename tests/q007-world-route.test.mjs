import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {GameEngine} from '../src/core/engine.js';
import {validateSave,migrateSave} from '../src/core/save.js';
import {nextQuestPlace} from '../src/core/quest-navigation.js';
import {projectGame} from '../src/application/projection.js';
import {objectVisible} from '../src/core/quest-events.js';
import {voiceWallSource,voiceWallLocations} from '../authoring/editions/e2/story-q007.mjs';
import {data,previous,previousData,routes,oldRoutes,letters,meeting,departures,ready,choose,depart,arrive,resume,checkpoint,values,go,town,migrated,drain} from './q007-helpers.mjs';

test('q007 preserves the exact original definition and enumerates all six new paths',()=>{
  assert.deepEqual(previousData.quests.q007,previous);
  const bytes=fs.readFileSync(new URL('./fixtures/e2-q007-before-world.json',import.meta.url));assert.equal(createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),'c9ead526beb3dedb5661875d3a7823038a03ca41');
  for(const [id,s] of Object.entries(previous.scripts))assert.deepEqual(data.scripts[id],s,id);
  const s=voiceWallSource();assert.equal(s.nodes.length,10);assert.equal(Object.keys(s.story.actions).length,14);assert.equal(Object.values(s.story.actions).filter(a=>a.journey).length,5);
  const all=[];function visit(id,path){for(const o of s.nodes.find(n=>n.id===id).options){const next=[...path,o.id];if(o.to.startsWith('@'))all.push({path:next,outcome:o.to.slice(1)});else visit(o.to,next);}}visit('entry',[]);assert.deepEqual(all.map(JSON.stringify).sort(),routes.map(JSON.stringify).sort());
  assert.deepEqual(data.quests.q007.outcomes,previous.outcomes);
});
for(const r of routes)test('q007 new route '+r.path.join('/'),()=>{
  const g=ready(),gold=g.state.gold,items={...g.state.inventory};checkpoint(g);
  for(const id of r.path){choose(g,id);checkpoint(g);}
  assert.equal(g.state.quests.q007.outcome,r.outcome);assert.equal(g.state.gold,gold+data.quests.q007.outcomes[r.outcome].gold);assert.deepEqual(g.state.inventory,items);assert.equal(g.state.records.battles,0);
  const before=g.save();assert.throws(()=>g.complete('q007',r.outcome));assert.equal(g.save(),before);
  const rewards=JSON.stringify([g.state.gold,g.state.actors,g.state.vars]);g.run(g.data.quests.q007.model.entryScript);drain(g);assert.equal(JSON.stringify([g.state.gold,g.state.actors,g.state.vars]),rewards);
  if(r.outcome==='contract'){assert.equal(values(g).lettersAt,'brother');assert.equal(values(g).voiceKnown,false);assert.equal(values(g).met,false);}
});
test('q007 adjoining town locations preserve the tavern, cistern and flooded eighth floor',()=>{
  const g=ready({visit:false});go(g,'port');assert.equal(nextQuestPlace(data,g.state,'q007').location,'e2_voice_port');
  for(const id of Object.keys(voiceWallLocations)){assert.ok(data.locations[id]);assert.equal(previousData.locations[id],undefined);}
  for(const id of Object.keys(previousData.locations))assert.deepEqual(data.locations[id],previousData.locations[id]);
  assert.deepEqual(data.dungeons,previousData.dungeons);const withoutOldEvents=maps=>Object.fromEntries(Object.entries(maps).map(([id,m])=>[id,{...m,objects:m.objects.filter(o=>o.quest!=='q007')}]));assert.deepEqual(withoutOldEvents(data.maps),withoutOldEvents(previousData.maps));
  const before=g.state.townLocation;assert.equal(g.dispatch({type:'location.move',id:'e2_voice_booth'}),false);assert.equal(g.state.townLocation,before);
  const moved=[];town(g,'e2_voice_booth',id=>moved.push(id));assert.deepEqual(moved,['e2_voice_corridor','e2_voice_booth']);checkpoint(g);
});
test('q007 departure and corridor keep the voice unknown until arrival opens the inspection',()=>{
  const g=ready();choose(g,'reply');assert.deepEqual(g.state.stories.q007.knowledge.party,['unanswered']);depart(g,'walk');
  assert.equal(values(g).mireAt,'port');assert.equal(values(g).brotherAt,'booth');assert.equal(values(g).lettersAt,'brother');assert.equal(values(g).voiceKnown,false);
  town(g,'e2_voice_corridor');checkpoint(g);assert.equal(values(g).voiceKnown,false);assert.equal(g.dispatch({type:'story.resume',quest:'q007'}),false);
  town(g,'e2_voice_booth');assert.equal(g.state.journey,null);assert.equal(g.state.waiting.type,'text');checkpoint(g);drain(g);
  assert.equal(values(g).voiceKnown,true);assert.deepEqual(g.state.stories.q007.knowledge.party,['unanswered','voice','letters']);assert.equal(values(g).lettersConsent,false);
});
test('q007 receive, carry, arrive and deliver keep the original letter in one holder',()=>{
  const g=ready();choose(g,'trace');assert.equal(values(g).lettersAt,'brother');choose(g,'letters');assert.equal(values(g).lettersConsent,true);assert.equal(values(g).lettersAt,'party');assert.equal(values(g).delivered,false);
  depart(g,'return');town(g,'e2_voice_corridor');checkpoint(g);assert.equal(values(g).lettersAt,'party');assert.equal(values(g).brotherAt,'booth');arrive(g);assert.equal(values(g).lettersAt,'party');assert.equal(values(g).delivered,false);
  choose(g,'deliver');assert.equal(values(g).lettersAt,'mire');assert.equal(values(g).delivered,true);assert.equal(values(g).mireConsent,false);assert.equal(values(g).brotherConsent,false);assert.equal(values(g).met,false);
  const dialog=projectGame(g).dialog;assert.deepEqual(dialog.scene.cast.map(c=>[c.id,c.remote]),[['mire',false],['brother',true]]);assert.deepEqual(projectGame(g).town.cast.map(c=>c.id),['mire']);
});
test('q007 each consent and the escort are separate; voice alone never counts as meeting',()=>{
  const g=ready();choose(g,'trace',...letters,'meet');assert.equal(values(g).mireConsent,true);assert.equal(values(g).brotherConsent,false);checkpoint(g);
  const before=g.save();assert.throws(()=>g.complete('q007','informed'));assert.equal(g.save(),before);choose(g,'ask');assert.equal(values(g).brotherConsent,true);assert.equal(values(g).brotherAt,'booth');assert.equal(values(g).met,false);
  depart(g,'fetch');assert.equal(values(g).brotherAt,'booth');arrive(g);assert.equal(values(g).met,false);depart(g,'escort');assert.equal(values(g).brotherAt,'transit');town(g,'e2_voice_corridor');checkpoint(g);assert.equal(values(g).met,false);arrive(g);
  assert.equal(values(g).brotherAt,'port');assert.equal(values(g).met,true);assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>[c.id,c.remote]),[['mire',false],['brother',false]]);assert.ok(projectGame(g).dialog.text.includes('返事を決めるのは、私にさせて'));choose(g,'finish');
});
for(const [path,id] of departures.filter(([,id])=>['trace','walk','fetch'].includes(id)))for(const interruption of ['retreat','defeat'])test(`q007 ${path.join('/')}/${id} survives a dungeon detour and ${interruption}`,()=>{
  const g=ready();choose(g,...path);depart(g,id);const before=structuredClone(g.state.stories.q007),journey=structuredClone(g.state.journey);
  town(g,'hikarigaeri_square');assert.ok(g.dispatch({type:'travel',dungeon:'region_1'}));drain(g);
  if(interruption==='retreat')assert.ok(g.dispatch({type:'retreat'}));else g.defeat();drain(g);checkpoint(g);
  assert.deepEqual(g.state.stories.q007,before);assert.deepEqual(g.state.journey,journey);arrive(g);checkpoint(g);
});
for(const [path,id] of departures)for(const interruption of ['reload','forced-rescue'])test(`q007 ${path.join('/')}/${id} corridor ${interruption} preserves the active journey`,()=>{
  const g=ready();choose(g,...path);depart(g,id);town(g,'e2_voice_corridor');const before=structuredClone(g.state.stories.q007),journey=structuredClone(g.state.journey);
  if(interruption==='forced-rescue')g.defeat();drain(g);checkpoint(g);assert.deepEqual(g.state.stories.q007,before);assert.deepEqual(g.state.journey,journey);arrive(g);checkpoint(g);
});
for(const path of [['trace','letters'],['trace',...letters],['trace',...letters,'meet'],['trace',...letters,'meet','ask']])test('q007 committed work survives rescue '+path.join('/'),()=>{
  const g=ready();choose(g,...path);const before=structuredClone(g.state.stories.q007);g.defeat();drain(g);checkpoint(g);resume(g);assert.deepEqual(g.state.stories.q007,before);checkpoint(g);
});
for(const r of oldRoutes)test('q007 old accepted route '+r.path.join('/'),()=>{
  const g=migrated(ready({old:true}));assert.deepEqual(g.data.quests.q007.story,previous.story);assert.equal(nextQuestPlace(data,g.state,'q007').map,'region_1_lower_landing');
  for(const id of r.path){choose(g,id);checkpoint(g);}assert.equal(g.state.quests.q007.outcome,r.outcome);
});
for(const path of [[],['reply'],['trace'],['trace','letters'],['trace','letters','meet'],['seal'],['trace','letters','finish'],['trace','letters','meet','finish']])test('q007 exact old VM and state retained '+path.join('/'),()=>{
  const old=ready({old:true});choose(old,...path);const expected=JSON.parse(old.save());(expected.state.flags.preservedStoryRoutes??={}).q007=true;
  const g=migrated(old);assert.deepEqual(JSON.parse(g.save()),expected);checkpoint(g);
});
test('q007 old text and accepted-before-entry saves retain their definition; fresh saves select new geography',()=>{
  for(const text of [false,true]){const old=ready({old:true,visit:false});if(text){go(old,'port');old.run(previous.model.entryScript);}const expected=JSON.parse(old.save());(expected.state.flags.preservedStoryRoutes??={}).q007=true;assert.deepEqual(JSON.parse(migrated(old).save()),expected);}
  const g=ready(),fresh=new GameEngine(previousData);drain(fresh);g.load(fresh.save());assert.equal(g.data,data);assert.ok(g.accept('q007'));assert.equal(g.state.flags.currentStoryRoutes.q007,true);assert.equal(nextQuestPlace(data,g.state,'q007').location,'e2_voice_port');checkpoint(g);
});
test('q007 new and old saves alternate without duplicated eighth-floor events',()=>{
  const current=ready(),old=migrated(ready({old:true})),g=ready();
  for(const [raw,preserved] of [[old.save(),true],[current.save(),false],[old.save(),true]]){g.load(raw);checkpoint(g);const visible=g.data.maps.region_1_lower_landing.objects.filter(o=>o.quest==='q007'&&objectVisible(g.state,g.data.maps.region_1_lower_landing,o));assert.equal(visible.length,preserved?1:0);assert.equal(Boolean(g.data.quests.q007.story.worldPlaces),!preserved);}
});
test('q007 old legacy route flags stay separate from the new story',()=>{
  const old=ready({old:true,visit:false});(old.state.flags.legacyStoryRoutes??={}).q007=true;const g=migrated(old);assert.equal(g.state.flags.preservedStoryRoutes.q007,true);go(g,'port');g.run(g.data.quests.q007.model.entryScript);drain(g);checkpoint(g);assert.equal(g.state.stories.q007,undefined);
});
test('q007 corrupted saves and mixed story versions are rejected atomically',()=>{
  const g=ready(),before=g.save(),definition=g.data,old=ready({old:true});
  for(const mutate of [s=>s.state.inventory.rope=-1,s=>s.state.stories.q007.values.lettersAt='missing',s=>s.state.vm.at(-1).index=99999]){const bad=JSON.parse(old.save());mutate(bad);assert.deepEqual(migrateSave(bad,data),bad);assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),before);assert.equal(g.data,definition);}
  for(const preserved of [false,true])for(const mutate of [s=>(s.state.flags[preserved?'currentStoryRoutes':'preservedStoryRoutes']??={}).q007=true,s=>s.state.stories.q007.revision=preserved?2:1,s=>s.state.vm.at(-1).script=preserved?'q007.voicewall.entry':'q007.v11.entry']){const src=preserved?migrated(old):g,bad=JSON.parse(src.save());mutate(bad);assert.ok(validateSave(bad,data).length);assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),before);assert.equal(g.data,definition);}
});
