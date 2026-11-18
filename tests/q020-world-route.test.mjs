import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {projectGame} from '../src/application/projection.js';
import {objectVisible} from '../src/core/quest-events.js';
import {createQuestTrial} from '../src/application/quest-playtest.js';
import {data,previous,previousData,catalog,routes,values,checkpoint,ready,choose,depart,arrive,resume,migrated,enumerate,drain,fight} from './q020-helpers.mjs';

const graph=enumerate(),story=data.quests.q020.story;
const originalFacts=previous.model.stateRegistry.map(field=>field.path.split('.').at(-1)).filter(k=>!['node','catalogRevision'].includes(k));
function at(scene){
  const row=graph.active.find(s=>s.scene===scene);assert.ok(row,scene);
  const g=ready();g.load(row.save);return g;
}
test('q020 retains the shipped original and its accepted scripts',()=>{
  const raw=fs.readFileSync(new URL('../data/quests/q020.json',import.meta.url));
  assert.equal(createHash('sha1').update('blob '+raw.length+'\0').update(raw).digest('hex'),'bdf14ee00b799bf5ec87085a692e12486879a7ea');
  for(const [id,script] of Object.entries(previous.scripts))assert.deepEqual(data.scripts[id],script,id);
  for(const [id,ending] of Object.entries(previous.outcomes)){
    const {requires,...other}=ending,{requires:current,...newOther}=data.quests.q020.outcomes[id];
    assert.deepEqual(newOther,other);
    assert.deepEqual(current,story.endings[id]);
  }
  assert.equal(data.quests.q020.model.edition.id,'e2');
  assert.equal(data.quests.q020.model.preserveAcceptedRoute,true);
  assert.ok(data.quests.q020.model.currentStoryScriptPrefix.startsWith('q020.crown.'));
  for(const [g,legacy] of [[ready(),false],[migrated(ready({old:true})),true]])
    for(const map of Object.values(data.maps))
      for(const o of map.objects.filter(o=>o.quest==='q020'&&objectVisible(g.state,map,o)))
        assert.equal(o.id.startsWith('q020_crown_'),!legacy,o.id);
});
test('q020 six paths cover every authored scene, action and registered outcome',()=>{
  assert.deepEqual(new Set(graph.active.map(x=>x.scene)),new Set(Object.keys(story.scenes)));
  assert.deepEqual(new Set(graph.endings.flatMap(row=>JSON.parse(row.save).state.stories.q020.events)),new Set(Object.keys(story.actions)));
  assert.equal(graph.endings.length,6);
  assert.deepEqual(new Set(graph.endings.map(row=>row.outcome)),new Set(['compromise','informed','contract']));
  for(const row of graph.active){
    const g=ready();g.load(row.save);checkpoint(g);
    const place=story.scenes[row.scene].place;
    const expected=Object.entries(story.entities).filter(([id,e])=>e.character&&values(g)[id+'At']===place).map(([,e])=>e.character);
    const dialog=projectGame(g).dialog;
    assert.deepEqual(new Set(dialog.scene.cast.map(c=>c.id)),new Set(expected),row.scene);
  }
});
for(const route of routes)test('q020 source route and legacy final facts '+route.old.join('/'),()=>{
  const old=ready({old:true}),g=ready();
  choose(old,...route.old);
  choose(g,...route.path);
  assert.equal(g.state.quests.q020.outcome,route.outcome);
  for(const key of originalFacts)assert.deepEqual(values(g)[key],old.state.flags.flow.q020[key],key);
  assert.equal(g.state.gold,old.state.gold);
  assert.equal(g.state.actors.ada.xp,old.state.actors.ada.xp);
  const saved=g.save();
  assert.throws(()=>g.complete('q020',route.outcome));
  assert.equal(g.save(),saved);
  checkpoint(g);
});
test('q020 registering a handover does not transfer property before meeting the keeper',()=>{
  const g=ready();
  depart(g,'relieve');checkpoint(g);assert.equal(values(g).handoverRequested,true);
  assert.equal(values(g).handoverAccepted,false);assert.equal(values(g).crownAt,'keeper');
  arrive(g);choose(g,'accept');checkpoint(g);
  assert.equal(values(g).handoverAccepted,true);
  assert.equal(values(g).handoverCompleted,false);
  assert.equal(values(g).shiftHeld,false);
  for(const item of ['crownAt','keysAt','monitorBookAt','repairPlanAt'])assert.equal(values(g)[item],'keeper');
  choose(g,'return');checkpoint(g);
  assert.equal(values(g).crownAt,'keeper');assert.equal(values(g).formerAt,'barrier');
  choose(g,'receive');checkpoint(g);
  assert.equal(values(g).handoverCompleted,true);
  assert.equal(values(g).shiftHeld,true);
  for(const item of ['crownAt','keysAt','monitorBookAt','repairPlanAt'])assert.equal(values(g)[item],'party');
  assert.equal(values(g).keeperAt,'barrier');
  choose(g,'escort');
  assert.equal(values(g).formerAt,'ground');assert.equal(values(g).keeperAt,'surface');
  assert.equal(values(g).exitOpen,false);
});
test('q020 inspecting supports does not repair anything or transfer the crown',()=>{
  const g=ready();choose(g,'supports','inspect');
  assert.equal(values(g).entranceInspected,true);
  assert.equal(values(g).deepInspected,false);
  assert.equal(values(g).supportsChecked,false);
  assert.equal(values(g).entranceBraced,false);
  choose(g,'measure');
  assert.equal(values(g).supportsChecked,true);
  assert.equal(values(g).crownAt,'keeper');
  assert.equal(values(g).shiftHeld,false);
  assert.equal(values(g).exitOpen,false);
});
test('q020 entry bracing, deep repair, branch closure and opening remain separate checkpoints',()=>{
  const g=ready();
  choose(g,'supports','inspect','measure','brace');
  assert.equal(values(g).entranceBraced,false);
  choose(g,'brace');checkpoint(g);
  assert.equal(values(g).entranceBraced,true);
  assert.equal(values(g).deepRepaired,false);
  assert.equal(values(g).exitOpen,false);
  choose(g,'deep','replace');checkpoint(g);
  assert.equal(values(g).deepRepaired,true);
  assert.equal(values(g).branchesClosed,false);
  assert.equal(values(g).exitOpen,false);
  choose(g,'branch','seal');checkpoint(g);
  assert.equal(values(g).branchesClosed,true);
  assert.equal(values(g).exitOpen,false);
  choose(g,'return','open_keeper');checkpoint(g);
  assert.equal(values(g).opening,'limited');
  assert.equal(values(g).exitOpen,true);
  assert.equal(values(g).limitedTraffic,true);
  assert.equal(values(g).roleEnded,false);
  assert.equal(values(g).crownAt,'party');
  choose(g,'escort','record','archive');checkpoint(g);
  assert.equal(values(g).roleEnded,false);
  assert.equal(values(g).crownAt,'party');
  choose(g,'deposit');checkpoint(g);
  assert.equal(values(g).roleEnded,true);
  for(const item of ['crownAt','keysAt','monitorBookAt','repairPlanAt'])assert.equal(values(g)[item],'archive');
});
test('q020 a previous handover is never repeated on the relief-and-repair path',()=>{
  const g=ready();choose(g,'relieve','accept','return','receive','escort','repair','inspect','measure','brace','brace','deep','replace','branch','seal','return');
  assert.equal(values(g).crownAt,'party');
  assert.equal(values(g).keeperAt,'surface');
  assert.equal(values(g).handoverCompleted,true);
  choose(g,'open_shifted');checkpoint(g);
  assert.equal(values(g).crownAt,'party');assert.equal(values(g).keysAt,'party');
  choose(g,'file','record','archive','deposit');
  assert.equal(g.state.quests.q020.outcome,'informed');
  assert.equal(values(g).formerAt,'ground');
  assert.equal(values(g).keeperAt,'surface');
});
test('q020 combat only opens the unsafe gate after both guards are defeated and the fence broken',()=>{
  const g=ready();
  depart(g,'fight');assert.ok(g.state.battle);
  assert.equal(g.state.battle.enemies.length,2);
  assert.equal(values(g).guardsDefeated,false);
  assert.equal(values(g).exitOpen,false);
  checkpoint(g);
  fight(g);drain(g);
  assert.equal(values(g).guardsDefeated,true);
  assert.equal(values(g).exitOpen,false);
  assert.equal(values(g).keeperAt,'barrier');
  choose(g,'break');checkpoint(g);
  assert.equal(values(g).opening,'forced');
  assert.equal(values(g).exitOpen,true);
  assert.equal(values(g).limitedTraffic,false);
  assert.equal(values(g).entranceBraced,false);
  assert.equal(values(g).keeperAt,'danger');
  assert.equal(values(g).crownAt,'keeper');
  choose(g,'finish');
  assert.equal(g.state.quests.q020.outcome,'contract');
});
test('q020 rescue during unfinished work leaves all previous work intact but the exit closed',()=>{
  const g=at('repaired'),snapshot=structuredClone(g.state.stories.q020);
  assert.equal(values(g).entranceBraced,true);
  assert.equal(values(g).deepRepaired,true);
  assert.equal(values(g).branchesClosed,false);
  g.defeat();drain(g);checkpoint(g);
  const afterRescue=structuredClone(g.state.stories.q020);
  assert.equal(afterRescue.values.partyAt,'transit');
  afterRescue.values.partyAt=snapshot.values.partyAt;
  assert.deepEqual(afterRescue,snapshot);
  resume(g);checkpoint(g);
  assert.deepEqual(g.state.stories.q020,snapshot);
  assert.equal(values(g).exitOpen,false);
  choose(g,'branch','seal','return','open_keeper','escort','record','archive','deposit');
  assert.equal(g.state.quests.q020.outcome,'informed');
});
test('q020 defeat in the guard battle leaves the keeper, crown and closed fence for a rematch',()=>{
  const g=ready();
  depart(g,'fight');assert.ok(g.state.battle);
  g.defeat();drain(g);checkpoint(g);
  assert.equal(g.state.quests.q020.stage,'active');
  assert.equal(values(g).guardsDefeated,false);
  assert.equal(values(g).exitOpen,false);
  assert.equal(values(g).formerAt,'barrier');
  assert.equal(values(g).crownAt,'keeper');
  resume(g);choose(g,'fight','break','finish');
  assert.equal(g.state.quests.q020.outcome,'contract');
});
for(const [scene,expected] of [['accepted','keeper'],['received','party'],['braced','keeper'],['repair_deep','keeper'],['open_check','keeper'],['recorded','party'],['archive_site','party']])
  test('q020 saving and rescue at '+scene,()=>{
    const g=at(scene),before=structuredClone(g.state.stories.q020);
    assert.equal(values(g).crownAt,expected);
    g.defeat();drain(g);checkpoint(g);resume(g);
    assert.deepEqual(g.state.stories.q020,before);
    checkpoint(g);
  });
