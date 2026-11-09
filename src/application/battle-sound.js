import {battleAccent} from '../battle-accent.js';
import {defaultPresentation} from '../presentation-presets.js';
import {cosmeticRandom,parsePresentationDesign,voiceDuration} from '../presentation-design.js';

// Compatibility helper for the original preset consumers; editable source is JSON.
export function battleSoundVoices(kind){return (defaultPresentation.profiles[kind]?.voices??[]).map(v=>({type:v.wave,frequency:v.pitch[0].value,end:v.pitch.at(-1).value,duration:v.durationMs/1000,gain:v.gain,delay:v.atMs/1000}));}
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
export function scheduleCurve(param,points,start,duration,{scale=1,floor=0}={}){
  for(const [i,p] of points.entries()){
    const value=Math.max(floor,p.value*scale),at=start+p.at*duration;
    if(i===0||p.curve==='step')param.setValueAtTime(value,at);
    else if(p.curve==='exponential')param.exponentialRampToValueAtTime(Math.max(.0001,value),at);
    else param.linearRampToValueAtTime(value,at);
  }
}
export class BattleSound {
  constructor({createContext=()=>{const Context=globalThis.AudioContext??globalThis.webkitAudioContext;return Context?new Context():null;},design=defaultPresentation}={}){
    this.createContext=createContext;this.design=design;this.context=null;this.output=null;this.limiter=null;this.noise=null;this.voices=new Set();this.volume=0;this.serial=0;this.last=new Map();this.impulses=new Map();
  }
  setDesign(design){const next=parsePresentationDesign(design);this.stop();this.design=next;this.updateMixer();}
  updateMixer(){if(this.limiter)for(const [key,value] of Object.entries(this.design.mixer.compressor))this.limiter[key].value=value;}
  configure(enabled,volume){
    this.volume=enabled?clamp(Number.isFinite(volume)?volume:0,0,1):0;
    if(this.volume&&!this.context){try{this.context=this.createContext();if(this.context){this.output=this.context.createGain();this.limiter=this.context.createDynamicsCompressor?.()??null;this.output.connect(this.limiter??this.context.destination);if(this.limiter){this.limiter.connect(this.context.destination);this.updateMixer();}}}catch{this.context=null;this.output=null;this.limiter=null;}}
    if(this.output)this.output.gain.value=this.volume;
    if(!this.volume)this.stop();else if(this.context?.state==='suspended')this.context.resume().catch(()=>{});
  }
  noiseBuffer(){
    if(this.noise)return this.noise;const c=this.context,b=c.createBuffer(1,Math.ceil(c.sampleRate*.5),c.sampleRate),a=b.getChannelData(0),random=cosmeticRandom('noise');
    for(let i=0;i<a.length;i++)a[i]=random()*2-1;return this.noise=b;
  }
  impulse(durationMs){
    if(this.impulses.has(durationMs))return this.impulses.get(durationMs);
    const c=this.context,length=Math.ceil(c.sampleRate*durationMs/1000),b=c.createBuffer(2,length,c.sampleRate),random=cosmeticRandom('reverb:'+durationMs);
    for(let channel=0;channel<2;channel++){const a=b.getChannelData(channel);for(let i=0;i<length;i++)a[i]=(random()*2-1)*(1-i/length)**3;}
    if(this.impulses.size>=4)this.impulses.delete(this.impulses.keys().next().value);this.impulses.set(durationMs,b);return b;
  }
  // HTML SE already carry master × SE volume; route directly into the shared SE limiter.
  connectMedia(element,spatial={}){
    const c=this.context;if(!c?.createMediaElementSource)return null;
    let source,panner,gain;
    try{source=c.createMediaElementSource(element);gain=c.createGain();gain.gain.value=1/(1+clamp(spatial.distance??0,0,10));source.connect(gain);
      panner=c.createStereoPanner?.();if(panner){panner.pan.value=clamp(spatial.pan??0,-1,1);gain.connect(panner);panner.connect(this.limiter??c.destination);}else gain.connect(this.limiter??c.destination);
      return ()=>{source.disconnect();panner?.disconnect();gain.disconnect();};
    }catch{source?.disconnect();gain?.disconnect();panner?.disconnect();return null;}
  }
  play(event){
    if(!this.context||!this.volume)return false;
    const kind=Object.hasOwn(event,'synth')?event.synth:battleAccent(event),profile=this.design.profiles[kind];if(!profile)return false;
    const c=this.context,now=c.currentTime,last=this.last.get(kind);
    if(last!==undefined&&(now-last)*1000<profile.cooldownMs)return false;
    const random=cosmeticRandom(event.variationSeed??`${kind}:${++this.serial}`),variants=[profile.voices,...profile.variants??[]],plan=variants[Math.floor(random()*variants.length)],priority=event.priority??profile.priority,limit=this.design.mixer.maxSynthVoices;
    if(plan.length>limit)return false;
    const victims=[...this.voices].sort((a,b)=>a.priority-b.priority),need=Math.max(0,this.voices.size+plan.length-limit);
    if(victims.slice(0,need).some(v=>v.priority>priority))return false;
    for(const v of victims.slice(0,need))v.stop();this.last.set(kind,now);
    const pitchScale=2**(((random()*2-1)*(profile.variation?.cents??0))/1200),gainScale=1+(random()*2-1)*(profile.variation?.gain??0);
    for(const v of plan)this.playVoice(v,event,priority,pitchScale,gainScale);
    return true;
  }
  playVoice(v,event,priority,pitchScale,gainScale){
    const c=this.context,start=c.currentTime+v.atMs/1000,duration=v.durationMs/1000,end=start+duration,finish=c.currentTime+voiceDuration(v)/1000+.008,nodes=[],sources=[];
    const keep=node=>{nodes.push(node);return node;},source=keep(v.wave==='noise'?c.createBufferSource():c.createOscillator());sources.push(source);
    let tail=source;
    if(v.wave==='noise'){source.buffer=this.noiseBuffer();source.loop=true;}
    else{source.type=v.wave;scheduleCurve(source.frequency,v.pitch,start,duration,{scale:pitchScale,floor:20});
      if(v.vibrato&&source.detune){const lfo=keep(c.createOscillator()),depth=keep(c.createGain());sources.push(lfo);lfo.frequency.value=v.vibrato.hz;depth.gain.value=v.vibrato.cents;lfo.connect(depth);depth.connect(source.detune);lfo.start(start);lfo.stop(finish);}
    }
    const spec=v.filter??(v.wave==='noise'?{type:'bandpass',frequency:v.pitch[0].value,q:.65}:null);
    if(spec){const f=keep(c.createBiquadFilter());f.type=spec.type;f.Q.value=spec.q;if(f.gain)f.gain.value=spec.gain??0;
      scheduleCurve(f.frequency,spec.cutoff??(!v.filter&&v.wave==='noise'?v.pitch:[{at:0,value:spec.frequency},{at:1,value:spec.frequency}]),start,duration,{floor:20});tail.connect(f);tail=f;
    }
    if(v.distortion&&c.createWaveShaper){const shaper=keep(c.createWaveShaper()),curve=new Float32Array(1024),k=v.distortion;for(let i=0;i<curve.length;i++){const x=i*2/(curve.length-1)-1;curve[i]=(1+k)*x/(1+k*Math.abs(x));}shaper.curve=curve;shaper.oversample='2x';tail.connect(shaper);tail=shaper;}
    const envelope=keep(c.createGain());tail.connect(envelope);scheduleCurve(envelope.gain,v.envelope,start,duration,{scale:v.gain*gainScale,floor:.0001});envelope.gain.setValueAtTime(0,end+.002);
    const mix=keep(c.createGain());envelope.connect(mix);
    if(v.echo&&c.createDelay)for(let tap=1;tap<=v.echo.taps;tap++){const delay=keep(c.createDelay(4)),gain=keep(c.createGain());delay.delayTime.value=v.echo.delayMs*tap/1000;gain.gain.value=v.echo.gain**tap;envelope.connect(delay);delay.connect(gain);gain.connect(mix);}
    if(v.reverb&&c.createConvolver){const reverb=keep(c.createConvolver()),wet=keep(c.createGain());reverb.buffer=this.impulse(v.reverb.durationMs);wet.gain.value=v.reverb.mix;envelope.connect(reverb);reverb.connect(wet);wet.connect(mix);}
    const spatial=event.spatial??{},pan=clamp((spatial.pan??0)+(v.pan??0),-1,1);mix.gain.value=1/(1+clamp((spatial.distance??0)+(v.distance??0),0,10));
    const panner=c.createStereoPanner?.();if(panner){keep(panner);panner.pan.setValueAtTime(pan,start);if(spatial.panEnd!==undefined)panner.pan.linearRampToValueAtTime(clamp(spatial.panEnd,-1,1),end);mix.connect(panner);panner.connect(this.output);}else mix.connect(this.output);
    let stopped=false;const voice={priority,stop:()=>{if(stopped)return;stopped=true;for(const s of sources){try{s.stop();}catch{}}for(const n of nodes)n.disconnect();this.voices.delete(voice);}};
    source.onended=voice.stop;this.voices.add(voice);source.start(start);source.stop(finish);
  }
  stop(){for(const voice of [...this.voices])voice.stop();this.last.clear();}
}
