import test from 'node:test';
import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {data,go,choose,drain} from './royal-helpers.mjs';
import {
  beforeAid,beforeAidData,legacyAidData,
  aidRoutes,aidCast,aidGame,aidArtFixtures
} from '../tools/aid-art-fixtures.mjs';

function restore(content,save) {
  const game = new GameEngine(content);game.load(save);game.random = () => .999999;return game;
}
function projectedOptions(game) {
  return projectGame(game).dialog.options.map(({id,text,enabled})=>({id,text,enabled}));
}
const rewardState = game => ({gold:game.state.gold,actors:structuredClone(game.state.actors),members:[...game.state.members]});
const routesFor = ilInParty => aidRoutes.filter(r=>!ilInParty || r.choices[0]!=='private');

test('q165 connects Lina and the existing Il portrait without changing the released quest',()=>{
  const quest = structuredClone(data.quests.q165);
  assert.deepEqual(quest.story.entities.lina,{holder:'linaAt',kind:'person',character:'q165_lina'});
  assert.deepEqual(quest.story.entities.ilGuest,{holder:'ilGuestAt',kind:'person',character:'q165_il'});
  assert.equal(data.characters.q165_lina.name,'商人リナ');
  assert.ok(data.characters.q165_lina.sprite);
  assert.equal(data.characters.q165_il.portrait,data.actors.il.portrait);
  assert.equal(data.characters.q165_il.portrait,'portrait_il');
  assert.equal(data.characters.q165_il.sprite,undefined);
  assert.equal(quest.story.revision,1);
  assert.equal(Object.keys(quest.story.scenes).length,7);
  for(const [id,scene] of Object.entries(quest.story.scenes)) {
    assert.deepEqual(scene.cast.map(c=>quest.story.entities[c.entity].character),aidCast(id));
    scene.cast = [];
    if(beforeAid.story.scenes[id].castMode===undefined)delete scene.castMode;
  }
  delete quest.story.entities.lina.character;
  delete quest.story.entities.ilGuest.character;
  assert.deepEqual(quest,beforeAid);
});

test('q165 restores 25 current, pre-cast and accepted-legacy checkpoints byte-for-byte',()=>{
  const {fixtures,outcomes} = aidArtFixtures();
  assert.equal(fixtures.length,25);
  assert.deepEqual(outcomes.sort(),['e2/q165/decline','e2/q165/open','e2/q165/secret']);
  for(const f of fixtures) {
    const game = restore(data,f.save), dialog = projectGame(game).dialog;
    assert.equal(game.save(),f.save);
    assert.equal(dialog.text,f.expectedText);
    assert.deepEqual(projectedOptions(game),f.expectedOptions);
    assert.deepEqual(game.state.members,f.members);
    assert.ok(dialog.options.find(o=>o.id===f.availableChoice).enabled);
    if(f.absentStoryScene) {
      assert.equal(dialog.scene,undefined);
      assert.equal(game.state.stories.q165,undefined);
      assert.equal(game.state.flags.legacyStoryRoutes.q165,true);
    } else {
      assert.deepEqual(dialog.scene.cast.map(c=>c.id),f.cast);
      assert.ok(!projectGame(game).town.cast.some(c=>c.id==='q165_il'),'the existing upper-body portrait is not a town sprite');
    }
  }
});

