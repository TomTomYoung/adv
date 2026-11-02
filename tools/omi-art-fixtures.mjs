import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {read} from '../tests/oddland-helpers.mjs';
import {data, ready, start, choose, go, drain} from '../tests/royal-helpers.mjs';

export const beforeOmi = await read('tests/fixtures/e2-q066-before-cast.json');
const legacyQuest = data.previousQuestRoutes.q066;
function withEarlierQuest(quest) {
  const characters = {...data.characters};
  delete characters.q066_omi;
  return {...data, characters, quests:{...data.quests,q066:quest}, scripts:{...data.scripts,...quest.scripts}};
}
export const beforeOmiData = withEarlierQuest(beforeOmi);
const directRouteData = withEarlierQuest(legacyQuest);
export const exhibitRoutes = [
  {choices:['honor'], outcome:'contract'},
  {choices:['carry','facts'], outcome:'compromise'},
  {choices:['carry','manifest','rewrite'], outcome:'informed'},
  {choices:['carry','manifest','limited'], outcome:'compromise'},
];

function startDirectRoute(game) {
  go(game,{kind:'town',location:'royal_board'});
  assert.ok(game.accept('q066'));
  const point = legacyQuest.locations.find(p => p.role === 'decision');
  go(game,{kind:'dungeon',dungeon:'region_7',map:point.map,x:point.x,y:point.y});
  game.run(legacyQuest.model.entryScript);
  drain(game);
}

export async function omiArtFixtures() {
  const seed = ready().save();
  const fixtures = [];
  const outcomes = new Set();
  for (const [variant,content] of [['current',data],['previous',beforeOmiData],['accepted-legacy',directRouteData]]) {
    const direct = content === directRouteData;
    const seen = new Set();
    for (const {choices,outcome} of exhibitRoutes) {
      const game = new GameEngine(content);
      game.load(seed);
      game.random = () => .999999;
      if (direct) startDirectRoute(game);
      else start(game,'q066');
      for (const action of direct ? choices : [...choices,'finish']) {
        const scene = direct ? game.state.flags.flow.q066.node : game.state.stories.q066.scene;
        if (!seen.has(scene)) {
          seen.add(scene);
          const showsOmi = !direct && scene === 'evacuated';
          fixtures.push({
            edition:'e2',quest:'q066',scene,variant,cast:showsOmi ? ['q066_omi'] : [],
            ...(showsOmi ? {faces:{q066_omi:[.52,.094,.59,.123]},clearOfHud:true} : {}),
            absentStoryScene:direct,save:game.save(),availableChoice:action,expectedText:projectGame(game).dialog.text,
          });
        }
        if (direct) {
          assert.ok(game.dispatch({type:'choose',id:action}));
          drain(game);
        } else choose(game,'q066',action);
      }
      assert.equal(game.state.quests.q066.outcome,outcome);
      outcomes.add('e2/q066/'+outcome);
    }
    assert.equal(seen.size,direct ? 3 : 7);
  }
  return {fixtures,outcomes:[...outcomes]};
}
