import test from 'node:test';
import assert from 'node:assert/strict';
import {data,newGame,drain,fight} from './helpers.mjs';
import {prepareQuest,finishJourney} from './structure-routes.mjs';
import {storyPlace} from '../src/core/story.js';
import {validateSave} from '../src/core/save.js';
import {projectGame} from '../src/application/projection.js';

const choose=(g,...ids)=>{for(const id of ids){assert.ok(g.dispatch({type:'choose',id}),id);drain(g);if(g.state.battle)fight(g);finishJourney(g);}};
const story=(g,id)=>g.state.stories[id];

test('q003 agreement requires a separate overnight verification after people reach safety',()=>{
 const g=prepareQuest('q003');choose(g,'warn','escort','return','upstream','agree');
 const v=story(g,'q003').values;assert.equal(v.passersAt,'high');assert.equal(v.agreement,true);assert.equal(v.tested,false);
 const before=g.save();assert.throws(()=>g.complete('q003','informed'));assert.equal(g.save(),before);
 choose(g,'verify');assert.equal(g.state.quests.q003.outcome,'informed');assert.equal(story(g,'q003').values.tested,true);
});

test('q004 learning the guard identity still allows the sisters to pay without filing it',()=>{
 const g=prepareQuest('q004');choose(g,'window');
 assert.equal(story(g,'q004').scene,'duplicate');assert.equal(story(g,'q004').knowledge.party.includes('brother'),false);
 choose(g,'inspect');for(const fact of ['duty','resident','brother'])assert.ok(story(g,'q004').knowledge.party.includes(fact));
 const gold=g.state.gold;choose(g,'fine');const v=story(g,'q004').values;
 assert.equal(v.truthKnown,true);assert.equal(v.filed,false);assert.equal(v.provisional,false);assert.equal(v.originalAt,'sister');assert.equal(v.copyAt,'keeper');
 assert.equal(g.state.gold,gold-20+data.quests.q004.outcomes.compromise.gold);g.load(g.save());
});

test('q004 the former window scene remains resumable at a saved choice and after a pause',()=>{
 for(const pause of [false,true]){
  const g=prepareQuest('q004');choose(g,'window');
  // Former releases used this scene and script identifier at the same VM boundary.
  const old=JSON.parse(g.save());old.state.stories.q004.scene='window';old.state.vm.at(-1).script='q004.v11.window';g.load(JSON.stringify(old));
  if(pause){choose(g,'pause');g.run(data.quests.q004.model.entryScript);drain(g);}
  choose(g,'inspect','file','issue');assert.equal(g.state.quests.q004.outcome,'informed');g.load(g.save());
 }
});

test('q005 cold preserves a living bed while removal, drainage and food tests remain separate',()=>{
 const g=prepareQuest('q005');choose(g,'cold');let v=story(g,'q005').values;
 assert.equal(v.fungus,'cooled');assert.equal(v.bedAt,'drain');assert.equal(v.foodTest,false);
 choose(g,'move');v=story(g,'q005').values;assert.equal(v.bedAt,'sump');assert.equal(v.overnight,false);assert.equal(v.foodTest,false);
 assert.throws(()=>g.complete('q005','informed'));choose(g,'verify');v=story(g,'q005').values;
 assert.equal(v.overnight,true);assert.equal(v.foodTest,true);assert.equal(v.fungus,'cooled');
 const burn=prepareQuest('q005');choose(burn,'burn');assert.equal(story(burn,'q005').values.bedAt,'disposal');assert.equal(story(burn,'q005').values.fungus,'burned');
});

test('q006 an unopened private return reveals neither stones nor the accounting evidence',()=>{
 const g=prepareQuest('q006');choose(g,'lift','return','leave');const s=story(g,'q006');
 assert.equal(s.values.boxAt,'garo');assert.equal(s.values.opened,false);assert.equal(s.values.witnessed,false);assert.equal(s.values.partialPaid,false);
 for(const fact of ['stones','wages','deposits','debt'])assert.equal(s.knowledge.party?.includes(fact)??false,false);
 assert.equal(g.state.quests.q006.outcome,'contract');g.load(g.save());
});

test('q006 public accounting establishes evidence without preempting retraction or payment',()=>{
 for(const ending of ['settle','delegate']){
  const g=prepareQuest('q006');choose(g,'witness');assert.equal(story(g,'q006').knowledge.party.includes('debt'),false);
  choose(g,'ledger');const s=story(g,'q006');for(const fact of ['stones','wages','deposits','debt'])assert.ok(s.knowledge.party.includes(fact));
  assert.equal(s.values.partialPaid,false);choose(g,ending);const v=story(g,'q006').values;
  assert.equal(v.partialPaid,ending==='settle');assert.equal(v.delegated,ending==='delegate');assert.equal(v.boxAt,'workers');assert.equal(v.ledgerAt,'workers');g.load(g.save());
 }
});

