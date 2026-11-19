import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {projectGame} from '../src/application/projection.js';
import {objectVisible} from '../src/core/quest-events.js';
import {data,previous,routes,values,checkpoint,ready,choose,depart,arrive,resume,migrated,enumerate,drain,fight} from './q024-helpers.mjs';

const graph=enumerate(),story=data.quests.q024.story;
test('q024 original, legacy events, floor geometry and current co-present cast',()=>{
  const raw=fs.readFileSync(new URL('../data/quests/q024.json',import.meta.url));
  assert.equal(createHash('sha1').update('blob '+raw.length+'\0').update(raw).digest('hex'),'7628a9d46cdeb829f70a244357171e46bd9f0b71');
  for(const [key,script] of Object.entries(previous.scripts))assert.deepEqual(data.scripts[key],script,key);
  for(const [key,p] of Object.entries(story.worldPlaces)){
    const map=data.maps[p.map];
    assert.equal(map.tiles[p.y][p.x],'.',key);
    if(key!=='bench'){
      const exits=[[0,-1],[1,0],[0,1],[-1,0]].filter(([dx,dy])=>map.tiles[p.y+dy]?.[p.x+dx]==='.');
      assert.equal(exits.length,3,key+' is a three-way junction');
    }
    const old=ready({old:true});
    for(const g of [ready(),migrated(old)]){
      const objects=map.objects.filter(o=>o.x===p.x&&o.y===p.y&&objectVisible(g.state,map,o));
      const oldMap=old.data.maps[p.map];
      const expected=g.state.flags.legacyStoryRoutes?.q024
        ?oldMap.objects.filter(o=>o.x===p.x&&o.y===p.y&&objectVisible(old.state,oldMap,o)).map(o=>o.id)
        :[p.event];
      assert.deepEqual(objects.map(o=>o.id),expected,key);
      assert.ok(map.objects.filter(o=>o.x===p.x&&o.y===p.y).every(o=>o.quest==='q024'),key);
    }
  }
  assert.deepEqual(new Set(graph.active.map(r=>r.scene)),new Set(Object.keys(story.scenes)));
  assert.deepEqual(new Set(graph.endings.flatMap(r=>JSON.parse(r.save).state.stories.q024.events)),new Set(Object.keys(story.actions)));
  for(const row of graph.active){
    const g=ready();g.load(row.save);checkpoint(g);
    const place=story.scenes[row.scene].place;
    assert.deepEqual(projectGame(g).dialog.scene?.cast.map(c=>c.id)??[],
      place==='bench'?['e2_edible_map_nom','e2_edible_map_beginner']:['e2_edible_map_beginner'],row.scene);
  }
});
for(const route of routes)test('q024 '+route.old.join('/')+' preserves holders, original reward and accepted saves',()=>{
  const g=ready(),old=ready({old:true});
  for(const id of route.path){choose(g,id);checkpoint(g);}
  const v=values(g),fixed=route.outcome==='contract',legend=route.outcome==='informed',copy=route.outcome==='compromise';
  assert.equal(v.walked,route.legs);assert.equal(v.copiedLegs,copy?route.legs:-1);
  assert.equal(v.firstNotch,route.legs>=1);assert.equal(v.secondNotch,route.legs===2);
  assert.deepEqual(g.state.stories.q024.knowledge.party??[],fixed?[]:['low','high','pollen'].slice(0,route.legs+1));
  assert.equal(v.leafType,fixed?'fixed':legend?'legend':'live');assert.equal(v.leafAt,'nom');
  assert.equal(v.insectAt,fixed?'bench':'leaf');assert.equal(v.oldCopyAt,'nom');assert.equal(v.dated,legend);
  assert.equal(v.returnMapAt,copy?'beginner':'party');assert.equal(v.returned,!fixed);
  assert.equal(v.nomAt,'bench');assert.equal(v.beginnerAt,'bench');assert.equal(g.state.records.battles,0);
  let restored=migrated(old);
  for(const id of route.old){
    assert.equal(restored.state.flags.legacyStoryRoutes.q024,true);
    choose(old,id);choose(restored,id);checkpoint(restored);
    assert.deepEqual(restored.state.flags.flow.q024,old.state.flags.flow.q024);
    restored=migrated(old);
  }
  for(const engine of [g,restored]){
    assert.equal(engine.state.gold,old.state.gold);assert.equal(engine.state.actors.ada.xp,old.state.actors.ada.xp);
    assert.equal(engine.state.quests.q024.outcome,route.outcome);
  }
  const saved=g.save();assert.throws(()=>g.complete('q024',route.outcome));assert.equal(g.save(),saved);
});
test('q024 a leg, its signpost and the observation at the next fork commit separately',()=>{
  const g=ready(),v=()=>values(g),known=()=>g.state.stories.q024.knowledge.party??[];
  depart(g,'walk');assert.equal(v().leafAt,'party');assert.equal(v().beginnerAt,'transit');
  assert.equal(v().nomAt,'bench');assert.deepEqual(known(),[]);checkpoint(g);
  arrive(g);assert.deepEqual(known(),[]);choose(g,'read');assert.deepEqual(known(),['low']);
  for(const [leg,mark,reading] of [[1,'firstNotch','high'],[2,'secondNotch','pollen']]){
    const prior=structuredClone(known());depart(g,'safe');
    assert.equal(v().walked,leg-1);checkpoint(g);arrive(g);
    assert.equal(v().walked,leg);assert.equal(v()[mark],false);assert.deepEqual(known(),prior);
    choose(g,'mark');assert.equal(v()[mark],true);assert.deepEqual(known(),prior);checkpoint(g);
    choose(g,'read');assert.deepEqual(known(),[...prior,reading]);checkpoint(g);
  }
  choose(g,'legend','back','back');assert.equal(v().returned,false);assert.equal(v().leafAt,'party');
  depart(g,'back');assert.equal(v().returned,false);arrive(g);assert.equal(v().returned,true);
  choose(g,'give_leaf');assert.equal(v().leafAt,'nom');assert.equal(v().dated,false);checkpoint(g);
  choose(g,'date');assert.equal(v().dated,true);
});
test('q024 reading the legend early or skipping a return leg leaves the saved game intact',()=>{
  const g=ready();
  function blocked(id){const saved=g.save();assert.equal(g.dispatch({type:'choose',id}),false);assert.equal(g.save(),saved);}
  choose(g,'walk','read');blocked('legend');
  choose(g,'safe','mark','read');blocked('legend');
  choose(g,'safe','mark','read','return');blocked('hand');blocked('legend');
  choose(g,'back');assert.equal(values(g).beginnerAt,'second');blocked('hand');
  choose(g,'back');assert.equal(values(g).beginnerAt,'first');blocked('hand');
  choose(g,'back');blocked('give_leaf');assert.equal(values(g).copiedLegs,2);
  assert.equal(values(g).returnMapAt,'party');choose(g,'hand');assert.equal(values(g).returnMapAt,'beginner');
});
test('q024 removing the insect, treating the leaf and returning the fixed map are separate',()=>{
  const g=ready();choose(g,'fix');checkpoint(g);
  assert.equal(values(g).insectAt,'bench');assert.equal(values(g).leafAt,'party');
  assert.equal(values(g).leafType,'live');assert.equal(values(g).beginnerAt,'bench');
  choose(g,'coat');checkpoint(g);assert.equal(values(g).leafType,'fixed');assert.equal(values(g).leafAt,'party');
  choose(g,'hand');assert.equal(values(g).leafAt,'nom');assert.equal(values(g).walked,0);
});
const journeys=new Map();
for(const row of graph.active){
  const g=ready();g.load(row.save);
  for(const choice of projectGame(g).dialog.options.filter(o=>o.enabled)){
    const key=row.scene+'_'+choice.id;
    if(story.actions[key]?.journey&&!journeys.has(key))journeys.set(key,{row,id:choice.id});
  }
}
assert.equal(journeys.size,6);
for(const [key,{row,id}] of journeys)for(const kind of ['retreat','defeat']){
  test('q024 '+key+' resumes after '+kind+' without losing or delivering carried work early',()=>{
    const g=ready();g.load(row.save);depart(g,id);
    const before=structuredClone(g.state.stories.q024),pending=structuredClone(g.state.journey);
    assert.equal(g.dispatch({type:'story.resume',quest:'q024'}),false);
    if(kind==='retreat')assert.ok(g.dispatch({type:'retreat'}));else g.defeat();
    drain(g);checkpoint(g);assert.deepEqual(g.state.stories.q024,before);assert.deepEqual(g.state.journey,pending);
    arrive(g);checkpoint(g);assert.equal(g.state.stories.q024.scene,story.actions[key].to);
  });
}
test('q024 rescue and return retain every distinct on-site work state',()=>{
  for(const row of graph.active){
    const g=ready();g.load(row.save);const before=structuredClone(g.state.stories.q024);
    g.defeat();drain(g);checkpoint(g);resume(g);assert.deepEqual(g.state.stories.q024,before,row.scene);
  }
});
for(const entry of ['decision','review'])for(const outcome of ['informed','contract','compromise']){
  test('q024 older '+entry+' preserves '+outcome+' clue gates, fight and supplies',()=>{
    const old=ready({old:true,visit:false});
    if(outcome==='informed')for(const clue of ['clue_a','clue_b'])old.evidence('q024',clue,clue);
    old.run('q024.'+entry);drain(old);
    const g=migrated(old);checkpoint(g);
    for(const e of [old,g]){
      const ropes=e.state.inventory.rope??0;
      if(outcome!=='informed')assert.equal(e.dispatch({type:'choose',id:'informed'}),false);
      depart(e,outcome);
      if(outcome==='contract'){assert.equal(e.state.battle.encounter,'guard_3');fight(e);drain(e);}
      assert.equal(e.state.records.battles,Number(outcome==='contract'));
      assert.equal(e.state.inventory.rope??0,ropes);assert.equal(e.state.quests.q024.outcome,outcome);
    }
    assert.equal(g.state.gold,old.state.gold);assert.equal(g.state.actors.ada.xp,old.state.actors.ada.xp);checkpoint(g);
  });
}
