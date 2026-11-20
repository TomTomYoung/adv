import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {projectGame} from '../src/application/projection.js';
import {exploreSpot,inspect} from './helpers.mjs';
import {objectVisible} from '../src/core/quest-events.js';
import {data,previous,routes,values,checkpoint,ready,choose,depart,arrive,resume,migrated,enumerate,drain,fight} from './q030-helpers.mjs';

const graph=enumerate(),story=data.quests.q030.story;
test('q030 original, legacy events, floor geometry and current co-present cast',()=>{
  const raw=fs.readFileSync(new URL('../data/quests/q030.json',import.meta.url));
  assert.equal(createHash('sha1').update('blob '+raw.length+'\0').update(raw).digest('hex'),'2376d0e7f0ecad59868e42ddc4f628abdcba64f2');
  assert.equal(story.entities.hana.character,data.quests.q022.story.entities.hana.character);
  for(const [key,script] of Object.entries(previous.scripts))assert.deepEqual(data.scripts[key],script,key);
  for(const [key,p] of Object.entries(story.worldPlaces)){
    if(p.kind==='town'){assert.equal(data.locations[p.location].id,'e2_grove');continue;}
    const map=data.maps[p.map];
    assert.equal(map.tiles[p.y][p.x],'.',key);
    const old=ready({old:true});
    for(const g of [ready(),migrated(old)]){
      const objects=map.objects.filter(o=>o.x===p.x&&o.y===p.y&&objectVisible(g.state,map,o));
      const oldMap=old.data.maps[p.map];
      const expected=g.state.flags.legacyStoryRoutes?.q030
        ?oldMap.objects.filter(o=>o.x===p.x&&o.y===p.y&&objectVisible(old.state,oldMap,o)).map(o=>o.id)
        :[p.event];
      assert.deepEqual(objects.map(o=>o.id),expected,key);
      assert.ok(map.objects.filter(o=>o.x===p.x&&o.y===p.y).every(o=>o.quest==='q030'),key);
    }
  }
  assert.deepEqual(new Set(graph.active.map(r=>r.scene)),new Set(Object.keys(story.scenes)));
  assert.deepEqual(new Set(graph.endings.flatMap(r=>JSON.parse(r.save).state.stories.q030.events)),new Set(Object.keys(story.actions)));
  for(const row of graph.active){
    const g=ready();g.load(row.save);checkpoint(g);
    const place=story.scenes[row.scene].place;
    const expected=Object.entries(story.entities).filter(([id,e])=>e.character&&values(g)[id+'At']===place).map(([,e])=>e.character);
    assert.deepEqual(projectGame(g).dialog.scene?.cast.map(c=>c.id)??[],expected,row.scene);
    assert.equal(values(g).hanaAt,values(g).residentsAt);
  }
});
for(const route of routes)test('q030 '+route.old.join('/')+' preserves the beam, mirror, evacuees, rewards and original saves',()=>{
  const g=ready(),old=ready({old:true});
  for(const id of route.path){choose(g,id);checkpoint(g);}
  const v=values(g),guided=route.outcome==='informed',stopped=route.outcome==='contract';
  const evacuated=['compromise','people'].includes(route.outcome);
  assert.equal(v.braced,route.old.includes('brace'));assert.equal(v.postponed,route.old.includes('return'));
  assert.equal(v.light,guided?'opening':'pillar');assert.equal(v.mirrorAt,guided?'opening':'rack');
  assert.equal(v.root,guided?'guided':stopped?'stump':'overgrown');assert.equal(v.medicineStored,stopped);
  assert.equal(v.hanaAt,evacuated?'surface':'garden');assert.equal(v.residentsAt,v.hanaAt);
  assert.equal(v.bedsAt,route.outcome==='compromise'?'surface':'garden');
  assert.equal(g.state.records.battles,Number(stopped));
  assert.deepEqual(g.state.stories.q030.knowledge.party??[],guided?['towardLight']:[]);
  let restored=migrated(old);
  for(const id of route.old){
    assert.equal(restored.state.flags.legacyStoryRoutes.q030,true);
    choose(old,id);choose(restored,id);checkpoint(restored);
    assert.deepEqual(restored.state.flags.flow.q030,old.state.flags.flow.q030);
    restored=migrated(old);
  }
  for(const engine of [g,restored]){
    assert.equal(engine.state.gold,old.state.gold);assert.equal(engine.state.actors.ada.xp,old.state.actors.ada.xp);
    assert.equal(engine.state.quests.q030.outcome,route.outcome);
  }
  const saved=g.save();assert.throws(()=>g.complete('q030',route.outcome));assert.equal(g.save(),saved);
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
  test('q030 '+key+' resumes after '+kind+' without losing or delivering carried work early',()=>{
    const g=ready();g.load(row.save);depart(g,id);
    const before=structuredClone(g.state.stories.q030),pending=structuredClone(g.state.journey);
    assert.equal(g.dispatch({type:'story.resume',quest:'q030'}),false);
    if(kind==='retreat')assert.ok(g.dispatch({type:'retreat'}));else g.defeat();
    drain(g);checkpoint(g);assert.deepEqual(g.state.stories.q030,before);assert.deepEqual(g.state.journey,pending);
    arrive(g);checkpoint(g);assert.equal(g.state.stories.q030.scene,story.actions[key].to);
  });
}
test('q030 rescue and return retain every distinct on-site work state',()=>{
  for(const row of graph.active){
    const g=ready();g.load(row.save);const before=structuredClone(g.state.stories.q030);
    g.defeat();drain(g);checkpoint(g);resume(g);assert.deepEqual(g.state.stories.q030,before,row.scene);
  }
});
for(const entry of ['decision','review'])for(const outcome of ['informed','contract','compromise']){
  test('q030 older '+entry+' preserves '+outcome+' clue gates, fight and supplies',()=>{
    const old=ready({old:true,visit:false});
    if(outcome==='informed')for(const clue of ['clue_a','clue_b'])old.evidence('q030',clue,clue);
    old.run('q030.'+entry);drain(old);
    const g=migrated(old);checkpoint(g);
    for(const e of [old,g]){
      const ropes=e.state.inventory.rope??0;
      if(outcome!=='informed')assert.equal(e.dispatch({type:'choose',id:'informed'}),false);
      depart(e,outcome);
      if(outcome!=='compromise'){assert.equal(e.state.battle.encounter,'boss_3');fight(e);drain(e);}
      assert.equal(e.state.records.battles,Number(outcome!=='compromise'));
      assert.equal(e.state.inventory.rope??0,ropes);assert.equal(e.state.quests.q030.outcome,outcome);
    }
    assert.equal(g.state.gold,old.state.gold);assert.equal(g.state.actors.ada.xp,old.state.actors.ada.xp);checkpoint(g);
  });
}

test('q030 repeated postponements leave exactly one beam and move neither residents nor seedlings',()=>{
  const g=ready();
  for(let n=0;n<5;n++){
    choose(g,'brace');assert.equal(g.dispatch({type:'choose',id:n?'install':'check'}),false);
    choose(g,n?'check':'install','evacuate','return');checkpoint(g);
    assert.equal(values(g).braced,true);assert.equal(values(g).mirrorAt,'rack');
    assert.equal(values(g).bedsAt,'garden');assert.equal(values(g).residentsAt,'garden');
  }
  choose(g,'stop');assert.equal(values(g).medicineStored,false);
  g.defeat();drain(g);checkpoint(g);resume(g);choose(g,'bottle');
  assert.equal(values(g).medicineStored,true);assert.equal(g.state.records.wins,1);
});
test('q030 rescue with the mirror preserves its holder and delays the beam of light until it is aimed',()=>{
  const g=ready();choose(g,'brace','install','guide','lift');depart(g,'carry');
  g.defeat();drain(g);checkpoint(g);assert.equal(values(g).mirrorAt,'party');
  arrive(g);assert.equal(values(g).light,'pillar');choose(g,'aim');assert.equal(values(g).root,'growing');
  checkpoint(g);choose(g,'watch');assert.equal(values(g).root,'guided');
});
for(const [choice,arrival,ending] of [['beds','plant','compromise'],['people','count','people']])
  test('q030 escort '+choice+' survives rescue in transit and disembarking',()=>{
    const g=ready();choose(g,'move',choice);depart(g,'escort');
    for(const key of ['partyAt','hanaAt','residentsAt'])assert.equal(values(g)[key],'transit');
    const holder=choice==='beds'?'party':'garden';
    g.defeat();drain(g);checkpoint(g);assert.equal(values(g).bedsAt,holder);arrive(g);
    assert.equal(g.state.townLocation,'e2_grove');assert.equal(values(g).residentsAt,'surface');
    assert.equal(values(g).bedsAt,holder);assert.equal(values(g).root,'growing');
    choose(g,arrival);assert.equal(g.state.quests.q030.outcome,ending);
  });
test('q030 boss escape is refused and a defeat permits returning to the light route',()=>{
  const g=ready();depart(g,'stop');checkpoint(g);
  assert.equal(g.state.battle.encounter,'boss_3');assert.equal(g.dispatch({type:'battle',action:'escape'}),false);
  g.defeat();drain(g);checkpoint(g);assert.equal(values(g).root,'growing');assert.equal(values(g).medicineStored,false);
  resume(g);choose(g,'brace','install','guide','lift','carry','aim','watch');
  assert.equal(g.state.quests.q030.outcome,'informed');assert.equal(values(g).medicineStored,false);
});
test('q030 a saved original boss battle can be lost and the old evacuation resumed',()=>{
  const old=ready({old:true});depart(old,'stop');
  const g=migrated(old);checkpoint(g);assert.equal(g.state.flags.legacyStoryRoutes.q030,true);
  assert.equal(g.dispatch({type:'battle',action:'escape'}),false);
  g.defeat();drain(g);checkpoint(g);
  const point=previous.events.find(e=>e.id==='q030_decision').points[0];
  exploreSpot(g,point,{maintain:true,interact:false});if(!g.state.waiting)inspect(g,'q030_decision');drain(g);
  choose(g,'move','people');assert.equal(g.state.quests.q030.outcome,'people');checkpoint(g);
});
