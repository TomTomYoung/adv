import test from 'node:test';
import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {worldTravelView} from '../src/core/world-travel.js';
import {loadStages,resolveBattle,read,auditQuest} from '../tools/audit-regional-relocation.mjs';
import {ScenarioEditionSession,SCENARIO_SAVE_KEY} from '../src/application/scenario-editions.js';
import {loadContent} from '../src/core/loader.js';
import {data,border,drain,walk,inspect,roadGo,go,start,choose,checkpoint,ready,audit} from './pilgrimage-helpers.mjs';

const reports={};
for(let n=31;n<=40;n++){const id='q'+String(n).padStart(3,'0');test(`${id}: every ending walks to its physical scenes, resumes saves and pays once`,()=>{reports[id]=audit(id);});}
test('relocation preserves all original quest IDs, prerequisites and reward amounts',async()=>{
 for(const n of [...Array.from({length:10},(_,i)=>31+i),...Array.from({length:10},(_,i)=>131+i)]){
  const id='q'+String(n).padStart(3,'0'),old=await read('data/quests/'+id+'.json'),q=data.quests[id],expected=structuredClone(old.outcomes);
  // q040 corrects only the fragment prose: the date is remembered and the mirror stays at entry.
  if(id==='q040')Object.assign(expected.fragment,{label:'覚えている日付を記録し、鏡はその場に残す',text:'門が閉じた日付だけを残した。名と言葉の続きは失われたまま、記録係は伝聞と明記し、別の証人を探すことにした。'});
  assert.deepEqual(q.outcomes,expected);assert.deepEqual(q.requires,old.requires);assert.equal(q.region,old.region);
 }
 assert.equal(Object.keys(data.quests).length,300);assert.equal(data.scenarioEditions.editions.e2.saveRevision,2);assert.equal(data.worldTravelLegacy,undefined);assert.equal(data.regionalLegacy,undefined);
});

test('a repeatable meeting journey saves on its second trip without duplicating the document',()=>{
 const g=ready();start(g,'q034');choose(g,'q034','read');choose(g,'q034','face');choose(g,'q034','document');
 assert.ok(g.dispatch({type:'choose',id:'face'}));checkpoint(g);assert.equal(g.state.stories.q034.values.documentAt,'party');
 go(g,{kind:'town',location:'pilgrim_meeting'});drain(g);choose(g,'q034','arrange');assert.equal(g.state.quests.q034.outcome,'compromise');
});

test('a zero-money, zero-oil party walks every new road both ways and cannot warp to the chapel from another town',()=>{
 const g=border();g.state.gold=0;g.state.light=0;
 for(const item of Object.keys(g.state.inventory))g.state.inventory[item]=0;
 for(const location of ['oddland_market','oddland_village','oddland_plateau','oddland_market','oddland_border']){roadGo(g,{kind:'town',location});assert.equal(g.state.worldTravel.visited[location==='oddland_border'?'oddland':location],true);checkpoint(g);}
 assert.equal(g.state.gold,0);assert.equal(g.state.light,0);assert.equal(g.dispatch({type:'travel',dungeon:'region_4'}),false);assert.equal(g.accept('q031'),false);
 roadGo(g,{kind:'town',location:'pilgrim_board'});assert.ok(g.accept('q031'));assert.ok(g.dispatch({type:'quest.travel',id:'q031'}));assert.equal(g.state.location.map,'region_4_f1');assert.equal(worldTravelView(g).country,'オッドランド');
 g.defeat();drain(g);assert.equal(g.state.townLocation,'oddland_plateau');roadGo(g,{kind:'town',location:'oddland_border'});assert.equal(g.dispatch({type:'quest.travel',id:'q031'}),false);checkpoint(g);
});

test('chapel exits, return marks and rescue arrive at the plateau; mirrors preserve the expedition',()=>{
 for(const kind of ['exit','mark','defeat']){
  const g=ready();roadGo(g,{kind:'town',location:'oddland_plateau'});assert.ok(g.dispatch({type:'travel',dungeon:'region_4'}));
  walk(g,1,2);const run=g.state.dungeons.active.run;assert.ok(g.dispatch({type:'dungeon.action',system:'mirrors',action:'warp',target:'mirror_1_0'}));assert.equal(g.state.dungeons.active.run,run);checkpoint(g);
  if(kind==='exit'){go(g,{kind:'dungeon',dungeon:'region_4',map:'region_4_f1',x:1,y:1});inspect(g,'exit');drain(g);}else if(kind==='mark')assert.ok(g.dispatch({type:'retreat'}));else g.defeat();
  assert.equal(g.state.townLocation,'oddland_plateau');checkpoint(g);
 }
});

