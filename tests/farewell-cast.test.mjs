import test from 'node:test';
import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {data,go,choose,drain} from './royal-helpers.mjs';
import {
  beforeFarewell,beforeFarewellData,legacyFarewellData,
  farewellRoutes,farewellCast,farewellGame,farewellArtFixtures
} from '../tools/farewell-art-fixtures.mjs';

function restore(content,save) {
  const game = new GameEngine(content);game.load(save);game.random = () => .999999;return game;
}
function projectedOptions(game) {
  return projectGame(game).dialog.options.map(({id,text,enabled})=>({id,text,enabled}));
}
const rewardState = game => ({gold:game.state.gold,actors:structuredClone(game.state.actors),members:[...game.state.members]});

test('q164 connects the existing guests and Ren without changing the released quest',()=>{
  const quest = structuredClone(data.quests.q164);
  assert.deepEqual(quest.story.entities.guests,{holder:'guestsAt',kind:'group',character:'q164_guests'});
  assert.deepEqual(quest.story.entities.renGuest,{holder:'renGuestAt',kind:'person',character:'q164_ren'});
  assert.equal(data.characters.q164_guests.name,'帰り火亭の客');
  assert.equal(data.characters.q164_guests.portrait,undefined);
  assert.equal(data.characters.q164_guests.sprite,undefined);
  assert.equal(data.characters.q164_ren.portrait,data.actors.ren.portrait);
  assert.equal(data.characters.q164_ren.portrait,'portrait_ren');
  assert.equal(data.characters.q164_ren.sprite,undefined);
  assert.equal(Object.keys(quest.story.scenes).length,7);
  for(const [id,scene] of Object.entries(quest.story.scenes)) {
    assert.deepEqual(scene.cast.map(c=>quest.story.entities[c.entity].character),farewellCast(id));
    scene.cast = [];
    if(beforeFarewell.story.scenes[id].castMode===undefined)delete scene.castMode;
  }
  delete quest.story.entities.guests.character;
  delete quest.story.entities.renGuest.character;
  assert.deepEqual(quest,beforeFarewell);
});

test('q164 restores 27 current, pre-cast and accepted-legacy checkpoints byte-for-byte',()=>{
  const {fixtures,outcomes} = farewellArtFixtures();
  assert.equal(fixtures.length,27);
  assert.deepEqual(outcomes.sort(),['e2/q164/explain','e2/q164/listen','e2/q164/secret','e2/q164/song']);
  for(const f of fixtures) {
    const game = restore(data,f.save), dialog = projectGame(game).dialog;
    assert.equal(game.save(),f.save);
    assert.equal(dialog.text,f.expectedText);
    assert.deepEqual(projectedOptions(game),f.expectedOptions);
    assert.deepEqual(game.state.members,f.members);
    assert.ok(dialog.options.find(o=>o.id===f.availableChoice).enabled);
    if(f.absentStoryScene) {
      assert.equal(dialog.scene,undefined);
      assert.equal(game.state.stories.q164,undefined);
      assert.equal(game.state.flags.legacyStoryRoutes.q164,true);
    } else {
      assert.deepEqual(dialog.scene.cast.map(c=>c.id),f.cast);
      // A portrait-only actor and a collective label must not become town sprites.
      assert.ok(!projectGame(game).town.cast.some(c=>['q164_ren','q164_guests'].includes(c.id)));
    }
  }
});

test('q164 preserves four endings, each action and rewards with Ren in or out of the party',()=>{
  const outcomes = new Set();
  for(const renInParty of [false,true]) {
    const initial = farewellGame(beforeFarewellData,{renInParty}), entry = initial.save();
    for(const route of farewellRoutes.filter(r=>!renInParty || r.outcome!=='secret')) {
      const previous = restore(beforeFarewellData,entry), current = restore(data,entry);
      const members = [...current.state.members];let beforeReward;
      for(const [index,step] of route.choices.entries()) {
        if(index===route.choices.length-1)beforeReward=rewardState(current);
        choose(previous,'q164',step);choose(current,'q164',step);
        assert.equal(current.save(),previous.save());
        assert.deepEqual(current.state.members,members,'story participation does not change the combat party');
      }
      assert.equal(current.state.quests.q164.outcome,route.outcome);
      assert.equal(current.state.stories.q164.values.resolution,route.outcome);
      assert.equal(current.state.stories.q164.values.finished,true);
      const reward = data.quests.q164.outcomes[route.outcome];
      assert.equal(current.state.gold,beforeReward.gold+reward.gold);
      for(const id of members)assert.equal(current.state.actors[id].xp,beforeReward.actors[id].xp+reward.xp);
      assert.equal(current.accept('q164'),false);
      const completed = current.save();
      assert.throws(()=>current.complete('q164',route.outcome));assert.equal(current.save(),completed);
      const rewards = rewardState(current);
      current.run(data.quests.q164.model.entryScript);drain(current);
      assert.deepEqual(rewardState(current),rewards);
      assert.equal(projectGame(current).dialog?.scene,undefined);
      outcomes.add(route.outcome);
    }
  }
  assert.deepEqual([...outcomes].sort(),['explain','listen','secret','song']);
});

