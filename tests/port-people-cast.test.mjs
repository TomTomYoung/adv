import test from 'node:test';
import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {data,ready,start,choose,go,drain} from './royal-helpers.mjs';
import {fight} from './helpers.mjs';
import {resolveBattle} from '../tools/audit-regional-relocation.mjs';
import {beforePortPeople,beforePortPeopleData,portPeopleArtFixtures,portPeopleRoutes,portPeoplePhase,portPeopleLegacyChoices} from '../tools/port-people-art-fixtures.mjs';

function load(content,raw) {
  const game = new GameEngine(content);game.load(raw);game.random = () => .999999;return game;
}
function entry() {
  const old = load(beforePortPeopleData,ready().save());old.state.vars.region_7 = 3;start(old,'q070');return old.save();
}
const values = game => game.state.stories.q070.values;

test('q070 adds one collective label at two meetings and otherwise preserves the entire released quest', () => {
  const quest = structuredClone(data.quests.q070);
  assert.equal(data.characters.q070_port_people.name,'港の人');
  assert.equal(data.characters.q070_port_people.sprite,undefined);
  assert.equal(data.characters.q070_port_people.portrait,undefined);
  assert.deepEqual(quest.story.entities.portPeople,{holder:'portPeopleAt',kind:'group',character:'q070_port_people'});
  for (const [id,scene] of Object.entries(quest.story.scenes)) {
    assert.deepEqual(scene.cast,['harbor_wait','safe'].includes(id) ? [{entity:'portPeople',display:{x:50}}] : []);
    scene.cast = [];
  }
  delete quest.story.entities.portPeople.character;
  assert.deepEqual(quest,beforePortPeople);
});

test('q070 restores all 41 waiting states without rewriting saves or enabling out-of-order work', () => {
  const {fixtures,outcomes} = portPeopleArtFixtures();
  assert.equal(fixtures.length,41);assert.equal(outcomes.length,3);
  for (const f of fixtures) {
    const game = load(data,f.save), dialog = projectGame(game).dialog;
    assert.equal(dialog.text,f.expectedText);
    assert.ok(dialog.options.find(o => o.id === f.availableChoice).enabled);
    if (f.absentStoryScene) {
      assert.equal(dialog.scene,undefined);
      assert.equal(game.state.flags.legacyStoryRoutes.q070,true);
      assert.equal(game.state.stories.q070,undefined);
    } else {
      assert.equal(game.save(),f.save);
      assert.deepEqual(dialog.scene.cast.map(c => c.id),f.cast);
    }
    for (const id of f.blockedChoices ?? []) {
      const saved = game.save();assert.equal(game.dispatch({type:'choose',id}),false);assert.equal(game.save(),saved);
    }
  }
  const legacy = fixtures.find(f => f.absentStoryScene && f.scene === 'entry');
  for (const {choices,outcome} of portPeopleRoutes) {
    const game = load(data,legacy.save);
    for (const id of portPeopleLegacyChoices(choices)) {
      assert.ok(game.dispatch({type:'choose',id}));drain(game);
      if (game.state.battle) {game.healAll();fight(game);}
    }
    assert.equal(game.state.quests.q070.outcome,outcome);
    assert.equal(game.state.stories.q070,undefined);
  }
});

test('q070 preserves all seven routes byte-for-byte, including each salvage stage, battle and completed saves', () => {
  const saved = entry();
  for (const {choices,outcome} of portPeopleRoutes) {
    const old = load(beforePortPeopleData,saved), game = load(data,saved);
    for (const action of choices) {
      choose(old,'q070',action);choose(game,'q070',action);
      assert.equal(game.save(),old.save());
      assert.equal(load(data,old.save()).save(),old.save());
    }
    assert.equal(game.state.quests.q070.outcome,outcome);
    assert.equal(values(game).portPeopleAt,choices.includes('evacuate') ? 'refuge' : 'harbor');
    if (outcome === 'compromise')assert.equal(values(game).relicAt,'harbor');
    assert.deepEqual(game.state.dungeons.persistent.region_7.systems.air.raised,[]);
    const complete = game.save();assert.equal(game.accept('q070'),false);
    assert.throws(() => game.complete('q070',outcome));assert.equal(game.save(),complete);
  }
});

