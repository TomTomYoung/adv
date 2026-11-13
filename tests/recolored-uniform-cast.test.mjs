import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {data,ready,start,choose} from './library-helpers.mjs';
import {projectGame} from '../src/application/projection.js';
import {compileRelocatedQuest} from '../tools/compile-relocated-quest.mjs';
import {librarySecondSource} from '../authoring/editions/e2/salome/library-second.mjs';

const q=data.quests.q146,options={prefix:'library',eventPrefix:'library',settlement:'salome',settlementName:'サロメ',board:'salome_board',boardName:'サロメの共同依頼所',source:'authoring/editions/e2/salome/library-second.mjs',stage:'library-second-ten',scope:'書庫後半10件の現場・出張・同行・受渡し。受注済みの改訂2は旧経路を保持。',preserveAcceptedRoute:true,battle:'boss_5'};
const cast=g=>(projectGame(g).dialog.scene?.cast??[]).map(c=>c.id);

test('q146 adds only veteran and colleagues casts, keeping original routes and revision',()=>{
 const first=JSON.parse(fs.readFileSync(new URL('../data/quests/q146.json',import.meta.url),'utf8'));
 const old=compileRelocatedQuest(first,librarySecondSource(first,{cast:false}),options);
 assert.equal(q.story.revision,1);assert.equal(q.model.edition.revision,1);
 assert.deepEqual(Object.fromEntries(Object.entries(q.story.scenes).map(([id,s])=>[id,s.cast.map(c=>c.entity)])),{
  entry:['veteran'],friends:['veteran','colleagues'],dyed:['veteran'],reunion:['veteran','colleagues'],
  tailored:['veteran'],stored:['veteran']
 });
 assert.equal(Object.keys(q.story.actions).length,9);
 assert.equal(Object.values(q.story.actions).filter(a=>a.journey).length,6);
 for(const id of ['entry_friends','entry_coat','entry_keep','friends_release','friends_keep','dyed_meet'])
  assert.deepEqual(q.story.actions[id].journey.companions,['veteran']);
 assert.equal(q.story.entities.veteran.character,'q146_veteran');
 assert.equal(q.story.entities.colleagues.character,'q146_colleagues');
 assert.equal(q.story.entities.colleagues.kind,'group');
 for(const id of ['q146_veteran','q146_colleagues'])for(const field of ['portrait','sprite'])assert.equal(data.characters[id][field],undefined);
 const actual=structuredClone(q);
 for(const scene of Object.values(actual.story.scenes))scene.cast=[];
 delete actual.story.entities.veteran.character;delete actual.story.entities.colleagues.character;
 assert.deepEqual(actual,old);
});

test('q146 four routes separate paired consent, dyeing, keeping and final storage handoff',()=>{
 const routes=[
  {path:['friends','release','meet','finish'],outcome:'release'},
  {path:['coat','finish'],outcome:'coat'},
  {path:['keep','finish'],outcome:'keep'},
  {path:['friends','keep','finish'],outcome:'keep'}
 ];
 for(const route of routes){
  const g=ready();start(g,'q146');const gold=g.state.gold;
  let s=g.state.stories.q146;
  assert.deepEqual(cast(g),['q146_veteran']);
  assert.equal(s.values.colleaguesAt,'friends');assert.equal(s.values.uniformAt,'veteran');
  for(const choiceId of route.path){
   choose(g,'q146',choiceId);s=g.state.stories.q146;
   assert.equal(s.values.colleaguesAt,'friends');
   if(g.state.quests.q146.stage==='completed')break;
   assert.equal(s.values.veteranAt,s.values.partyAt);
   assert.deepEqual(cast(g),['friends','reunion'].includes(s.scene)?['q146_veteran','q146_colleagues']:['q146_veteran']);
   assert.equal(s.values.uniformAt,'veteran');
   if(s.scene==='dyed')assert.equal(s.values.bothAgreed,true);
   if(s.scene==='reunion'){assert.equal(s.values.released,true);assert.equal(s.values.dyed,true);assert.equal(s.values.reunited,false);}
   if(s.scene==='stored'){assert.equal(s.values.stored,false);assert.equal(s.values.uniformAt,'veteran');}
   assert.equal(g.state.gold,gold);
  }
  assert.equal(g.state.quests.q146.outcome,route.outcome);
  assert.equal(s.values.uniformAt,route.outcome==='keep'?'storage':'veteran');
  assert.equal(s.values.stored,route.outcome==='keep');
  assert.equal(s.values.cutAgreed,route.outcome==='coat');
  assert.equal(s.values.cut,route.outcome==='coat');
  assert.equal(s.values.tailored,route.outcome==='coat');
  for(const flag of ['bothAgreed','released','dyed','reunited'])assert.equal(s.values[flag],route.outcome==='release');
  assert.equal(g.state.gold,gold+q.outcomes[route.outcome].gold);
  const raw=g.save();assert.throws(()=>g.complete('q146',route.outcome));assert.equal(g.save(),raw);
 }
});
