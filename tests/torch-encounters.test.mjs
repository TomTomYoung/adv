import test from 'node:test';
import assert from 'node:assert/strict';
import {data,drain} from './helpers.mjs';
import {GameEngine} from '../src/core/engine.js';
import {fireContext,fireEnvironment,canRepel} from '../src/core/systems/fire-network.js';
import {processFieldEvents} from '../src/core/field-events.js';
import {validateContent} from '../src/core/validation.js';
function make(effect='ordinary',fuel=90){
  const d=structuredClone(data);for(const map of Object.values(d.maps))map.objects=map.objects.filter(o=>!o.quest);
  const g=new GameEngine(d,417);drain(g);g.teleport('kagaribi_f2',2,1,'east');g.setPortableFire({fuel,effect});
  g.partyEffect=(name,fallback=1)=>fallback;g.state.steps=d.system.encounterCheckSteps-1;
  return g;
}
const step=g=>assert.ok(g.dispatch({type:'move',direction:'forward'}));
test('ordinary and entrance flames exclude kuragari but allow normal monsters',()=>{
  for(const effect of ['ordinary','ward']){
    const g=make(effect);g.random=()=>0;processFieldEvents(g);assert.equal(g.state.battle,null);
    step(g);assert.equal(g.state.battle.encounter,'kagaribi_roaming');assert.equal(g.state.battle.enemyScale??1,1);
  }
});
test('darkness has a separate chance and a 100 percent kuragari pool, with exact threshold',()=>{
  for(const roll of [0,0.219999,0.22,0.999999]){
    const g=make(null,0);let calls=0;g.random=()=>{calls++;return calls===1?roll:0.999999;};
    processFieldEvents(g);assert.equal(calls,0);assert.equal(g.state.battle,null);step(g);
    assert.equal(g.state.battle?.encounter??null,roll<0.22?'kuragari_hunt':null);
    assert.equal(calls,roll<0.22?2:1);
  }
});
test('only successful cadence steps roll; turning, collision, extinguishing and save/load do not',()=>{
  const g=make();let calls=0;g.random=()=>{calls++;return 0.999999;};
  assert.ok(g.dispatch({type:'dungeon.action',system:'fires',action:'extinguish',target:'portable'}));
  g.dispatch({type:'move',direction:'left'});assert.equal(g.dispatch({type:'move',direction:'forward'}),false);
  g.dispatch({type:'move',direction:'right'});const saved=g.save();g.load(saved);processFieldEvents(g);
  assert.equal(calls,0);g.state.steps=0;step(g);assert.equal(calls,0);
  g.state.steps=g.data.system.encounterCheckSteps-1;step(g);assert.equal(calls,1);
  assert.equal(g.state.battle,null);
});
test('fuel depletion changes to the dark pool on that step, while a nearby flame still protects',()=>{
  const g=make('ordinary',1);g.random=()=>0;step(g);assert.equal(fireContext(g.data,g.state).run.portable.lit,false);assert.equal(g.state.battle.encounter,'kuragari_hunt');
  const h=make(null,0);h.teleport('kagaribi_f1',2,1,'east');h.state.steps=h.data.system.encounterCheckSteps-1;h.random=()=>0;
  assert.equal(fireEnvironment(fireContext(h.data,h.state)).protected,true);step(h);assert.equal(h.state.battle.encounter,'kagaribi_roaming');
});
test('special deep fire suppresses random encounters even when a lure is also in range',()=>{
  const g=make('deep');g.teleport('kagaribi_f2',8,3,'east');
  const ctx=fireContext(g.data,g.state),fixture=ctx.spec.fixtures.find(f=>f.effect==='lure');
  g.teleport(fixture.map,fixture.x,fixture.y,'east');ctx.persistent.fixtures[fixture.id]={lit:true,effect:'lure',fuel:fixture.capacity};
  g.state.steps=g.data.system.encounterCheckSteps-1;g.random=()=>0;
  assert.equal(fireEnvironment(fireContext(g.data,g.state)).rate,0);step(g);assert.equal(g.state.battle,null);
});
test('new dark encounter variants are selected by weight and recognized by repel skills',()=>{
  for(const [roll,expected] of [[0,'kuragari_hunt'],[0.24999,'kuragari_hunt'],[0.25,'test_kuragari'],[0.99999,'test_kuragari']]){
    const g=make(null,0);g.data.encounters.test_kuragari=structuredClone(g.data.encounters.kuragari_hunt);
    g.data.dungeons.kagaribi.systems.fires.threat.encounterPool.push({encounter:'test_kuragari',weight:3});
    let n=0;g.random=()=>n++===0?0:roll;step(g);assert.equal(g.state.battle.encounter,expected);
    assert.equal(canRepel(g.data,g.state,g.data.skills.repel_kuragari),true);
    const saved=g.save();g.load(saved);assert.equal(g.save(),saved);
  }
});
test('invalid darkness rates, missing encounters and invalid weights are rejected',()=>{
  for(const mutate of [t=>t.encounterRate=-1,t=>t.encounterRate=1.01,t=>t.encounterRate=NaN,t=>t.encounterPool=[],t=>t.encounterPool[0].weight=0,t=>t.encounterPool[0].weight=-1,t=>t.encounterPool[0].weight=Infinity,t=>t.encounterPool[0].encounter='missing']){
    const d=structuredClone(data);mutate(d.dungeons.kagaribi.systems.fires.threat);assert.ok(validateContent(d).length);
  }
});
