import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {read} from '../tests/oddland-helpers.mjs';
import {data,ready,start,choose,go,drain} from '../tests/royal-helpers.mjs';

export const beforeAnchors = await read('tests/fixtures/e2-q068-before-cast.json');
const legacyQuest = data.previousQuestRoutes.q068;
function earlierData(quest) {
  const characters = {...data.characters};
  delete characters.q068_hoist_workers;
  delete characters.q068_survivors;
  return {...data,characters,quests:{...data.quests,q068:quest},scripts:{...data.scripts,...quest.scripts}};
}
export const beforeAnchorData = earlierData(beforeAnchors);
const legacyData = earlierData(legacyQuest);
export const anchorRoutes = [
  {choices:['cut'],outcome:'contract'},
  {choices:['fix'],outcome:'compromise'},
  {choices:['light','stay'],outcome:'compromise'},
  {choices:['light','people','abandon','finish'],outcome:'cargo'},
  {choices:['light','rope','continue','cut','finish'],outcome:'informed'},
  {choices:['light','people','fix','finish'],outcome:'compromise'},
  {choices:['light','rope','continue','fix','finish'],outcome:'compromise'},
];

export function anchorArtFixtures() {
  const fixtures = [], outcomes = new Set();
  const seed = ready().save();
  for (const [generation,content] of [['current',data],['previous',beforeAnchorData],['accepted-legacy',legacyData]]) {
    const legacy = content === legacyData;
    const game = new GameEngine(content);
    game.load(seed);
    game.random = () => .999999;
    if (legacy) {
      go(game,{kind:'town',location:'royal_board'});
      assert.ok(game.accept('q068'));
      const {map,x,y} = legacyQuest.locations.find(p => p.role === 'decision');
      go(game,{kind:'dungeon',dungeon:'region_7',map,x,y});
      game.run(legacyQuest.model.entryScript);
      drain(game);
    } else start(game,'q068');
    const entry = game.save();
    const seen = new Set();
    for (const {choices,outcome} of anchorRoutes) {
      game.load(entry);
      const actions = legacy ? choices.filter(id => id !== 'continue' && id !== 'finish') : choices;
      for (const action of actions) {
        const scene = legacy ? game.state.flags.flow.q068.node : game.state.stories.q068.scene;
        const towed = choices.includes('rope');
        const variant = ['secured','hoist_fix'].includes(scene) ? generation+(towed ? '-tow' : '-people') : generation;
        const key = scene+'/'+variant;
        if (!seen.has(key)) {
          seen.add(key);
          const cast = legacy || scene.startsWith('hoist_') ? [] : [scene === 'entry' ? 'q068_hoist_workers' : 'q068_survivors'];
          fixtures.push({edition:'e2',quest:'q068',scene,variant,cast,textOnlyCast:cast,absentStoryScene:legacy,
            keepClausesTogether:!legacy,save:game.save(),expectedText:projectGame(game).dialog.text,availableChoice:action,
            ...(scene === 'secured' ? {blockedChoice:towed ? 'abandon' : 'cut'} : {})});
        }
        if (legacy) {
          assert.ok(game.dispatch({type:'choose',id:action}));
          drain(game);
        } else choose(game,'q068',action);
      }
      assert.equal(game.state.quests.q068.outcome,outcome);
      outcomes.add('e2/q068/'+outcome);
    }
    assert.equal(seen.size,legacy ? 4 : 9);
  }
  return {fixtures,outcomes:[...outcomes]};
}
