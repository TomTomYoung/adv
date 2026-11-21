import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {projectGame} from '../src/application/projection.js';
import {createQuestTrial} from '../src/application/quest-playtest.js';
import {objectVisible} from '../src/core/quest-events.js';
import {catalog,data,previous,ready,routes,states,expectedValues,migrated} from './q092-helpers.mjs';
import {arrive,checkpoint,choose,depart,go,resume} from './world-route-helpers.mjs';
import {drain,fight} from './helpers.mjs';

const q='q092',story=data.quests[q].story,graph=states(q),v=g=>g.state.stories[q].values;
test('q092 preserves all original scripts, first edition rewards and event visibility',()=>{
  const raw=readFileSync(new URL('../data/quests/q092.json',import.meta.url));
  assert.equal(createHash('sha1').update('blob '+raw.length+'\0').update(raw).digest('hex'),'11f20e2cd105c46c507a150d225c16c07265a916');
  for(const [id,script] of Object.entries(previous.quests[q].scripts))assert.deepEqual(data.scripts[id],script,id);
  const old=ready(q,{old:true}),legacy=migrated(old),current=ready(q);
  for(const p of Object.values(story.worldPlaces)){
    const map=data.maps[p.map],oldMap=previous.maps[p.map];
    const events=(g,m)=>m.objects.filter(o=>o.x===p.x&&o.y===p.y&&objectVisible(g.state,m,o)).map(o=>o.id);
    assert.equal(map.tiles[p.y][p.x],'.');assert.deepEqual(events(current,map),[p.event]);
    assert.deepEqual(events(legacy,map),events(old,oldMap));
    assert.ok(map.objects.filter(o=>o.x===p.x&&o.y===p.y).every(o=>o.quest===q));
  }
});
for(const route of routes[q])test('q092 '+route.old.join('/')+' preserves reward, passenger location and original saves',()=>{
  const g=ready(q),old=ready(q,{old:true});
  for(const id of route.path){choose(g,q,id);checkpoint(g);}
  for(const [key,value] of Object.entries(expectedValues(q,route)))assert.equal(v(g)[key],value,key);
  assert.deepEqual(g.state.stories[q].knowledge.party??[],route.old.includes('signal')?['answer']:[]);
  let restored=migrated(old);
  for(const id of route.old){
    choose(old,q,id);choose(restored,q,id);checkpoint(restored);
    assert.deepEqual(restored.state.flags.flow[q],old.state.flags.flow[q]);restored=migrated(old);
  }
  for(const e of [g,restored]){
    assert.equal(e.state.quests[q].outcome,route.outcome);
    assert.equal(e.state.gold,old.state.gold);assert.equal(e.state.actors.ada.xp,old.state.actors.ada.xp);
    assert.equal(e.state.records.battles,Number(route.outcome==='contract'));
    const save=e.save();assert.throws(()=>e.complete(q,route.outcome));assert.equal(e.save(),save);
  }
});
test('q092 rescue from every scene retains the work and shows passengers only once outside',()=>{
  assert.deepEqual(new Set(graph.current.map(s=>s.scene)),new Set(Object.keys(story.scenes)));
  for(const row of graph.current){
    const g=ready(q);g.load(row.save);const saved=structuredClone(g.state.stories[q]);
    const place=story.scenes[row.scene].place,cast=()=>projectGame(g).dialog.scene.cast.map(c=>c.id);
    const expected=v(g).aboard?[]:['e2_q092_sheltered_crew'];
    assert.deepEqual(cast(),expected);
    g.defeat();drain(g);checkpoint(g);assert.deepEqual(g.state.stories[q],{...saved,values:{...saved.values,partyAt:'transit'}});
    go(g,q,place);resume(g,q);assert.deepEqual(g.state.stories[q],saved);
    assert.deepEqual(cast(),expected);
  }
});
const trips=new Map();
for(const row of graph.current){
  const g=ready(q);g.load(row.save);
  for(const o of projectGame(g).dialog.options.filter(o=>o.enabled)){
    const key=row.scene+'_'+o.id;if(story.actions[key]?.journey&&!trips.has(key))trips.set(key,{row,id:o.id});
  }
}
assert.equal(trips.size,5);
for(const [key,{row,id}] of trips)for(const kind of ['retreat','defeat']){
  test('q092 '+key+' preserves riders and shell through '+kind,()=>{
    const g=ready(q);g.load(row.save);depart(g,id);
    const saved=structuredClone(g.state.stories[q]),pending=structuredClone(g.state.journey);
    assert.equal(v(g).crewAt,'transit');
    assert.equal(v(g).shellAt,v(g).aboard?'transit':'track');
    assert.equal(g.dispatch({type:'story.resume',quest:q}),false);
    if(kind==='retreat')assert.ok(g.dispatch({type:'retreat'}));else g.defeat();
    drain(g);checkpoint(g);assert.deepEqual(g.state.stories[q],saved);assert.deepEqual(g.state.journey,pending);
    assert.equal(g.dispatch({type:'choose',id:'unload'}),false);
    arrive(g,q);checkpoint(g);assert.equal(g.state.stories[q].scene,story.actions[key].to);
    assert.equal(v(g).crewAt,story.actions[key].journey.to);
    assert.equal(v(g).shellAt,saved.values.aboard?v(g).crewAt:'track');
  });
}
for(const interruption of ['escape','defeat'])test('q092 stops the guard only on victory and allows a new choice after '+interruption,()=>{
  const g=ready(q);depart(g,'cut');const battle=checkpoint(g);
  assert.equal(g.state.battle.encounter,'guard_10');assert.equal(v(g).shellState,'patrol');
  if(interruption==='escape'){g.random=()=>0;assert.ok(g.dispatch({type:'battle',action:'escape'}));}
  else g.defeat();
  drain(g);g.random=()=>0.999999;checkpoint(g);
  go(g,q,'track');resume(g,q);assert.equal(v(g).aboard,true);assert.equal(v(g).opening,'closed');
  choose(g,q,'signal');choose(g,q,'listen');choose(g,q,'stop');assert.equal(g.state.stories[q].scene,'halt');
  g.load(battle);fight(g);drain(g);checkpoint(g);
  assert.equal(v(g).shellState,'disabled');assert.equal(v(g).aboard,true);assert.equal(v(g).opening,'closed');
  choose(g,q,'breach');assert.equal(v(g).aboard,false);assert.equal(v(g).opening,'breach');
});
test('q092 a real defeat on the exit road preserves the occupied shelter and completes after rescue',()=>{
  const trial=createQuestTrial(data,catalog,{quest:q,start:'site',party:'balanced',level:10,seed:1907}),g=trial.engine;
  drain(g);choose(g,q,'lead');depart(g,'walk');
  assert.equal(v(g).aboard,true);arrive(g,q,{recover:true});checkpoint(g);
  assert.equal(trial.rescues,1);assert.equal(g.state.records.losses,1);
  assert.equal(v(g).shellState,'docked');assert.equal(v(g).aboard,true);
  choose(g,q,'unload');choose(g,q,'receive');assert.equal(g.state.quests[q].outcome,'compromise');
});
test('q092 rejects a save that detaches sheltered riders or claims an opening before victory',()=>{
  const g=ready(q);const base=g.save();
  for(const fields of [{crewAt:'gate'},{opening:'breach',aboard:false},{shellState:'halted'}]){
    const raw=JSON.parse(base);Object.assign(raw.state.stories[q].values,fields);
    assert.throws(()=>g.load(JSON.stringify(raw)));assert.equal(g.save(),base);
  }
});
