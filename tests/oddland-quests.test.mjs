import {loadStages} from '../tools/audit-regional-relocation.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {loadContent} from '../src/core/loader.js';
import {GameEngine} from '../src/core/engine.js';
import {validateSave,migrateSave} from '../src/core/save.js';
import {projectGame} from '../src/application/projection.js';
import {storyCanAct} from '../src/core/story.js';
import {data,read,sources,fresh,border,go,start,play,paths,prepare,choose,checkpoint,drain,walk,inspect} from './oddland-helpers.mjs';
import {buildOddlandQuests} from '../tools/build-oddland-quests.mjs';
const preCut=await loadStages();
const ids=Array.from({length:10},(_,i)=>'q'+(291+i));

test('ten regional quests are a distinct cohort, with original editions and content preserved',async()=>{
 const old=preCut.border,first=await loadContent(read);assert.equal(Object.keys(data.quests).length,300);assert.equal(Object.keys(old.quests).length,290);assert.equal(Object.keys(first.quests).length,210);
 for(const id of Object.keys(old.quests).filter(id=>!/^q03[1-9]$|^q040$/.test(id)))assert.deepEqual(data.quests[id],old.quests[id]);assert.deepEqual(data.actors,old.actors);assert.equal(Object.keys(data.maps).length,62);
 assert.equal(new Set(ids.map(id=>data.quests[id].title)).size,10);assert.ok(ids.every(id=>data.quests[id].region===12));assert.equal(ids.reduce((n,id)=>n+Object.keys(data.quests[id].outcomes).length,0),21);
 assert.ok(sources.every(s=>s.review.scope.length===s.nodes.length));await buildOddlandQuests({check:true});
});

for(const number of sources.map(s=>s.number))for(const [index,path] of paths(number).entries())test(`q${number}/${path.outcome}/${index}: real locations, all choices, costs, saves and one-time ending`,()=>{
 const g=border();prepare(g,number,{signals:path.choices.includes('signals')&&number===298});
 const q=start(g,number);checkpoint(g);assert.throws(()=>g.complete(q.id,path.outcome));
 for(const id of path.choices)choose(g,number,id);
 const before=g.save(),gold=g.state.gold,xp=g.state.members.map(id=>g.state.actors[id].xp),completed=g.state.vars.region_12;
 assert.equal(g.state.quests[q.id].outcome,path.outcome);assert.throws(()=>g.complete(q.id,path.outcome));assert.equal(g.accept(q.id),false);assert.equal(g.save(),before);
 g.run(q.model.entryScript);drain(g);assert.equal(g.state.gold,gold);assert.deepEqual(g.state.members.map(id=>g.state.actors[id].xp),xp);assert.equal(g.state.vars.region_12,completed);assert.equal(g.state.vars.region_1,undefined);checkpoint(g);
});

for(const selected of Array.from({length:7},(_,i)=>291+i).flatMap((a,i,ns)=>ns.slice(i+1).flatMap((b,j,rest)=>rest.slice(j+1).map(c=>[a,b,c]))))test(`any three independent jobs unlock the night watch: ${selected.join(', ')}`,()=>{
 const g=border();for(const n of selected){assert.equal(g.unlocked(data.quests.q298),false);play(g,n,paths(n)[0],{save:false});}assert.equal(g.unlocked(data.quests.q298),true);assert.equal(g.unlocked(data.quests.q299),false);checkpoint(g);
});

test('reception requires the actual foreign board and quest travel cannot skip the border passage',()=>{
 const g=fresh();assert.equal(g.accept('q291'),false);border(g);assert.equal(g.accept('q291'),false);start(g,291);choose(g,291,'look');choose(g,291,'escort');
 assert.equal(g.state.location.map,'e2_trade_refuge');assert.equal(g.state.stories.q291.values.teoAt,'refuge');
 assert.equal(g.dispatch({type:'retreat'}),false,'a dialogue cannot be bypassed');
});

