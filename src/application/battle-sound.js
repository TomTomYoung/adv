import {battleAccent} from '../battle-accent.js';

// A quiet transient/body/tail layer under the recorded SE. No game RNG or state.
const tone=(frequency,end,duration,gain,delay=0,type='sine')=>({type,frequency,end,duration,gain,delay});
const noise=(frequency,duration,gain,delay=0)=>({type:'noise',frequency,duration,gain,delay});
export function battleSoundVoices(kind){
  switch(kind){
    case 'swing':return [noise(1900,.09,.035)];
    case 'bow':return [tone(310,120,.09,.055,0,'triangle')];
    case 'slash':return [noise(3200,.075,.10),tone(170,65,.13,.075)];
    case 'pierce':return [noise(4700,.055,.085),tone(980,350,.10,.055,0,'triangle')];
    case 'heavy':return [tone(135,42,.24,.16),noise(850,.13,.10),tone(68,38,.20,.055,.035)];
    case 'critical':return [noise(3900,.09,.13),tone(190,48,.24,.14),tone(1760,880,.17,.045,.015,'triangle')];
    case 'guard':return [tone(880,820,.16,.07,0,'triangle'),tone(1320,1220,.13,.035),noise(4800,.035,.045)];
    case 'heal':return [tone(660,660,.22,.045),tone(880,880,.22,.04,.055),tone(1320,1320,.26,.035,.11)];
    case 'fire':return [noise(650,.24,.13),tone(115,40,.24,.09)];
    case 'ice':return [tone(1480,720,.18,.055,0,'triangle'),tone(2220,1100,.15,.035,.025),noise(5900,.07,.06)];
    case 'lightning':return [noise(4200,.055,.11),tone(110,45,.16,.09),noise(3200,.045,.055,.045)];
    case 'defeat':return [noise(650,.32,.065),tone(100,28,.32,.08)];
    default:return [];
  }
}

export class BattleSound {
  constructor({createContext=()=>{const Context=globalThis.AudioContext??globalThis.webkitAudioContext;return Context?new Context():null;}}={}){this.createContext=createContext;this.context=null;this.output=null;this.noise=null;this.voices=new Set();this.volume=0;}
  configure(enabled,volume){
    this.volume=enabled?Math.max(0,Math.min(1,volume)):0;
    if(this.volume&&!this.context){try{this.context=this.createContext();if(this.context){this.output=this.context.createGain();this.output.connect(this.context.destination);}}catch{this.context=null;}}
    if(this.output)this.output.gain.value=this.volume;
    if(!this.volume)this.stop();
    else if(this.context?.state==='suspended')this.context.resume().catch(()=>{});
  }
  noiseBuffer(){
    if(this.noise)return this.noise;
    const c=this.context,b=c.createBuffer(1,Math.ceil(c.sampleRate*.5),c.sampleRate),a=b.getChannelData(0);let seed=76431;
    for(let i=0;i<a.length;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;a[i]=seed/2147483648-1;}
    return this.noise=b;
  }
  play(event){
    if(!this.context||!this.volume)return;
    const c=this.context,plan=battleSoundVoices(battleAccent(event));
    for(const v of plan){
      while(this.voices.size>=24){const oldest=this.voices.values().next().value;oldest.stop();}
      const start=c.currentTime+v.delay,end=start+v.duration,source=v.type==='noise'?c.createBufferSource():c.createOscillator(),gain=c.createGain();let filter;
      if(v.type==='noise'){source.buffer=this.noiseBuffer();filter=c.createBiquadFilter();filter.type='bandpass';filter.frequency.value=v.frequency;filter.Q.value=.65;source.connect(filter);filter.connect(gain);}
      else{source.type=v.type;source.frequency.setValueAtTime(v.frequency,start);source.frequency.exponentialRampToValueAtTime(v.end,end);source.connect(gain);}
      gain.gain.setValueAtTime(.0001,start);gain.gain.linearRampToValueAtTime(v.gain,start+.004);gain.gain.exponentialRampToValueAtTime(.0001,end);gain.connect(this.output);
      let stopped=false;const voice={stop:()=>{if(stopped)return;stopped=true;try{source.stop();}catch{}source.disconnect();filter?.disconnect();gain.disconnect();this.voices.delete(voice);}};
      source.onended=voice.stop;this.voices.add(voice);source.start(start);source.stop(end+.005);
    }
  }
  stop(){for(const voice of [...this.voices])voice.stop();}
}
