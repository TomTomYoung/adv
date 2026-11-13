import test from 'node:test';
import assert from 'node:assert/strict';
import {data,ready,start,choose} from './library-helpers.mjs';
import {projectGame} from '../src/application/projection.js';
import {compileRelocatedQuest} from '../tools/compile-relocated-quest.mjs';
import {librarySecondSource} from '../authoring/editions/e2/salome/library-second.mjs';

const q=data.quests.q141;
const sceneCast=id=>q.story.scenes[id].cast.map(c=>c.entity);
const options={prefix:'library',eventPrefix:'library',settlement:'salome',settlementName:'サロメ',board:'salome_board',boardName:'サロメの共同依頼所',source:'authoring/editions/e2/salome/library-second.mjs',stage:'library-second-ten',scope:'書庫後半10件の現場・出張・同行・受渡し。受注済みの改訂2は旧経路を保持。',preserveAcceptedRoute:true,battle:'boss_5'};

test('q141 changes only two cast roles, real arrival of the ensemble, and story revision',()=>{
 const previous=compileRelocatedQuest(data.previousQuestRoutes.q141??data.quests.q141,librarySecondSource(data.previousQuestRoutes.q141??data.quests.q141,{cast:false}),options);
 assert.equal(q.model.edition.revision,2);
 assert.equal(q.story.revision,2);
 assert.deepEqual(q.model.storyUpgrades[0].previous,previous.story);
 assert.deepEqual(q.story.entities.sana.character,'q141_sana');
 assert.deepEqual(q.story.entities.band,{holder:'bandAt',kind:'group',character:'q141_band'});
 assert.deepEqual(q.story.registry.bandAt.values,['entry','stage']);
 assert.deepEqual(Object.fromEntries(Object.keys(q.story.scenes).map(id=>[id,sceneCast(id)])),{
  entry:['band'],sana:['sana'],score_use:[],performed_use:['band'],score_new:[],performed_new:['band'],performed_silent:['band']
 });
 assert.equal(Object.keys(q.story.scenes).length,7);
 assert.equal(Object.keys(q.story.actions).length,10);
 assert.equal(Object.values(q.story.actions).filter(a=>a.journey).length,7);
 for(const a of Object.values(q.story.actions))if(a.journey)assert.deepEqual(a.journey.companions,[]);
 for(const id of ['entry_silent','score_use_carry','score_new_carry']){
  const moves=q.story.actions[id].effects.filter(e=>e.entities?.includes('band'));
  assert.equal(moves.length,1,id);
  assert.deepEqual(moves[0].path,['entry','transit','stage']);
  assert.equal(moves[0].when.right,'entry');
 }
 for(const id of ['entry_ask','entry_new','sana_use','sana_new'])assert.ok(!q.story.actions[id].effects.some(e=>e.entities?.includes('band')));
 assert.equal(q.story.registry.performerAgreed.initial,false);
 for(const id of ['q141_sana','q141_band'])for(const prop of ['portrait','sprite'])assert.equal(data.characters[id][prop],undefined);
});

test('q141 four paths keep independent consents, delivery timing, casts, and one-time rewards',()=>{
 const routes=[
  {path:['ask','use','carry','finish'],outcome:'use',permission:true},
  {path:['ask','new','carry','finish'],outcome:'new',permission:false},
  {path:['new','carry','finish'],outcome:'new',permission:false},
  {path:['silent','finish'],outcome:'silent',permission:false}
 ];
 for(const r of routes){
  const g=ready();start(g,'q141');let s=g.state.stories.q141;
  assert.equal(s.values.bandAt,'entry');assert.equal(s.values.sanaAt,'laundry');
  assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['q141_band']);
  const gold=g.state.gold;
  for(let i=0;i<r.path.length;i++){
   const id=r.path[i],from=g.state.stories.q141.scene;
   choose(g,'q141',id);
   s=g.state.stories.q141;
   if(g.state.quests.q141.stage==='completed')break;
   assert.equal(s.values.sanaAt,'laundry');
   if(s.scene==='sana')assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['q141_sana']);
   if(s.scene==='score_use'||s.scene==='score_new')assert.deepEqual(projectGame(g).dialog.scene.cast,[]);
   if(s.scene?.startsWith('performed_')){
    assert.equal(s.values.bandAt,'stage');
    assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['q141_band']);
    assert.equal(s.values.finished,false);
    assert.equal(s.values.bannerAt,'party');
    if(s.scene!=='performed_silent')assert.equal(s.values.scoreSheetAt,'party');
    assert.equal(g.state.gold,gold);
   }
  }
  assert.equal(g.state.quests.q141.outcome,r.outcome);
  assert.equal(s.values.performerAgreed,false);
  assert.equal(s.values.musicAllowed,r.permission);
  assert.equal(s.values.nameAllowed,r.permission);
  assert.equal(s.values.finished,true);
  assert.equal(s.values.bannerAt,'stage');
  if(r.outcome!=='silent')assert.equal(s.values.scoreSheetAt,'stage');
  assert.equal(g.state.gold,gold+q.outcomes[r.outcome].gold);
  const raw=g.save();assert.throws(()=>g.complete('q141',r.outcome));assert.equal(g.save(),raw);
 }
});
