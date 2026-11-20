import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {projectGame} from '../src/application/projection.js';
import {exploreSpot,inspect} from './helpers.mjs';
import {objectVisible} from '../src/core/quest-events.js';
import {data,previous,routes,values,checkpoint,ready,choose,depart,arrive,resume,migrated,enumerate,drain,fight} from './q051-helpers.mjs';

const graph=enumerate(),story=data.quests.q051.story;
test('q051 original, legacy events, floor geometry and current co-present cast',()=>{
  const raw=fs.readFileSync(new URL('../data/quests/q051.json',import.meta.url));
  assert.equal(createHash('sha1').update('blob '+raw.length+'\0').update(raw).digest('hex'),'1169dbd9f07708b40b6b1697dbeeea26b9c6cb10');
  for(const [key,script] of Object.entries(previous.scripts))assert.deepEqual(data.scripts[key],script,key);
  for(const [key,p] of Object.entries(story.worldPlaces)){
    const map=data.maps[p.map];
    assert.equal(map.tiles[p.y][p.x],'.',key);
    const old=ready({old:true});
    for(const g of [ready(),migrated(old)]){
      const objects=map.objects.filter(o=>o.x===p.x&&o.y===p.y&&objectVisible(g.state,map,o));
      const oldMap=old.data.maps[p.map];
      const expected=g.state.flags.legacyStoryRoutes?.q051
        ?oldMap.objects.filter(o=>o.x===p.x&&o.y===p.y&&objectVisible(old.state,oldMap,o)).map(o=>o.id)
        :[p.event];
      assert.deepEqual(objects.map(o=>o.id),expected,key);
      assert.ok(map.objects.filter(o=>o.x===p.x&&o.y===p.y).every(o=>o.quest==='q051'),key);
    }
  }
  assert.deepEqual(new Set(graph.active.map(r=>r.scene)),new Set(Object.keys(story.scenes)));
  assert.deepEqual(new Set(graph.endings.flatMap(r=>JSON.parse(r.save).state.stories.q051.events)),new Set(Object.keys(story.actions)));
  for(const row of graph.active){
    const g=ready();g.load(row.save);checkpoint(g);
    const place=story.scenes[row.scene].place;
    const expected=Object.entries(story.entities).filter(([id,e])=>e.character&&values(g)[id+'At']===place).map(([,e])=>e.character);
    assert.deepEqual(projectGame(g).dialog.scene?.cast.map(c=>c.id)??[],expected,row.scene);
    assert.equal(values(g).konoAt,'shop');assert.equal(values(g).cookAt,'hall');assert.equal(values(g).customerAt,'bench');
  }
});
for(const route of routes)test('q051 '+route.old.join('/')+' preserves cash custody, meal redemption, rewards and original saves',()=>{
  const g=ready(),old=ready({old:true});
  for(const id of route.path){choose(g,id);checkpoint(g);}
  const v=values(g),closed=route.old.includes('wait'),refund=route.old.includes('refund');
  assert.equal(v.closed,closed);assert.equal(v.regular,closed?'served':'prepaid');
  assert.equal(v.changeAt,route.old.includes('seat')?'cook':'customer');
  assert.equal(v.customerInformed,refund);assert.equal(v.deskOpen,route.outcome==='compromise');
  assert.equal(v.ticketAt,v.deskOpen?'hall':'cook');assert.equal(v.optIn,route.outcome==='informed');
  assert.equal(v.signAt,v.optIn?'shop':'kono');assert.equal(v.sellerAt,!closed||v.optIn?'shop':'hall');
  assert.deepEqual(g.state.stories.q051.knowledge.party??[],closed?['matchingNumbers']:[]);
  assert.equal(g.state.records.battles,0);
  let restored=migrated(old);
  for(const id of route.old){
    assert.equal(restored.state.flags.legacyStoryRoutes.q051,true);
    choose(old,id);choose(restored,id);checkpoint(restored);
    assert.deepEqual(restored.state.flags.flow.q051,old.state.flags.flow.q051);
    restored=migrated(old);
  }
  for(const engine of [g,restored]){
    assert.equal(engine.state.gold,old.state.gold);assert.equal(engine.state.actors.ada.xp,old.state.actors.ada.xp);
    assert.equal(engine.state.quests.q051.outcome,route.outcome);
  }
  const saved=g.save();assert.throws(()=>g.complete('q051',route.outcome));assert.equal(g.save(),saved);
});
const journeys=new Map();
for(const row of graph.active){
  const g=ready();g.load(row.save);
  for(const choice of projectGame(g).dialog.options.filter(o=>o.enabled)){
    const key=row.scene+'_'+choice.id;
    if(story.actions[key]?.journey&&!journeys.has(key))journeys.set(key,{row,id:choice.id});
  }
}
assert.equal(journeys.size,5);
for(const [key,{row,id}] of journeys)for(const kind of ['retreat','defeat']){
  test('q051 '+key+' resumes after '+kind+' without losing or delivering carried work early',()=>{
    const g=ready();g.load(row.save);depart(g,id);
    const before=structuredClone(g.state.stories.q051),pending=structuredClone(g.state.journey);
    assert.equal(g.dispatch({type:'story.resume',quest:'q051'}),false);
    if(kind==='retreat')assert.ok(g.dispatch({type:'retreat'}));else g.defeat();
    drain(g);checkpoint(g);assert.deepEqual(g.state.stories.q051,before);assert.deepEqual(g.state.journey,pending);
    arrive(g);checkpoint(g);assert.equal(g.state.stories.q051.scene,story.actions[key].to);
  });
}
test('q051 rescue and return retain every distinct on-site work state',()=>{
  for(const row of graph.active){
    const g=ready();g.load(row.save);const before=structuredClone(g.state.stories.q051);
    g.defeat();drain(g);checkpoint(g);resume(g);assert.deepEqual(g.state.stories.q051,before,row.scene);
  }
});
for(const entry of ['decision','review'])for(const outcome of ['informed','contract','compromise']){
  test('q051 older '+entry+' preserves '+outcome+' clue gates, fight and supplies',()=>{
    const old=ready({old:true,visit:false});
    if(outcome==='informed')for(const clue of ['clue_a','clue_b'])old.evidence('q051',clue,clue);
    old.run('q051.'+entry);drain(old);
    const g=migrated(old);checkpoint(g);
    for(const e of [old,g]){
      const ropes=e.state.inventory.rope??0;
      if(outcome!=='informed')assert.equal(e.dispatch({type:'choose',id:'informed'}),false);
      depart(e,outcome);
      if(outcome==='contract'){assert.equal(e.state.battle.encounter,'guard_6');fight(e);drain(e);}
      assert.equal(e.state.records.battles,Number(outcome==='contract'));
      assert.equal(e.state.inventory.rope??0,ropes);assert.equal(e.state.quests.q051.outcome,outcome);
    }
    assert.equal(g.state.gold,old.state.gold);assert.equal(g.state.actors.ada.xp,old.state.actors.ada.xp);checkpoint(g);
  });
}


