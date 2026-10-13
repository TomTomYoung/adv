import test from 'node:test';
import assert from 'node:assert/strict';
import {data,drain} from './helpers.mjs';
import {GameEngine} from '../src/core/engine.js';
import {applySkill,battleSkillPlan,enemyStats} from '../src/core/battle.js';
import {applyGuard,clearGuard,applyStun} from '../src/core/battle-turns.js';
import {applyStatus,removeStatus,tickStatuses,recoverStatuses,statusAccuracy,statusControl,criticalChance,statusDefinitionsErrors,applyStatusClock} from '../src/core/status-effects.js';
import {projectGame} from '../src/application/projection.js';
import {validateSave} from '../src/core/save.js';
import {validateSchema} from '../config/shared/schema.js';
import {actionStatusProperties} from '../config/shared/status-schemas.js';

const ids=['sleep','sure_hit','sluggish','berserk','misfire','critical_up','guaranteed_critical','critical_vulnerability','guaranteed_critical_vulnerability'];
const battleOnly=['sure_hit','critical_up','guaranteed_critical','critical_vulnerability','guaranteed_critical_vulnerability'];
function game({job='mage',start=true}={}){
  const d=structuredClone(data);d.jobs[job].passives={};const g=new GameEngine(d);drain(g);g.changeJob('ada',job);g.award(0,d.system.xpBase*9*10);g.state.members=['ada'];g.teleport('region_2_f1',1,1);
  for(const id of d.encounters.wild_pair_10.enemies){d.enemies[id].ai=[{priority:1,skill:'guard',target:'self'}];d.enemies[id].stats.agi=0;d.enemies[id].resist={};d.enemies[id].stats.hp=2000;d.enemies[id].stats.mp=200;}
  if(start)g.startBattle('wild_pair_10',{win:[],lose:[],escape:[]});g.random=()=>.99;
  return {g,d,a:g.state.actors.ada};
}
const inflict=(g,target,id,level=1)=>applyStatus(g.data,g.state,target,id,undefined,level);
const guard=g=>assert.ok(g.dispatch({type:'battle',action:'skill',skill:'guard'}));
const wait=g=>assert.ok(g.dispatch({type:'battle',action:'wait'}));
const attack={name:'固定攻撃',effects:[{type:'damage',amount:10,element:'physical'}]};
function roundtrip(g){const save=g.save();assert.deepEqual(validateSave(JSON.parse(save),g.data),[]);g.load(save);assert.equal(g.save(),save);}

test('new status fields reject invalid probabilities and booleans in both content and editor schemas',()=>{
  const {d}=game();assert.deepEqual(statusDefinitionsErrors(d),[]);assert.ok(ids.every(id=>d.statuses[id].levels[2]&&d.statuses[id].levels[3]));
  for(const field of ['damageWakeChance','misfireChance','criticalChance','criticalTakenChance'])for(const value of [-.1,1.1,'0.5']){
    d.statuses.sleep[field]=value;assert.ok(statusDefinitionsErrors(d).length);assert.ok(validateSchema({[field]:value},{type:'object',properties:actionStatusProperties}).length);delete d.statuses.sleep[field];
  }
  for(const field of ['battleOnly','beneficial','sureHit','actionDisabled','forcedAttack','guaranteedCritical','guaranteedCriticalTaken']){
    d.statuses.sleep[field]=1;assert.ok(statusDefinitionsErrors(d).length);assert.ok(validateSchema({[field]:1},{type:'object',properties:actionStatusProperties}).length);delete d.statuses.sleep[field];
  }
});

