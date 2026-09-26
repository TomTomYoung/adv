import test from 'node:test';
import assert from 'node:assert/strict';
import {data,newGame} from './helpers.mjs';
import {projectGame} from '../src/application/projection.js';
import {validatePresentation} from '../src/core/feedback-validation.js';
import {EffectsRenderer} from '../src/view/effects.js';
import {installDOM} from './view-dom.mjs';
import {feedbackDelay} from '../src/feedback-timing.js';

function battle(){const g=newGame(311);g.state.members=['ada'];g.startBattle('wild_pair_1',{win:[],lose:[],escape:[]});for(const e of g.state.battle.enemies){e.hp=1000;e.ai=[{priority:1,skill:'attack',target:'weakest'}];}return g;}

test('view and audio delays share the render origin and never schedule in the past',()=>{
  assert.equal(100+feedbackDelay({startedAt:80},130,100),160+feedbackDelay({startedAt:80},130,160));
  assert.equal(feedbackDelay({startedAt:80},130,400),0);assert.equal(feedbackDelay({},130,400),130);
});

test('one impact carries sound, recoil and the resolved damage; enemy advance precedes its own hit',()=>{
  const g=battle(),before=g.state.battle.enemies[0].hp;
  g.dispatch({type:'battle',action:'skill',skill:'attack',target:'enemy_0'});
  const [hit,advance,enemyHit]=g.feedback.events;
  assert.equal(hit.at,130);assert.equal(hit.sound,'se_slash');assert.deepEqual(hit.effects,['strike_slash','recoil_slash']);
  assert.equal(hit.targets[0].damage,before-g.state.battle.enemies[0].hp);assert.equal(hit.source.key,'actor:ada');
  assert.deepEqual(advance.effects,['enemy_advance']);assert.equal(enemyHit.at-advance.at,130);
  assert.equal(advance.targets[0].key,enemyHit.source.key);assert.equal(enemyHit.targets[0].key,'actor:ada');assert.ok(enemyHit.targets[0].damage>0);
  const projected=projectGame(g).feedback.events;
  assert.ok(projected[2].source.image.startsWith('assets/'));projected[0].targets[0].damage=9999;assert.notEqual(hit.targets[0].damage,9999);
});

test('all-target enemy attacks use one sound and one anticipation with each target damage, healing has no damage number',()=>{
  const g=battle();g.state.members=['ada','sera'];g.state.battle.acted=['sera'];
  for(const e of g.state.battle.enemies)e.ai=[{priority:1,skill:'bone_rain',target:'weakest'}];
  g.dispatch({type:'battle',action:'skill',skill:'attack',target:'enemy_0'});
  const hits=g.feedback.events.filter(e=>e.source?.key.startsWith('enemy:'));
  assert.equal(hits.length,2);assert.equal(g.feedback.events.filter(e=>e.effects.includes('enemy_advance')).length,2);
  for(const hit of hits){assert.equal(hit.sound,'se_heavy');assert.equal(hit.targets.length,2);assert.ok(hit.targets.every(t=>t.damage>0));}
  const h=newGame();h.state.members=['toma','dora'];h.startBattle('wild_pair_1',{win:[],lose:[],escape:[]});h.dispatch({type:'battle',action:'skill',skill:'group_heal'});
  const heal=h.feedback.events.find(e=>e.sound==='se_heal');assert.ok(heal.targets.every(t=>t.damage===undefined));
});

test('cover redirects the displayed hit to the defender, and overkill preserves the logged damage and image',()=>{
  const g=battle();g.state.members=['ada','sera'];g.state.actors.sera.hp=1;g.state.battle.acted=['sera'];
  g.state.battle.covers=[{target:'actor:sera',sourceActor:'ada',remaining:1}];
  g.dispatch({type:'battle',action:'skill',skill:'guard',target:'ada'});
  assert.ok(g.feedback.events.filter(e=>e.source?.key.startsWith('enemy:')).every(e=>e.targets[0].key==='actor:ada'));
  const h=newGame();h.startBattle('wild_waterwheel_beaver',{win:[],lose:[],escape:[]});h.state.battle.enemies[0].hp=1;
  h.dispatch({type:'battle',action:'skill',skill:'attack',target:'enemy_0'});
  const hit=h.feedback.events.find(e=>e.targets[0]?.damage);assert.ok(hit.targets[0].damage>1);assert.equal(hit.targets[0].image,'monster_waterwheel_beaver');assert.equal(h.state.battle,null);
  assert.equal(JSON.parse(h.save()).state.feedback,undefined);
});