test('an in-flight child journey survives retreat and can only arrive at its selected destination',()=>{
 const g=border();start(g,291);choose(g,291,'look');assert.ok(g.dispatch({type:'choose',id:'escort'}));checkpoint(g);
 const before=structuredClone(g.state.stories.q291);assert.equal(g.dispatch({type:'story.resume',quest:'q291'}),false);assert.deepEqual(g.state.stories.q291,before);
 go(g,{kind:'dungeon',dungeon:'region_1',map:'e2_border_customs',x:9,y:3});assert.equal(g.dispatch({type:'quest.travel',id:'q291'}),false);
 assert.ok(g.dispatch({type:'retreat'}));drain(g);assert.equal(g.state.townLocation,'oddland_border');checkpoint(g);assert.equal(g.state.stories.q291.values.teoAt,'transit');
 const view=projectGame(g);assert.equal(view.quests.find(q=>q.id==='q291').canEnter,false);assert.match(view.quests.find(q=>q.id==='q291').entryReason,/歩いて/);
 go(g,data.quests.q291.story.worldPlaces.refuge);drain(g);assert.equal(g.state.journey,null);choose(g,291,'finish');assert.equal(g.state.quests.q291.outcome,'escort');
});

test('a paid night stay and a carriage trial reject shortage atomically and retain a free route',()=>{
 for(const [number,prefix,paid,free] of [[295,['check'],'shared','mixed'],[299,['inspect'],'annex','work']]){
 const g=border();prepare(g,number);start(g,number);for(const id of prefix)choose(g,number,id);g.state.gold=0;const before=g.save();assert.equal(g.dispatch({type:'choose',id:paid}),false);assert.equal(g.save(),before);
 const selected=paths(number).find(p=>p.choices.includes(free));for(const id of selected.choices.slice(prefix.length))choose(g,number,id);assert.equal(g.state.quests['q'+number].outcome,selected.outcome);checkpoint(g);
 }
});

test('only the earned hand signals grant the extra relief action',()=>{
 for(const outcome of ['demo','signals']){const g=border();prepare(g,298);play(g,297,paths(297).find(p=>p.outcome===outcome));start(g,298);assert.equal(storyCanAct(g,'q298','entry_signals'),outcome==='signals');if(outcome==='demo'){const old=g.save();assert.equal(g.dispatch({type:'choose',id:'signals'}),false);assert.equal(g.save(),old);}}
});

test('all ten complete in one campaign, preserving minority outcomes and paying each reward once',()=>{
 const g=border();for(const number of sources.map(s=>s.number)){const options=paths(number).filter(p=>!p.choices.includes('signals')||number===297);play(g,number,options.at(-1));}assert.equal(g.state.vars.region_12,10);assert.equal(g.state.vars.region_11,undefined);assert.equal(g.state.vars.region_1,undefined);assert.ok(ids.every(id=>g.state.quests[id].stage==='completed'));assert.ok(Buffer.byteLength(g.save())<=data.system.maxSaveBytes);checkpoint(g);
});

test('every pre-cut e2 stage rejects instead of silently appending cohorts or reinterpreting pending VM',()=>{
 for(const old of Object.values(preCut)){
  const g=new GameEngine(old,81);drain(g);g.accept('q001');const q=old.quests.q001,p=q.story.worldPlaces[q.story.scenes.entry.place];g.teleport(p.map,p.x,p.y);g.run(q.model.entryScript);assert.ok(g.state.waiting);const raw=JSON.parse(g.save()),saved=structuredClone(raw);
  assert.deepEqual(migrateSave(raw,data),saved);assert.deepEqual(raw,saved);assert.match(validateSave(raw,data).join(' '),/旧記録は非対応/);
 }
});

test('partial regional cohorts and impossible locations are rejected without resetting current progress',()=>{
 const g=border();const stable=g.save();for(const mutate of [raw=>delete raw.state.quests.q295,raw=>{for(const id of ids)delete raw.state.quests[id];raw.state.townLocation='oddland_annex';},raw=>raw.state.worldTravel.returnAnchor='unknown']){const bad=JSON.parse(stable);mutate(bad);assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),stable);}
});
