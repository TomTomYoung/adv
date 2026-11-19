import test from 'node:test';
import assert from 'node:assert/strict';
import {ready,migrated,checkpoint,drain,depart,fight,routes} from './q020-helpers.mjs';

// Historical saves can enter via flow.visit or the still earlier decision/review scripts.
// They must not be silently redirected onto the new physical route.
const legacyRoutes=[
  ...routes.map(r=>['flow.visit',r.old,r.outcome]),
  ...['decision','review'].flatMap(entry=>['informed','contract','compromise'].map(outcome=>[entry,[outcome],outcome]))
];
for(const [entry,path,outcome] of legacyRoutes)test('q020 accepted '+entry+' '+path.join('/'),()=>{
  const old=ready({old:true,visit:false});
  if(entry!=='flow.visit'&&outcome==='informed')
    for(const clue of ['clue_a','clue_b'])old.evidence('q020',clue,clue);
  old.run('q020.'+entry);drain(old);
  const g=migrated(old);checkpoint(g);
  assert.equal(g.state.flags.legacyStoryRoutes.q020,true);
  if(entry!=='flow.visit'&&outcome==='compromise')
    assert.equal(g.dispatch({type:'choose',id:'informed'}),false);
  const battleExpected=outcome==='contract'||entry!=='flow.visit'&&outcome==='informed';
  let battles=0;
  for(const id of path){
    depart(g,id);checkpoint(g);
    if(g.state.battle){battles++;assert.ok(battleExpected);fight(g);checkpoint(g);}
  }
  assert.equal(g.state.quests.q020.outcome,outcome);
  assert.equal(g.state.records.battles,battles);
  assert.equal(battles,Number(battleExpected));
  assert.equal(g.state.flags.legacyStoryRoutes.q020,true);
});
