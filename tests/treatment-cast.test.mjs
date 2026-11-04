import test from 'node:test';
import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {data,ready,start,choose,go,drain} from './royal-helpers.mjs';
import {beforeTreatment,beforeTreatmentData,treatmentArtFixtures,treatmentRoutes,treatmentCast,seraStatus} from '../tools/treatment-art-fixtures.mjs';

function load(content,raw) {
  const game = new GameEngine(content);game.load(raw);game.random = () => .999999;return game;
}
function entry() {
  const old = load(beforeTreatmentData,ready().save());start(old,'q161');return old.save();
}
function migrated(raw) {
  const expected = JSON.parse(raw), story = expected.state.stories.q161;
  if(story){story.revision=2;story.values.ineAt='clinic';}
  return expected;
}
const values = game => game.state.stories.q161.values;

test('q161 limits its change to five patient portraits, one healer meeting and the interrupted escort fix', () => {
  const quest=structuredClone(data.quests.q161);
  assert.deepEqual(quest.model.storyUpgrades[0].previous,beforeTreatment.story);
  for(const id of ['q161_patient','q161_ine'])assert.equal(data.characters[id].sprite,'npc_'+id);
  assert.deepEqual(quest.story.entities.patient,{holder:'patientAt',kind:'person',character:'q161_patient'});
  assert.deepEqual(quest.story.entities.ine,{holder:'ineAt',kind:'person',character:'q161_ine'});
  assert.deepEqual(quest.story.registry.ineAt.values,['clinic']);
  for(const [id,scene] of Object.entries(quest.story.scenes)) {
    assert.deepEqual(scene.cast.map(c=>quest.story.entities[c.entity].character),treatmentCast(id));scene.cast=[];
  }
  quest.story.actions.consent_sera.requires=beforeTreatment.story.actions.consent_sera.requires;
  delete quest.story.entities.patient.character;
  delete quest.story.entities.ine;delete quest.story.registry.ineAt;delete quest.model.storyUpgrades;
  quest.story.revision=quest.model.edition.revision=1;
  assert.deepEqual(quest,beforeTreatment);
});

test('q161 restores all 45 current, old and legacy waits while preserving dialogue and blocked choices', () => {
  const {fixtures,outcomes}=treatmentArtFixtures();assert.equal(fixtures.length,45);assert.equal(outcomes.length,3);
  for(const f of fixtures) {
    const game=load(data,f.save),dialog=projectGame(game).dialog;
    assert.equal(dialog.text,f.expectedText);
    assert.ok(dialog.options.find(o=>o.id===f.availableChoice).enabled);
    assert.deepEqual(JSON.parse(game.save()),migrated(f.save));
    if(f.absentStoryScene) {
      assert.equal(dialog.scene,undefined);assert.equal(game.state.stories.q161,undefined);
      assert.equal(game.state.flags.legacyStoryRoutes.q161,true);
    } else assert.deepEqual(dialog.scene.cast.map(c=>c.id),f.cast);
    for(const id of f.blockedChoices) {
      const saved=game.save();assert.equal(game.dispatch({type:'choose',id}),false);assert.equal(game.save(),saved);
    }
    if(f.variant.endsWith('absent')||f.variant.endsWith('incapacitated')) {
      assert.ok(f.blockedChoices.includes('sera'));
      if(f.absentStoryScene){assert.ok(game.dispatch({type:'choose',id:'clinic'}));drain(game);}
      else {
        choose(game,'q161','clinic');
        if(game.state.quests.q161.stage!=='completed')choose(game,'q161','finish');
      }
      assert.equal(game.state.quests.q161.outcome,'heal');
    }
  }
});

test('q161 preserves all eleven paths and three outcomes through migration and legacy resumption', () => {
  const initial=entry(),{fixtures}=treatmentArtFixtures();
  const legacy=fixtures.find(f=>f.absentStoryScene&&f.scene==='entry');
  assert.equal(treatmentRoutes.length,11);
  for(const route of treatmentRoutes) {
    const old=load(beforeTreatmentData,initial),game=load(data,initial);
    for(const action of route.choices) {
      choose(old,'q161',action);choose(game,'q161',action);
      assert.deepEqual(JSON.parse(game.save()),migrated(old.save()));
      assert.equal(load(data,old.save()).save(),game.save());
    }
    assert.equal(game.state.quests.q161.outcome,route.outcome);
    assert.equal(values(game).recorderAt,route.outcome==='recorded'?'patient':route.choices.includes('rent')?'party':'archive');
    const saved=game.save();assert.equal(game.accept('q161'),false);assert.throws(()=>game.complete('q161',route.outcome));assert.equal(game.save(),saved);
    const accepted=load(data,legacy.save);
    for(const action of route.legacy){assert.ok(accepted.dispatch({type:'choose',id:action}));drain(accepted);}
    assert.equal(accepted.state.quests.q161.outcome,route.outcome);assert.equal(accepted.state.stories.q161,undefined);
  }
});

