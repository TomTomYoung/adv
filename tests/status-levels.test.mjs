import test from 'node:test';
import assert from 'node:assert/strict';
import {data,drain} from './helpers.mjs';
import {GameEngine} from '../src/core/engine.js';
import {applyStatus,applyStatusClock,statusLevel,statusStats} from '../src/core/status-effects.js';
import {wetResistance,wetSkillBlocked} from '../src/core/wet.js';
import {validateSave} from '../src/core/save.js';

function game(){
  const d=structuredClone(data),g=new GameEngine(d);drain(g);return {g,d,a:g.state.actors.ada};
}
test('status levels are 1-3, preserve the stronger reapplication, and survive save/load',()=>{
  const {g,d,a}=game();
  assert.equal(applyStatus(d,g.state,a,'poison',undefined,2),true);assert.equal(statusLevel(a,'poison'),2);
  assert.equal(applyStatus(d,g.state,a,'poison',undefined,1),false);assert.equal(statusLevel(a,'poison'),2);
  assert.equal(applyStatus(d,g.state,a,'poison',undefined,3),true);assert.equal(statusLevel(a,'poison'),3);
  const save=JSON.parse(g.save());assert.deepEqual(validateSave(save,d),[]);g.load(JSON.stringify(save));assert.equal(statusLevel(g.state.actors.ada,'poison'),3);
  save.state.actors.ada.statusLevels.poison=4;assert.ok(validateSave(save,d).length);
});
test('fixed poison, virulent poison, curse poison and hollow curse use their level data',()=>{
  const {g,d,a}=game(),max=g.stats('ada');
  applyStatus(d,g.state,a,'poison',undefined,2);a.hp=max.hp;let loss=applyStatusClock(d,g.state,a,'poison','steps',max,{lethal:false});assert.equal(loss.hp,10);
  a.statuses=[];delete a.statusLevels;applyStatus(d,g.state,a,'virulent_poison',undefined,2);a.hp=max.hp;loss=applyStatusClock(d,g.state,a,'virulent_poison','turns',max);assert.equal(loss.hp,Math.ceil(max.hp*.2));
  a.statuses=[];delete a.statusLevels;applyStatus(d,g.state,a,'curse_poison',undefined,3);a.mp=max.mp;loss=applyStatusClock(d,g.state,a,'curse_poison','steps',max,{lethal:false});assert.equal(loss.mp,100);assert.equal(a.mp,0);
  a.statuses=[];delete a.statusLevels;applyStatus(d,g.state,a,'hollow_curse',undefined,2);a.hp=max.hp;a.mp=max.mp;loss=applyStatusClock(d,g.state,a,'hollow_curse','turns',max);assert.deepEqual(loss,{hp:40,mp:40});
});
test('weakened level 3 can reduce strength and defense to zero',()=>{
  const {g,d,a}=game(),base=g.stats('ada');applyStatus(d,g.state,a,'weakened',undefined,3);
  const stats=statusStats(d,g.state,a,base);assert.equal(stats.str,0);assert.equal(stats.vit,0);
});
test('wet levels change ice/lightning damage, backlash profile and level 3 suppression',()=>{
  const {g,d,a}=game();
  applyStatus(d,g.state,a,'wet',undefined,1);assert.equal(wetResistance(d,a,'lightning'),1.2);assert.equal(wetSkillBlocked(g,a,d.skills.lightning),false);
  a.statuses=[];delete a.statusLevels;applyStatus(d,g.state,a,'wet',undefined,3);assert.equal(wetResistance(d,a,'ice'),2);assert.equal(wetSkillBlocked(g,a,d.skills.lightning),true);assert.equal(wetSkillBlocked(g,a,d.skills.fire),false);
});
