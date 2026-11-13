import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {data,ready,start,choose} from './library-helpers.mjs';
import {projectGame} from '../src/application/projection.js';
import {compileRelocatedQuest} from '../tools/compile-relocated-quest.mjs';
import {librarySecondSource} from '../authoring/editions/e2/salome/library-second.mjs';

const q=data.quests.q145,options={prefix:'library',eventPrefix:'library',settlement:'salome',settlementName:'サロメ',board:'salome_board',boardName:'サロメの共同依頼所',source:'authoring/editions/e2/salome/library-second.mjs',stage:'library-second-ten',scope:'書庫後半10件の現場・出張・同行・受渡し。受注済みの改訂2は旧経路を保持。',preserveAcceptedRoute:true,battle:'boss_5'};
const cast=g=>(projectGame(g).dialog.scene?.cast??[]).map(c=>c.id);

test('q145 only connects the mother to her home and three garden decision outcomes',()=>{
 const first=JSON.parse(fs.readFileSync(new URL('../data/quests/q145.json',import.meta.url),'utf8'));
 const old=compileRelocatedQuest(first,librarySecondSource(first,{cast:false}),options);
 assert.equal(q.story.revision,1);assert.equal(q.model.edition.revision,1);
 assert.deepEqual(Object.fromEntries(Object.entries(q.story.scenes).map(([id,s])=>[id,s.cast.map(c=>c.entity)])),{
  entry:[],letter:['motherPerson'],mother:['motherPerson'],now_garden:['motherPerson'],sent:[],
  half_garden:['motherPerson'],collect_letter:[],waited_garden:['motherPerson']
 });
 assert.equal(Object.keys(q.story.actions).length,11);
 assert.equal(Object.values(q.story.actions).filter(a=>a.journey).length,8);
 for(const action of ['entry_visit','mother_wait','now_garden_send','collect_letter_deliver'])
  assert.deepEqual(q.story.actions[action].journey.companions,[]);
 for(const action of ['mother_now','mother_half','letter_open','letter_half'])
  assert.deepEqual(q.story.actions[action].journey.companions,['motherPerson']);
 assert.equal(q.story.entities.motherPerson.character,'q145_mother');
 for(const field of ['portrait','sprite'])assert.equal(data.characters.q145_mother[field],undefined);
 const actual=structuredClone(q);
 for(const scene of Object.values(actual.story.scenes))scene.cast=[];
 delete actual.story.entities.motherPerson.character;
 assert.deepEqual(actual,old);
});

test('q145 four completed routes keep the mother at her actual place and preserve letter/drawing transfer points',()=>{
 const routes=[
  {path:['visit','now','send','finish'],outcome:'now',waiting:false,partial:false},
  {path:['visit','half','finish'],outcome:'half',waiting:false,partial:true},
  {path:['visit','wait','deliver','open','finish'],outcome:'waited',waiting:true,partial:false},
  {path:['visit','wait','deliver','half','finish'],outcome:'half',waiting:true,partial:true}
 ];
 const motherScenes=['mother','letter','now_garden','half_garden','waited_garden'];
 for(const route of routes){
  const g=ready();start(g,'q145');const gold=g.state.gold;
  let s=g.state.stories.q145;
  assert.deepEqual(cast(g),[]);assert.equal(s.values.motherPersonAt,'mother');
  assert.equal(s.values.letterSheetAt,'post');assert.equal(s.values.flowerDrawingAt,'garden');
  for(const id of route.path){
   choose(g,'q145',id);s=g.state.stories.q145;
   if(g.state.quests.q145.stage==='completed')break;
   assert.deepEqual(cast(g),motherScenes.includes(s.scene)?['q145_mother']:[]);
   if(s.scene==='collect_letter'){
    assert.equal(s.values.motherPersonAt,'mother');
    assert.equal(s.values.letterSheetAt,'post');
    assert.equal(s.values.letterReceived,false);
   }
   if(s.scene==='letter'){
    assert.equal(s.values.motherPersonAt,'mother');
    assert.equal(s.values.letterSheetAt,'motherPerson');
    assert.equal(s.values.letterReceived,true);
   }
   if(s.scene==='sent'){
    assert.equal(s.values.motherPersonAt,'garden');
    assert.equal(s.values.flowerDrawingAt,'post');
    assert.equal(s.values.sent,false);
   }
   if(['now_garden','half_garden','waited_garden'].includes(s.scene)){
    assert.equal(s.values.motherPersonAt,'garden');
    assert.equal(s.values.motherAgreed,true);
   }
   assert.equal(g.state.gold,gold);
  }
  assert.equal(g.state.quests.q145.outcome,route.outcome);
  assert.equal(s.values.waitingAgreed,route.waiting);
  assert.equal(s.values.letterReceived,route.waiting);
  assert.equal(s.values.motherAgreed,true);
  assert.equal(s.values.partlyOpened,route.partial);
  assert.equal(s.values.opened,route.outcome==='waited'||route.outcome==='now');
  assert.equal(s.values.sent,route.outcome==='now');
  assert.equal(s.values.flowerDrawingAt,route.outcome==='now'?'post':'garden');
  assert.equal(s.values.letterSheetAt,route.waiting?'motherPerson':'post');
  assert.equal(g.state.gold,gold+q.outcomes[route.outcome].gold);
  const raw=g.save();assert.throws(()=>g.complete('q145',route.outcome));assert.equal(g.save(),raw);
 }
});
