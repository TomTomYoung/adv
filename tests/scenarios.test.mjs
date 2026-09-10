import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {data,newGame,drain,fight,exploreSpot} from './helpers.mjs';
import {commandsAt} from '../src/core/script.js';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {recordCount} from '../src/core/records.js';
import {validateContent} from '../src/core/validation.js';

const visit=id=>data.quests[id].model.entryScript??`${id}.visit`;
const scene=(g,id)=>g.state.flags.flow?.[id]?.node??g.state.flags.quest?.[id]?.node;
const options=g=>g.state.waiting?.type==='choice'?commandsAt(data,g.state.vm.at(-1))[g.state.waiting.index].options:[];
const enabled=(g,o)=>(o.visibleWhen===undefined||g.value(o.visibleWhen))&&(o.condition===undefined||g.value(o.condition));
function start(id,{rich=true,walk=true}={}){
 const g=newGame(1907);
 if(rich){g.award(0,data.system.xpBase*24*25);g.state.gold=5000;for(const item of ['rope','ration','potion','torch'])g.state.inventory[item]=99;g.healAll();}
 if(data.quests[id].number<=100)for(const q of Object.values(data.quests).filter(q=>q.number<data.quests[id].number)){g.dispatch({type:'accept',id:q.id});g.complete(q.id,'compromise');}
 assert.ok(g.dispatch({type:'accept',id}));
 if(walk)exploreSpot(g,data.quests[id].locations.find(l=>l.role==='decision'),{heal:true});else{g.run(visit(id));drain(g);}
 return g;
}
function choose(g,id){assert.ok(g.dispatch({type:'choose',id}),`${id}: ${g.state.waiting?.text??g.state.flags.quest?.[g.state.trackedQuest]?.node}`);drain(g);}
function resolveBattle(g,result){
 if(result==='win'){g.healAll();fight(g);}
 else {
  const before=g.state.records[result==='escape'?'escapes':'losses'];let fuel=150;
  if(result==='lose')for(const id of g.state.members)g.state.actors[id].hp=1;
  while(g.state.battle){
   assert.ok(--fuel,'battle resolution terminates');
   if(result==='escape'){g.healAll();assert.ok(g.dispatch({type:'battle',action:'escape'}));}
   else {assert.ok(g.dispatch({type:'battle',action:'skill',skill:'guard'}));}
  }
  drain(g);assert.equal(g.state.records[result==='escape'?'escapes':'losses'],before+1);
 }
}
function canonical(value){return JSON.stringify(value,(_,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v);}
// Explore the actual VM and battle continuations. The rich fixture isolates authored
// reachability from combat balance; resource and party edge cases are tested below.
// Counters used by story predicates saturate at two; narrative counters stay exact.
const key=(g,id)=>canonical({flags:g.state.flags.quest?.[id],flow:g.state.flags.flow?.[id],members:g.state.members,outcome:g.state.quests[id].outcome,waiting:g.state.waiting?.type,
 kills:Object.fromEntries(Object.entries(g.state.records.kills).map(([k,n])=>[k,Math.min(n,2)]))});

for(const q of Object.values(data.quests))test(`${q.id} ${q.title}: every ending, reachable map, save/resume and no repeat reward`,()=>{
 const g=start(q.id),queue=[structuredClone(g.state)],seen=new Set(),ends=new Set();let visited=0;
 if(q.id==='q165'){
  choose(g,'pause');g.dispatch({type:'retreat'});assert.ok(g.dispatch({type:'party',action:'leave',actor:'il'}));exploreSpot(g,q.locations[0],{heal:true});queue.push(structuredClone(g.state));
 }
 for(let i=0;i<queue.length;i++){
  g.state=structuredClone(queue[i]);const signature=key(g,q.id);if(seen.has(signature))continue;seen.add(signature);
  assert.ok(++visited<2500,`${q.id} finite state exploration`);
  const saved=g.save();g.load(saved);assert.equal(g.save(),saved,'checkpoint round trip');
  if(g.state.quests[q.id].stage==='completed'){
   ends.add(g.state.quests[q.id].outcome);assert.equal(g.state.vm.length,0);
   const earned={gold:g.state.gold,xp:g.state.xp,completed:g.state.vars.completed};
   g.run(visit(q.id));drain(g);
   assert.deepEqual({gold:g.state.gold,xp:g.state.xp,completed:g.state.vars.completed},earned);
   continue;
  }
  // Defeat can leave a scene to be resumed at its map hub.
  if(!g.state.waiting){g.run(visit(q.id));drain(g);}
  assert.equal(g.state.waiting?.type,'choice');
  const available=options(g).filter(o=>o.id!=='pause'&&enabled(g,o));
  assert.ok(available.length,`${q.id}: a live route at ${scene(g,q.id)}`);
  const checkpoint=structuredClone(g.state),currentScene=scene(g,q.id);
  choose(g,'pause');assert.equal(g.state.vm.length,0);g.load(g.save());g.run(visit(q.id));drain(g);
  assert.equal(scene(g,q.id),currentScene,'pause retains current scene');
  for(const o of available){
   g.state=structuredClone(checkpoint);choose(g,o.id);
   if(g.state.battle){
    const battleSave=g.save();g.load(battleSave);const battle=structuredClone(g.state);
    for(const result of ['win',...(data.encounters[g.state.battle.encounter].escape?['escape']:[]),'lose']){
     g.state=structuredClone(battle);resolveBattle(g,result);queue.push(structuredClone(g.state));
    }
   }else queue.push(structuredClone(g.state));
  }
 }
 assert.deepEqual([...ends].sort(),Object.keys(q.outcomes).sort(),`${q.id}: reachable endings`);
});

test('all quests offer an initial route and can be paused with no money or supplies',()=>{
 for(const q of Object.values(data.quests)){
  const g=start(q.id,{walk:false});g.state.gold=0;g.state.inventory={};
  assert.ok(options(g).some(o=>o.id!=='pause'&&enabled(g,o)),q.id);
  choose(g,'pause');g.load(g.save());g.run(visit(q.id));drain(g);assert.equal(g.state.waiting.type,'choice');
 }
});

test('q103 consent alone does not create food; failed payment does not advance or award',()=>{
 const g=start('q103',{walk:false});choose(g,'source');choose(g,'join');g.state.inventory.ration=0;
 const before=g.save();assert.equal(g.dispatch({type:'choose',id:'food'}),false);assert.equal(g.save(),before);
 choose(g,'back');choose(g,'consent');choose(g,'write');assert.equal(g.state.quests.q103.outcome,'write');
});
test('q107 a letter is not a reply, and only a received reply enables a reunion',()=>{
 const g=start('q107',{walk:false});choose(g,'courier');choose(g,'letter');
 assert.ok(!options(g).some(o=>o.id==='meet'));const before=g.save();assert.equal(g.dispatch({type:'choose',id:'meet'}),false);assert.equal(g.save(),before);
 g.load(before);choose(g,'sleep');choose(g,'meet');assert.equal(g.state.quests.q107.outcome,'meet');
});
test('q123 kills do not move evacuation groups; all three groups must actually pass',()=>{
 const g=start('q123',{walk:false});choose(g,'start');choose(g,'chase');fight(g);
 assert.equal(g.state.records.kills.carrion_ghoul,1);assert.equal(g.state.flags.quest.q123.groups,0);
 assert.equal(g.dispatch({type:'choose',id:'close'}),false);
 for(let n=0;n<3;n++)choose(g,'escort');choose(g,'close');assert.equal(g.state.quests.q123.outcome,'all');
});
test('q137 reading three steps preserves the selected book and distinguishes what was saved',()=>{
 for(const book of ['medicine','family','language']){
  const g=start('q137',{walk:false});choose(g,book);
  assert.equal(g.dispatch({type:'choose',id:`carry_${book}`}),false);
  choose(g,'page');g.load(g.save());choose(g,'page');choose(g,'page');
  for(const other of ['medicine','family','language'].filter(x=>x!==book))assert.equal(g.dispatch({type:'choose',id:`carry_${other}`}),false);
  choose(g,`carry_${book}`);assert.equal(g.state.quests.q137.outcome,book);
 }
});
test('q190 one sealed site is not three and its completed recovery cannot be claimed early',()=>{
 const g=start('q190',{walk:false});choose(g,'battle');fight(g);choose(g,'site');choose(g,'store');
 assert.equal(g.dispatch({type:'choose',id:'collect'}),false);g.load(g.save());choose(g,'site');choose(g,'site');choose(g,'collect');
 assert.equal(g.state.quests.q190.outcome,'collect');assert.equal(g.state.flags.quest.q190.sites,3);
});
test('q100 still requires the original 99 completions, even after the additional 100',()=>{
 const g=newGame();for(const q of Object.values(data.quests).filter(q=>q.number>100)){g.dispatch({type:'accept',id:q.id});g.complete(q.id,Object.entries(q.outcomes).find(([,o])=>!o.requires)[0]);}
 assert.equal(g.state.vars.completed,100);assert.equal(g.unlocked(data.quests.q100),false);
 for(const q of Object.values(data.quests).filter(q=>q.number<100)){g.dispatch({type:'accept',id:q.id});g.complete(q.id,'compromise');}
 assert.equal(g.unlocked(data.quests.q100),true);
});
test('earlier proof unlocks q011 before collecting its second clue; incomplete q001 proof stays hidden',()=>{
 const g=newGame();g.accept('q011');g.evidence('q011','clue_a','観察');g.run('q011.visit');drain(g);
 assert.ok(options(g).find(o=>o.id==='informed').visibleWhen);assert.ok(g.state.log.includes(data.quests.q011.model.world.truth));
 choose(g,'informed');assert.equal(g.state.quests.q011.outcome,'informed');
 const h=newGame();h.accept('q001');h.evidence('q001','clue_a','観察');h.run('q001.visit');drain(h);
 const json=JSON.stringify(projectGame(h));assert.ok(!json.includes(data.quests.q001.model.world.truth));
 assert.equal(h.dispatch({type:'choose',id:'informed'}),false);
});
test('tail jumps survive more than 32 loops and return to the caller with branch locals intact',()=>{
 const d=structuredClone(data);
 d.scripts.caller={commands:[{op:'call',script:'loop'},{op:'set',target:'vars.returned',value:true}]};
 d.scripts.loop={commands:[{op:'add',target:'local.n',value:1},{op:'choice',options:[{id:'again',text:'again',commands:[{op:'jump',script:'loop'}]},{id:'end',text:'end',commands:[{op:'set',target:'vars.iterations',value:{ref:'local.n'}},{op:'return'}]}]}]};
 const g=new GameEngine(d);drain(g);g.run('caller');for(let n=0;n<70;n++){assert.ok(g.dispatch({type:'choose',id:'again'}));g.load(g.save());assert.ok(g.state.vm.length<=2);}
 assert.ok(g.dispatch({type:'choose',id:'end'}));assert.equal(g.state.vars.iterations,71);assert.equal(g.state.vars.returned,true);assert.equal(g.state.vm.length,0);
});
test('objective kills, encounter victories and escape are separate, saved and read only to scripts',()=>{
 const g=newGame(7);g.award(0,data.system.xpBase*24*25);g.accept('q121');g.startBattle('wild_pair_1',{win:[],lose:[],escape:[]});
 const first=g.state.battle.enemies[0];first.hp=1;
 assert.ok(g.dispatch({type:'battle',action:'skill',skill:'attack',target:first.instance}));
 const slain=first.id;assert.equal(g.state.records.kills[slain],1);g.load(g.save());resolveBattle(g,'escape');
 assert.equal(g.state.records.kills[slain],1);assert.equal(g.state.records.encounters.wild_pair_1??0,0);assert.equal(g.state.records.wins,0);assert.equal(g.state.records.escapes,1);
 assert.equal(recordCount(g.state.records,{metric:'kills',id:slain,sinceQuest:'q121'}),1);
 g.accept('q121');assert.equal(recordCount(g.state.records,{metric:'kills',id:slain,sinceQuest:'q121'}),1,'reaccept must not erase baseline');
 const h=newGame(7);h.award(0,data.system.xpBase*24*25);h.startBattle('wild_pair_1',{win:[],lose:[],escape:[]});fight(h);
 assert.equal(h.state.records.wins,1);assert.equal(h.state.records.encounters.wild_pair_1,1);
 const d=structuredClone(data);d.scripts.forbidden={commands:[{op:'set',target:'records.wins',value:99}]};assert.ok(validateContent(d).some(e=>e.includes('書込先')));
});
test('new-save record corruption is rejected without changing the loaded game',()=>{
 const g=newGame(),before=g.save();
 for(const mutate of [s=>delete s.records,s=>s.records.kills.unknown=1,s=>s.records.wins=-1,s=>s.records.wins=2,s=>s.records.baselines.q101={battles:0,wins:0,escapes:0,losses:0,kills:{slime:1},encounters:{}}]){
  const save=JSON.parse(before);mutate(save.state);assert.throws(()=>g.load(JSON.stringify(save)));assert.equal(g.save(),before);
 }
});

test('literal false visibility and eligibility never become an unconditional choice',()=>{
 const d=structuredClone(data);d.scripts.visibility={commands:[{op:'choice',options:[
  {id:'hidden',text:'hidden answer',visibleWhen:false,commands:[]},
  {id:'disabled',text:'not yet',condition:false,commands:[]},
  {id:'leave',text:'leave',commands:[]}
 ]}]};
 const g=new GameEngine(d);drain(g);g.run('visibility');
 assert.equal(JSON.stringify(projectGame(g)).includes('hidden answer'),false);
 assert.equal(projectGame(g).dialog.options.find(o=>o.id==='disabled').enabled,false);
 assert.equal(g.dispatch({type:'choose',id:'hidden'}),false);assert.equal(g.dispatch({type:'choose',id:'disabled'}),false);
 assert.ok(g.dispatch({type:'choose',id:'leave'}));
 d.scripts.visibility.commands[0].options.pop();assert.ok(validateContent(d).some(e=>e.includes('常に選べる')));
});
test('outcome requirements are checked before stage and reward changes',()=>{
 const d=structuredClone(data);d.quests.q121.outcomes.together.requires={op:'gte',left:{op:'record_count',metric:'kills',id:'moor_wolf',sinceQuest:'q121'},right:1};
 const g=new GameEngine(d);drain(g);g.accept('q121');const before=g.save();
 assert.throws(()=>g.complete('q121','together'));assert.equal(g.save(),before);
 g.award(0,data.system.xpBase*24*25);g.startBattle('story_121',{win:[],escape:[],lose:[]});fight(g);g.complete('q121','together');assert.equal(g.state.quests.q121.stage,'completed');
});
test('poison defeats multiple individual enemies once; migrated dead enemies are not new kills',()=>{
 const g=newGame();g.startBattle('wild_pair_1',{win:[],escape:[],lose:[]});
 const expected={};for(const e of g.state.battle.enemies){e.hp=1;e.statuses=['poison'];expected[e.id]=(expected[e.id]??0)+1;}
 let fuel=10;while(g.state.battle){assert.ok(--fuel);g.dispatch({type:'battle',action:'skill',skill:'guard'});}
 assert.deepEqual(g.state.records.kills,expected);assert.equal(g.state.records.wins,1);g.load(g.save());assert.deepEqual(g.state.records.kills,expected);
 const h=newGame();h.startBattle('wild_pair_1',{win:[],escape:[],lose:[]});h.state.battle.enemies[0].hp=0;
 const old=JSON.parse(h.save());old.contentVersion='1.3.0';old.state.contentVersion='1.3.0';delete old.state.records;delete old.state.battle.recordedKills;
 for(const q of Object.values(data.quests).filter(q=>q.number>100))delete old.state.quests[q.id];
 const copy=newGame();copy.load(JSON.stringify(old));copy.award(0,data.system.xpBase*24*25);fight(copy);
 assert.equal(Object.values(copy.state.records.kills).reduce((a,b)=>a+b,0),1);assert.equal(copy.state.records.wins,1);
});
test('rope is spent only after winning the revised rescue route',()=>{
 for(const result of ['win','escape','lose']){
  const g=newGame();g.award(0,data.system.xpBase*24*25);g.accept('q002');
  g.evidence('q002','clue_a','痕跡');g.evidence('q002','clue_b','証言');g.run('q002.visit');drain(g);
  const before=g.state.inventory.rope;choose(g,'informed');assert.equal(g.state.inventory.rope,before);resolveBattle(g,result);
  assert.equal(g.state.inventory.rope,before-(result==='win'?1:0));assert.equal(g.state.quests.q002.stage,result==='win'?'completed':'active');
 }
});
test('party absence and survival are read from the live roster',()=>{
 const g=start('q164',{walk:false});assert.ok(enabled(g,options(g).find(o=>o.id==='secret')));
 choose(g,'pause');assert.ok(g.dispatch({type:'party',action:'join',actor:'ren'}));g.run('q164.visit');drain(g);
 assert.equal(g.dispatch({type:'choose',id:'secret'}),false);choose(g,'explain');assert.equal(g.state.quests.q164.outcome,'explain');
 for(const mode of ['absent','fallen','alive']){
  const h=start('q161',{walk:false});if(mode==='absent')h.state.members=h.state.members.filter(id=>id!=='sera');if(mode==='fallen')h.state.actors.sera.hp=0;
  choose(h,'wish');assert.equal(Boolean(enabled(h,options(h).find(o=>o.id==='sera'))),mode==='alive');choose(h,'clinic');assert.equal(h.state.quests.q161.outcome,'heal');
 }
});

for(const phase of ['text','choice','battle'])test(`actual 1.3.0 ${phase} save migrates without losing job growth, RNG or continuation`,async()=>{
 const source=await fs.readFile(new URL(`fixtures/save-1.3.0-${phase}.json`,import.meta.url),'utf8'),old=JSON.parse(source),g=newGame();
 g.load(source);assert.equal(g.state.contentVersion,data.game.version);assert.equal(Object.keys(g.state.quests).length,200);
 for(const field of ['actors','inventory','rng','vars','waiting','vm','nextScope'])assert.deepEqual(g.state[field],old.state[field],field);
 assert.deepEqual(Object.fromEntries(Object.entries(g.state.flags).filter(([k])=>k!=='legacyQuestRoutes')),old.state.flags);
 assert.equal(g.state.records.historyComplete,false);assert.deepEqual(g.state.records.kills,{});
 const checkpoint=g.save();g.load(checkpoint);assert.equal(g.save(),checkpoint);
 drain(g);if(phase==='choice'){choose(g,'contract');}if(g.state.battle)fight(g);
 if(phase!=='text')assert.equal(g.state.quests.q001.stage,'completed');
});
