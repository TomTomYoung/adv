import {referenceData} from '../config/shared/reference-catalog.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {data,newGame,drain} from './helpers.mjs';
import {prepareQuest} from './structure-routes.mjs';
import {GameEngine} from '../src/core/engine.js';
import {loadContent} from '../src/core/loader.js';
import {projectGame} from '../src/application/projection.js';
import {orderedQuests,questDisplayNumber,questOrderErrors} from '../src/core/quest-order.js';
import {questOrderArtifacts,buildQuestOrder} from '../tools/build-quest-order.mjs';
import {questCatalog,catalogContentHash} from '../tools/quest-catalog.mjs';
import {questPageBundle} from '../tools/quest-page.mjs';
import {GameView} from '../src/view/view.js';
import {SceneView} from '../src/view/scene-view.js';
import {installDOM} from './view-dom.mjs';

const reordered=()=>{
  const d=structuredClone(data),moved=Array.from({length:10},(_,i)=>`q${i+101}`);
  d.questOrder.ids=Object.values(d.quests).sort((a,b)=>a.number-b.number).map(q=>q.id);
  d.questOrder.ids=['q001',...moved,...d.questOrder.ids.filter(id=>id!=='q001'&&!moved.includes(id))];
  return d;
};

test('insertion preserves original source numbers and definition order',()=>{
  assert.equal(data.questOrder.ids.length,Object.keys(data.quests).length);
  assert.equal(referenceData.names.questOrder,undefined,'presentation metadata is not an entity collection');
  assert.deepEqual(Object.keys(data.quests).slice(0,200),Array.from({length:200},(_,i)=>`q${String(i+1).padStart(3,'0')}`));
  assert.equal(questDisplayNumber(data,'q002'),12);
  for(const q of Object.values(data.quests))assert.equal(q.number,Number(q.id.slice(1)));
});

test('ten new IDs can occupy display 002–011 without renaming q002 or mutating definitions',()=>{
  const d=structuredClone(data),original=JSON.stringify(d.quests),added=[];
  for(let i=211;i<=220;i++){const id=`q${i}`;d.quests[id]={id,number:i};added.push(id);}
  d.questOrder.ids.splice(1,0,...added);
  assert.deepEqual(questOrderErrors(d),[]);
  assert.deepEqual(orderedQuests(d).slice(1,11).map(q=>q.id),added);
  assert.equal(questDisplayNumber(d,'q002'),22);
  for(const id of added)delete d.quests[id];
  assert.equal(JSON.stringify(d.quests),original);
});

test('reordering preserves an in-progress q002 save, VM continuation, tracking and actions',()=>{
  const g=prepareQuest('q002'),save=g.save(),d=reordered(),h=new GameEngine(d);
  h.load(save);assert.equal(h.save(),save);
  assert.equal(projectGame(h).quests.find(q=>q.id==='q002').number,12);
  assert.equal(projectGame(h).tracked.id,'q002');
  assert.ok(g.dispatch({type:'choose',id:'school'}));assert.ok(h.dispatch({type:'choose',id:'school'}));
  drain(g);drain(h);assert.equal(h.save(),g.save());
  assert.deepEqual(d.quests,data.quests);assert.deepEqual(d.scripts,data.scripts);
  assert.deepEqual(d.game.files.quests,data.game.files.quests,'gameplay event iteration is independent');
});

test('display 002 does not acquire q002 progression or satisfy the original q100 ending prerequisites',()=>{
  const d=reordered(),g=new GameEngine(d);drain(g);
  assert.equal(questDisplayNumber(d,'q101'),2);assert.equal(g.unlocked(d.quests.q100),false);
  assert.ok(g.accept('q101'));g.complete('q101',Object.entries(d.quests.q101.outcomes).find(([,o])=>!o.requires)[0]);
  assert.equal(g.state.quests.q002.stage,'available');assert.equal(g.unlocked(d.quests.q100),false);
  assert.deepEqual(d.quests.q100.requires,data.quests.q100.requires);
});

