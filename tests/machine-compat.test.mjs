import test from 'node:test';
import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {loadContent} from '../src/core/loader.js';
import {fixture,auditQuest,replay} from '../tools/audit-regional-relocation.mjs';
import {data,read,go,drain,start,choose,checkpoint} from './machine-helpers.mjs';
const previous=await loadContent(async file=>{
 if(file==='data/scenario-editions/e2/salome-geography.json')return read('tests/fixtures/e2-geography-before-machine.json');
 const value=await read(file);if(file==='data/scenario-editions.json')for(const n of [71,171].flatMap(s=>Array.from({length:10},(_,i)=>s+i)))delete value.editions.e2.questOverrides['q'+String(n).padStart(3,'0')];return value;
},{edition:'e2'});
function oldFixture(id,{accepted=true,entered=true,started=true}={}){
 const g=fixture(previous,id==='q080'?'q071':id,{accepted:false,entered:false,started:false});g.random=()=>.999999;if(id==='q080')g.state.vars.region_8=3;
 if(accepted){go(g,{kind:'town',location:'salome_board'});assert.ok(g.accept(id));}
 if(entered){const p=previous.quests[id].locations[0];g.teleport(p.map,p.x,p.y);}
 if(started)g.run(previous.quests[id].model.entryScript??id+'.visit');delete g.random;return g;
}
for(const n of [71,171].flatMap(s=>Array.from({length:10},(_,i)=>s+i))){const id='q'+String(n).padStart(3,'0');test(`${id}: saves after PR 142 keep all seven old phases and every legacy ending`,()=>{
 const report=auditQuest(previous,id,{makeFixture:()=>oldFixture(id)}),path=Object.values(report.endings)[0];
 for(const phase of ['unaccepted','accepted','dungeon','text','choice','battle','completed']){
  const old=oldFixture(id,{accepted:phase!=='unaccepted',entered:!['unaccepted','accepted'].includes(phase),started:!['unaccepted','accepted','dungeon','battle'].includes(phase)});
  if(phase==='choice')drain(old);if(phase==='battle')old.startBattle(old.map().encounter,{win:[],escape:[],lose:[]});if(phase==='completed')replay(old,id,path);
  const raw=old.save(),expected=JSON.parse(raw),g=new GameEngine(data);if(phase!=='unaccepted')(expected.state.flags.legacyStoryRoutes??={})[id]=true;
  g.load(raw);assert.deepEqual(JSON.parse(g.save()),expected);assert.equal(old.save(),raw);checkpoint(g);
 }
 auditQuest(data,id,{makeFixture:()=>{const g=new GameEngine(data);g.load(oldFixture(id).save());return g;}});
 for(const key of ['id','number','title','region','requires','outcomes'])assert.deepEqual(data.quests[id][key],previous.quests[id][key]);
});}
test('an active library flower journey remains byte-for-byte unchanged through the machinery expansion',()=>{
 const old=new GameEngine(previous,1907);drain(old);old.random=()=>.999999;start(old,'q147');assert.ok(old.dispatch({type:'choose',id:'water'}));drain(old);assert.ok(old.state.journey);
 const raw=old.save(),g=new GameEngine(data);g.load(raw);assert.equal(g.save(),raw);assert.deepEqual(data.quests.q147,previous.quests.q147);g.random=()=>.999999;go(g,data.quests.q147.story.worldPlaces.water);drain(g);choose(g,'q147','deliver');choose(g,'q147','finish');assert.equal(g.state.quests.q147.outcome,'quiet');checkpoint(g);
});
