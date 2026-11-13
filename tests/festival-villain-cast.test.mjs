import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {data,ready,start,choose} from './library-helpers.mjs';
import {projectGame} from '../src/application/projection.js';
import {compileRelocatedQuest} from '../tools/compile-relocated-quest.mjs';
import {librarySecondSource} from '../authoring/editions/e2/salome/library-second.mjs';

const q=data.quests.q144,pair=['jill','wardrobe'],trio=[...pair,'youngActor'];
const options={prefix:'library',eventPrefix:'library',settlement:'salome',settlementName:'サロメ',board:'salome_board',boardName:'サロメの共同依頼所',source:'authoring/editions/e2/salome/library-second.mjs',stage:'library-second-ten',scope:'書庫後半10件の現場・出張・同行・受渡し。受注済みの改訂2は旧経路を保持。',preserveAcceptedRoute:true,battle:'boss_5'};
const rawCast=id=>q.story.scenes[id].cast.map(c=>c.entity);
const liveCast=g=>(projectGame(g).dialog.scene?.cast??[]).map(c=>c.id);

test('q144 adds only three existing character references and route-sensitive casts',()=>{
 const first=JSON.parse(fs.readFileSync(new URL('../data/quests/q144.json',import.meta.url),'utf8'));
 const old=compileRelocatedQuest(first,librarySecondSource(first,{cast:false}),options);
 assert.equal(q.story.revision,1);assert.equal(q.model.edition.revision,1);
 assert.deepEqual(Object.fromEntries(Object.keys(q.story.scenes).map(id=>[id,rawCast(id)])),{
  entry:pair,play:trio,repair:pair,show_light:trio,show_wit:trio,retire_consent:pair,
  retire_after_trial:trio,last_show:trio
 });
 assert.equal(Object.keys(q.story.actions).length,11);
 assert.equal(Object.values(q.story.actions).filter(a=>a.journey).length,6);
 assert.deepEqual(q.story.actions.entry_trial.journey.companions,pair);
 assert.deepEqual(q.story.actions.play_light.journey.companions,trio);
 assert.deepEqual(q.story.actions.play_wit.journey.companions,trio);
 assert.deepEqual(q.story.actions.retire_consent_stage.journey.companions,pair);
 assert.deepEqual(q.story.actions.retire_after_trial_stage.journey.companions,trio);
 assert.deepEqual(q.story.scenes.last_show.cast[2].when,{op:'eq',left:{ref:'stories.q144.values.youngActorAt'},right:'stage'});
 for(const entity of trio){
  assert.equal(q.story.entities[entity].character,'q144_'+entity);
  for(const field of ['portrait','sprite'])assert.equal(data.characters['q144_'+entity][field],undefined);
 }
 const actual=structuredClone(q);
 for(const scene of Object.values(actual.story.scenes))scene.cast=[];
 for(const entity of trio)delete actual.story.entities[entity].character;
 assert.deepEqual(actual,old);
});

test('q144 four routes keep young actor hidden on direct retirement and preserve costume custody to finish',()=>{
 const routes=[
  {path:['trial','try','light','finish'],outcome:'light',trial:true,young:true},
  {path:['trial','try','wit','finish'],outcome:'wit',trial:true,young:true},
  {path:['retire','stage','finish'],outcome:'retire',trial:false,young:false},
  {path:['trial','try','retire','stage','finish'],outcome:'retire',trial:true,young:true}
 ];
 for(const r of routes){
  const g=ready();start(g,'q144');const gold=g.state.gold;
  let s=g.state.stories.q144;
  assert.deepEqual(liveCast(g),pair.map(id=>'q144_'+id));
  assert.equal(s.values.costumeAt,'entry');
  for(const key of r.path){
   choose(g,'q144',key);s=g.state.stories.q144;
   if(g.state.quests.q144.stage==='completed')break;
   const expected=['entry','repair','retire_consent'].includes(s.scene)?pair:
    s.scene==='last_show'&&!r.young?pair:trio;
   assert.deepEqual(liveCast(g),expected.map(id=>'q144_'+id));
   if(['play','show_light','show_wit','last_show'].includes(s.scene))
    assert.equal(s.values.costumeAt,'party');
   if(s.scene==='last_show'){
    assert.equal(s.values.youngActorAt,r.young?'stage':'trial');
    assert.equal(s.values.performed,false);
    assert.equal(s.values.retireAgreed,true);
   }
   if(['show_light','show_wit'].includes(s.scene))assert.equal(s.values.performed,false);
   assert.equal(g.state.gold,gold);
  }
  assert.equal(g.state.quests.q144.outcome,r.outcome);
  assert.equal(s.values.compensationRecorded,true);
  assert.equal(s.values.lightened,r.trial);
  assert.equal(s.values.retireAgreed,r.outcome==='retire');
  assert.equal(s.values.performed,true);
  assert.equal(s.values.costumeAt,'jill');
  assert.equal(s.values.youngActorAt,r.young?'stage':'trial');
  assert.equal(g.state.gold,gold+q.outcomes[r.outcome].gold);
  const raw=g.save();assert.throws(()=>g.complete('q144',r.outcome));assert.equal(g.save(),raw);
 }
});
