import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {projectGame} from '../src/application/projection.js';
import {exploreSpot,inspect} from './helpers.mjs';
import {objectVisible} from '../src/core/quest-events.js';
import {data,previous,routes,values,checkpoint,ready,choose,depart,arrive,resume,migrated,enumerate,drain,fight} from './q029-helpers.mjs';

const graph=enumerate(),story=data.quests.q029.story;
test('q029 original, legacy events, floor geometry and current co-present cast',()=>{
  const raw=fs.readFileSync(new URL('../data/quests/q029.json',import.meta.url));
  assert.equal(createHash('sha1').update('blob '+raw.length+'\0').update(raw).digest('hex'),'f0d6a3e935e5a0b3ecac5ff566c7f2c319873870');
  for(const [key,script] of Object.entries(previous.scripts))assert.deepEqual(data.scripts[key],script,key);
  for(const [key,p] of Object.entries(story.worldPlaces)){
    const map=data.maps[p.map];
    assert.equal(map.tiles[p.y][p.x],'.',key);
    const old=ready({old:true});
    for(const g of [ready(),migrated(old)]){
      const objects=map.objects.filter(o=>o.x===p.x&&o.y===p.y&&objectVisible(g.state,map,o));
      const oldMap=old.data.maps[p.map];
      const expected=g.state.flags.legacyStoryRoutes?.q029
        ?oldMap.objects.filter(o=>o.x===p.x&&o.y===p.y&&objectVisible(old.state,oldMap,o)).map(o=>o.id)
        :[p.event];
      assert.deepEqual(objects.map(o=>o.id),expected,key);
      assert.ok(map.objects.filter(o=>o.x===p.x&&o.y===p.y).every(o=>o.quest==='q029'),key);
    }
  }
  assert.deepEqual(new Set(graph.active.map(r=>r.scene)),new Set(Object.keys(story.scenes)));
  assert.deepEqual(new Set(graph.endings.flatMap(r=>JSON.parse(r.save).state.stories.q029.events)),new Set(Object.keys(story.actions)));
  for(const row of graph.active){
    const g=ready();g.load(row.save);checkpoint(g);
    const place=story.scenes[row.scene].place;
    const expected=Object.entries(story.entities).filter(([id,e])=>e.character&&values(g)[id+'At']===place).map(([,e])=>e.character);
    assert.deepEqual(projectGame(g).dialog.scene?.cast.map(c=>c.id)??[],expected,row.scene);
    assert.equal(values(g).minaAt,'hive');assert.equal(values(g).keeperAt,'apiary');assert.equal(values(g).recipientAt,'depot');
  }
});
for(const route of routes)test('q029 '+route.old.join('/')+' preserves quantities, gains, price and original saves',()=>{
  const g=ready(),old=ready({old:true});
  for(const id of route.path){choose(g,id);checkpoint(g);}
  const v=values(g),red=route.outcome==='contract',mixed=route.outcome==='compromise',revised=route.outcome==='informed';
  assert.equal(v.guardsDefeated,red);assert.equal(v.paid,mixed);assert.equal(v.revised,revised);
  assert.equal(v.calendarStarted,revised);assert.equal(v.returned,route.old.includes('return'));
  assert.equal(v.shareAt,revised?'hive':'recipient');assert.equal(v.reserveAt,red?'recipient':'hive');
  assert.equal(v.alternativeAt,mixed?'recipient':'keeper');assert.equal(v.delivery,red?'red':mixed?'mixed':'none');
  assert.equal(v.buyerAt,revised?'depot':'office');assert.equal(g.state.records.battles,Number(red));
  assert.deepEqual(g.state.stories.q029.knowledge.party??[],route.old.includes('season')||route.old.includes('return')?['flowerDate','buyerError']:[]);
  let restored=migrated(old);
  for(const id of route.old){
    assert.equal(restored.state.flags.legacyStoryRoutes.q029,true);
    choose(old,id);choose(restored,id);checkpoint(restored);
    assert.deepEqual(restored.state.flags.flow.q029,old.state.flags.flow.q029);
    restored=migrated(old);
  }
  for(const engine of [g,restored]){
    assert.equal(engine.state.gold,old.state.gold);assert.equal(engine.state.actors.ada.xp,old.state.actors.ada.xp);
    assert.equal(engine.state.quests.q029.outcome,route.outcome);
  }
  const saved=g.save();assert.throws(()=>g.complete('q029',route.outcome));assert.equal(g.save(),saved);
});
const journeys=new Map();
for(const row of graph.active){
  const g=ready();g.load(row.save);
  for(const choice of projectGame(g).dialog.options.filter(o=>o.enabled)){
    const key=row.scene+'_'+choice.id;
    if(story.actions[key]?.journey&&!journeys.has(key))journeys.set(key,{row,id:choice.id});
  }
}
assert.equal(journeys.size,8);
for(const [key,{row,id}] of journeys)for(const kind of ['retreat','defeat']){
  test('q029 '+key+' resumes after '+kind+' without losing or delivering carried work early',()=>{
    const g=ready();g.load(row.save);depart(g,id);
    const before=structuredClone(g.state.stories.q029),pending=structuredClone(g.state.journey);
    assert.equal(g.dispatch({type:'story.resume',quest:'q029'}),false);
    if(kind==='retreat')assert.ok(g.dispatch({type:'retreat'}));else g.defeat();
    drain(g);checkpoint(g);assert.deepEqual(g.state.stories.q029,before);assert.deepEqual(g.state.journey,pending);
    arrive(g);checkpoint(g);assert.equal(g.state.stories.q029.scene,story.actions[key].to);
  });
}
test('q029 rescue and return retain every distinct on-site work state',()=>{
  for(const row of graph.active){
    const g=ready();g.load(row.save);const before=structuredClone(g.state.stories.q029);
    g.defeat();drain(g);checkpoint(g);resume(g);assert.deepEqual(g.state.stories.q029,before,row.scene);
  }
});
for(const entry of ['decision','review'])for(const outcome of ['informed','contract','compromise']){
  test('q029 older '+entry+' preserves '+outcome+' clue gates, fight and supplies',()=>{
    const old=ready({old:true,visit:false});
    if(outcome==='informed')for(const clue of ['clue_a','clue_b'])old.evidence('q029',clue,clue);
    old.run('q029.'+entry);drain(old);
    const g=migrated(old);checkpoint(g);
    for(const e of [old,g]){
      const ropes=e.state.inventory.rope??0;
      if(outcome!=='informed')assert.equal(e.dispatch({type:'choose',id:'informed'}),false);
      depart(e,outcome);
      if(outcome==='contract'){assert.equal(e.state.battle.encounter,'guard_3');fight(e);drain(e);}
      assert.equal(e.state.records.battles,Number(outcome==='contract'));
      assert.equal(e.state.inventory.rope??0,ropes);assert.equal(e.state.quests.q029.outcome,outcome);
    }
    assert.equal(g.state.gold,old.state.gold);assert.equal(g.state.actors.ada.xp,old.state.actors.ada.xp);checkpoint(g);
  });
}
test('q029 more than two returns keep one small share and the same untouched reserve',()=>{
  const g=ready(),gold=g.state.gold;
  choose(g,'small','draw','seller');
  for(let n=0;n<5;n++){
    depart(g,'return');assert.equal(values(g).shareAt,'party');arrive(g);
    choose(g,'restore');assert.equal(values(g).shareAt,'hive');assert.equal(values(g).reserveAt,'hive');checkpoint(g);
    choose(g,'season','read','buyer','compare','small','draw','seller');
    assert.equal(values(g).shareAt,'party');assert.equal(g.state.gold,gold);
  }
  choose(g,'buy');assert.equal(g.state.gold,gold-15);assert.equal(values(g).alternativeAt,'party');
  assert.equal(g.dispatch({type:'choose',id:'buy'}),false);choose(g,'deliver','hand','label');
  assert.equal(g.state.gold,gold-15+52);
});
test('q029 the shortage can be saved at 14G and the purchase commits exactly once at 15G',()=>{
  const g=ready();choose(g,'small','draw','seller');g.state.gold=14;
  assert.equal(g.dispatch({type:'choose',id:'buy'}),false);depart(g,'buy_supplies');checkpoint(g);
  assert.equal(g.state.flags.questResume.q029,'q029.redhoney.offer.buy.resume');
  assert.equal(values(g).alternativeAt,'keeper');assert.equal(values(g).shareAt,'party');assert.equal(g.state.gold,14);
  assert.ok(g.dispatch({type:'retreat'}));drain(g);g.state.gold=15;checkpoint(g);resume(g);
  assert.equal(g.state.flags.questResume.q029,null);choose(g,'buy');assert.equal(g.state.gold,0);
  depart(g,'deliver');g.defeat();drain(g);checkpoint(g);
  assert.equal(values(g).paid,true);assert.equal(values(g).delivery,'none');assert.equal(values(g).alternativeAt,'party');
  arrive(g);choose(g,'hand','label');assert.equal(g.state.gold,52);
});
for(const exit of ['escape','defeat'])test('q029 '+exit+' from the queen guards preserves the stores and the initial choice',()=>{
  const g=ready();depart(g,'take');assert.equal(g.state.battle.encounter,'guard_3');checkpoint(g);
  if(exit==='escape'){
    g.random=()=>0;assert.ok(g.dispatch({type:'battle',action:'escape'}));g.random=()=>0.999999;
  }else g.defeat();
  drain(g);checkpoint(g);assert.equal(values(g).guardsDefeated,false);assert.equal(values(g).shareAt,'hive');
  assert.equal(values(g).reserveAt,'hive');assert.equal(values(g).delivery,'none');resume(g);
  if(exit==='escape'){
    choose(g,'season','read','buyer','compare','explain','agree','hive','mark');assert.equal(g.state.quests.q029.outcome,'informed');
  }else{
    choose(g,'take');assert.equal(values(g).guardsDefeated,true);assert.equal(values(g).reserveAt,'hive');
    g.defeat();drain(g);checkpoint(g);resume(g);choose(g,'fill');assert.equal(values(g).reserveAt,'party');
    choose(g,'deliver','hand');assert.equal(values(g).reserveAt,'recipient');assert.equal(g.state.records.wins,1);
  }
});
test('q029 older saves keep the original shortage and charge the original purchase after recovery',()=>{
  const old=ready({old:true});choose(old,'small');old.state.gold=14;depart(old,'buy_supplies');
  const g=migrated(old);checkpoint(g);assert.equal(g.state.flags.questResume.q029,'q029.flow.substitute.buy.resume');
  g.state.gold=15;const point=previous.events.find(e=>e.id==='q029_decision').points[0];
  exploreSpot(g,point,{maintain:true,interact:false});if(!g.state.waiting)inspect(g,'q029_decision');drain(g);
  choose(g,'buy');assert.equal(g.state.gold,52);assert.equal(g.state.quests.q029.outcome,'compromise');
});
test('q029 an in-progress original guard battle can be loaded, lost and retried at the old hive',()=>{
  const old=ready({old:true});depart(old,'take');assert.equal(old.state.battle.encounter,'guard_3');
  const g=migrated(old);checkpoint(g);assert.equal(g.state.flags.legacyStoryRoutes.q029,true);
  g.defeat();drain(g);checkpoint(g);assert.equal(g.state.quests.q029.stage,'active');
  const point=previous.events.find(e=>e.id==='q029_decision').points[0];
  exploreSpot(g,point,{maintain:true,interact:false});if(!g.state.waiting)inspect(g,'q029_decision');drain(g);
  choose(g,'take');assert.equal(g.state.quests.q029.outcome,'contract');checkpoint(g);
});
