import test from 'node:test';
import assert from 'node:assert/strict';
import {data,drain} from './helpers.mjs';
import {GameEngine} from '../src/core/engine.js';
import {applySkill,enemyStats} from '../src/core/battle.js';
import {applyGuard,clearGuard,guardLevel} from '../src/core/battle-turns.js';
import {applyStatus,removeStatus,tickStatuses,recoverStatuses,rollActionStatus,statusAccuracy,statusAbilityReason} from '../src/core/status-effects.js';
import {skillDefinitionErrors} from '../src/core/job-validation.js';
import {validateSave} from '../src/core/save.js';
import {validateSchema} from '../config/shared/schema.js';
import {effectSchema} from '../config/shared/studio/supplemental.js';

const recovering=['paralysis','blindness','spell_seal','skill_seal','item_seal','confusion'];
function game(){
  const d=structuredClone(data),g=new GameEngine(d);drain(g);g.award(0,d.system.xpBase*9*10);g.teleport('region_2_f1',1,1);
  for(const id of d.encounters.wild_pair_10.enemies){d.enemies[id].stats.agi=0;d.enemies[id].ai=[{priority:1,skill:'guard',target:'self'}];}
  g.startBattle('wild_pair_10',{win:[],lose:[],escape:[]});return {g,d,a:g.state.actors.ada};
}
function roundtrip(g){const saved=g.save();assert.deepEqual(validateSave(JSON.parse(saved),g.data),[]);g.load(saved);assert.equal(g.save(),saved);}
const guard=g=>assert.ok(g.dispatch({type:'battle',action:'skill',skill:'guard'}));

test('enfeebled and arcane malaise scale ally and enemy stats to 50/25/0 percent without changing duration',()=>{
  const {g,d,a}=game(),enemy=g.state.battle.enemies[0];
  for(const target of [a,enemy])for(const [id,keys,steps,turns] of [['enfeebled',['str','vit','agi'],20,5],['arcane_malaise',['int'],12,3]]){
    const stats=()=>target.instance?enemyStats(g,target):g.stats(target.id),base=stats();
    for(const [level,rate] of [[1,.5],[2,.25],[3,0]]){
      applyStatus(d,g.state,target,id,undefined,level);
      for(const key of keys)assert.equal(stats()[key],Math.floor(base[key]*rate));
      assert.deepEqual(target.statusDurations[id],{steps,turns});
      for(let i=0;i<turns;i++)tickStatuses(d,g.state,target,'turns');
      assert.ok(!target.statuses.includes(id));assert.deepEqual(stats(),base);
      applyStatus(d,g.state,target,id,undefined,level);
      for(let i=0;i<steps;i++)tickStatuses(d,g.state,target,'steps');
      assert.ok(!target.statuses.includes(id));
    }
  }
});

test('paralysis, blindness and confusion use each level at the action and hit boundary',()=>{
  const {g,d,a}=game();
  for(const [id,key,chances] of [['paralysis','actionFailureChance',[.25,.5,.75]],['confusion','confusionChance',[.5,.75,1]]]){
    for(const [index,chance] of chances.entries()){
      applyStatus(d,g.state,a,id,undefined,index+1);g.random=()=>chance-.0001;assert.equal(rollActionStatus(g,a,key),id);
      if(chance<1){g.random=()=>chance;assert.equal(rollActionStatus(g,a,key),null);}
      else {g.random=()=>{throw Error('certainty must not roll');};assert.equal(rollActionStatus(g,a,key),id);}
      removeStatus(a,id);
    }
  }
  const enemy=g.state.battle.enemies[0],skill={name:'命中確認',effects:[{type:'damage',amount:4,element:'physical'}]};
  for(const [level,rate] of [[1,.5],[2,.25],[3,.1]]){
    applyStatus(d,g.state,a,'blindness',undefined,level);assert.equal(statusAccuracy(d,g.state,a),rate);
    let hp=enemy.hp;g.random=()=>rate;applySkill(g,a,enemy,skill,'attack');assert.equal(enemy.hp,hp);
    g.random=()=>rate-.0001;applySkill(g,a,enemy,skill,'attack');assert.ok(enemy.hp<hp);removeStatus(a,'blindness');
  }
});

test('all six recovery rates begin at 10/5/2 percent and reach certainty on round 10/20/50',()=>{
  const {g,d,a}=game();
  for(const id of recovering)for(const [level,rate,rounds] of [[1,.1,10],[2,.05,20],[3,.02,50]]){
    applyStatus(d,g.state,a,id,undefined,level);g.random=()=>rate;recoverStatuses(g,a);assert.equal(a.statusRecoveryTurns[id],1);
    g.random=()=>rate*2-.0001;recoverStatuses(g,a);assert.ok(!a.statuses.includes(id));assert.equal(a.statusRecoveryTurns,undefined);
    applyStatus(d,g.state,a,id,undefined,level);g.random=()=>.999999;
    for(let i=1;i<rounds;i++){recoverStatuses(g,a);assert.ok(a.statuses.includes(id));}
    g.random=()=>{throw Error('100 percent recovery must not roll');};recoverStatuses(g,a);assert.ok(!a.statuses.includes(id));
  }
});

