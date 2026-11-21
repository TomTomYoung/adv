import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {projectGame} from '../src/application/projection.js';
import {objectVisible} from '../src/core/quest-events.js';
import {drain,fight,exploreSpot,inspect} from './helpers.mjs';
import {arrive,checkpoint,choose,depart,go,resume} from './world-route-helpers.mjs';
import {data,previous,expectedValues,ready,routes,states,migrated} from './q094-helpers.mjs';

const q='q094',story=data.quests[q].story,graph=states(q);
const state=g=>g.state.stories[q],values=g=>state(g).values;
const run=(g,...ids)=>{for(const id of ids)choose(g,q,id);};
const lift=['board','load','rise','unload'];
test('q094 original scripts and floor events select the right version for each party',()=>{
  const raw=readFileSync(new URL('../data/quests/q094.json',import.meta.url));
  assert.equal(createHash('sha1').update('blob '+raw.length+'\0').update(raw).digest('hex'),'7d5ee105c464c62abc236a32589000828a9e3939');
  for(const [id,script] of Object.entries(previous.quests[q].scripts))assert.deepEqual(data.scripts[id],script,id);
  const current=ready(q),old=ready(q,{old:true}),legacy=migrated(old);
  for(const p of Object.values(story.worldPlaces)){
    const map=data.maps[p.map],oldMap=previous.maps[p.map];
    const events=(g,m)=>m.objects.filter(o=>o.x===p.x&&o.y===p.y&&objectVisible(g.state,m,o)).map(o=>o.id);
    assert.equal(map.tiles[p.y][p.x],'.');assert.deepEqual(events(current,map),[p.event]);assert.deepEqual(events(legacy,map),events(old,oldMap));
    assert.ok(map.objects.filter(o=>o.x===p.x&&o.y===p.y).every(o=>o.quest===q));
  }
});
for(const route of routes[q])test('q094 '+route.old.join('/')+' preserves the actual tax, rescue and original reward',()=>{
  const g=ready(q),old=ready(q,{old:true});
  for(const id of route.path){
    const gold=g.state.gold;run(g,id);checkpoint(g);
    if(['advance','pay'].includes(id)){assert.equal(g.state.gold,gold-30);assert.equal(values(g).rescue,'waiting');}
    if(id==='rise'){assert.equal(values(g).woundedAt,'upper');assert.equal(values(g).rescue,'aboard');}
  }
  for(const [key,value] of Object.entries(expectedValues(q,route)))assert.equal(values(g)[key],value,key);
  assert.deepEqual(state(g).knowledge.party??[],route.old.includes('cost')||route.old.includes('reform')?['costs']:[]);
  for(const id of route.old){
    const restored=migrated(old);run(old,id);run(restored,id);checkpoint(restored);
    assert.deepEqual(restored.state.flags.flow[q],old.state.flags.flow[q]);assert.deepEqual(restored.state.quests[q],old.state.quests[q]);
    assert.equal(restored.state.gold,old.state.gold);assert.equal(restored.state.actors.ada.xp,old.state.actors.ada.xp);
  }
  assert.equal(g.state.gold,old.state.gold);assert.equal(g.state.actors.ada.xp,old.state.actors.ada.xp);
  assert.equal(g.state.quests[q].outcome,route.outcome);assert.equal(g.state.records.battles,Number(route.outcome==='contract'));
  const save=g.save();assert.throws(()=>g.complete(q,route.outcome));assert.equal(g.save(),save);
});
test('q094 all saved work sites and their actors resume after rescue',()=>{
  assert.deepEqual(new Set(graph.current.map(r=>r.scene)),new Set(Object.keys(story.scenes)));
  for(const row of graph.current){
    const g=ready(q);g.load(row.save);const before=structuredClone(state(g)),place=story.scenes[row.scene].place;
    const expected=Object.values(story.entities).filter(e=>e.character&&before.values[e.holder]===place).map(e=>e.character).sort();
    const cast=()=>projectGame(g).dialog.scene.cast.map(c=>c.id).sort();assert.deepEqual(cast(),expected,row.scene);
    g.defeat();drain(g);checkpoint(g);
    assert.deepEqual(state(g),{...before,values:{...before.values,partyAt:'transit'}});
    go(g,q,place);resume(g,q);assert.deepEqual(state(g),before);assert.deepEqual(cast(),expected);
  }
});
const trips=new Map();
for(const row of graph.current){
  const g=ready(q);g.load(row.save);
  for(const o of projectGame(g).dialog.options.filter(o=>o.enabled)){
    const key=row.scene+'_'+o.id;
    if(story.actions[key]?.journey&&!trips.has(key))trips.set(key,{row,id:o.id});
  }
}
assert.equal(trips.size,9);
for(const [key,{row,id}] of trips)for(const kind of ['defeat','retreat']){
  test('q094 '+key+' resumes after '+kind+' with the same fare and stretcher holders',()=>{
    const g=ready(q);g.load(row.save);depart(g,id);
    const before=structuredClone(state(g)),pending=structuredClone(g.state.journey);
    assert.equal(g.dispatch({type:'story.resume',quest:q}),false);
    if(kind==='defeat')g.defeat();else assert.ok(g.dispatch({type:'retreat'}));
    drain(g);checkpoint(g);assert.deepEqual(state(g),before);assert.deepEqual(g.state.journey,pending);
    assert.equal(g.dispatch({type:'choose',id:'unload'}),false);arrive(g,q);checkpoint(g);
    assert.equal(state(g).scene,story.actions[key].to);assert.equal(values(g).payment,before.values.payment);
    if(key==='aboard_rise'){assert.equal(before.values.woundedAt,'transit');assert.equal(values(g).rescue,'aboard');assert.equal(values(g).woundedAt,'upper');}
  });
}
for(const action of ['advance','pay'])for(const kind of ['retreat','defeat']){
  test('q094 '+action+' shortage at 29G and single payment at 30G after '+kind,()=>{
    const g=ready(q);if(action==='pay')run(g,'cost','inspect');
    const scene=state(g).scene,site=story.scenes[scene].place;
    g.state.gold=29;const before=g.save();assert.equal(g.dispatch({type:'choose',id:action}),false);assert.equal(g.save(),before);
    depart(g,action+'_supplies');checkpoint(g);
    assert.equal(g.state.flags.questResume[q],q+'.tax.'+scene+'.'+action+'.resume');assert.equal(g.state.gold,29);assert.equal(values(g).payment,'none');
    if(kind==='defeat')g.defeat();else assert.ok(g.dispatch({type:'retreat'}));drain(g);
    g.state.gold=30;checkpoint(g);go(g,q,site);resume(g,q);
    assert.equal(g.state.flags.questResume[q],null);assert.equal(state(g).scene,scene);run(g,action);
    assert.equal(g.state.gold,0);assert.equal(values(g).payment,action==='advance'?'advance':'afterReview');
    assert.equal(g.dispatch({type:'choose',id:action}),false);checkpoint(g);
    g.defeat();drain(g);checkpoint(g);go(g,q,site);resume(g,q);run(g,...lift);
    if(action==='advance'){
      run(g,'reform','inspect');assert.deepEqual(projectGame(g).dialog.options.filter(o=>o.enabled).map(o=>o.id),['change','leave']);
      assert.equal(g.dispatch({type:'choose',id:'pay_supplies'}),false);run(g,'change','file');
      assert.equal(g.state.gold,165);
    }else{run(g,'receipt','record');assert.equal(g.state.gold,107);}
  });
}
for(const kind of ['escape','defeat'])test('q094 '+kind+' from the guard preserves the lock and allows a fresh decision',()=>{
  const g=ready(q);depart(g,'free');const battle=checkpoint(g);
  assert.equal(g.state.battle.encounter,'guard_10');assert.equal(values(g).guardStopped,false);
  if(kind==='escape'){g.random=()=>0;assert.ok(g.dispatch({type:'battle',action:'escape'}));}else g.defeat();
  drain(g);g.random=()=>0.999999;checkpoint(g);go(g,q,'box');resume(g,q);
  assert.equal(values(g).rescue,'waiting');assert.equal(values(g).tariff,'flat');
  run(g,'cost','inspect','change',...lift,'file','file');assert.equal(g.state.quests[q].outcome,'informed');
  g.load(battle);fight(g);drain(g);checkpoint(g);
  assert.equal(values(g).guardStopped,true);assert.equal(values(g).tariff,'flat');assert.equal(values(g).rescue,'waiting');
  g.defeat();drain(g);go(g,q,'box');resume(g,q);run(g,'open',...lift,'finish');
  assert.equal(g.state.quests[q].outcome,'contract');
});
test('q094 rejects unpaid receipt, remote unloading and premature free passage without mutating the active save',()=>{
  const g=ready(q),base=g.save();
  for(const fields of [{rescue:'ashore'},{tariff:'freeToday'},{tariff:'shared'},{receiptFiled:true},{rescue:'aboard'}]){
    const raw=JSON.parse(base);Object.assign(raw.state.stories[q].values,fields);
    assert.throws(()=>g.load(JSON.stringify(raw)));assert.equal(g.save(),base);
  }
});
for(const entry of ['decision','review'])for(const outcome of ['informed','contract','compromise']){
  test('q094 old '+entry+' retains supplies, clue gate and encounter for '+outcome,()=>{
    const old=ready(q,{old:true,start:'reception'});if(outcome==='informed')for(const clue of ['clue_a','clue_b'])old.evidence(q,clue,clue);
    old.run(q+'.'+entry);drain(old);const g=migrated(old);checkpoint(g);
    for(const e of [old,g]){
      const ropes=e.state.inventory.rope??0;
      if(outcome!=='informed')assert.equal(e.dispatch({type:'choose',id:'informed'}),false);
      depart(e,outcome);if(outcome==='contract'){assert.equal(e.state.battle.encounter,'guard_10');fight(e);drain(e);}
      assert.equal(e.state.inventory.rope??0,ropes);assert.equal(e.state.records.battles,Number(outcome==='contract'));assert.equal(e.state.quests[q].outcome,outcome);
    }
    assert.equal(g.state.gold,old.state.gold);assert.equal(g.state.actors.ada.xp,old.state.actors.ada.xp);
  });
}
for(const action of ['advance','pay'])test('q094 saved old '+action+' shortage resumes the original commands',()=>{
  const old=ready(q,{old:true});if(action==='pay')run(old,'cost');
  old.state.gold=29;depart(old,action+'_supplies');const g=migrated(old);checkpoint(g);
  assert.equal(g.state.gold,29);g.state.gold=30;g.run(q+'.flow.visit');drain(g);run(g,action);
  if(action==='advance'){assert.equal(g.state.gold,0);run(g,'receipt');}
  assert.equal(g.state.quests[q].outcome,'compromise');assert.equal(g.state.gold,107);
});
test('q094 old return after defeat retains the receipt and the original no-second-payment choice',()=>{
  const old=ready(q,{old:true});run(old,'advance');const g=migrated(old);g.defeat();drain(g);checkpoint(g);
  const p=previous.quests[q].events.find(e=>e.id===q+'_decision');
  exploreSpot(g,p.points[0],{maintain:true,interact:false});if(!g.state.waiting)inspect(g,p.id);drain(g);
  assert.equal(g.state.flags.flow[q].node,'returned');run(g,'reform');const gold=g.state.gold;
  assert.equal(g.dispatch({type:'choose',id:'pay'}),false);run(g,'change');assert.equal(g.state.gold,gold+165);
});
test('q094 old saved guard fight retains its original victory continuation',()=>{
  const old=ready(q,{old:true});depart(old,'free');const g=migrated(old);checkpoint(g);
  assert.equal(g.state.battle.encounter,'guard_10');fight(g);drain(g);assert.equal(g.state.quests[q].outcome,'contract');
});
