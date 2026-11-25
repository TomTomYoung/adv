import test from 'node:test';
import assert from 'node:assert/strict';
import {projectGame} from '../src/application/projection.js';
import {objectVisible} from '../src/core/quest-events.js';
import {nextQuestPlace} from '../src/core/quest-navigation.js';
import {arrive,checkpoint,choose,depart,go,resume} from './world-route-helpers.mjs';
import {drain,fight,goWorldLocation} from './helpers.mjs';
import {catalog,data,previous,ready,migrated,routes,states,expectedValues,step} from './q111-world-helpers.mjs';

const q='q111',quest=data.quests[q],story=quest.story,graph=states();
function play(g,...ids){for(const id of ids)choose(g,q,id);}

test('q111 routes new acceptances to the depot and old acceptances to the original mine event',()=>{
  for(const [id,s] of Object.entries(previous.quests[q].scripts))assert.deepEqual(data.scripts[id],s);
  assert.deepEqual(Object.keys(quest.outcomes),catalog.quests.e2[q].expectedOutcomes);
  const g=ready(q,{start:'reception'}),old=migrated(ready(q,{old:true,start:'reception'}));
  assert.deepEqual(nextQuestPlace(data,g.state,q),story.worldPlaces.depot);
  const oldSite=nextQuestPlace(data,old.state,q);assert.deepEqual([oldSite.map,oldSite.x,oldSite.y],['region_2_f1',2,1]);
  const map=data.maps[oldSite.map],object=map.objects.find(o=>o.id==='q111_scene');
  assert.ok(objectVisible(old.state,map,object));assert.equal(objectVisible(g.state,map,object),false);
  for(const place of Object.values(story.worldPlaces)){
    assert.equal(data.locations[place.location].parent,'e2_wagon_pass');
    goWorldLocation(g,place.location);checkpoint(g);
  }
  assert.equal(data.locations.e2_wagon_pass.parent,'e2_cart_surface');
});

for(const r of routes[q])test('q111 '+(r.escape?'escape ':'')+r.path.join('/')+' retains the old reward and the correct cargo',()=>{
  const g=ready(q),old=ready(q,{old:true});delete g.random;delete old.random;
  // Compare the quest settlement separately from loot rolled at the roadside or in the old mine.
  for(const [engine,path] of [[g,r.path],[old,r.old]]){
    for(const id of path.slice(0,-1)){step(engine,id,r);checkpoint(engine);}
    const before={gold:engine.state.gold,xp:engine.state.actors.ada.xp,inventory:structuredClone(engine.state.inventory)};
    step(engine,path.at(-1),r);checkpoint(engine);
    assert.equal(engine.state.quests[q].outcome,r.outcome);
    assert.equal(engine.state.gold-before.gold,69);assert.equal(engine.state.actors.ada.xp-before.xp,57);
    assert.deepEqual(engine.state.inventory,before.inventory);
  }
  for(const [key,value] of Object.entries(expectedValues(q,r)))assert.equal(g.state.stories[q].values[key],value,key);
  assert.throws(()=>g.complete(q,r.outcome));
});

test('q111 local speakers, the cart and the rubbing keep their locations when a conversation is restored',()=>{
  assert.deepEqual(new Set(graph.current.map(r=>r.scene)),new Set(Object.keys(story.scenes)));
  const g=ready(q);
  for(const row of graph.current){
    g.load(row.save);const state=structuredClone(g.state.stories[q]),place=story.scenes[row.scene].place;
    const cast=Object.entries(story.entities).filter(([who,e])=>e.kind==='person'&&state.values[who+'At']===place).map(([,e])=>e.character).sort();
    const dialog=()=>projectGame(g).dialog;assert.deepEqual(dialog().scene.cast.map(c=>c.id).sort(),cast);
    const before=dialog().text;
    g.defeat();drain(g);checkpoint(g);go(g,q,place);resume(g,q);
    assert.deepEqual(g.state.stories[q],state);assert.equal(dialog().text,before);assert.deepEqual(dialog().scene.cast.map(c=>c.id).sort(),cast);
  }
});

