// Browser audio adapter; the game and the view exchange only data and labels.
import {feedbackDelay} from '../feedback-timing.js';
import {battleAccent} from '../battle-accent.js';
import {BattleSound} from './battle-sound.js';
import {defaultPresentation} from '../presentation-presets.js';
import {decorateFeedback,parsePresentationDesign} from '../presentation-design.js';
export class GameAudio {
  constructor({createAudio=url=>new Audio(url),onChange=()=>{},schedule=(fn,delay)=>setTimeout(fn,delay),cancel=id=>clearTimeout(id),battleSound=new BattleSound(),locate=()=>null,design=defaultPresentation}={}){
    this.design=design;this.locate=locate;this.effectMeta=new WeakMap();this.lastRecorded=new Map();this.battleSound=battleSound;this.duck=1;this.duckTimers=new Set();
    this.schedule=schedule;this.cancel=cancel;this.effectTimers=new Set();this.effectGains=new WeakMap();this.seVolume=1;this.feedbackKey=null;this.preloaded=new Map();this.createAudio=createAudio;this.onChange=onChange;this.enabled=false;this.volume=.5;this.music=null;this.audio=null;this.pending=null;this.generation=0;this.state='off';this.effectKey=null;this.effects=new Set();
  }
  setDesign(design){const next=parsePresentationDesign(design);this.stopEffects();this.design=next;this.battleSound?.setDesign?.(next);this.feedbackKey=null;}
  setState(state){if(this.state!==state){this.state=state;this.onChange(this.label());}}
  label(){if(!this.enabled)return '音：切';if(this.volume===0)return '音：消音';return {off:'音：待機',loading:'音：読込中',playing:'音：再生中',blocked:'音：再生待ち',error:'音：再試行'}[this.state];}
  configure(enabled,volume,seVolume=this.seVolume){
    this.seVolume=Math.max(0,Math.min(1,Number.isFinite(seVolume)?seVolume:1));
    this.enabled=Boolean(enabled);this.volume=Math.max(0,Math.min(1,Number.isFinite(volume)?volume:.5));
    if(this.audio)this.audio.volume=this.volume*this.duck;
    this.battleSound?.configure(this.enabled,this.volume*this.seVolume);
    for(const effect of this.effects)effect.volume=Math.max(0,Math.min(1,this.volume*this.seVolume*(this.effectGains.get(effect)??1)));
    if(!this.enabled){this.generation++;this.audio?.pause();this.pending=null;this.stopEffects();this.setState('off');}
    if(!this.volume||!this.seVolume)this.stopEffects();
    this.onChange(this.label());
  }
  sync(model){
    model={...model,feedback:decorateFeedback(model.feedback,this.design,{sounds:model.sounds,soundAssets:model.soundAssets})};
    if(model.feedback){
      const key=`${model.feedback.session}/${model.feedback.revision}`;
      if(key!==this.feedbackKey){this.feedbackKey=key;this.stopEffects();
        if(this.enabled&&this.volume>0&&this.seVolume>0)for(const event of model.feedback.events){
          const accent=battleAccent(event),profile=this.design.profiles[event.synth??accent];if(!event.sound?.url&&!event.synth)continue;
          const play=()=>{
            const target=event.targets?.find(t=>!t.missed&&(t.damage>0||t.healing>0||t.guarded))??event.targets?.[0];
            let spatial=event.spatial??(target?this.locate(target):null)??{};
            if(event.originalPhase==='flight'&&event.source){const from=this.locate(event.source);if(from)spatial={...spatial,pan:from.pan,panEnd:spatial.pan};}
            const priority=event.priority??profile?.priority??40;
            if(event.sound?.url)this.playEffect(event.sound.url,event.sound.gain??1,{priority,spatial,cooldownMs:event.cooldownMs??0});
            if(event.synth)this.battleSound?.play({...event,phase:event.originalPhase??event.phase,spatial});
            if(['heavy','critical','defeat'].includes(accent)||priority>=this.design.mixer.duckPriority)this.duckMusic();
          },delay=feedbackDelay(model.feedback,event.at);
          if(delay>0){let timer;timer=this.schedule(()=>{this.effectTimers.delete(timer);play();},delay);this.effectTimers.add(timer);}else play();
        }
      }
    }else{
      const key=model.se?`${model.se.url}/${model.se.revision}`:null;
      if(key!==this.effectKey){this.effectKey=key;if(model.se?.url)this.playEffect(model.se.url);}
    }
    if(model.music!==this.music){
      this.generation++;this.audio?.pause();this.pending=null;this.music=model.music;this.audio=model.music?this.createAudio(model.music):null;
      if(this.audio){const audio=this.audio;audio.loop=true;audio.preload='auto';audio.volume=this.volume*this.duck;audio.addEventListener('playing',()=>{if(this.audio===audio&&this.enabled)this.setState('playing');});audio.addEventListener('error',()=>{if(this.audio===audio&&this.enabled)this.setState('error');});}
      this.setState('off');
    }
    if(this.enabled&&this.audio?.paused&&!this.pending&&!['blocked','error'].includes(this.state))this.play();
  }
  preload(urls){for(const url of urls)if(!this.preloaded.has(url)){const audio=this.createAudio(url);audio.preload='auto';this.preloaded.set(url,audio);}}
  stopEffects(){this.lastRecorded.clear();for(const timer of this.effectTimers)this.cancel(timer);this.effectTimers.clear();for(const effect of [...this.effects])this.finishEffect(effect);this.battleSound?.stop();for(const timer of this.duckTimers)this.cancel(timer);this.duckTimers.clear();this.duck=1;if(this.audio)this.audio.volume=this.volume;}
  duckMusic(){
    if(!this.enabled||!this.volume||!this.seVolume)return;
    for(const timer of this.duckTimers)this.cancel(timer);this.duckTimers.clear();this.duck=this.design.mixer.duckGain;if(this.audio)this.audio.volume=this.volume*this.duck;
    const mixer=this.design.mixer;
    for(let i=0;i<4;i++){const level=mixer.duckGain+(1-mixer.duckGain)*(i+1)/4;let timer;timer=this.schedule(()=>{this.duckTimers.delete(timer);this.duck=level;if(this.audio)this.audio.volume=this.volume*level;},mixer.duckHoldMs+i*mixer.duckReleaseMs/3);this.duckTimers.add(timer);}
  }
  finishEffect(effect){effect.pause();this.effectMeta.get(effect)?.disconnect?.();this.effectMeta.delete(effect);this.effects.delete(effect);}
  playEffect(url,gain=1,{priority=40,spatial={},cooldownMs=0}={}){
    if(!this.enabled||this.volume===0||this.seVolume===0)return false;
    const now=performance.now();if(now-(this.lastRecorded.get(url)??-Infinity)<cooldownMs)return false;
    while(this.effects.size>=this.design.mixer.maxRecordedVoices){const victim=[...this.effects].sort((a,b)=>(this.effectMeta.get(a)?.priority??40)-(this.effectMeta.get(b)?.priority??40))[0];if((this.effectMeta.get(victim)?.priority??40)>priority)return false;this.finishEffect(victim);}
    this.lastRecorded.set(url,now);const effect=this.createAudio(url);this.effectGains.set(effect,gain);effect.volume=Math.max(0,Math.min(1,this.volume*this.seVolume*gain));this.effects.add(effect);
    this.effectMeta.set(effect,{priority,disconnect:this.battleSound?.connectMedia?.(effect,spatial)});
    const done=()=>this.finishEffect(effect);effect.addEventListener('ended',done,{once:true});effect.addEventListener('error',done,{once:true});effect.play().catch(done);return true;
  }
  play(){
    if(!this.enabled||!this.audio||this.pending)return;
    const audio=this.audio,generation=++this.generation;this.setState('loading');
    const promise=audio.play();this.pending=promise;
    promise.then(()=>{if(this.generation===generation&&this.enabled)this.setState('playing');}).catch(error=>{if(this.generation!==generation||!this.enabled)return;this.setState(error.name==='NotAllowedError'?'blocked':'error');}).finally(()=>{if(this.pending===promise)this.pending=null;});
  }
  retry(){this.setState('off');this.play();}
}
