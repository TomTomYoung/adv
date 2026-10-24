import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {data,newGame,drain,navigateMaps,walk,inspect,goTownLocation} from './helpers.mjs';
import {applySkill,enemyStats} from '../src/core/battle.js';
import {applyStatus} from '../src/core/status-effects.js';
import {applyStun,guardLevel,applyGuard,clearGuard} from '../src/core/battle-turns.js';
import {validateContent} from '../src/core/validation.js';
import {validateSave} from '../src/core/save.js';
import {treasureKey} from '../src/core/treasures.js';
import {gridTargetPlan} from '../src/core/battle-targeting.js';
import {frontlineTargetPlan} from '../src/core/frontline-targeting.js';
const old=JSON.parse(await fs.readFile(new URL('./fixtures/mine-encounters-save-1.33.0.json',import.meta.url)));
const saved=g=>{const s=g.save();assert.deepEqual(validateSave(JSON.parse(s),g.data),[]);g.load(s);assert.equal(g.save(),s);};
const ready=()=>{const g=newGame();g.load(JSON.stringify(old));return g;};
const start=(mode,id='mine_shallow_c')=>{const g=ready();g.startBattle(id,{}, {battleMode:mode,manualTurns:true});return g;};
const nextRound=g=>{const round=g.state.battle.round;for(let n=0;n<80&&g.state.battle?.round===round;n++)assert.ok(g.dispatch({type:'battle.step'}));assert.equal(g.state.battle?.round,round+1);};
const atRound=(g,n)=>{while(g.state.battle.round<n)nextRound(g);assert.equal(g.state.battle.round,n);};
const enemyTurn=(g,index)=>{const b=g.state.battle,key=`enemy:enemy_${index}`;for(let n=0;b.turnQueue?.[b.turnIndex]!==key;n++){assert.ok(n<80);assert.ok(g.dispatch({type:'battle.step'}));}assert.ok(g.dispatch({type:'battle.step'}));};
const ward=(g,index)=>{const b=g.state.battle;applySkill(g,b.enemies[3],b.enemies[index],data.skills.mine_vein_ward,'mine_vein_ward',true);};