test('all ten chapel quests finish in one save and q040 keeps its original prerequisite and battle',()=>{
 const g=ready();roadGo(g,{kind:'town',location:'pilgrim_board'});assert.equal(g.accept('q040'),false);
 for(let n=31;n<=40;n++){const id='q'+String(n).padStart(3,'0');start(g,id);const path=Object.values(reports[id].ends)[0];for(const choice of path)choose(g,id,choice);assert.equal(g.state.quests[id].stage,'completed');}
 assert.equal(g.state.vars.region_4,10);checkpoint(g);
});

test('q037 cannot return a letter before arrival, supports reordered deliveries, and survives a retreat mid-journey',()=>{
 const g=ready();start(g,'q037');choose(g,'q037','move');
 assert.ok(g.dispatch({type:'choose',id:'third'}));assert.equal(g.state.stories.q037.values.third,false);assert.equal(g.state.stories.q037.values.letter_thirdAt,'party');assert.equal(g.dispatch({type:'story.resume',quest:'q037'}),false);checkpoint(g);
 assert.ok(g.dispatch({type:'retreat'}));go(g,{kind:'town',location:'pilgrim_third'});drain(g);assert.equal(g.state.stories.q037.values.third,true);assert.equal(g.state.stories.q037.values.letter_thirdAt,'owner_third');
 choose(g,'q037','back');for(const key of ['first','second']){choose(g,'q037',key);choose(g,'q037','back');}choose(g,'q037','finish');assert.equal(g.state.quests.q037.outcome,'informed');
});

test('q040 keeps the original no-escape battle and a loss does not award its ending',()=>{
 for(const result of ['lose']){
  const g=ready();g.state.vars.region_4=3;start(g,'q040');choose(g,'q040','seal',{combat:'pending'});assert.ok(g.state.battle);checkpoint(g);
  assert.equal(g.dispatch({type:'battle',action:'escape'}),false);delete g.random;resolveBattle(g,result);checkpoint(g);assert.equal(g.state.quests.q040.stage,'active');assert.equal(g.state.stories.q040.values.finished,false);
  const p=data.quests.q040.story.worldPlaces.entry;go(g,p);assert.ok(g.dispatch({type:'story.resume',quest:'q040'}));drain(g);choose(g,'q040','seal');assert.equal(g.state.quests.q040.outcome,'contract');
 }
});

test('e2 rejects pre-cut saves atomically and e1 still accepts its original format',async()=>{
 const oldData=(await loadStages()).firstTen,old=new GameEngine(oldData);drain(old);old.accept('q031');const raw=old.save(),g=ready(),before=g.save();
 assert.throws(()=>g.load(raw),/旧記録は非対応/);assert.equal(g.save(),before);assert.equal(old.save(),raw);
 for(const mutate of [s=>delete s.scenarioRevision,s=>delete s.state.scenarioRevision,s=>{s.scenarioRevision=s.state.scenarioRevision=1;},s=>{s.scenarioRevision=s.state.scenarioRevision=3;}]){const saved=JSON.parse(before);mutate(saved);assert.throws(()=>g.load(JSON.stringify(saved)));assert.equal(g.save(),before);}
 const first=await loadContent(read),e1=new GameEngine(first),saved=e1.save();assert.equal(JSON.parse(saved).scenarioRevision,undefined);e1.load(saved);assert.equal(e1.save(),saved);
});

test('startup explains the one-time cut, exports the protected old bytes, and starts fresh only on explicit New Game',async()=>{
 const old=new GameEngine((await loadStages()).firstTen),raw=old.save(),prefix='test:',key=prefix+SCENARIO_SAVE_KEY;
 const registry=JSON.stringify({schemaVersion:1,preference:'latest',active:'e2',editions:{e2:{auto:raw,slot1:raw}}});
 const stored=new Map([[key,registry]]),storage={getItem:key=>stored.get(key)??null,setItem:(key,value)=>stored.set(key,value)};
 const session=new ScenarioEditionSession({catalog:data.scenarioEditions,loadData:edition=>loadContent(read,{edition}),storage,prefix});
 const result=await session.start();assert.equal(result.recovery,true);assert.match(result.message,/旧記録は非対応/);assert.equal(stored.get(key),registry);assert.equal(session.exportSave(),raw);assert.throws(()=>session.autosave());
 await session.newGame();assert.equal(session.requiresRecovery,false);assert.equal(session.engine.state.scenarioRevision,2);assert.equal(JSON.parse(stored.get(key)).editions.e2.slot1,raw);
 const current=session.engine.save(),saved=stored.get(key);await assert.rejects(session.loadSlot(1),/旧記録は非対応/);assert.equal(session.engine.save(),current);assert.equal(stored.get(key),saved);
 session.saveSlot(2);await session.loadSlot(2);assert.equal(session.engine.save(),current);
});
