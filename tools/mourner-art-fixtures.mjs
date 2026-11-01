import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {read} from '../tests/oddland-helpers.mjs';
import {data, ready, start, choose, go, drain} from '../tests/royal-helpers.mjs';

export const beforeMourners = await read('tests/fixtures/e2-q065-before-cast.json');
const legacyQuest = data.previousQuestRoutes.q065;
function withEarlierQuest(quest) {
  const characters = {...data.characters};
  delete characters.q065_mourners;
  return {...data, characters, quests:{...data.quests, q065:quest}, scripts:{...data.scripts, ...quest.scripts}};
}
export const beforeMournerData = withEarlierQuest(beforeMourners);
const directRouteData = withEarlierQuest(legacyQuest);

const paths = [
  {choices:['shore'], outcome:'compromise'},
  {choices:['oil'], outcome:'contract'},
  ...[0, 1, 2].map(phase => ({
    choices:['wait', ...Array(phase).fill('wait'), 'return'], outcome:'compromise',
  })),
  {choices:['wait', 'wait', 'wait', 'cycle', 'wait', 'join'], outcome:'informed'},
];

function startDirectRoute(game) {
  go(game, {kind:'town', location:'royal_board'});
  assert.ok(game.accept('q065'));
  const point = legacyQuest.locations.find(place => place.role === 'decision');
  go(game, {kind:'dungeon', dungeon:'region_7', map:point.map, x:point.x, y:point.y});
  game.run(legacyQuest.model.entryScript);
  drain(game);
}

export async function mournerArtFixtures() {
  const seed = ready().save();
  const fixtures = [];
  const outcomes = new Set();
  for (const [generation, content] of [['current', data], ['previous', beforeMournerData], ['accepted-legacy', directRouteData]]) {
    const direct = content === directRouteData;
    const seen = new Set();
    for (const {choices, outcome} of paths) {
      const game = new GameEngine(content);
      game.load(seed);
      game.random = () => .999999;
      if (direct) startDirectRoute(game);
      else start(game, 'q065');
      const actions = [...choices];
      if (!direct) {
        if (outcome === 'contract') actions.push('pour');
        actions.push('finish');
      }
      for (const action of actions) {
        const story = game.state.stories.q065;
        const flow = game.state.flags.flow?.q065;
        const scene = direct ? flow.node : story.scene;
        const phase = direct ? flow.phase : story.values.phase;
        let variant = generation;
        if (scene === 'tide') variant += '-'+phase;
        if (scene === 'ashore') variant += choices[0] === 'shore' ? '-direct' : '-return-'+phase;
        const key = scene+'/'+variant;
        if (!seen.has(key)) {
          seen.add(key);
          const cast = scene === 'ashore' ? ['q065_mourners'] : [];
          fixtures.push({
            edition:'e2', quest:'q065', scene, variant, cast, textOnlyCast:cast,
            absentStoryScene:direct, save:game.save(), availableChoice:action,
            expectedText:projectGame(game).dialog.text,
          });
        }
        if (direct) {
          assert.ok(game.dispatch({type:'choose', id:action}));
          drain(game);
        } else choose(game, 'q065', action);
      }
      assert.equal(game.state.quests.q065.outcome, outcome);
      outcomes.add('e2/q065/'+outcome);
    }
    assert.equal(seen.size, direct ? 4 : 11);
  }
  return {fixtures, outcomes:[...outcomes]};
}
