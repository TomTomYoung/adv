import test from 'node:test';
import assert from 'node:assert/strict';
import {data,newGame,drain,pathTo} from './helpers.mjs';
import {GameEngine} from '../src/core/engine.js';
import {fireContext,fireEnvironment} from '../src/core/systems/fire-network.js';
import {dungeonActionPlan,dungeonEncounter} from '../src/core/dungeons.js';
import {activeActor,battleSkillPlan} from '../src/core/battle.js';
import {validateContent} from '../src/core/validation.js';
import {validateSave} from '../src/core/save.js';
import {projectGame} from '../src/application/projection.js';

function begin(job=false){const g=newGame(417);if(job)g.dispatch({type:'job.change',actor:'ada',job:'lantern_keeper'});assert.ok(g.dispatch({type:'travel',dungeon:'kagaribi'}));return g;}
const action=(g,action,target='portable',extra={})=>g.dispatch({type:'dungeon.action',system:'fires',action,target,...extra});
const place=(g,map,x,y,facing='east')=>g.teleport(map,x,y,facing);
const flame=g=>fireContext(g.data,g.state).run.portable;
const roundtrip=g=>{assert.deepEqual(validateSave(JSON.parse(g.save()),g.data),[]);const saved=g.save();g.load(saved);assert.equal(g.save(),saved);};
const mutable=()=>{const g=begin();g.data=structuredClone(g.data);return g;};