test('higher-level statuses retain failed recovery counts across reapplication, save/load and next battle',()=>{
  const {g,d,a}=game();for(const id of recovering)applyStatus(d,g.state,a,id,undefined,2);
  g.random=()=>.99;for(let i=0;i<3;i++)recoverStatuses(g,a);
  for(const id of recovering){applyStatus(d,g.state,a,id,undefined,1);assert.equal(a.statusLevels[id],2);applyStatus(d,g.state,a,id,undefined,3);assert.equal(a.statusRecoveryTurns[id],3);}
  g.finishBattle('escape');roundtrip(g);g.startBattle('wild_pair_10',{win:[],lose:[],escape:[]});
  const actor=g.state.actors.ada;assert.ok(recovering.every(id=>actor.statusLevels[id]===3&&actor.statusRecoveryTurns[id]===3));
  g.random=()=>.08;recoverStatuses(g,actor);assert.ok(recovering.every(id=>actor.statusRecoveryTurns[id]===4));
  g.random=()=>.099;recoverStatuses(g,actor);assert.deepEqual(actor.statuses,[]);
});

test('higher seal levels retain independent restrictions, basic commands and field restrictions',()=>{
  const {g,d,a}=game();
  for(const level of [2,3]){
    applyStatus(d,g.state,a,'spell_seal',undefined,level);assert.match(statusAbilityReason(d,g.state,a,'fire'),/呪文封印/);assert.match(statusAbilityReason(d,g.state,a,'field_prayer',true),/呪文封印/);
    applyStatus(d,g.state,a,'skill_seal',undefined,level);assert.match(statusAbilityReason(d,g.state,a,'fire_mix'),/スキル封印/);
    assert.equal(statusAbilityReason(d,g.state,a,'attack'),'');assert.equal(statusAbilityReason(d,g.state,a,'guard'),'');removeStatus(a);
  }
});

test('guard levels reduce ally and enemy damage to 50/25/0 percent, including the one-point floor',()=>{
  const {g,a}=game(),b=g.state.battle,enemy=b.enemies[0];
  for(const target of [a,enemy])for(const level of [1,2,3]){
    const source=target===a?enemy:a,attack={name:'固定攻撃',effects:[{type:'damage',amount:40,element:'physical'}]};
    clearGuard(b,target);const hp=target.hp,baseline=applySkill(g,source,target,attack,'attack',source===enemy);target.hp=hp;
    applySkill(g,target,target,{name:'防御',effects:[{type:'guard',level}]},'guard',target===enemy);
    const damage=applySkill(g,source,target,attack,'attack',source===enemy);assert.equal(damage,Math.floor(baseline*[.5,.25,0][level-1]));target.hp=hp;
    if(level===3){attack.effects[0].amount=1;assert.equal(applySkill(g,source,target,attack,'attack',source===enemy),0);assert.equal(target.hp,hp);}
  }
});

test('guard levels keep stronger reapplications, survive save/load and expire with their guard',()=>{
  const {g,a}=game(),enemy=g.state.battle.enemies[0];
  for(const target of [a,enemy]){applyGuard(g.state.battle,target,2);applyGuard(g.state.battle,target,1);assert.equal(guardLevel(g.state.battle,target),2);applyGuard(g.state.battle,target,3);}
  roundtrip(g);assert.equal(guardLevel(g.state.battle,g.state.actors.ada),3);assert.equal(guardLevel(g.state.battle,g.state.battle.enemies[0]),3);
  while(g.state.battle.round===1)guard(g);
  assert.equal(guardLevel(g.state.battle,g.state.actors.ada),0);assert.equal(guardLevel(g.state.battle,g.state.battle.enemies[0]),1);assert.equal(g.state.battle.guardLevels,undefined);roundtrip(g);
  applyGuard(g.state.battle,g.state.actors.ada,3);g.finishBattle('escape');g.startBattle('wild_pair_10',{win:[],lose:[],escape:[]});assert.equal(g.state.battle.guardLevels,undefined);
});

test('guard skill levels validate and old guard saves still mean level 1',()=>{
  const {g,d,a}=game();d.skills.guard.effects=[{type:'guard',level:3}];assert.deepEqual(skillDefinitionErrors(d,d.skills.guard),[]);guard(g);
  assert.ok(Object.values(g.state.battle.guardLevels).includes(3));roundtrip(g);
  for(const type of ['guard','status']){
    const effect={type,...(type==='status'?{status:'paralysis'}:{})};
    for(const level of [1,2,3])assert.deepEqual(validateSchema({...effect,level},effectSchema),[]);
    for(const level of [0,4,1.5,'2'])assert.ok(validateSchema({...effect,level},effectSchema).length);
  }
  for(const level of [0,4,1.5,'2']){assert.ok(skillDefinitionErrors(d,{...d.skills.guard,effects:[{type:'guard',level}]}).length);assert.throws(()=>applyGuard(g.state.battle,a,level),/防御Lv/);}
  const saved=JSON.parse(g.save());
  for(const levels of [{'actor:ada':0},{'actor:ada':4},{'actor:ada':1.5},{'enemy:missing':2},{'actor:nio':2}]){
    const bad=structuredClone(saved);bad.state.battle.guards=['ada'];bad.state.battle.guardLevels=levels;assert.ok(validateSave(bad,d).some(e=>e.includes('防御Lv')));
  }
  delete saved.state.battle.guardLevels;assert.deepEqual(validateSave(saved,d),[]);g.load(JSON.stringify(saved));
  for(const id of g.state.battle.guards)assert.equal(guardLevel(g.state.battle,g.state.actors[id]),1);
});