for(const mode of ['classic','grid','frontline']){
 test(`${mode}: mine shell guards only once and exposes the authored fire weakness`,()=>{
  const g=start(mode,'mine_shallow_a');enemyTurn(g,0);assert.equal(guardLevel(g.state.battle,g.state.battle.enemies[0]),1);
  atRound(g,2);enemyTurn(g,0);assert.equal(guardLevel(g.state.battle,g.state.battle.enemies[0]),0);assert.equal(g.state.battle.enemies[0].resist.fire,1.4);saved(g);
 });
 test(`${mode}: mole prepares without damage, charges once, exposes itself, then attacks normally`,()=>{
  const g=start(mode,'mine_mole_lesson');atRound(g,2);const hp=g.state.members.map(id=>g.state.actors[id].hp);enemyTurn(g,0);
  assert.deepEqual(g.state.members.map(id=>g.state.actors[id].hp),hp);assert.equal(g.state.battle.buffs.filter(b=>b.id==='mine_drill_ready').length,1);saved(g);
  atRound(g,3);enemyTurn(g,0);assert.ok(g.state.battle.log.some(t=>t.includes('低位の貫通突進')));assert.equal(g.state.battle.buffs.filter(b=>b.id==='mine_drill_ready').length,0);assert.equal(enemyStats(g,g.state.battle.enemies[0]).vit,9);saved(g);
  atRound(g,4);const at=g.state.battle.log.length;enemyTurn(g,0);assert.ok(!g.state.battle.log.slice(at).some(t=>t.includes('低位の貫通突進')));assert.equal(enemyStats(g,g.state.battle.enemies[0]).vit,9);
  atRound(g,5);assert.equal(enemyStats(g,g.state.battle.enemies[0]).vit,14);saved(g);
 });
 test(`${mode}: stun on the windup or prepared action cancels the mole charge across a save`,()=>{
  for(const round of [2,3]){const g=start(mode,'mine_mole_lesson');atRound(g,2);if(round===3){enemyTurn(g,0);nextRound(g);}applyStun(g,g.state.battle.enemies[0],{count:1});saved(g);enemyTurn(g,0);atRound(g,4);
   assert.ok(!g.state.battle.log.some(t=>t.includes('低位の貫通突進')));assert.equal(g.state.battle.buffs.filter(b=>b.id==='mine_drill_ready').length,0);saved(g);
  }
 });
 test(`${mode}: confusion cannot bypass the mole's preparation condition`,()=>{
  const g=start(mode,'mine_mole_lesson');applyStatus(g.data,g.state,g.state.battle.enemies[0],'confusion',undefined,3);g.random=()=>0;
  enemyTurn(g,0);assert.ok(g.state.battle.log.some(t=>t.includes('こんらん')));assert.ok(!g.state.battle.log.some(t=>t.includes('低位の貫通突進')));assert.equal(enemyStats(g,g.state.battle.enemies[0]).vit,14);saved(g);
  const prepared=start(mode,'mine_mole_lesson');atRound(prepared,2);enemyTurn(prepared,0);atRound(prepared,3);applyStatus(prepared.data,prepared.state,prepared.state.battle.enemies[0],'confusion',undefined,3);prepared.random=()=>0;enemyTurn(prepared,0);
  assert.ok(prepared.state.battle.log.some(t=>t.includes('低位の貫通突進')));assert.equal(prepared.state.battle.buffs.filter(b=>b.id==='mine_drill_ready').length,0);saved(prepared);
 });
 test(`${mode}: partial defense penetration still respects guard`,()=>{
  const g=start(mode,'mine_mole_lesson'),source=g.state.battle.enemies[0],target=g.state.actors.ada,skill=data.skills.mine_drill_charge;
  const hp=target.hp;clearGuard(g.state.battle,target);const normal=applySkill(g,source,target,skill,'mine_drill_charge',true,null,false);target.hp=hp;
  applyGuard(g.state.battle,target);const guarded=applySkill(g,source,target,skill,'mine_drill_charge',true,null,false);assert.ok(normal>guarded&&guarded>0);target.hp=hp;clearGuard(g.state.battle,target);
  const ordinary=applySkill(g,source,target,data.skills.attack,'attack',true,null,false);assert.ok(normal>ordinary);saved(g);
 });
 test(`${mode}: sentinel selects an unbuffed living ally, does not stack, heals nobody and waits on even rounds`,()=>{
  const g=start(mode,'mine_shallow_b');ward(g,0);ward(g,0);assert.equal(g.state.battle.buffs.length,1);assert.equal(enemyStats(g,g.state.battle.enemies[0]).vit,32);const hp=g.state.battle.enemies.map(e=>e.hp);saved(g);
  enemyTurn(g,3);const b=g.state.battle;assert.equal(b.enemies[3].mp,28);assert.equal(b.buffs.filter(x=>x.id==='mine_vein_ward').length,2);assert.ok(b.buffs.some(x=>x.target==='enemy:enemy_1'));assert.deepEqual(b.enemies.map(e=>e.hp),hp);saved(g);
  atRound(g,2);enemyTurn(g,3);assert.equal(g.state.battle.enemies[3].mp,28);atRound(g,3);assert.equal(g.state.battle.buffs.length,0);saved(g);
 });
 test(`${mode}: no eligible unbuffed ally spends no support MP, including defeated allies`,()=>{
  const g=start(mode,'mine_shallow_b');g.state.battle.enemies[0].hp=0;for(const i of [1,2,3])ward(g,i);const mp=g.state.battle.enemies[3].mp;enemyTurn(g,3);assert.equal(g.state.battle.enemies[3].mp,mp);assert.ok(!g.state.battle.buffs.some(b=>b.target==='enemy:enemy_0'));saved(g);
 });
 test(`${mode}: caster and support attack from the back and fall back when empty or spell-sealed`,()=>{
  const g=start(mode);enemyTurn(g,2);assert.equal(g.state.battle.enemies[2].mp,32);saved(g);
  nextRound(g);const b=g.state.battle;applyStatus(g.data,g.state,b.enemies[2],'spell_seal',undefined,3);b.enemies[3].mp=0;const before=b.enemies[2].mp,at=b.log.length;enemyTurn(g,2);enemyTurn(g,3);
  assert.equal(g.state.battle.enemies[2].mp,before);assert.ok(g.state.battle.log.slice(at).filter(t=>t.includes('細い晶片投げ')).length>=2);saved(g);
  if(mode!=='classic'){const plan=mode==='grid'?gridTargetPlan:frontlineTargetPlan;for(const n of [2,3])assert.ok(g.state.members.some(id=>plan(g,g.state.battle.enemies[n],data.skills.mine_shard_shot,'mine_shard_shot',`actor:${id}`).ok));}
 });
 test(`${mode}: scissors alternate strong and weak claws without adding salt or destroying gear`,()=>{
  const g=ready();goTownLocation(g,data.game.world.townRoot);g.dispatch({type:'travel',dungeon:'region_2'});g.startBattle('mine_shallow_c',{}, {battleMode:mode,manualTurns:true});const gear=structuredClone(g.state.gear.items);
  assert.ok(Object.values(gear).some(v=>v.salt===1));enemyTurn(g,1);assert.ok(g.state.battle.log.some(t=>t.includes('結晶の強爪')));atRound(g,2);const at=g.state.battle.log.length;enemyTurn(g,1);assert.ok(g.state.battle.log.slice(at).some(t=>t.includes('結晶の小爪')));
  atRound(g,4);assert.deepEqual(g.state.gear.items,gear);saved(g);
 });
 test(`${mode}: mixed mine rewards and material drops commit only once through result saves`,()=>{
  const g=start(mode),b=g.state.battle,before={gold:g.state.gold,xp:g.state.actors.ada.xp,gems:g.state.expedition.gems,parts:g.state.inventory.machine_part??0,fiber:g.state.inventory.soft_fiber??0};
  for(const e of b.enemies)e.hp=0;g.random=()=>0;g.finishBattle('win');saved(g);assert.equal(g.state.gold-before.gold,46);assert.equal(g.state.actors.ada.xp-before.xp,155);assert.equal(g.state.expedition.gems-before.gems,20);
  while(g.state.battleResult){saved(g);assert.ok(g.dispatch({type:'advance'}));}
  assert.equal(g.state.inventory.machine_part-before.parts,2);assert.equal(g.state.inventory.soft_fiber-before.fiber,2);saved(g);
 });
}

