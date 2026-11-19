import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {projectGame} from '../src/application/projection.js';
import {objectVisible} from '../src/core/quest-events.js';
import {data,previous,routes,values,checkpoint,ready,choose,depart,arrive,resume,migrated,enumerate,drain,fight} from './q026-helpers.mjs';

const graph=enumerate(),story=data.quests.q026.story;
test('q026 original, legacy events, floor geometry and current co-present cast',()=>{
  const raw=fs.readFileSync(new URL('../data/quests/q026.json',import.meta.url));
  assert.equal(createHash('sha1').update('blob '+raw.length+'\0').update(raw).digest('hex'),'d57cbea352f6a8f8181bf5b411f56dedec243272');
  for(const [key,script] of Object.entries(previous.scripts))assert.deepEqual(data.scripts[key],script,key);
  for(const [key,p] of Object.entries(story.worldPlaces)){
    const map=data.maps[p.map];
    assert.equal(map.tiles[p.y][p.x],'.',key);
    const old=ready({old:true});
    for(const g of [ready(),migrated(old)]){
      const objects=map.objects.filter(o=>o.x===p.x&&o.y===p.y&&objectVisible(g.state,map,o));
      const oldMap=old.data.maps[p.map];
      const expected=g.state.flags.legacyStoryRoutes?.q026
        ?oldMap.objects.filter(o=>o.x===p.x&&o.y===p.y&&objectVisible(old.state,oldMap,o)).map(o=>o.id)
        :[p.event];
      assert.deepEqual(objects.map(o=>o.id),expected,key);
      assert.ok(map.objects.filter(o=>o.x===p.x&&o.y===p.y).every(o=>o.quest==='q026'),key);
    }
  }
  assert.deepEqual(new Set(graph.active.map(r=>r.scene)),new Set(Object.keys(story.scenes)));
  assert.deepEqual(new Set(graph.endings.flatMap(r=>JSON.parse(r.save).state.stories.q026.events)),new Set(Object.keys(story.actions)));
  for(const row of graph.active){
    const g=ready();g.load(row.save);checkpoint(g);
    const place=story.scenes[row.scene].place;
    const expected=Object.entries(story.entities).filter(([id,e])=>e.character&&values(g)[id+'At']===place).map(([,e])=>e.character);
    assert.deepEqual(projectGame(g).dialog.scene?.cast.map(c=>c.id)??[],expected,row.scene);
    assert.equal(values(g).reiAt,'orchard');assert.equal(values(g).buyerAt,'buyerBed');assert.equal(values(g).neighborAt,'donorTree');
  }
});
for(const route of routes)test('q026 '+route.old.join('/')+' preserves custody, reward and saves',()=>{
  const g=ready(),old=ready({old:true});
  for(const id of route.path){choose(g,id);checkpoint(g);}
  const v=values(g),fuel=route.outcome==='contract',alternate=route.outcome==='compromise',next=route.outcome==='informed';
  assert.equal(v.stockState,fuel?'wood':alternate?'alternate':'original');
  assert.equal(v.stockAt,fuel?'rei':'orchard');assert.equal(v.originalAt,alternate||fuel?'buyer':'stock');
  assert.equal(v.alternateAt,alternate?'stock':'donorTree');assert.equal(v.replacementAt,'nursery');
  assert.equal(v.promise,route.old.includes('decline')?'declined':next?'party':route.outcome==='grafted'?'rei':'none');
  assert.equal(v.permission,alternate);assert.equal(v.budChecked,next);
  assert.equal(v.seedling,next?'ready':'unstarted');assert.equal(v.season,next?'next':'current');
  assert.deepEqual(g.state.stories.q026.knowledge.party??[],route.old.includes('buyer')?['terms']:[]);
  assert.equal(g.state.records.battles,0);
  let restored=migrated(old);
  for(const id of route.old){
    assert.equal(restored.state.flags.legacyStoryRoutes.q026,true);
    choose(old,id);choose(restored,id);checkpoint(restored);
    assert.deepEqual(restored.state.flags.flow.q026,old.state.flags.flow.q026);
    restored=migrated(old);
  }
  for(const engine of [g,restored]){
    assert.equal(engine.state.gold,old.state.gold);assert.equal(engine.state.actors.ada.xp,old.state.actors.ada.xp);
    assert.equal(engine.state.quests.q026.outcome,route.outcome);
  }
  const saved=g.save();assert.throws(()=>g.complete('q026',route.outcome));assert.equal(g.save(),saved);
});
const journeys=new Map();
for(const row of graph.active){
  const g=ready();g.load(row.save);
  for(const choice of projectGame(g).dialog.options.filter(o=>o.enabled)){
    const key=row.scene+'_'+choice.id;
    if(story.actions[key]?.journey&&!journeys.has(key))journeys.set(key,{row,id:choice.id});
  }
}
assert.equal(journeys.size,7);
for(const [key,{row,id}] of journeys)for(const kind of ['retreat','defeat']){
  test('q026 '+key+' resumes after '+kind+' without losing or delivering carried work early',()=>{
    const g=ready();g.load(row.save);depart(g,id);
    const before=structuredClone(g.state.stories.q026),pending=structuredClone(g.state.journey);
    assert.equal(g.dispatch({type:'story.resume',quest:'q026'}),false);
    if(kind==='retreat')assert.ok(g.dispatch({type:'retreat'}));else g.defeat();
    drain(g);checkpoint(g);assert.deepEqual(g.state.stories.q026,before);assert.deepEqual(g.state.journey,pending);
    arrive(g);checkpoint(g);assert.equal(g.state.stories.q026.scene,story.actions[key].to);
  });
}
test('q026 rescue and return retain every distinct on-site work state',()=>{
  for(const row of graph.active){
    const g=ready();g.load(row.save);const before=structuredClone(g.state.stories.q026);
    g.defeat();drain(g);checkpoint(g);resume(g);assert.deepEqual(g.state.stories.q026,before,row.scene);
  }
});
test('q026 promise, scion transfer, graft, nursery growth and bud inspection commit at separate choices',()=>{
  const g=ready(),v=()=>values(g);
  choose(g,'buyer','ask','agree');assert.equal(v().promise,'party');assert.equal(v().originalAt,'buyer');
  choose(g,'receive');depart(g,'return');g.defeat();drain(g);checkpoint(g);
  assert.equal(v().originalAt,'party');assert.equal(v().stockState,'bare');arrive(g);
  choose(g,'graft');assert.equal(v().originalAt,'stock');assert.equal(v().seedling,'unstarted');
  choose(g,'season','sow');g.defeat();drain(g);checkpoint(g);resume(g);
  assert.equal(v().season,'current');assert.equal(v().seedling,'sown');assert.equal(v().budChecked,false);
  choose(g,'wait');assert.equal(v().season,'next');assert.equal(v().seedling,'sown');
  choose(g,'inspect');assert.equal(v().seedling,'ready');assert.equal(v().budChecked,false);
  choose(g,'orchard');assert.equal(v().budChecked,false);choose(g,'confirm');
  assert.equal(v().budChecked,true);assert.equal(v().replacementAt,'nursery');
});
test('q026 refusal leaves the original with the buyer and picking the alternate requires permission',()=>{
  const g=ready(),v=()=>values(g);
  choose(g,'buyer','ask');depart(g,'decline');assert.equal(v().promise,'declined');checkpoint(g);arrive(g);
  assert.equal(v().permission,false);assert.equal(g.dispatch({type:'choose',id:'take'}),false);
  choose(g,'ask');assert.equal(v().permission,true);assert.equal(v().alternateAt,'donorTree');
  choose(g,'take');depart(g,'return');assert.equal(v().alternateAt,'party');assert.equal(v().stockState,'bare');
  assert.equal(v().originalAt,'buyer');arrive(g);choose(g,'graft');assert.equal(v().alternateAt,'stock');
});
