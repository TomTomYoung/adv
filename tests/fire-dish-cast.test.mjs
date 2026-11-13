import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {data,ready,start,choose} from './library-helpers.mjs';
import {projectGame} from '../src/application/projection.js';
import {compileRelocatedQuest} from '../tools/compile-relocated-quest.mjs';
import {librarySecondSource} from '../authoring/editions/e2/salome/library-second.mjs';

const q=data.quests.q143,crew=['meme','assistant','spirit'],all=[...crew,'replacement'];
const options={prefix:'library',eventPrefix:'library',settlement:'salome',settlementName:'サロメ',board:'salome_board',boardName:'サロメの共同依頼所',source:'authoring/editions/e2/salome/library-second.mjs',stage:'library-second-ten',scope:'書庫後半10件の現場・出張・同行・受渡し。受注済みの改訂2は旧経路を保持。',preserveAcceptedRoute:true,battle:'boss_5'};
const casts=id=>q.story.scenes[id].cast.map(c=>c.entity);
const visible=g=>(projectGame(g).dialog.scene?.cast??[]).map(c=>c.id);

test('q143 adds four cast references in eight scenes, with no change to source routes, revision, flags or rewards',()=>{
 const first=JSON.parse(fs.readFileSync(new URL('../data/quests/q143.json',import.meta.url),'utf8'));
 const previous=compileRelocatedQuest(first,librarySecondSource(first,{cast:false}),options);
 assert.equal(q.story.revision,1);assert.equal(q.model.edition.revision,1);
 assert.deepEqual(Object.fromEntries(Object.keys(q.story.scenes).map(id=>[id,casts(id)])),{
  entry:crew,roles:crew,hire:all,fire_show:all,plates:crew,taste_show:crew,shift_show:crew,entry_hire_ready:crew
 });
 assert.equal(Object.keys(q.story.actions).length,10);
 assert.equal(Object.values(q.story.actions).filter(a=>a.journey).length,6);
 assert.deepEqual(q.story.actions.entry_hire_ready_continue.journey.companions,crew);
 assert.deepEqual(q.story.actions.hire_escort.journey.companions,all);
 assert.deepEqual(q.story.actions.plates_carry.journey.companions,crew);
 assert.deepEqual(q.story.actions.roles_agree.journey.companions,crew);
 assert.deepEqual(q.story.actions.entry_hire.cost,{gold:40});
 for(const [entity,character] of [['meme','q143_meme'],['assistant','q143_assistant'],['spirit','q143_spirit'],['replacement','q143_replacement']]){
  assert.equal(q.story.entities[entity].character,character);
  for(const field of ['portrait','sprite'])assert.equal(data.characters[character][field],undefined);
 }
 const actual=structuredClone(q);
 for(const node of Object.values(actual.story.scenes))node.cast=[];
 for(const entity of ['meme','assistant','spirit','replacement'])delete actual.story.entities[entity].character;
 assert.deepEqual(actual,previous);
});

test('q143 four endings and paths preserve the paid replacement, the resting spirit, and item transfer at finish',()=>{
 const routes=[
  {path:['hire','continue','escort','finish'],outcome:'fire',fee:40,roles:false},
  {path:['taste','carry','finish'],outcome:'taste',fee:0,roles:false},
  {path:['roles','taste','carry','finish'],outcome:'taste',fee:0,roles:false},
  {path:['roles','agree','finish'],outcome:'shift',fee:0,roles:true}
 ];
 for(const route of routes){
  const g=ready();start(g,'q143');
  let s=g.state.stories.q143;
  const gold=g.state.gold;
  assert.deepEqual(visible(g),crew.map(id=>'q143_'+id));
  assert.equal(s.values.replacementAt,'hire');
  assert.equal(s.values.platesAt,'supply');
  for(const key of route.path){
   choose(g,'q143',key);s=g.state.stories.q143;
   for(const id of crew)assert.equal(s.values[id+'At'],s.values.partyAt);
   if(g.state.quests.q143.stage==='completed')break;
   assert.deepEqual(visible(g),(s.scene==='hire'||s.scene==='fire_show'?all:crew).map(id=>'q143_'+id));
   if(s.scene==='entry_hire_ready'){assert.equal(s.values.hirePaid,true);assert.equal(s.values.replacementAt,'hire');assert.equal(g.state.gold,gold-40);}
   if(s.scene==='hire'){assert.equal(s.values.replacementAt,'hire');assert.equal(g.state.gold,gold-40);}
   if(s.scene==='fire_show'){assert.equal(s.values.replacementAt,'stage');assert.equal(s.values.resting,false);assert.equal(s.values.served,false);}
   if(s.scene==='plates'){assert.equal(s.values.platesAt,'supply');assert.equal(s.values.finished,false);}
   if(s.scene==='taste_show'){assert.equal(s.values.platesAt,'party');assert.equal(s.values.finished,false);}
   if(s.scene==='shift_show'){assert.equal(s.values.rolesAgreed,true);assert.equal(s.values.finished,false);}
  }
  assert.equal(g.state.quests.q143.outcome,route.outcome);
  assert.equal(s.values.hirePaid,route.fee===40);
  assert.equal(s.values.rolesAgreed,route.roles);
  assert.equal(s.values.resting,true);assert.equal(s.values.served,true);
  assert.equal(s.values.platesAt,route.outcome==='taste'?'stage':'supply');
  assert.equal(g.state.gold,gold-route.fee+q.outcomes[route.outcome].gold);
  const raw=g.save();assert.throws(()=>g.complete('q143',route.outcome));assert.equal(g.save(),raw);
 }
});
