import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {read} from '../tests/oddland-helpers.mjs';
import {data, ready, start, choose, go, drain} from '../tests/royal-helpers.mjs';

export const beforeFisherCast = await read('tests/fixtures/e2-q064-before-cast.json');
const oldRoute = data.previousQuestRoutes.q064;
const choices = {entry:'before', pressure:'bell', bay:'fish', bell_ready:'finish', schedule:'finish'};
const routes = [
  ['contract', 'break'],
  ['informed', 'before', 'bell', 'finish'],
  ['compromise', 'before', 'schedule', 'finish'],
  ['compromise', 'after', 'fish', 'finish'],
  ['informed', 'after', 'mechanism', 'bell', 'finish'],
  ['compromise', 'after', 'mechanism', 'schedule', 'finish'],
];

function withPreviousQuest(quest) {
  const characters = {...data.characters};
  delete characters.q064_fisher;
  return {...data, characters, quests:{...data.quests, q064:quest}, scripts:{...data.scripts, ...quest.scripts}};
}
export const beforeFisherData = withPreviousQuest(beforeFisherCast);
const oldRouteData = withPreviousQuest(oldRoute);

export async function fisherArtFixtures() {
  const seed = ready().save();
  const fixtures = [];
  const outcomes = new Set();
  for (const [variant, content] of [['current', data], ['previous', beforeFisherData], ['accepted-legacy', oldRouteData]]) {
    const legacy = content === oldRouteData;
    const seen = new Set();
    for (const [outcome, ...path] of routes) {
      const game = new GameEngine(content);
      game.load(seed);
      game.random = () => .999999;
      if (legacy) {
        go(game, {kind:'town', location:'royal_board'});
        assert.ok(game.accept('q064'));
        const place = oldRoute.locations.find(p => p.role === 'decision');
        go(game, {kind:'dungeon', dungeon:'region_7', map:place.map, x:place.x, y:place.y});
        game.run(oldRoute.model.entryScript);
        drain(game);
      } else {
        start(game, 'q064');
      }
      for (const action of path) {
        if (legacy && action === 'finish') continue;
        const story = game.state.stories.q064;
        const scene = legacy ? game.state.flags.flow.q064.node : story.scene;
        const fromBay = scene === 'schedule' && !story.values.observed;
        const key = fromBay ? 'schedule-bay' : scene;
        if (!seen.has(key)) {
          seen.add(key);
          const cast = !legacy && scene === 'schedule' ? ['q064_fisher'] : [];
          fixtures.push({
            edition:'e2', quest:'q064', scene, variant:fromBay ? variant+'-bay' : variant,
            cast, textOnlyCast:cast, absentStoryScene:legacy,
            save:game.save(), availableChoice:choices[scene], expectedText:projectGame(game).dialog.text,
          });
        }
        if (legacy) {
          assert.ok(game.dispatch({type:'choose', id:action}));
          drain(game);
        } else {
          choose(game, 'q064', action);
        }
      }
      assert.equal(game.state.quests.q064.outcome, outcome);
      outcomes.add('e2/q064/'+outcome);
    }
    assert.equal(seen.size, legacy ? 3 : 6);
  }
  return {fixtures, outcomes:[...outcomes]};
}
