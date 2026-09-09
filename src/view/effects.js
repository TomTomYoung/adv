// Visual-only player. Timelines never advance the game or call the engine.
export function motionFrames(frames){return frames.map(f=>({offset:f.at,transform:`translate(${f.x??0}px,${f.y??0}px) rotate(${f.rotate??0}deg) skew(${f.skewX??0}deg,${f.skewY??0}deg) scale(${f.scaleX??1},${f.scaleY??1})`,opacity:f.opacity??1}));}
export function spriteFrames(track){return [...Array.from({length:track.frames},(_,i)=>({offset:i/track.frames,backgroundPosition:`${-(i%track.columns)*track.cell}px ${-Math.floor(i/track.columns)*track.cell}px`,opacity:1})),{offset:1,backgroundPosition:`${-((track.frames-1)%track.columns)*track.cell}px ${-Math.floor((track.frames-1)/track.columns)*track.cell}px`,opacity:0}];}
export class EffectsRenderer {
  constructor(root){this.root=root;this.key=null;this.cache=new Map();this.hidden=new Map();this.sheets=new Map();this.timers=new Set();this.animations=new Set();this.cleanups=new Set();this.media=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)');this.media?.addEventListener('change',()=>this.stop());}
  stop(){for(const timer of this.timers)clearTimeout(timer);this.timers.clear();for(const a of this.animations)a.cancel();this.animations.clear();for(const f of this.cleanups)f();this.cleanups.clear();}
  capture(){this.stop();this.cache.clear();for(const element of this.root.querySelectorAll('[data-fx]')){const rect=element.getBoundingClientRect();this.cache.set(element.dataset.fx,{rect,image:element.tagName==='IMG'?element.src:null});}}
  anchor(target){
    const key=target.key==='screen'?'screen':target.key==='party'?'party':target.key;
    const element=[...this.root.querySelectorAll('[data-fx]')].find(e=>e.dataset.fx===key),prior=this.cache.get(key);
    if(element)return {element,rect:element.getBoundingClientRect(),image:element.tagName==='IMG'?element.src:target.image};
    if(prior&&(target.image||prior.image))return {...prior,image:target.image??prior.image};
    const scene=this.root.querySelector('[data-fx="scene"]')??this.root.querySelector('.main-panel')??this.root;
    const rect=scene.getBoundingClientRect();if(target.image)return {rect:{left:rect.left+rect.width/2-80,top:rect.top+rect.height/2-80,width:160,height:160},image:target.image};
    return {element:scene,rect};
  }
  layer(rect,className=''){const e=document.createElement('div');e.className=`fx-overlay ${className}`;e.setAttribute('aria-hidden','true');Object.assign(e.style,{left:`${rect.left}px`,top:`${rect.top}px`,width:`${rect.width}px`,height:`${rect.height}px`});document.body.append(e);const clean=()=>e.remove();this.cleanups.add(clean);return {element:e,clean:()=>{clean();this.cleanups.delete(clean);}};}
  animate(element,frames,duration,clean=()=>{},easing='linear'){
    if(!element?.animate){clean();return;}
    const a=element.animate(frames,{duration,iterations:1,easing,fill:'none'});this.animations.add(a);a.finished.catch(()=>{}).finally(()=>{this.animations.delete(a);clean();});
  }
  ghost(anchor){const g=this.layer(anchor.rect,'fx-ghost');const image=document.createElement('img');image.src=anchor.image;image.alt='';g.element.append(image);return g;}
  hide(element){if(!element||element.tagName!=='IMG')return ()=>{};let entry=this.hidden.get(element);if(!entry){entry={count:0,visibility:element.style.visibility};this.hidden.set(element,entry);}entry.count++;element.style.visibility='hidden';let done=false;const clean=()=>{if(done)return;done=true;if(--entry.count===0){element.style.visibility=entry.visibility;this.hidden.delete(element);}this.cleanups.delete(clean);};this.cleanups.add(clean);return clean;}
  tint(anchor,color,opacity,duration,shade=false){const g=this.layer(anchor.rect);g.element.style.background=shade?`radial-gradient(ellipse at center,transparent 20%,${color} 100%)`:color;this.animate(g.element,[{opacity:0},{opacity,offset:.3},{opacity:0}],duration,g.clean);}
  play(effect,target,assets,mode='full'){
    const anchor=this.anchor(target),duration=effect.duration;
    if(mode==='off')return;
    if(mode==='reduced'||this.media?.matches){this.tint(anchor,'#dab47a',.1,220);return;}
    for(const track of effect.tracks){
      if(track.kind==='motion'){
        const g=anchor.image?this.ghost(anchor):null,restore=g?this.hide(anchor.element):()=>{};
        this.animate(g?.element??anchor.element,motionFrames(track.frames),duration,()=>{g?.clean();restore();});
      }else if(track.kind==='split'){
        if(!anchor.image){this.tint(anchor,'#dab47a',.12,duration);continue;}
        const restore=this.hide(anchor.element);let remaining=2;
        const clips=track.axis==='diagonal'?['polygon(0 0,100% 0,0 100%)','polygon(100% 0,100% 100%,0 100%)']:['polygon(0 0,50% 0,50% 100%,0 100%)','polygon(50% 0,100% 0,100% 100%,50% 100%)'];
        for(let i=0;i<2;i++){const g=this.ghost(anchor),sign=i===0?-1:1;g.element.style.clipPath=clips[i];this.animate(g.element,[{transform:'translate(0,0) rotate(0deg)',opacity:1},{transform:`translate(${sign*track.distance}px,${track.axis==='diagonal'?sign*track.distance:0}px) rotate(${sign*track.rotate}deg)`,opacity:0}],duration,()=>{g.clean();if(--remaining===0)restore();});}
      }else if(track.kind==='sprite'){
        const g=this.layer({left:anchor.rect.left+anchor.rect.width/2,top:anchor.rect.top+anchor.rect.height/2,width:track.cell,height:track.cell},'fx-sprite');
        Object.assign(g.element.style,{backgroundImage:`url("${assets[track.asset]}")`,backgroundRepeat:'no-repeat',transform:`translate(-50%,-50%) scale(${track.scale??1})`});this.animate(g.element,spriteFrames(track),duration,g.clean,'steps(1,end)');
      }else this.tint(anchor,track.color,track.opacity,duration,track.kind==='shade');
    }
  }
  present(model,mode='full'){
    for(const effect of Object.values(model.effects??{}))for(const track of effect.tracks)if(track.kind==='sprite'){const url=model.effectAssets[track.asset];if(url&&!this.sheets.has(url)){const image=new Image();image.src=url;this.sheets.set(url,image);}}
    const key=model.feedback?`${model.feedback.session}/${model.feedback.revision}`:null;if(key===this.key)return;this.key=key;
    for(const event of model.feedback?.events??[])for(const id of event.effects){const effect=model.effects[id];if(!effect)continue;for(const target of event.targets){const play=()=>this.play(effect,target,model.effectAssets,mode);if(event.at>0){let timer;timer=setTimeout(()=>{this.timers.delete(timer);play();},event.at);this.timers.add(timer);}else play();}}
  }
}
