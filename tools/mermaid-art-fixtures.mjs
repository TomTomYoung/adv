import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {read} from '../tests/oddland-helpers.mjs';
import {data,ready,start,choose,go,drain} from '../tests/royal-helpers.mjs';

export const beforeMermaid = await read('tests/fixtures/e2-q067-before-cast.json');
const legacyQuest = data.previousQuestRoutes.q067;
function earlierData(quest) {
  const characters = {...data.characters};
  delete characters.q067_mermaid;
  delete characters.q067_passers;
  return {...data,characters,quests:{...data.quests,q067:quest},scripts:{...data.scripts,...quest.scripts}};
}
export const beforeMermaidData = earlierData(beforeMermaid);
const legacyData = earlierData(legacyQuest);
export const gateRoutes = [
  {choices:['small','gate'],outcome:'informed'},
  {choices:['large','reset','gate'],outcome:'informed'},
  {choices:['force'],outcome:'contract'},
  {choices:['stop'],outcome:'compromise'},
  {choices:['large','evacuate'],outcome:'compromise'},
  {choices:['small','close'],outcome:'compromise'},
  {choices:['large','reset','close'],outcome:'compromise'},
];

function startLegacy(game) {
  go(game,{kind:'town',location:'royal_board'});
  assert.ok(game.accept('q067'));
  const point = legacyQuest.locations.find(p => p.role === 'decision');
  go(game,{kind:'dungeon',dungeon:'region_7',map:point.map,x:point.x,y:point.y});
  game.run(legacyQuest.model.entryScript);
  drain(game);
}

export async function mermaidArtFixtures() {
  const seed = ready().save();
  const fixtures = [];
  const outcomes = new Set();
  for (const [generation,content] of [['current',data],['previous',beforeMermaidData],['accepted-legacy',legacyData]]) {
    const legacy = content === legacyData;
    const seen = new Set();
    for (const {choices,outcome} of gateRoutes) {
      const game = new GameEngine(content);
      game.load(seed);
      game.random = () => .999999;
      if (legacy) startLegacy(game);
      else start(game,'q067');
      const actions = [...choices];
      if (!legacy) {
        if (outcome === 'compromise') actions.push('escort');
        actions.push('finish');
      }
      for (const [index,action] of actions.entries()) {
        const scene = legacy ? game.state.flags.flow.q067.node : game.state.stories.q067.scene;
        const variant = legacy ? generation : [generation,...actions.slice(0,index)].join('-');
        const key = scene+'/'+variant;
        if (!seen.has(key)) {
          seen.add(key);
          const mermaid = !legacy && scene !== 'forced';
          const passers = !legacy && scene === 'entry' ? ['q067_passers'] : [];
          fixtures.push({
            edition:'e2',quest:'q067',scene,variant,cast:mermaid ? ['q067_mermaid',...passers] : [],
            textOnlyCast:passers,...(mermaid ? {faces:{q067_mermaid:[.38,.091,.44,.121]},clearOfHud:true} : {}),
            keepSentencesTogether:!legacy && ['balanced','forced'].includes(scene),
            absentStoryScene:legacy,save:game.save(),availableChoice:action,expectedText:projectGame(game).dialog.text,
          });
        }
        if (legacy) {
          assert.ok(game.dispatch({type:'choose',id:action}));
          drain(game);
        } else choose(game,'q067',action);
      }
      assert.equal(game.state.quests.q067.outcome,outcome);
      outcomes.add('e2/q067/'+outcome);
    }
    assert.equal(seen.size,legacy ? 3 : 15);
  }
  return {fixtures,outcomes:[...outcomes]};
}