test('q007 an unanswered question does not identify or display the brother before a visit',()=>{
 const g=prepareQuest('q007');choose(g,'reply');const s=story(g,'q007');
 assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['mire']);assert.ok(s.knowledge.party.includes('unanswered'));
 assert.equal(s.knowledge.party.includes('voice'),false);assert.equal(s.values.voiceKnown,false);assert.equal(s.values.brotherAt,'booth');
 choose(g,'walk','letters');let v=story(g,'q007').values;assert.equal(v.lettersAt,'mire');assert.equal(v.lettersConsent,true);assert.equal(v.met,false);assert.equal(v.brotherConsent,false);
 choose(g,'finish');v=story(g,'q007').values;assert.equal(v.brotherAt,'booth');assert.equal(v.met,false);g.load(g.save());
});

test('q008 the sealed inner coffin, detachable outer base and food end at distinct destinations',()=>{
 for(const [route,bodyPlace,basePlace] of [[['tow'],'river','jetty'],[['inspect','declare','permit'],'river','shore'],[['inspect','quiet','deliver'],'mortuary','mortuary']]){
  const g=prepareQuest('q008');const initial=story(g,'q008');assert.equal(initial.values.foodAt,'outerBase');assert.equal(initial.values.outerBaseAt,'coffin');
  choose(g,...route);const s=story(g,'q008'),d=data.quests.q008.story;
  assert.equal(s.values.bodyAt,'coffin');assert.equal(storyPlace(d,s,'body'),bodyPlace);assert.equal(storyPlace(d,s,'outerBase'),basePlace);assert.equal(storyPlace(d,s,'food'),'jetty');g.load(g.save());
 }
});

const previousData={...data,quests:{...data.quests,q008:{...data.quests.q008,story:data.quests.q008.model.storyUpgrades[0].previous}}};
function oldQ008(){
 const g=prepareQuest('q008');
 // Start with the shipped registry, then execute the shipped actions to generate old states.
 g.data=previousData;const s=story(g,'q008'),d=previousData.quests.q008.story;
 delete s.revision;s.values=Object.fromEntries(Object.entries(d.registry).map(([key,r])=>[key,structuredClone(r.initial)]));
 assert.deepEqual(validateSave(JSON.parse(g.save()),previousData),[]);return g;
}

test('q008 revision migration preserves old unfinished and completed routes without inventing delivery',()=>{
 for(const route of [['tow'],['inspect','declare','permit'],['inspect','quiet','deliver']]){
  for(let step=0;step<=route.length;step++){
   const old=oldQ008();choose(old,...route.slice(0,step));const saved=old.save();assert.deepEqual(validateSave(JSON.parse(saved),previousData),[]);
   const g=newGame();g.load(saved);const s=story(g,'q008');assert.equal(s.revision,2);
   for(const key of ['delivered','funeral','postponed','permit'])assert.equal(s.values[key],story(old,'q008').values[key]);
   assert.deepEqual(g.state.records,old.state.records);assert.equal(g.state.gold,old.state.gold);
   assert.deepEqual(s.events,story(old,'q008').events);assert.deepEqual(s.knowledge,story(old,'q008').knowledge);
   choose(g,...route.slice(step));assert.equal(g.state.quests.q008.stage,'completed');const stable=g.save();g.load(stable);assert.equal(g.save(),stable);
  }
 }
});

test('q008 migration rejects corrupt old and current saves atomically',()=>{
 const g=prepareQuest('q008'),before=g.save();
 for(const [base,mutate] of [
  [oldQ008().save(),s=>delete s.values.foodAt],
  [oldQ008().save(),s=>s.values.coffinAt='body'],
  [oldQ008().save(),s=>s.events=['invented']],
  [before,s=>delete s.values.outerBaseAt],
  [before,s=>s.revision=99],
  [before,s=>delete s.revision]
 ]){
  const bad=JSON.parse(base);mutate(bad.state.stories.q008);assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),before);
 }
});

test('q009 changing work order retains only the structure and cleanup work actually done',()=>{
 for(const [route,checked] of [[['move','holes','work','zones','granary','grain'],false],[['trace','zones','granary','holes','grain'],true]]){
  const g=prepareQuest('q009');choose(g,...route);const s=story(g,'q009');assert.equal(s.values.holes,true);assert.equal(s.values.zones,true);assert.equal(s.values.received,true);assert.equal(s.values.structureChecked,checked);
  assert.equal(s.knowledge.party?.includes('structure')??false,checked);assert.equal(s.knowledge.party?.includes('plans')??false,checked);g.load(g.save());
 }
});

test('q010 immediate closure uses the operation ladder without claiming shaft inspection or rescue',()=>{
 const g=prepareQuest('q010');choose(g,'close');const v=story(g,'q010').values;
 assert.equal(v.closed,true);assert.equal(v.keeperAt,'ground');assert.equal(v.partyAt,'ground');assert.equal(v.shaftChecked,false);
 assert.equal(v.nearPeopleAt,'near');assert.equal(v.deepPeopleAt,'deep');assert.equal(v.nearSaved,false);assert.equal(v.deepSaved,false);assert.equal(v.bookSaved,false);assert.equal(v.testimony,false);g.load(g.save());
});
