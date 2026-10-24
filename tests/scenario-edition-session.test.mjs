import test from 'node:test';
import assert from 'node:assert/strict';
import {ScenarioEditionSession,SCENARIO_SAVE_KEY} from '../src/application/scenario-editions.js';
import {savedScenarioEdition} from '../src/core/scenario-editions.js';

const prefix='test:',key=prefix+SCENARIO_SAVE_KEY;
const catalog={schemaVersion:1,latest:'e2',editions:{e1:{label:'初版',questOverrides:{}},e2:{label:'第2版',questOverrides:{q001:'data/scenario-editions/e2/q001.json'}}}};
class MemoryStorage{
  constructor(entries={}){this.values=new Map(Object.entries(entries));this.writes=[];this.readError=false;this.writeError=false;}
  getItem(key){if(this.readError)throw Error('blocked storage');return this.values.get(key)??null;}
  setItem(key,value){if(this.writeError)throw Error('quota');this.values.set(key,value);this.writes.push({key,value});}
  snapshot(){return [...this.values];}
}
class TestEngine{
  constructor(data){this.data=data;this.state={version:1,gameId:'test-game',contentVersion:'1.34.0',scenarioEdition:data.scenarioEdition,moves:0};}
  save(){return JSON.stringify({saveVersion:1,gameId:'test-game',contentVersion:'1.34.0',scenarioEdition:this.data.scenarioEdition,state:this.state});}
  load(text){
    if(text.length>4000)throw Error('save size');
    const save=JSON.parse(text);if(savedScenarioEdition(text)!==this.data.scenarioEdition||!Number.isInteger(save.state.moves)||save.state.moves<0)throw Error('invalid state');
    this.state={...save.state,scenarioEdition:this.data.scenarioEdition};
  }
}
function saved(edition='e1',moves=12,{legacy=false}={}){
  const engine=new TestEngine({scenarioEdition:edition});engine.state.moves=moves;const save=JSON.parse(engine.save());
  if(legacy){delete save.scenarioEdition;delete save.state.scenarioEdition;}
  return JSON.stringify(save,null,2);
}
function fixture(entries={},options={}){
  const storage=new MemoryStorage(entries),loads=[],busy=[];
  const create=()=>new ScenarioEditionSession({catalog,storage,prefix,createEngine:data=>new TestEngine(data),onBusy:value=>busy.push(value),loadData:async edition=>{loads.push(edition);return options.load?options.load(edition):{scenarioEdition:edition,scenarioEditions:catalog};}});
  return {storage,loads,busy,create,session:create()};
}

test('a first visit starts the latest edition and persists its concrete active edition',async()=>{
  const {session,storage,loads}=fixture();assert.deepEqual(await session.start(),{resumed:false,message:''});
  assert.equal(session.activeEdition,'e2');assert.equal(session.preference,'latest');assert.equal(session.engine.state.moves,0);
  const registry=JSON.parse(storage.getItem(key));assert.equal(registry.active,'e2');assert.equal(savedScenarioEdition(registry.editions.e2.auto),'e2');
  assert.deepEqual(loads,['e2']);assert.equal(storage.getItem(prefix+'auto'),null);
});

test('legacy auto and all three legacy slots remain byte-identical while e1 resumes',async()=>{
  const entries={auto:saved('e1',19,{legacy:true}),slot1:saved('e1',3,{legacy:true}),slot2:saved('e1',4,{legacy:true}),slot3:saved('e1',5,{legacy:true})};
  const {session,storage,create}=fixture(Object.fromEntries(Object.entries(entries).map(([k,v])=>[prefix+k,v])));
  assert.equal((await session.start()).resumed,true);assert.equal(session.activeEdition,'e1');assert.equal(session.preference,'latest');assert.equal(session.engine.state.moves,19);
  for(let i=1;i<=3;i++)assert.equal(session.readSlot(i),entries[`slot${i}`]);
  session.engine.state.moves=25;await session.switchEdition('latest');assert.equal(session.activeEdition,'e2');assert.equal(session.engine.state.moves,0);
  await session.importSave(entries.auto);assert.equal(session.activeEdition,'e1');assert.equal(session.preference,'latest');
  const restarted=create();await restarted.start();assert.equal(restarted.activeEdition,'e1');assert.equal(restarted.engine.state.moves,19);assert.equal(restarted.preference,'latest');
  for(const [k,v] of Object.entries(entries))assert.equal(storage.getItem(prefix+k),v);
});

