import test from 'node:test';
import assert from 'node:assert/strict';
import {data,newGame,drain,exploreSpot,goTownLocation} from './helpers.mjs';
import {prepareQuest,finishJourney} from './structure-routes.mjs';
import {projectGame} from '../src/application/projection.js';
import {fireContext} from '../src/core/systems/fire-network.js';
import {restoreGame} from '../src/application/restore.js';
import {plainNarration,editNarration,proseKeys,outsideQuotes} from '../authoring/narration.mjs';
const choose=(g,id,arrive=false)=>{assert.ok(g.dispatch({type:'choose',id}),id);drain(g);if(arrive)finishJourney(g);};
const checkpoint=g=>{const save=g.save();g.load(save);assert.equal(g.save(),save);};
const questState=(g,id)=>g.state.stories[id];

test('q001 departures keep physical position; wrong-site interaction cannot skip the route',()=>{
 const g=prepareQuest('q001'),before=structuredClone(g.state.location),steps=g.state.steps;
 choose(g,'talk');assert.deepEqual(g.state.location,before);assert.equal(g.state.steps,steps);
 assert.equal(questState(g,'q001').values.rookieAt,'entry');assert.equal(questState(g,'q001').scene,null);
 const journey=structuredClone(g.state.journey);checkpoint(g);
 assert.equal(g.dispatch({type:'journey.arrive'}),false);assert.ok(g.dispatch({type:'interact'}));
 assert.deepEqual(g.state.journey,journey);assert.equal(g.state.waiting,null);
 const destination=data.quests.q001.story.worldPlaces.dark;exploreSpot(g,destination,{maintain:true,interact:false});
 assert.ok(g.state.steps>steps);assert.ok(g.dispatch({type:'interact'}));drain(g);
 assert.equal(questState(g,'q001').scene,'dark');assert.equal(g.state.journey,null);checkpoint(g);
});

test('q001 scene reentry and remote script attempts cannot refill fire or trigger the outage',()=>{
 const g=prepareQuest('q001');choose(g,'pause');const fire=fireContext(data,g.state).run.portable;fire.fuel=12;
 assert.ok(g.dispatch({type:'story.resume',quest:'q001'}));drain(g);assert.equal(fireContext(data,g.state).run.portable.fuel,12);
 choose(g,'talk');const before=structuredClone(fireContext(data,g.state).run.portable),journey=structuredClone(g.state.journey);
 g.run('q001.v11.outage');drain(g);assert.deepEqual(fireContext(data,g.state).run.portable,before);
 assert.deepEqual(g.state.journey,journey);assert.notEqual(g.state.objects['kagaribi_f1/q001_last_lamp'],'extinguished');checkpoint(g);
});

test('q001 rescue returns through the entrance and physical post before the report exists',()=>{
 const g=prepareQuest('q001');for(const id of ['talk','inspect','follow'])choose(g,id,true);
 const loc=structuredClone(g.state.location);choose(g,'support');assert.deepEqual(g.state.location,loc);
 assert.equal(questState(g,'q001').values.elderAt,'transit');checkpoint(g);finishJourney(g);
 assert.equal(questState(g,'q001').scene,'outage');assert.equal(g.dispatch({type:'choose',id:'pause'}),false);
 choose(g,'call');assert.equal(g.dispatch({type:'choose',id:'pause'}),false);choose(g,'home');
 assert.equal(questState(g,'q001').values.reported,false);assert.equal(g.state.mode,'dungeon');checkpoint(g);finishJourney(g);
 assert.equal(questState(g,'q001').scene,'gate');assert.equal(g.state.mode,'dungeon');
 choose(g,'report');assert.equal(questState(g,'q001').values.reported,false);checkpoint(g);finishJourney(g);
 assert.equal(g.state.townLocation,'hikarigaeri_lamplighter_post');assert.equal(questState(g,'q001').values.reported,true);
 for(const who of ['elderAt','rookieAt','partyAt'])assert.equal(questState(g,'q001').values[who],'post');
 choose(g,'rest');assert.equal(g.state.quests.q001.outcome,'compromise');checkpoint(g);
});

test('q003 evacuation completes at the refuge, not when the party leaves the alarm',()=>{
 const g=prepareQuest('q003'),loc=structuredClone(g.state.location);
 choose(g,'warn');assert.deepEqual(g.state.location,loc);assert.equal(questState(g,'q003').values.warned,false);
 assert.equal(questState(g,'q003').values.passersAt,'passage');finishJourney(g);choose(g,'escort');
 assert.equal(questState(g,'q003').values.passersAt,'transit');assert.equal(questState(g,'q003').values.warned,false);checkpoint(g);
 finishJourney(g);assert.equal(g.state.townLocation,'hikarigaeri_waterwatch');assert.equal(questState(g,'q003').values.warned,true);
 choose(g,'return',true);assert.equal(questState(g,'q003').values.passersAt,'high');assert.equal(questState(g,'q003').scene,'safe');
});

