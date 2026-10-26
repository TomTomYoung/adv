import test from 'node:test';
import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {nextQuestPlace} from '../src/core/quest-navigation.js';
import {fixture,auditQuest,replay} from '../tools/audit-regional-relocation.mjs';
import {previous} from './royal-compat-helpers.mjs';
import {data,ready,go,start,choose,checkpoint,drain} from './royal-helpers.mjs';
for(let n=61;n<=70;n++){const id='q0'+n;test(`${id}: seven previous revision-2 save phases and every old ending remain playable`,()=>{
 const report=auditQuest(previous,id),path=Object.values(report.endings)[0];
 for(const stage of ['unaccepted','accepted','dungeon','text','choice','battle','completed']){
  const g=fixture(previous,id,{accepted:stage!=='unaccepted',entered:!['unaccepted','accepted'].includes(stage),started:!['unaccepted','accepted','dungeon','battle'].includes(stage)});
  if(stage==='choice')drain(g);if(stage==='battle')g.startBattle(g.map().encounter,{win:[],escape:[],lose:[]});if(stage==='completed')replay(g,id,path);
  const raw=g.save(),expected=JSON.parse(raw),now=new GameEngine(data);now.load(raw);
  for(const [qid,q] of Object.entries(expected.state.quests))if(data.previousQuestRoutes[qid]&&q.stage!=='available'&&!expected.state.flags.currentStoryRoutes?.[qid])(expected.state.flags.legacyStoryRoutes??={})[qid]=true;
  expected.state.worldTravel.version=2;assert.deepEqual(JSON.parse(now.save()),expected,id+'/'+stage);assert.equal(g.save(),raw);checkpoint(now);
  if(!['unaccepted','completed'].includes(stage))assert.equal(nextQuestPlace(data,now.state,id).map,previous.quests[id].locations[0].map);
 }
 auditQuest(data,id,{makeFixture:()=>{const old=fixture(previous,id),g=new GameEngine(data);g.load(old.save());return g;}});
});}
test('available saves adopt the new route only at acceptance; mixed chapter saves reject forged flags atomically',()=>{
 const old=new GameEngine(previous),raw=old.save(),g=new GameEngine(data);g.load(raw);const expected=JSON.parse(raw);expected.state.worldTravel.version=2;assert.deepEqual(JSON.parse(g.save()),expected);
 const now=ready();go(now,{kind:'town',location:'royal_board'});assert.ok(now.accept('q061'));assert.equal(now.state.flags.currentStoryRoutes.q061,true);checkpoint(now);
 start(now,'q062');choose(now,'q062','names');const before=now.save();
 for(const mutate of [s=>delete s.flags.currentStoryRoutes.q062,s=>{s.flags.legacyStoryRoutes={q062:true};},s=>{s.flags.currentStoryRoutes.q061=false;}]){const bad=JSON.parse(before);mutate(bad.state);assert.throws(()=>now.load(JSON.stringify(bad)));assert.equal(now.save(),before);}
});
