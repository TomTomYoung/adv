import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {projectGame} from '../src/application/projection.js';
import {objectVisible} from '../src/core/quest-events.js';
import {data,previous,previousData,routes,values,checkpoint,ready,choose,depart,arrive,resume,migrated,enumerate,drain,fight} from './q021-helpers.mjs';

const graph=enumerate(),story=data.quests.q021.story;
function at(scene){const row=graph.active.find(x=>x.scene===scene);assert.ok(row,scene);const g=ready();g.load(row.save);return g;}
test('q021 shipped source and previous scripts remain byte-identical',()=>{
  const raw=fs.readFileSync(new URL('../data/quests/q021.json',import.meta.url));
  assert.equal(createHash('sha1').update('blob '+raw.length+'\0').update(raw).digest('hex'),'feb7f380e7a720b1234f27046604033fe8ebdcc9');
  for(const [id,old] of Object.entries(previous.scripts))assert.deepEqual(data.scripts[id],old,id);
  for(const [id,old] of Object.entries(previous.outcomes)){
    const {requires,...fields}=old,{requires:current,...rest}=data.quests.q021.outcomes[id];
    assert.deepEqual(rest,fields);
    assert.deepEqual(current,story.endings[id]);
  }
  assert.equal(data.quests.q021.model.preserveAcceptedRoute,true);
  assert.equal(data.quests.q021.model.currentStoryScriptPrefix,'q021.seedbird.');
  for(const [g,legacy] of [[ready(),false],[migrated(ready({old:true})),true]])
    for(const map of Object.values(data.maps))
      for(const o of map.objects.filter(o=>o.quest==='q021'&&objectVisible(g.state,map,o)))
        assert.equal(o.id.startsWith('q021_seed_bird_'),!legacy,o.id);
});
test('q021 original seven routes cover every physical scene and action without inventing endings',()=>{
  assert.equal(graph.endings.length,7);
  assert.deepEqual(new Set(graph.active.map(x=>x.scene)),new Set(Object.keys(story.scenes)));
  assert.deepEqual(new Set(graph.endings.flatMap(x=>JSON.parse(x.save).state.stories.q021.events)),new Set(Object.keys(story.actions)));
  assert.deepEqual(new Set(graph.endings.map(x=>x.outcome)),new Set(['contract','compromise','informed']));
  assert.equal(Object.values(story.actions).filter(a=>a.journey).length,11);
  for(const row of graph.active){
    const g=ready();g.load(row.save);checkpoint(g);
    const scenePlace=story.scenes[row.scene].place;
    const expected=Object.entries(story.entities).filter(([id,e])=>e.character&&values(g)[id+'At']===scenePlace).map(([,e])=>e.character);
    const shown=projectGame(g).dialog.scene?.cast.map(x=>x.id)??[];
    assert.deepEqual(new Set(shown),new Set(expected),row.scene);
  }
});
for(const route of routes)test('q021 source outcome, watched flag, reward and one-time completion '+route.old.join('/'),()=>{
  const old=ready({old:true}),g=ready();
  choose(old,...route.old);
  choose(g,...route.path);
  assert.equal(g.state.quests.q021.outcome,route.outcome);
  assert.equal(values(g).watched,old.state.flags.flow.q021.watched);
  assert.equal(g.state.gold,old.state.gold);
  assert.equal(g.state.actors.ada.xp,old.state.actors.ada.xp);
  const saved=g.save();
  assert.throws(()=>g.complete('q021',route.outcome));
  assert.equal(g.save(),saved);
  checkpoint(g);
});
test('q021 optional second flight is observed once and does not alter seed custody',()=>{
  const g=at('crack');
  assert.equal(values(g).watched,false);
  assert.equal(values(g).looseSeedsAt,'crack');
  assert.equal(values(g).seedlingsAt,'crack');
  assert.equal(values(g).nestSeedsAt,'nest');
  choose(g,'wait');checkpoint(g);
  assert.equal(values(g).watched,true);
  assert.equal(g.state.stories.q021.scene,'crack');
  const saved=g.save();
  assert.equal(g.dispatch({type:'choose',id:'wait'}),false);
  assert.equal(g.save(),saved);
  choose(g,'half');
  assert.equal(values(g).halfRecovered,true);
  assert.equal(values(g).looseSeedsAt,'party');
  assert.equal(values(g).seedlingsAt,'crack');
  assert.equal(values(g).recorded,false);
  choose(g,'return','deliver');
  assert.equal(values(g).looseSeedsAt,'gardener');
  assert.equal(values(g).seedlingsAt,'crack');
  assert.equal(g.state.quests.q021.outcome,'compromise');
});
test('q021 marking is not a nursery, and only a consenting gardener can construct one',()=>{
  const g=at('crack');
  choose(g,'mark');checkpoint(g);
  assert.equal(values(g).marked,true);
  assert.equal(values(g).bedsPrepared,false);
  assert.equal(values(g).gardenerAgreed,false);
  assert.equal(values(g).birdShareReserved,false);
  choose(g,'consult');checkpoint(g);
  assert.equal(values(g).gardenerAt,'rack');
  assert.equal(values(g).bedMaterialsAt,'rack');
  choose(g,'beds');checkpoint(g);
  assert.equal(values(g).gardenerAgreed,true);
  assert.equal(values(g).gardenerAt,'bed');
  assert.equal(values(g).bedMaterialsAt,'party');
  assert.equal(values(g).bedsPrepared,false);
  choose(g,'build');checkpoint(g);
  assert.equal(values(g).bedMaterialsAt,'bed');
  assert.equal(values(g).bedsPrepared,true);
  assert.equal(values(g).birdShareReserved,false);
  choose(g,'crack','reserve');checkpoint(g);
  assert.equal(values(g).gardenerAt,'crack');
  assert.equal(values(g).birdAt,'crack');
  assert.equal(values(g).seedlingsAt,'crack');
  assert.equal(values(g).birdShareReserved,true);
  choose(g,'report','finish');checkpoint(g);
  assert.equal(values(g).gardenerAt,'rack');
  assert.equal(values(g).recorded,true);
  assert.equal(g.state.quests.q021.outcome,'informed');
});
test('q021 marking then half recovery leaves germinated seeds and skips construction',()=>{
  const g=at('marked');
  choose(g,'consult','half');checkpoint(g);
  assert.equal(values(g).gardenerAgreed,true);
  assert.equal(values(g).marked,true);
  assert.equal(values(g).bedMaterialsAt,'rack');
  assert.equal(values(g).looseSeedsAt,'crack');
  choose(g,'collect','return','deliver');
  assert.equal(values(g).halfRecovered,true);
  assert.equal(values(g).seedlingsAt,'crack');
  assert.equal(values(g).bedsPrepared,false);
  assert.equal(g.state.quests.q021.outcome,'compromise');
});
test('q021 fighting the guardians does not recover seeds or remove seedlings until separate actions',()=>{
  const g=ready();
  choose(g,'nest');checkpoint(g);
  assert.equal(values(g).nestVisited,true);
  assert.equal(values(g).guardsDefeated,false);
  depart(g,'fight');assert.ok(g.state.battle);
  assert.equal(g.state.battle.enemies.length,2);
  assert.equal(values(g).guardsDefeated,false);
  checkpoint(g);fight(g);drain(g);
  assert.equal(values(g).guardsDefeated,true);
  assert.equal(values(g).nestSeedsAt,'nest');
  assert.equal(values(g).allRecovered,false);
  choose(g,'collect');checkpoint(g);
  assert.equal(values(g).nestSeedsAt,'party');
  assert.equal(values(g).looseSeedsAt,'crack');
  choose(g,'crack');checkpoint(g);
  assert.equal(values(g).seedlingsAt,'crack');
  choose(g,'uproot');checkpoint(g);
  assert.equal(values(g).sproutsRemoved,true);
  assert.equal(values(g).seedlingsAt,'party');
  assert.equal(values(g).allRecovered,false);
  choose(g,'return','store');checkpoint(g);
  for(const key of ['nestSeedsAt','looseSeedsAt','seedlingsAt'])assert.equal(values(g)[key],'rack');
  assert.equal(values(g).allRecovered,true);
  assert.equal(g.state.quests.q021.outcome,'contract');
});
test('q021 defeat before the guard battle resolves preserves the nest for a rematch',()=>{
  const g=at('nest_before');
  depart(g,'fight');assert.ok(g.state.battle);
  g.defeat();drain(g);checkpoint(g);
  assert.equal(g.state.quests.q021.stage,'active');
  assert.equal(values(g).guardsDefeated,false);
  assert.equal(values(g).nestSeedsAt,'nest');
  assert.equal(values(g).seedlingsAt,'crack');
  resume(g);
  choose(g,'fight','collect','crack','uproot','return','store');
  assert.equal(g.state.quests.q021.outcome,'contract');
});
for(const scene of ['trail','crack','marked','consult','half_carried','bed_work','built','nursery_check','nest_cleared','nest_collected','rack_contract'])
  test('q021 saved work and rescue recover at '+scene,()=>{
    const g=at(scene),before=structuredClone(g.state.stories.q021);
    g.defeat();drain(g);checkpoint(g);
    assert.equal(g.state.stories.q021.values.partyAt,'transit');
    const actual=structuredClone(g.state.stories.q021);actual.values.partyAt=before.values.partyAt;
    assert.deepEqual(actual,before);
    resume(g);checkpoint(g);
    assert.deepEqual(g.state.stories.q021,before);
  });