test('unbuffed AI accepts only single-ally skills with nonempty buff effects',()=>{
 for(const edit of [d=>d.enemies.mine_low_sentinel.ai[0].skill='attack',d=>d.skills.mine_vein_ward.target='all_allies',d=>d.skills.mine_vein_ward.effects=[],d=>d.skills.mine_vein_ward.effects.push({type:'heal',amount:10})]){const d=structuredClone(data);edit(d);assert.ok(validateContent(d).some(e=>e.includes('単体補助')));}
});
test('1.33 actual earned campaign save migrates only its version and rejects invalid equipment',()=>{
 const g=ready(),expected=structuredClone(old.state);expected.contentVersion=data.game.version;expected.scenarioEdition='e1';assert.deepEqual(g.state,expected);saved(g);
 const bad=structuredClone(old);bad.state.gear.items[bad.state.gear.equipped.ada.weapon].salt=-1;const before=g.save();assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),before);
});
test('9F repair materials require a physical detour, remain atomic when full and cannot be collected twice',()=>{
 const g=ready();g.random=()=>.99999;goTownLocation(g,data.game.world.townRoot);g.dispatch({type:'travel',dungeon:'region_2'});navigateMaps(g,'region_2_f3');walk(g,5,3);inspect(g,'support_brace');drain(g);g.dispatch({type:'choose',id:'open'});drain(g);navigateMaps(g,'region_2_f9');walk(g,5,5);
 const key=treasureKey('region_2_f9','workshop_parts'),fiber=g.state.inventory.soft_fiber??0;g.state.inventory.machine_part=98;inspect(g,'workshop_parts');drain(g);assert.equal(g.state.events[key],undefined);assert.equal(g.state.inventory.soft_fiber??0,fiber);saved(g);
 while(g.state.waiting?.type==='command')assert.ok(g.dispatch({type:'choose',id:'cancel'}));g.state.inventory.machine_part=95;inspect(g,'workshop_parts');drain(g);assert.equal(g.state.inventory.machine_part,99);assert.equal(g.state.inventory.soft_fiber,fiber+4);assert.equal(g.state.events[key],1);saved(g);
 assert.ok(g.returnTown());goTownLocation(g,data.game.world.townRoot);g.dispatch({type:'travel',dungeon:'region_2'});navigateMaps(g,'region_2_f9');walk(g,5,5);inspect(g,'workshop_parts');drain(g);assert.equal(g.state.inventory.soft_fiber,fiber+4);assert.equal(g.state.events[key],1);saved(g);
});
