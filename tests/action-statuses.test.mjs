import {nextFormation} from '../src/core/battle-formation.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {data,drain} from './helpers.mjs';
import {GameEngine} from '../src/core/engine.js';
import {activeActor,applySkill,battleSkillPlan,battleItemPlan} from '../src/core/battle.js';
import {applyStatus,removeStatus,recoverStatuses,tickStatuses,statusDefinitionsErrors,statusStateErrors,statusAbilityReason} from '../src/core/status-effects.js';
import {validateSave} from '../src/core/save.js';
import {projectGame} from '../src/application/projection.js';
import {fieldSkillPlan} from '../src/core/field-skills.js';
import {fieldActionPlan} from '../src/core/jobs.js';
const ids=['paralysis','blindness','spell_seal','skill_seal','item_seal','confusion'];
function game(job='mage',start=true){
  const d=structuredClone(data),g=new GameEngine(d);drain(g);g.changeJob('ada',job);g.award(0,d.system.xpBase*9*10);g.state.members=['ada'];g.state.partyFormation=nextFormation(g.state.members,g.state.partyFormation);
  for(const id of d.encounters.wild_pair_10.enemies){d.enemies[id].ai=[{priority:1,skill:'guard',target:'self'}];d.enemies[id].stats.agi=0;d.enemies[id].stats.hp=2000;d.enemies[id].stats.mp=200;}
  g.teleport('region_2_f1',1,1);
  if(start)g.startBattle('wild_pair_10',{win:[],lose:[],escape:[]});
  return {g,d,a:g.state.actors.ada};
}
const inflict=(g,a,id)=>applyStatus(g.data,g.state,a,id);
const guard=g=>assert.ok(g.dispatch({type:'battle',action:'skill',skill:'guard'}));
const roundtrip=g=>{const save=g.save();assert.deepEqual(validateSave(JSON.parse(save),g.data),[]);g.load(save);assert.equal(g.save(),save);};
test('six statuses have Lv1 baselines and Lv2/3 overrides; invalid probabilities and recovery clocks are rejected',()=>{
  const {g,d,a}=game();assert.deepEqual(statusDefinitionsErrors(d),[]);
  for(const id of ids){assert.ok(d.statuses[id].recovery);assert.deepEqual(Object.keys(d.statuses[id].levels),['2','3']);inflict(g,a,id);}
  for(const bad of [-1,2,NaN]){d.statuses.paralysis.actionFailureChance=bad;assert.ok(statusDefinitionsErrors(d).length);}d.statuses.paralysis.actionFailureChance=.25;
  d.statuses.paralysis.recovery.increment=0;assert.ok(statusDefinitionsErrors(d).length);d.statuses.paralysis.recovery.increment=.1;
  for(const value of [{paralysis:-1},{paralysis:1.5},{unknown:1},{poison:1}]){a.statusRecoveryTurns=value;assert.ok(statusStateErrors(d,a).length);}
  a.statusRecoveryTurns={paralysis:1};roundtrip(g);
  const save=JSON.parse(g.save());save.state.actors.ada.statusRecoveryTurns.paralysis=1e6+1;assert.ok(validateSave(save,d).length);
});
test('recovery chance rises by elapsed rounds, is independent per status, and reaches certainty',()=>{
  const {g,a}=game();inflict(g,a,'paralysis');inflict(g,a,'blindness');g.random=()=>.15;
  recoverStatuses(g,a);assert.deepEqual(a.statusRecoveryTurns,{paralysis:1,blindness:1});
  tickStatuses(g.data,g.state,a,'steps');assert.equal(a.statusRecoveryTurns.paralysis,1);
  inflict(g,a,'paralysis');assert.equal(a.statusRecoveryTurns.paralysis,1,'reapplication must not reset recovery');
  recoverStatuses(g,a);assert.equal(a.statuses.length,0);assert.equal(a.statusRecoveryTurns,undefined);
  inflict(g,a,'blindness');g.random=()=>.999999;
  for(let i=0;i<9;i++)recoverStatuses(g,a);
  assert.equal(a.statusRecoveryTurns.blindness,9);recoverStatuses(g,a);assert.ok(!a.statuses.includes('blindness'));
});
test('one mixed round rolls recovery once; preemptive actions do not advance recovery',()=>{
  const {g,d,a}=game('mage',false);d.encounters.wild_pair_10.preemptive={side:'allies',actions:3};inflict(g,a,'blindness');g.random=()=>.99;
  g.startBattle('wild_pair_10',{win:[],lose:[],escape:[]});
  for(let n=0;n<3;n++)guard(g);assert.equal(a.statusRecoveryTurns,undefined);assert.equal(g.state.battle.round,1);
  guard(g);assert.equal(g.state.battle.round,2);assert.equal(a.statusRecoveryTurns.blindness,1);
  roundtrip(g);assert.equal(g.state.actors.ada.statusRecoveryTurns.blindness,1);
});
test('all six statuses and recovery ages persist after escape, save/load, next battle, and victory',()=>{
  const {g,a}=game();for(const id of ids)inflict(g,a,id);g.random=()=>.99;recoverStatuses(g,a);
  g.finishBattle('escape');assert.equal(g.state.battle,null);roundtrip(g);
  g.startBattle('wild_pair_10',{win:[],lose:[],escape:[]});let actor=g.state.actors.ada;assert.deepEqual(actor.statuses,ids);
  assert.ok(ids.every(id=>actor.statusRecoveryTurns[id]===1));
  recoverStatuses(g,actor);g.finishBattle('win');assert.deepEqual(actor.statuses,ids);assert.ok(ids.every(id=>actor.statusRecoveryTurns[id]===2));
  roundtrip(g);removeStatus(g.state.actors.ada);assert.equal(g.state.actors.ada.statusRecoveryTurns,undefined);
});
test('paralysis consumes exactly one action, with no MP, items or skill-use costs; invalid commands never roll',()=>{
  const {g,d,a}=game();inflict(g,a,'paralysis');d.statuses.paralysis.actionFailureChance=1;g.random=()=>.99;
  const before={mp:a.mp,potions:g.state.inventory.potion,uses:structuredClone(a.skillProgress??{})};
  assert.equal(g.dispatch({type:'battle',action:'skill',skill:'fire',target:'missing'}),false);assert.equal(g.state.battle.round,1);
  assert.ok(g.dispatch({type:'battle',action:'skill',skill:'fire',target:'enemy_0'}));assert.equal(g.state.battle.round,2);assert.equal(a.mp,before.mp);assert.deepEqual(a.skillProgress??{},before.uses);
  assert.ok(g.dispatch({type:'battle',action:'item',item:'potion',target:'ada'}));assert.equal(g.state.inventory.potion,before.potions);assert.equal(g.state.battle.round,3);
  assert.match(g.state.battle.log.join('\n'),/まひで行動できない/);
});
test('blindness misses the whole offensive skill, including attached statuses, but does not block healing',()=>{
  const {g,a}=game();inflict(g,a,'blindness');g.random=()=>.9;const enemy=g.state.battle.enemies[0],hp=enemy.hp;
  applySkill(g,a,enemy,g.data.skills.venom,'venom');assert.equal(enemy.hp,hp);assert.equal(enemy.statuses.length,0);
  a.hp-=20;const injured=a.hp;applySkill(g,a,a,g.data.skills.heal,'heal');assert.ok(a.hp>injured);
  g.random=()=>.1;applySkill(g,a,enemy,g.data.skills.attack,'attack');assert.ok(enemy.hp<hp);
});
test('spell, skill and item seals are independent and projected as disabled; basic attack and guard remain available',()=>{
  const {g,a}=game();inflict(g,a,'spell_seal');let v=projectGame(g);
  assert.equal(battleSkillPlan(g,'ada','fire','enemy_0').ok,false);assert.match(v.battle.skills.find(s=>s.id==='fire').reason,/呪文封印/);
  assert.equal(battleSkillPlan(g,'ada','attack','enemy_0').ok,true);assert.equal(battleSkillPlan(g,'ada','guard').ok,true);
  assert.equal(battleItemPlan(g,'ada','potion','ada').ok,true);
  inflict(g,a,'skill_seal');assert.equal(statusAbilityReason(g.data,g.state,a,'fire_mix'),'スキル封印でスキルを使用できません。');
  inflict(g,a,'item_seal');v=projectGame(g);assert.ok(v.battle.items.every(i=>!i.enabled&&/アイテム封印/.test(i.reason)));
  const snapshot=g.save();assert.equal(g.dispatch({type:'battle',action:'item',item:'potion',target:'ada'}),false);assert.equal(g.state.battle.round,1);assert.equal(g.state.inventory.potion,JSON.parse(snapshot).state.inventory.potion);
});
test('enemies obey paralysis and spell/skill seals in the mixed queue',()=>{
  const {g,d}=game(),enemy=g.state.battle.enemies[0];enemy.ai=d.enemies[enemy.id].ai=[{priority:2,skill:'fire',target:'random'},{priority:1,skill:'power',target:'random'}];
  inflict(g,enemy,'spell_seal');inflict(g,enemy,'skill_seal');g.random=()=>.99;const hp=g.state.actors.ada.hp,mp=enemy.mp;guard(g);
  assert.equal(g.state.actors.ada.hp,hp);assert.equal(enemy.mp,mp);assert.match(g.state.battle.log.join('\n'),/使える行動がない/);
  removeStatus(enemy);inflict(g,enemy,'paralysis');d.statuses.paralysis.actionFailureChance=1;guard(g);assert.equal(enemy.mp,mp);
  roundtrip(g);
});
test('confusion can replace the chosen action and attack a living ally or self, then consumes only that slot',()=>{
  const {g,d,a}=game();inflict(g,a,'confusion');d.statuses.confusion.confusionChance=1;let draws=[0,0,.99,.99];g.random=()=>draws.shift()??.99;
  // Candidate 0 is basic attack; target 0 is the acting ally, not the selected enemy.
  const hp=a.hp;guard(g);assert.ok(a.hp<hp);assert.equal(g.state.battle.round,2);assert.match(g.state.battle.log.join('\n'),/こんらんで勝手に行動/);
  assert.equal(a.skillProgress.attack.uses,1);assert.equal(a.skillProgress?.guard?.uses??0,0);roundtrip(g);
});
test('confusion chooses only usable actions: all seals, no MP and dead targets are excluded',()=>{
  const {g,d,a}=game();for(const id of ['confusion','spell_seal','skill_seal','item_seal'])inflict(g,a,id);d.statuses.confusion.confusionChance=1;a.mp=0;
  const enemy=g.state.battle.enemies[0];enemy.hp=0;let draws=[.999,.99,.99,.99,.99];g.random=()=>draws.shift()??.99;
  const items=structuredClone(g.state.inventory);guard(g);assert.deepEqual(g.state.inventory,items);assert.equal(a.mp,0);assert.equal(enemy.hp,0);assert.ok(g.state.battle.round===2);assert.ok(g.state.battle.log.some(t=>/守りを固めた/.test(t)));
});
test('confused enemies can hit their own side and save the resulting state',()=>{
  const {g,d}=game(),enemy=g.state.battle.enemies[0];enemy.ai=d.enemies[enemy.id].ai=[{priority:1,skill:'attack',target:'random'}];inflict(g,enemy,'confusion');d.statuses.confusion.confusionChance=1;
  let draws=[0,0,.99];g.random=()=>draws.shift()??.99;const hp=enemy.hp;guard(g);assert.ok(enemy.hp<hp);roundtrip(g);
});
test('field seals block spell and exploration skill usage; an item-sealed recipient can be treated by someone else',()=>{
  const {g,d,a}=game('priest',false);a.hp-=10;inflict(g,a,'spell_seal');assert.match(fieldSkillPlan(g,'ada','heal','ada').reason,/呪文封印/);
  assert.match(fieldActionPlan(d,g.state,'ada','field_prayer').reason,/呪文封印/);
  inflict(g,a,'item_seal');assert.equal(g.useItem('potion','ada'),false);
  g.state.members.push('nio');const potions=g.state.inventory.potion;assert.equal(g.useItem('potion','ada'),true);drain(g);assert.equal(g.state.inventory.potion,potions-1);
  assert.equal(g.useItem('potion','nio','ada'),false,'the acting holder is sealed, not the recipient');
  const model=projectGame(g);assert.equal(model.inventory.find(i=>i.id==='potion').useEnabled,true);
});
test('cleansing, rest and recasting reset recovery only after the old status is removed',()=>{
  const {g,a}=game();inflict(g,a,'blindness');g.random=()=>.99;recoverStatuses(g,a);removeStatus(a,'blindness');inflict(g,a,'blindness');assert.equal(a.statusRecoveryTurns,undefined);
  recoverStatuses(g,a);g.healAll();assert.deepEqual(a.statuses,[]);assert.equal(a.statusRecoveryTurns,undefined);
});
test('confused magic pays the replacement cost once, and group targets can be allies',()=>{
  for(const skillId of ['fire','firestorm']){
    const {g,d,a}=game();for(const [id,n] of Object.entries(g.state.inventory))if(n)g.give(id,-n);
    d.jobs.mage.grants=[{skill:skillId,api:'battle.skill',level:1,target:d.skills[skillId].target,maxTargets:8,lifetime:'equipped'}];
    inflict(g,a,'confusion');d.statuses.confusion.confusionChance=1;
    const before={hp:a.hp,mp:a.mp,enemies:g.state.battle.enemies.map(e=>e.hp)};
    let draws=skillId==='fire'?[.99,.99]:[.99,0,0];g.random=()=>draws.shift()??.99;
    guard(g);assert.equal(a.mp,before.mp-d.skills[skillId].mp);assert.equal(a.skillProgress[skillId].uses,1);
    if(skillId==='fire')assert.ok(g.state.battle.enemies.at(-1).hp<before.enemies.at(-1));
    else{assert.ok(a.hp<before.hp);assert.deepEqual(g.state.battle.enemies.map(e=>e.hp),before.enemies);}
  }
});
test('confusion can consume an item instead of the requested skill without charging that skill',()=>{
  const {g,d,a}=game();d.jobs.mage.grants=[];for(const [id,n] of Object.entries(g.state.inventory))if(id!=='potion'&&n)g.give(id,-n);
  inflict(g,a,'confusion');inflict(g,a,'spell_seal');d.statuses.confusion.confusionChance=1;a.hp-=20;
  const before={hp:a.hp,mp:a.mp,potions:g.state.inventory.potion};let draws=[.99,0];g.random=()=>draws.shift()??.99;
  guard(g);assert.equal(g.state.inventory.potion,before.potions-1);assert.ok(a.hp>before.hp);assert.equal(a.mp,before.mp);assert.equal(a.skillProgress?.guard?.uses??0,0);
});
test('suppressed statuses and defeated units neither affect actions nor advance recovery',()=>{
  const {g,d,a}=game('mage',false);for(const id of ids)inflict(g,a,id);
  const dungeon=Object.values(d.dungeons).find(d=>Object.values(d.systems).some(s=>s.use==='suppression_zone'));
  const zone=Object.values(dungeon.systems).find(s=>s.use==='suppression_zone');zone.statuses.push(...ids);
  const point=zone.cells[0];g.teleport(point.map,point.x,point.y);g.random=()=>{throw Error('suppressed recovery must not draw');};
  recoverStatuses(g,a);assert.equal(a.statusRecoveryTurns,undefined);assert.equal(statusAbilityReason(d,g.state,a,'fire'),'');
  g.teleport('region_2_f1',1,1);a.hp=0;recoverStatuses(g,a);assert.equal(a.statusRecoveryTurns,undefined);
});
test('blindness cannot avoid the self-inflicted penalty of a missed reckless attack',()=>{
  const {g,d,a}=game('berserker',false);d.encounters.wild_pair_10.preemptive={side:'allies',actions:2};g.startBattle('wild_pair_10',{win:[],lose:[],escape:[]});inflict(g,a,'blindness');g.random=()=>.99;const enemy=g.state.battle.enemies[0],hp=enemy.hp;
  assert.ok(g.dispatch({type:'battle',action:'skill',skill:'reckless',target:enemy.instance}));
  assert.equal(enemy.hp,hp);assert.ok(g.state.battle.buffs.some(b=>b.target==='actor:ada'));
});