test('q051 rescue after refund keeps the packet with the customer and permits both policies',()=>{
  const g=ready(),initial=g.state.gold;
  choose(g,'wait','follow','record','refund');depart(g,'deliver');
  assert.equal(values(g).changeAt,'party');g.defeat();drain(g);checkpoint(g);arrive(g);
  choose(g,'pay');assert.equal(values(g).changeAt,'customer');assert.equal(values(g).regular,'served');
  const received=g.save();assert.equal(g.dispatch({type:'choose',id:'pay'}),false);assert.equal(g.save(),received);
  g.defeat();drain(g);checkpoint(g);resume(g);choose(g,'report');const consent=g.save();
  for(const [action,end,finish] of [['optin','informed','hang'],['desk','compromise','place']]){
    g.load(consent);const before=g.state.gold;assert.equal(values(g).changeAt,'customer');
    assert.equal(g.dispatch({type:'choose',id:'refund'}),false);
    choose(g,action,finish);assert.equal(values(g).changeAt,'customer');assert.equal(values(g).regular,'served');
    assert.equal(g.state.gold,before+previous.outcomes[end].gold);
  }
  const fresh=ready();choose(fresh,'recover','collect');assert.equal(fresh.state.gold,initial);
});
test('q051 an unclaimed refund kept at the counter survives defeat without becoming a payment',()=>{
  const g=ready();choose(g,'wait','follow','record','seat');
  assert.equal(values(g).changeAt,'cook');assert.equal(values(g).ticketAt,'cook');assert.equal(values(g).deskOpen,false);
  g.defeat();drain(g);checkpoint(g);resume(g);choose(g,'place');assert.equal(values(g).changeAt,'cook');
  assert.equal(values(g).customerInformed,false);assert.equal(values(g).ticketAt,'hall');
});
test('q051 old consent reopens after rescue and settles at the original counter',()=>{
  const old=ready({old:true});choose(old,'wait','refund');const g=migrated(old);
  g.defeat();drain(g);checkpoint(g);
  const point=previous.events.find(e=>e.id==='q051_decision').points[0];
  exploreSpot(g,point,{maintain:true,interact:false});if(!g.state.waiting)inspect(g,'q051_decision');drain(g);
  assert.equal(g.state.flags.flow.q051.node,'consent');choose(g,'desk');
  assert.equal(g.state.quests.q051.outcome,'compromise');checkpoint(g);
});
test('q051 saved older cashbox guard battle retains its victory continuation',()=>{
  const old=ready({old:true,visit:false});old.run('q051.decision');drain(old);depart(old,'contract');
  const g=migrated(old);checkpoint(g);assert.equal(g.state.battle.encounter,'guard_6');
  fight(g);drain(g);assert.equal(g.state.quests.q051.outcome,'contract');assert.equal(g.state.records.wins,1);checkpoint(g);
});