for(const action of ['entry_relieve','entry_supports','guided_mouth_inspect','received_escort','rested_repair','repaired_branch','recorded_archive'])
  for(const interruption of ['retreat','defeat'])test('q020 '+action+' resumes after '+interruption,()=>{
    const row=graph.active.find(row=>{
      const n=story.scenes[row.scene];
      return n&&Object.keys(story.actions).some(k=>k===action && story.actions[k].from.includes(row.scene));
    });
    assert.ok(row,action);
    const g=ready();g.load(row.save);
    const choice=action.slice(row.scene.length+1),option=projectGame(g).dialog.options.find(o=>o.enabled&&o.id===choice);
    assert.ok(option,action);
    depart(g,choice);assert.ok(g.state.journey);
    const save=structuredClone(g.state.stories.q020),journey=structuredClone(g.state.journey);
    if(interruption==='retreat'&&g.state.mode==='dungeon')assert.ok(g.dispatch({type:'retreat'}));
    else g.defeat();
    drain(g);checkpoint(g);
    assert.deepEqual(g.state.stories.q020,save);assert.deepEqual(g.state.journey,journey);
    arrive(g);checkpoint(g);
    assert.equal(g.state.stories.q020.scene,story.actions[action].to);
  });
for(const route of routes)test('q020 preserves old accepted save mid-route '+route.old.join('/'),()=>{
  const old=ready({old:true});
  const upgraded=migrated(old);
  checkpoint(upgraded);
  assert.equal(upgraded.state.flags.legacyStoryRoutes.q020,true);
  const oldClone=JSON.parse(old.save()),newClone=JSON.parse(upgraded.save());
  (oldClone.state.flags.legacyStoryRoutes??={}).q020=true;
  assert.deepEqual(newClone,oldClone);
  choose(old,...route.old);
  choose(upgraded,...route.old);
  assert.equal(upgraded.state.quests.q020.outcome,route.outcome);
  assert.equal(upgraded.state.gold,old.state.gold);
});
test('q020 uses reachable, previously unclaimed floor cells, and never edits the first edition map',()=>{
  const occupied=new Map();
  for(const [quest,q] of Object.entries(data.quests)){
    if(quest==='q020')continue;
    for(const event of q.events??[])for(const p of event.points??[])
      if(event.id.startsWith('q019_')||event.id.startsWith('q017_'))occupied.set(p.map+'/'+p.x+','+p.y,event.id);
  }
  for(const [place,p] of Object.entries(story.worldPlaces)){
    if(p.kind==='town'){assert.ok(data.locations[p.location]);continue;}
    const map=data.maps[p.map];
    assert.equal(map.tiles[p.y][p.x],'.',place);
    assert.equal(occupied.has(p.map+'/'+p.x+','+p.y),false,place);
    const objects=map.objects.filter(o=>o.x===p.x&&o.y===p.y);
    for(const o of objects)assert.equal(o.quest,'q020',place+' '+o.id);
  }
  assert.deepEqual(data.maps.region_2_f2.tiles,previousData.maps.region_2_f2.tiles);
});
