import test from 'node:test';
import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {data, ready, start, choose, go, drain} from './royal-helpers.mjs';
import {beforeMourners, beforeMournerData, mournerArtFixtures} from '../tools/mourner-art-fixtures.mjs';

test('q065 keeps the released routes, holder domains and rewards when adding the shore cast', () => {
  const quest = structuredClone(data.quests.q065);
  assert.deepEqual(quest.model.storyUpgrades, [{
    fromRevision:1, toRevision:2, previous:beforeMourners.story, values:[{key:'mournersAt', value:'shore'}],
  }]);
  assert.deepEqual(quest.story.scenes.ashore.cast, [{entity:'mourners',x:50}]);
  assert.deepEqual(quest.story.entities.mourners, {kind:'group', holder:'mournersAt', character:'q065_mourners'});
  assert.deepEqual(quest.story.registry.mournersAt.values, ['shore']);
  assert.equal(data.characters.q065_mourners.name,'遺族');
  const script = 'q065.sunken.oil_supply';
  const supply = quest.model.graph.find(node => node.id === 'oil_supply');
  assert.match(supply.text, /運ぶ分を確かめた/);
  assert.equal(quest.scripts[script].commands[1].text, supply.text);
  supply.text = beforeMourners.model.graph.find(node => node.id === 'oil_supply').text;
  quest.scripts[script].commands[1].text = supply.text;
  delete quest.model.storyUpgrades;
  delete quest.story.registry.mournersAt;
  delete quest.story.entities.mourners;
  quest.story.revision = quest.model.edition.revision = 1;
  quest.story.scenes.ashore.cast = [];
  assert.deepEqual(quest, beforeMourners);
});

test('q065 reloads tide phases and both shore routes with their original waiting prose', async () => {
  const {fixtures,outcomes} = await mournerArtFixtures();
  assert.equal(fixtures.length,26);
  assert.equal(outcomes.length,3);
  for (const fixture of fixtures) {
    const game = new GameEngine(data);
    game.load(fixture.save);
    const dialog = projectGame(game).dialog;
    assert.equal(dialog.text, fixture.expectedText);
    if (fixture.absentStoryScene) {
      assert.equal(dialog.scene,undefined);
      assert.equal(game.state.stories.q065,undefined);
      assert.equal(game.state.flags.legacyStoryRoutes.q065,true);
      continue;
    }
    const expected = JSON.parse(fixture.save);
    expected.state.stories.q065.revision = 2;
    expected.state.stories.q065.values.mournersAt = 'shore';
    assert.deepEqual(JSON.parse(game.save()),expected);
    assert.deepEqual(dialog.scene.cast.map(person => person.id),fixture.cast);
    const values = game.state.stories.q065.values;
    if (fixture.scene === 'ashore') assert.equal(values.lampAt,'shore');
    if (fixture.scene === 'tide') {
      assert.equal(dialog.options.find(o => o.id === 'join').enabled,values.phase === 1);
      assert.equal(dialog.options.find(o => o.id === 'cycle').enabled,values.phase === 2);
    }
  }
});

test('q065 resumes both shore journeys and the oil delivery with the item still in transit', () => {
  const places = beforeMourners.story.worldPlaces;
  const seed = ready().save();
  for (const [first, departure, item, destination, owner] of [
    [null, 'shore', 'lampAt', 'shore', 'shore'],
    ['wait', 'return', 'lampAt', 'shore', 'shore'],
    ['oil', 'pour', 'ritualOilAt', 'entry', 'lamp'],
  ]) {
    const old = new GameEngine(beforeMournerData);
    old.load(seed);
    old.random = () => .999999;
    start(old,'q065');
    if (first) choose(old,'q065',first);
    if (first === 'oil') assert.equal(old.state.stories.q065.values.ritualOilAt,'supply');
    assert.ok(old.dispatch({type:'choose',id:departure}));
    drain(old);
    assert.equal(old.state.stories.q065.values[item],'party');
    const game = new GameEngine(data);
    game.load(old.save());
    game.random = () => .999999;
    const expected = JSON.parse(old.save());
    expected.state.stories.q065.revision = 2;
    expected.state.stories.q065.values.mournersAt = 'shore';
    assert.deepEqual(JSON.parse(game.save()),expected);
    assert.ok(game.dispatch({type:'retreat'}));
    assert.equal(game.state.townLocation,'oddland_village');
    go(game,{kind:'town',location:'royal_fishers'});
    assert.equal(game.dispatch({type:'story.resume',quest:'q065'}),false);
    assert.equal(game.state.stories.q065.values[item],'party');
    go(game,places[destination]);
    drain(game);
    assert.equal(game.state.stories.q065.values[item],owner);
    assert.deepEqual(projectGame(game).dialog.scene.cast.map(person => person.id),
      destination === 'shore' ? ['q065_mourners'] : []);
  }
});

test('q065 shows the revised supply text when a previous journey arrives after loading', () => {
  const previous = new GameEngine(beforeMournerData);
  previous.load(ready().save());
  previous.random = () => .999999;
  start(previous,'q065');
  assert.ok(previous.dispatch({type:'choose',id:'oil'}));
  drain(previous);
  const game = new GameEngine(data);
  game.load(previous.save());
  game.random = () => .999999;
  go(game,beforeMourners.story.worldPlaces.supply);
  drain(game);
  assert.match(projectGame(game).dialog.text, /運ぶ分を確かめた/);
  assert.equal(game.state.stories.q065.values.ritualOilAt,'supply');
});

test('q065 rejects invented item owners and off-shore mourners without partially migrating the save', () => {
  const previous = new GameEngine(beforeMournerData);
  previous.load(ready().save());
  previous.random = () => .999999;
  start(previous,'q065');
  const game = new GameEngine(data);
  game.load(previous.save());
  const current = game.save();
  for (const raw of [previous.save(),current]) {
    for (const [key,value] of [['lampAt','mourners'],['ritualOilAt','mourners'],['phase',3]]) {
      const bad = JSON.parse(raw);
      bad.state.stories.q065.values[key] = value;
      assert.throws(() => game.load(JSON.stringify(bad)));
      assert.equal(game.save(),current);
    }
  }
  const bad = JSON.parse(current);
  bad.state.stories.q065.values.mournersAt = 'supply';
  assert.throws(() => game.load(JSON.stringify(bad)));
  assert.equal(game.save(),current);
});
