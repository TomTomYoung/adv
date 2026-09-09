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
