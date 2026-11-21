import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {projectGame} from '../src/application/projection.js';
import {objectVisible} from '../src/core/quest-events.js';
import {drain,fight,exploreSpot,inspect} from './helpers.mjs';
import {arrive,checkpoint,choose,depart,go,resume} from './world-route-helpers.mjs';
import {data,previous,expectedValues,ready,routes,states,migrated} from './q093-helpers.mjs';

const q='q093',story=data.quests[q].story,graph=states(q),state=g=>g.state.stories[q];
const run=(g,...ids)=>{for(const id of ids)choose(g,q,id);};
test('q093 preserves original quest scripts and separates current sites from original events',()=>{
  const raw=readFileSync(new URL('../data/quests/q093.json',import.meta.url));
  assert.equal(createHash('sha1').update('blob '+raw.length+'\0').update(raw).digest('hex'),'fb1a64787b36832f5608f9ece9babfa0560e4ba3');
  for(const [id,script] of Object.entries(previous.quests[q].scripts))assert.deepEqual(data.scripts[id],script,id);
  const current=ready(q),old=ready(q,{old:true}),legacy=migrated(old);
  for(const p of Object.values(story.worldPlaces)){
    const map=data.maps[p.map],oldMap=previous.maps[p.map];
    const objects=(g,m)=>m.objects.filter(o=>o.x===p.x&&o.y===p.y&&objectVisible(g.state,m,o)).map(o=>o.id);
    assert.equal(map.tiles[p.y][p.x],'.');assert.deepEqual(objects(current,map),[p.event]);
    assert.deepEqual(objects(legacy,map),objects(old,oldMap));
    assert.ok(map.objects.filter(o=>o.x===p.x&&o.y===p.y).every(o=>o.quest===q));
  }
});
for(const route of routes[q])test('q093 '+route.old.join('/')+' preserves original payment and the results for each guest',()=>{
  const g=ready(q),old=ready(q,{old:true}),start=g.state.gold;
  for(const action of route.path){run(g,action);checkpoint(g);}
  const v=state(g).values;
  for(const [key,value] of Object.entries(expectedValues(q,route)))assert.equal(v[key],value,key);
  const facts=route.old.filter(id=>['contract','one','two'].includes(id)).map(id=>id==='contract'?'terms':id);
  assert.deepEqual(state(g).knowledge.party??[],facts);
  for(const id of route.old){
    const restored=migrated(old);assert.equal(restored.state.flags.legacyStoryRoutes[q],true);
    run(old,id);run(restored,id);checkpoint(restored);
    assert.deepEqual(restored.state.flags.flow[q],old.state.flags.flow[q]);
    assert.deepEqual(restored.state.quests[q],old.state.quests[q]);
    assert.equal(restored.state.gold,old.state.gold);assert.equal(restored.state.actors.ada.xp,old.state.actors.ada.xp);
  }
  assert.equal(g.state.quests[q].outcome,route.outcome);assert.equal(g.state.gold,start+previous.quests[q].outcomes[route.outcome].gold);
  assert.equal(g.state.gold,old.state.gold);assert.equal(g.state.actors.ada.xp,old.state.actors.ada.xp);
  const save=g.save();assert.throws(()=>g.complete(q,route.outcome));assert.equal(g.save(),save);
});
test('q093 rescues every on-site state, showing exactly the co-located guests and innkeeper after return',()=>{
  assert.deepEqual(new Set(graph.current.map(row=>row.scene)),new Set(Object.keys(story.scenes)));
  for(const row of graph.current){
    const g=ready(q);g.load(row.save);const before=structuredClone(state(g)),place=story.scenes[row.scene].place;
    const expected=Object.entries(story.entities).filter(([id,e])=>e.character&&before.values[e.holder]===place).map(([,e])=>e.character).sort();
    const cast=()=>projectGame(g).dialog.scene.cast.map(c=>c.id).sort();
    assert.deepEqual(cast(),expected,row.scene);
    g.defeat();drain(g);checkpoint(g);
    assert.deepEqual(state(g),{...before,values:{...before.values,partyAt:'transit'}});
    go(g,q,place);resume(g,q);assert.deepEqual(state(g),before);assert.deepEqual(cast(),expected);
  }
});
const trips=new Map();
for(const row of graph.current){
  const g=ready(q);g.load(row.save);
  for(const option of projectGame(g).dialog.options.filter(o=>o.enabled)){
    const key=row.scene+'_'+option.id;
    if(story.actions[key]?.journey&&!trips.has(key))trips.set(key,{row,id:option.id});
  }
}
assert.equal(trips.size,9);
for(const [key,{row,id}] of trips)for(const kind of ['retreat','defeat']){
  test('q093 '+key+' keeps confirmed wishes, documents and companions after '+kind,()=>{
    const g=ready(q);g.load(row.save);depart(g,id);
    const before=structuredClone(state(g)),pending=structuredClone(g.state.journey);
    assert.equal(g.dispatch({type:'story.resume',quest:q}),false);
    if(kind==='retreat')assert.ok(g.dispatch({type:'retreat'}));else g.defeat();
    drain(g);checkpoint(g);assert.deepEqual(state(g),before);assert.deepEqual(g.state.journey,pending);
    assert.equal(g.dispatch({type:'choose',id:'hand'}),false);
    arrive(g,q);checkpoint(g);assert.equal(state(g).scene,story.actions[key].to);
    if(key==='restored_back')assert.equal(state(g).values.oneName,'returned');
    if(key==='dated_back')assert.equal(state(g).values.dated,true);
    if(key==='firstReady_next'||key==='bothReady_gate'){
      assert.equal(state(g).values.passOneAt,'guestOne');
      assert.equal(state(g).values.passTwoAt,key==='firstReady_next'?'party':'guestTwo');
    }
  });
}
for(const first of ['one','two'])test('q093 remembers exactly one completed wish after rescue and still allows certificates: '+first,()=>{
  const g=ready(q);run(g,'contract',first,first==='one'?'restore':'date');depart(g,'back');
  g.defeat();drain(g);checkpoint(g);arrive(g,q);
  assert.equal(g.dispatch({type:'choose',id:first}),false);assert.equal(g.dispatch({type:'choose',id:'renew'}),false);
  const save=g.save();run(g,'paper','stamp','deliver','hand','next','hand','gate','check');
  assert.equal(state(g).values.oneName,first==='one'?'returned':'sealed');assert.equal(state(g).values.dated,first==='two');
  assert.equal(g.state.quests[q].outcome,'compromise');
  g.load(save);const second=first==='one'?'two':'one';
  run(g,second,second==='one'?'restore':'date','back','renew','file');assert.equal(g.state.quests[q].outcome,'informed');
});
test('q093 rejects a duplicated pass, an unsigned date and an early release without changing the running save',()=>{
  const g=ready(q),save=g.save();
  for(const change of [{passOneAt:'guestTwo'},{passTwoAt:'guestTwo'},{dated:true},{ledger:'released',twoName:'returned'}]){
    const raw=JSON.parse(save);Object.assign(raw.state.stories[q].values,change);
    assert.throws(()=>g.load(JSON.stringify(raw)));assert.equal(g.save(),save);
  }
});
for(const entry of ['decision','review'])for(const outcome of ['informed','contract','compromise']){
  test('q093 legacy '+entry+' retains clues, guard, supplies and reward for '+outcome,()=>{
    const old=ready(q,{old:true,start:'reception'});
    if(outcome==='informed')for(const clue of ['clue_a','clue_b'])old.evidence(q,clue,clue);
    old.run(q+'.'+entry);drain(old);const g=migrated(old);checkpoint(g);
    for(const e of [old,g]){
      const ropes=e.state.inventory.rope??0;
      if(outcome!=='informed')assert.equal(e.dispatch({type:'choose',id:'informed'}),false);
      depart(e,outcome);if(outcome==='contract'){assert.equal(e.state.battle.encounter,'guard_10');fight(e);drain(e);}
      assert.equal(e.state.inventory.rope??0,ropes);assert.equal(e.state.records.battles,Number(outcome==='contract'));
      assert.equal(e.state.quests[q].outcome,outcome);
    }
    assert.equal(g.state.gold,old.state.gold);assert.equal(g.state.actors.ada.xp,old.state.actors.ada.xp);checkpoint(g);
  });
}
test('q093 saved legacy guard battle resumes at the original release result',()=>{
  const old=ready(q,{old:true,start:'reception'});old.run(q+'.review');drain(old);depart(old,'contract');
  const g=migrated(old);checkpoint(g);assert.equal(g.state.battle.encounter,'guard_10');fight(g);drain(g);
  assert.equal(g.state.quests[q].outcome,'contract');assert.equal(g.state.records.wins,1);
});
test('q093 original half-completed contract returns to the right guest options after defeat',()=>{
  const old=ready(q,{old:true});run(old,'contract','two');const g=migrated(old);
  g.defeat();drain(g);checkpoint(g);const event=previous.quests[q].events.find(e=>e.id===q+'_decision');
  exploreSpot(g,event.points[0],{maintain:true,interact:false});if(!g.state.waiting)inspect(g,event.id);drain(g);
  assert.equal(g.dispatch({type:'choose',id:'two'}),false);assert.equal(g.dispatch({type:'choose',id:'renew'}),false);
  run(g,'one','renew');assert.equal(g.state.quests[q].outcome,'informed');
});
