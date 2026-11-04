import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {read} from '../tests/oddland-helpers.mjs';
import {data,ready,start,choose,go,drain} from '../tests/royal-helpers.mjs';
import {fight} from '../tests/helpers.mjs';

export const beforePortPeople = await read('tests/fixtures/e2-q070-before-cast.json');
const legacyQuest = data.previousQuestRoutes.q070;
function earlierData(quest) {
  const characters = {...data.characters};
  delete characters.q070_port_people;
  return {...data,characters,quests:{...data.quests,q070:quest},scripts:{...data.scripts,...quest.scripts}};
}
export const beforePortPeopleData = earlierData(beforePortPeople);
const legacyData = earlierData(legacyQuest);
const evacuate = ['divide','evacuate','escort','back'];
const outer = [...evacuate,'outer','back'];
const store = [...outer,'store','back'];
export const portPeopleRoutes = [
  {choices:['all'],outcome:'contract'},
  {choices:['salvage','carry','finish'],outcome:'compromise'},
  ...[['divide'],evacuate,outer,store].map(choices => ({choices:[...choices,'stop','carry','finish'],outcome:'compromise'})),
  {choices:[...store,'core','finish'],outcome:'informed'},
];
export const portPeoplePhase = v => v.core ? 'core' : v.store ? 'store' : v.outer ? 'outer' : v.evacuated ? 'evacuated' : 'before-evacuation';
export const portPeopleLegacyChoices = choices => choices.filter(id => !['escort','back','carry','finish'].includes(id));

export function portPeopleArtFixtures() {
  const fixtures = [], outcomes = new Set(), initial = ready();
  initial.state.vars.region_7 = 3;
  const seed = initial.save();
  for (const [generation,content] of [['current',data],['previous',beforePortPeopleData],['accepted-legacy',legacyData]]) {
    const legacy = content === legacyData, game = new GameEngine(content);
    game.load(seed);
    game.random = () => .999999;
    if (legacy) {
      go(game,{kind:'town',location:'royal_board'});
      assert.ok(game.accept('q070'));
      const {map,x,y} = legacyQuest.locations.find(p => p.role === 'decision');
      go(game,{kind:'dungeon',dungeon:'region_7',map,x,y});
      game.run(legacyQuest.model.entryScript);drain(game);
    } else start(game,'q070');
    const entry = game.save(), seen = new Set();
    for (const {choices,outcome} of portPeopleRoutes) {
      game.load(entry);
      for (const action of legacy ? portPeopleLegacyChoices(choices) : choices) {
        const v = legacy ? game.state.flags.flow.q070 : game.state.stories.q070.values;
        const scene = legacy ? v.node : game.state.stories.q070.scene;
        const variant = generation+'-'+portPeoplePhase(v), key = scene+'/'+variant;
        if (!seen.has(key)) {
          seen.add(key);
          const cast = !legacy && ['harbor_wait','safe'].includes(scene) ? ['q070_port_people'] : [];
          const dialog = projectGame(game).dialog;
          fixtures.push({edition:'e2',quest:'q070',scene,variant,cast,textOnlyCast:cast,absentStoryScene:legacy,
            save:game.save(),expectedText:dialog.text,availableChoice:action,
            ...(scene === 'districts' ? {blockedChoices:dialog.options.filter(o => !o.enabled).map(o => o.id)} : {})});
        }
        if (legacy) {
          assert.ok(game.dispatch({type:'choose',id:action}));drain(game);
          if (game.state.battle) {game.healAll();fight(game);}
        } else choose(game,'q070',action);
      }
      assert.equal(game.state.quests.q070.outcome,outcome);
      outcomes.add('e2/q070/'+outcome);
    }
    assert.equal(seen.size,legacy ? 5 : 18);
  }
  return {fixtures,outcomes:[...outcomes]};
}