test('q165 preserves all seven routes, three endings and rewards with Il in or out of the party',()=>{
  const outcomes = new Set(), actions = new Set();
  assert.equal(aidRoutes.length,7);
  for(const ilInParty of [false,true]) {
    const entry = aidGame(beforeAidData,{ilInParty}).save();
    for(const route of routesFor(ilInParty)) {
      const previous = restore(beforeAidData,entry), current = restore(data,entry);
      const members = [...current.state.members];let beforeReward;
      for(const [index,step] of route.choices.entries()) {
        actions.add(current.state.stories.q165.scene+'_'+step);
        assert.deepEqual(projectedOptions(current),projectedOptions(previous));
        if(index===route.choices.length-1)beforeReward=rewardState(current);
        choose(previous,'q165',step);choose(current,'q165',step);
        assert.equal(current.save(),previous.save());
        assert.deepEqual(current.state.members,members,'story participation does not change the combat party');
      }
      assert.equal(current.state.quests.q165.outcome,route.outcome);
      assert.equal(current.state.stories.q165.values.resolution,route.outcome);
      assert.equal(current.state.stories.q165.values.finished,true);
      assert.equal(current.state.stories.q165.values.aidAt,route.outcome==='decline'?'supply':'party');
      const reward = data.quests.q165.outcomes[route.outcome];
      assert.equal(current.state.gold,beforeReward.gold+reward.gold);
      for(const id of members)assert.equal(current.state.actors[id].xp,beforeReward.actors[id].xp+reward.xp);
      assert.equal(current.accept('q165'),false);
      const completed = current.save();
      assert.throws(()=>current.complete('q165',route.outcome));assert.equal(current.save(),completed);
      const rewards = rewardState(current);
      current.run(data.quests.q165.model.entryScript);drain(current);
      assert.deepEqual(rewardState(current),rewards);
      assert.equal(projectGame(current).dialog?.scene,undefined);
      outcomes.add(route.outcome);
    }
  }
  assert.deepEqual([...outcomes].sort(),['decline','open','secret']);
  assert.deepEqual([...actions].sort(),Object.keys(beforeAid.story.actions).sort());
});

test('q165 restores all seven interrupted journeys with Lina and Il at their authored locations',()=>{
  const entry = aidGame(beforeAidData).save(), checked = new Set();
  for(const route of aidRoutes) {
    const previous = restore(beforeAidData,entry);
    for(const step of route.choices) {
      const key = previous.state.stories.q165.scene+'_'+step;
      const action = beforeAid.story.actions[key];
      if(action.journey) {
        const departed = restore(beforeAidData,previous.save());
        assert.ok(departed.dispatch({type:'choose',id:step}));drain(departed);
        const current = restore(data,departed.save()), members = [...current.state.members];
        assert.equal(current.save(),departed.save());
        assert.equal(current.state.journey.action,key);
        assert.equal(current.state.stories.q165.scene,null);
        assert.equal(projectGame(current).dialog?.scene,undefined);
        for(const holder of ['partyAt','linaAt'])assert.equal(current.state.stories.q165.values[holder],'transit');
        const ilTravels = action.journey.companions.includes('ilGuest');
        assert.equal(current.state.stories.q165.values.ilGuestAt,ilTravels?'transit':'entry');
        assert.equal(current.dispatch({type:'story.resume',quest:'q165'}),false);
        assert.equal(current.state.journey.action,key,'departure is not arrival');
        go(current,data.quests.q165.story.worldPlaces[action.journey.to]);
        if(current.state.journey)assert.ok(current.dispatch({type:'story.resume',quest:'q165'}));
        drain(current);
        const story = current.state.stories.q165;
        assert.equal(story.scene,action.to);
        for(const holder of ['partyAt','linaAt'])assert.equal(story.values[holder],action.journey.to);
        assert.equal(story.values.ilGuestAt,ilTravels?action.journey.to:'entry');
        assert.deepEqual(projectGame(current).dialog.scene.cast.map(c=>c.id),aidCast(action.to));
        assert.deepEqual(current.state.members,members);
        assert.equal(current.state.members.includes('il'),false,'NPC attendance does not recruit Il');
        const arrived = current.save(), restored = restore(data,arrived);
        assert.equal(restored.save(),arrived);
        assert.deepEqual(projectGame(restored).dialog.scene.cast.map(c=>c.id),aidCast(action.to));
        checked.add(key);
      }
      choose(previous,'q165',step);
    }
  }
  assert.deepEqual([...checked].sort(),[
    'ask_il_public','entry_open','entry_private','private_ask','private_secret','public_agree','secret_supply_receive'
  ]);
});

