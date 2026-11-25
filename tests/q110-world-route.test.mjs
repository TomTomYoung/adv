import test from 'node:test';
import assert from 'node:assert/strict';
import {projectGame} from '../src/application/projection.js';
import {nextQuestPlace} from '../src/core/quest-navigation.js';
import {ready} from './canal-world-helpers.mjs';
import {beforeWorldRoute,migrated} from './abyss-world-helpers.mjs';
import {arrive,checkpoint,choose,depart,go,resume} from './world-route-helpers.mjs';
import {drain,goWorldLocation} from './helpers.mjs';

const q='q110', play=(g,...steps)=>{for(const id of steps)choose(g,q,id);};

test('q110 offers the veteran’s account and full escort pay before any personal record is shown',()=>{
  const g=ready(q),gold=g.state.gold,xp=g.state.actors.ada.xp;
  play(g,'fit');assert.match(projectGame(g).dialog.text,/退くと決めた夜/);
  assert.equal(g.state.records.escapes,0);assert.equal(g.state.stories[q].values.retreatStory,true);
  play(g,'guard','walk','finish');const v=g.state.stories[q].values;
  assert.equal(v.recordShared,false);assert.equal(v.approved,false);assert.equal(v.walkedTogether,true);
  assert.equal(g.state.gold,gold+57);assert.equal(g.state.actors.ada.xp,xp+51);
});

test('q110 shows a real previous escape with its historical limit and keeps the shown count on rescue',()=>{
  const g=ready(q,{start:'reception'});
  g.state.records.historyComplete=false;
  g.random=()=>0;g.startBattle('wild_pair_1',{win:[],escape:[],lose:[]},{battleMode:'classic'});
  assert.ok(g.dispatch({type:'battle',action:'escape'}));drain(g);
  assert.equal(g.state.records.escapes,1);
  go(g,q,'fitting');resume(g,q);play(g,'fit','hear','show');
  assert.match(projectGame(g).dialog.text,/記録開始後の逃走は1回/);
  const snapshot=structuredClone(g.state.stories[q]);g.defeat();drain(g);checkpoint(g);
  go(g,q,'fitting');resume(g,q);assert.deepEqual(g.state.stories[q],snapshot);
  assert.match(projectGame(g).dialog.text,/記録開始後の逃走は1回/);
  play(g,'listen','consult','all','approve','invite','seat');assert.equal(g.state.quests[q].outcome,'all');
});

test('q110 can withdraw both drafts before committing the speech or inviting the other veterans',()=>{
  const g=ready(q),v=()=>g.state.stories[q].values;
  play(g,'fit','hear','consult','all','back','retreat','back');
  assert.equal(v().speech,'unset');assert.equal(v().approved,false);assert.equal(v().invited,false);
  assert.equal(g.dispatch({type:'choose',id:'seat'}),false);play(g,'all','approve');checkpoint(g);
  assert.equal(v().speech,'none');assert.equal(v().approved,true);assert.equal(v().invited,false);
  depart(g,'invite');assert.equal(v().invited,true);g.defeat();drain(g);checkpoint(g);arrive(g,q);
  play(g,'seat');assert.equal(v().friendsAt,'square');assert.equal(v().walkedTogether,true);
});

const {ready:before}=await beforeWorldRoute(q,{level:1});
test('q110 keeps its old event while a current q109 advance is travelling to the order counter',()=>{
  const old=before(q,{old:true,start:'reception'});
  goWorldLocation(old,'hikarigaeri_guild');assert.ok(old.dispatch({type:'accept',id:'q109'}));drain(old);
  go(old,'q109','yard');resume(old,'q109');
  for(const k of ['cart','unload'])choose(old,'q109',k);depart(old,'rest');
  const g=migrated(old);checkpoint(g);assert.deepEqual(g.state.journey,old.state.journey);
  assert.equal(g.state.stories.q109.values.advanceAt,'party');arrive(g,'q109');
  for(const k of ['refund','join','shut'])choose(g,'q109',k);
  const p=nextQuestPlace(g.data,g.state,q);assert.deepEqual([p.map,p.x,p.y],['region_1_f2',8,1]);
  g.teleport(p.map,p.x,p.y);g.run('q110.visit');drain(g);play(g,'hear','retreat');
  checkpoint(g);assert.equal(g.state.quests.q109.outcome,'rest');assert.equal(g.state.quests.q110.outcome,'retreat');
});

for(const [end,steps] of Object.entries({legend:['guard'],retreat:['hear','retreat'],all:['hear','all']})){
  test('q110 keeps old completed '+end+' and its original payout on revisiting',()=>{
    const old=before(q,{old:true});play(old,...steps);const g=migrated(old);
    g.run(g.data.quests[q].model.entryScript);drain(g);checkpoint(g);
    assert.equal(g.state.quests[q].outcome,end);assert.equal(g.state.gold,old.state.gold);
    assert.equal(g.state.actors.ada.xp,old.state.actors.ada.xp);
    assert.equal(g.state.vars.completed,old.state.vars.completed);
  });
}
