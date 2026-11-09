import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {loadContent} from '../src/core/loader.js';
import {validateSave} from '../src/core/save.js';
import {questPartyErrors,createQuestTrial,questTrialReport,dispatchQuestTrial} from '../src/application/quest-playtest.js';
import {drain,fight} from './helpers.mjs';
import {finishJourney} from './structure-routes.mjs';
const root=new URL('../',import.meta.url),catalog=JSON.parse(await fs.readFile(new URL('playtests/quest-parties.json',root),'utf8'));
const editions=Object.fromEntries(await Promise.all(['e1','e2'].map(async edition=>[edition,await loadContent(f=>fs.readFile(new URL(f,root),'utf8').then(JSON.parse),{edition})])));
const options={quest:'q001',party:'balanced',level:1,seed:1907};
for(const [edition,data] of Object.entries(editions))test(`${edition}: every quest and all party variants start in both modes with a valid real state`,()=>{
  assert.deepEqual(questPartyErrors(data,catalog),[]);let count=0;
  for(const [quest,p] of Object.entries(catalog.quests[edition]))for(const party of p.parties)for(const start of ['reception','site']){
    const trial=createQuestTrial(data,catalog,{quest,party,level:p.level.standard,start}),g=trial.engine,report=questTrialReport(trial),label=`${edition}/${quest}/${party}/${start}`;
    assert.equal(g.state.quests[quest].stage,'active',label);assert.equal(report.status,'playing',label);assert.ok(!trial.prerequisites.includes(quest),label);
    assert.deepEqual(validateSave(JSON.parse(g.save()),data),[],label);
    assert.deepEqual(g.state.members,catalog.parties[party].members,label);
    assert.ok(g.state.members.every(id=>g.state.actors[id].level===p.level.standard),label);
    assert.equal(g.state.records.wins,0,label);assert.equal(g.state.gold,catalog.supplies[p.supplies].gold,label);count++;
  }
  assert.equal(count,Object.keys(data.quests).length*6);
});
test('restarts reproduce state and never modify shared content or use previous party resources',()=>{
  const data=editions.e2,before=JSON.stringify(data),one=createQuestTrial(data,catalog,options),initial=one.engine.save();
  one.engine.give('potion',-1);one.engine.state.actors.ada.hp=1;
  const two=createQuestTrial(data,catalog,options);assert.equal(two.engine.save(),initial);assert.equal(JSON.stringify(data),before);assert.equal(two.engine.state.actors.ada.hp,two.engine.stats('ada').hp);
});
test('level boundaries use real job growth and available skills; out-of-band and invalid starts are rejected',()=>{
  const data=editions.e1,p=catalog.quests.e1.q050;
  for(const level of [p.level.min,p.level.max]){const t=createQuestTrial(data,catalog,{...options,quest:'q050',level});assert.equal(t.engine.state.actors.ada.xp,data.system.xpBase*(level-1)*level);assert.equal(t.engine.state.actors.ada.growthHistory.warrior,level-1);assert.deepEqual(validateSave(JSON.parse(t.engine.save()),data),[]);}
  for(const bad of [{level:0},{level:25},{party:'missing'},{quest:'missing'},{seed:0},{seed:1.2},{start:'win'},{battleMode:'debug'},{outcome:'fake'}])assert.throws(()=>createQuestTrial(data,catalog,{...options,...bad}));
});
test('definitions reject missing quests, duplicated parties, incompatible gear and missing required companions',()=>{
  const d=editions.e2;
  for(const mutate of [c=>delete c.quests.e2.q300,c=>c.quests.e2.q001.parties=['balanced','balanced'],c=>c.loadouts.il.equipment=['mail'],c=>c.quests.e2.q001.level.min=20,c=>c.supplies.short.items.potion=999999,c=>c.parties[c.quests.e2.q250.parties[1]].members=['ada','nio','sera','berg']]){const c=structuredClone(catalog);mutate(c);assert.ok(questPartyErrors(d,c).length);}
});
test('synthetic prerequisite history awards nothing and is explicitly separated from the target run',()=>{
  const data=editions.e2,p=catalog.quests.e2.q300,t=createQuestTrial(data,catalog,{quest:'q300',party:p.parties[0],level:p.level.standard});
  assert.ok(t.prerequisites.includes('q299'));assert.equal(t.engine.state.quests.q300.stage,'active');assert.equal(t.engine.state.records.wins,0);assert.equal(t.engine.state.gold,120);assert.equal(t.engine.state.actors.ada.xp,data.system.xpBase*2*3);
  assert.equal(questTrialReport(t).setup.skippedApproach,false);
});
test('q006 site mode records its pre-start drainage; reception mode preserves the original flooded route',()=>{
  const a=createQuestTrial(editions.e1,catalog,{...options,quest:'q006',start:'site'}),b=createQuestTrial(editions.e1,catalog,{...options,quest:'q006'});
  assert.equal(a.setupActions.length,1);assert.equal(a.engine.state.dungeons.persistent.region_1.systems.water.controls.lower_gate,false);assert.equal(b.setupActions.length,0);assert.equal(b.engine.state.dungeons.persistent.region_1,undefined);
});
test('a normal q001 route reaches its authored ending with two different level-one parties',()=>{
  for(const party of ['balanced','sustain']){
    const t=createQuestTrial(editions.e1,catalog,{...options,party,start:'site'}),g=t.engine;drain(g);
    for(const id of ['talk','inspect','follow','support','home','report','repair']){assert.ok(dispatchQuestTrial(t,{type:'choose',id}),`${party}/${id}`);if(!t.finished){drain(g);finishJourney(g);if(g.state.battle)fight(g);}}
    const r=questTrialReport(t);assert.equal(r.status,'cleared');assert.equal(r.outcome,'informed');assert.equal(r.rescues,0);assert.deepEqual(validateSave(JSON.parse(g.save()),g.data),[]);
    const frozen=g.save();assert.equal(dispatchQuestTrial(t,{type:'advance'}),false);assert.equal(g.save(),frozen);r.party[0].hp=0;assert.notEqual(questTrialReport(t).party[0].hp,0);
  }
});
test('battle victories alone, alternative endings, changed members and field rescues do not certify the preset',()=>{
  const t=createQuestTrial(editions.e1,catalog,options);t.engine.state.records.battles=1;t.engine.state.records.wins=1;assert.equal(questTrialReport(t).status,'playing');
  t.engine.state.quests.q001={stage:'completed',evidence:[],outcome:'compromise'};assert.equal(questTrialReport(t).status,'other_outcome');
  t.engine.state.quests.q001.outcome='informed';t.engine.state.members.pop();assert.equal(questTrialReport(t).status,'changed_party');
  const rescued=createQuestTrial(editions.e1,catalog,options);rescued.engine.defeat();assert.equal(questTrialReport(rescued).status,'defeated');assert.equal(questTrialReport(rescued).rescues,1);
});
