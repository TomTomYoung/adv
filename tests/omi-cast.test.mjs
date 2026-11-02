import test from 'node:test';
import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {data,ready,start,choose,go,drain} from './royal-helpers.mjs';
import {beforeOmi,beforeOmiData,exhibitRoutes,omiArtFixtures} from '../tools/omi-art-fixtures.mjs';

function reload(raw) {
  const game = new GameEngine(data);
  game.load(raw);
  game.random = () => .999999;
  return game;
}

test('q066 changes only the archive cast, the revision and its migration', () => {
  const quest = structuredClone(data.quests.q066);
  assert.deepEqual(quest.model.storyUpgrades,[{fromRevision:1,toRevision:2,previous:beforeOmi.story,values:[{key:'omiAt',value:'records'}]}]);
  assert.deepEqual(quest.story.scenes.evacuated.cast,[{entity:'omi',x:50}]);
  assert.deepEqual(quest.story.entities.omi,{kind:'person',holder:'omiAt',character:'q066_omi'});
  assert.deepEqual(quest.story.registry.omiAt.values,['records']);
  assert.equal(data.characters.q066_omi.sprite,'npc_q066_omi');
  assert.equal(data.characters.q066_omi.name,quest.client);
  delete quest.model.storyUpgrades;
  delete quest.story.entities.omi;
  delete quest.story.registry.omiAt;
  quest.story.revision = quest.model.edition.revision = 1;
  quest.story.scenes.evacuated.cast = [];
  assert.deepEqual(quest,beforeOmi);
});

test('q066 loads every old waiting state, preserving its prose, evidence and choice', async () => {
  const {fixtures,outcomes} = await omiArtFixtures();
  assert.equal(fixtures.length,17);
  assert.equal(outcomes.length,3);
  for (const f of fixtures) {
    const game = reload(f.save);
    const dialog = projectGame(game).dialog;
    assert.equal(dialog.text,f.expectedText);
    assert.ok(dialog.options.find(o => o.id === f.availableChoice).enabled);
    if (f.absentStoryScene) {
      assert.equal(dialog.scene,undefined);
      assert.equal(game.state.stories.q066,undefined);
      assert.equal(game.state.flags.legacyStoryRoutes.q066,true);
      continue;
    }
    assert.deepEqual(dialog.scene.cast.map(c => c.id),f.cast);
    const expected = JSON.parse(f.save);
    expected.state.stories.q066.revision = 2;
    expected.state.stories.q066.values.omiAt = 'records';
    assert.deepEqual(JSON.parse(game.save()),expected);
  }
  const entry = fixtures.find(f => f.scene === 'entry' && f.absentStoryScene);
  for (const {choices,outcome} of exhibitRoutes) {
    const game = reload(entry.save);
    for (const id of choices) {
      assert.ok(game.dispatch({type:'choose',id}));
      drain(game);
    }
    assert.equal(game.state.quests.q066.outcome,outcome);
    assert.equal(game.state.stories.q066,undefined);
  }
});

test('q066 learns the evacuation only in the archive and delivers each load after actual arrival', () => {
  const seed = ready().save();
  const places = beforeOmi.story.worldPlaces;
  for (const {choices,outcome} of exhibitRoutes) {
    let game = new GameEngine(beforeOmiData);
    game.load(seed);
    game.random = () => .999999;
    start(game,'q066');
    const checked = choices.includes('manifest');
    if (choices.includes('carry')) {
      choose(game,'q066','carry');
      assert.equal(game.state.stories.q066.values.armorAt,'party');
      assert.equal(game.state.stories.q066.values.boardingAt,'entry');
    }
    if (checked) {
      assert.ok(game.dispatch({type:'choose',id:'manifest'}));
      drain(game);
      game = reload(game.save());
      assert.ok(game.dispatch({type:'retreat'}));
      go(game,places.exhibit);
      assert.equal(game.dispatch({type:'story.resume',quest:'q066'}),false);
      const story = game.state.stories.q066;
      assert.equal(story.values.boardingAt,'party');
      assert.equal(story.values.armorAt,'party');
      assert.deepEqual(story.knowledge,{});
      go(game,places.records);
      if (game.state.journey) assert.ok(game.dispatch({type:'story.resume',quest:'q066'}));
      drain(game);
      assert.deepEqual(game.state.stories.q066.knowledge.party,['truth']);
      assert.deepEqual(projectGame(game).dialog.scene.cast.map(c => c.id),['q066_omi']);
    }
    assert.ok(game.dispatch({type:'choose',id:choices.at(-1)}));
    drain(game);
    game = reload(game.save());
    const carried = game.state.stories.q066.values;
    assert.equal(carried.armorAt,'party');
    assert.equal(carried.boardingAt,checked ? 'party' : 'entry');
    assert.equal(carried.omiAt,'records');
    go(game,places.exhibit);
    if (game.state.journey) assert.ok(game.dispatch({type:'story.resume',quest:'q066'}));
    drain(game);
    const story = game.state.stories.q066;
    assert.equal(story.values.armorAt,'exhibit');
    assert.equal(story.values.boardingAt,checked ? 'exhibit' : 'entry');
    assert.equal(story.values.empty,choices.includes('carry'));
    assert.deepEqual(story.knowledge.party ?? [],checked ? ['truth'] : []);
    assert.deepEqual(projectGame(game).dialog.scene.cast,[]);
    choose(game,'q066','finish');
    assert.equal(game.state.quests.q066.outcome,outcome);
  }
});

test('q066 rejects an invented handoff to Omi or a displaced historian atomically', () => {
  const previous = new GameEngine(beforeOmiData);
  previous.load(ready().save());
  previous.random = () => .999999;
  start(previous,'q066');
  const game = reload(previous.save());
  const valid = game.save();
  for (const raw of [previous.save(),valid]) {
    for (const key of ['armorAt','boardingAt']) {
      const bad = JSON.parse(raw);
      bad.state.stories.q066.values[key] = 'omi';
      assert.throws(() => game.load(JSON.stringify(bad)));
      assert.equal(game.save(),valid);
    }
  }
  const bad = JSON.parse(valid);
  bad.state.stories.q066.values.omiAt = 'exhibit';
  assert.throws(() => game.load(JSON.stringify(bad)));
  assert.equal(game.save(),valid);
});