test('q003 evidence waits for the cistern and the bell is collected before it can be carried uphill',()=>{
 const g=prepareQuest('q003');for(const id of ['warn','escort','return'])choose(g,id,true);
 choose(g,'upstream');assert.equal(questState(g,'q003').values.causeKnown,false);checkpoint(g);finishJourney(g);
 assert.equal(g.state.townLocation,'hikarigaeri_tavern_cistern');assert.equal(questState(g,'q003').values.causeKnown,true);
 choose(g,'relay');assert.equal(questState(g,'q003').values.bellAt,'alarm');checkpoint(g);finishJourney(g);
 assert.equal(questState(g,'q003').scene,'collect');choose(g,'carry');
 assert.equal(questState(g,'q003').values.bellAt,'party');assert.equal(questState(g,'q003').values.soraAt,'transit');checkpoint(g);
 finishJourney(g);assert.equal(questState(g,'q003').values.bellAt,'high');choose(g,'roster');assert.equal(g.state.quests.q003.outcome,'compromise');
});

test('remote services, purchases and dungeon entrances fail without moving or charging the party',()=>{
 const g=newGame();g.state.gold=500;
 for(const intent of [{type:'service',id:'inn'},{type:'service',id:'clinic'},{type:'buy',item:'potion'}]){
  const before=structuredClone(g.state);assert.equal(g.dispatch(intent),false);
  // A rejected intent clears only the prior UI notice, never world state or resources.
  assert.deepEqual({...g.state,notice:before.notice},before);
 }
 assert.ok(projectGame(g).shop.every(x=>!x.canBuy));goTownLocation(g,'hikarigaeri_shop');assert.ok(g.dispatch({type:'buy',item:'potion'}));
 for(const intent of [{type:'travel',region:1},{type:'travel',dungeon:'kagaribi'}]){const before=structuredClone(g.state);assert.equal(g.dispatch(intent),false);
  // A rejected intent clears only the prior UI notice, never world state or resources.
  assert.deepEqual({...g.state,notice:before.notice},before);}
 assert.ok(projectGame(g).dungeons.every(x=>!x.canEnter));goTownLocation(g,data.game.world.townRoot);
 assert.equal(projectGame(g).quests.find(q=>q.id==='q001').entryDungeon,'kagaribi');assert.ok(g.dispatch({type:'travel',dungeon:'kagaribi'}));
});

test('world-connected q001-q003 scripts do not contain physical teleport or town-return commands',()=>{
 const ops=v=>Array.isArray(v)?v.flatMap(ops):v&&typeof v==='object'?[...(v.op?[v.op]:[]),...Object.values(v).flatMap(ops)]:[];
 for(const id of ['q001','q002','q003']){
  const q=data.quests[id];assert.ok(q.story.worldPlaces);
  assert.equal(ops(q.scripts).some(op=>op==='map.teleport'||op==='town.return'),false,id);
 }
});

test('plain narration preserves quoted and named speech, copulas, verb classes and already plain lexical endings',()=>{
 const examples={
  '「怖いです。今も」新人は答えました。':'「怖いです。今も」新人は答えた。',
  '記録を残します。記録します。明示します。':'記録を残す。記録する。明示する。',
  '物資が不足します。町へ戻します。':'物資が不足する。町へ戻す。',
  '鐘を伸ばします。警報が当たります。':'鐘を伸ばす。警報が当たる。',
  '一日延びました。町へ行きました。':'一日延びた。町へ行った。',
  '目を覚ましました。目を覚ました。目を覚ます。':'目を覚ました。目を覚ました。目を覚ます。',
  '来た時点ですでに穏やかです。':'来た時点ですでに穏やかだ。',
  '保存できませんでした。鐘はありません。':'保存できなかった。鐘はない。',
  '「『終わりました』と伝えてください」彼は言いました。':'「『終わりました』と伝えてください」彼は言った。'
 };
 for(const [before,after] of Object.entries(examples)){assert.equal(plainNarration(before),after);assert.equal(plainNarration(after),after);}
 const named={op:'say',name:'新人',text:'怖いです。今も。'};assert.deepEqual(editNarration(named),named);
 const named2={op:'say',speaker:'リネ',text:'お帰りなさい。無事でよかったです。'};assert.deepEqual(editNarration(named2),named2);
});

test('all 200 distributed quests use idempotent plain narration without changing VM operands',()=>{
 let checked=0;
 function walk(v,key=''){
  if(typeof v==='string'&&proseKeys.has(key)){
   assert.equal(plainNarration(v),v);checked++;
   outsideQuotes(v,t=>{assert.doesNotMatch(t,/(?:です|でした|ません(?:でした)?|ましょう|でしょう)(?=$|[。、！？!?\s]|が|から|ので)/u);return t;});
  }else if(Array.isArray(v))v.forEach(x=>walk(x,key));
  else if(v&&typeof v==='object')for(const[k,x]of Object.entries(v))if(!(v.op==='say'&&(v.name||v.speaker)&&k==='text'))walk(x,k);
 }
 assert.equal(Object.keys(data.quests).length,200);for(const q of Object.values(data.quests)){assert.deepEqual(editNarration(q),q);walk(q);}
 for(const s of Object.values(data.scripts))walk(s);assert.ok(checked>15000);
});

test('1.10.0 saves restart rather than migrating incompatible journey and narration checkpoints',()=>{
 const g=prepareQuest('q001');choose(g,'talk');const current=g.save();assert.equal(restoreGame(data,current).restarted,false);
 const old=JSON.parse(current);old.contentVersion='1.10.0';assert.equal(restoreGame(data,JSON.stringify(old)).restarted,true);
});
