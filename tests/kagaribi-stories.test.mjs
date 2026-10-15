import test from 'node:test';
import assert from 'node:assert/strict';
import {data,newGame,drain} from './helpers.mjs';
import {prepareQuest,finishJourney} from './structure-routes.mjs';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {applyStoryAction} from '../src/core/story.js';
import {questDisplayNumber} from '../src/core/quest-order.js';
import drafts from '../authoring/stories-kagaribi.mjs';
import {installDOM} from './view-dom.mjs';
import {replaceView} from '../src/view/view-layout.js';
const choose=(g,id)=>{assert.ok(g.dispatch({type:'choose',id}),id);drain(g);};

test('ten independent quests follow q001 in display order, require its return, and have complete model cards',()=>{
  const g=newGame();
  assert.equal(drafts.length,10);
  for(const [i,draft] of drafts.entries()){
    const q=data.quests[draft.id];assert.equal(questDisplayNumber(data,q.id),i+2);
    assert.equal(g.accept(q.id),false);
    assert.equal(Object.keys(q.outcomes).length,3);assert.equal(q.model.standard.version,'1.1');
    assert.ok(q.model.dramaticKernel);assert.ok(q.model.agents.every(a=>a.belief&&a.fear&&a.knowledgeSource));
    assert.ok(Object.values(q.story.worldPlaces).every(p=>p.dungeon==='kagaribi'));
  }
  g.accept('q001');(g.state.flags.legacyStoryRoutes??={}).q001=true;g.complete('q001','compromise');
  for(const s of [...drafts].reverse())assert.ok(g.accept(s.id),'no dependency on the other nine');
  assert.equal(questDisplayNumber(data,'q002'),12);
});

test('pre-addition saves gain only the ten available entries and retain q002 continuation, records and battle settings',()=>{
  const g=prepareQuest('q002'),old=JSON.parse(g.save());
  for(const s of drafts)delete old.state.quests[s.id];
  const h=new GameEngine(data);h.load(JSON.stringify(old));
  const current=JSON.parse(h.save());
  for(const s of drafts){assert.deepEqual(current.state.quests[s.id],{stage:'available',evidence:[],outcome:null});delete current.state.quests[s.id];}
  assert.deepEqual(current,old);
  choose(g,'school');choose(h,'school');assert.equal(h.save(),g.save());
});

test('additive save support never repairs partial additions or a missing original quest',()=>{
  const g=prepareQuest('q002'),before=g.save();
  for(const removed of [['q201'],['q002',...drafts.map(s=>s.id)]]){
    const save=JSON.parse(before);for(const id of removed)delete save.state.quests[id];
    assert.throws(()=>g.load(JSON.stringify(save)));assert.equal(g.save(),before);
  }
});

test('adding quests composes with the already supported q008 story revision',()=>{
  const g=prepareQuest('q008'),old=JSON.parse(g.save());
  const previous=data.quests.q008.model.storyUpgrades[0].previous,s=old.state.stories.q008;
  delete s.revision;s.values=Object.fromEntries(Object.entries(previous.registry).map(([key,r])=>[key,structuredClone(r.initial)]));
  for(const draft of drafts)delete old.state.quests[draft.id];
  g.load(JSON.stringify(old));assert.equal(g.state.stories.q008.revision,2);
  assert.equal(g.state.stories.q008.values.outerBaseAt,'coffin');
  for(const id of ['inspect','quiet','deliver'])choose(g,id);
  assert.equal(g.state.quests.q008.stage,'completed');
});

test('oil sample conserves amounts across transfer, test, save and handover; insufficient fire cannot consume it',()=>{
  const g=prepareQuest('q203');choose(g,'carry');
  const inTransit=g.save();g.load(inTransit);assert.equal(g.save(),inTransit);finishJourney(g);
  choose(g,'pour');g.state.inventory.torch=0;const before=g.save();
  assert.equal(g.dispatch({type:'choose',id:'burn'}),false);assert.equal(g.save(),before);
  g.state.inventory.torch=1;choose(g,'burn');
  const v=g.state.stories.q203.values;assert.deepEqual([v.sample,v.portion,v.burned],[1,1,1]);
  choose(g,'public');assert.equal(g.state.stories.q203.values.bottleAt,'tester');
  g.load(g.save());assert.equal(g.state.quests.q203.outcome,'public');
});

test('witness consent controls publication and cannot be forged by choosing the other route',()=>{
  const g=prepareQuest('q204');choose(g,'visit');finishJourney(g);choose(g,'sealed');choose(g,'carry');finishJourney(g);
  const before=g.save();assert.equal(g.dispatch({type:'choose',id:'add'}),false);assert.equal(g.save(),before);
  choose(g,'seal');assert.equal(g.state.stories.q204.values.consent,'sealed');
  assert.equal(g.state.stories.q204.values.survivorAt,'bench');
});

test('a gift travels with its actual holder, while the sister does not learn an unreported resignation',()=>{
  const g=prepareQuest('q206');choose(g,'carry');finishJourney(g);choose(g,'gift');choose(g,'hand');
  const v=g.state.stories.q206.values;
  assert.equal(v.mealAt,'worker');assert.equal(v.workerAt,'rest');assert.equal(v.sisterAt,'entry');
  assert.equal(v.resignationTold,false);
});

test('new people display their own names without requiring borrowed portraits or exposing author-only motives',()=>{
  const g=prepareQuest('q201'),vm=projectGame(g);
  assert.equal(vm.dialog.scene.cast[0].name,'ナヴィア');
  assert.ok(!JSON.stringify(vm.dialog).includes('休憩を欠勤と扱う支払規則'));
  const dom=installDOM();let view;
  try{for(const layout of ['scene','classic']){
    view=replaceView(view,layout,dom.root,()=>{},{status(){},menu(){},help(){},soundEnabled:()=>false,effectsMode:()=> 'off'});
    view.render(vm);const person=dom.root.querySelector('[data-character="q201_clerk"]');
    assert.ok(person);assert.match(person.textContent,/ナヴィア/);assert.equal(person.querySelector('img'),null);
  }}finally{view?.destroy();dom.restore();}
});

test('deep-fire legend has no resurrection or free ember side effect, and the letter remains inside its carried box',()=>{
  const g=prepareQuest('q210'),beforeEmber=g.state.inventory.kagaribi_ember??0;
  choose(g,'letter');choose(g,'walk');finishJourney(g);choose(g,'take');choose(g,'letter');
  const saved=g.save();g.load(saved);finishJourney(g);choose(g,'letter');
  const v=g.state.stories.q210.values;
  assert.equal(v.widowAt,'entry');assert.equal(v.boxAt,'widow');assert.equal(v.letterAt,'box');
  assert.equal(g.state.inventory.kagaribi_ember??0,beforeEmber);
  const completed=g.save();assert.throws(()=>applyStoryAction(g,'q210','box_take'));assert.equal(g.save(),completed);
});
