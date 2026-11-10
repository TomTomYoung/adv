import test from 'node:test';
import assert from 'node:assert/strict';
import {battleAccent} from '../src/battle-accent.js';
import {BattleSound} from '../src/application/battle-sound.js';
import {GameAudio} from '../src/application/audio.js';
import {EffectsRenderer} from '../src/view/effects.js';
import {installDOM} from './view-dom.mjs';

const hit=(extra={},effects=['strike_slash'])=>({phase:'impact',at:130,effects,targets:[{key:'enemy:enemy_0',damage:12,...extra}],sound:{url:'slash.ogg',gain:.7}});
test('accents distinguish hit results; a missed or harmless event has no impact sound',()=>{
  assert.equal(battleAccent(hit()),'slash');assert.equal(battleAccent(hit({},['strike_blunt'])),'heavy');
  assert.equal(battleAccent(hit({critical:true})),'critical');assert.equal(battleAccent(hit({guarded:true,damage:0})),'guard');
  assert.equal(battleAccent(hit({healing:8,damage:0})),'heal');assert.equal(battleAccent(hit({missed:true,critical:true})) ,null);
  assert.equal(battleAccent(hit({damage:0})),null);assert.equal(battleAccent({effects:['strike_slash'],targets:[{damage:12}]}),null);
  const e=hit({missed:true});e.targets.push({damage:12,critical:true});assert.equal(battleAccent(e),'critical');
});

function fakeContext(){
  const nodes=[],param=()=>({value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}});
  const node=()=>{const n={gain:param(),frequency:param(),Q:param(),connect(){},disconnect(){this.disconnected=true;},start(at){this.started=at;},stop(at){this.stopped=at??'now';}};nodes.push(n);return n;};
  return {nodes,state:'running',currentTime:1,sampleRate:1000,destination:{},createGain:node,createOscillator:node,createBufferSource:node,createBiquadFilter:node,createBuffer:(_,length)=>({getChannelData:()=>new Float32Array(length)})};
}
test('synth is lazy, bounded, adjustable and cancels both ringing and delayed notes',()=>{
  let calls=0;const context=fakeContext(),s=new BattleSound({createContext:()=>{calls++;return context;}});
  s.configure(false,1);assert.equal(calls,0);s.configure(true,.4);assert.equal(calls,1);
  const event=hit({healing:12,damage:0}),before=JSON.stringify(event);s.play(event);assert.equal(s.voices.size,3);assert.equal(s.output.gain.value,.4);
  assert.ok(context.nodes.some(n=>n.started>context.currentTime));assert.equal(JSON.stringify(event),before);
  s.configure(true,.2);assert.equal(s.output.gain.value,.2);
  for(let i=0;i<12;i++)s.play(hit({critical:true}));assert.equal(s.voices.size,24);
  s.stop();assert.equal(s.voices.size,0);assert.ok(context.nodes.filter(n=>n.started!==undefined).every(n=>n.disconnected));
  s.play(hit());s.configure(false,1);assert.equal(s.voices.size,0);assert.equal(s.output.gain.value,0);
});
test('unavailable Web Audio preserves recorded-sound operation',()=>{
  const s=new BattleSound({createContext:()=>{throw Error('unavailable');}});assert.doesNotThrow(()=>{s.configure(true,1);s.play(hit());s.stop();});assert.equal(s.context,null);
});
test('layered SE shares the impact deadline; skip cancels it and restores ducked BGM',t=>{
  t.mock.timers.enable({apis:['setTimeout']});const calls=[],tracks=[];
  const synth={configure(){},play:e=>calls.push(e.phase),stop(){}};
  const a=new GameAudio({battleSound:synth,createAudio:url=>{const n={url,paused:true,addEventListener(){},pause(){this.paused=true;},play(){this.paused=false;return Promise.resolve();}};tracks.push(n);return n;}});
  a.configure(true,.5,.8);const model={music:'battle.ogg',feedback:{session:1,revision:1,events:[hit({critical:true})]}};a.sync(model);
  t.mock.timers.tick(129);assert.equal(calls.length,0);assert.equal(a.audio.volume,.5);
  t.mock.timers.tick(1);assert.deepEqual(calls,['impact']);assert.equal(a.audio.volume,.32);assert.ok(Math.abs(tracks.at(-1).volume-.28)<1e-10);
  a.sync(model);assert.equal(calls.length,1);t.mock.timers.tick(190);assert.equal(a.audio.volume,.5);
  a.sync({...model,feedback:{...model.feedback,revision:2}});a.stopEffects();t.mock.timers.tick(1000);assert.equal(calls.length,1);assert.equal(a.duckTimers.size,0);assert.equal(a.audio.volume,.5);
  a.sync({...model,feedback:{...model.feedback,revision:3}});a.configure(false,.5,.8);t.mock.timers.tick(1000);assert.equal(calls.length,1);assert.ok(tracks.every(n=>n.paused));
});
test('critical, healing and defeat particles remain local and stop on skip or reduced motion',t=>{
  const dom=installDOM(),animations=[];Object.getPrototypeOf(dom.root).animate=function(frames){const a={frames,finished:Promise.resolve(),cancel(){}};animations.push(a);return a;};
  const img=dom.document.createElement('img');img.dataset.fx='enemy:enemy_0';img.src='enemy.png';dom.root.append(img);
  const fx=new EffectsRenderer(dom.root);t.after(()=>{fx.destroy();dom.restore();});let revision=0;
  const present=(event,mode='full')=>fx.present({effects:{},effectAssets:{},feedback:{session:1,revision:++revision,events:[{...event,at:0}]}},mode);
  present(hit({critical:true}));assert.equal(dom.document.body.querySelectorAll('.fx-impact-particle').length,10);assert.equal(dom.document.body.querySelectorAll('.fx-impact-ring').length,1);
  fx.stop();assert.equal(dom.document.body.querySelectorAll('.fx-overlay').length,0);
  present(hit({healing:9,damage:0}));assert.equal(dom.document.body.querySelectorAll('.fx-accent-heal').length,9);fx.stop();
  present({...hit(),phase:'defeat'});assert.equal(dom.document.body.querySelectorAll('.fx-accent-defeat').length,8);fx.stop();
  present(hit({critical:true}),'reduced');assert.equal(dom.document.body.querySelectorAll('.fx-impact-particle').length,0);fx.stop();
  present(hit({critical:true}),'off');assert.equal(dom.document.body.querySelectorAll('.fx-overlay').length,0);
});
