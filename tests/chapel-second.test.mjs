import test from 'node:test';
import assert from 'node:assert/strict';
import {audit,data,ready,start,choose,go,checkpoint,roadGo,drain,walk} from './pilgrimage-helpers.mjs';
import {resolveBattle} from '../tools/audit-regional-relocation.mjs';
import {projectGame} from '../src/application/projection.js';
const values=(g,id)=>g.state.stories[id].values;
const arrive=(g,id,place)=>{go(g,data.quests[id].story.worldPlaces[place]);drain(g);checkpoint(g);};
const depart=(g,id,choice)=>{assert.ok(g.dispatch({type:'choose',id:choice}),id+'/'+choice);drain(g);assert.ok(g.state.journey);checkpoint(g);};
const reports={};
for(let n=131;n<=140;n++){const id='q'+n;test(`${id}: every physical route, ending and save resumes`,()=>{reports[id]=audit(id);});}
test('one campaign completes all twenty chapel quests, preserving their region totals',()=>{
 const g=ready();for(const n of [...Array.from({length:10},(_,i)=>31+i),...Array.from({length:10},(_,i)=>131+i)]){
  const id='q'+String(n).padStart(3,'0'),r=reports[id]??audit(id);start(g,id);for(const choice of Object.values(r.ends)[0])choose(g,id,choice);assert.equal(g.state.quests[id].stage,'completed');
 }assert.equal(g.state.vars.region_4,20);checkpoint(g);
});

test('q131 prepares rope once, saves before departure, and delivers teacher and sample only on arrival',()=>{
 const g=ready(),id='q131';start(g,id);choose(g,id,'test');const ropes=g.state.inventory.rope;
 choose(g,id,'both');assert.equal(g.state.inventory.rope,ropes-1);assert.equal(values(g,id).teacherAt,'room');assert.equal(values(g,id).sampleAt,'room');
 depart(g,id,'continue');assert.equal(values(g,id).teacherAt,'transit');assert.equal(values(g,id).sampleAt,'party');assert.equal(g.state.quests[id].stage,'active');
 assert.ok(g.dispatch({type:'retreat'}));assert.equal(values(g,id).teacherAt,'transit');arrive(g,id,'report');assert.equal(values(g,id).teacherAt,'report');assert.equal(values(g,id).sampleAt,'report');assert.equal(g.state.inventory.rope,ropes-1);
 choose(g,id,'school');assert.equal(g.state.quests[id].outcome,'school');
});

for(const [id,choice,encounter] of [['q132','destroy','story_132'],['q134','break','guard_4'],['q136','break','guard_4']])test(`${id}: original battle escape/loss can retry without a premature ending`,()=>{
 for(const result of ['escape','lose']){
  const g=ready();start(g,id);choose(g,id,choice,{combat:'pending'});assert.equal(g.state.battle.encounter,encounter);checkpoint(g);delete g.random;resolveBattle(g,result);checkpoint(g);
  assert.equal(g.state.quests[id].stage,'active');assert.equal(values(g,id).finished,false);
  if(result==='lose'){go(g,data.quests[id].story.worldPlaces.entry);assert.ok(g.dispatch({type:'story.resume',quest:id}));drain(g);}
  choose(g,id,choice);if(id!=='q132'){assert.equal(g.state.quests[id].stage,'active');choose(g,id,'continue');choose(g,id,'finish');}
  assert.equal(g.state.quests[id].outcome,id==='q132'?'destroy':'break');
 }
});

test('q135 consumes real air, refills on shore, and hands over the doll only at the workshop',()=>{
 const g=ready(),id='q135';start(g,id);const air=()=>g.state.dungeons.active.systems.air.air;
 assert.ok(air()<64);assert.match(JSON.stringify(projectGame(g)),/水底の宿の空気/);const ropes=g.state.inventory.rope;
 choose(g,id,'lift');assert.equal(g.state.inventory.rope,ropes-1);depart(g,id,'continue');assert.equal(values(g,id).dollAt,'party');assert.equal(values(g,id).aneAt,'transit');
 arrive(g,id,'shore');assert.equal(air(),64);assert.equal(values(g,id).dollAt,'party');depart(g,id,'workshop');assert.equal(values(g,id).dollAt,'party');arrive(g,id,'workshop');assert.equal(values(g,id).dollAt,'workshop');assert.equal(values(g,id).aneAt,'workshop');choose(g,id,'finish');assert.equal(g.state.quests[id].outcome,'lift');
 const lost=ready();start(lost,id);choose(lost,id,'listen');choose(lost,id,'back');choose(lost,id,'dive');
 // Close the modal through an actual return journey before testing drowning.
 choose(lost,id,'listen');depart(lost,id,'back');lost.state.dungeons.active.systems.air.air=0;for(const actor of lost.state.members)lost.state.actors[actor].hp=1;
 while(lost.state.location.facing!=='west')assert.ok(lost.dispatch({type:'move',direction:'right'}));assert.ok(lost.dispatch({type:'move',direction:'forward'}));drain(lost);assert.equal(lost.state.mode,'town');assert.equal(lost.state.townLocation,'oddland_plateau');assert.equal(lost.state.quests[id].stage,'active');checkpoint(lost);
 arrive(lost,id,'shore');choose(lost,id,'dive');choose(lost,id,'listen');choose(lost,id,'answer');assert.equal(lost.state.quests[id].outcome,'stop');
});