test('13 independent dungeon definitions retain 10 regions and all 200 quests',()=>{
  assert.equal(Object.keys(data.dungeons).length,13);assert.equal(data.regions.length,10);assert.equal(Object.keys(data.maps).length,26);
  const g=begin();assert.equal(g.state.inventory.kagaribi_torch,1);assert.equal(flame(g).effect,'ward');assert.equal(flame(g).fuel,90);
  assert.ok(fireEnvironment(fireContext(data,g.state)).protected);assert.ok(g.state.discovered.kagaribi_f1.includes('13,3'));assert.ok(!g.state.discovered.kagaribi_f2?.includes('13,7'));
  assert.equal(projectGame(g).dungeons.find(d=>d.id==='kagaribi').name,'篝火の迷宮');roundtrip(g);
});
test('seed overrides a pedestal only until extinguished; ordinary ignition restores its own effect',()=>{
  const g=begin();assert.ok(action(g,'collect','entry'));assert.equal(g.state.inventory.kagaribi_ember,1);
  place(g,'kagaribi_f1',8,5);assert.ok(action(g,'transplant','calm'));let fixture=fireContext(data,g.state).persistent.fixtures.calm;assert.equal(fixture.effect,'ward');assert.equal(g.state.inventory.kagaribi_ember,0);roundtrip(g);
  assert.ok(action(g,'extinguish','calm'));fixture=fireContext(data,g.state).persistent.fixtures.calm;assert.equal(fixture.effect,null);assert.ok(action(g,'ignite','calm'));fixture=fireContext(data,g.state).persistent.fixtures.calm;assert.equal(fixture.effect,'calm');
  assert.ok(action(g,'collect','calm'));assert.ok(action(g,'extinguish'));assert.ok(action(g,'transplant'));assert.equal(flame(g).effect,'calm');assert.equal(dungeonEncounter(data,g.state).enemyScale,.6);
  roundtrip(g);
});
test('fuel consumes successful steps only, gives both warnings once, and persists without duplicate ticks',()=>{
  const g=begin();const start=flame(g).fuel;g.dispatch({type:'move',direction:'left'});g.dispatch({type:'move',direction:'forward'});assert.equal(flame(g).fuel,start);
  g.dispatch({type:'move',direction:'right'});flame(g).fuel=26;
  g.dispatch({type:'move',direction:'forward'});assert.equal(flame(g).fuel,25);assert.ok(g.state.log.some(t=>t.includes('残り25歩')));roundtrip(g);
  g.dispatch({type:'move',direction:'back'});assert.equal(g.state.log.filter(t=>t.includes('残り25歩')).length,1);
  flame(g).fuel=9;g.dispatch({type:'move',direction:'forward'});assert.equal(flame(g).fuel,8);assert.ok(g.state.log.some(t=>t.includes('残り8歩')));
  flame(g).fuel=1;g.dispatch({type:'move',direction:'back'});assert.equal(flame(g).lit,false);assert.equal(g.state.battle,null,'entry fire protects the exhausted torch');roundtrip(g);
});
test('aura follows connected passages and is limited to the configured map',()=>{
  const g=begin();assert.ok(action(g,'extinguish'));place(g,'kagaribi_f1',1,3);assert.ok(fireEnvironment(fireContext(data,g.state)).protected);
  place(g,'kagaribi_f1',7,3);assert.equal(fireEnvironment(fireContext(data,g.state)).protected,false,'neither entry nor patrol torch reaches across the wall');
  place(g,'kagaribi_f2',1,1);assert.equal(fireEnvironment(fireContext(data,g.state)).protected,false,'same coordinates on a different floor receive no aura');
});
test('unprotected movement forces kuragari even off the ordinary encounter cadence',()=>{
  const g=begin();action(g,'extinguish');place(g,'kagaribi_f2',2,1);g.state.steps=0;
  assert.ok(g.dispatch({type:'move',direction:'forward'}));assert.equal(g.state.battle.encounter,'kuragari_hunt');assert.equal(g.state.records.battles,1);roundtrip(g);
  assert.equal(action(g,'ignite'),false,'field actions are unavailable during battle');
});
test('a lit ordinary portable torch is not a magical ward; refill preserves a live transferred effect',()=>{
  const g=begin();action(g,'extinguish');action(g,'ignite');assert.equal(flame(g).effect,'ordinary');place(g,'kagaribi_f2',2,1);assert.equal(fireEnvironment(fireContext(data,g.state)).protected,false);
  const h=begin();flame(h).fuel=12;const count=h.state.inventory.torch;assert.ok(h.dispatch({type:'item',item:'torch',actor:'ada'}));assert.equal(flame(h).effect,'ward');assert.equal(flame(h).fuel,90);assert.equal(h.state.inventory.torch,count-1);
  assert.equal(h.dispatch({type:'item',item:'torch',actor:'ada'}),false);assert.equal(h.state.inventory.torch,count-1);
});
test('field skills enforce job, living party membership, MP and target reach before payment',()=>{
  const g=begin();const inventory=structuredClone(g.state.inventory);assert.equal(action(g,'skill','portable',{actor:'ada',ability:'kuragari_ward'}),false);assert.deepEqual(g.state.inventory,inventory);
  const h=begin(true);const mp=h.state.actors.ada.mp;assert.ok(h.dispatch({type:'job.action',actor:'ada',ability:'kuragari_ward'}));assert.equal(h.state.actors.ada.mp,mp-3);
  const before=h.save();assert.equal(action(h,'skill','origin',{actor:'ada',ability:'kuragari_ward'}),false);assert.equal(h.state.actors.ada.mp,mp-3);
  h.state.actors.ada.mp=0;assert.equal(h.dispatch({type:'job.action',actor:'ada',ability:'kuragari_ward'}),false);h.state.actors.ada.mp=3;h.state.actors.ada.hp=0;assert.equal(h.dispatch({type:'job.action',actor:'ada',ability:'kuragari_ward'}),false);
  assert.ok(before);roundtrip(g);
});
test('lamplighter repels kuragari without kills, victory rewards or player escape, and relights the torch',()=>{
  const g=begin(true);g.state.members=['ada'];action(g,'extinguish');place(g,'kagaribi_f2',2,1);g.dispatch({type:'move',direction:'forward'});
  const reward={gold:g.state.gold,xp:g.state.xp},hp=g.state.battle.enemies[0].hp;assert.equal(activeActor(g),'ada');assert.ok(hp>=1000);
  assert.ok(battleSkillPlan(g,'ada','repel_kuragari','ada').ok);roundtrip(g);
  assert.ok(g.dispatch({type:'battle',action:'skill',skill:'repel_kuragari',target:'ada'}));assert.equal(g.state.battle,null);assert.equal(g.state.records.repels,1);assert.equal(g.state.records.wins,0);assert.equal(g.state.records.escapes,0);assert.equal(g.state.records.kills.kuragari,undefined);assert.deepEqual({gold:g.state.gold,xp:g.state.xp},reward);assert.equal(flame(g).effect,'ward');roundtrip(g);
  g.startBattle('kagaribi_roaming',{win:[],escape:[],lose:[]});assert.equal(battleSkillPlan(g,'ada','repel_kuragari','ada').ok,false);
});
test('escaping kuragari does not recursively restart the same battle in one input',()=>{
  const g=begin();action(g,'extinguish');place(g,'kagaribi_f2',2,1);g.dispatch({type:'move',direction:'forward'});g.random=()=>0;
  assert.ok(g.dispatch({type:'battle',action:'escape'}));assert.equal(g.state.battle,null);assert.equal(g.state.records.battles,1);assert.equal(g.state.records.escapes,1);
});
test('normal encounter strength is calculated from active fires and survives battle save/replay',()=>{
  const g=mutable();place(g,'kagaribi_f1',8,5);action(g,'ignite','calm');g.data.system.encounterCheckSteps=1;g.map().encounterRate=1;g.data.jobs.scout.passives.encounterRate=1;g.random=()=>0;
  g.dispatch({type:'move',direction:'forward'});assert.equal(g.state.battle.enemyScale,.6);
  const enemy=g.state.battle.enemies[0];assert.equal(enemy.stats.hp,Math.round(data.enemies[enemy.id].stats.hp*.6));assert.equal(data.enemies[enemy.id].stats.hp,31);
  roundtrip(g);const saved=g.save(),copy=new GameEngine(g.data);copy.load(saved);g.dispatch({type:'battle',action:'skill',skill:'guard'});copy.dispatch({type:'battle',action:'skill',skill:'guard'});assert.equal(g.save(),copy.save());
});
test('every floor and the deep seed can be reached using actual movement and stairs',()=>{
  const g=begin(true);g.state.inventory.torch=99;
  const walk=(x,y)=>{for(const [nx,ny] of pathTo(g,x,y)){const l=g.state.location,wanted=nx>l.x?'east':nx<l.x?'west':ny>l.y?'south':'north';while(l.facing!==wanted)g.dispatch({type:'move',direction:'right'});if(flame(g).fuel<30)action(g,'refuel');assert.ok(g.dispatch({type:'move',direction:'forward'}));assert.equal(g.state.battle,null);}};
  for(const next of ['kagaribi_f2','kagaribi_f3']){walk(13,7);assert.ok(g.dispatch({type:'interact'}));drain(g);assert.equal(g.state.location.map,next);roundtrip(g);}
  walk(7,7);assert.ok(action(g,'collect','origin'));assert.equal(fireContext(g.data,g.state).run.ember.effect,'deep');g.returnTown();assert.equal(g.state.inventory.kagaribi_ember,1);assert.equal(g.state.inventory.kagaribi_torch,0);roundtrip(g);
  g.dispatch({type:'travel',dungeon:'kagaribi'});assert.equal(fireContext(data,g.state).run.ember.effect,'deep');assert.equal(g.state.inventory.kagaribi_torch,1);
});
test('persistent fixtures survive re-entry; fresh expeditions do not duplicate items or leak effects',()=>{
  const g=begin(true);place(g,'kagaribi_f1',8,5);action(g,'ignite','calm');action(g,'collect','calm');const old=g.state.dungeons.active.run;g.returnTown();g.dispatch({type:'travel',region:1});assert.equal(fireContext(data,g.state),null);assert.deepEqual(dungeonEncounter(data,g.state),{rate:1,enemyScale:1});assert.deepEqual(projectGame(g).dungeon.systems.map(s=>s.kind),['waterworks','voxel_space']);assert.equal(g.dispatch({type:'job.action',actor:'ada',ability:'kuragari_ward'}),false);
  g.returnTown();g.dispatch({type:'travel',dungeon:'kagaribi'});assert.ok(g.state.dungeons.active.run>old);assert.equal(fireContext(data,g.state).persistent.fixtures.calm.effect,'calm');assert.equal(g.state.inventory.kagaribi_torch,1);assert.equal(flame(g).fuel,90);roundtrip(g);
});