test('q161 restores all eight distinct trips without premature recording, treatment or handover', () => {
  const initial=entry(),seen=new Set();
  for(const route of treatmentRoutes) {
    const old=load(beforeTreatmentData,initial);
    for(const action of route.choices) {
      const story=old.state.stories.q161,definition=beforeTreatment.story.actions[story.scene+'_'+action];
      const key=story.scene+'/'+action+'/'+story.values.recorded;
      if(definition.journey&&!seen.has(key)) {
        seen.add(key);const before=structuredClone(story.values);
        assert.ok(old.dispatch({type:'choose',id:action}));drain(old);
        const game=load(data,old.save()),to=definition.journey.to,escort=definition.journey.companions.includes('patient');
        assert.deepEqual(JSON.parse(game.save()),migrated(old.save()));
        assert.equal(values(game).partyAt,'transit');assert.equal(values(game).patientAt,escort?'transit':'entry');
        assert.equal(values(game).recorderAt,before.recorderAt);assert.equal(values(game).recorded,before.recorded);
        assert.equal(values(game).finished,false);assert.equal(values(game).ineAt,'clinic');
        go(game,{kind:'town',location:'royal_board'});assert.equal(game.dispatch({type:'story.resume',quest:'q161'}),false);
        const gold=game.state.gold;
        go(game,beforeTreatment.story.worldPlaces[to]);
        if(game.state.journey)assert.ok(game.dispatch({type:'story.resume',quest:'q161'}));drain(game);
        assert.equal(values(game).patientAt,escort?'clinic':'entry');assert.equal(values(game).ineAt,'clinic');
        assert.equal(values(game).recorded,before.recorded||key.startsWith('record_ready/'));
        assert.equal(values(game).recorderAt,before.recorderAt);assert.equal(game.state.gold,gold);
        assert.deepEqual(projectGame(game).dialog.scene.cast.map(c=>c.id),treatmentCast(game.state.stories.q161.scene));
        // Resume the old journey too, to continue exploring the same path.
        go(old,beforeTreatment.story.worldPlaces[to]);if(old.state.journey)assert.ok(old.dispatch({type:'story.resume',quest:'q161'}));drain(old);
      } else choose(old,'q161',action);
    }
  }
  assert.equal(seen.size,8);
});

test('q161 charges 20G only on rental, keeps a free return, and hands over the recorder only on finish', () => {
  const game=load(data,entry());choose(game,'q161','record');game.state.gold=19;
  const poor=game.save();assert.equal(game.dispatch({type:'choose',id:'rent'}),false);assert.equal(game.save(),poor);
  choose(game,'q161','back');assert.equal(values(game).recorderAt,'archive');choose(game,'q161','wait');
  assert.equal(game.state.quests.q161.outcome,'wait');
  const paid=load(data,entry());choose(paid,'q161','record');paid.state.gold=20;choose(paid,'q161','rent');
  assert.equal(paid.state.gold,0);assert.equal(values(paid).recorderAt,'party');assert.equal(values(paid).recorded,false);
  choose(paid,'q161','record');assert.equal(values(paid).recorded,true);
  choose(paid,'q161','recorded');assert.equal(values(paid).recorderAt,'party');assert.equal(values(paid).finished,false);
  choose(paid,'q161','finish');assert.equal(values(paid).recorderAt,'patient');assert.equal(paid.state.gold,129);
});

test('q161 rejects invalid holders atomically and rechecks Sera after an interrupted trip', () => {
  const initial=entry(),game=load(data,initial),valid=game.save();
  for(const [raw,key,value] of [[initial,'recorderAt','ine'],[valid,'recorderAt','ine'],[valid,'ineAt','entry']]) {
    const bad=JSON.parse(raw);bad.state.stories.q161.values[key]=value;
    assert.throws(()=>game.load(JSON.stringify(bad)));assert.equal(game.save(),valid);
  }
  for(const content of [data,beforeTreatmentData])for(const status of ['absent','incapacitated']) {
    const traveling=load(content,initial);
    choose(traveling,'q161','wish');assert.ok(traveling.dispatch({type:'choose',id:'sera'}));drain(traveling);
    // Party composition can actually change during the pending journey, before arrival.
    if(status==='absent')assert.ok(traveling.changeParty('leave','sera'));
    else seraStatus(traveling,status);
    const restored=load(data,traveling.save());go(restored,beforeTreatment.story.worldPlaces.clinic);
    if(restored.state.journey)assert.ok(restored.dispatch({type:'story.resume',quest:'q161'}));drain(restored);
    assert.equal(restored.state.stories.q161.scene,'treat_sera');assert.equal(values(restored).patientAt,'clinic');
    const saved=restored.save();assert.equal(restored.dispatch({type:'choose',id:'sera'}),false);assert.equal(restored.save(),saved);
    choose(restored,'q161','clinic');assert.equal(restored.state.quests.q161.outcome,'heal');
  }
});