test('physical patterns, direction flags and cue timing are validated',()=>{
  for(const mutate of [d=>d.effects.strike_slash.tracks[0].pattern='script',d=>d.effects.strike_pierce.tracks[0].color='url(x)',d=>d.effects.recoil_blunt.tracks[0].directed='yes',d=>d.presentation.cues.attack.battle.impact=-1,d=>d.presentation.cues.attack.battle.anticipation='missing']){
    const d=structuredClone(data);mutate(d);assert.ok(validatePresentation(d).length);
  }
  const e=data.effects.recoil_blunt,[a,b]=e.tracks[0].frames.slice(1,3);
  assert.equal(Math.round((b.at-a.at)*e.duration),50);assert.deepEqual({...a,at:0},{...b,at:0});
});

function renderer(t){
  t.mock.timers.enable({apis:['setTimeout']});const dom=installDOM(),animations=[];
  const proto=Object.getPrototypeOf(dom.root);proto.animate=function(frames,options){
    let resolve;const finished=new Promise(r=>resolve=r);const a={element:this,frames,options,finished,cancel(){this.cancelled=true;resolve();}};animations.push(a);return a;
  };
  const img=dom.document.createElement('img');img.dataset.fx='enemy:enemy_0';img.src='enemy.png';dom.root.append(img);
  const fx=new EffectsRenderer(dom.root),model={effects:data.effects,effectAssets:{},feedback:{session:1,revision:1,events:[{at:130,effects:['strike_slash','recoil_slash'],targets:[{key:'enemy:enemy_0',damage:24}]}]}};
  t.after(()=>{fx.destroy();dom.restore();});return {...dom,fx,model,img,animations};
}

test('renderer starts the mark, recoil and number together; rerender cancels pending impacts without replay',t=>{
  const c=renderer(t);c.fx.present(c.model);t.mock.timers.tick(129);assert.equal(c.animations.length,0);
  t.mock.timers.tick(1);assert.equal(c.document.body.querySelectorAll('.fx-strike').length,1);assert.equal(c.document.body.querySelector('.fx-damage').textContent,'24');assert.equal(c.img.style.visibility,'hidden');
  c.fx.present(c.model);assert.equal(c.document.body.querySelectorAll('.fx-damage').length,1);
  c.fx.capture();assert.equal(c.document.body.querySelectorAll('.fx-overlay').length,0);assert.notEqual(c.img.style.visibility,'hidden');
  c.model.feedback.revision++;c.fx.present(c.model);c.fx.capture();t.mock.timers.tick(1000);assert.equal(c.document.body.querySelectorAll('.fx-overlay').length,0);assert.equal(c.fx.numbers.size,0);
});

test('new motion replaces a previous recoil; damage numbers stack and all overlays clean up',t=>{
  const c=renderer(t);c.fx.present(c.model);t.mock.timers.tick(130);
  c.fx.play(data.effects.enemy_advance,{key:'enemy:enemy_0'},{},'full');
  assert.equal(c.document.body.querySelectorAll('.fx-ghost').length,1);
  c.fx.damage({key:'enemy:enemy_0',damage:12},'full');const numbers=c.document.body.querySelectorAll('.fx-damage');assert.equal(numbers.length,2);assert.notEqual(numbers[0].style.top,numbers[1].style.top);
  c.fx.stop();assert.equal(c.fx.motions.size,0);assert.equal(c.fx.numbers.size,0);assert.notEqual(c.img.style.visibility,'hidden');
});

test('reduced mode retains a still damage number; off mode shows no effects; hidden portraits use visible cards',t=>{
  const c=renderer(t),card=c.document.createElement('button');card.dataset.fxFallback='enemy:enemy_0';c.root.append(card);c.img.getBoundingClientRect=()=>({left:0,top:0,width:0,height:0});
  assert.equal(c.fx.anchor({key:'enemy:enemy_0',image:'enemy.png'}).element,card);
  c.fx.present(c.model,'reduced');t.mock.timers.tick(130);assert.equal(c.document.body.querySelectorAll('.fx-strike').length,0);
  const number=c.animations.find(a=>a.element.className.includes('fx-damage'));assert.ok(number);assert.ok(number.frames.every(f=>f.transform===undefined));
  c.fx.capture();c.model.feedback.revision++;c.fx.present(c.model,'off');t.mock.timers.tick(130);assert.equal(c.document.body.querySelectorAll('.fx-overlay').length,0);
});
