// Browser audio adapter; the game and the view exchange only data and labels.
import {feedbackDelay} from '../feedback-timing.js';
import {battleAccent} from '../battle-accent.js';
import {BattleSound} from './battle-sound.js';
export class GameAudio {
  constructor({createAudio=url=>new Audio(url),onChange=()=>{},schedule=(fn,delay)=>setTimeout(fn,delay),cancel=id=>clearTimeout(id),battleSound=new BattleSound()}={}){
    this.battleSound=battleSound;this.duck=1;this.duckTimers=new Set();
    this.schedule=schedule;this.cancel=cancel;this.effectTimers=new Set();this.effectGains=new WeakMap();this.seVolume=1;this.feedbackKey=null;this.preloaded=new Map();this.createAudio=createAudio;this.onChange=onChange;this.enabled=false;this.volume=.5;this.music=null;this.audio=null;this.pending=null;this.generation=0;this.state='off';this.effectKey=null;this.effects=new Set();
  }
  setState(state){if(this.state!==state){this.state=state;this.onChange(this.label());}}
  label(){if(!this.enabled)return '音：切';if(this.volume===0)return '音：消音';return {off:'音：待機',loading:'音：読込中',playing:'音：再生中',blocked:'音：再生待ち',error:'音：再試行'}[this.state];}
  configure(enabled,volume,seVolume=this.seVolume){
    this.seVolume=Math.max(0,Math.min(1,Number.isFinite(seVolume)?seVolume:1));
    this.enabled=Boolean(enabled);this.volume=Math.max(0,Math.min(1,Number.isFinite(volume)?volume:.5));
    if(this.audio)this.audio.volume=this.volume*this.duck;
    this.battleSound?.configure(this.enabled,this.volume*this.seVolume);
    for(const effect of this.effects)effect.volume=Math.max(0,Math.min(1,this.volume*this.seVolume*(this.effectGains.get(effect)??1)));
    if(!this.enabled){this.generation++;this.audio?.pause();this.pending=null;this.stopEffects();this.setState('off');}
    this.onChange(this.label());
  }
  sync(model){
    if(model.feedback){
      const key=`${model.feedback.session}/${model.feedback.revision}`;
      if(key!==this.feedbackKey){this.feedbackKey=key;this.stopEffects();
        if(this.enabled&&this.volume>0&&this.seVolume>0)for(const event of model.feedback.events){
          const accent=battleAccent(event);if(!event.sound?.url&&!accent)continue;
          const play=()=>{if(event.sound?.url)this.playEffect(event.sound.url,event.sound.gain??1);this.battleSound?.play(event);if(['heavy','critical','defeat'].includes(accent))this.duckMusic();},delay=feedbackDelay(model.feedback,event.at);
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
  stopEffects(){for(const timer of this.effectTimers)this.cancel(timer);this.effectTimers.clear();for(const effect of this.effects)effect.pause();this.effects.clear();this.battleSound?.stop();for(const timer of this.duckTimers)this.cancel(timer);this.duckTimers.clear();this.duck=1;if(this.audio)this.audio.volume=this.volume;}
  duckMusic(){
    if(!this.enabled||!this.volume||!this.seVolume)return;
    for(const timer of this.duckTimers)this.cancel(timer);this.duckTimers.clear();this.duck=.64;if(this.audio)this.audio.volume=this.volume*this.duck;
    for(const [i,level] of [.72,.84,.94,1].entries()){let timer;timer=this.schedule(()=>{this.duckTimers.delete(timer);this.duck=level;if(this.audio)this.audio.volume=this.volume*level;},70+i*40);this.duckTimers.add(timer);}
  }
  playEffect(url,gain=1){
    if(!this.enabled||this.volume===0||this.seVolume===0)return;
    while(this.effects.size>=8){const oldest=this.effects.values().next().value;oldest.pause();this.effects.delete(oldest);}
    const effect=this.createAudio(url);this.effectGains.set(effect,gain);effect.volume=Math.max(0,Math.min(1,this.volume*this.seVolume*gain));this.effects.add(effect);
    const done=()=>this.effects.delete(effect);effect.addEventListener('ended',done,{once:true});effect.addEventListener('error',done,{once:true});effect.play().catch(done);
  }
  play(){
    if(!this.enabled||!this.audio||this.pending)return;
    const audio=this.audio,generation=++this.generation;this.setState('loading');
    const promise=audio.play();this.pending=promise;
    promise.then(()=>{if(this.generation===generation&&this.enabled)this.setState('playing');}).catch(error=>{if(this.generation!==generation||!this.enabled)return;this.setState(error.name==='NotAllowedError'?'blocked':'error');}).finally(()=>{if(this.pending===promise)this.pending=null;});
  }
  retry(){this.setState('off');this.play();}
}
