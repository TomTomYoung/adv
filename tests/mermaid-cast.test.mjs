import test from 'node:test';
import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {data,ready,start,choose,go,drain} from './royal-helpers.mjs';
import {beforeMermaid,beforeMermaidData,gateRoutes,mermaidArtFixtures} from '../tools/mermaid-art-fixtures.mjs';

function load(content,raw) {
  const game = new GameEngine(content);
  game.load(raw);
  game.random = () => .999999;
  return game;
}

test('q067 retains the released actions and companion domain and adds only the two cast bindings and one location', () => {
  const quest = structuredClone(data.quests.q067);
  assert.deepEqual(quest.model.storyUpgrades,[{fromRevision:1,toRevision:2,previous:beforeMermaid.story,values:[{key:'passersAt',value:'entry'}]}]);
  assert.equal(quest.story.entities.mermaid.character,'q067_mermaid');
  assert.equal(data.characters.q067_mermaid.sprite,'npc_q067_mermaid');
  assert.deepEqual(quest.story.entities.passers,{kind:'group',holder:'passersAt',character:'q067_passers'});
  assert.deepEqual(quest.story.registry.passersAt.values,['entry']);
  assert.equal(data.characters.q067_passers.name,'通行人');
  assert.equal(data.characters.q067_passers.sprite,undefined);
  for (const [id,scene] of Object.entries(quest.story.scenes)) {
    const expected = id === 'entry' ? ['mermaid','passers'] : id === 'forced' ? [] : ['mermaid'];
    assert.deepEqual(scene.cast.map(c => c.entity),expected);
    scene.cast = [];
  }
  delete quest.model.storyUpgrades;
  delete quest.story.entities.mermaid.character;
  delete quest.story.entities.passers;
  delete quest.story.registry.passersAt;
  quest.story.revision = quest.model.edition.revision = 1;
  assert.deepEqual(quest,beforeMermaid);
});

test('q067 preserves waiting saves on every branch and finishes all seven pre-relocation routes', async () => {
  const {fixtures,outcomes} = await mermaidArtFixtures();
  assert.equal(fixtures.length,33);
  assert.equal(outcomes.length,3);
  for (const f of fixtures) {
    const game = load(data,f.save);
    const dialog = projectGame(game).dialog;
    assert.equal(dialog.text,f.expectedText);
    assert.ok(dialog.options.find(o => o.id === f.availableChoice).enabled);
    if (f.absentStoryScene) {
      assert.equal(dialog.scene,undefined);
      assert.equal(game.state.flags.legacyStoryRoutes.q067,true);
      assert.equal(game.state.stories.q067,undefined);
      continue;
    }
    const expected = JSON.parse(f.save);
    expected.state.stories.q067.revision = 2;
    expected.state.stories.q067.values.passersAt = 'entry';
    assert.deepEqual(JSON.parse(game.save()),expected);
    assert.deepEqual(dialog.scene.cast.map(c => c.id),f.cast);
    const values = game.state.stories.q067.values;
    assert.equal(values.mermaidAt,f.scene === 'forced' ? 'entry' : values.partyAt);
    assert.equal(values.balanced,/small|reset/.test(f.variant));
    assert.equal(values.retried,f.variant.includes('reset'));
    assert.equal(values.stopped,['stopped','evacuated'].includes(f.scene));
  }
  const entry = fixtures.find(f => f.absentStoryScene && f.scene === 'entry');
  for (const route of gateRoutes) {
    const game = load(data,entry.save);
    for (const id of route.choices) {
      assert.ok(game.dispatch({type:'choose',id}));
      drain(game);
    }
    assert.equal(game.state.quests.q067.outcome,route.outcome);
    assert.equal(game.state.stories.q067,undefined);
  }
});

test('q067 migrates all eight journeys in transit, including the gate approached alone', () => {
  const places = beforeMermaid.story.worldPlaces;
  const seed = ready().save();
  const trips = [
    [[], 'large','gate'], [[], 'small','valve'], [[], 'stop','valve'], [[], 'force','gate'],
    [['large'],'reset','valve'], [['large'],'evacuate','valve'], [['small'],'gate','gate'],
    [['stop'],'escort','refuge'],
  ];
  for (const [approach,action,to] of trips) {
    const old = load(beforeMermaidData,seed);
    start(old,'q067');
    for (const id of approach) choose(old,'q067',id);
    assert.ok(old.dispatch({type:'choose',id:action}));
    drain(old);
    const follows = action !== 'force';
    const game = load(data,old.save());
    assert.equal(game.state.stories.q067.values.mermaidAt,follows ? 'transit' : 'entry');
    assert.equal(game.state.stories.q067.values.passersAt,'entry');
    assert.ok(game.dispatch({type:'retreat'}));
    go(game,{kind:'town',location:'royal_board'});
    assert.equal(game.dispatch({type:'story.resume',quest:'q067'}),false);
    assert.equal(game.state.stories.q067.values.partyAt,'transit');
    assert.equal(game.state.stories.q067.values.mermaidAt,follows ? 'transit' : 'entry');
    go(game,places[to]);
    if (game.state.journey) assert.ok(game.dispatch({type:'story.resume',quest:'q067'}));
    drain(game);
    const values = game.state.stories.q067.values;
    assert.equal(values.partyAt,to);
    assert.equal(values.mermaidAt,follows ? to : 'entry');
    assert.equal(values.passersAt,'entry');
    assert.deepEqual(projectGame(game).dialog.scene.cast.map(c => c.id), follows ? ['q067_mermaid'] : []);
  }
});

test('q067 rejects teleporting a companion out of transit or moving a bystander out of the entrance', () => {
  const old = load(beforeMermaidData,ready().save());
  start(old,'q067');
  assert.ok(old.dispatch({type:'choose',id:'small'}));
  drain(old);
  const game = load(data,old.save());
  const valid = game.save();
  for (const raw of [old.save(),valid]) {
    const bad = JSON.parse(raw);
    bad.state.stories.q067.values.mermaidAt = 'valve';
    assert.throws(() => game.load(JSON.stringify(bad)));
    assert.equal(game.save(),valid);
  }
  const bad = JSON.parse(valid);
  bad.state.stories.q067.values.passersAt = 'gate';
  assert.throws(() => game.load(JSON.stringify(bad)));
  assert.equal(game.save(),valid);
});
