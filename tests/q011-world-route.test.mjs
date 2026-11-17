import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {objectVisible} from '../src/core/quest-events.js';
import {saltBrideSource} from '../authoring/editions/e2/story-q011.mjs';
import {data,previous,previousData,ready,values,checkpoint,depart,arrive,choose,go,resume,migrated,drain,enumerate,routes,oldFrames} from './q011-helpers.mjs';
const source=saltBrideSource(),graph=enumerate();
test('q011 keeps the original catalog, every command, rewards and ending prose',()=>{
 const bytes=fs.readFileSync(new URL('./fixtures/e2-q011-before-world.json',import.meta.url));
 assert.equal(createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),'84c8b7f0a4e25edaf5800c054df2adfb63a9ed1a');assert.deepEqual(previousData.quests.q011,previous);
 for(const [id,s] of Object.entries(previous.scripts))assert.deepEqual(data.scripts[id],s,id);
 for(const [id,o] of Object.entries(previous.outcomes)){const {requires,...old}=o,{requires:_,...current}=data.quests.q011.outcomes[id];assert.deepEqual(current,old);}
});
test('q011 covers every scene and action through the four original decision paths',()=>{
 assert.equal(graph.endings.length,4);
 assert.deepEqual([...new Set(graph.active.map(r=>r.scene))].sort(),Object.keys(source.story.scenes).sort());
 assert.deepEqual([...new Set(graph.endings.flatMap(r=>JSON.parse(r.save).state.stories.q011.events))].sort(),Object.keys(source.story.actions).sort());
 const g=ready();for(const row of [...graph.active,...graph.endings]){g.load(row.save);checkpoint(g);}
});
for(const route of routes)test('q011 preserves facts and knowledge for '+route.old.join('/'),()=>{
 const old=ready({old:true});choose(old,...route.old);const g=ready(),rope=g.state.inventory.rope;choose(g,...route.path);checkpoint(g);
 assert.equal(g.state.quests.q011.outcome,route.outcome);
 for(const key of ['signKnown','signDestroyed','arrowKnown','rescued','repainted','ropeLaid','peopleAt'])assert.deepEqual(values(g)[key],old.state.flags.flow.q011[key],key);
 assert.equal(g.state.inventory.rope,rope-(route.outcome==='compromise'?1:0));assert.equal(g.state.stories.q011.knowledge.party.includes('sign'),route.old.includes('brush'));
 assert.ok(g.state.stories.q011.knowledge.party.includes('stayed'));
});
test('q011 finding, meeting, both escort legs and confirmation are distinct',()=>{
 const g=ready();choose(g,'fork','break');assert.equal(values(g).arrowKnown,false);choose(g,'read','follow');assert.equal(values(g).found,false);choose(g,'find');assert.equal(values(g).joined,false);choose(g,'join');
 for(const [id,at] of [['escort','fork'],['entrance','entrance']]){depart(g,id);assert.equal(values(g).peopleAt,'transit');assert.equal(values(g).colleagueAt,'transit');assert.equal(values(g).rescued,false);checkpoint(g);arrive(g);assert.equal(values(g).peopleAt,at);assert.equal(values(g).rescued,false);}
 choose(g,'confirm');assert.equal(values(g).rescued,true);assert.equal(g.state.quests.q011.stage,'active');checkpoint(g);
});
test('q011 repainting happens at the fork after everyone stays with Mel',()=>{
 const g=ready();choose(g,...routes[2].path.slice(0,9));assert.equal(values(g).rescued,true);assert.equal(values(g).repainted,false);depart(g,'repair');assert.equal(values(g).peopleAt,'entrance');arrive(g);assert.equal(values(g).partyAt,'fork');assert.equal(values(g).repainted,false);choose(g,'paint');assert.equal(values(g).repainted,true);assert.equal(g.state.quests.q011.stage,'active');checkpoint(g);choose(g,'return','report','finish');
});
for(const brushed of [false,true])test('q011 rope shortage, one-time cost and laying '+brushed,()=>{
 const g=ready();choose(g,'fork',...(brushed?['brush','read']:[]),'rope');g.state.inventory.rope=0;checkpoint(g);
 const before=structuredClone([values(g),g.state.inventory,g.state.location,g.state.steps]);assert.equal(projectGame(g).dialog.options.find(o=>o.id==='lay').enabled,false);assert.equal(g.dispatch({type:'choose',id:'lay'}),false);assert.deepEqual([values(g),g.state.inventory,g.state.location,g.state.steps],before);
 g.give('rope',1);choose(g,'lay');assert.equal(g.state.inventory.rope??0,0);assert.equal(values(g).ropeStarted,true);assert.equal(values(g).ropeLaid,false);depart(g,'extend');checkpoint(g);arrive(g);assert.equal(values(g).ropeLaid,false);choose(g,'fix');assert.equal(values(g).ropeLaid,true);assert.equal(values(g).signKnown,brushed);checkpoint(g);
});
const departures=new Map();for(const row of graph.active){const g=ready();g.load(row.save);for(const o of projectGame(g).dialog.options.filter(o=>o.enabled)){const key=row.scene+'_'+o.id;if(source.story.actions[key]?.journey&&!departures.has(key))departures.set(key,{...row,id:o.id});}}
for(const [key,row] of departures)for(const kind of ['retreat','defeat'])test(`q011 ${key} resumes after ${kind} with companions and paid rope`,()=>{
 const g=ready();g.load(row.save);depart(g,row.id);const before=structuredClone(g.state.stories.q011),journey=structuredClone(g.state.journey),rope=g.state.inventory.rope;
 if(kind==='retreat')assert.ok(g.dispatch({type:'retreat'}));else g.defeat();drain(g);checkpoint(g);assert.deepEqual(g.state.stories.q011,before);assert.deepEqual(g.state.journey,journey);arrive(g);assert.equal(g.state.inventory.rope,rope);checkpoint(g);
});
for(const scene of ['sign','broken_direction','rope_started','rope_arrival','found','joined','confirmed','repaired'])test('q011 local work survives rescue at '+scene,()=>{
 const g=ready();g.load(graph.active.find(r=>r.scene===scene).save);const before=structuredClone(g.state.stories.q011),rope=g.state.inventory.rope;g.defeat();drain(g);checkpoint(g);resume(g);assert.deepEqual(g.state.stories.q011,before);assert.equal(g.state.inventory.rope,rope);checkpoint(g);
});
test('q011 all original pending VM frames and completed saves migrate exactly',()=>{
 for(const raw of oldFrames()){const expected=JSON.parse(raw);(expected.state.flags.legacyStoryRoutes??={}).q011=true;const g=new GameEngine(data);g.load(raw);assert.deepEqual(JSON.parse(g.save()),expected);checkpoint(g);}
});
for(const route of routes)test('q011 accepted original route '+route.old.join('/'),()=>{
 const g=migrated(ready({old:true}));choose(g,...route.old);assert.equal(g.state.quests.q011.outcome,route.outcome);assert.equal(g.state.stories.q011,undefined);checkpoint(g);
});
test('q011 accepted catalog completion still checks the original flow facts',()=>{
 const g=migrated(ready({old:true})),before=g.save();for(const key of Object.keys(previous.outcomes))assert.throws(()=>g.complete('q011',key));assert.equal(g.save(),before);
});
test('q011 accepted old flow uses its original ending conditions',()=>{
 const old=ready({old:true});old.state.vm=[];old.state.waiting=null;delete old.state.flags.flow.q011;old.run('q011.flow.visit');drain(old);const g=migrated(old);assert.equal(g.state.stories.q011,undefined);
 const option=projectGame(g).dialog.options.find(o=>o.id==='break');assert.ok(option);choose(g,'break');assert.equal(g.state.quests.q011.outcome,'contract');checkpoint(g);
});
test('q011 new and accepted saves select the matching events',()=>{
 const old=ready({old:true}),current=ready(),g=new GameEngine(data);
 for(const [raw,legacy] of [[old.save(),true],[current.save(),false],[old.save(),true]]){g.load(raw);checkpoint(g);for(const m of Object.values(g.data.maps))for(const o of m.objects.filter(o=>o.quest==='q011'&&o.trigger!=='action'&&objectVisible(g.state,m,o)))assert.equal(o.id.startsWith('q011_saltbride_'),!legacy);}
});
for(const route of routes)test('q011 ending and rewards are one-time '+route.old.join('/'),()=>{
 const g=ready();choose(g,...route.path);const before=g.save();assert.throws(()=>g.complete('q011',route.outcome));assert.equal(g.save(),before);const rewards=JSON.stringify([g.state.gold,g.state.actors,g.state.vars]);g.run(g.data.quests.q011.model.entryScript);drain(g);assert.equal(JSON.stringify([g.state.gold,g.state.actors,g.state.vars]),rewards);checkpoint(g);
});