test('sleep has one non-selectable action slot, no cost, and yields to stun before its own turn',()=>{
  const {g,a}=game();inflict(g,a,'sleep',3);const before={mp:a.mp,hp:a.hp,inventory:structuredClone(g.state.inventory),uses:structuredClone(a.skillProgress??{})};
  const saved=g.save();assert.equal(projectGame(g).battle.control.id,'sleep');assert.equal(g.save(),saved);
  assert.equal(g.dispatch({type:'battle',action:'skill',skill:'fire',target:'enemy_0'}),false);assert.deepEqual(g.state.battle,JSON.parse(saved).state.battle);assert.equal(g.state.rng,JSON.parse(saved).state.rng);
  applyStun(g,a,{});wait(g);assert.match(g.state.battle.log.join('\n'),/スタンで行動できない/);wait(g);
  assert.equal(g.state.battle.round,3);assert.match(g.state.battle.log.join('\n'),/ねむりで行動できない/);
  assert.equal(a.mp,before.mp);assert.equal(a.hp,before.hp);assert.deepEqual(g.state.inventory,before.inventory);assert.deepEqual(a.skillProgress??{},before.uses);
  assert.equal(a.statusRecoveryTurns.sleep,2);roundtrip(g);
});

test('sleep wakes at the 100/50/25 percent hit boundaries, at most once per target action',()=>{
  const {g,a}=game(),enemy=g.state.battle.enemies[0],multi={name:'二段',effects:[...attack.effects,...attack.effects]};
  for(const [level,chance] of [[1,1],[2,.5],[3,.25]]){
    inflict(g,enemy,'sleep',level);let rolls=0;g.random=()=>{rolls++;return chance;};applySkill(g,a,enemy,multi,'attack');
    if(level===1){assert.ok(!enemy.statuses.includes('sleep'));assert.equal(rolls,0);}
    else{assert.ok(enemy.statuses.includes('sleep'));assert.equal(rolls,1);g.random=()=>chance-.001;applySkill(g,a,enemy,attack,'attack');assert.ok(!enemy.statuses.includes('sleep'));}
  }
});

test('sleep is not woken by misses, guarded zero damage or poison; a hit can newly inflict sleep',()=>{
  const {g,d,a}=game(),enemy=g.state.battle.enemies[0];inflict(g,enemy,'sleep');inflict(g,a,'blindness',3);g.random=()=>.99;
  applySkill(g,a,enemy,attack,'attack');assert.ok(enemy.statuses.includes('sleep'));removeStatus(a);
  applyGuard(g.state.battle,enemy,3);applySkill(g,a,enemy,attack,'attack');assert.ok(enemy.statuses.includes('sleep'));clearGuard(g.state.battle,enemy);
  inflict(g,enemy,'poison');applyStatusClock(d,g.state,enemy,'poison','turns',enemy.stats);assert.ok(enemy.statuses.includes('sleep'));
  removeStatus(enemy);g.random=()=>0;applySkill(g,a,enemy,{...attack,effects:[...attack.effects,{type:'status',status:'sleep'}]},'attack');assert.ok(enemy.statuses.includes('sleep'));
});

test('sure hit overrides blindness for its level duration but leaves spell seals and critical chance independent',()=>{
  const {g,d,a}=game(),enemy=g.state.battle.enemies[0];inflict(g,a,'blindness',3);
  for(const level of [1,2,3]){
    inflict(g,a,'sure_hit',level);g.random=()=>{throw Error('certain hit and zero critical chance must not draw');};
    assert.equal(applySkill(g,a,enemy,attack,'attack'),10);assert.equal(criticalChance(d,g.state,a,enemy),0);
    for(let i=0;i<level-1;i++){tickStatuses(d,g.state,a,'turns');assert.equal(statusAccuracy(d,g.state,a),1);}
    tickStatuses(d,g.state,a,'turns');assert.equal(statusAccuracy(d,g.state,a),.1);
  }
  inflict(g,a,'sure_hit');inflict(g,a,'spell_seal');assert.equal(battleSkillPlan(g,'ada','fire','enemy_0').ok,false);
});

test('beneficial status skills do not miss because of blindness',()=>{
  const {g,a}=game();inflict(g,a,'blindness',3);g.random=()=>.99;
  for(const id of ['sure_hit','critical_up','guaranteed_critical']){
    applySkill(g,a,a,{name:'強化',effects:[{type:'status',status:id}]},'guard');assert.ok(a.statuses.includes(id));removeStatus(a,id);
  }
});

