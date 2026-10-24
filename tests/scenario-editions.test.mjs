import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {data} from './helpers.mjs';
import {loadContent} from '../src/core/loader.js';
import {GameEngine} from '../src/core/engine.js';
import {migrateSave,validateSave} from '../src/core/save.js';
import {resolveScenarioEdition,savedScenarioEdition} from '../src/core/scenario-editions.js';

const read=async file=>JSON.parse(await fs.readFile(new URL(`../${file}`,import.meta.url),'utf8'));
const unpin=save=>{const legacy=structuredClone(save);delete legacy.scenarioEdition;delete legacy.state.scenarioEdition;return legacy;};
const edition2=()=>loadContent(read,{edition:'e2'});

test('latest resolves through the edition catalog while unsupported choices and catalog paths fail',()=>{
  assert.equal(resolveScenarioEdition(data.scenarioEditions),'e2');
  assert.equal(resolveScenarioEdition(data.scenarioEditions,'e1'),'e1');
  assert.equal(resolveScenarioEdition(data.scenarioEditions,'e2'),'e2');
  for(const id of ['e3','2','',null])assert.throws(()=>resolveScenarioEdition(data.scenarioEditions,id));
  for(const change of [c=>{c.latest='e3';},c=>{delete c.editions.e1;},c=>{c.editions.e2.questOverrides.q001='../outside.json';},c=>{c.editions.e2.questOverrides.q001='data/../outside.json';},c=>{c.editions.e2.questOverrides=null;}]){
    const bad=structuredClone(data.scenarioEditions);change(bad);assert.throws(()=>resolveScenarioEdition(bad));
  }
});

test('edition overrides replace the quest before script merging and map-event projection',async()=>{
  const original=await read('data/quests/q001.json'),override=structuredClone(original),entry=override.model.entryScript;
  override.scripts[entry].commands.push({op:'say',text:'第2版差替え確認。'});
  override.events[0].title='第2版のイベント';
  const calls=[];
  const reader=async file=>{
    calls.push(file);
    if(file==='data/scenario-editions/e2/q001.json')return structuredClone(override);
    const doc=await read(file);
    if(file==='data/quests/q001.json')doc.scripts['q001.edition_legacy_only']={commands:[{op:'say',text:'初版のみ。'}]};
    return doc;
  };
  const initial=await loadContent(reader);
  assert.equal(initial.scenarioEdition,'e1');assert.ok(initial.scripts['q001.edition_legacy_only']);
  assert.equal(calls.includes('data/scenario-editions/e2/q001.json'),false,'the low-level default never loads edition two');
  const second=await loadContent(reader,{edition:'latest'});
  assert.equal(second.scenarioEdition,'e2');assert.equal(second.game.version,initial.game.version);
  assert.deepEqual(second.quests.q002,initial.quests.q002,'unchanged quests are inherited');
  assert.equal(second.scripts['q001.edition_legacy_only'],undefined,'unselected scripts are not merged');
  assert.equal(second.scripts[entry].commands.at(-1).text,'第2版差替え確認。');
  const event=override.events[0],map=second.maps[event.points[0].map],objects=map.objects.filter(object=>object.id===event.id);
  assert.equal(objects.length,1);assert.equal(objects[0].name,event.title);
  assert.equal(initial.quests.q001.events[0].title,original.events[0].title,'loading another edition does not mutate the first');
});

test('loader refuses overrides for a missing quest or with a different quest ID',async()=>{
  await assert.rejects(loadContent(async file=>{
    const doc=await read(file);
    if(file==='data/scenario-editions.json')doc.editions.e2.questOverrides={q999:'data/scenario-editions/e2/q001.json'};
    return doc;
  },{edition:'e2'}),/差替え元/);
  await assert.rejects(loadContent(async file=>{
    if(file==='data/scenario-editions/e2/q001.json'){const doc=await read('data/quests/q001.json');doc.id='q002';return doc;}
    return read(file);
  },{edition:'e2'}),/依頼IDが一致/);
});

