import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {projectGame} from '../src/application/projection.js';
import {exploreSpot,inspect} from './helpers.mjs';
import {objectVisible} from '../src/core/quest-events.js';
import {data,previous,routes,values,checkpoint,ready,choose,depart,arrive,resume,migrated,enumerate,drain,fight} from './q028-helpers.mjs';

const graph=enumerate(),story=data.quests.q028.story;
test('q028 original, legacy events, floor geometry and current co-present cast',()=>{
  const raw=fs.readFileSync(new URL('../data/quests/q028.json',import.meta.url));
  assert.equal(createHash('sha1').update('blob '+raw.length+'\0').update(raw).digest('hex'),'d01ff8fc1bc6da521fed53f7be2c2bec7a0cd501');
  for(const [key,script] of Object.entries(previous.scripts))assert.deepEqual(data.scripts[key],script,key);
  for(const [key,p] of Object.entries(story.worldPlaces)){
    const map=data.maps[p.map];
    assert.equal(map.tiles[p.y][p.x],'.',key);
    const old=ready({old:true});
    for(const g of [ready(),migrated(old)]){
      const objects=map.objects.filter(o=>o.x===p.x&&o.y===p.y&&objectVisible(g.state,map,o));
      const oldMap=old.data.maps[p.map];
      const expected=g.state.flags.legacyStoryRoutes?.q028
        ?oldMap.objects.filter(o=>o.x===p.x&&o.y===p.y&&objectVisible(old.state,oldMap,o)).map(o=>o.id)
        :[p.event];
      assert.deepEqual(objects.map(o=>o.id),expected,key);
      assert.ok(map.objects.filter(o=>o.x===p.x&&o.y===p.y).every(o=>o.quest==='q028'),key);
    }
  }
  assert.deepEqual(new Set(graph.active.map(r=>r.scene)),new Set(Object.keys(story.scenes)));
  assert.deepEqual(new Set(graph.endings.flatMap(r=>JSON.parse(r.save).state.stories.q028.events)),new Set(Object.keys(story.actions)));
  for(const row of graph.active){
    const g=ready();g.load(row.save);checkpoint(g);
    const place=story.scenes[row.scene].place;
    const expected=Object.entries(story.entities).filter(([id,e])=>e.character&&values(g)[id+'At']===place).map(([,e])=>e.character);
    assert.deepEqual(projectGame(g).dialog.scene?.cast.map(c=>c.id)??[],expected,row.scene);
    assert.equal(values(g).yuiAt,'desk');
    assert.equal(data.characters.e2_seed_bird_gardener.name,'庭師のユイ');
  }
});
for(const route of routes)test('q028 '+route.old.join('/')+' preserves tools, work, reward and saves',()=>{
  const g=ready(),old=ready({old:true});
  for(const id of route.path){choose(g,id);checkpoint(g);}
  const v=values(g),rules=route.outcome==='contract',full=route.outcome==='informed',wet=full||route.scope==='water';
  const untouched=route.scope==='untouched';
  assert.equal(v.scope,route.scope??'none');assert.equal(v.record,rules?'written':full?'both':'partial');
  assert.equal(v.warned,route.old.includes('cut'));assert.equal(v.corrected,route.old.includes('listen'));
  assert.equal(v.wet,wet);assert.equal(v.pruned,full);assert.equal(v.tagged,full);assert.equal(v.explained,full);assert.equal(v.sketch,full);
  assert.equal(v.jugAt,rules?'box':untouched?'tray':'front');assert.equal(v.knifeAt,rules?'box':wet?'middle':'tray');
  assert.equal(v.tagAt,rules?'box':full?'plant':wet?'last':'tray');assert.equal(v.apprenticeAt,full?'desk':'seat');
  assert.equal(v.layout,rules?'cleared':wet?'tag':untouched?'inherited':'jug');
  assert.equal(g.state.records.battles,0);
  let restored=migrated(old);
  for(const id of route.old){
    assert.equal(restored.state.flags.legacyStoryRoutes.q028,true);
    choose(old,id);choose(restored,id);checkpoint(restored);
    assert.deepEqual(restored.state.flags.flow.q028,old.state.flags.flow.q028);
    restored=migrated(old);
  }
  for(const engine of [g,restored]){
    assert.equal(engine.state.gold,old.state.gold);assert.equal(engine.state.actors.ada.xp,old.state.actors.ada.xp);
    assert.equal(engine.state.quests.q028.outcome,route.outcome);
  }
  const saved=g.save();assert.throws(()=>g.complete('q028',route.outcome));assert.equal(g.save(),saved);
});
const journeys=new Map();
for(const row of graph.active){
  const g=ready();g.load(row.save);
  for(const choice of projectGame(g).dialog.options.filter(o=>o.enabled)){
    const key=row.scene+'_'+choice.id;
    if(story.actions[key]?.journey&&!journeys.has(key))journeys.set(key,{row,id:choice.id});
  }
}
assert.equal(journeys.size,10);
for(const [key,{row,id}] of journeys)for(const kind of ['retreat','defeat']){
  test('q028 '+key+' resumes after '+kind+' without losing or delivering carried work early',()=>{
    const g=ready();g.load(row.save);depart(g,id);
    const before=structuredClone(g.state.stories.q028),pending=structuredClone(g.state.journey);
    assert.equal(g.dispatch({type:'story.resume',quest:'q028'}),false);
    if(kind==='retreat')assert.ok(g.dispatch({type:'retreat'}));else g.defeat();
    drain(g);checkpoint(g);assert.deepEqual(g.state.stories.q028,before);assert.deepEqual(g.state.journey,pending);
    arrive(g);checkpoint(g);assert.equal(g.state.stories.q028.scene,story.actions[key].to);
  });
}
test('q028 rescue and return retain every distinct on-site work state',()=>{
  for(const row of graph.active){
    const g=ready();g.load(row.save);const before=structuredClone(g.state.stories.q028);
    g.defeat();drain(g);checkpoint(g);resume(g);assert.deepEqual(g.state.stories.q028,before,row.scene);
  }
});
for(const entry of ['decision','review'])for(const outcome of ['informed','contract','compromise']){
  test('q028 older '+entry+' preserves '+outcome+' clue gates, fight and supplies',()=>{
    const old=ready({old:true,visit:false});
    if(outcome==='informed')for(const clue of ['clue_a','clue_b'])old.evidence('q028',clue,clue);
    old.run('q028.'+entry);drain(old);
    const g=migrated(old);checkpoint(g);
    for(const e of [old,g]){
      const ropes=e.state.inventory.rope??0;
      if(outcome!=='informed')assert.equal(e.dispatch({type:'choose',id:'informed'}),false);
      depart(e,outcome);
      if(outcome==='contract'){assert.equal(e.state.battle.encounter,'guard_3');fight(e);drain(e);}
      assert.equal(e.state.records.battles,Number(outcome==='contract'));
      assert.equal(e.state.inventory.rope??0,ropes);assert.equal(e.state.quests.q028.outcome,outcome);
    }
    assert.equal(g.state.gold,old.state.gold);assert.equal(g.state.actors.ada.xp,old.state.actors.ada.xp);checkpoint(g);
  });
}
test('q028 a stopped blade leaves the plant untouched; accepting the correction and pouring are separate actions',()=>{
  const g=ready(),v=()=>values(g);
  choose(g,'show','place');assert.equal(v().jugAt,'front');depart(g,'bed');assert.equal(v().apprenticeAt,'transit');
  assert.equal(v().jugAt,'apprentice');assert.equal(v().knifeAt,'party');arrive(g);choose(g,'cut');
  assert.equal(v().warned,true);assert.equal(v().corrected,false);assert.equal(v().wet,false);assert.equal(v().pruned,false);
  assert.equal(v().knifeAt,'apprentice');assert.equal(v().jugAt,'party');g.defeat();drain(g);checkpoint(g);resume(g);
  assert.equal(g.state.stories.q028.scene,'stopped');choose(g,'listen');assert.equal(v().corrected,true);assert.equal(v().wet,false);
  assert.equal(g.dispatch({type:'choose',id:'prune'}),false);choose(g,'pour');assert.equal(v().wet,true);assert.equal(v().pruned,false);
});
test('q028 demonstrating the blade and tag, pruning, tagging, explaining and recording survive independent checkpoints',()=>{
  const g=ready(),v=()=>values(g);
  choose(g,'show','place','bed','water','pour','back','knife');assert.equal(v().knifeAt,'middle');assert.equal(v().tagAt,'tray');
  choose(g,'tag');assert.equal(v().tagAt,'last');assert.equal(v().tagged,false);choose(g,'finish');depart(g,'bed');
  assert.equal(v().tagAt,'apprentice');assert.equal(v().knifeAt,'party');assert.equal(v().sketch,true);
  g.defeat();drain(g);checkpoint(g);arrive(g);choose(g,'prune');assert.equal(v().pruned,true);assert.equal(v().tagged,false);
  g.defeat();drain(g);checkpoint(g);resume(g);assert.equal(g.state.stories.q028.scene,'after_prune');
  choose(g,'label');assert.equal(v().tagAt,'plant');assert.equal(v().record,'none');choose(g,'back','desk','hear');
  assert.equal(v().explained,true);assert.equal(v().record,'none');choose(g,'save');assert.equal(v().record,'both');
});
test('q028 an older save resumes the same original demonstration after rescue, including the accepted correction',()=>{
  const spot=previous.events.find(e=>e.id==='q028_decision').points[0];
  for(const [path,node,after] of [
    [['show'],'water',['water','finish']],
    [['show','cut'],'correction',['listen','finish']],
    [['show','water'],'blade',['finish']],
    [['show','cut','listen'],'blade',['finish']]
  ]){
    const old=ready({old:true});choose(old,...path);
    const g=migrated(old);g.defeat();drain(g);checkpoint(g);
    assert.equal(g.state.mode,'town');assert.equal(g.state.flags.legacyStoryRoutes.q028,true);
    exploreSpot(g,spot,{maintain:true,interact:false});if(!g.state.waiting)inspect(g,'q028_decision');drain(g);
    assert.equal(g.state.flags.flow.q028.node,node);assert.equal(!!g.state.flags.flow.q028.corrected,path.includes('listen'));
    choose(g,...after);assert.equal(g.state.quests.q028.outcome,'informed');checkpoint(g);
  }
});