test('q164 restores all six interrupted journeys and joins Ren only at the authored meetings',()=>{
  const entry = farewellGame(beforeFarewellData).save(), checked = new Set();
  for(const route of farewellRoutes) {
    const previous = restore(beforeFarewellData,entry);
    for(const step of route.choices) {
      const key = previous.state.stories.q164.scene+'_'+step;
      const action = beforeFarewell.story.actions[key];
      if(action.journey) {
        const departed = restore(beforeFarewellData,previous.save());
        assert.ok(departed.dispatch({type:'choose',id:step}));drain(departed);
        const current = restore(data,departed.save()), members = [...current.state.members];
        assert.equal(current.save(),departed.save());
        assert.equal(current.state.journey.action,key);
        assert.equal(current.state.stories.q164.scene,null);
        assert.equal(projectGame(current).dialog?.scene,undefined);
        for(const holder of ['partyAt','guestsAt'])assert.equal(current.state.stories.q164.values[holder],'transit');
        const renTravels = action.journey.companions.includes('renGuest');
        assert.equal(current.state.stories.q164.values.renGuestAt,renTravels?'transit':'entry');
        assert.equal(current.dispatch({type:'story.resume',quest:'q164'}),false);
        assert.equal(current.state.journey.action,key,'departure is not arrival');
        go(current,data.quests.q164.story.worldPlaces[action.journey.to]);
        if(current.state.journey)assert.ok(current.dispatch({type:'story.resume',quest:'q164'}));
        drain(current);
        const story = current.state.stories.q164;
        assert.equal(story.scene,action.to);
        for(const holder of ['partyAt','guestsAt'])assert.equal(story.values[holder],action.journey.to);
        assert.equal(story.values.renGuestAt,renTravels?action.journey.to:'entry');
        assert.deepEqual(projectGame(current).dialog.scene.cast.map(c=>c.id),farewellCast(action.to));
        assert.deepEqual(current.state.members,members);
        assert.equal(current.state.members.includes('ren'),false,'NPC attendance does not recruit Ren');
        const arrived = current.save(), restored = restore(data,arrived);
        assert.equal(restored.save(),arrived);
        assert.deepEqual(projectGame(restored).dialog.scene.cast.map(c=>c.id),farewellCast(action.to));
        checked.add(key);
      }
      choose(previous,'q164',step);
    }
  }
  assert.deepEqual([...checked].sort(),[
    'entry_bring','entry_explain','entry_secret','invite_escort','prepare_party','rehearse_party'
  ]);
});

test('q164 keeps the secret choice tied to party membership, including an incapacitated Ren',()=>{
  for(const renInParty of [false,true]) {
    const current = farewellGame(data,{renInParty});
    assert.deepEqual(projectGame(current).dialog.scene.cast.map(c=>c.id),['q164_guests']);
    assert.equal(current.state.stories.q164.values.renGuestAt,'entry');
    const options = projectedOptions(current);
    assert.equal(options.find(o=>o.id==='secret').enabled,!renInParty);
    for(const id of ['explain','bring'])assert.equal(options.find(o=>o.id===id).enabled,true);
    if(renInParty) {
      for(const hp of [current.state.actors.ren.hp,0]) {
        const game = restore(data,current.save());game.state.actors.ren.hp=hp;
        const before = game.save();
        assert.equal(projectedOptions(game).find(o=>o.id==='secret').enabled,false);
        assert.equal(game.dispatch({type:'choose',id:'secret'}),false);
        assert.equal(game.save(),before,'reject the forbidden route without rewriting the save');
      }
    } else {
      const members = [...current.state.members];
      choose(current,'q164','secret');
      assert.equal(current.state.stories.q164.scene,'prepare');
      assert.equal(current.state.stories.q164.values.renGuestAt,'entry');
      assert.deepEqual(projectGame(current).dialog.scene.cast.map(c=>c.id),['q164_guests']);
      choose(current,'q164','party');
      assert.equal(current.state.stories.q164.scene,'invite');
      assert.deepEqual(projectGame(current).dialog.scene.cast.map(c=>c.id),['q164_guests','q164_ren']);
      assert.deepEqual(current.state.members,members);
    }
  }
});

test('q164 accepted legacy saves continue through the same four endings with no added cast',()=>{
  const outcomes = new Set();
  for(const renInParty of [false,true]) {
    const entry = farewellGame(legacyFarewellData,{renInParty,legacy:true}).save();
    for(const route of farewellRoutes.filter(r=>!renInParty || r.outcome!=='secret')) {
      const previous = restore(legacyFarewellData,entry), current = restore(data,entry);
      for(const step of route.legacy) {
        assert.equal(projectGame(current).dialog?.scene,undefined);
        assert.equal(current.state.stories.q164,undefined);
        assert.equal(current.state.flags.legacyStoryRoutes.q164,true);
        assert.deepEqual(projectedOptions(current),projectedOptions(previous));
        assert.ok(previous.dispatch({type:'choose',id:step}));drain(previous);
        assert.ok(current.dispatch({type:'choose',id:step}));drain(current);
        assert.equal(current.save(),previous.save());
      }
      assert.equal(current.state.quests.q164.outcome,route.outcome);
      assert.equal(current.state.stories.q164,undefined);
      const rewards = rewardState(current);
      current.run(data.quests.q164.model.entryScript);drain(current);
      assert.deepEqual(rewardState(current),rewards);
      assert.equal(projectGame(current).dialog?.scene,undefined);
      outcomes.add(route.outcome);
    }
  }
  assert.deepEqual([...outcomes].sort(),['explain','listen','secret','song']);
});