test('q165 ties the private conversation to party membership even when Il is incapacitated',()=>{
  for(const ilInParty of [false,true]) {
    const current = aidGame(data,{ilInParty});
    assert.deepEqual(projectGame(current).dialog.scene.cast.map(c=>c.id),['q165_lina']);
    assert.equal(current.state.stories.q165.values.ilGuestAt,'entry');
    const options = projectedOptions(current);
    assert.equal(options.find(o=>o.id==='private').enabled,!ilInParty);
    for(const id of ['open','decline'])assert.equal(options.find(o=>o.id===id).enabled,true);
    if(ilInParty) {
      for(const hp of [current.state.actors.il.hp,0]) {
        const game = restore(data,current.save());game.state.actors.il.hp=hp;
        const before = game.save();
        assert.equal(projectedOptions(game).find(o=>o.id==='private').enabled,false);
        assert.equal(game.dispatch({type:'choose',id:'private'}),false);
        assert.equal(game.save(),before,'reject the forbidden route without rewriting the save');
      }
    } else {
      const members = [...current.state.members];
      choose(current,'q165','private');
      assert.equal(current.state.stories.q165.scene,'private');
      assert.equal(current.state.stories.q165.values.ilGuestAt,'entry');
      assert.deepEqual(projectGame(current).dialog.scene.cast.map(c=>c.id),['q165_lina']);
      choose(current,'q165','ask');
      assert.equal(current.state.stories.q165.scene,'ask_il');
      assert.deepEqual(projectGame(current).dialog.scene.cast.map(c=>c.id),['q165_lina','q165_il']);
      assert.deepEqual(current.state.members,members);
    }
  }
});

test('q165 transfers secret aid on departure and public aid only on the final agreement',()=>{
  const secret = aidGame();
  choose(secret,'q165','private');choose(secret,'q165','secret');
  assert.equal(secret.state.stories.q165.scene,'secret_supply');
  assert.equal(secret.state.stories.q165.values.aidAt,'supply');
  assert.ok(secret.dispatch({type:'choose',id:'receive'}));drain(secret);
  assert.equal(secret.state.journey.action,'secret_supply_receive');
  assert.equal(secret.state.stories.q165.values.aidAt,'party');
  const carried = restore(data,secret.save());
  assert.equal(carried.state.stories.q165.values.aidAt,'party');
  assert.equal(carried.dispatch({type:'story.resume',quest:'q165'}),false);
  go(carried,data.quests.q165.story.worldPlaces.entry);
  if(carried.state.journey)assert.ok(carried.dispatch({type:'story.resume',quest:'q165'}));
  drain(carried);
  assert.equal(carried.state.stories.q165.scene,'secret_report');
  assert.equal(carried.state.stories.q165.values.aidAt,'party');
  choose(carried,'q165','finish');
  assert.equal(carried.state.stories.q165.values.aidAt,'party');

  const open = aidGame();
  choose(open,'q165','open');
  assert.ok(open.dispatch({type:'choose',id:'agree'}));drain(open);
  assert.equal(open.state.journey.action,'public_agree');
  assert.equal(open.state.stories.q165.values.aidAt,'supply');
  const waiting = restore(data,open.save());
  go(waiting,data.quests.q165.story.worldPlaces.supply);
  if(waiting.state.journey)assert.ok(waiting.dispatch({type:'story.resume',quest:'q165'}));
  drain(waiting);
  assert.equal(waiting.state.stories.q165.scene,'open_supply');
  assert.equal(waiting.state.stories.q165.values.aidAt,'supply');
  choose(waiting,'q165','finish');
  assert.equal(waiting.state.stories.q165.values.aidAt,'party');
});

test('q165 accepted legacy saves preserve all seven routes and three endings without added cast',()=>{
  const outcomes = new Set();
  for(const ilInParty of [false,true]) {
    const entry = aidGame(legacyAidData,{ilInParty,legacy:true}).save();
    for(const route of routesFor(ilInParty)) {
      const previous = restore(legacyAidData,entry), current = restore(data,entry);
      for(const step of route.legacy) {
        assert.equal(projectGame(current).dialog?.scene,undefined);
        assert.equal(current.state.stories.q165,undefined);
        assert.equal(current.state.flags.legacyStoryRoutes.q165,true);
        assert.deepEqual(projectedOptions(current),projectedOptions(previous));
        assert.ok(previous.dispatch({type:'choose',id:step}));drain(previous);
        assert.ok(current.dispatch({type:'choose',id:step}));drain(current);
        assert.equal(current.save(),previous.save());
      }
      assert.equal(current.state.quests.q165.outcome,route.outcome);
      assert.equal(current.state.stories.q165,undefined);
      const rewards = rewardState(current);
      current.run(data.quests.q165.model.entryScript);drain(current);
      assert.deepEqual(rewardState(current),rewards);
      assert.equal(projectGame(current).dialog?.scene,undefined);
      outcomes.add(route.outcome);
    }
  }
  assert.deepEqual([...outcomes].sort(),['decline','open','secret']);
});
