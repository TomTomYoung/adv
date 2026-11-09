import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {defaultPresentation as preset} from '../src/presentation-presets.js';
import {validatePresentationDesign,parsePresentationDesign,loadPresentationDesign,decorateFeedback,timelineEvents,feedbackDuration,cosmeticRandom,effectDuration} from '../src/presentation-design.js';
import {BattleSound,scheduleCurve} from '../src/application/battle-sound.js';
import {GameAudio} from '../src/application/audio.js';
import {particleFrames,trajectoryPoint} from '../src/view/battle-impact.js';
import {EffectsRenderer} from '../src/view/effects.js';
import {installDOM} from './view-dom.mjs';
const clone=()=>structuredClone(preset);
const event=(extra={})=>({phase:'impact',at:130,effects:['strike_blunt'],source:{key:'actor:ada'},targets:[{key:'enemy:enemy_0',damage:12,material:'metal'}],...extra});

test('external JSON and generated defaults agree; loader validates before returning',async()=>{
  const raw=await fs.readFile(new URL('../config/battle-presentation.json',import.meta.url),'utf8');assert.deepEqual(parsePresentationDesign(raw),preset);
  assert.deepEqual(await loadPresentationDesign('memory',{read:async()=>raw}),preset);
  await assert.rejects(loadPresentationDesign('memory',{read:async()=>'{"version":2}'}));
});
test('malformed curves, processors, repeats and references are rejected with paths',()=>{
  for(const change of [d=>d.version=2,d=>d.profiles.heavy.voices[0].envelope[1].at=0,d=>d.profiles.heavy.voices[0].pitch[0].value=0,d=>d.profiles.heavy.voices[0].filter={type:'magic',frequency:900,q:0},d=>d.profiles.heavy.voices[0].echo={delayMs:20,gain:9,taps:20},d=>d.timelines.heavy.tracks[0].profile='missing',d=>d.timelines.heavy.tracks[0].repeat=4,d=>d.timelines.heavy.tracks[0].intervalMs=-1,d=>d.particles.heavy.count=3000,d=>d.bindings.heavy='missing',d=>d.materialSprites.construct='missing',d=>d.profiles.heavy.voices[0].envelope=[null],d=>d.profiles.heavy.voices[0].oscillator='unknown']){
    const d=clone();change(d);const errors=validatePresentationDesign(d);assert.ok(errors.length);assert.ok(errors[0].includes(':'));assert.throws(()=>parsePresentationDesign(d));
  }
});
test('timeline expands bounded independent delays, repeats and source targets without mutation',()=>{
  const d=clone();d.timelines.test={name:'test',tracks:[{kind:'synth',atMs:20,profile:'heavy',target:'source',repeat:3,intervalMs:90},{kind:'particles',atMs:60,profile:'heavy',target:'target'}]};
  const before=JSON.stringify(d),events=timelineEvents(d,'test',event({at:100}));assert.deepEqual(events.map(e=>e.at),[120,160,210,300]);assert.equal(events[0].targets[0].key,'actor:ada');assert.equal(events[1].targets[0].key,'enemy:enemy_0');assert.equal(JSON.stringify(d),before);
});
test('area-hit audio is emitted once; particle kinds follow each target, including misses',()=>{
  const feedback={events:[event({targets:[{key:'enemy:enemy_0',damage:20,critical:true,material:'metal'},{key:'enemy:enemy_1',damage:10},{key:'enemy:enemy_2',missed:true}]})]},before=JSON.stringify(feedback),expanded=decorateFeedback(feedback,preset);
  assert.equal(expanded.events.filter(e=>e.synth==='critical').length,1);assert.equal(expanded.events.filter(e=>e.synth==='material_metal').length,1);
  assert.deepEqual(expanded.events.filter(e=>e.particles).map(e=>[e.particles,e.targets[0].key]),[['critical','enemy:enemy_0'],['heavy','enemy:enemy_1']]);
  assert.equal(JSON.stringify(feedback),before);assert.equal(decorateFeedback(expanded,preset),expanded);
});
test('completion includes echo/reverb tails and delayed visual tracks',()=>{
  const d=clone();d.profiles.heavy.voices[0].echo={delayMs:500,gain:.2,taps:4};
  const f={events:[{at:900,synth:'heavy',effects:[],targets:[],phase:'presentation'}]};assert.equal(feedbackDuration(f,d),3140);
  assert.equal(effectDuration({duration:100,tracks:[{atMs:300,durationMs:600}]}),900);
});
test('curve scheduling preserves multipoint steps, ramps and units',()=>{
  const calls=[],p={setValueAtTime:(...args)=>calls.push(['set',...args]),linearRampToValueAtTime:(...args)=>calls.push(['linear',...args]),exponentialRampToValueAtTime:(...args)=>calls.push(['exp',...args])};
  scheduleCurve(p,[{at:0,value:100},{at:.2,value:200},{at:.6,value:400,curve:'step'},{at:1,value:50,curve:'exponential'}],2,.5,{scale:2});
  assert.deepEqual(calls,[['set',200,2],['linear',400,2.1],['set',800,2.3],['exp',100,2.5]]);
});
function context(){
  const nodes=[],param=()=>({value:0,calls:[],setValueAtTime(...a){this.calls.push(['set',...a]);},linearRampToValueAtTime(...a){this.calls.push(['linear',...a]);},exponentialRampToValueAtTime(...a){this.calls.push(['exp',...a]);}});
  const node=kind=>{const n={kind,gain:param(),frequency:param(),Q:param(),detune:param(),pan:param(),delayTime:param(),connect(to){(this.connections??=[]).push(to);},disconnect(){this.disconnected=true;},start(at){this.started=at;},stop(at){this.stopped=at??'now';}};nodes.push(n);return n;};
  return {nodes,currentTime:0,sampleRate:1000,state:'running',destination:{},createGain:()=>node('gain'),createOscillator:()=>node('oscillator'),createBufferSource:()=>node('buffer'),createBiquadFilter:()=>node('filter'),createStereoPanner:()=>node('pan'),createDelay:()=>node('delay'),createConvolver:()=>node('reverb'),createWaveShaper:()=>node('distortion'),createBuffer:(_,length)=>({getChannelData:()=>new Float32Array(length)})};
}
test('processors create finite tails; stop disconnects every scheduled node and LFO',()=>{
  const d=clone(),v=d.profiles.charge.voices[0];v.reverb={durationMs:250,mix:.2};v.distortion=3;const c=context(),sound=new BattleSound({createContext:()=>c,design:d});sound.configure(true,.5);sound.play({synth:'charge',spatial:{pan:-.4,panEnd:.6,distance:1},variationSeed:123});
  for(const kind of ['filter','pan','delay','reverb','distortion'])assert.ok(c.nodes.some(n=>n.kind===kind),kind);
  assert.equal(c.nodes.filter(n=>n.kind==='oscillator').length,2);assert.ok(c.nodes.filter(n=>n.started!==undefined).every(n=>n.stopped<2));
  const p=c.nodes.find(n=>n.kind==='pan');assert.deepEqual(p.pan.calls,[['set',-.4,0],['linear',.6,.65]]);
  sound.stop();assert.equal(sound.voices.size,0);assert.ok(c.nodes.slice(1).every(n=>n.disconnected));
});
test('voice priority protects criticals, cooldown expires, and cosmetics are reproducible',()=>{
  const d=clone();d.mixer.maxSynthVoices=3;const c=context(),sound=new BattleSound({createContext:()=>c,design:d});sound.configure(true,1);
  assert.equal(sound.play({synth:'critical'}),true);assert.equal(sound.play({synth:'swing'}),false);assert.equal(sound.voices.size,3);sound.stop();
  assert.equal(sound.play({synth:'material_metal'}),true);assert.equal(sound.play({synth:'material_metal'}),false);c.currentTime=.04;assert.equal(sound.play({synth:'material_metal'}),true);
  const a=cosmeticRandom(17),b=cosmeticRandom(17),other=cosmeticRandom(18);assert.deepEqual(Array.from({length:10},a),Array.from({length:10},b));assert.notEqual(a(),other());
});
test('recorded SE priority evicts low-priority voices and cancellation disconnects media',()=>{
  const d=clone();d.mixer.maxRecordedVoices=2;const disconnected=[],sound=new GameAudio({design:d,battleSound:{configure(){},stop(){},connectMedia:a=>()=>disconnected.push(a.url)},createAudio:url=>({url,pause(){this.paused=true;},addEventListener(){},play:()=>Promise.resolve()})});sound.configure(true,1);
  sound.playEffect('critical',1,{priority:80});sound.playEffect('defeat',1,{priority:90});assert.equal(sound.playEffect('swing',1,{priority:10}),false);sound.playEffect('final',1,{priority:100});assert.deepEqual(disconnected,['critical']);sound.stopEffects();assert.equal(disconnected.length,3);
});
test('skip cancels every repeated timeline sound and pending particle',t=>{
  t.mock.timers.enable({apis:['setTimeout']});const dom=installDOM();const fx=new EffectsRenderer(dom.root),played=[];t.after(()=>{fx.destroy();dom.restore();});const audio=new GameAudio({battleSound:{configure(){},play:e=>played.push(e.synth),stop(){}}});audio.configure(true,1);
  const f={session:1,revision:1,decorated:true,events:timelineEvents(preset,'beam_demo',{source:{key:'actor:ada'},targets:[{key:'enemy:enemy_0'}]})},model={feedback:f,effects:{},effectAssets:{}};
  fx.present(model);audio.sync(model);fx.stop();audio.stopEffects();const count=played.length;t.mock.timers.tick(2000);assert.equal(played.length,count);assert.equal(dom.document.body.querySelectorAll('.fx-overlay').length,0);assert.equal(fx.timers.size,0);assert.equal(audio.effectTimers.size,0);
});
test('particle curves include gravity, size and fade; curved trajectories land at target',()=>{
  const profile=structuredClone(preset.particles.defeat),a=particleFrames(profile,0,42),b=particleFrames(profile,0,42);assert.deepEqual(a,b);assert.equal(a[0].opacity,0);assert.equal(a.at(-1).opacity,0);assert.ok(a.at(-1).transform.includes('scale(0.2)'));
  assert.deepEqual(trajectoryPoint(300,20,-80,0).x,0);assert.equal(trajectoryPoint(300,20,-80,1).x,300);assert.equal(trajectoryPoint(300,20,-80,1).y,20);assert.equal(trajectoryPoint(300,20,-80,.5).y,-70);
});
