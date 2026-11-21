import test from 'node:test';
import assert from 'node:assert/strict';
import {ready,migrated} from './q092-helpers.mjs';
import {checkpoint,depart} from './world-route-helpers.mjs';
import {drain,fight} from './helpers.mjs';

for(const entry of ['decision','review']){
  for(const outcome of ['informed','contract','compromise']){
    test('q092 legacy '+entry+' keeps the original cost, combat and reward for '+outcome,()=>{
      const old=ready('q092',{old:true,start:'reception'});
      if(outcome==='informed'){
        for(const clue of ['clue_a','clue_b'])old.evidence('q092',clue,clue);
      }
      old.run('q092.'+entry);drain(old);
      const g=migrated(old);checkpoint(g);
      const ropes=g.state.inventory.rope??0;
      assert.equal(g.state.flags.legacyStoryRoutes.q092,true);
      if(outcome==='informed')assert.ok(ropes>0);
      else assert.equal(g.dispatch({type:'choose',id:'informed'}),false);
      for(const engine of [old,g]){
        depart(engine,outcome);
        if(outcome!=='compromise'){
          assert.equal(engine.state.battle.encounter,'guard_10');
          const used=entry==='decision'&&outcome==='informed';
          assert.equal(engine.state.inventory.rope??0,ropes-Number(used));
          fight(engine);drain(engine);
        }
        assert.equal(engine.state.records.battles,Number(outcome!=='compromise'));
        assert.equal(engine.state.inventory.rope??0,ropes-Number(outcome==='informed'));
        assert.equal(engine.state.quests.q092.outcome,outcome);
      }
      assert.equal(g.state.gold,old.state.gold);
      assert.equal(g.state.actors.ada.xp,old.state.actors.ada.xp);
      checkpoint(g);
    });
  }
}

for(const entry of ['decision','review']){
  test('q092 resumes a saved '+entry+' supply shortage at its original command list',()=>{
    const old=ready('q092',{old:true,start:'reception'});
    old.state.inventory.rope=0;
    for(const clue of ['clue_a','clue_b'])old.evidence('q092',clue,clue);
    old.run('q092.'+entry);drain(old);
    assert.equal(old.dispatch({type:'choose',id:'informed'}),false);
    depart(old,'informed_supplies');
    const g=migrated(old);checkpoint(g);
    assert.equal(g.state.flags.questResume.q092,'q092.'+entry+'.informed.resume');
    g.give('rope',1);
    g.run('q092.flow.visit');drain(g);
    assert.equal(g.state.flags.questResume.q092,null);
    depart(g,'informed');
    assert.equal(g.state.battle.encounter,'guard_10');
    assert.equal(g.state.inventory.rope??0,entry==='decision'?0:1);
    fight(g);drain(g);checkpoint(g);
    assert.equal(g.state.inventory.rope??0,0);
    assert.equal(g.state.quests.q092.outcome,'informed');
  });
}
