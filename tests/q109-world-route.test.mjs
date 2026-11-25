import test from 'node:test';
import assert from 'node:assert/strict';
import {projectGame} from '../src/application/projection.js';
import {nextQuestPlace} from '../src/core/quest-navigation.js';
import {beforeWorldRoute,migrated} from './abyss-world-helpers.mjs';
import {ready,forgePacking} from './canal-world-helpers.mjs';
import {arrive,checkpoint,choose,depart,go,resume} from './world-route-helpers.mjs';
import {drain,goWorldLocation} from './helpers.mjs';

const q='q109',play=(g,...ids)=>{for(const id of ids)choose(g,q,id);};
for(const [leader,str,text] of [['nio',15,'ひと束のまま'],['sera',9,'小分けの束']]){
  test('q109 hauling uses the active leader’s field STR and grants no consent: '+leader,()=>{
    const g=forgePacking(leader);
    assert.equal(g.value({ref:'leaderStats.str'}),str);
    checkpoint(g);assert.ok(projectGame(g).dialog.text.includes(text));
    play(g,'carry','unload','ask','sample','pupil');
    assert.equal(g.state.stories[q].values.sedoAgrees,false);
    assert.equal(g.dispatch({type:'choose',id:'fire'}),false);
    play(g,'agree','fire','sign');assert.equal(g.state.quests[q].outcome,'inherit');
  });
}

test('q109 the false message blocks handover until corrected, and returning leaves both parties free',()=>{
  const g=ready(q);
  play(g,'cart','unload','lie','return','ask','sample','pupil');
  assert.equal(g.dispatch({type:'choose',id:'agree'}),false);
  play(g,'back','pupil');checkpoint(g);
  assert.equal(g.dispatch({type:'choose',id:'agree'}),false);
  play(g,'correct');checkpoint(g);play(g,'back','pupil');
  assert.equal(g.state.stories[q].values.sedoAgrees,false);
  play(g,'agree');const v=g.state.stories[q].values;
  assert.equal(v.sedoAgrees,true);assert.equal(v.enAgrees,false);
  play(g,'fire','sign');assert.equal(g.state.quests[q].outcome,'inherit');
});

test('q109 refunds the smith’s advance once even when the party has no gold and is rescued',()=>{
  const g=ready(q);g.state.gold=0;
  play(g,'cart','unload');depart(g,'rest');
  assert.equal(g.state.stories[q].values.advanceAt,'party');
  g.defeat();drain(g);checkpoint(g);arrive(g,q);
  assert.equal(g.state.gold,0);assert.equal(g.state.stories[q].values.refunded,false);
  depart(g,'refund');assert.equal(g.state.stories[q].values.advanceAt,'buyer');
  g.defeat();drain(g);checkpoint(g);arrive(g,q);
  assert.equal(g.state.gold,0);assert.equal(g.dispatch({type:'choose',id:'refund'}),false);
  play(g,'join','shut');assert.equal(g.state.gold,57);
});

const {ready:before}=await beforeWorldRoute(q,{level:1});
test('q109 keeps the old forge while a new q108 delivery is in progress',()=>{
  const old=before(q,{old:true,start:'reception'});
  goWorldLocation(old,'hikarigaeri_guild');assert.ok(old.dispatch({type:'accept',id:'q108'}));drain(old);
  go(old,'q108','stall');resume(old,'q108');choose(old,'q108','catch');depart(old,'fish');
  const journey=structuredClone(old.state.journey),g=migrated(old);checkpoint(g);
  assert.deepEqual(g.state.journey,journey);arrive(g,'q108');choose(g,'q108','hand');
  assert.equal(g.state.quests.q108.outcome,'fish');
  const p=nextQuestPlace(g.data,g.state,q);assert.deepEqual([p.map,p.x,p.y],['region_1_f2',5,1]);
  g.teleport(p.map,p.x,p.y);g.run('q109.visit');drain(g);play(g,'ask','pupil','agree');
  assert.equal(g.state.quests[q].outcome,'inherit');checkpoint(g);
});

for(const [end,path] of Object.entries({rest:['rest'],tools:['ask','tools'],inherit:['ask','pupil','agree']})){
  test('q109 returning to the old completed '+end+' preserves the payout',()=>{
    const old=before(q,{old:true});play(old,...path);
    const g=migrated(old);g.run(g.data.quests[q].model.entryScript);drain(g);checkpoint(g);
    assert.equal(g.state.quests[q].outcome,end);assert.equal(g.state.gold,old.state.gold);
    assert.equal(g.state.actors.ada.xp,old.state.actors.ada.xp);
    assert.equal(g.state.vars.completed,old.state.vars.completed);
  });
}