test('sluggish scales speed for both sides, changes the initial mixed queue and retains its fixed duration',()=>{
  for(const [level,rate] of [[1,.5],[2,.25],[3,0]]){
    const {g,d,a}=game({start:false}),base=g.stats('ada').agi;inflict(g,a,'sluggish',level);assert.equal(g.stats('ada').agi,Math.floor(base*rate));assert.deepEqual(a.statusDurations.sluggish,{steps:12,turns:3});removeStatus(a);
    g.startBattle('wild_pair_10',{win:[],lose:[],escape:[]});const enemy=g.state.battle.enemies[0];enemy.stats.agi=100;inflict(g,enemy,'sluggish',level);assert.equal(enemyStats(g,enemy).agi,Math.floor(100*rate));
  }
  const {g,d,a}=game({start:false});d.enemies[d.encounters.wild_pair_10.enemies[0]].stats.agi=999;
  // Put a fast ally at zero speed before queue creation: the enemy acts first.
  inflict(g,a,'sluggish',3);g.startBattle('wild_pair_10',{win:[],lose:[],escape:[]});assert.ok(g.state.battle.turnQueue[0].startsWith('enemy:'));assert.ok(g.state.battle.turnIndex>0);
});

test('berserk boosts strength, replaces controls and confusion, and spends only a normal attack',()=>{
  for(const [level,rate] of [[1,1.5],[2,2],[3,3]]){
    const {g,a}=game(),base=g.stats('ada').str;inflict(g,a,'berserk',level);inflict(g,a,'confusion',3);
    assert.equal(g.stats('ada').str,Math.floor(base*rate));assert.equal(projectGame(g).battle.control.id,'berserk');
    const mp=a.mp,hp=a.hp,items=structuredClone(g.state.inventory),enemyHp=g.state.battle.enemies.map(e=>e.hp);wait(g);
    assert.equal(a.mp,mp);assert.equal(a.hp,hp);assert.deepEqual(g.state.inventory,items);assert.equal(a.skillProgress.attack.uses,1);assert.equal(g.state.battle.round,2);
    assert.ok(g.state.battle.enemies.some((e,i)=>e.hp<enemyHp[i]));assert.match(g.state.battle.log.join('\n'),/狂暴化して襲いかかった/);
  }
});

test('sleep and paralysis take precedence over berserk; enemies obey sleep and can berserk beyond their AI list',()=>{
  const {g,a}=game(),enemy=g.state.battle.enemies[0];inflict(g,a,'berserk');inflict(g,a,'sleep');wait(g);assert.equal(a.skillProgress?.attack,undefined);removeStatus(a,'sleep');
  inflict(g,a,'paralysis',3);g.random=()=>.5;wait(g);assert.equal(a.skillProgress?.attack,undefined);assert.match(g.state.battle.log.join('\n'),/まひで行動できない/);removeStatus(a);
  inflict(g,enemy,'sleep',3);g.random=()=>.99;guard(g);assert.match(g.state.battle.log.join('\n'),/ねむりで行動できない/);assert.equal(enemy.guard,false);
  removeStatus(enemy);inflict(g,enemy,'berserk',2);const hp=a.hp,mp=enemy.mp;guard(g);assert.ok(a.hp<hp);assert.equal(enemy.mp,mp);assert.match(g.state.battle.log.join('\n'),/狂暴化して襲いかかった/);roundtrip(g);
});

test('misfire changes spell targets at 25/50/75 percent and pays the chosen skill once',()=>{
  for(const [level,chance] of [[1,.25],[2,.5],[3,.75]])for(const misfires of [true,false]){
    const {g,d,a}=game();inflict(g,a,'misfire',level);const hp=a.hp,mp=a.mp,enemy=g.state.battle.enemies[0],enemyHp=enemy.hp;
    let draws=[misfires?chance-.001:chance,0];g.random=()=>draws.shift()??.99;
    assert.ok(g.dispatch({type:'battle',action:'skill',skill:'fire',target:enemy.instance}));
    assert.equal(a.mp,mp-d.skills.fire.mp);assert.equal(a.skillProgress.fire.uses,1);assert.equal(g.state.battle.round,2);
    if(misfires){assert.ok(a.hp<hp);assert.equal(enemy.hp,enemyHp);assert.match(g.state.battle.log.join('\n'),/暴発した/);}
    else{assert.equal(a.hp,hp);assert.ok(enemy.hp<enemyHp);}
  }
});

