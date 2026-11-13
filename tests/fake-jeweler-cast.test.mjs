import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {data,ready,start,choose} from './library-helpers.mjs';
import {projectGame} from '../src/application/projection.js';
import {compileRelocatedQuest} from '../tools/compile-relocated-quest.mjs';
import {librarySecondSource} from '../authoring/editions/e2/salome/library-second.mjs';

const q=data.quests.q142;
const casts=id=>q.story.scenes[id].cast.map(c=>c.entity);
const options={prefix:'library',eventPrefix:'library',settlement:'salome',settlementName:'サロメ',board:'salome_board',boardName:'サロメの共同依頼所',source:'authoring/editions/e2/salome/library-second.mjs',stage:'library-second-ten',scope:'書庫後半10件の現場・出張・同行・受渡し。受注済みの改訂2は旧経路を保持。',preserveAcceptedRoute:true,battle:'boss_5'};

test('q142 adds only fixed cast and existing character references without altering revision or routes',()=>{
 const first=JSON.parse(fs.readFileSync(new URL('../data/quests/q142.json',import.meta.url),'utf8'));
 const previous=compileRelocatedQuest(first,librarySecondSource(first,{cast:false}),options);
 assert.equal(q.story.revision,1);
 assert.equal(q.model.edition.revision,1);
 assert.deepEqual(Object.fromEntries(Object.keys(q.story.scenes).map(id=>[id,casts(id)])),{
  entry:['kio'],buyer:['kio','buyerPerson'],refunded:['kio','buyerPerson'],repair_contract:['kio','buyerPerson']
 });
 assert.equal(Object.values(q.story.actions).length,8);
 assert.equal(Object.values(q.story.actions).filter(a=>a.journey).length,3);
 assert.deepEqual(q.story.actions.entry_tell.journey.companions,['kio']);
 assert.deepEqual(q.story.actions.entry_later.journey.companions,['kio']);
 assert.deepEqual(q.story.actions.buyer_repair.journey.companions,['kio','buyerPerson']);
 assert.equal(q.story.entities.kio.character,'q142_kio');
 assert.equal(q.story.entities.buyerPerson.character,'q142_buyer');
 for(const id of ['q142_kio','q142_buyer'])for(const prop of ['portrait','sprite'])assert.equal(data.characters[id][prop],undefined);
 const actual=structuredClone(q);
 for(const id of Object.keys(actual.story.scenes))actual.story.scenes[id].cast=[];
 delete actual.story.entities.kio.character;delete actual.story.entities.buyerPerson.character;
 assert.deepEqual(actual,previous);
});

test('q142 all decision routes preserve the ring, real escorts, condition text and one-time outcomes',()=>{
 const routes=[
  {path:['refuse'],outcome:'refuse',before:false},
  {path:['tell','refund','finish'],outcome:'refund',before:true},
  {path:['later','refund','finish'],outcome:'refund',before:false},
  {path:['tell','repair','finish'],outcome:'repair',before:true},
  {path:['later','repair','finish'],outcome:'repair',before:false},
  {path:['tell','refuse'],outcome:'refuse',before:true},
  {path:['later','refuse'],outcome:'refuse',before:false}
 ];
 for(const r of routes){
  const g=ready();start(g,'q142');let s=g.state.stories.q142;const gold=g.state.gold;
  assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['q142_kio']);
  assert.equal(s.values.ringAt,'buyerPerson');
  for(const id of r.path){
   choose(g,'q142',id);
   s=g.state.stories.q142;
   assert.equal(s.values.ringAt,'buyerPerson');
   if(g.state.quests.q142.stage==='completed')break;
   if(s.scene==='buyer'){
    assert.equal(s.values.kioAt,'buyer');assert.equal(s.values.buyerPersonAt,'buyer');
    assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['q142_kio','q142_buyer']);
   }
   if(s.scene==='refunded'){
    assert.equal(s.values.refunded,false);
    assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['q142_kio','q142_buyer']);
   }
   if(s.scene==='repair_contract'){
    assert.equal(s.values.kioAt,'repair');assert.equal(s.values.buyerPersonAt,'repair');
    assert.equal(s.values.repairSigned,false);
    assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['q142_kio','q142_buyer']);
   }
   assert.equal(g.state.gold,gold);
  }
  assert.equal(g.state.quests.q142.outcome,r.outcome);
  assert.equal(s.values.before,r.before);
  assert.equal(s.values.ringAt,'buyerPerson');
  assert.equal(s.values.refunded,r.outcome==='refund');
  assert.equal(s.values.repairSigned,r.outcome==='repair');
  assert.equal(s.values.secretExchangeRefused,r.outcome==='refuse');
  assert.equal(g.state.gold,gold+q.outcomes[r.outcome].gold);
  const raw=g.save();assert.throws(()=>g.complete('q142',r.outcome));assert.equal(g.save(),raw);
 }
});
