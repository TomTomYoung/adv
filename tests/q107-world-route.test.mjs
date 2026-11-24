import test from 'node:test';
import assert from 'node:assert/strict';
import {nextQuestPlace} from '../src/core/quest-navigation.js';
import {beforeWorldRoute, migrated} from './abyss-world-helpers.mjs';
import {ready} from './canal-world-helpers.mjs';
import {drain, goWorldLocation} from './helpers.mjs';
import {arrive, checkpoint, choose, depart, go, resume} from './world-route-helpers.mjs';

const q = 'q107';
const {ready: readyBefore} = await beforeWorldRoute(q, {level:1});
const toLetter = ['look', 'watch', 'courier', 'letter', 'carry', 'send'];

test('q107 only an explicit overnight stay brings a reply; rescue and visiting the window do not', () => {
  const g = ready(q);
  for (const id of toLetter) choose(g, q, id);
  const state = () => g.state.stories[q].values;
  const waiting = structuredClone(state());
  assert.equal(waiting.letterAt, 'courier');
  assert.equal(waiting.courierAt, 'neighbor');
  g.defeat(); drain(g); checkpoint(g);
  go(g, q, 'door');
  assert.equal(g.dispatch({type:'story.resume',quest:q}), false);
  go(g, q, 'room'); resume(g, q);
  assert.deepEqual(state(), waiting);
  assert.equal(g.dispatch({type:'choose',id:'receive'}), false);
  assert.equal(g.dispatch({type:'choose',id:'meet'}), false);

  depart(g, 'sleep');
  assert.equal(state().slept, true);
  assert.equal(state().courierAt, 'door');
  assert.equal(state().letterAt, 'courier');
  assert.equal(state().reply, false);
  g.defeat(); drain(g); checkpoint(g); arrive(g, q);
  choose(g, q, 'receive');
  assert.equal(state().letterAt, 'party');
  assert.equal(state().reply, true);
  assert.equal(state().meeting, false);
  assert.equal(g.dispatch({type:'choose',id:'meet'}), false);
  choose(g, q, 'share');
  assert.equal(state().letterAt, 'guests');
  assert.equal(state().meeting, true);
  assert.equal(state().missingAt, 'neighbor');
  assert.equal(state().seated, false);
  choose(g, q, 'alive');
  assert.equal(g.state.quests[q].outcome, 'alive');
  assert.equal(state().missingAt, 'neighbor');
});

test('q107 keeps a current q106 journey and an old q107 acceptance in the same save', () => {
  const prior = readyBefore(q, {old:true,start:'reception'});
  goWorldLocation(prior, 'hikarigaeri_guild');
  assert.ok(prior.dispatch({type:'accept',id:'q106'})); drain(prior);
  go(prior, 'q106', 'bakery'); resume(prior, 'q106'); depart(prior, 'chase');
  const pending = structuredClone(prior.state.journey);
  const g = migrated(prior);
  checkpoint(g);
  assert.deepEqual(g.state.journey, pending);
  assert.equal(g.state.flags.legacyStoryRoutes[q], true);
  assert.equal(g.state.flags.currentStoryRoutes.q106, true);
  arrive(g, 'q106');
  for (const id of ['guard','keep','finish']) choose(g, 'q106', id);
  assert.equal(g.state.quests.q106.outcome, 'guard');
  const {map,x,y} = nextQuestPlace(g.data, g.state, q);
  assert.deepEqual([map,x,y], ['region_1_f2',3,1]);
  g.teleport(map,x,y); g.run(q+'.visit'); drain(g);
  for (const id of ['courier','letter','sleep','meet']) choose(g, q, id);
  assert.equal(g.state.quests[q].outcome, 'meet');
  checkpoint(g);
});

for (const [ending, choices] of Object.entries({stop:['stop'], alive:['courier','alive'], meet:['courier','letter','sleep','meet']})) {
  test('q107 completed old '+ending+' keeps the ending and pays only once on revisit', () => {
    const old = readyBefore(q, {old:true});
    for (const id of choices) choose(old, q, id);
    const g = migrated(old);
    const rewards = engine => [engine.state.gold, engine.state.actors.ada.xp, engine.state.vars.completed];
    g.run(g.data.quests[q].model.entryScript); drain(g); checkpoint(g);
    assert.equal(g.state.quests[q].outcome, ending);
    assert.deepEqual(rewards(g), rewards(old));
    assert.throws(() => g.complete(q, ending));
  });
}
