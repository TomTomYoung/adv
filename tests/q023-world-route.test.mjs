import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {projectGame} from '../src/application/projection.js';
import {objectVisible} from '../src/core/quest-events.js';
import {data,previous,routes,values,checkpoint,ready,choose,depart,arrive,resume,migrated,enumerate,drain,fight} from './q023-helpers.mjs';

const graph=enumerate(),story=data.quests.q023.story;
test('q023 original, legacy events, floor geometry and current co-present cast',()=>{
  const raw=fs.readFileSync(new URL('../data/quests/q023.json',import.meta.url));
  assert.equal(createHash('sha1').update('blob '+raw.length+'\0').update(raw).digest('hex'),'db74be2efebaaec6ff96d541621af216420d9143');
  for(const [key,script] of Object.entries(previous.scripts))assert.deepEqual(data.scripts[key],script,key);
  for(const [key,p] of Object.entries(story.worldPlaces)){
    const map=data.maps[p.map];
    assert.equal(map.tiles[p.y][p.x],'.',key);
    const old=ready({old:true});
    for(const g of [ready(),migrated(old)]){
      const objects=map.objects.filter(o=>o.x===p.x&&o.y===p.y&&objectVisible(g.state,map,o));
      const oldMap=old.data.maps[p.map];
      const expected=g.state.flags.legacyStoryRoutes?.q023
        ?oldMap.objects.filter(o=>o.x===p.x&&o.y===p.y&&objectVisible(old.state,oldMap,o)).map(o=>o.id)
        :[p.event];
      assert.deepEqual(objects.map(o=>o.id),expected,key);
      assert.ok(map.objects.filter(o=>o.x===p.x&&o.y===p.y).every(o=>o.quest==='q023'),key);
    }
  }
  assert.deepEqual(new Set(graph.active.map(r=>r.scene)),new Set(Object.keys(story.scenes)));
  assert.deepEqual(new Set(graph.endings.flatMap(r=>JSON.parse(r.save).state.stories.q023.events)),new Set(Object.keys(story.actions)));
  for(const row of graph.active){
    const g=ready();g.load(row.save);checkpoint(g);
    const place=story.scenes[row.scene].place;
    assert.deepEqual(projectGame(g).dialog.scene?.cast.map(c=>c.id)??[],
      place==='shelter'?['e2_mother_ring_ase']:place==='board'?['e2_mother_ring_keeper']:[],row.scene);
  }
});
for(const route of routes)test('q023 '+route.old.join('/')+' preserves holders, original reward and accepted saves',()=>{
  const g=ready(),old=ready({old:true});
  for(const id of route.path){choose(g,id);checkpoint(g);}
  const v=values(g),cut=route.outcome==='contract',safe=route.outcome==='informed',copy=route.outcome==='compromise';
  assert.equal(v.measured,route.old[0]==='measure');
  assert.equal(v.aseTold,v.measured);
  assert.equal(v.posted,route.old.includes('notice'));assert.equal(v.archived,v.posted);assert.equal(v.warned,v.posted);
  assert.equal(v.cutRoot,cut);assert.equal(v.marker,cut?'lost':safe?'peg':'ring');
  assert.equal(v.ringAt,copy?'root':'ase');assert.equal(v.notesAt,safe?'ase':'party');
  assert.equal(v.pegAt,safe?'root':'party');assert.equal(v.copyAt,copy?'ase':'party');
  assert.equal(v.madeCopy,copy);assert.equal(v.signed,copy);assert.equal(v.reason,route.reason??'pending');
  assert.equal(v.registerAt,'keeper');assert.equal(v.keeperAt,'board');assert.equal(v.aseAt,'shelter');
  assert.equal(g.state.records.battles,0);
  let restored=migrated(old);
  for(const id of route.old){
    assert.equal(restored.state.flags.legacyStoryRoutes.q023,true);
    choose(old,id);choose(restored,id);checkpoint(restored);
    assert.deepEqual(restored.state.flags.flow.q023,old.state.flags.flow.q023);
    restored=migrated(old);
  }
  for(const engine of [g,restored]){
    assert.equal(engine.state.gold,old.state.gold);assert.equal(engine.state.actors.ada.xp,old.state.actors.ada.xp);
    assert.equal(engine.state.quests.q023.outcome,route.outcome);
  }
  const saved=g.save();assert.throws(()=>g.complete('q023',route.outcome));assert.equal(g.save(),saved);
});
test('q023 warning, register entry, posted directions, replacement, extraction and receipt are separately durable',()=>{
  const g=ready();
  choose(g,'measure');assert.equal(values(g).aseTold,false);checkpoint(g);
  depart(g,'report');assert.equal(values(g).aseTold,false);arrive(g);assert.equal(values(g).aseTold,true);
  choose(g,'notice');assert.equal(values(g).warned,false);assert.equal(values(g).archived,false);
  choose(g,'warn');assert.equal(values(g).warned,true);assert.equal(values(g).archived,false);checkpoint(g);
  choose(g,'archive');assert.equal(values(g).archived,true);assert.equal(values(g).posted,false);checkpoint(g);
  choose(g,'post','back','remove');assert.equal(values(g).marker,'ringAndPeg');assert.equal(values(g).ringAt,'root');checkpoint(g);
  choose(g,'lift');assert.equal(values(g).ringAt,'party');assert.equal(values(g).notesAt,'party');checkpoint(g);
  choose(g,'return');assert.equal(values(g).ringAt,'party');assert.equal(g.state.quests.q023.stage,'active');
  choose(g,'hand');assert.equal(values(g).ringAt,'ase');assert.equal(values(g).notesAt,'ase');
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
  test('q023 '+key+' resumes after '+kind+' without losing or delivering carried work early',()=>{
    const g=ready();g.load(row.save);depart(g,id);
    const before=structuredClone(g.state.stories.q023),pending=structuredClone(g.state.journey);
    assert.equal(g.dispatch({type:'story.resume',quest:'q023'}),false);
    if(kind==='retreat')assert.ok(g.dispatch({type:'retreat'}));else g.defeat();
    drain(g);checkpoint(g);assert.deepEqual(g.state.stories.q023,before);assert.deepEqual(g.state.journey,pending);
    arrive(g);checkpoint(g);assert.equal(g.state.stories.q023.scene,story.actions[key].to);
  });
}
test('q023 rescue and return retain every distinct on-site work state',()=>{
  for(const row of graph.active){
    const g=ready();g.load(row.save);const before=structuredClone(g.state.stories.q023);
    g.defeat();drain(g);checkpoint(g);resume(g);assert.deepEqual(g.state.stories.q023,before,row.scene);
  }
});
for(const entry of ['decision','review'])for(const outcome of ['informed','contract','compromise']){
  test('q023 older '+entry+' preserves '+outcome+' clue gates, fight and supplies',()=>{
    const old=ready({old:true,visit:false});
    if(outcome==='informed')for(const clue of ['clue_a','clue_b'])old.evidence('q023',clue,clue);
    old.run('q023.'+entry);drain(old);
    const g=migrated(old);checkpoint(g);
    for(const e of [old,g]){
      const ropes=e.state.inventory.rope??0;
      if(outcome!=='informed')assert.equal(e.dispatch({type:'choose',id:'informed'}),false);
      depart(e,outcome);
      if(outcome==='contract'){assert.equal(e.state.battle.encounter,'guard_3');fight(e);drain(e);}
      assert.equal(e.state.records.battles,Number(outcome==='contract'));
      assert.equal(e.state.inventory.rope??0,ropes);assert.equal(e.state.quests.q023.outcome,outcome);
    }
    assert.equal(g.state.gold,old.state.gold);assert.equal(g.state.actors.ada.xp,old.state.actors.ada.xp);checkpoint(g);
  });
}
