import test from 'node:test';
import assert from 'node:assert/strict';
import {GameAudio} from '../src/application/audio.js';

class FakeAudio {
  constructor(url){this.url=url;this.paused=true;this.events=new Map();this.calls=0;}
  addEventListener(name,fn){this.events.set(name,fn);}
  pause(){this.paused=true;}
  play(){this.calls++;this.paused=false;return new Promise((resolve,reject)=>{this.resolve=resolve;this.reject=error=>{this.paused=true;reject(error);};});}
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const setup=()=>{const tracks=[];const player=new GameAudio({createAudio:url=>{const a=new FakeAudio(url);tracks.push(a);return a;}});return {player,tracks};};

for(const timing of ['before impact','during impact','after the sound ends']){
  test('skipping '+timing+' keeps exactly one contact sound through rapid commands',t=>{
    t.mock.timers.enable({apis:['setTimeout']});
    const {player,tracks}=setup();player.configure(true,.5,.4);
    const impact={phase:'impact',at:100,targets:[{damage:8}],sound:{url:'hit.wav',gain:.5}};
    const feedback={session:1,revision:1,decorated:true,events:[impact,{...impact,at:300}]};
    player.sync({feedback});
    if(timing!=='before impact')t.mock.timers.tick(100);
    if(timing==='after the sound ends')tracks[0].events.get('ended')();
    player.cancelFeedback({skip:true});
    player.cancelFeedback();player.sync({feedback});
    player.sync({feedback:{...feedback,revision:2,events:[]}});
    t.mock.timers.tick(1000);
    assert.deepEqual(tracks.map(a=>a.url),['hit.wav']);
    assert.equal(tracks[0].volume,.1);
    assert.equal(tracks[0].paused,timing==='after the sound ends');
    player.sync({feedback:{...feedback,session:2,events:[]}});
    assert.ok(tracks[0].paused);
  });
}

test('misses, non-attack effects and muted feedback add no impact on skip',t=>{
  t.mock.timers.enable({apis:['setTimeout']});
  const {player,tracks}=setup();player.configure(true,1);
  const events=[{missed:true},{healing:5}].map(target=>({phase:'impact',targets:[target],at:100,sound:{url:'other.wav'}}));
  const feedback={session:1,revision:1,decorated:true,events};
  player.sync({feedback});player.cancelFeedback({skip:true});
  player.sync({feedback:{...feedback,revision:2,events:[{...events[0],targets:[{damage:5}]}]}});
  player.configure(true,1,0);player.cancelFeedback({skip:true});t.mock.timers.tick(1000);
  assert.deepEqual(tracks,[]);
});

test('audio starts disabled, reports autoplay rejection and retries on user intent',async()=>{
  const {player,tracks}=setup();player.sync({music:'explore.ogg'});assert.equal(tracks[0].calls,0);assert.equal(player.label(),'音：切');
  player.configure(true,.5);player.sync({music:'explore.ogg'});assert.equal(player.label(),'音：読込中');player.sync({music:'explore.ogg'});assert.equal(tracks[0].calls,1);
  tracks[0].reject(Object.assign(new Error('gesture required'),{name:'NotAllowedError'}));await flush();assert.equal(player.label(),'音：再生待ち');player.sync({music:'explore.ogg'});assert.equal(tracks[0].calls,1);
  player.retry();tracks[0].resolve();await flush();assert.equal(player.label(),'音：再生中');assert.equal(tracks[0].loop,true);
  player.configure(true,0);assert.equal(player.label(),'音：消音');assert.equal(tracks[0].volume,0);
  player.configure(false,.5);assert.equal(player.label(),'音：切');assert.equal(tracks[0].paused,true);
});

test('stale playback promises cannot overwrite the current track or disabled state',async()=>{
  const {player,tracks}=setup();player.configure(true,.5);player.sync({music:'explore.ogg'});player.sync({music:'battle.ogg'});assert.equal(tracks[0].paused,true);
  tracks[1].resolve();await flush();tracks[0].reject(new Error('old request'));await flush();assert.equal(player.label(),'音：再生中');
  player.sync({music:'explore.ogg'});player.configure(false,.5);tracks[2].resolve();await flush();assert.equal(player.label(),'音：切');
  player.configure(true,.5);player.sync({music:'explore.ogg'});tracks[2].reject(new Error('decode failed'));await flush();assert.equal(player.label(),'音：再試行');
});

test('sound effects fire once per revision, follow volume, and stop when sound is disabled',async()=>{
  const {player,tracks}=setup();player.configure(true,.5);const model={music:null,se:{url:'step.ogg',revision:1}};player.sync(model);tracks[0].resolve();await flush();player.sync(model);assert.equal(tracks.length,1);
  player.configure(true,.2);assert.equal(tracks[0].volume,.2);player.sync({...model,se:{...model.se,revision:2}});assert.equal(tracks.length,2);player.configure(false,.2);assert.ok(tracks.every(a=>a.paused));assert.equal(player.effects.size,0);tracks[1].resolve();await flush();
});
