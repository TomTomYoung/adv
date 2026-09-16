import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {data,newGame,drain,fight,exploreSpot} from './helpers.mjs';
import {prepareQuest} from './structure-routes.mjs';
import {projectGame} from '../src/application/projection.js';
const choose=(g,...ids)=>{for(const id of ids){assert.ok(g.dispatch({type:'choose',id}),id);drain(g);}};

test('new map/journal routes do not advertise retired two-clue locations',()=>{
 for(const q of Object.values(data.quests).filter(q=>q.number<=100)){
  const g=prepareQuest(q.id);choose(g,'pause');const projected=projectGame(g).tracked;
  assert.equal(projected.evidenceTotal,0,q.id);assert.equal(projected.locations.length,1,q.id);
  for(const loc of q.locations.filter(l=>l.role!=='decision')){
   const o=data.maps[loc.map].objects.find(o=>o.id===loc.object);assert.equal(Boolean(g.value(o.condition)),false);
  }
 }
});

test('q010 individual rescue actions survive a pause; opening the shaft is not rescuing everyone',()=>{
 const g=prepareQuest('q010');choose(g,'shaft');assert.equal(g.dispatch({type:'choose',id:'all'}),false);
 choose(g,'near','book','pause');g.load(g.save());g.run(data.quests.q010.model.entryScript);drain(g);
 assert.equal(g.dispatch({type:'choose',id:'all'}),false);const before=g.save();
 choose(g,'partial');assert.equal(g.state.quests.q010.outcome,'partial');
 g.load(before);choose(g,'deep','all','testimony');assert.equal(g.state.quests.q010.outcome,'informed');
});
test('legacy q015 water and copying choices retain their original outcomes',()=>{
 const old=()=>{const g=prepareQuest('q015');choose(g,'pause');delete g.state.flags.flow.q015;g.run('q015.flow.visit');drain(g);return g;};
 const a=old();choose(a,'catch','complete');assert.equal(a.state.quests.q015.outcome,'informed');
 const b=old();choose(b,'copy');const before=b.save();assert.equal(b.dispatch({type:'choose',id:'complete'}),false);assert.equal(b.save(),before);
 choose(b,'missing');assert.equal(b.state.quests.q015.outcome,'missing');
});
test('q063 and q067 need physical operating conditions, with recoverable failed trials',()=>{
 const g=prepareQuest('q063');choose(g,'weight');assert.equal(g.dispatch({type:'choose',id:'fix'}),false);
 choose(g,'add','add');assert.equal(g.dispatch({type:'choose',id:'fix'}),false);g.load(g.save());choose(g,'remove','fix');assert.equal(g.state.quests.q063.outcome,'informed');
 const h=prepareQuest('q067');choose(h,'large');assert.equal(h.state.quests.q067.stage,'active');choose(h,'reset','gate');assert.equal(h.state.quests.q067.outcome,'informed');
});
test('q068 transferring people without their raft creates a distinct loss',()=>{
 const g=prepareQuest('q068');choose(g,'light','people');assert.equal(g.dispatch({type:'choose',id:'cut'}),false);choose(g,'abandon');assert.equal(g.state.quests.q068.outcome,'cargo');
});
test('q169 delivery refusal cannot be softened without the recipient’s words; a lie has a later response',()=>{
 const g=prepareQuest('q169');choose(g,'deliver','return');assert.equal(g.dispatch({type:'choose',id:'soft'}),false);
 choose(g,'lie');assert.equal(g.state.quests.q169.stage,'active');assert.equal(g.state.flags.flow.q169.ringHeld,true);
 choose(g,'pause');g.load(g.save());g.run('q169.flow.visit');drain(g);choose(g,'admit');
 assert.equal(g.state.quests.q169.outcome,'corrected');assert.equal(g.state.flags.flow.q169.ringHeld,false);
});
test('finale reads prior choices and revises a disclosed residential map before sharing',()=>{
 const g=prepareQuest('q100');g.state.quests.q098.outcome='contract';choose(g,'records','privacy');
 assert.equal(g.dispatch({type:'choose',id:'respect'}),false);choose(g,'redact','share');
 assert.equal(g.state.flags.flow.q100.redacted,true);assert.equal(g.state.quests.q100.outcome,'informed');
 assert.equal(g.state.quests.q098.outcome,'contract','past action remains recorded');
});
test('material payment is checked atomically and a combat rescue pays only on victory',()=>{
 const g=prepareQuest('q006');g.state.inventory.rope=0;const before=g.save();
 assert.equal(g.dispatch({type:'choose',id:'lift'}),false);assert.equal(g.save(),before);
 g.state.inventory.rope=1;choose(g,'lift');assert.equal(g.state.inventory.rope,1);fight(g);assert.equal(g.state.inventory.rope,0);
 assert.equal(g.state.quests.q006.stage,'active');choose(g,'public','ledger','settle');assert.equal(g.state.quests.q006.outcome,'informed');
});
