import test from 'node:test';
import assert from 'node:assert/strict';
import {nextQuestPlace} from '../src/core/quest-navigation.js';
import {drain, goWorldLocation} from './helpers.mjs';
import {checkpoint, choose, depart, go, resume} from './world-route-helpers.mjs';
import {breadShortages, migrated, previous, ready} from './canal-world-helpers.mjs';

const q = 'q106';
for (const row of breadShortages) for (const old of [false, true]) {
  test(q+' '+(old?'legacy':'current')+' '+row.choice+' resumes its unpaid action after rescue', () => {
    let g = ready(q, {old});
    for (const id of old ? row.old : row.path) choose(g, q, id);
    const goldCost = row.cost.gold;
    if (goldCost) g.state.gold = goldCost - 1;
    else delete g.state.inventory.ration;
    assert.equal(g.dispatch({type: 'choose', id: row.choice}), false);
    depart(g, row.choice+'_supplies');
    if (old) g = migrated(g);
    const unpaid = g.state.flags.questResume[q];
    assert.ok(unpaid);
    g.defeat(); drain(g); checkpoint(g);
    assert.equal(g.state.flags.questResume[q], unpaid);

    if (goldCost) {
      // Earn the missing gold through a normal settlement, then return to the pending job.
      goWorldLocation(g, 'hikarigaeri_guild');
      assert.ok(g.dispatch({type:'accept', id:'q101'})); drain(g);
      go(g, 'q101', 'counter'); resume(g, 'q101');
      for (const id of ['watch','quiet','finish']) choose(g, 'q101', id);
    } else {
      goWorldLocation(g, 'hikarigaeri_shop');
      assert.ok(g.dispatch({type:'buy', item:'ration'}));
    }
    if (old) {
      const point = previous.quests[q].locations[0];
      assert.equal(nextQuestPlace(g.data, g.state, q).map, point.map);
      g.teleport(point.map, point.x, point.y); g.run(q+'.visit'); drain(g);
    } else {
      go(g, q, row.place); resume(g, q);
    }
    const gold = g.state.gold, food = g.state.inventory.ration ?? 0;
    choose(g, q, row.choice); checkpoint(g);
    assert.equal(g.state.flags.questResume[q], null);
    assert.equal(g.state.inventory.ration ?? 0, food - (row.cost.ration ?? 0));
    if (!old) {
      assert.equal(g.state.gold, gold - (goldCost ?? 0));
      const saved = structuredClone(g.state.stories[q]);
      g.defeat(); drain(g); go(g, q, row.place); resume(g, q);
      assert.deepEqual(g.state.stories[q], saved);
      assert.equal(g.dispatch({type:'choose', id:row.choice}), false);
      for (const id of row.finish) choose(g, q, id);
    }
    assert.equal(g.state.quests[q].outcome, row.outcome);
    const after = g.save();
    assert.throws(() => g.complete(q, row.outcome));
    assert.equal(g.save(), after);
  });
}

test('q106 preserves each completed legacy save and its one-time reward', () => {
  for (const [outcome, path] of Object.entries({seal:['seal'], guard:['guard'], meal:['owner','ask','eat']})) {
    const prior = ready(q, {old:true});
    for (const id of path) choose(prior, q, id);
    const g = migrated(prior);
    const paid = () => [g.state.gold, g.state.actors.ada.xp, g.state.inventory.ration, g.state.vars.completed];
    const before = paid();
    assert.equal(g.state.flags.legacyStoryRoutes[q], true);
    g.run(g.data.quests[q].model.entryScript); drain(g); checkpoint(g);
    assert.equal(g.state.quests[q].outcome, outcome);
    assert.deepEqual(paid(), before);
  }
});
