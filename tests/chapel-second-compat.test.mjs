import test from 'node:test';
import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {loadContent} from '../src/core/loader.js';
import {migrateSave,validateSave} from '../src/core/save.js';
import {nextQuestPlace} from '../src/core/quest-navigation.js';
import {read,fixture,auditQuest,replay,resolveBattle} from '../tools/audit-regional-relocation.mjs';
import {data,ready,checkpoint,drain,go,start,choose} from './pilgrimage-helpers.mjs';
export const previous=await loadContent(async file=>{
 if(file==='data/scenario-editions/e2/geography.json')return read('tests/fixtures/e2-geography-before-chapel-second.json');
 const value=await read(file);if(file==='data/scenario-editions.json'){for(let n=131;n<=140;n++)delete value.editions.e2.questOverrides['q'+n];for(let n=61;n<=70;n++)delete value.editions.e2.questOverrides['q0'+n];}return value;
},{edition:'e2'});
function oldFixture(id,options={}){
 const {accepted=true,entered=true,started=true}=options,g=fixture(previous,id,{accepted:false,entered:false,started:false});
 g.state.worldTravel.registrations.oddland_entry=true;g.state.worldTravel.visited.oddland=true;g.state.worldTravel.visited.oddland_plateau=true;
 g.state.worldTravel.returnAnchor='oddland_plateau';g.state.townLocation='pilgrim_board';
 if(accepted)assert.ok(g.accept(id));if(entered){const p=previous.quests[id].locations.find(p=>p.role==='decision');g.teleport(p.map,p.x,p.y);}
 if(started)g.run(previous.quests[id].model.entryScript??id+'.visit');return g;
}
for(let n=131;n<=140;n++){const id='q'+n;test(`${id}: accepted revision-2 routes retain scripts, every ending and their saved continuations`,()=>{
 const oldReport=auditQuest(previous,id,{makeFixture:()=>oldFixture(id)}),path=Object.values(oldReport.endings)[0];
 for(const stage of ['unaccepted','accepted','dungeon','text','choice','battle','completed']){
  const g=oldFixture(id,{accepted:stage!=='unaccepted',entered:!['unaccepted','accepted'].includes(stage),started:!['unaccepted','accepted','dungeon','battle'].includes(stage)});
  if(stage==='choice')drain(g);if(stage==='battle')g.startBattle(g.map().encounter,{win:[],escape:[],lose:[]});if(stage==='completed')replay(g,id,path);
  const raw=g.save(),saved=JSON.parse(raw),now=new GameEngine(data);now.load(raw);
  const expected=structuredClone(saved);if(stage!=='unaccepted')(expected.state.flags.legacyStoryRoutes??={})[id]=true;
  assert.deepEqual(JSON.parse(now.save()),expected,id+'/'+stage);assert.equal(g.save(),raw);checkpoint(now);
  if(stage!=='unaccepted'&&stage!=='completed')assert.equal(nextQuestPlace(data,now.state,id).map,previous.quests[id].locations[0].map);
 }
 auditQuest(data,id,{makeFixture:()=>{const old=oldFixture(id),g=new GameEngine(data);g.load(old.save());return g;}});
});}
test('newly accepted revision-2 routes stay current before their first scene, and malformed mixed routes fail atomically',()=>{
 const g=ready();go(g,{kind:'town',location:'pilgrim_board'});assert.ok(g.accept('q131'));checkpoint(g);assert.equal(g.state.flags.currentStoryRoutes.q131,true);assert.equal(g.state.flags.legacyStoryRoutes?.q131,undefined);
 const before=g.save();for(const mutate of [s=>s.flags.currentStoryRoutes.q131=false,s=>{s.flags.legacyStoryRoutes={q131:true};}]){const bad=JSON.parse(before);mutate(bad.state);assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),before);}
 start(g,'q132');choose(g,'q132','room');const valid=g.save(),bad=JSON.parse(valid);delete bad.state.flags.currentStoryRoutes.q132;assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),valid);
});
test('available revision-2 save remains unchanged, then adopts the new route at acceptance',()=>{
 const old=new GameEngine(previous),raw=old.save(),g=new GameEngine(data);g.load(raw);assert.equal(g.save(),raw);assert.equal(g.state.scenarioRevision,2);
});