test('misfire redirects group spells to the other side, and weapon skills retain their self penalty',()=>{
  const {g,d,a}=game();d.jobs.mage.grants.push({skill:'firestorm',api:'battle.skill',level:1,target:'all_enemies',maxTargets:8,lifetime:'equipped'});inflict(g,a,'misfire',3);let draws=[0,0];g.random=()=>draws.shift()??.99;const hp=a.hp,mp=a.mp,enemies=g.state.battle.enemies.map(e=>e.hp);
  assert.ok(g.dispatch({type:'battle',action:'skill',skill:'firestorm'}));assert.ok(a.hp<hp);assert.equal(a.mp,mp-d.skills.firestorm.mp);assert.deepEqual(g.state.battle.enemies.map(e=>e.hp),enemies);
  const other=game({job:'berserker',start:false});other.d.encounters.wild_pair_10.preemptive={side:'allies',actions:2};other.g.startBattle('wild_pair_10',{win:[],lose:[],escape:[]});inflict(other.g,other.a,'misfire',3);draws=[0,0];other.g.random=()=>draws.shift()??.99;
  const foe=other.g.state.battle.enemies[0],foeHp=foe.hp;assert.ok(other.g.dispatch({type:'battle',action:'skill',skill:'reckless',target:foe.instance}));assert.equal(foe.hp,foeHp);assert.equal(other.a.skillProgress.reckless.uses,1);assert.ok(other.g.state.battle.buffs.some(b=>b.target==='actor:ada'));
});

test('misfire does not affect basic attacks, guard or items and cannot bypass invalid costs or seals',()=>{
  const {g,a}=game();inflict(g,a,'misfire',3);g.random=()=>0;a.hp-=30;
  assert.ok(g.dispatch({type:'battle',action:'item',item:'potion',target:'ada'}));assert.ok(!g.state.battle.log.some(t=>t.includes('暴発した')));
  inflict(g,a,'misfire',3);assert.ok(g.dispatch({type:'battle',action:'skill',skill:'attack',target:'enemy_0'}));guard(g);assert.ok(!g.state.battle.log.some(t=>t.includes('暴発した')));
  inflict(g,a,'misfire',3);inflict(g,a,'spell_seal');const mp=a.mp,round=g.state.battle.round;g.random=()=>{throw Error('rejected actions must not roll');};
  assert.equal(g.dispatch({type:'battle',action:'skill',skill:'fire',target:'enemy_0'}),false);assert.equal(a.mp,mp);assert.equal(g.state.battle.round,round);
});

test('enemy misfire can hit its own side and shares the same critical and cost rules',()=>{
  const {g,d,a}=game(),enemy=g.state.battle.enemies[0];
  enemy.ai=d.enemies[enemy.id].ai=[{priority:1,skill:'fire',target:'random'}];inflict(g,enemy,'misfire',3);inflict(g,enemy,'guaranteed_critical',3);
  const hp=a.hp,enemyHp=enemy.hp,mp=enemy.mp;let draws=[0,0,0];g.random=()=>draws.shift()??.99;guard(g);
  assert.equal(a.hp,hp);assert.ok(enemy.hp<enemyHp);assert.equal(enemy.mp,mp-d.skills.fire.mp);
  assert.match(g.state.battle.log.join('\n'),/暴発した/);assert.match(g.state.battle.log.join('\n'),/クリティカル/);roundtrip(g);
});

test('critical bonuses add on both sides, respect level boundaries, and roll once per target for multi-hit damage',()=>{
  const {g,d,a}=game(),enemy=g.state.battle.enemies[0];
  for(const [level,chance] of [[1,.1],[2,.25],[3,.5]]){
    inflict(g,a,'critical_up',level);inflict(g,enemy,'critical_vulnerability',level);assert.equal(criticalChance(d,g.state,a,enemy),chance*2);
    let rolls=0;g.random=()=>{rolls++;return chance*2-.001;};assert.equal(applySkill(g,a,enemy,{...attack,effects:[...attack.effects,...attack.effects]},'attack'),40);assert.equal(rolls,chance*2===1?0:1);
    if(chance<.5){g.random=()=>chance*2;assert.equal(applySkill(g,a,enemy,attack,'attack'),10);}
    removeStatus(a);removeStatus(enemy);
  }
});

