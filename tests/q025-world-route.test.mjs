import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {projectGame} from '../src/application/projection.js';
import {objectVisible} from '../src/core/quest-events.js';
import {data,previous,routes,values,checkpoint,ready,choose,depart,arrive,resume,migrated,enumerate,drain,fight} from './q025-helpers.mjs';

const graph=enumerate(),story=data.quests.q025.story;
test('q025 original, legacy events, floor geometry and current co-present cast',()=>{
  const raw=fs.readFileSync(new URL('../data/quests/q025.json',import.meta.url));
  assert.equal(createHash('sha1').update('blob '+raw.length+'\0').update(raw).digest('hex'),'e404c3656c554f166aeecf3e47b4407f55acc4fc');
  for(const [key,script] of Object.entries(previous.scripts))assert.deepEqual(data.scripts[key],script,key);
  for(const [key,p] of Object.entries(story.worldPlaces)){
    const map=data.maps[p.map];
    assert.equal(map.tiles[p.y][p.x],'.',key);
    const old=ready({old:true});
    for(const g of [ready(),migrated(old)]){
      const objects=map.objects.filter(o=>o.x===p.x&&o.y===p.y&&objectVisible(g.state,map,o));
      const oldMap=old.data.maps[p.map];
      const expected=g.state.flags.legacyStoryRoutes?.q025
        ?oldMap.objects.filter(o=>o.x===p.x&&o.y===p.y&&objectVisible(old.state,oldMap,o)).map(o=>o.id)
        :[p.event];
      assert.deepEqual(objects.map(o=>o.id),expected,key);
      assert.ok(map.objects.filter(o=>o.x===p.x&&o.y===p.y).every(o=>o.quest==='q025'),key);
    }
  }
  assert.deepEqual(new Set(graph.active.map(r=>r.scene)),new Set(Object.keys(story.scenes)));
  assert.deepEqual(new Set(graph.endings.flatMap(r=>JSON.parse(r.save).state.stories.q025.events)),new Set(Object.keys(story.actions)));
  for(const row of graph.active){
    const g=ready();g.load(row.save);checkpoint(g);
    const place=story.scenes[row.scene].place;
    const expected=Object.entries(story.entities).filter(([id,e])=>e.character&&values(g)[id+'At']===place).map(([,e])=>e.character);
    assert.deepEqual(projectGame(g).dialog.scene?.cast.map(c=>c.id)??[],expected,row.scene);
    assert.equal(values(g).singerAt,'square');assert.equal(values(g).pinoAt,'well');
  }
});
for(const route of routes)test('q025 '+route.old.join('/')+' preserves holders, original reward and accepted saves',()=>{
  const g=ready(),old=ready({old:true});
  for(const id of route.path){choose(g,id);checkpoint(g);}
  const v=values(g),forced=route.outcome==='contract',rain=route.outcome==='informed',manual=route.outcome==='compromise';
  const wrong=route.old.includes('first'),climbed=route.old.includes('climb');
  assert.equal(v.signalled,route.old.includes('sing'));assert.equal(v.onDuty,climbed);
  assert.equal(v.returnedToWell,wrong);
  assert.deepEqual(g.state.stories.q025.knowledge.party??[],v.signalled?['secondVerse',...(wrong?['returnCourse']:[])]:[]);
  assert.equal(v.lastOpening,forced?'forced':rain?'second':wrong?'first':'none');
  assert.equal(v.fieldWater,forced?'flood':rain?'rain':'pail');assert.equal(v.fieldChecked,true);
  assert.equal(v.bucketStart,route.start??'none');assert.equal(v.bucketLoad,manual?'poured':'empty');
  assert.equal(v.pailAt,manual?'field':'pino');assert.equal(v.rosterAt,'board');assert.equal(v.logAt,'platform');
  assert.equal(v.accepted,rain);assert.equal(v.trained,rain);assert.equal(v.inspectionSet,rain);
  assert.equal(v.volunteered,manual);assert.equal(v.drainNeeded,forced);assert.equal(v.growerAt,rain?'platform':'field');
  assert.equal(g.state.records.battles,0);
  let restored=migrated(old);
  for(const id of route.old){
    assert.equal(restored.state.flags.legacyStoryRoutes.q025,true);
    choose(old,id);choose(restored,id);checkpoint(restored);
    assert.deepEqual(restored.state.flags.flow.q025,old.state.flags.flow.q025);
    restored=migrated(old);
  }
  for(const engine of [g,restored]){
    assert.equal(engine.state.gold,old.state.gold);assert.equal(engine.state.actors.ada.xp,old.state.actors.ada.xp);
    assert.equal(engine.state.quests.q025.outcome,route.outcome);
  }
  const saved=g.save();assert.throws(()=>g.complete('q025',route.outcome));assert.equal(g.save(),saved);
});
test('q025 first-verse water returns only to the well; the second verse and training commit separately',()=>{
  const g=ready(),v=()=>values(g),known=()=>g.state.stories.q025.knowledge.party??[];
  choose(g,'sing','post');assert.equal(v().onDuty,false);assert.deepEqual(known(),[]);checkpoint(g);
  choose(g,'read');assert.deepEqual(known(),['secondVerse']);depart(g,'climb');assert.equal(v().onDuty,false);
  arrive(g);assert.equal(v().onDuty,true);choose(g,'first');checkpoint(g);
  assert.equal(v().returnedToWell,true);assert.equal(v().lastOpening,'first');assert.equal(v().fieldWater,'dry');
  choose(g,'check');assert.deepEqual(known(),['secondVerse']);choose(g,'trace');assert.ok(known().includes('returnCourse'));
  choose(g,'again');assert.equal(v().fieldWater,'dry');choose(g,'second');checkpoint(g);
  assert.equal(v().returnedToWell,true);assert.equal(v().fieldWater,'rain');assert.equal(v().fieldChecked,false);
  choose(g,'field');assert.equal(v().accepted,false);choose(g,'invite');assert.equal(v().growerAt,'field');
  depart(g,'guide');assert.equal(v().growerAt,'transit');assert.equal(v().trained,false);checkpoint(g);
  arrive(g);assert.equal(v().growerAt,'platform');choose(g,'teach');assert.equal(v().trained,true);
  assert.equal(v().inspectionSet,false);assert.equal(g.state.quests.q025.stage,'active');checkpoint(g);
  choose(g,'date');assert.equal(v().inspectionSet,true);
});
test('q025 a full pail held at the well or carried to the field does not water the soil early',()=>{
  const g=ready(),v=()=>values(g);
  depart(g,'buckets');assert.equal(v().bucketStart,'festival');assert.equal(v().pailAt,'pino');arrive(g);
  choose(g,'fill');assert.equal(v().bucketLoad,'full');assert.equal(v().pailAt,'pino');checkpoint(g);
  choose(g,'take');assert.equal(v().pailAt,'party');depart(g,'carry');assert.equal(v().fieldWater,'dry');
  g.defeat();drain(g);checkpoint(g);assert.equal(v().bucketLoad,'full');assert.equal(v().pailAt,'party');
  arrive(g);assert.equal(v().fieldWater,'dry');choose(g,'pour');assert.equal(v().fieldWater,'pail');
  assert.equal(v().pailAt,'field');assert.equal(v().volunteered,false);checkpoint(g);
  choose(g,'note');assert.equal(v().volunteered,true);assert.equal(v().trained,false);
});
test('q025 forced flooding and the documented need for drainage survive rescue as different events',()=>{
  const g=ready(),v=()=>values(g);choose(g,'force');assert.equal(v().lastOpening,'none');assert.equal(v().fieldWater,'dry');
  choose(g,'pry');assert.equal(v().fieldWater,'flood');assert.equal(v().drainNeeded,false);
  g.defeat();drain(g);checkpoint(g);resume(g);assert.equal(v().fieldWater,'flood');
  choose(g,'field');assert.equal(v().fieldChecked,false);choose(g,'mark');assert.equal(v().drainNeeded,true);
  assert.equal(v().trained,false);assert.equal(v().signalled,false);
});
const journeys=new Map();
for(const row of graph.active){
  const g=ready();g.load(row.save);
  for(const choice of projectGame(g).dialog.options.filter(o=>o.enabled)){
    const key=row.scene+'_'+choice.id;
    if(story.actions[key]?.journey&&!journeys.has(key))journeys.set(key,{row,id:choice.id});
  }
}
assert.equal(journeys.size,12);
for(const [key,{row,id}] of journeys)for(const kind of ['retreat','defeat']){
  test('q025 '+key+' resumes after '+kind+' without losing or delivering carried work early',()=>{
    const g=ready();g.load(row.save);depart(g,id);
    const before=structuredClone(g.state.stories.q025),pending=structuredClone(g.state.journey);
    assert.equal(g.dispatch({type:'story.resume',quest:'q025'}),false);
    if(kind==='retreat')assert.ok(g.dispatch({type:'retreat'}));else g.defeat();
    drain(g);checkpoint(g);assert.deepEqual(g.state.stories.q025,before);assert.deepEqual(g.state.journey,pending);
    arrive(g);checkpoint(g);assert.equal(g.state.stories.q025.scene,story.actions[key].to);
  });
}
test('q025 rescue and return retain every distinct on-site work state',()=>{
  for(const row of graph.active){
    const g=ready();g.load(row.save);const before=structuredClone(g.state.stories.q025);
    g.defeat();drain(g);checkpoint(g);resume(g);assert.deepEqual(g.state.stories.q025,before,row.scene);
  }
});
for(const entry of ['decision','review'])for(const outcome of ['informed','contract','compromise']){
  test('q025 older '+entry+' preserves '+outcome+' clue gates, fight and supplies',()=>{
    const old=ready({old:true,visit:false});
    if(outcome==='informed')for(const clue of ['clue_a','clue_b'])old.evidence('q025',clue,clue);
    old.run('q025.'+entry);drain(old);
    const g=migrated(old);checkpoint(g);
    for(const e of [old,g]){
      const ropes=e.state.inventory.rope??0;
      if(outcome!=='informed')assert.equal(e.dispatch({type:'choose',id:'informed'}),false);
      depart(e,outcome);
      if(outcome==='contract'){assert.equal(e.state.battle.encounter,'guard_3');fight(e);drain(e);}
      assert.equal(e.state.records.battles,Number(outcome==='contract'));
      assert.equal(e.state.inventory.rope??0,ropes);assert.equal(e.state.quests.q025.outcome,outcome);
    }
    assert.equal(g.state.gold,old.state.gold);assert.equal(g.state.actors.ada.xp,old.state.actors.ada.xp);checkpoint(g);
  });
}
