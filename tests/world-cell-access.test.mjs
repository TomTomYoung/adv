import test from 'node:test';
import assert from 'node:assert/strict';
import {data,newGame,drain,fight} from './helpers.mjs';
import {prepareQuest,finishJourney} from './structure-routes.mjs';
import {projectGame} from '../src/application/projection.js';
import {projectQuestNavigation} from '../src/application/quest-navigation.js';
import {atWorldPlace,worldStoryPlace} from '../src/core/world.js';
import {applyStoryAction,arriveStoryJourney,resumeWorldStory,storyActionPlan,storyCanAct} from '../src/core/story.js';
import {validateSave} from '../src/core/save.js';

const story=(g,id)=>g.state.stories[id];
const choose=(g,id)=>{assert.ok(g.dispatch({type:'choose',id}));drain(g);};
const destination=(g,id)=>projectQuestNavigation(data,g.state,data.quests[id]).destination;
// Reproduce the old, legitimate saved pose without depending on its now removed
// start/resume permission. Teleport keeps the field-entry and dungeon state valid.
function oldFrontSave(g,id){
  const d=data.quests[id].story,s=story(g,id),place=d.worldPlaces[d.scenes[s.scene].place];
  g.teleport(place.map,place.x-1,place.y,'east',place.z??0);
  s.values[d.entities.party.holder]=d.scenes[s.scene].place;
  return g.save();
}
function restored(text){const g=newGame();g.load(text);return g;}

test('new world starts, resumes, actions and destination guidance require the placed cell',()=>{
  const g=newGame(),d=data.quests.q001.story,place=d.worldPlaces.entry;
  assert.ok(g.accept('q001'));g.teleport(place.map,place.x-1,place.y,'east');
  assert.equal(atWorldPlace(g.state,place),false);
  assert.equal(atWorldPlace(g.state,{...place,interactionRange:'here-or-front'},{exact:false}),false);
  assert.equal(destination(g,'q001').atPlace,false);
  assert.equal(resumeWorldStory(g,'q001'),false);
  g.run(data.quests.q001.model.entryScript);drain(g);
  assert.equal(story(g,'q001'),undefined,'a freshly pushed story VM cannot obtain saved-conversation permission');
  assert.ok(g.dispatch({type:'move',direction:'forward'}));drain(g);
  assert.equal(story(g,'q001').scene,'entry');assert.equal(destination(g,'q001').atPlace,true);

  const h=prepareQuest('q002'),p=data.quests.q002.story.worldPlaces.landing;
  h.state.vm=[];h.state.waiting=null;h.teleport(p.map,p.x-1,p.y,'east');
  assert.equal(storyCanAct(h,'q002','entry_lift'),false);
  const before=h.save();assert.throws(()=>applyStoryAction(h,'q002','entry_lift'),/この行為の場所にいません/);
  assert.equal(h.save(),before,'a remote action cannot spend materials or alter story state');
});

test('same-version idle saves normalize only the old derived holder and remain loadable',()=>{
  const source=prepareQuest('q002');source.give('rope',-source.state.inventory.rope);choose(source,'lift_supplies');
  assert.equal(source.state.waiting,null);
  const text=oldFrontSave(source,'q002'),save=JSON.parse(text),before=structuredClone(save);
  assert.deepEqual(validateSave(save,data),[]);assert.deepEqual(save,before,'save validation is read-only');
  const g=restored(text),expected=structuredClone(save.state);expected.stories.q002.values.partyAt='transit';
  assert.deepEqual(g.state,expected,'position, VM, NPCs, possessions and progress stay intact');
  assert.equal(g.state.contentVersion,data.game.version);
  assert.equal(worldStoryPlace(g.state,data.quests.q002.story),'transit');
  assert.equal(resumeWorldStory(g,'q002'),false);assert.equal(destination(g,'q002').atPlace,false);
  const normalized=g.save();g.load(normalized);assert.equal(g.save(),normalized);
  g.give('rope',1);
  assert.ok(g.dispatch({type:'move',direction:'forward'}));drain(g);
  assert.equal(story(g,'q002').values.partyAt,'landing');assert.equal(destination(g,'q002').atPlace,true);
  assert.ok(g.dispatch({type:'story.resume',quest:'q002'}));drain(g);
  assert.equal(g.state.waiting?.type,'choice');
});