test('q070 restores every distinct interrupted trip and moves the people or relic only on their declared routes', () => {
  const saved = entry(), seen = new Set();
  for (const {choices} of portPeopleRoutes) {
    const old = load(beforePortPeopleData,saved);
    for (const action of choices) {
      const story = old.state.stories.q070, definition = beforePortPeople.story.actions[story.scene+'_'+action];
      const key = story.scene+'/'+action+'/'+portPeoplePhase(story.values);
      if (definition?.journey && !seen.has(key)) {
        seen.add(key);
        const game = load(data,old.save()), peopleBefore = values(game).portPeopleAt;
        const stateBefore = structuredClone(values(game));
        assert.ok(game.dispatch({type:'choose',id:action}));drain(game);
        const to = definition.journey.to, escort = action === 'escort', carrying = action === 'carry';
        assert.equal(values(game).partyAt,'transit');
        assert.equal(values(game).portPeopleAt,escort ? 'transit' : peopleBefore);
        assert.equal(values(game).evacuated,stateBefore.evacuated);
        assert.equal(values(game).relicAt,carrying ? 'party' : stateBefore.relicAt);
        assert.equal(load(data,game.save()).save(),game.save());
        // Dungeon departures can be rescued; town departures can take a detour.
        if (game.state.dungeons.active)assert.ok(game.dispatch({type:'retreat'}));
        go(game,{kind:'town',location:'royal_board'});
        assert.equal(game.dispatch({type:'story.resume',quest:'q070'}),false);
        assert.equal(values(game).portPeopleAt,escort ? 'transit' : peopleBefore);
        assert.equal(values(game).relicAt,carrying ? 'party' : stateBefore.relicAt);
        const gold = game.state.gold;
        go(game,beforePortPeople.story.worldPlaces[to]);
        if (game.state.journey)assert.ok(game.dispatch({type:'story.resume',quest:'q070'}));drain(game);
        assert.equal(values(game).partyAt,to);
        assert.equal(values(game).portPeopleAt,escort ? 'refuge' : peopleBefore);
        assert.equal(values(game).evacuated,escort || stateBefore.evacuated);
        assert.equal(values(game).relicAt,carrying ? 'harbor' : stateBefore.relicAt);
        assert.equal(game.state.gold,gold);
        assert.deepEqual(projectGame(game).dialog.scene.cast.map(c => c.id),['harbor','refuge'].includes(to) && !carrying ? ['q070_port_people'] : []);
      }
      choose(old,'q070',action);
    }
  }
  assert.equal(seen.size,17);
});

test('q070 keeps the free staged route and atomically rejects invalid group and relic holders', () => {
  const game = load(data,entry());game.state.gold = 0;
  const saved = game.save();
  for (const [key,value] of [['portPeopleAt','party'],['relicAt','q070_port_people']]) {
    const invalid = JSON.parse(saved);invalid.state.stories.q070.values[key] = value;
    assert.throws(() => game.load(JSON.stringify(invalid)));assert.equal(game.save(),saved);
  }
  for (const action of portPeopleRoutes.at(-1).choices)choose(game,'q070',action);
  assert.equal(game.state.quests.q070.outcome,'informed');
});

test('q070 restores the old active boss fight and keeps the port unevacuated after defeat and retry', () => {
  const old = load(beforePortPeopleData,entry());choose(old,'q070','all',{combat:'pending'});
  const game = load(data,old.save());assert.equal(game.save(),old.save());
  assert.equal(game.state.battle.encounter,'boss_7');
  assert.equal(game.dispatch({type:'battle',action:'escape'}),false);
  delete game.random;resolveBattle(game,'lose');
  assert.equal(game.state.quests.q070.stage,'active');
  assert.deepEqual([values(game).finished,values(game).evacuated,values(game).portPeopleAt],[false,false,'harbor']);
  game.random = () => .999999;go(game,beforePortPeople.story.worldPlaces.entry);
  assert.ok(game.dispatch({type:'story.resume',quest:'q070'}));drain(game);
  assert.deepEqual(projectGame(game).dialog.scene.cast,[]);
  choose(game,'q070','all');assert.equal(game.state.quests.q070.outcome,'contract');
});