const departures=new Map();
for(const row of graph.active){
  const g=ready();g.load(row.save);
  for(const o of projectGame(g).dialog.options.filter(x=>x.enabled)){
    const key=row.scene+'_'+o.id;
    if(story.actions[key]?.journey&&!departures.has(key))departures.set(key,{save:row.save,id:o.id});
  }
}
assert.equal(departures.size,11);
for(const [key,row] of departures)for(const kind of ['retreat','defeat'])
  test('q021 '+key+' survives '+kind+' during a physical journey',()=>{
    const g=ready();g.load(row.save);depart(g,row.id);assert.ok(g.state.journey);
    const facts=structuredClone(g.state.stories.q021),journey=structuredClone(g.state.journey);
    if(kind==='retreat')assert.ok(g.dispatch({type:'retreat'}));
    else g.defeat();
    drain(g);checkpoint(g);
    assert.deepEqual(g.state.stories.q021,facts);assert.deepEqual(g.state.journey,journey);
    arrive(g);checkpoint(g);
    assert.equal(g.state.stories.q021.scene,story.actions[key].to);
  });
for(const route of routes)test('q021 accepted old route and mid-save migrate '+route.old.join('/'),()=>{
  const old=ready({old:true});
  const upgraded=migrated(old);checkpoint(upgraded);
  assert.equal(upgraded.state.flags.legacyStoryRoutes.q021,true);
  for(const id of route.old){
    depart(old,id);depart(upgraded,id);
    if(old.state.battle){fight(old);fight(upgraded);}
    checkpoint(upgraded);
    assert.equal(upgraded.state.quests.q021.stage,old.state.quests.q021.stage);
    assert.equal(upgraded.state.flags.flow.q021.watched,old.state.flags.flow.q021.watched);
  }
  assert.equal(upgraded.state.quests.q021.outcome,route.outcome);
  assert.equal(upgraded.state.gold,old.state.gold);
});
test('q021 new event sites are floor cells with no old-map edits or other quest collisions',()=>{
  const older=new Set();
  for(const [id,q] of Object.entries(data.quests))if(id!=='q021')
    for(const e of q.events??[])for(const p of e.points??[])older.add(p.map+'/'+p.x+','+p.y);
  for(const [key,p] of Object.entries(story.worldPlaces)){
    const map=data.maps[p.map];
    assert.equal(map.tiles[p.y][p.x],'.',key);
    assert.equal(older.has(p.map+'/'+p.x+','+p.y),false,key);
    for(const o of map.objects.filter(o=>o.x===p.x&&o.y===p.y))assert.equal(o.quest,'q021',key+' '+o.id);
  }
  assert.deepEqual(data.maps.region_3_f1.tiles,previousData.maps.region_3_f1.tiles);
});
