import test from 'node:test';
import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {data,ready,start,choose,go,drain} from './royal-helpers.mjs';
import {beforeSeaKing,beforeSeaKingData,seaKingArtFixtures,seaKingRoutes} from '../tools/sea-king-art-fixtures.mjs';
import {resolveBattle} from '../tools/audit-regional-relocation.mjs';

function load(content,raw) {
  const game = new GameEngine(content);
  game.load(raw);
  game.random = () => .999999;
  return game;
}
function migrated(raw) {
  const expected = JSON.parse(raw), story = expected.state.stories.q069;
  story.revision = 2;
  story.values.seaKingAt = story.events.some(e => ['entry_help','passed_return'].includes(e)) ? 'work' : 'entry';
  return expected;
}

test('q069 binds the sea king only to four direct meetings and preserves the released quest', () => {
  const quest = structuredClone(data.quests.q069);
  assert.deepEqual(quest.model.storyUpgrades[0].previous,beforeSeaKing.story);
  assert.equal(data.characters.q069_sea_king.sprite,'npc_q069_sea_king');
  assert.deepEqual(quest.story.entities.seaKing,{holder:'seaKingAt',kind:'person',character:'q069_sea_king'});
  assert.deepEqual(quest.story.registry.seaKingAt.values,['entry','work']);
  for (const [id,scene] of Object.entries(quest.story.scenes)) {
    assert.deepEqual(scene.cast.map(c => c.entity),['passed','reported'].includes(id) ? [] : ['seaKing']);
    scene.cast = [];
  }
  for (const action of Object.values(quest.story.actions)) {
    assert.deepEqual(action.journey?.companions ?? [],[]);
    action.effects = action.effects.filter(e => !e.entities?.includes('seaKing'));
  }
  delete quest.model.storyUpgrades;
  delete quest.story.entities.seaKing;
  delete quest.story.registry.seaKingAt;
  quest.model.edition.revision = quest.story.revision = 1;
  assert.deepEqual(quest,beforeSeaKing);
});

test('q069 restores unpaid, paid, returned and legacy dialogue without charging or rewriting pending text', () => {
  const {fixtures,outcomes} = seaKingArtFixtures();
  assert.equal(fixtures.length,20);
  assert.equal(outcomes.length,3);
  for (const f of fixtures) {
    const game = load(data,f.save), dialog = projectGame(game).dialog;
    assert.equal(dialog.text,f.expectedText);
    assert.ok(dialog.options.find(o => o.id === f.availableChoice).enabled);
    if (f.absentStoryScene) {
      assert.equal(dialog.scene,undefined);
      assert.equal(game.state.flags.legacyStoryRoutes.q069,true);
      assert.equal(game.state.stories.q069,undefined);
    } else {
      assert.deepEqual(JSON.parse(game.save()),migrated(f.save));
      assert.deepEqual(dialog.scene.cast.map(c => c.id),f.cast);
      if (f.blockedChoice) {
        const saved = game.save();
        assert.equal(game.dispatch({type:'choose',id:f.blockedChoice}),false);
        assert.equal(game.save(),saved);
      }
    }
  }
});

test('q069 keeps all six routes and completed saves through migration, including distinct rewards and battle', () => {
  const old = load(beforeSeaKingData,ready().save());
  start(old,'q069');
  const entry = old.save();
  for (const {choices,outcome} of seaKingRoutes) {
    old.load(entry);
    const game = load(data,entry);
    for (const action of choices) {
      choose(old,'q069',action);
      choose(game,'q069',action);
      assert.deepEqual(JSON.parse(game.save()),migrated(old.save()));
      const restored = load(data,old.save());
      assert.deepEqual(JSON.parse(restored.save()),JSON.parse(game.save()));
    }
    assert.equal(game.state.quests.q069.outcome,outcome);
    const saved = game.save();
    assert.equal(game.accept('q069'),false);
    assert.throws(() => game.complete('q069',outcome));
    assert.equal(game.save(),saved);
  }
});