test('auto saves and numbered slots remain separate across edition switches',async()=>{
  const {session,create}=fixture();await session.start();session.engine.state.moves=20;session.saveSlot(1);session.engine.state.moves=21;
  await session.switchEdition('e1');assert.equal(session.readSlot(1),null);session.engine.state.moves=10;session.saveSlot(1);session.engine.state.moves=11;session.autosave();
  await session.switchEdition('e2');assert.equal(session.engine.state.moves,21);await session.loadSlot(1);assert.equal(session.engine.state.moves,20);
  await session.switchEdition('e1');assert.equal(session.engine.state.moves,11);await session.loadSlot(1);assert.equal(session.engine.state.moves,10);
  const restarted=create();await restarted.start();assert.equal(restarted.activeEdition,'e1');assert.equal(restarted.preference,'e1');assert.equal(restarted.engine.state.moves,10);
});

test('new game follows the preference while preserving other editions and numbered slots',async()=>{
  const {session,storage}=fixture({[prefix+'auto']:saved('e1',7,{legacy:true})});await session.start();session.engine.state.moves=9;session.saveSlot(2);
  await session.newGame();assert.equal(session.activeEdition,'e2');assert.equal(session.engine.state.moves,0);assert.equal(session.preference,'latest');
  await session.switchEdition('e1');assert.equal(session.engine.state.moves,9);const slot=session.readSlot(2);await session.newGame();assert.equal(session.activeEdition,'e1');assert.equal(session.engine.state.moves,0);assert.equal(session.readSlot(2),slot);
  assert.equal(JSON.parse(storage.getItem(prefix+'auto')).state.moves,7);
});

test('imports select the recorded edition before restoration and preserve previous progress',async()=>{
  const {session,loads}=fixture();await session.start();session.engine.state.moves=33;
  await session.importSave(saved('e1',8,{legacy:true}));assert.equal(session.activeEdition,'e1');assert.equal(session.engine.state.moves,8);assert.deepEqual(loads,['e2','e1']);
  await session.switchEdition('e2');assert.equal(session.engine.state.moves,33);await session.importSave(saved('e2',44));assert.equal(session.engine.state.moves,44);
  assert.deepEqual(loads,['e2','e1'],'each edition data is prepared only once');
});

test('invalid JSON, edition mismatches, unknown editions and invalid state imports never reset the current game',async()=>{
  const {session,storage}=fixture();await session.start();session.engine.state.moves=28;session.autosave();
  const bad=[];bad.push('{bad',null);const unknown=JSON.parse(saved('e2'));unknown.scenarioEdition='e3';unknown.state.scenarioEdition='e3';bad.push(JSON.stringify(unknown));
  const mismatch=JSON.parse(saved('e1'));mismatch.scenarioEdition='e2';bad.push(JSON.stringify(mismatch));const partial=JSON.parse(saved('e2'));delete partial.state.scenarioEdition;bad.push(JSON.stringify(partial));
  const invalid=JSON.parse(saved('e1'));invalid.state.moves=-1;bad.push(JSON.stringify(invalid));bad.push(saved('e1')+' '.repeat(4000));
  const engine=session.engine,raw=storage.snapshot();
  for(const value of bad){await assert.rejects(session.importSave(value));assert.equal(session.engine,engine);assert.equal(session.activeEdition,'e2');assert.equal(session.engine.state.moves,28);assert.deepEqual(storage.snapshot(),raw);assert.equal(session.busy,false);}
});

test('an unreadable target auto or mismatched slot fails without altering any stored bytes',async()=>{
  const {session,storage}=fixture({[prefix+'scenario:e1:auto']:'broken',[prefix+'scenario:e2:slot1']:saved('e1',16)});
  // A namespaced e1 auto is an existing journey too; start on a valid e2 marker.
  storage.values.set(key,JSON.stringify({schemaVersion:1,preference:'latest',active:'e2',editions:{e2:{auto:saved('e2',14)}}}));await session.start();
  const engine=session.engine,raw=storage.snapshot();await assert.rejects(session.switchEdition('e1'));await assert.rejects(session.loadSlot(1));
  assert.equal(session.engine,engine);assert.deepEqual(storage.snapshot(),raw);assert.equal(session.preference,'latest');
});

