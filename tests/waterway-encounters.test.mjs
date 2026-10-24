import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {data,newGame,drain,navigateMaps,walk,inspect,goTownLocation} from './helpers.mjs';
import {applySkill} from '../src/core/battle.js';
import {applyStatus,cleanseCandidates} from '../src/core/status-effects.js';
import {applyStun,guardLevel} from '../src/core/battle-turns.js';
import {skillDefinitionErrors} from '../src/core/job-validation.js';
import {validateContent} from '../src/core/validation.js';
import {validateSave} from '../src/core/save.js';
import {treasureKey} from '../src/core/treasures.js';
import {gridTargetPlan} from '../src/core/battle-targeting.js';
import {frontlineTargetPlan} from '../src/core/frontline-targeting.js';
import {fieldSkillPlan} from '../src/core/field-skills.js';
const old=JSON.parse(await fs.readFile(new URL('./fixtures/waterway-encounters-save-1.32.0.json',import.meta.url)));
const saved=g=>{const s=g.save();assert.deepEqual(validateSave(JSON.parse(s),g.data),[]);g.load(s);assert.equal(g.save(),s);};
const ready=()=>{const g=newGame();g.load(JSON.stringify(old));return g;};
const start=(mode,id='waterway_shallow_b')=>{const g=ready();g.startBattle(id,{}, {battleMode:mode,manualTurns:true});return g;};
const nextRound=g=>{const round=g.state.battle.round;for(let n=0;n<80&&g.state.battle?.round===round;n++)assert.ok(g.dispatch({type:'battle.step'}));assert.equal(g.state.battle?.round,round+1);};
const atRound=(g,n)=>{while(g.state.battle.round<n)nextRound(g);assert.equal(g.state.battle.round,n);};
const status=(g,t,id,level=1)=>applyStatus(g.data,g.state,t,id,undefined,level);
const enemyTurn=(g,index)=>{const b=g.state.battle,key=`enemy:enemy_${index}`;for(let n=0;b.turnQueue?.[b.turnIndex]!==key;n++){assert.ok(n<80);assert.ok(g.dispatch({type:'battle.step'}));}assert.ok(g.dispatch({type:'battle.step'}));};

for(const mode of ['classic','grid','frontline']){
 test(`${mode}: crocodile guards only first turn and the beaver telegraphs one consumable heavy attack`,()=>{
  const g=start(mode);enemyTurn(g,0);assert.equal(guardLevel(g.state.battle,g.state.battle.enemies[0]),1);
  atRound(g,2);enemyTurn(g,1);assert.ok(g.state.battle.log.some(t=>t.includes('次の攻撃は強打')));
  assert.equal(g.state.battle.buffs.filter(b=>b.id==='waterway_tail_ready').length,1);saved(g);
  enemyTurn(g,0);assert.equal(guardLevel(g.state.battle,g.state.battle.enemies[0]),0);
  atRound(g,3);enemyTurn(g,1);assert.equal(g.state.battle.buffs.filter(b=>b.id==='waterway_tail_ready').length,0);saved(g);
  atRound(g,4);enemyTurn(g,1);assert.equal(g.state.battle.buffs.filter(b=>b.id==='waterway_tail_ready').length,0);
 });
 test(`${mode}: stunning the windup prevents a heavy attack; stunning the prepared turn consumes it`,()=>{
  for(const round of [2,3]){const g=start(mode);nextRound(g);if(round===3){enemyTurn(g,1);nextRound(g);}const e=g.state.battle.enemies[1];applyStun(g,e,{count:1});enemyTurn(g,1);assert.equal(g.state.battle.buffs.filter(b=>b.id==='waterway_tail_ready').length,0);saved(g);}
 });
 test(`${mode}: middle caster and back support can attack, even when MP is empty`,()=>{
  const g=start(mode),b=g.state.battle;const before=b.enemies[2].mp;enemyTurn(g,2);assert.equal(b.enemies[2].mp,before-4);saved(g);
  const live=g.state.battle;live.enemies[2].mp=0;live.enemies[3].mp=0;nextRound(g);
  const at=g.state.battle.log.length;enemyTurn(g,2);enemyTurn(g,3);assert.ok(g.state.battle.log.slice(at).some(t=>t.includes('細い水弾')));assert.equal(g.state.battle.enemies[2].mp,0);saved(g);
  if(mode!=='classic'){const plan=mode==='grid'?gridTargetPlan:frontlineTargetPlan;for(const n of [2,3])assert.ok(g.state.members.some(id=>plan(g,g.state.battle.enemies[n],data.skills.waterway_spit,'waterway_spit',`actor:${id}`).ok));}
 });
 test(`${mode}: filter selects the afflicted ally, removes only one status on even rounds and never heals`,()=>{
  const g=start(mode);nextRound(g);let b=g.state.battle;status(g,b.enemies[0],'weakened',2);status(g,b.enemies[0],'sluggish',2);b.enemies[1].hp=10;
  const hp=b.enemies.map(e=>e.hp),mp=b.enemies[3].mp;enemyTurn(g,3);b=g.state.battle;
  assert.equal(b.enemies[3].mp,mp-4);assert.deepEqual(b.enemies[0].statuses,['sluggish']);assert.equal(b.enemies[0].statusLevels.weakened,undefined);assert.equal(b.enemies[0].statusDurations.weakened,undefined);assert.deepEqual(b.enemies.map(e=>e.hp),hp);saved(g);
  nextRound(g);const before=g.state.battle.enemies[3].mp;enemyTurn(g,3);assert.equal(g.state.battle.enemies[3].mp,before);saved(g);
 });
 test(`${mode}: no matching living ally means no wasted filter MP; defeated allies and beneficial states do not count`,()=>{
  const g=start(mode);nextRound(g);const b=g.state.battle;status(g,b.enemies[0],'poison');b.enemies[0].hp=0;status(g,b.enemies[1],'sure_hit',3);const mp=b.enemies[3].mp;enemyTurn(g,3);assert.equal(b.enemies[3].mp,mp);saved(g);
 });
 test(`${mode}: sealing the eel's spell leaves its MP untouched and uses the ranged fallback`,()=>{
  const g=start(mode);status(g,g.state.battle.enemies[2],'spell_seal',3);const mp=g.state.battle.enemies[2].mp;enemyTurn(g,2);assert.equal(g.state.battle.enemies[2].mp,mp);assert.ok(g.state.battle.log.some(t=>t.includes('細い水弾')));saved(g);
 });
 test(`${mode}: new encounter rewards and material drops commit once through result saves`,()=>{
  const g=start(mode),b=g.state.battle,before={gold:g.state.gold,xp:g.state.actors.ada.xp,gems:g.state.expedition.gems,parts:g.state.inventory.machine_part??0,fiber:g.state.inventory.soft_fiber??0};
  for(const e of b.enemies)e.hp=0;g.random=()=>0;g.finishBattle('win');saved(g);assert.equal(g.state.gold-before.gold,46);assert.equal(g.state.actors.ada.xp-before.xp,160);assert.equal(g.state.expedition.gems-before.gems,20);
  while(g.state.battleResult){saved(g);assert.ok(g.dispatch({type:'advance'}));}
  assert.equal(g.state.inventory.machine_part-before.parts,2);assert.equal(g.state.inventory.soft_fiber-before.fiber,2);saved(g);
 });
}