const trips=new Map();
for(const row of graph.current){
  const g=ready(q);g.load(row.save);
  for(const option of projectGame(g).dialog.options){
    const id=row.scene+'_'+option.id;
    if(option.enabled&&story.actions[id]?.journey&&!trips.has(id))trips.set(id,{row,choice:option.id});
  }
}
assert.equal(trips.size,Object.values(story.actions).filter(a=>a.journey).length);
for(const [action,{row,choice}] of trips)for(const interruption of ['retreat','defeat']){
  test('q111 '+action+' preserves its passengers and cargo on '+interruption,()=>{
    const g=ready(q);g.load(row.save);depart(g,choice);
    const pending=structuredClone(g.state.journey),saved=structuredClone(g.state.stories[q]),trip=story.actions[action].journey;
    for(const id of ['party',...trip.companions])assert.equal(saved.values[id+'At'],'transit');
    goWorldLocation(g,'hikarigaeri_square');assert.ok(g.dispatch({type:'travel',dungeon:'region_2'}));
    assert.equal(g.dispatch({type:'story.resume',quest:q}),false);
    if(interruption==='retreat')assert.ok(g.dispatch({type:'retreat'}));else g.defeat();
    drain(g);checkpoint(g);assert.deepEqual(g.state.journey,pending);assert.deepEqual(g.state.stories[q],saved);
    arrive(g,q);checkpoint(g);assert.equal(g.state.stories[q].scene,story.actions[action].to);
    assert.deepEqual(g.state.stories[q].values,{...saved.values,partyAt:trip.to,...Object.fromEntries(trip.companions.map(w=>[w+'At',trip.to]))});
  });
}

for(const old of [false,true])for(const result of ['win','escape','lose']){
  test('q111 '+(old?'migrated':'current')+' active battle resumes after save and '+result,()=>{
    let g=ready(q,{old});delete g.random;
    if(old)depart(g,'flag');else{play(g,'flag');depart(g,'fight');}
    assert.equal(g.state.battle.encounter,'guard_2');
    if(old)g=migrated(g);
    checkpoint(g);assert.equal(g.state.battle.encounter,'guard_2');
    if(result==='win')fight(g);
    else if(result==='escape'){g.random=()=>0;assert.ok(g.dispatch({type:'battle',action:'escape'}));}
    else g.finishBattle('lose');
    drain(g);checkpoint(g);
    if(result==='lose'){
      if(old){const p=nextQuestPlace(data,g.state,q);g.teleport(p.map,p.x,p.y);g.run('q111.visit');drain(g);depart(g,'flag');}
      else{go(g,q,'road');resume(g,q);assert.equal(g.state.stories[q].values.cleared,false);depart(g,'fight');}
      assert.equal(g.state.battle.encounter,'guard_2');fight(g);drain(g);
    }
    if(old)play(g,'home');
    else{
      if(result==='escape'){assert.equal(g.state.journey.action,'ambush_detour');assert.equal(g.state.stories[q].values.flag,'covered');arrive(g,q);}
      else play(g,'advance');
      play(g,'home','store');
    }
    assert.equal(g.state.quests[q].outcome,'home');checkpoint(g);
  });
}

test('q111 waits for the artisan and can decline to disclose Gus’s name after he consents',()=>{
  const g=ready(q);play(g,'ferry','cross','smith','leave');
  const v=()=>g.state.stories[q].values;
  assert.equal(v().rubbingAt,'smith');assert.equal(v().toolsAt,'wagon');assert.equal(v().marks,false);
  assert.equal(g.dispatch({type:'choose',id:'anonymous'}),false);g.defeat();drain(g);checkpoint(g);go(g,q,'gate');resume(g,q);
  play(g,'collect','bring','confirm','hear','name');assert.equal(v().consent,true);
  play(g,'anonymous','unload','finish');assert.equal(v().form,'anonymous');assert.equal(v().repairDate,false);
});

test('q111 old acceptance and a current q110 parade survive in the same save',()=>{
  const old=ready(q,{old:true,start:'reception'});
  goWorldLocation(old,'hikarigaeri_guild');assert.ok(old.dispatch({type:'accept',id:'q110'}));drain(old);
  go(old,'q110','fitting');resume(old,'q110');choose(old,'q110','fit');depart(old,'guard');
  const g=migrated(old);checkpoint(g);assert.deepEqual(g.state.journey,old.state.journey);
  arrive(g,'q110');choose(g,'q110','walk');choose(g,'q110','finish');
  const p=nextQuestPlace(data,g.state,q);g.teleport(p.map,p.x,p.y);g.run('q111.visit');drain(g);play(g,'ferry','cross','anonymous');
  assert.equal(g.state.quests.q110.outcome,'legend');assert.equal(g.state.quests[q].outcome,'anonymous');
  const settled=[g.state.gold,g.state.actors.ada.xp];g.run('q111.visit');drain(g);checkpoint(g);assert.deepEqual([g.state.gold,g.state.actors.ada.xp],settled);
});