test('legacy content readers without an edition catalog retain the first-edition default',async()=>{
  const legacy=await loadContent(async file=>{const doc=await read(file);if(file==='data/game.json')delete doc.files.databases.scenarioEditions;return doc;});
  assert.equal(legacy.scenarioEdition,'e1');assert.equal(resolveScenarioEdition(legacy.scenarioEditions),'e1');
});

for(const edition of ['e1','e2'])test(`${edition}: a saved concrete edition round-trips while dialogue is pending`,async()=>{
  const selected=edition==='e1'?data:await edition2(),g=new GameEngine(selected,91),before=g.save(),saved=JSON.parse(before);
  assert.equal(g.state.waiting.type,'text');assert.equal(saved.scenarioEdition,edition);assert.equal(saved.state.scenarioEdition,edition);
  assert.equal(savedScenarioEdition(before),edition);assert.deepEqual(validateSave(saved,selected),[]);
  g.load(before);assert.equal(g.save(),before);
});

test('legacy saves are pinned to edition one without changing progress, resources, or the original input',()=>{
  const g=new GameEngine(data,91),current=JSON.parse(g.save()),legacy=unpin(current),untouched=structuredClone(legacy);
  assert.equal(savedScenarioEdition(JSON.stringify(legacy)),'e1');
  const migrated=migrateSave(legacy,data);
  assert.equal(migrated.scenarioEdition,'e1');assert.equal(migrated.state.scenarioEdition,'e1');
  assert.deepEqual(migrated,current);assert.deepEqual(legacy,untouched);
  g.load(JSON.stringify(legacy));assert.deepEqual(JSON.parse(g.save()),current);
});

test('edition pinning composes with a supported older content-version migration',async()=>{
  const legacy=await read('tests/fixtures/mine-encounters-save-1.33.0.json'),untouched=structuredClone(legacy),g=new GameEngine(data);
  g.load(JSON.stringify(legacy));
  const expected=structuredClone(legacy.state);expected.contentVersion=data.game.version;expected.scenarioEdition='e1';
  assert.deepEqual(g.state,expected);assert.deepEqual(legacy,untouched);assert.equal(savedScenarioEdition(g.save()),'e1');
});

test('a mismatched edition cannot mutate the active engine or silently reuse quest rewards',async()=>{
  const second=await edition2(),firstGame=new GameEngine(data,17),secondGame=new GameEngine(second,29);
  for(const [target,incoming] of [[firstGame,secondGame.save()],[secondGame,firstGame.save()],[secondGame,JSON.stringify(unpin(JSON.parse(firstGame.save())))]]){
    const before=target.save(),feedback=target.feedback;
    assert.throws(()=>target.load(incoming),/シナリオ版/);
    assert.equal(target.save(),before);assert.equal(target.feedback,feedback);
  }
});

test('invalid, incomplete, inconsistent and unknown edition pins are rejected without state changes',()=>{
  const g=new GameEngine(data),before=g.save(),current=JSON.parse(before);
  for(const text of ['',null,'null','[]','{}','{'])assert.throws(()=>savedScenarioEdition(text));
  const changes=[
    s=>{s.scenarioEdition='latest';s.state.scenarioEdition='latest';},
    s=>{s.scenarioEdition='e3';s.state.scenarioEdition='e3';},
    s=>{s.state.scenarioEdition='e2';},
    s=>{delete s.scenarioEdition;},
    s=>{delete s.state.scenarioEdition;},
    s=>{s.state.contentVersion='different';},
    s=>{s.state.gameId='different';},
    s=>{s.saveVersion=2;},
    s=>{s.state=null;}
  ];
  for(const change of changes){
    const bad=structuredClone(current);change(bad);const text=JSON.stringify(bad);
    assert.throws(()=>savedScenarioEdition(text));assert.throws(()=>g.load(text));assert.equal(g.save(),before);
  }
  const incompatible=structuredClone(current);incompatible.contentVersion=incompatible.state.contentVersion='99.0.0';
  assert.equal(savedScenarioEdition(JSON.stringify(incompatible)),'e1','content compatibility is a separate check');
  assert.throws(()=>g.load(JSON.stringify(incompatible)));assert.equal(g.save(),before);
});
