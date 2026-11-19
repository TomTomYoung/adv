import test from 'node:test';
import assert from 'node:assert/strict';
import {ready,migrated,checkpoint,drain,depart,fight,routes} from './q021-helpers.mjs';

const olderRoutes=[
  ...routes.map(r=>['flow.visit',r.old,r.outcome]),
  ...['decision','review'].flatMap(entry=>['informed','contract','compromise'].map(outcome=>[entry,[outcome],outcome]))
];
for(const [entry,path,outcome] of olderRoutes)
  test('q021 older '+entry+' '+path.join('/')+' preserves its accepted battle, clues and reward',()=>{
    const old=ready({old:true,visit:false});
    if(entry!=='flow.visit'&&outcome==='informed')
      for(const clue of ['clue_a','clue_b'])old.evidence('q021',clue,clue);
    old.run('q021.'+entry);drain(old);
    const g=migrated(old);checkpoint(g);
    assert.equal(g.state.flags.legacyStoryRoutes.q021,true);
    if(entry!=='flow.visit'&&outcome==='compromise')
      assert.equal(g.dispatch({type:'choose',id:'informed'}),false);
    const expectedBattle=outcome==='contract';
    let battles=0;
    for(const id of path){
      depart(g,id);checkpoint(g);
      if(g.state.battle){
        battles++;
        assert.ok(expectedBattle);
        assert.equal(g.state.battle.enemies.length,2);
        fight(g);checkpoint(g);
      }
    }
    assert.equal(g.state.quests.q021.outcome,outcome);
    assert.equal(g.state.records.battles,battles);
    assert.equal(battles,Number(expectedBattle));
    assert.equal(g.state.flags.legacyStoryRoutes.q021,true);
  });