test('q137 reads three stages, preserves per-book history and can return an unfinished book to its shelf',()=>{
 for(const book of ['medicine','family','language']){
  const g=ready(),id='q137';start(g,id);choose(g,id,book);assert.equal(g.dispatch({type:'choose',id:'carry_'+book}),false);
  choose(g,id,'page');checkpoint(g);assert.equal(values(g,id)[book+'Pages'],1);assert.equal(g.dispatch({type:'choose',id:'prepare'}),false);
  choose(g,id,'page');choose(g,id,'page');assert.equal(g.dispatch({type:'choose',id:'page'}),false);
  depart(g,id,'carry_'+book);assert.equal(values(g,id)[book+'At'],'party');assert.equal(g.state.quests[id].stage,'active');arrive(g,id,'archive');choose(g,id,'finish');
  for(const key of ['medicine','family','language']){assert.equal(values(g,id)[key+'At'],key===book?'archive':'entry');assert.equal(values(g,id)[key+'Pages'],key===book?3:0);}
 }
 const g=ready(),id='q137';start(g,id);choose(g,id,'family');choose(g,id,'page');choose(g,id,'close');assert.equal(values(g,id).familyAt,'entry');assert.equal(g.state.quests[id].stage,'active');choose(g,id,'seal');choose(g,id,'finish');assert.equal(g.state.quests[id].outcome,'close');
});

test('q138 brings Narl back to Ira, while the solo route lets Ira leave independently',()=>{
 const g=ready(),id='q138';start(g,id);choose(g,id,'map');choose(g,id,'talk');assert.equal(values(g,id).iraAt,'pupil');depart(g,id,'escort');assert.equal(values(g,id).narlAt,'transit');arrive(g,id,'pupil');assert.equal(values(g,id).narlAt,'pupil');choose(g,id,'finish');assert.equal(values(g,id).mapAt,'ira');
 const solo=ready();start(solo,id);choose(solo,id,'tracks');choose(solo,id,'solo');assert.equal(values(solo,id).iraAt,'beyond');assert.equal(values(solo,id).partyAt,'pupil');assert.equal(values(solo,id).mapAt,'ira');checkpoint(solo);
});

test('q139 fetches help without rope and credits neither room until its survivors arrive at the rescue post',()=>{
 const g=ready(),id='q139';start(g,id);g.state.gold=0;g.state.inventory.rope=0;choose(g,id,'measure');choose(g,id,'other');
 depart(g,id,'air');assert.equal(values(g,id).drained,false);arrive(g,id,'pump');assert.equal(values(g,id).drained,true);depart(g,id,'ventilate');assert.equal(values(g,id).ventilated,false);arrive(g,id,'air');
 assert.equal(g.dispatch({type:'choose',id:'tools'}),false);choose(g,id,'help');assert.equal(values(g,id).crowdRescued,false);assert.equal(values(g,id).injuredRescued,false);
 choose(g,id,'return');assert.equal(values(g,id).helpersAt,'wounded');choose(g,id,'next');depart(g,id,'escort');assert.equal(values(g,id).injuredAt,'transit');assert.equal(values(g,id).crowdAt,'transit');assert.equal(values(g,id).injuredRescued,false);assert.equal(values(g,id).crowdRescued,false);
 arrive(g,id,'rescue');assert.equal(values(g,id).injuredRescued,true);assert.equal(values(g,id).crowdRescued,true);choose(g,id,'finish');assert.equal(g.state.quests[id].outcome,'both');
 const partial=ready();start(partial,id);choose(partial,id,'many');choose(partial,id,'escort');choose(partial,id,'finish');assert.equal(values(partial,id).injuredAt,'wounded');assert.equal(values(partial,id).injuredRescued,false);
});

test('q140 escorts the worker and declares no goods on the treaty route',()=>{
 const g=ready(),id='q140';start(g,id);choose(g,id,'rescue');depart(g,id,'carry');assert.equal(values(g,id).helped,false);assert.equal(values(g,id).workerAt,'transit');arrive(g,id,'maintenance');assert.equal(values(g,id).helped,true);choose(g,id,'declare');choose(g,id,'finish');assert.equal(values(g,id).declared,true);assert.equal(values(g,id).goodsAt,'treasure');assert.equal(g.state.quests[id].outcome,'treaty');
});

test('all five sites have free physical return routes and no remote quest shortcut',()=>{
 const g=ready();g.state.gold=0;g.state.light=0;for(const item of Object.keys(g.state.inventory))g.state.inventory[item]=0;
 go(g,{kind:'town',location:'pilgrim_board'});assert.ok(g.accept('q137'));assert.equal(g.dispatch({type:'quest.travel',id:'q137'}),false);
 for(const map of ['e2_sand_gallery','e2_burnt_library','e2_rescue_tunnel','e2_chapel_works','e2_sunken_inn']){go(g,{kind:'dungeon',dungeon:data.maps[map].dungeon,map,x:13,y:7});go(g,{kind:'town',location:'oddland_plateau'});checkpoint(g);}
 roadGo(g,{kind:'town',location:'oddland_border'});assert.equal(g.dispatch({type:'quest.travel',id:'q137'}),false);assert.equal(g.state.gold,0);assert.equal(g.state.light,0);
});
