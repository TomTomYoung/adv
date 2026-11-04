import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {read} from '../tests/oddland-helpers.mjs';
import {data,ready,start,choose,go,drain} from '../tests/royal-helpers.mjs';
import {fight} from '../tests/helpers.mjs';

export const beforeSeaKing = await read('tests/fixtures/e2-q069-before-cast.json');
const legacyQuest = data.previousQuestRoutes.q069;
function earlierData(quest) {
  const characters = {...data.characters};
  delete characters.q069_sea_king;
  return {...data,characters,quests:{...data.quests,q069:quest},scripts:{...data.scripts,...quest.scripts}};
}
export const beforeSeaKingData = earlierData(beforeSeaKing);
const legacyData = earlierData(legacyQuest);
export const seaKingRoutes = [
  {choices:['force'],outcome:'contract'},
  {choices:['help','shared'],outcome:'informed'},
  {choices:['help','single','continue','finish'],outcome:'compromise'},
  {choices:['pay','continue','leave','finish'],outcome:'compromise'},
  {choices:['pay','continue','return','shared'],outcome:'informed'},
  {choices:['pay','continue','return','leave','finish'],outcome:'compromise'},
];

export function seaKingArtFixtures() {
  const fixtures = [], outcomes = new Set(), seed = ready().save();
  for (const [generation,content] of [['current',data],['previous',beforeSeaKingData],['accepted-legacy',legacyData]]) {
    const legacy = content === legacyData, game = new GameEngine(content);
    game.load(seed);
    game.random = () => .999999;
    if (legacy) {
      go(game,{kind:'town',location:'royal_board'});
      assert.ok(game.accept('q069'));
      const {map,x,y} = legacyQuest.locations.find(p => p.role === 'decision');
      go(game,{kind:'dungeon',dungeon:'region_7',map,x,y});
      game.run(legacyQuest.model.entryScript);
      drain(game);
    } else start(game,'q069');
    const entry = game.save(), seen = new Set();
    for (const {choices,outcome} of seaKingRoutes) {
      game.load(entry);
      const actions = legacy ? choices.filter(id => id !== 'continue' && id !== 'finish') : choices;
      for (const action of actions) {
        const story = game.state.stories.q069;
        const scene = legacy ? game.state.flags.flow.q069.node : story.scene;
        const visitedWork = legacy ? scene === 'work' : story.events.some(e => ['entry_help','passed_return'].includes(e));
        const paid = legacy ? !!game.state.flags.flow.q069.paid : story.values.paid;
        const variant = [generation,paid ? 'paid' : 'unpaid',visitedWork ? 'work' : 'gate'].join('-');
        const key = scene+'/'+variant;
        if (!seen.has(key)) {
          seen.add(key);
          const present = !legacy && ['entry','entry_pay_ready','work','work_single_ready'].includes(scene);
          fixtures.push({edition:'e2',quest:'q069',scene,variant,cast:present ? ['q069_sea_king'] : [],
            ...(present ? {faces:{q069_sea_king:[.48,.072,.54,.105]},clearOfHud:true} : {}),
            absentStoryScene:legacy,save:game.save(),expectedText:projectGame(game).dialog.text,availableChoice:action,
            ...(!legacy && scene === 'work' ? {blockedChoice:paid ? 'single' : 'leave'} : {})});
        }
        if (legacy) {
          assert.ok(game.dispatch({type:'choose',id:action}));
          drain(game);
          if (game.state.battle) {game.healAll();fight(game);}
        } else choose(game,'q069',action);
      }
      assert.equal(game.state.quests.q069.outcome,outcome);
      outcomes.add('e2/q069/'+outcome);
    }
    assert.equal(seen.size,legacy ? 4 : 8);
  }
  return {fixtures,outcomes:[...outcomes]};
}