test('ordered cleanse preserves legacy all-status cleansing, harmless statuses and an empty match',()=>{
 const g=start('classic'),b=g.state.battle,t=b.enemies[0];
 status(g,t,'sure_hit',3);const skill=data.skills.waterway_filter;applySkill(g,b.enemies[3],t,skill,'waterway_filter',true);assert.deepEqual(t.statuses,['sure_hit']);
 status(g,t,'weakened',3);status(g,t,'poison',2);assert.deepEqual(cleanseCandidates(t,skill.effects[0]),['poison']);
 applySkill(g,b.enemies[3],t,skill,'waterway_filter',true);assert.deepEqual(t.statuses,['sure_hit','weakened']);assert.equal(t.statusLevels.poison,undefined);
 applySkill(g,b.enemies[3],t,data.skills.antidote,'antidote',true);assert.deepEqual(t.statuses,[]);
});

test('invalid ordered cures and incompatible afflicted AI reject authoring mistakes',()=>{
 for(const edit of [e=>e.statuses=[],e=>e.statuses=['poison','poison'],e=>e.statuses=['missing'],e=>e.statuses=['constructor'],e=>e.statuses=['sure_hit'],e=>e.status='poison',e=>e.type='damage']){const skill=structuredClone(data.skills.waterway_filter);edit(skill.effects[0]);assert.ok(skillDefinitionErrors(data,skill).length);}
 const d=structuredClone(data);d.enemies.waterway_low_clam.ai[0].skill='attack';assert.ok(validateContent(d).some(e=>e.includes('単体解除')));
});

test('field usefulness uses the same ordered cure candidates without spending MP on a healthy target',()=>{
 const g=ready();g.data=structuredClone(data);const s=g.data.skills.cleanse;delete s.effects[0].status;s.effects[0].statuses=['poison'];status(g,g.state.actors.ada,'weakened',3);
 const mp=g.state.actors.sera.mp;assert.equal(fieldSkillPlan(g,'sera','cleanse','ada').ok,false);assert.equal(g.dispatch({type:'field.skill',actor:'sera',skill:'cleanse',target:'ada'}),false);assert.equal(g.state.actors.sera.mp,mp);
});

test('1.32 migration preserves actual earned equipment, progression and oil without free materials',()=>{
 const g=ready();const expected=structuredClone(old.state);expected.contentVersion=data.game.version;expected.scenarioEdition='e1';assert.deepEqual(g.state,expected);saved(g);
 const bad=structuredClone(old);bad.state.expedition.capacity=450;const before=g.save();assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),before);
});

test('9F optional bank materials are accessible after drainage, atomic when full and permanent across reentry',()=>{
 const g=ready();g.random=()=>.99999;goTownLocation(g,data.game.world.townRoot);assert.ok(g.dispatch({type:'travel',dungeon:'region_1'}));navigateMaps(g,'region_1_canal_d');walk(g,5,5);
 const key=treasureKey('region_1_canal_d','workshop_parts'),fiber=g.state.inventory.soft_fiber??0;g.state.inventory.machine_part=98;
 inspect(g,'workshop_parts');drain(g);assert.equal(g.state.events[key],undefined);assert.equal(g.state.inventory.soft_fiber??0,fiber);saved(g);
 while(g.state.waiting?.type==='command')assert.ok(g.dispatch({type:'choose',id:'cancel'}));g.state.inventory.machine_part=95;inspect(g,'workshop_parts');drain(g);assert.equal(g.state.inventory.machine_part,99);assert.equal(g.state.inventory.soft_fiber,fiber+4);assert.equal(g.state.events[key],1);saved(g);
 assert.ok(g.returnTown());goTownLocation(g,data.game.world.townRoot);g.dispatch({type:'travel',dungeon:'region_1'});navigateMaps(g,'region_1_canal_d');walk(g,5,5);inspect(g,'workshop_parts');drain(g);assert.equal(g.state.inventory.soft_fiber,fiber+4);assert.equal(g.state.events[key],1);saved(g);
});
