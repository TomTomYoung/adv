import test from 'node:test';
import assert from 'node:assert/strict';
import {ready,migrated,checkpoint,drain,depart,fight} from './q022-helpers.mjs';

for(const entry of ['decision','review']){
  for(const outcome of ['informed','contract','compromise']){
    test('q022 legacy '+entry+' keeps the original cost, combat and reward for '+outcome,()=>{
      const old=ready({old:true,visit:false});
      if(outcome==='informed'){
        for(const clue of ['clue_a','clue_b'])old.evidence('q022',clue,clue);
      }
      old.run('q022.'+entry);drain(old);
      const g=migrated(old);checkpoint(g);
      const ropes=g.state.inventory.rope??0;
      assert.equal(g.state.flags.legacyStoryRoutes.q022,true);
      if(outcome==='informed')assert.ok(ropes>0);
      else assert.equal(g.dispatch({type:'choose',id:'informed'}),false);
      for(const engine of [old,g]){
        depart(engine,outcome);
        if(outcome!=='compromise'){
          assert.equal(engine.state.battle.encounter,'guard_3');
          const used=entry==='decision'&&outcome==='informed';
          assert.equal(engine.state.inventory.rope??0,ropes-Number(used));
          fight(engine);drain(engine);
        }
        assert.equal(engine.state.records.battles,Number(outcome!=='compromise'));
        assert.equal(engine.state.inventory.rope??0,ropes-Number(outcome==='informed'));
        assert.equal(engine.state.quests.q022.outcome,outcome);
      }
      assert.equal(g.state.gold,old.state.gold);
      assert.equal(g.state.actors.ada.xp,old.state.actors.ada.xp);
      checkpoint(g);
    });
  }
}
