import test from 'node:test';
import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {data,ready,start,choose,go,drain} from './royal-helpers.mjs';
import {beforeAnchors,beforeAnchorData,anchorArtFixtures,anchorRoutes} from '../tools/anchor-art-fixtures.mjs';

function load(content,raw) {
  const game = new GameEngine(content);
  game.load(raw);
  game.random = () => .999999;
  return game;
}

test('q068 adds two local labels and one stationary holder to the released quest', () => {
  const quest = structuredClone(data.quests.q068);
  assert.deepEqual(quest.model.storyUpgrades,[{fromRevision:1,toRevision:2,previous:beforeAnchors.story,values:[{key:'hoistWorkersAt',value:'entry'}]}]);
  assert.deepEqual(quest.story.entities.hoistWorkers,{holder:'hoistWorkersAt',kind:'group',character:'q068_hoist_workers'});
  assert.deepEqual(quest.story.registry.hoistWorkersAt.values,['entry']);
  assert.equal(quest.story.entities.survivors.character,'q068_survivors');
  for (const [id,name] of [['q068_hoist_workers','吊上げ人'],['q068_survivors','避難筏の人たち']]) {
    assert.equal(data.characters[id].name,name);
    assert.equal(data.characters[id].sprite,undefined);
  }
  for (const [id,scene] of Object.entries(quest.story.scenes)) {
    assert.deepEqual(scene.cast.map(c => c.entity),id === 'entry' ? ['hoistWorkers'] : id.startsWith('hoist_') ? [] : ['survivors']);
    scene.cast = [];
  }
  delete quest.model.storyUpgrades;
  delete quest.story.entities.hoistWorkers;
  delete quest.story.registry.hoistWorkersAt;
  delete quest.story.entities.survivors.character;
  quest.model.edition.revision = quest.story.revision = 1;
  assert.deepEqual(quest,beforeAnchors);
});

test('q068 reloads each waiting scene and both raft states, and completes all seven older accepted routes', () => {
  const {fixtures,outcomes} = anchorArtFixtures();
  assert.equal(fixtures.length,22);
  assert.equal(outcomes.length,4);
  for (const f of fixtures) {
    const game = load(data,f.save);
    const dialog = projectGame(game).dialog;
    assert.equal(dialog.text,f.expectedText);
    assert.ok(dialog.options.find(o => o.id === f.availableChoice).enabled);
    if (f.blockedChoice) assert.equal(game.dispatch({type:'choose',id:f.blockedChoice}),false);
    if (f.absentStoryScene) {
      assert.equal(dialog.scene,undefined);
      assert.equal(game.state.flags.legacyStoryRoutes.q068,true);
      continue;
    }
    const expected = JSON.parse(f.save);
    expected.state.stories.q068.revision = 2;
    expected.state.stories.q068.values.hoistWorkersAt = 'entry';
    assert.deepEqual(JSON.parse(game.save()),expected);
    assert.deepEqual(dialog.scene.cast.map(c => c.id),f.cast);
  }
  const legacy = fixtures.find(f => f.absentStoryScene && f.scene === 'entry');
  for (const {choices,outcome} of anchorRoutes) {
    const game = load(data,legacy.save);
    for (const id of choices.filter(id => id !== 'continue' && id !== 'finish')) {
      assert.ok(game.dispatch({type:'choose',id}));
      drain(game);
    }
    assert.equal(game.state.quests.q068.outcome,outcome);
    assert.equal(game.state.stories.q068,undefined);
  }
});

test('q068 migration keeps the rope charge, people, raft and cargo through each interrupted journey', () => {
  const old = load(beforeAnchorData,ready().save());
  start(old,'q068');
  const entry = old.save(), ropes = old.state.inventory.rope;
  const trips = [
    [[], 'light','raft_site','raft_site','raft_site'],
    [['light'],'people','boat','transit','raft_site'],
    [['light','rope'],'continue','boat','transit','transit'],
    [['light','people'],'abandon','entry','boat','raft_site'],
    [['light','people'],'fix','entry','boat','raft_site'],
    [['light','rope','continue'],'cut','entry','boat','boat'],
    [['light','rope','continue'],'fix','entry','boat','boat'],
  ];
  for (const [approach,action,to,people,raft] of trips) {
    old.load(entry);
    for (const id of approach) choose(old,'q068',id);
    assert.ok(old.dispatch({type:'choose',id:action}));
    drain(old);
    const game = load(data,old.save());
    function check(where,survivors,vessel) {
      const v = game.state.stories.q068.values;
      assert.deepEqual([v.partyAt,v.survivorsAt,v.raftVesselAt,v.cargoAt,v.hoistWorkersAt],[where,survivors,vessel,'raftVessel','entry']);
      assert.equal(game.state.inventory.rope,ropes-Number(approach.includes('rope')));
    }
    check('transit',people,raft);
    assert.ok(game.dispatch({type:'retreat'}));
    go(game,{kind:'town',location:'royal_board'});
    assert.equal(game.dispatch({type:'story.resume',quest:'q068'}),false);
    check('transit',people,raft);
    go(game,beforeAnchors.story.worldPlaces[to]);
    if (game.state.journey) assert.ok(game.dispatch({type:'story.resume',quest:'q068'}));
    drain(game);
    check(to,people === 'transit' ? to : people,raft === 'transit' ? to : raft);
    if (to === 'entry') {
      assert.deepEqual(projectGame(game).dialog.scene.cast,[]);
      choose(game,'q068','finish');
      check(to,'boat',action === 'abandon' ? 'drift' : raft);
    }
  }
  for (const action of ['cut','fix']) {
    const game = load(data,entry);
    choose(game,'q068',action);
    const v = game.state.stories.q068.values, place = action === 'cut' ? 'drift' : 'raft_site';
    assert.deepEqual([v.survivorsAt,v.raftVesselAt,v.cargoAt],[place,place,'raftVessel']);
  }
});

test('q068 without a spare rope allows people-only rescue and rejects invalid saved holders', () => {
  const game = ready();
  game.state.inventory.rope = 0;
  start(game,'q068');
  choose(game,'q068','light');
  const valid = game.save();
  assert.equal(game.dispatch({type:'choose',id:'rope'}),false);
  assert.equal(game.save(),valid);
  for (const [key,value] of [['hoistWorkersAt','raft_site'],['cargoAt','hoistWorkers']]) {
    const bad = JSON.parse(valid);
    bad.state.stories.q068.values[key] = value;
    assert.throws(() => game.load(JSON.stringify(bad)));
    assert.equal(game.save(),valid);
  }
  choose(game,'q068','people');
  assert.equal(game.state.inventory.rope,0);
  assert.equal(game.state.stories.q068.values.raftVesselAt,'raft_site');
});
