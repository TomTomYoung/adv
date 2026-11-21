import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {objectVisible} from '../src/core/quest-events.js';
import {projectGame} from '../src/application/projection.js';
import {drain,fight,exploreSpot,inspect} from './helpers.mjs';
import {arrive,checkpoint,choose,depart,go,resume} from './world-route-helpers.mjs';
import {data,expectedValues,migrated,openOldDecision,previous,ready,routes,states} from './q095-helpers.mjs';

const q='q095',story=data.quests[q].story,graph=states(q);
const values=g=>g.state.stories[q].values;
const act=(g,...ids)=>{for(const id of ids)choose(g,q,id);};

test('q095 uses the original entry cell, exclusive world events and byte-identical previous scripts',()=>{
  const raw=readFileSync(new URL('../data/quests/q095.json',import.meta.url));
  assert.equal(createHash('sha1').update('blob '+raw.length+'\0').update(raw).digest('hex'),'f15221b509a927b1be70bd0b72bbd9c99624c53b');
  for(const [id,script] of Object.entries(previous.quests[q].scripts))assert.deepEqual(data.scripts[id],script,id);
  const old=ready(q,{old:true}),legacy=migrated(old),current=ready(q);
  const decision=previous.quests[q].events.find(e=>e.role==='decision').points[0];
  for(const key of ['map','x','y'])assert.equal(story.worldPlaces.desk[key],decision[key]);
  for(const place of Object.values(story.worldPlaces)){
    const map=data.maps[place.map],oldMap=previous.maps[place.map];
    const visible=(g,m)=>m.objects.filter(o=>o.x===place.x&&o.y===place.y&&objectVisible(g.state,m,o)).map(o=>o.id);
    assert.equal(map.tiles[place.y][place.x],'.');assert.deepEqual(visible(current,map),[place.event]);
    assert.deepEqual(visible(legacy,map),visible(old,oldMap));
    assert.ok(map.objects.filter(o=>o.x===place.x&&o.y===place.y).every(o=>o.quest===q));
  }
});

for(const route of routes[q])test('q095 '+route.old.join('/')+' retains both editions, knowledge, original rewards and battle count',()=>{
  const current=ready(q),old=ready(q,{old:true}),startGold=current.state.gold,startXp=current.state.actors.ada.xp;
  for(const id of route.path){choose(current,q,id);checkpoint(current);}
  for(const [key,value] of Object.entries(expectedValues(q,route)))assert.equal(values(current)[key],value,key);
  assert.deepEqual(current.state.stories[q].knowledge.party??[],route.old[0]==='timeline'?['fittings','relays']:[]);
  let legacy=migrated(old);
  for(const id of route.old){
    assert.equal(legacy.state.flags.legacyStoryRoutes[q],true);
    choose(old,q,id);choose(legacy,q,id);checkpoint(legacy);
    assert.deepEqual(legacy.state.flags.flow[q],old.state.flags.flow[q]);legacy=migrated(old);
  }
  const reward=previous.quests[q].outcomes[route.outcome];
  for(const g of [old,current,legacy]){
    assert.equal(g.state.quests[q].outcome,route.outcome);assert.equal(g.state.records.battles,0);
    assert.equal(g.state.gold,startGold+reward.gold);assert.equal(g.state.actors.ada.xp,startXp+reward.xp);
    const save=g.save();assert.throws(()=>g.complete(q,route.outcome));assert.equal(g.save(),save);
  }
});

test('q095 rescue returns to every scene with the original custody, text and local cast',()=>{
  assert.deepEqual(new Set(graph.current.map(r=>r.scene)),new Set(Object.keys(story.scenes)));
  for(const row of graph.current){
    const g=ready(q);g.load(row.save);const saved=structuredClone(g.state.stories[q]),place=story.scenes[row.scene].place;
    const cast=()=>projectGame(g).dialog.scene.cast.map(c=>c.id),text=projectGame(g).dialog.text;
    const expected=place==='desk'?['e2_q095_teo']:place==='wall'?['e2_q095_mason']:[];
    assert.deepEqual(cast(),expected);assert.equal(values(g).teoAt,'desk');assert.equal(values(g).masonAt,'wall');
    g.defeat();drain(g);checkpoint(g);assert.deepEqual(g.state.stories[q],{...saved,values:{...saved.values,partyAt:'transit'}});
    go(g,q,place);resume(g,q);assert.deepEqual(cast(),expected);assert.equal(projectGame(g).dialog.text,text);assert.deepEqual(g.state.stories[q],saved);
  }
});