test('both views display the registry order and send stable IDs, including after filtering',()=>{
  for(const View of [GameView,SceneView]){
    const dom=installDOM();
    try{
      const g=new GameEngine(reordered());drain(g);
      const intents=[],v=Object.assign(Object.create(View.prototype),{dungeonFilter:'all',query:'',filter:'open',act:i=>intents.push(i)});
      v.quests(dom.root,projectGame(g));
      const cards=dom.root.querySelectorAll('.quest-card');
      assert.equal(cards[1].dataset.controlGroup,'quest:q101');
      assert.equal(cards[1].querySelector('.quest-number').textContent,'002');
      cards[1].querySelectorAll('button').find(b=>b.textContent==='依頼を受ける').click();
      assert.deepEqual(intents.pop(),{type:'accept',id:'q101'});
      dom.root.replaceChildren();v.query='骨の荷札';v.quests(dom.root,projectGame(g));
      assert.equal(dom.root.querySelectorAll('.quest-card').length,1);
      assert.equal(dom.root.querySelector('.quest-number').textContent,'012');
    }finally{dom.restore();}
  }
});

test('catalog order and numbers change while stable headings, detail pages and links survive',()=>{
  const d=reordered(),text=questCatalog(d,'2026-10-15');
  assert.ok(text.indexOf('## q101 ')<text.indexOf('## q002 '));
  assert.match(text,/## q002 骨の荷札\n\n表示番号: 012。内部ID: `q002`。/);
  const pages=questPageBundle(d,'q002'),page=Object.values(pages).find(s=>s.startsWith('# '));
  assert.match(page,/表示番号: 012/);assert.match(page,/QUEST_CATALOG\.md#q002-/);
  assert.notEqual(catalogContentHash(d),catalogContentHash(data));
});

test('loader rejects duplicate, missing, unknown and malformed registry entries',async()=>{
  for(const mutate of [o=>o.ids.push('q002'),o=>o.ids.pop(),o=>o.ids.push('q999'),o=>o.ids[0]=null,o=>o.ids=[],o=>o.schemaVersion=2]){
    const order=structuredClone(data.questOrder);mutate(order);
    await assert.rejects(loadContent(async file=>file==='data/quest-order.json'?order:JSON.parse(await fs.readFile(new URL('../'+file,import.meta.url),'utf8'))),/questOrder/);
  }
  assert.ok(questOrderErrors({...data,questOrder:undefined}).length);
  const legacy={...data,game:{...data.game,files:{...data.game.files,databases:{}}}};delete legacy.questOrder;
  assert.deepEqual(orderedQuests(legacy).map(q=>q.id),Object.values(data.quests).sort((a,b)=>a.number-b.number).map(q=>q.id));
});

test('compiler registers an inserted quest without rewriting files or gameplay order, and rejects omissions before writes',async()=>{
  const folder=await fs.mkdtemp(path.join(os.tmpdir(),'adv-quest-order-'));
  const write=async(file,value)=>{await fs.mkdir(path.dirname(path.join(folder,file)),{recursive:true});await fs.writeFile(path.join(folder,file),JSON.stringify(value)+'\n');};
  try{
    const game={files:{databases:{},quests:['data/quests/q001.json','data/quests/q002.json']}};
    await write('data/game.json',game);
    for(const id of ['q001','q002','q201'])await write(`data/quests/${id}.json`,{id});
    await write('authoring/quest-order.json',{schemaVersion:1,ids:['q001','q201','q002']});
    const artifacts=await questOrderArtifacts(folder),manifest=JSON.parse(artifacts.get('data/game.json'));
    assert.deepEqual(manifest.files.quests,[...game.files.quests,'data/quests/q201.json']);
    await buildQuestOrder(folder);await buildQuestOrder(folder,{check:true});
    const before=await fs.readFile(path.join(folder,'data/game.json'),'utf8');
    await write('authoring/quest-order.json',{schemaVersion:1,ids:['q001','q201']});
    await assert.rejects(buildQuestOrder(folder),/表示順にないクエスト q002/);
    assert.equal(await fs.readFile(path.join(folder,'data/game.json'),'utf8'),before);
  }finally{await fs.rm(folder,{recursive:true,force:true});}
});
