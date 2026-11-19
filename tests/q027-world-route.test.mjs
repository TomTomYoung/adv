import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {projectGame} from '../src/application/projection.js';
import {objectVisible} from '../src/core/quest-events.js';
import {data,previous,routes,values,checkpoint,ready,choose,depart,arrive,resume,migrated,enumerate,drain,fight} from './q027-helpers.mjs';

const graph=enumerate(),story=data.quests.q027.story;
test('q027 original, legacy events, floor geometry and current co-present cast',()=>{
  const raw=fs.readFileSync(new URL('../data/quests/q027.json',import.meta.url));
  assert.equal(createHash('sha1').update('blob '+raw.length+'\0').update(raw).digest('hex'),'792e6694ba25446b64bfa2eaa213f89b4597d4c5');
  for(const [key,script] of Object.entries(previous.scripts))assert.deepEqual(data.scripts[key],script,key);
  for(const [key,p] of Object.entries(story.worldPlaces)){
    const map=data.maps[p.map];
    assert.equal(map.tiles[p.y][p.x],'.',key);
    const old=ready({old:true});
    for(const g of [ready(),migrated(old)]){
      const objects=map.objects.filter(o=>o.x===p.x&&o.y===p.y&&objectVisible(g.state,map,o));
      const oldMap=old.data.maps[p.map];
      const expected=g.state.flags.legacyStoryRoutes?.q027
        ?oldMap.objects.filter(o=>o.x===p.x&&o.y===p.y&&objectVisible(old.state,oldMap,o)).map(o=>o.id)
        :[p.event];
      assert.deepEqual(objects.map(o=>o.id),expected,key);
      assert.ok(map.objects.filter(o=>o.x===p.x&&o.y===p.y).every(o=>o.quest==='q027'),key);
    }
  }
  assert.deepEqual(new Set(graph.active.map(r=>r.scene)),new Set(Object.keys(story.scenes)));
  assert.deepEqual(new Set(graph.endings.flatMap(r=>JSON.parse(r.save).state.stories.q027.events)),new Set(Object.keys(story.actions)));
  for(const row of graph.active){
    const g=ready();g.load(row.save);checkpoint(g);
    const place=story.scenes[row.scene].place;
    const expected=Object.entries(story.entities).filter(([id,e])=>e.character&&values(g)[id+'At']===place).map(([,e])=>e.character);
    assert.deepEqual(projectGame(g).dialog.scene?.cast.map(c=>c.id)??[],expected,row.scene);
    assert.equal(values(g).nomAt,values(g).cartAt);assert.equal(values(g).merchantAt,values(g).cartAt);
  }
});
for(const route of routes)test('q027 '+route.old.join('/')+' preserves evidence, custody, reward and saves',()=>{
  const g=ready(),old=ready({old:true});
  for(const id of route.path){choose(g,id);checkpoint(g);}
  const v=values(g),cut=route.outcome==='contract',full=route.outcome==='informed';
  assert.equal(v.cartAt,cut?'loading':'exit');assert.equal(v.crossed,!cut);
  assert.equal(v.silverAt,cut?'cart':'exit');assert.equal(v.pouchAt,cut?'cart':full?'exit':route.left==='detour'?'side':'loading');
  assert.equal(v.flower,cut?'cut':route.left==='detour'?'aside':'open');assert.equal(v.undergrowthAtRisk,cut);
  assert.equal(v.freight,cut?'pending':full?'full':'partial');assert.equal(v.leftAfter,route.left??'none');
  assert.equal(v.scentLabel,full);
  assert.deepEqual(g.state.stories.q027.knowledge.party??[],[
    ...(route.old.includes('silver')?['silverStill']:[]),...(route.old.includes('scent')?['scentCloses','withdrawOpens']:[])
  ]);
  assert.equal(g.state.records.battles,0);
  let restored=migrated(old);
  for(const id of route.old){
    assert.equal(restored.state.flags.legacyStoryRoutes.q027,true);
    choose(old,id);choose(restored,id);checkpoint(restored);
    assert.deepEqual(restored.state.flags.flow.q027,old.state.flags.flow.q027);
    restored=migrated(old);
  }
  for(const engine of [g,restored]){
    assert.equal(engine.state.gold,old.state.gold);assert.equal(engine.state.actors.ada.xp,old.state.actors.ada.xp);
    assert.equal(engine.state.quests.q027.outcome,route.outcome);
  }
  const saved=g.save();assert.throws(()=>g.complete('q027',route.outcome));assert.equal(g.save(),saved);
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
  test('q027 '+key+' resumes after '+kind+' without losing or delivering carried work early',()=>{
    const g=ready();g.load(row.save);depart(g,id);
    const before=structuredClone(g.state.stories.q027),pending=structuredClone(g.state.journey);
    assert.equal(g.dispatch({type:'story.resume',quest:'q027'}),false);
    if(kind==='retreat')assert.ok(g.dispatch({type:'retreat'}));else g.defeat();
    drain(g);checkpoint(g);assert.deepEqual(g.state.stories.q027,before);assert.deepEqual(g.state.journey,pending);
    arrive(g);checkpoint(g);assert.equal(g.state.stories.q027.scene,story.actions[key].to);
  });
}
test('q027 rescue and return retain every distinct on-site work state',()=>{
  for(const row of graph.active){
    const g=ready();g.load(row.save);const before=structuredClone(g.state.stories.q027);
    g.defeat();drain(g);checkpoint(g);resume(g);assert.deepEqual(g.state.stories.q027,before,row.scene);
  }
});
for(const entry of ['decision','review'])for(const outcome of ['informed','contract','compromise']){
  test('q027 older '+entry+' preserves '+outcome+' clue gates, fight and supplies',()=>{
    const old=ready({old:true,visit:false});
    if(outcome==='informed')for(const clue of ['clue_a','clue_b'])old.evidence('q027',clue,clue);
    old.run('q027.'+entry);drain(old);
    const g=migrated(old);checkpoint(g);
    for(const e of [old,g]){
      const ropes=e.state.inventory.rope??0;
      if(outcome!=='informed')assert.equal(e.dispatch({type:'choose',id:'informed'}),false);
      depart(e,outcome);
      if(outcome==='contract'){assert.equal(e.state.battle.encounter,'guard_3');fight(e);drain(e);}
      assert.equal(e.state.records.battles,Number(outcome==='contract'));
      assert.equal(e.state.inventory.rope??0,ropes);assert.equal(e.state.quests.q027.outcome,outcome);
    }
    assert.equal(g.state.gold,old.state.gold);assert.equal(g.state.actors.ada.xp,old.state.actors.ada.xp);checkpoint(g);
  });
}
test('q027 keeps each flower observation at the action that produced it',()=>{
  const g=ready(),v=()=>values(g),known=()=>g.state.stories.q027.knowledge.party??[];
  depart(g,'silver');assert.equal(v().silverAt,'party');assert.equal(v().pouchAt,'cart');assert.deepEqual(known(),[]);
  arrive(g);choose(g,'observe');assert.deepEqual(known(),['silverStill']);assert.equal(v().flower,'open');
  choose(g,'back','scent','near');assert.equal(v().flower,'shut');assert.deepEqual(known(),['silverStill','scentCloses']);
  g.defeat();drain(g);checkpoint(g);resume(g);assert.equal(v().flower,'shut');assert.equal(v().cartAt,'loading');
  choose(g,'withdraw');assert.deepEqual(known(),['silverStill','scentCloses','withdrawOpens']);
  assert.equal(v().flower,'open');choose(g,'detour');assert.equal(v().pouchAt,'party');
  choose(g,'place');assert.equal(v().pouchAt,'side');assert.equal(v().flower,'aside');assert.equal(v().leftAfter,'none');
});
test('q027 cart passage, pouch retrieval, delivery and billing each have their own recovery point',()=>{
  const g=ready(),v=()=>values(g);
  choose(g,'scent','near','withdraw','detour','place','back','push');assert.equal(v().cartAt,'gate');
  depart(g,'cross');assert.equal(v().cartAt,'transit');assert.equal(v().crossed,false);assert.equal(v().silverAt,'cart');
  g.defeat();drain(g);checkpoint(g);arrive(g);assert.equal(v().cartAt,'exit');assert.equal(v().crossed,true);
  choose(g,'retrieve','take');assert.equal(v().pouchAt,'party');assert.equal(v().cartAt,'exit');
  assert.equal(v().freight,'pending');depart(g,'deliver');g.defeat();drain(g);checkpoint(g);arrive(g);
  assert.equal(v().pouchAt,'party');choose(g,'unload');assert.equal(v().pouchAt,'exit');assert.equal(v().silverAt,'exit');
  assert.equal(v().scentLabel,false);assert.equal(v().freight,'pending');choose(g,'label');assert.equal(v().freight,'full');
});
