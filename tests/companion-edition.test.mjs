import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {loadContent} from '../src/core/loader.js';
import {GameEngine} from '../src/core/engine.js';
import {validateSave,migrateSave} from '../src/core/save.js';
import {projectGame} from '../src/application/projection.js';
import {storyCanAct} from '../src/core/story.js';
import {arcs,buildCompanionEdition} from '../tools/build-companion-edition.mjs';
import {drain} from './helpers.mjs';

const read=file=>fs.readFile(new URL('../'+file,import.meta.url),'utf8').then(JSON.parse);
const first=await loadContent(read),data=await loadContent(read,{edition:'e2'});
const added=Object.values(data.quests).filter(q=>q.number>=211&&q.number<=290);
export function go(g,to){
 const queue=[g.state.townLocation],seen=new Map([[queue[0],null]]);
 for(let i=0;i<queue.length&&!seen.has(to);i++){
  const here=data.locations[queue[i]],next=[here.parent,...(here.links??[]),...Object.values(data.locations).filter(l=>l.parent===here.id).map(l=>l.id)].filter(Boolean);
  for(const n of next)if(!seen.has(n)){seen.set(n,here.id);queue.push(n);}
 }
 assert.ok(seen.has(to),to);const route=[];for(let n=to;seen.get(n);n=seen.get(n))route.unshift(n);
 for(const id of route)assert.ok(g.dispatch({type:'location.move',id}));
 assert.equal(g.state.townLocation,to);
}
function ready(actor){
 const g=new GameEngine(data,43);drain(g);go(g,'hikarigaeri_tavern');
 if(!g.state.members.includes(actor))assert.ok(g.dispatch({type:'party',action:'swap',actor,replace:'il'}));
 return g;
}
function checkpoint(g){const save=g.save();assert.deepEqual(validateSave(JSON.parse(save),data),[]);g.load(save);assert.equal(g.save(),save);}
function choose(g,id){assert.ok(g.dispatch({type:'choose',id}),`${id}: ${g.state.notice}`);drain(g);}
function arrive(g){const j=g.state.journey;assert.ok(j);const q=data.quests[j.quest],p=q.story.worldPlaces[q.story.actions[j.action].journey.to];go(g,p.location);if(g.state.journey)assert.ok(g.dispatch({type:'story.resume',quest:q.id}),g.state.notice);assert.equal(g.state.journey,null);drain(g);}
function start(g,q){assert.ok(g.accept(q.id),q.id);go(g,q.story.worldPlaces.base.location);assert.ok(g.dispatch({type:'story.resume',quest:q.id}));drain(g);}
function finish(g,q,outcome,{save=false}={}){
 choose(g,'go');if(save)checkpoint(g);arrive(g);if(save)checkpoint(g);
 const before=g.state.gold,cost=q.story.actions[`survey_${outcome}`].cost?.gold??0;
 choose(g,outcome);assert.equal(g.state.gold,before-cost);if(save)checkpoint(g);
 choose(g,'return');if(save)checkpoint(g);arrive(g);if(save)checkpoint(g);
 choose(g,'finish');assert.equal(g.state.quests[q.id].outcome,outcome);assert.equal(g.state.gold,before-cost+q.outcomes[outcome].gold);
 if(save)checkpoint(g);
}
function prepareEarlier(g,q,preferences={}){
 for(const earlier of added.filter(other=>other.model.companion===q.model.companion&&other.number<q.number)){
  start(g,earlier);finish(g,earlier,preferences[earlier.id]??Object.keys(earlier.outcomes)[0]);
 }
}

