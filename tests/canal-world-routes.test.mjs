import test from 'node:test';
import assert from 'node:assert/strict';
import {projectGame} from '../src/application/projection.js';
import {objectVisible} from '../src/core/quest-events.js';
import {nextQuestPlace} from '../src/core/quest-navigation.js';
import {drain,goWorldLocation} from './helpers.mjs';
import {arrive,checkpoint,choose,depart,go,resume} from './world-route-helpers.mjs';
import {data,previous,ready,migrated,routes,states,expectedValues,legacyProgress} from './canal-world-helpers.mjs';

for(const [q,paths] of Object.entries(routes)){
  const quest=data.quests[q],story=quest.story,graph=states(q);
  test(q+' preserves the original entry, scripts, results and active saves',()=>{
    for(const [id,script] of Object.entries(previous.quests[q].scripts))assert.deepEqual(data.scripts[id],script);
    const originalEndings=Object.keys(previous.quests[q].outcomes);
    assert.deepEqual(Object.keys(quest.outcomes),q==='q108'?[...originalEndings,'decline']:originalEndings);
    const old=migrated(ready(q,{old:true,start:'reception'})),fresh=ready(q,{start:'reception'});
    assert.equal(nextQuestPlace(data,old.state,q).map,previous.quests[q].locations[0].map);
    assert.deepEqual(nextQuestPlace(data,fresh.state,q),story.worldPlaces[story.scenes.entry.place]);
    for(const e of previous.quests[q].events){
      const {map}=e.points[0],original=previous.maps[map].objects.find(o=>o.id===e.id),current=data.maps[map].objects.find(o=>o.id===e.id);
      assert.deepEqual({...current,visibleWhen:original.visibleWhen},original);
      assert.ok(objectVisible(old.state,data.maps[map],current));assert.equal(objectVisible(fresh.state,data.maps[map],current),false);
    }
    for(const p of Object.values(story.worldPlaces))assert.equal(data.locations[data.locations[p.location].parent].parent,'e2_canal_quarter');
  });
  for(const r of paths.filter(r=>r.old.length))test(q+' '+r.path.join('/')+' retains the manuscript ending and payment',()=>{
    const g=ready(q),old=ready(q,{old:true});
    for(const id of r.path){choose(g,q,id);checkpoint(g);}
    for(const id of r.old){
      const restored=migrated(old);choose(old,q,id);choose(restored,q,id);checkpoint(restored);
      assert.deepEqual(legacyProgress(restored,q),legacyProgress(old,q));
      assert.deepEqual(restored.state.quests[q],old.state.quests[q]);assert.deepEqual(restored.state.inventory,old.state.inventory);assert.equal(restored.state.gold,old.state.gold);
    }
    assert.equal(g.state.quests[q].outcome,r.outcome);assert.equal(old.state.quests[q].outcome,r.outcome);
    assert.equal(g.state.gold,old.state.gold);assert.deepEqual(g.state.inventory,old.state.inventory);assert.equal(g.state.actors.ada.xp,old.state.actors.ada.xp);
    for(const [k,v] of Object.entries(expectedValues(q,r)))assert.equal(g.state.stories[q].values[k],v,k);
    const raw=g.save();assert.throws(()=>g.complete(q,r.outcome));assert.equal(g.save(),raw);
  });
  test(q+' restores each conversation at the correct facility with its local speakers',()=>{
    assert.deepEqual(new Set(graph.current.map(row=>row.scene)),new Set(Object.keys(story.scenes)));
    for(const row of graph.current){
      const g=ready(q);g.load(row.save);const s=structuredClone(g.state.stories[q]),place=story.scenes[row.scene].place;
      const cast=()=>projectGame(g).dialog.scene.cast.map(c=>c.id).sort();
      const expected=Object.entries(story.entities).filter(([k,e])=>e.kind==='person'&&s.values[k+'At']===place).map(([,e])=>e.character).sort();
      assert.deepEqual(cast(),expected,row.scene);const before=projectGame(g).dialog.text;
      g.defeat();drain(g);checkpoint(g);go(g,q,place);resume(g,q);assert.deepEqual(g.state.stories[q],s);assert.equal(projectGame(g).dialog.text,before);assert.deepEqual(cast(),expected);
    }
  });
  const trips=new Map();
  for(const row of graph.current){
    const g=ready(q);g.load(row.save);
    for(const {id,enabled} of projectGame(g).dialog.options){
      const key=row.scene+'_'+id;
      if(enabled&&story.actions[key]?.journey&&!trips.has(key))trips.set(key,{id,save:row.save});
    }
  }
  assert.equal(trips.size,Object.values(story.actions).filter(a=>a.journey).length);
  for(const [key,row] of trips)for(const interruption of ['retreat','defeat'])test(q+' '+key+' survives '+interruption+' away from the quarter',()=>{
    const g=ready(q);g.load(row.save);depart(g,row.id);const pending=structuredClone(g.state.journey),s=structuredClone(g.state.stories[q]),trip=story.actions[key].journey;
    assert.equal(s.values.partyAt,'transit');for(const who of trip.companions)assert.equal(s.values[who+'At'],'transit');
    goWorldLocation(g,g.data.game.world.townRoot);assert.ok(g.dispatch({type:'travel',dungeon:'region_1'}));
    assert.equal(g.dispatch({type:'story.resume',quest:q}),false);
    if(interruption==='retreat')assert.ok(g.dispatch({type:'retreat'}));else g.defeat();
    drain(g);checkpoint(g);assert.deepEqual(g.state.journey,pending);assert.deepEqual(g.state.stories[q],s);
    arrive(g,q);checkpoint(g);assert.equal(g.state.stories[q].scene,story.actions[key].to);
    assert.deepEqual(g.state.stories[q].values,{...s.values,partyAt:trip.to,...Object.fromEntries(trip.companions.map(w=>[w+'At',trip.to]))});
  });
}
for(const [q,pre,choice,place] of [['q103',['source','join'],'food','kitchen'],['q104',['ask','find'],'buy','window']])for(const old of [false,true]){
  test(q+' '+(old?'old':'current')+' shortage resumes with exactly one payment',()=>{
    let g=ready(q,{old});for(const k of pre)choose(g,q,k);const food=q==='q103';
    if(food)delete g.state.inventory.ration;else g.state.gold=39;
    assert.equal(g.dispatch({type:'choose',id:choice}),false);depart(g,choice+'_supplies');
    if(old)g=migrated(g);checkpoint(g);assert.ok(g.state.flags.questResume[q]);
    g.defeat();drain(g);checkpoint(g);goWorldLocation(g,'hikarigaeri_shop');
    if(food)assert.ok(g.dispatch({type:'buy',item:'ration'}));else {goWorldLocation(g,'hikarigaeri_guild');assert.ok(g.dispatch({type:'accept',id:'q101'}));drain(g);go(g,'q101','counter');resume(g,'q101');
      for(const id of ['watch','quiet','finish'])choose(g,'q101',id);assert.ok(g.state.gold>=40);}
    if(old){
      const point=previous.quests[q].locations[0];const {map,x,y}=point;
      g.teleport(map,x,y);g.run(q+'.visit');drain(g);
    }else {go(g,q,place);resume(g,q);}
    const gold=g.state.gold;choose(g,q,choice);checkpoint(g);assert.equal(g.state.flags.questResume[q],null);
    if(old){assert.equal(g.state.quests[q].outcome,food?'joint':'buy');return;}
    if(food)assert.equal(g.state.inventory.ration??0,0);else assert.equal(g.state.gold,gold-40);
    const state=structuredClone(g.state.stories[q]);g.defeat();drain(g);go(g,q,place);resume(g,q);assert.deepEqual(g.state.stories[q],state);
    assert.equal(g.dispatch({type:'choose',id:choice}),false);
    for(const k of food?['roster','record']:['gift'])choose(g,q,k);assert.equal(g.state.quests[q].outcome,food?'joint':'buy');
  });
}
