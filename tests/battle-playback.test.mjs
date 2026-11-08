import test from 'node:test';
import assert from 'node:assert/strict';
import {data,newGame} from './helpers.mjs';
import {projectGame} from '../src/application/projection.js';
import {nextFormation} from '../src/core/battle-formation.js';
import {GameView} from '../src/view/view.js';
import {handleGameKey} from '../src/view/keyboard.js';
import {installDOM} from './view-dom.mjs';

function setup(t,mode='full'){
  t.mock.timers.enable({apis:['setTimeout']});const dom=installDOM();
  Object.getPrototypeOf(dom.root).animate=function(){return {finished:new Promise(()=>{}),cancel(){}};};
  const g=newGame(311);g.state.members=['ada'];g.state.partyFormation=nextFormation(g.state.members,g.state.partyFormation);
  g.startBattle('wild_pair_1',{win:[],lose:[],escape:[]});
  for(const e of g.state.battle.enemies){e.hp=e.stats.hp=1000;e.ai=[{priority:1,skill:'attack',target:'weakest'}];}
  let dispatches=0;
  const view=new GameView(dom.root,intent=>{dispatches++;return g.dispatch(intent);},{effectsMode:()=>mode,status(){},menu(){},sound(){},soundEnabled:()=>false,help(){}});
  view.render(projectGame(g));
  const act=()=>{g.dispatch({type:'battle',action:'skill',skill:'attack',target:'enemy_0'});const next=projectGame(g);view.render(next);return next;};
  t.after(()=>{view.destroy();dom.restore();});return {...dom,g,view,act,dispatches:()=>dispatches};
}

test('HP stays on the old battlefield until impact; Enter skips presentation only and never repeats combat',t=>{
  const c=setup(t),before=c.view.model.battle.enemies[0].hp,next=c.act(),saved=c.g.save();
  const text=()=>c.root.querySelector('[data-battle-vitals="enemy:enemy_0"][data-vitals-kind="text"]').textContent;
  assert.ok(c.view.playback.active);assert.ok(text().startsWith(String(before)));
  t.mock.timers.tick(129);assert.ok(text().startsWith(String(before)));
  t.mock.timers.tick(1);assert.ok(text().includes(String(next.battle.enemies[0].hp)));assert.equal(c.g.save(),saved);
  const event={key:'Enter',preventDefault(){this.defaultPrevented=true;}};
  handleGameKey(event,{view:c.view,model:next,dispatch(){throw Error('skip dispatched combat');}});
  assert.equal(c.view.playback.active,null);assert.equal(c.view.model,next);assert.equal(c.dispatches(),0);assert.equal(c.g.save(),saved);
  assert.equal(c.root.querySelector('[inert]'),null);assert.equal(c.document.body.querySelectorAll('.fx-overlay').length,0);
  t.mock.timers.tick(10000);assert.equal(c.view.model,next);assert.equal(c.g.save(),saved);
});

test('rerendering the old visible model settles on the latest result; load cancels old timelines',t=>{
  const c=setup(t),old=c.view.model,next=c.act();c.view.render(old);
  assert.equal(c.view.model,next);assert.equal(c.view.playback.active,null);
  c.act();const loaded=projectGame(newGame(7));c.view.render(loaded);t.mock.timers.tick(10000);
  assert.equal(c.view.model,loaded);assert.equal(c.root.querySelector('[inert]'),null);
});

test('automatic completion restores controls; effects off presents the final state immediately',t=>{
  const c=setup(t),next=c.act();t.mock.timers.tick(10000);
  assert.equal(c.view.model,next);assert.equal(c.view.playback.active,null);
  c.view.ui.effectsMode=()=> 'off';const final=c.act();assert.equal(c.view.model,final);assert.equal(c.view.playback.active,null);
});

test('normal attack uses the equipped weapon and preserves resolved defeat snapshots',()=>{
  for(const [kind,cue] of Object.entries(data.presentation.bindings.weapons)){
    const g=newGame(311);g.state.members=['ada'];g.state.partyFormation=nextFormation(g.state.members,g.state.partyFormation);
    const weapon=Object.values(g.data.items).find(i=>i.equipmentType===kind);assert.ok(weapon,kind);g.state.actors.ada.equipment.weapon=weapon.id;
    g.startBattle('wild_pair_1',{win:[],lose:[],escape:[]});g.state.battle.enemies[0].hp=1;
    g.dispatch({type:'battle',action:'skill',skill:'attack',target:'enemy_0'});
    const impact=g.feedback.events.find(e=>e.phase==='impact'&&e.source.key==='actor:ada');assert.ok(impact,kind);
    assert.equal(impact.sound,g.data.presentation.cues[cue].sound);assert.equal(impact.targets[0].hpBefore,1);assert.equal(impact.targets[0].hpAfter,0);assert.equal(impact.targets[0].defeated,true);
    assert.ok(g.feedback.events.some(e=>e.phase==='defeat'));if(kind==='bow')assert.ok(g.feedback.events.some(e=>e.phase==='flight'));
  }
});