const journeys=new Map();
for(const row of graph.current){
  const g=ready(q);g.load(row.save);
  for(const option of projectGame(g).dialog.options.filter(o=>o.enabled)){
    const key=row.scene+'_'+option.id;
    if(!story.actions[key]?.journey)continue;
    // The two action-only drafts have different histories on the way to the archive.
    journeys.set(key+'/'+values(g).stripAt,{row,id:option.id,key});
  }
}
assert.equal(new Set([...journeys.values()].map(r=>r.key)).size,5);
for(const [tag,{row,id,key}] of journeys)for(const kind of ['retreat','defeat']){
  test('q095 '+tag+' holds the same documents through '+kind+' and arrival',()=>{
    const g=ready(q);g.load(row.save);depart(g,id);
    const saved=structuredClone(g.state.stories[q]),pending=structuredClone(g.state.journey);
    assert.equal(values(g).partyAt,'transit');
    for(const action of ['match','hand','bind'])assert.equal(g.dispatch({type:'choose',id:action}),false);
    assert.equal(g.dispatch({type:'story.resume',quest:q}),false);
    if(kind==='retreat')assert.ok(g.dispatch({type:'retreat'}));else g.defeat();
    drain(g);checkpoint(g);assert.deepEqual(g.state.journey,pending);assert.deepEqual(g.state.stories[q],saved);
    arrive(g,q);checkpoint(g);assert.equal(g.state.stories[q].scene,story.actions[key].to);
    for(const k of ['stripAt','sheetAt','form','finished'])assert.equal(values(g)[k],saved.values[k]);
    assert.deepEqual(g.state.stories[q].knowledge,saved.knowledge);
    if(key==='carrying_back'){assert.equal(values(g).stripAt,'party');act(g,'match');assert.equal(values(g).stripAt,'teo');}
    if(key==='pages_carry'){act(g,'bind');assert.equal(values(g).sheetAt,'archive');assert.equal(g.state.quests[q].outcome,'compromise');}
    if(key.endsWith('_deliver')){act(g,'hand');assert.equal(values(g).sheetAt,'mason');assert.equal(values(g).finished,false);}
  });
}

test('q095 forged custody, relay knowledge, monument and a premature unveiling are rejected atomically',()=>{
  const g=ready(q),original=g.save();
  for(const fields of [{stripAt:'mason'},{stripAt:'party'},{stripAt:'teo'},{sheetAt:'mason'},{form:'wall',sheetAt:'party'},{finished:true},{teoAt:'rack'},{masonAt:'desk'}]){
    const raw=JSON.parse(original);Object.assign(raw.state.stories[q].values,fields);
    assert.throws(()=>g.load(JSON.stringify(raw)));assert.equal(g.save(),original);
  }
  const raw=JSON.parse(original);raw.state.stories[q].knowledge.party=['relays'];
  assert.throws(()=>g.load(JSON.stringify(raw)));assert.equal(g.save(),original);
});

for(const entry of ['decision','review'])for(const outcome of ['informed','contract','compromise']){
  test('q095 older '+entry+' preserves its evidence gate, encounter and reward for '+outcome,()=>{
    const old=ready(q,{old:true,start:'reception'});if(outcome==='informed')for(const clue of ['clue_a','clue_b'])old.evidence(q,clue,clue);
    openOldDecision(old,entry);const g=migrated(old);checkpoint(g);
    for(const engine of [old,g]){
      if(outcome!=='informed')assert.equal(engine.dispatch({type:'choose',id:'informed'}),false);
      depart(engine,outcome);
      if(outcome==='contract'){assert.equal(engine.state.battle.encounter,'guard_10');checkpoint(engine);fight(engine);drain(engine);}
      assert.equal(engine.state.records.battles,Number(outcome==='contract'));assert.equal(engine.state.quests[q].outcome,outcome);
    }
    assert.equal(g.state.gold,old.state.gold);assert.equal(g.state.actors.ada.xp,old.state.actors.ada.xp);checkpoint(g);
  });
}
test('q095 pre-update guard battle keeps its continuation on loading the new edition',()=>{
  const old=ready(q,{old:true,start:'reception'});openOldDecision(old,'review');depart(old,'contract');
  const g=migrated(old);checkpoint(g);assert.equal(g.state.battle.encounter,'guard_10');
  fight(g);drain(g);assert.equal(g.state.quests[q].outcome,'contract');assert.equal(g.state.records.wins,1);checkpoint(g);
});
test('q095 an old party rescued after sorting the returns retains both original resolutions',()=>{
  const old=ready(q,{old:true});act(old,'timeline');const g=migrated(old);g.defeat();drain(g);checkpoint(g);
  const event=previous.quests[q].events.find(e=>e.role==='decision');
  exploreSpot(g,event.points[0],{maintain:true,interact:false});if(!g.state.waiting)inspect(g,event.id);
  drain(g);assert.equal(g.state.flags.flow[q].node,'names');const save=g.save();
  for(const [id,outcome] of [['wall','informed'],['actions','compromise']]){
    g.load(save);act(g,id);assert.equal(g.state.quests[q].outcome,outcome);checkpoint(g);
  }
});