test('e2 adds exactly eight ten-quest arcs, locations and presentation order without touching e1',async()=>{
 assert.equal(Object.keys(first.quests).length,210);assert.equal(Object.keys(data.quests).length,300);assert.equal(added.length,80);
 for(const [actor,episodes] of Object.entries(arcs)){assert.equal(episodes.length,10);assert.deepEqual(episodes.map(q=>q.number),Array.from({length:10},(_,i)=>episodes[0].number+i));}
 assert.equal(added.reduce((n,q)=>n+Object.keys(q.outcomes).length,0),162);
 for(const id of Object.keys(first.quests))if(!Object.hasOwn(data.scenarioEditions.editions.e2.questOverrides,id))assert.deepEqual(data.quests[id],first.quests[id]);
 for(const id of Object.keys(first.locations).filter(id=>id!=='hikarigaeri_square'))assert.deepEqual(data.locations[id],first.locations[id]);
 assert.deepEqual(data.actors,first.actors);for(const [id,map] of Object.entries(first.maps))assert.deepEqual(data.maps[id].tiles,map.tiles);
 for(const id of Object.keys(first.maps))if(!['region_1_landing','region_4_f1','region_4_f2','region_7_f1','region_7_f2','region_9_f1','region_9_f2'].includes(id))assert.deepEqual(data.maps[id],first.maps[id]);
 const g=ready('nio'),view=projectGame(g);assert.equal(view.quests.length,300);assert.equal(new Set(view.quests.map(q=>q.id)).size,300);
 assert.equal(view.quests.find(q=>q.id==='q221').regionName,'仲間と巡るトルネア');
 assert.equal(g.dispatch({type:'travel',region:11}),false);
 await buildCompanionEdition({check:true});
});

// Earlier quests also run through the VM; no completed-state forgery can hide
// a prerequisite or ending/save contract failure.
for(const q of added)for(const outcome of Object.keys(q.outcomes))test(`${q.id}/${outcome}: route, pending choices, cost, ending, save and one-time award`,()=>{
 const g=ready(q.requiredParty[0]);
 const condition=q.story.actions[`survey_${outcome}`].requires;
 const preferences={};const seed=expr=>{if(expr?.op==='eq'&&expr.left?.ref?.match(/^quests\.q\d+\.outcome$/))preferences[expr.left.ref.split('.')[1]]=expr.right;for(const arg of expr?.args??[])seed(arg);};seed(condition);prepareEarlier(g,q,preferences);
 start(g,q);checkpoint(g);finish(g,q,outcome,{save:true});
 const paid=g.state.gold,xp=g.state.actors[q.requiredParty[0]].xp,completed=g.state.vars.completed;
 g.run(q.model.entryScript);drain(g);assert.equal(g.state.gold,paid);assert.equal(g.state.actors[q.requiredParty[0]].xp,xp);assert.equal(g.state.vars.completed,completed);
 assert.throws(()=>g.complete(q.id,outcome));assert.equal(g.accept(q.id),false);
 assert.equal(g.state.vars.region_1,undefined,'character stories do not unlock the waterway capstone');
});

for(const [actor,episodes] of Object.entries(arcs))for(const alternate of [false,true])test(`${actor}: full ten-episode chain (${alternate?'alternate':'first'} choices) unlocks through completed actions`,()=>{
 const g=ready(actor==='mika'?'mica':actor);
 for(const [i,source] of episodes.entries()){
  const q=data.quests[`q${source.number}`];if(i<9)assert.equal(g.unlocked(data.quests[`q${source.number+1}`]),false);
  start(g,q);choose(g,'go');arrive(g);
  const choices=source.choices.filter(c=>storyCanAct(g,q.id,`survey_${c.id}`));assert.ok(choices.length);
  const c=choices[alternate?choices.length-1:0];choose(g,c.id);choose(g,'return');arrive(g);choose(g,'finish');
  assert.equal(g.state.quests[q.id].outcome,c.id);checkpoint(g);
 }
 assert.equal(g.state.vars.region_11,10);
});

test('Nio support changes later actions, is saved, and cannot be selected without the earlier agreement',()=>{
 for(const [source,result,option] of [[221,'teach','mice'],[223,'workers','hooks'],[224,'recall','pots']]){
  for(const supported of [false,true]){
   const g=ready('nio'),q=data.quests.q227,preferences={q221:'direct',q223:'porters',q224:'expose'};
   if(supported)preferences[`q${source}`]=result;prepareEarlier(g,q,preferences);start(g,q);choose(g,'go');arrive(g);checkpoint(g);
   assert.equal(storyCanAct(g,q.id,`survey_${option}`),supported);
   if(!supported){assert.equal(g.dispatch({type:'choose',id:option}),false);continue;}
   choose(g,option);choose(g,'return');arrive(g);choose(g,'finish');assert.equal(g.state.quests.q227.outcome,option);
  }
 }
});

