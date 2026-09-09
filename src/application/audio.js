// Browser audio adapter; the game and the view exchange only data and labels.
export class GameAudio {
  constructor({createAudio=url=>new Audio(url),onChange=()=>{}}={}){
    this.createAudio=createAudio;this.onChange=onChange;this.enabled=false;this.volume=.5;this.music=null;this.audio=null;this.pending=null;this.generation=0;this.state='off';this.effectKey=null;this.effects=new Set();
  }
  setState(state){if(this.state!==state){this.state=state;this.onChange(this.label());}}
  label(){if(!this.enabled)return '音：切';if(this.volume===0)return '音：消音';return {off:'音：待機',loading:'音：読込中',playing:'音：再生中',blocked:'音：再生待ち',error:'音：再試行'}[this.state];}
  configure(enabled,volume){
    this.enabled=Boolean(enabled);this.volume=Math.max(0,Math.min(1,Number.isFinite(volume)?volume:.5));
    if(this.audio)this.audio.volume=this.volume;
    for(const effect of this.effects)effect.volume=this.volume;
    if(!this.enabled){this.generation++;this.audio?.pause();this.pending=null;for(const effect of this.effects)effect.pause();this.effects.clear();this.setState('off');}
    this.onChange(this.label());
  }
  sync(model){
    const key=model.se?`${model.se.url}/${model.se.revision}`:null;
    if(key!==this.effectKey){this.effectKey=key;if(this.enabled&&model.se?.url){const effect=this.createAudio(model.se.url);effect.volume=this.volume;this.effects.add(effect);const done=()=>this.effects.delete(effect);effect.addEventListener('ended',done,{once:true});effect.addEventListener('error',done,{once:true});effect.play().catch(done);}}
    if(model.music!==this.music){
      this.generation++;this.audio?.pause();this.pending=null;this.music=model.music;this.audio=model.music?this.createAudio(model.music):null;
      if(this.audio){const audio=this.audio;audio.loop=true;audio.preload='auto';audio.volume=this.volume;audio.addEventListener('playing',()=>{if(this.audio===audio&&this.enabled)this.setState('playing');});audio.addEventListener('error',()=>{if(this.audio===audio&&this.enabled)this.setState('error');});}
      this.setState('off');
    }
    if(this.enabled&&this.audio?.paused&&!this.pending&&!['blocked','error'].includes(this.state))this.play();
  }
  play(){
    if(!this.enabled||!this.audio||this.pending)return;
    const audio=this.audio,generation=++this.generation;this.setState('loading');
    const promise=audio.play();this.pending=promise;
    promise.then(()=>{if(this.generation===generation&&this.enabled)this.setState('playing');}).catch(error=>{if(this.generation!==generation||!this.enabled)return;this.setState(error.name==='NotAllowedError'?'blocked':'error');}).finally(()=>{if(this.pending===promise)this.pending=null;});
  }
  retry(){this.setState('off');this.play();}
}
