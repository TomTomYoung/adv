import test from 'node:test';
import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {data, ready, start, go, drain} from './royal-helpers.mjs';
import {beforeFisherCast, beforeFisherData, fisherArtFixtures} from '../tools/fisher-art-fixtures.mjs';

test('q064 adds a stationary role only at the consultation, with the released revision as migration input', () => {
  const quest = structuredClone(data.quests.q064);
  assert.deepEqual(quest.model.storyUpgrades, [{
    fromRevision:1, toRevision:2, previous:beforeFisherCast.story, values:[{key:'fisherAt', value:'fishers'}],
  }]);
  assert.deepEqual(quest.story.registry.fisherAt.values, ['fishers']);
  assert.deepEqual(quest.story.entities.fisher, {kind:'group', holder:'fisherAt', character:'q064_fisher'});
  assert.deepEqual(quest.story.scenes.schedule.cast, [{entity:'fisher', x:50}]);
  assert.equal(data.characters.q064_fisher.name, '漁師');
  assert.equal(data.characters.q064_fisher.portrait, undefined);
  delete quest.story.registry.fisherAt;
  delete quest.story.entities.fisher;
  delete quest.model.storyUpgrades;
  quest.story.scenes.schedule.cast = [];
  quest.story.revision = quest.model.edition.revision = 1;
  assert.deepEqual(quest, beforeFisherCast);
});

test('q064 consultation is visible via either approach, including resumed saves and the pre-relocation route', async () => {
  const {fixtures, outcomes} = await fisherArtFixtures();
  assert.equal(fixtures.length, 15);
  assert.equal(outcomes.length, 3);
  for (const fixture of fixtures) {
    const game = new GameEngine(data);
    game.load(fixture.save);
    const scene = projectGame(game).dialog.scene;
    if (fixture.absentStoryScene) {
      assert.equal(scene, undefined);
      assert.equal(game.state.flags.legacyStoryRoutes.q064, true);
      assert.equal(game.state.stories.q064, undefined);
    } else {
      assert.deepEqual(scene.cast.map(person => person.id), fixture.cast);
      const expected = JSON.parse(fixture.save);
      expected.state.stories.q064.revision = 2;
      expected.state.stories.q064.values.fisherAt = 'fishers';
      assert.deepEqual(JSON.parse(game.save()), expected);
    }
  }
});

test('q064 migrates a journey before arrival and rejects impossible fisher locations atomically', () => {
  const old = new GameEngine(beforeFisherData);
  old.load(ready().save());
  old.random = () => .999999;
  start(old, 'q064');
  for (const id of ['after','fish']) {
    assert.ok(old.dispatch({type:'choose', id}));
    drain(old);
    if (id === 'after') {
      go(old, beforeFisherCast.story.worldPlaces.bay);
      drain(old);
    }
  }
  assert.equal(old.state.journey.action, 'bay_fish');
  const raw = old.save();
  const game = new GameEngine(data);
  game.load(raw);
  const expected = JSON.parse(raw);
  expected.state.stories.q064.revision = 2;
  expected.state.stories.q064.values.fisherAt = 'fishers';
  assert.deepEqual(JSON.parse(game.save()), expected);
  const saved = game.save();
  for (const badPlace of ['bay', 'transit', 'entry']) {
    const invalid = JSON.parse(saved);
    invalid.state.stories.q064.values.fisherAt = badPlace;
    assert.throws(() => game.load(JSON.stringify(invalid)));
    assert.equal(game.save(), saved);
  }
  game.random = () => .999999;
  go(game, beforeFisherCast.story.worldPlaces.fishers);
  drain(game);
  assert.equal(game.state.stories.q064.values.observed, false);
  assert.deepEqual(projectGame(game).dialog.scene.cast.map(person => person.id), ['q064_fisher']);
});