test('missing companion blocks acceptance and resumption without losing the in-flight journey',()=>{
 const g=ready('nio'),q=data.quests.q221;start(g,q);choose(g,'go');go(g,'hikarigaeri_tavern');
 assert.ok(g.dispatch({type:'party',action:'leave',actor:'nio'}));const journey=structuredClone(g.state.journey);
 go(g,q.story.worldPlaces.site.location);assert.equal(g.dispatch({type:'story.resume',quest:q.id}),false);assert.deepEqual(g.state.journey,journey);checkpoint(g);
 go(g,'hikarigaeri_tavern');assert.ok(g.dispatch({type:'party',action:'join',actor:'nio'}));arrive(g);choose(g,'teach');choose(g,'return');arrive(g);choose(g,'finish');
 go(g,'hikarigaeri_tavern');assert.ok(g.dispatch({type:'party',action:'leave',actor:'nio'}));assert.equal(g.accept('q222'),false);
});

test('cost shortage leaves a free alternative and does not consume resources or commit a resolution',()=>{
 const g=ready('ada'),q=data.quests.q214;prepareEarlier(g,q);start(g,q);choose(g,'go');arrive(g);g.state.gold=0;
 assert.equal(g.dispatch({type:'choose',id:'pay'}),false);assert.equal(g.state.stories.q214.values.resolution,'pending');
 choose(g,'sort');choose(g,'return');arrive(g);choose(g,'finish');assert.equal(g.state.gold,10);
});

test('post-cut e2 records reject entirely missing and partially missing companion cohorts',()=>{
 const target=new GameEngine(data),stable=target.save();
 for(const missing of [added,added.slice(1)]){
  const original=JSON.parse(stable);for(const q of missing)delete original.state.quests[q.id];const before=structuredClone(original);
  assert.deepEqual(migrateSave(original,data),before);assert.deepEqual(original,before);assert.ok(validateSave(original,data).length);
  assert.throws(()=>target.load(JSON.stringify(original)));assert.equal(target.save(),stable);
 }
});

test('edition additions reject duplicate IDs and cannot overwrite the base world',async()=>{
 for(const mutate of [a=>a.quests.push(a.quests[0]),a=>a.locations.hikarigaeri_square=first.locations.hikarigaeri_square,a=>a.regions.push({id:1}),a=>a.characters.rine=first.characters.rine])await assert.rejects(loadContent(async file=>{const value=await read(file);if(file==='data/scenario-editions/e2/companions.json')mutate(value);return value;},{edition:'e2'}),/重複/);
});

test('the playable text excludes finale events, while Toma retains both costly choices',()=>{
 const played=added.flatMap(q=>Object.values(q.scripts).flatMap(s=>s.commands.filter(c=>c.op==='narrate').map(c=>c.text))).join('\n');
 assert.doesNotMatch(played,/オッドランド|大水門|古代の鍵|夫が仲間に|アダが離脱/);
 assert.doesNotMatch(Object.values(data.locations).filter(l=>l.id.startsWith('e2_')).map(l=>l.description).join('\n'),/大水門|古代の鍵|最終盤|実装/);
 assert.match(data.quests.q280.model.world.truth,/妻だけ/);assert.match(data.quests.q280.outcomes.burn.text,/苗/);assert.match(data.quests.q280.outcomes.coexist.text,/薬物で新しく倒れた/);
});

test('one campaign completes all eighty additions and saves without altering the legacy quest set',()=>{
 const g=ready('ada');
 for(const q of added){
  const actor=q.requiredParty[0];if(!g.state.members.includes(actor)){go(g,'hikarigaeri_tavern');assert.ok(g.dispatch({type:'party',action:'swap',actor,replace:g.state.members.at(-1)}));}
  start(g,q);finish(g,q,Object.keys(q.outcomes)[0]);
 }
 checkpoint(g);assert.equal(g.state.vars.region_11,80);assert.equal(g.state.vars.region_1,undefined);
 assert.ok(Buffer.byteLength(g.save())<=data.system.maxSaveBytes);
 for(const id of Object.keys(first.quests))assert.equal(g.state.quests[id].stage,'available');
});

test('a journey does not progress at the wrong facility and arrivals do not duplicate observations',()=>{
 const g=ready('nio'),q=data.quests.q221;start(g,q);choose(g,'go');
 const pending=structuredClone(g.state.stories.q221);assert.equal(g.dispatch({type:'story.resume',quest:q.id}),false);assert.deepEqual(g.state.stories.q221,pending);
 arrive(g);assert.deepEqual(g.state.stories.q221.knowledge.party,['finding']);checkpoint(g);
 assert.equal(g.state.stories.q221.events.filter(e=>e==='entry_go').length,1);
});