test('malformed fire definitions, remote intents and corrupt saves reject atomically',()=>{
  for(const mutate of [d=>d.dungeons.kagaribi.systems.fires.use='arbitrary',d=>d.dungeons.kagaribi.systems.fires.portable.warnings=[8,25],d=>d.dungeons.kagaribi.systems.fires.fixtures[0].effect='missing',d=>d.dungeons.kagaribi.systems.fires.fixtures[1].x=999,d=>d.dungeons.kagaribi.maps.push('region_1_f1'),d=>d.dungeons.kagaribi.systems.fires.effects.ward.enemyScale=NaN]){const d=structuredClone(data);mutate(d);assert.ok(validateContent(d).length);}
  const g=begin();const resources=JSON.stringify({i:g.state.inventory,d:g.state.dungeons});assert.equal(action(g,'ignite','origin'),false);assert.equal(JSON.stringify({i:g.state.inventory,d:g.state.dungeons}),resources);
  for(const mutate of [s=>s.dungeons.active.id='region_1',s=>s.dungeons.active.systems.fires.portable.fuel=999,s=>s.dungeons.active.systems.fires.portable.effect='invented',s=>s.dungeons.persistent.kagaribi.systems.fires.fixtures.entry.lit='yes',s=>s.inventory.kagaribi_torch=9,s=>delete s.dungeons.active.systems.fires,s=>delete s.dungeons]){const saved=JSON.parse(g.save());mutate(saved.state);const before=g.save();assert.throws(()=>g.load(JSON.stringify(saved)));assert.equal(g.save(),before);}
});
test('projection is detached, hides remote fixtures, and uses the same action eligibility as the engine',()=>{
  const g=begin();const vm=projectGame(g),fire=vm.dungeon.systems[0];assert.ok(!fire.markers.some(m=>m.id==='origin'));assert.equal(vm.light,90);assert.equal(vm.lightLabel,'携帯松明');
  for(const target of [fire.portable,...fire.fixtures])for(const action of target.actions)assert.equal(action.enabled,dungeonActionPlan(data,g.state,action.intent).ok);
  fire.portable.fuel=0;fire.fixtures[0].effect='fake';assert.equal(flame(g).fuel,90);assert.equal(fireContext(data,g.state).persistent.fixtures.entry.effect,'ward');
});