test('an old first-text conversation can reload and finish, while journey arrival stays exact',()=>{
  const source=newGame();source.accept('q001');source.teleport('kagaribi_f1',2,1,'east');source.run(data.quests.q001.model.entryScript);
  assert.equal(source.state.waiting?.type,'text');
  const text=oldFrontSave(source,'q001'),g=restored(text),origin=structuredClone(g.state.location);
  assert.equal(g.save(),text,'loading an open old conversation preserves its existing VM and holder');
  assert.ok(g.dispatch({type:'advance'}));const midway=g.save();g.load(midway);assert.equal(g.save(),midway);
  drain(g);assert.equal(projectGame(g).dialog.options.find(o=>o.id==='talk').enabled,true);
  choose(g,'talk');assert.ok(g.state.journey);assert.deepEqual(g.state.location,origin);
  assert.equal(story(g,'q001').values.partyAt,'transit');
  g.teleport('kagaribi_f1',8,1,'east');assert.equal(projectGame(g).journey.atDestination,false);
  const pending=structuredClone(story(g,'q001'));assert.equal(arriveStoryJourney(g),false);assert.deepEqual(story(g,'q001'),pending);
  assert.ok(g.dispatch({type:'move',direction:'forward'}));drain(g);
  assert.equal(g.state.journey,null);assert.equal(story(g,'q001').scene,'dark');
});

test('restored same-place scene jumps keep their permission and charge an action once',()=>{
  const g=restored(oldFrontSave(prepareQuest('q002'),'q002')),origin=structuredClone(g.state.location),scope=g.state.vm.at(-1).scope,rope=g.state.inventory.rope;
  const before=g.save();assert.equal(projectGame(g).dialog.options.find(o=>o.id==='lift').enabled,true);assert.equal(g.save(),before);
  assert.throws(()=>storyActionPlan(data,g.state,'q002','entry_lift'),/この行為の場所にいません/,'the pure action planner remains strict by default');
  choose(g,'lift');assert.equal(story(g,'q002').scene,'box');assert.notEqual(g.state.vm.at(-1).scope,scope);
  assert.equal(g.state.inventory.rope,rope-1);assert.deepEqual(g.state.location,origin);
  const saved=g.save();g.load(saved);assert.equal(g.save(),saved);
  assert.equal(projectGame(g).dialog.options.find(o=>o.id==='school').enabled,true);
  assert.equal(g.dispatch({type:'choose',id:'lift'}),false);assert.equal(g.state.inventory.rope,rope-1);
  choose(g,'school');assert.ok(g.state.journey);assert.equal(story(g,'q002').values.partyAt,'transit');
});

test('an old battle inside a conversation can save, return to its branch and complete once',()=>{
  const g=restored(oldFrontSave(prepareQuest('q002'),'q002')),origin=structuredClone(g.state.location);
  assert.ok(g.dispatch({type:'choose',id:'tags'}));assert.ok(g.state.battle);
  const battle=g.save();g.load(battle);assert.equal(g.save(),battle);fight(g);
  assert.equal(story(g,'q002').scene,'tags');assert.deepEqual(g.state.location,origin);
  assert.equal(story(g,'q002').events.filter(e=>e==='entry_tags').length,1);
  assert.equal(projectGame(g).dialog.options.find(o=>o.id==='deliver').enabled,true);
  choose(g,'deliver');assert.equal(g.state.quests.q002.stage,'completed');assert.equal(g.state.vm.length,0);
});

test('old shortage and resume paragraphs use authored routes, and permission expires at idle',()=>{
  const source=prepareQuest('q002');source.give('rope',-source.state.inventory.rope);
  assert.ok(source.dispatch({type:'choose',id:'lift_supplies'}));assert.equal(data.scripts[source.state.vm.at(-1).script].storyQuest,undefined);
  const g=restored(oldFrontSave(source,'q002'));drain(g);
  assert.equal(g.state.vm.length,0);assert.equal(story(g,'q002').values.partyAt,'transit');
  g.give('rope',1);assert.equal(resumeWorldStory(g,'q002'),false);assert.equal(storyCanAct(g,'q002','entry_lift'),false);
  const idle=g.save();g.load(idle);assert.equal(g.save(),idle);

  const resumed=prepareQuest('q002');resumed.give('rope',-resumed.state.inventory.rope);choose(resumed,'lift_supplies');resumed.give('rope',1);
  assert.ok(resumeWorldStory(resumed,'q002'));assert.equal(resumed.state.vm.at(-1).script,'q002.v11.entry.lift.resume');
  const h=restored(oldFrontSave(resumed,'q002'));drain(h);
  assert.equal(h.state.waiting?.type,'choice');assert.equal(storyCanAct(h,'q002','entry_lift'),true);
  choose(h,'lift');assert.equal(story(h,'q002').scene,'box');assert.equal(h.state.inventory.rope,0);
});

