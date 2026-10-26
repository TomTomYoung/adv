import test from 'node:test';
import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {loadContent} from '../src/core/loader.js';
import {nextQuestPlace} from '../src/core/quest-navigation.js';
import {read,fixture,auditQuest,replay} from '../tools/audit-regional-relocation.mjs';
import {data,ready,go,checkpoint,drain} from './royal-helpers.mjs';
const numbers=[...Array.from({length:10},(_,i)=>81+i),...Array.from({length:10},(_,i)=>181+i)];
const previous=await loadContent(async file=>{
 if(file==='data/scenario-editions/e2/geography.json')return read('tests/fixtures/e2-geography-before-observatory.json');
 const value=await read(file);if(file==='data/scenario-editions.json')delete value.editions.e2.geographyUpgrade;if(file==='data/scenario-editions.json')for(let n=41;n<=50;n++)delete value.editions.e2.questOverrides['q0'+n];if(file==='data/scenario-editions.json')for(const n of numbers)delete value.editions.e2.questOverrides['q'+String(n).padStart(3,'0')];return value;
},{edition:'e2'});
function oldFixture(id,{accepted=true,entered=true,started=true,absent=null}={}){
 const g=fixture(previous,id==='q090'?'q081':id,{accepted:false,entered:false,started:false,absent});
 g.state.worldTravel.registrations.oddland_entry=true;g.state.worldTravel.visited.oddland_village=true;g.state.worldTravel.returnAnchor='oddland_village';g.state.townLocation='royal_board';
 if(id==='q090')g.state.vars.region_9=3;
 if(accepted)assert.ok(g.accept(id));if(entered){const p=previous.quests[id].locations.find(p=>p.role==='decision');g.teleport(p.map,p.x,p.y);}
 if(started)g.run(previous.quests[id].model.entryScript??id+'.visit');return g;
}
for(const n of numbers){const id='q'+String(n).padStart(3,'0');test(`${id}: all old endings and seven revision-2 save phases keep their original route`,()=>{
 const oldReport=auditQuest(previous,id,{makeFixture:(_data,_id,options)=>oldFixture(id,options)}),path=Object.values(oldReport.endings)[0];
 for(const stage of ['unaccepted','accepted','dungeon','text','choice','battle','completed']){
  const old=oldFixture(id,{accepted:stage!=='unaccepted',entered:!['unaccepted','accepted'].includes(stage),started:!['unaccepted','accepted','dungeon','battle'].includes(stage)});
  if(stage==='choice')drain(old);if(stage==='battle')old.startBattle(old.map().encounter,{win:[],escape:[],lose:[]});if(stage==='completed')replay(old,id,path);
  const raw=old.save(),expected=JSON.parse(raw),g=new GameEngine(data);g.load(raw);if(stage!=='unaccepted')(expected.state.flags.legacyStoryRoutes??={})[id]=true;
  expected.state.worldTravel.version=2;assert.deepEqual(JSON.parse(g.save()),expected,id+'/'+stage);assert.equal(old.save(),raw);checkpoint(g);
  if(!['unaccepted','completed'].includes(stage))assert.equal(nextQuestPlace(data,g.state,id).map,previous.quests[id].locations[0].map);
 }
 auditQuest(data,id,{makeFixture:(_data,_id,options)=>{const old=oldFixture(id,options),g=new GameEngine(data);g.load(old.save());return g;}});
 assert.deepEqual(data.quests[id].outcomes,previous.quests[id].outcomes);assert.deepEqual(data.quests[id].requires,previous.quests[id].requires);
});}
test('unaccepted revision-2 saves adopt the new route only on acceptance and reject mixed route flags atomically',()=>{
 const old=new GameEngine(previous),raw=old.save(),g=new GameEngine(data);g.load(raw);const expected=JSON.parse(raw);expected.state.worldTravel.version=2;assert.deepEqual(JSON.parse(g.save()),expected);assert.equal(g.state.scenarioRevision,2);
 const now=ready();go(now,{kind:'town',location:'royal_board'});assert.ok(now.accept('q081'));assert.equal(now.state.flags.currentStoryRoutes.q081,true);checkpoint(now);const before=now.save();
 for(const mutate of [s=>{s.flags.currentStoryRoutes.q081=false;},s=>{s.flags.legacyStoryRoutes={q081:true};}]){const bad=JSON.parse(before);mutate(bad.state);assert.throws(()=>now.load(JSON.stringify(bad)));assert.equal(now.save(),before);}
});
