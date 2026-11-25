import test from 'node:test';
import assert from 'node:assert/strict';
import {nextQuestPlace} from '../src/core/quest-navigation.js';
import {drain, goWorldLocation} from './helpers.mjs';
import {arrive, checkpoint, choose, depart, go, resume} from './world-route-helpers.mjs';
import {beforeWorldRoute, migrated} from './abyss-world-helpers.mjs';
import {ready, routes} from './canal-world-helpers.mjs';

const q = 'q108';
const {ready: readyBefore} = await beforeWorldRoute(q, {level:1});
const agreement = ['catch','rats','open','cost','check'];
function play(g, ids) { for (const id of ids) choose(g, q, id); }

for (const route of routes[q].filter(r => r.outcome === 'decline')) {
  test('q108 declines the bounty at zero gold after '+route.path.join('/'), () => {
    const g = ready(q), xp = g.state.actors.ada.xp;
    g.state.gold = 0;
    play(g, route.path);
    checkpoint(g);
    const v = g.state.stories[q].values;
    assert.equal(g.state.quests[q].outcome, 'decline');
    assert.equal(v.custody, 'none');
    assert.equal(v.caged, false);
    assert.equal(v.paid, false);
    assert.equal(g.state.gold, 0);
    assert.equal(g.state.actors.ada.xp, xp);
  });
}

for (const [last, ending] of [[['warehouse','carry','hand'],'fish'], [['bird','hand'],'bird']]) {
  test('q108 can choose '+ending+' with no repair money after both observations', () => {
    const g = ready(q), xp = g.state.actors.ada.xp;
    g.state.gold = 0;
    play(g, agreement);
    assert.equal(g.dispatch({type:'choose',id:'build'}), false);
    play(g, last);
    checkpoint(g);
    assert.equal(g.state.stories[q].values.custody, ending);
    assert.equal(g.state.stories[q].values.paid, false);
    assert.equal(g.state.gold, 57);
    assert.equal(g.state.actors.ada.xp, xp + 51);
  });
}

test('q108 spends exactly 30G once and finishes the two repairs at their shops', () => {
  const g = ready(q);
  play(g, agreement);
  g.state.gold = 29;
  assert.equal(g.dispatch({type:'choose',id:'build'}), false);
  depart(g, 'build_supplies');
  g.defeat(); drain(g); checkpoint(g);
  assert.equal(g.state.flags.questResume[q], 'q108.canal.agreement.build.resume');
  go(g, q, 'stall'); resume(g, q);
  assert.equal(g.state.stories[q].values.enclosure, false);
  g.state.gold = 30;
  choose(g, q, 'build');
  const v = () => g.state.stories[q].values;
  assert.equal(g.state.gold, 0);
  assert.equal(v().shelfRaised, true);
  assert.equal(v().paid, true);
  assert.equal(v().enclosure, false);
  g.defeat(); drain(g); checkpoint(g); go(g, q, 'stall'); resume(g, q);
  assert.equal(g.dispatch({type:'choose',id:'build'}), false);
  depart(g, 'feeder'); checkpoint(g);
  assert.equal(v().keeperAt, 'transit'); assert.equal(v().catAt, 'feeder');
  arrive(g, q); choose(g, q, 'share');
  assert.equal(v().enclosure, true);
  assert.equal(v().custody, 'shared');
  assert.equal(g.state.gold, 57);
  checkpoint(g);
});

for (const [script, path, option] of [
  ['q108.flow.visit',['shelf','cost'],'build'],
  ['q108.visit',['fish','rat'],'shared']
]) {
  test('q108 resumes the original shortage from '+script+' at its old floor event', () => {
    let g = readyBefore(q, {old:true,start:'reception'});
    const visit = s => {
      const p = nextQuestPlace(g.data, g.state, q);
      assert.deepEqual([p.map,p.x,p.y], ['region_1_f2',4,1]);
      g.teleport(p.map,p.x,p.y); g.run(s); drain(g);
    };
    visit(script);
    play(g, path); g.state.gold = 29; depart(g, option+'_supplies');
    const marker = g.state.flags.questResume[q];
    g = migrated(g); g.defeat(); drain(g); checkpoint(g);
    assert.equal(g.state.flags.questResume[q], marker);
    assert.equal(g.state.flags.legacyStoryRoutes[q], true);
    g.state.gold = 30;
    visit(g.data.quests[q].events[0].script);
    const xp = g.state.actors.ada.xp;
    choose(g, q, option); checkpoint(g);
    assert.equal(g.state.quests[q].outcome, 'shared');
    assert.equal(g.state.gold, 57); assert.equal(g.state.actors.ada.xp, xp+51);
    assert.equal(g.state.flags.questResume[q], null);
    assert.throws(() => g.complete(q, 'shared'));
  });
}

test('q108 keeps the old acceptance while a current q107 letter is in transit', () => {
  const old = readyBefore(q, {old:true,start:'reception'});
  goWorldLocation(old, 'hikarigaeri_guild');
  assert.ok(old.dispatch({type:'accept',id:'q107'})); drain(old);
  go(old,'q107','desk'); resume(old,'q107');
  for (const id of ['look','watch','courier','letter','carry']) choose(old,'q107',id);
  depart(old,'send');
  const pending = structuredClone(old.state.journey);
  const g = migrated(old); checkpoint(g);
  assert.deepEqual(g.state.journey, pending);
  arrive(g,'q107'); choose(g,'q107','alive'); choose(g,'q107','finish');
  assert.equal(g.state.quests.q107.outcome, 'alive');
  const p = nextQuestPlace(g.data,g.state,q);
  g.teleport(p.map,p.x,p.y); g.run('q108.flow.visit'); drain(g);
  choose(g,q,'bird');
  assert.equal(g.state.quests[q].outcome, 'bird');
  checkpoint(g);
});

for (const [ending,path] of Object.entries({fish:['catch','fish'], bird:['bird'], shared:['shelf','cost','build']})) {
  test('q108 completed old '+ending+' retains its settlement after loading and visiting again', () => {
    const old = readyBefore(q, {old:true}); play(old,path);
    const g = migrated(old);
    g.run(g.data.quests[q].model.entryScript); drain(g); checkpoint(g);
    assert.equal(g.state.quests[q].outcome, ending);
    assert.equal(g.state.gold, old.state.gold);
    assert.equal(g.state.actors.ada.xp, old.state.actors.ada.xp);
    assert.equal(g.state.vars.completed, old.state.vars.completed);
  });
}