test('position changes, successful loads and fresh scripts cannot reuse a restored conversation grant',()=>{
  const text=oldFrontSave(prepareQuest('q002'),'q002'),g=restored(text),p=data.quests.q002.story.worldPlaces.landing;
  assert.equal(storyCanAct(g,'q002','entry_lift'),true);
  g.teleport(p.map,p.x-1,p.y,'west');g.teleport(p.map,p.x-1,p.y,'east');
  assert.equal(storyCanAct(g,'q002','entry_lift'),false);assert.equal(story(g,'q002').values.partyAt,'transit');
  g.load(text);assert.equal(storyCanAct(g,'q002','entry_lift'),true);
  g.run(data.quests.q002.model.entryScript);
  assert.equal(storyCanAct(g,'q002','entry_lift'),false);
  assert.equal(story(g,'q002').values.partyAt,'transit');assert.equal(resumeWorldStory(g,'q002'),false);

  g.load(text);const idle=JSON.parse(text);idle.state.vm=[];idle.state.waiting=null;delete idle.state.presentation.cast;delete idle.state.presentation.castCue;
  g.load(JSON.stringify(idle));assert.equal(story(g,'q002').values.partyAt,'transit');
  g.run('q002.v11.entry');drain(g);assert.equal(g.state.vm.length,0);assert.equal(storyCanAct(g,'q002','entry_lift'),false);
});

test('legacy compatibility still rejects invalid pose, holders, cast and VM atomically',()=>{
  const text=oldFrontSave(prepareQuest('q002'),'q002'),g=restored(text),before=g.save();
  for(const [label,mutate] of [
    ['wrong facing',s=>s.location.facing='west'],['distant cell',s=>s.location.x--],['wrong height',s=>s.location.z=1],
    ['wrong holder',s=>s.stories.q002.values.partyAt='school'],['transit conversation',s=>s.stories.q002.values.partyAt='transit'],
    ['wrong scene',s=>s.stories.q002.scene='school'],['absent cast',s=>s.stories.q002.values.beltAt='school'],
    ['missing script',s=>s.vm.at(-1).script='missing'],['bad instruction',s=>s.vm.at(-1).index=999],['bad scope',s=>s.vm.at(-1).scope=s.nextScope]
  ]){
    const bad=JSON.parse(text);mutate(bad.state);assert.ok(validateSave(bad,data).length,label);
    assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),before);
    assert.equal(storyCanAct(g,'q002','entry_lift'),true,'a rejected load preserves the running conversation and its permission');
  }
});

test('a completed story can save its recap at a placed event away from the final scene',()=>{
  const g=prepareQuest('q002');choose(g,'lift');choose(g,'school');finishJourney(g);choose(g,'return');choose(g,'finish');
  assert.equal(g.state.quests.q002.outcome,'compromise');assert.equal(story(g,'q002').scene,'returned');
  const d=data.quests.q002.story,place=d.worldPlaces.landing;
  assert.equal(d.worldPlaces[d.scenes.returned.place].kind,'town');
  g.teleport(place.map,place.x,place.y,'east');assert.ok(g.trigger('interact','q002_decision'));
  assert.equal(g.state.waiting?.type,'text');assert.ok(g.state.vm.every(f=>f.script===data.quests.q002.model.entryScript));
  const saved=g.save();assert.deepEqual(validateSave(JSON.parse(saved),data),[]);
  const h=restored(saved);assert.equal(h.save(),saved);drain(h);
  assert.equal(h.state.waiting,null);assert.equal(h.state.quests.q002.outcome,'compromise');
  assert.equal(resumeWorldStory(h,'q002'),false,'a completed recap does not grant a new story continuation');
});
