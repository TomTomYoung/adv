import test from 'node:test';
import assert from 'node:assert/strict';
import {installDOM} from './view-dom.mjs';
import {data,drain} from './helpers.mjs';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {GameView} from '../src/view/view.js';
import {SceneView} from '../src/view/scene-view.js';
for(const View of [GameView,SceneView])test(`${View.name}: formation swap and cancel, Grid preview / cancel / confirm and fixed movement`,()=>{
 const dom=installDOM();try{
  const g=new GameEngine(structuredClone(data));drain(g);const root=document.createElement('div');document.body.append(root);const intents=[];
  const v=new View(root,intent=>{intents.push(intent);const ok=g.dispatch(intent);v.render(projectGame(g));return ok;},{status(){},soundEnabled:()=>false,effectsMode:()=> 'off',menu(){},help(){}});
  const click=key=>{const b=[...root.querySelectorAll('[data-focus]')].find(b=>b.dataset.focus===key);assert.ok(b,key);assert.ok(!b.disabled,key);b.click();};
  v.tab='party';v.render(projectGame(g));click('formation:open');const before=g.save();click('formation:actor:ada');assert.equal(g.save(),before);click('formation:cell:0,1');assert.deepEqual(g.state.partyFormation.ada,{x:0,y:1});assert.equal(v.formationActor,'ada');v.cancel();assert.equal(v.formationActor,null);v.cancel();assert.equal(v.formationOpen,false);
  g.startBattle('wild_pair_1',{win:[],lose:[],escape:[]},{battleMode:'grid'});v.tab='location';v.render(projectGame(g));assert.equal(root.querySelectorAll('.battle-grid-cell').length,30);const saved=g.save();click('skill:guard');assert.equal(g.save(),saved);const guard=projectGame(g).battle.skills.find(s=>s.id==='guard').choices.find(c=>c.enabled);click('grid:choice:'+guard.id);assert.equal(g.save(),saved);v.cancel();assert.equal(g.save(),saved);click('skill:guard');click('grid:choice:'+guard.id);click('grid:confirm');assert.notEqual(g.save(),saved);
  g.state.battle.grid.movement='fixed';v.render(projectGame(g));assert.equal([...root.querySelectorAll('[data-focus]')].some(b=>b.dataset.focus==='battle:move'),false);
  v.destroy?.();
 }finally{dom.restore();}
});
