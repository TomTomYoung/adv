import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {objectVisible} from '../src/core/quest-events.js';
import {projectGame} from '../src/application/projection.js';
import {drain,fight,exploreSpot,inspect} from './helpers.mjs';
import {arrive,checkpoint,choose,depart,go,resume} from './world-route-helpers.mjs';
import {data,expectedValues,migrated,previous,ready,routes,states} from './q091-helpers.mjs';

const q='q091',story=data.quests[q].story,graph=states(q);
const values=g=>g.state.stories[q].values;
test('q091 preserves original scripts and activates exactly the applicable event at each site',()=>{
  const raw=readFileSync(new URL('../data/quests/q091.json',import.meta.url));
  assert.equal(createHash('sha1').update('blob '+raw.length+'\0').update(raw).digest('hex'),'058ca0ff2415c9101ff417478b31d69b8175cab4');
  for(const [id,script] of Object.entries(previous.quests[q].scripts))assert.deepEqual(data.scripts[id],script,id);
  const old=ready(q,{old:true}),legacy=migrated(old),current=ready(q);
  for(const place of Object.values(story.worldPlaces)){
    const map=data.maps[place.map],oldMap=previous.maps[place.map];
    function visible(g,m){return m.objects.filter(o=>o.x===place.x&&o.y===place.y&&objectVisible(g.state,m,o)).map(o=>o.id);}
    assert.equal(map.tiles[place.y][place.x],'.');assert.deepEqual(visible(current,map),[place.event]);
    assert.deepEqual(visible(legacy,map),visible(old,oldMap));
    assert.ok(map.objects.filter(o=>o.x===place.x&&o.y===place.y).every(o=>o.quest===q));
  }
});
test('q091 every saved scene retains its work and guide location through rescue and return',()=>{
  assert.deepEqual(new Set(graph.current.map(r=>r.scene)),new Set(Object.keys(story.scenes)));
  for(const row of graph.current){
    const g=ready(q);g.load(row.save);
    const saved=structuredClone(g.state.stories[q]),place=story.scenes[row.scene].place;
    const cast=()=>projectGame(g).dialog.scene?.cast.map(c=>c.id)??[];
    const expected=place==='desk'?['e2_abyss_noa']:[];
    assert.deepEqual(cast(),expected);assert.equal(values(g).noaAt,'desk');
    g.defeat();drain(g);checkpoint(g);
    assert.deepEqual(g.state.stories[q],{...saved,values:{...saved.values,partyAt:'transit'}},row.scene);
    go(g,q,place);resume(g,q);assert.deepEqual(cast(),expected);assert.deepEqual(g.state.stories[q],saved,row.scene);
  }
});
for(const route of routes[q])test('q091 '+route.old.join('/')+' settles the same reward once and preserves the former path',()=>{
  const g=ready(q),old=ready(q,{old:true}),initialGold=g.state.gold;
  for(const id of route.path){choose(g,q,id);checkpoint(g);}
  for(const [key,value] of Object.entries(expectedValues(q,route)))assert.equal(values(g)[key],value,key);
  const knowledge=route.old.includes('equipment')?['stride','loans']:route.old.includes('step')?['stride']:[];
  assert.deepEqual(g.state.stories[q].knowledge.party??[],knowledge);
  let restored=migrated(old);
  for(const id of route.old){
    assert.equal(restored.state.flags.legacyStoryRoutes[q],true);
    choose(old,q,id);choose(restored,q,id);checkpoint(restored);
    assert.deepEqual(restored.state.flags.flow[q],old.state.flags.flow[q]);restored=migrated(old);
  }
  for(const engine of [old,g,restored]){
    assert.equal(engine.state.quests[q].outcome,route.outcome);
    assert.equal(engine.state.gold,initialGold+previous.quests[q].outcomes[route.outcome].gold);
    assert.equal(engine.state.actors.ada.xp,old.state.actors.ada.xp);
    const saved=engine.save();assert.throws(()=>engine.complete(q,route.outcome));assert.equal(engine.save(),saved);
  }
});
const trips=new Map();
for(const row of graph.current){
  const g=ready(q);g.load(row.save);
  for(const option of projectGame(g).dialog.options.filter(o=>o.enabled)){
    const action=row.scene+'_'+option.id;
    if(story.actions[action]?.journey&&!trips.has(action))trips.set(action,{row,id:option.id});
  }
}
assert.equal(trips.size,6);
for(const [action,{row,id}] of trips)for(const kind of ['retreat','defeat']){
  test('q091 '+action+' preserves departure and arrival through '+kind,()=>{
    const g=ready(q);g.load(row.save);depart(g,id);
    const before=structuredClone(g.state.stories[q]),pending=structuredClone(g.state.journey);
    assert.equal(g.dispatch({type:'story.resume',quest:q}),false);
    if(kind==='retreat')assert.ok(g.dispatch({type:'retreat'}));else g.defeat();
    drain(g);checkpoint(g);
    assert.deepEqual(g.state.stories[q],before);assert.deepEqual(g.state.journey,pending);
    assert.equal(g.dispatch({type:'choose',id:'borrow'}),false);assert.equal(values(g).journalAt,'noa');
    arrive(g,q);checkpoint(g);assert.equal(g.state.stories[q].scene,story.actions[action].to);
    if(action==='entry_step'){assert.equal(values(g).comparisonLine,true);assert.deepEqual(g.state.stories[q].knowledge.party??[],[]);}
    if(action==='checked_return'){
      assert.equal(values(g).restChecked,true);assert.equal(values(g).journalAt,'noa');
      choose(g,q,'borrow');assert.equal(values(g).journalAt,'party');assert.equal(g.state.quests[q].outcome,'informed');
    }
  });
}
for(const entry of ['decision','review'])for(const outcome of ['informed','contract','compromise']){
  test('q091 older '+entry+' preserves '+outcome+' clue gates, guard and supplies',()=>{
    const old=ready(q,{old:true,start:'reception'});
    if(outcome==='informed')for(const clue of ['clue_a','clue_b'])old.evidence(q,clue,clue);
    old.run(q+'.'+entry);drain(old);
    const g=migrated(old);checkpoint(g);
    for(const e of [old,g]){
      const ropes=e.state.inventory.rope??0;
      if(outcome!=='informed')assert.equal(e.dispatch({type:'choose',id:'informed'}),false);
      depart(e,outcome);
      if(outcome==='contract'){assert.equal(e.state.battle.encounter,'guard_10');fight(e);drain(e);}
      assert.equal(e.state.records.battles,Number(outcome==='contract'));
      assert.equal(e.state.inventory.rope??0,ropes);assert.equal(e.state.quests[q].outcome,outcome);
    }
    assert.equal(g.state.gold,old.state.gold);assert.equal(g.state.actors.ada.xp,old.state.actors.ada.xp);checkpoint(g);
  });
}
test('q091 older saved guard fight returns to the correct ending',()=>{
  const old=ready(q,{old:true,start:'reception'});old.run(q+'.review');drain(old);depart(old,'contract');
  const g=migrated(old);checkpoint(g);assert.equal(g.state.battle.encounter,'guard_10');
  fight(g);drain(g);assert.equal(g.state.quests[q].outcome,'contract');assert.equal(g.state.records.wins,1);checkpoint(g);
});
test('q091 a rescued old party can return to the choice to borrow or mark its own prints',()=>{
  const old=ready(q,{old:true});choose(old,q,'step');choose(old,q,'equipment');
  const g=migrated(old);g.defeat();drain(g);checkpoint(g);
  const event=previous.quests[q].events.find(e=>e.id==='q091_decision');
  exploreSpot(g,event.points[0],{maintain:true,interact:false});
  if(!g.state.waiting)inspect(g,event.id);
  drain(g);assert.equal(g.state.flags.flow[q].node,'previous');
  const save=g.save();
  for(const [id,outcome] of [['own','compromise'],['inherit','informed']]){
    g.load(save);choose(g,q,id);assert.equal(g.state.quests[q].outcome,outcome);checkpoint(g);
  }
});