test('guaranteed critical is independent of hit checks, works for magic and victims, and never bypasses guard Lv3',()=>{
  const {g,a}=game(),enemy=g.state.battle.enemies[0];inflict(g,a,'guaranteed_critical',3);inflict(g,a,'blindness',3);g.random=()=>.99;
  assert.equal(applySkill(g,a,enemy,attack,'attack'),0);inflict(g,a,'sure_hit',3);inflict(g,enemy,'guaranteed_critical_vulnerability',3);
  g.random=()=>{throw Error('guaranteed hit and critical must not draw');};assert.equal(applySkill(g,a,enemy,attack,'attack'),20);
  removeStatus(a,'guaranteed_critical');assert.equal(applySkill(g,a,enemy,{...attack,effects:[{type:'damage',amount:10,element:'fire'}]},'fire'),20);
  applyGuard(g.state.battle,enemy,3);assert.equal(applySkill(g,a,enemy,attack,'attack'),0);assert.match(g.state.battle.log.join('\n'),/クリティカル/);
});

test('healing, poison and self-effect damage are not critical attacks; ordinary attacks add no random draws',()=>{
  const {g,a}=game(),enemy=g.state.battle.enemies[0];g.random=()=>{throw Error('no chance, no roll');};assert.equal(applySkill(g,a,enemy,attack,'attack'),10);
  inflict(g,a,'guaranteed_critical');inflict(g,a,'guaranteed_critical_vulnerability');const hp=a.hp;
  assert.equal(applySkill(g,a,a,attack,'attack',false,null,false),10);assert.equal(a.hp,hp-10);
  applySkill(g,a,a,{name:'回復',effects:[{type:'heal',amount:5}]},'heal');assert.equal(a.hp,hp-5);
});

test('new persistent states keep levels and recovery ages while timed battle statuses expire and clear on exit',()=>{
  const {g,d,a}=game();for(const id of ids)inflict(g,a,id,3);recoverStatuses(g,a);roundtrip(g);
  const actor=g.state.actors.ada;for(const id of ['sleep','berserk','misfire'])assert.equal(actor.statusRecoveryTurns[id],1);
  for(const id of battleOnly){assert.equal(actor.statusDurations[id].turns,3);inflict(g,actor,id,1);assert.equal(actor.statusLevels[id],3);}
  g.finishBattle('escape');for(const id of ['sleep','sluggish','berserk','misfire'])assert.ok(actor.statuses.includes(id));for(const id of battleOnly){assert.ok(!actor.statuses.includes(id));assert.equal(actor.statusLevels[id],undefined);assert.equal(inflict(g,actor,id),false);}
  roundtrip(g);g.startBattle('wild_pair_10',{win:[],lose:[],escape:[]});
  for(const level of [1,2,3]){inflict(g,g.state.actors.ada,'guaranteed_critical',level);for(let i=0;i<level;i++)tickStatuses(d,g.state,g.state.actors.ada,'turns');assert.ok(!g.state.actors.ada.statuses.includes('guaranteed_critical'));}
});

test('environment suppression suspends new action, hit, critical and recovery effects',()=>{
  const {g,d,a}=game(),enemy=g.state.battle.enemies[0];for(const id of ids)inflict(g,a,id,3);
  const dungeon=Object.values(d.dungeons).find(d=>Object.values(d.systems).some(s=>s.use==='suppression_zone')),zone=Object.values(dungeon.systems).find(s=>s.use==='suppression_zone');zone.statuses.push(...ids);
  const point=zone.cells[0];g.teleport(point.map,point.x,point.y);assert.equal(statusControl(d,g.state,a),null);assert.equal(criticalChance(d,g.state,a,enemy),0);
  g.random=()=>{throw Error('suppressed states do not recover');};recoverStatuses(g,a);assert.equal(a.statusRecoveryTurns,undefined);
});