test('failed content loads release the async lock and can be retried without losing either journey',async()=>{
  const cold=fixture({[prefix+'auto']:saved('e1',9,{legacy:true})},{load:async()=>{throw Error('startup network unavailable');}}),untouched=cold.storage.snapshot();
  await assert.rejects(cold.session.start(),/startup network/);assert.equal(cold.session.engine,undefined);assert.deepEqual(cold.storage.snapshot(),untouched);assert.equal(cold.loads.length,1);
  let fail=true;const {session,storage}=fixture({}, {load:async edition=>{if(edition==='e1'&&fail)throw Error('network unavailable');return {scenarioEdition:edition};}});await session.start();session.engine.state.moves=17;
  const engine=session.engine,raw=storage.snapshot();await assert.rejects(session.switchEdition('e1'),/network/);assert.equal(session.engine,engine);assert.equal(session.engine.state.moves,17);assert.deepEqual(storage.snapshot(),raw);
  fail=false;await session.switchEdition('e1');await session.switchEdition('e2');assert.equal(session.engine.state.moves,17);
});

test('a quota failure atomically preserves the current engine, preference, autos and slots',async()=>{
  const {session,storage}=fixture();await session.start();session.engine.state.moves=12;session.saveSlot(1);session.engine.state.moves=13;
  const raw=storage.snapshot(),engine=session.engine;storage.writeError=true;
  await assert.rejects(session.switchEdition('e1'),/保存できません/);await assert.rejects(session.importSave(saved('e1')),/保存できません/);await assert.rejects(session.newGame(),/保存できません/);
  assert.throws(()=>session.saveSlot(2),/保存できません/);assert.throws(()=>session.autosave(),/保存できません/);
  assert.equal(session.engine,engine);assert.equal(session.engine.state.moves,13);assert.equal(session.preference,'latest');assert.deepEqual(storage.snapshot(),raw);
  storage.writeError=false;await session.switchEdition('e1');await session.switchEdition('e2');assert.equal(session.engine.state.moves,13);
});

test('concurrent switch, load, import and save attempts cannot commit while an edition is loading',async()=>{
  let release;const {session,storage,busy}=fixture({}, {load:edition=>edition==='e1'?new Promise(resolve=>{release=()=>resolve({scenarioEdition:edition});}):{scenarioEdition:edition}});await session.start();
  const previous=storage.snapshot(),pending=session.switchEdition('e1');await Promise.resolve();await Promise.resolve();assert.equal(session.busy,true);
  await assert.rejects(session.switchEdition('e2'),/読み込み中/);await assert.rejects(session.importSave(saved('e2')),/読み込み中/);await assert.rejects(session.loadSlot(1),/読み込み中/);assert.throws(()=>session.saveSlot(1),/読み込み中/);assert.deepEqual(storage.snapshot(),previous);
  release();await pending;assert.equal(session.activeEdition,'e1');assert.equal(session.busy,false);assert.deepEqual(busy,[true,false,true,false]);
});

test('an unavailable storage API permits a temporary game and file export without overwriting unread records',async()=>{
  const {session,storage}=fixture({[key]:'unknown unread bytes'});storage.readError=true;const started=await session.start();assert.match(started.message,/保存できません/);assert.equal(session.activeEdition,'e2');assert.equal(savedScenarioEdition(session.engine.save()),'e2');
  storage.readError=false;await assert.rejects(session.switchEdition('e1'),/保存できません/);assert.equal(storage.getItem(key),'unknown unread bytes');assert.equal(session.activeEdition,'e2');
});

test('a corrupt startup auto is protected until explicit recovery and survives switching to another edition',async()=>{
  const raw='broken legacy auto',slot=saved('e1',5,{legacy:true}),{session,storage}=fixture({[prefix+'auto']:raw,[prefix+'slot1']:slot});
  assert.equal((await session.start()).recovery,true);assert.equal(session.requiresRecovery,true);assert.throws(()=>session.autosave(),/保護/);assert.equal(storage.getItem(key),null);
  await session.loadSlot(1);assert.equal(session.requiresRecovery,false);assert.equal(session.engine.state.moves,5);assert.equal(storage.getItem(prefix+'auto'),raw);assert.equal(storage.getItem(prefix+'slot1'),slot);
  await session.switchEdition('latest');assert.equal(session.activeEdition,'e2');assert.equal(storage.getItem(prefix+'auto'),raw);
});

test('a malformed registry and an external tab update never get overwritten',async()=>{
  const malformed=fixture({[key]:'invalid registry'});await assert.rejects(malformed.session.start(),/記録一覧/);assert.equal(malformed.storage.getItem(key),'invalid registry');
  const {session,storage}=fixture();await session.start();const external=JSON.stringify({schemaVersion:1,preference:'e1',active:'e1',editions:{e1:{auto:saved('e1',99)}}});storage.values.set(key,external);
  assert.throws(()=>session.autosave(),/別の画面/);await assert.rejects(session.switchEdition('e1'),/別の画面/);assert.equal(storage.getItem(key),external);assert.equal(session.activeEdition,'e2');
});