test('q069 keeps the sea king at his last workplace during all six interrupted journeys', () => {
  const trips = [
    [[], 'help','work','entry'],
    [['pay'],'continue','passed','entry'],
    [['pay','continue'],'return','work','entry'],
    [['pay','continue'],'leave','report','entry'],
    [['help','single'],'continue','report','work'],
    [['pay','continue','return'],'leave','report','work'],
  ];
  const old = load(beforeSeaKingData,ready().save());start(old,'q069');const entry = old.save();
  for (const [approach,action,to,king] of trips) {
    old.load(entry);
    for (const id of approach) choose(old,'q069',id);
    assert.ok(old.dispatch({type:'choose',id:action}));drain(old);
    const game = load(data,old.save());
    const values = () => game.state.stories.q069.values;
    assert.deepEqual([values().partyAt,values().seaKingAt,values().diagramAt],['transit',king,'party']);
    assert.ok(game.dispatch({type:'retreat'}));
    const gold = game.state.gold; // Retreat has its ordinary rescue fee.
    go(game,{kind:'town',location:'royal_board'});
    assert.equal(game.dispatch({type:'story.resume',quest:'q069'}),false);
    assert.deepEqual([values().partyAt,values().seaKingAt,values().diagramAt],['transit',king,'party']);
    go(game,beforeSeaKing.story.worldPlaces[to]);
    if (game.state.journey) assert.ok(game.dispatch({type:'story.resume',quest:'q069'}));
    drain(game);
    assert.deepEqual([values().partyAt,values().seaKingAt,values().diagramAt],[to,to === 'work' ? 'work' : king,to === 'report' ? 'report' : 'party']);
    assert.equal(game.state.gold,gold);
    assert.deepEqual(projectGame(game).dialog.scene.cast.map(c => c.id),to === 'work' ? ['q069_sea_king'] : []);
  }
});

test('q069 retains a free route with no money and atomically rejects invalid old and new holders', () => {
  const old = load(beforeSeaKingData,ready().save());start(old,'q069');
  const game = load(data,old.save());game.state.gold = 0;
  let valid = game.save();
  assert.equal(game.dispatch({type:'choose',id:'pay'}),false);
  assert.equal(game.save(),valid);
  for (const [raw,key,value] of [[old.save(),'diagramAt','seaKing'],[valid,'diagramAt','seaKing'],[valid,'seaKingAt','report']]) {
    const bad = JSON.parse(raw);bad.state.stories.q069.values[key] = value;
    assert.throws(() => game.load(JSON.stringify(bad)));
    assert.equal(game.save(),valid);
  }
  choose(game,'q069','help');valid = game.save();
  assert.equal(game.dispatch({type:'choose',id:'single'}),false);
  assert.equal(game.save(),valid);
  choose(game,'q069','shared');
  assert.equal(game.state.quests.q069.outcome,'informed');
});

test('q069 resumes a revision-one guard battle and preserves loss or escape before retry', () => {
  const old = load(beforeSeaKingData,ready().save());start(old,'q069');
  choose(old,'q069','force',{combat:'pending'});
  const battle = old.save();
  for (const result of ['lose',...(data.encounters.guard_7.escape ? ['escape'] : [])]) {
    const game = load(data,battle);
    assert.deepEqual(JSON.parse(game.save()),migrated(battle));
    assert.equal(game.state.battle.encounter,'guard_7');
    delete game.random;
    resolveBattle(game,result);
    assert.equal(game.state.quests.q069.stage,'active');
    assert.equal(game.state.stories.q069.values.finished,false);
    assert.equal(game.state.stories.q069.values.seaKingAt,'entry');
    game.random = () => .999999;
    if (result === 'lose') {
      assert.equal(game.state.townLocation,'oddland_village');
      go(game,data.quests.q069.story.worldPlaces.entry);
      assert.ok(game.dispatch({type:'story.resume',quest:'q069'}));drain(game);
    }
    assert.deepEqual(projectGame(game).dialog.scene.cast.map(c => c.id),['q069_sea_king']);
    choose(game,'q069','force');
    assert.equal(game.state.quests.q069.outcome,'contract');
  }
});
