// The retained layer survives message/HUD rebuilds; it never advances the game.
const defaults=count=>count===1?[50]:count===2?[28,72]:[22,78,36,64,15,85,43,57];
function placement(c,index,count,cards){
  const d=c.display??{},scale=d.scale??1,angle=d.angle??0;
  return {left:cards?'':`${d.x??({left:28,center:50,right:72}[d.position])??defaults(count)[index%8]}%`,bottom:cards?'':`${d.y??-2}%`,
    transform:`${cards?'':'translateX(-50%) '}rotate(${angle}deg) scale(${scale})`,opacity:String((d.opacity??1)*(c.remote ? .7 : 1))};
}
function portrait(c,cards){const img=document.createElement('img');img.src=cards?c.portrait??c.sprite:c.sprite??c.portrait;img.alt=c.name;img.decoding='async';img.style.transform=c.display?.flip?'scaleX(-1)':'';return img;}
function speaking(entry,c,scene,index){
  const active=c.id===scene.speakerId,cards=scene.mode==='cards';
  entry.figure.className=(cards?'story-person':'scene-actor')+(c.remote?' remote':'')+(active?' speaking':'');
  entry.figure.style.zIndex=String((c.display?.layer??index)+(active?100:0));
  entry.caption.textContent=c.name+(c.remote?'（声）':'')+(active?'・発話中':'');
}
export class SceneCastRenderer{
  constructor(){this.entries=new Map();this.animations=new Set();this.key=null;this.signature=null;this.session=null;}
  destroy(){this.reset();}
  reset(){for(const a of this.animations)a.cancel();this.animations.clear();this.entries.clear();this.layer?.remove();this.layer=null;this.signature=null;}
  create(c,i,scene){
    const figure=document.createElement('figure'),img=portrait(c,scene.mode==='cards'),caption=document.createElement('figcaption');
    figure.dataset.character=c.id;figure.style.transformOrigin='50% 100%';figure.style.position=scene.mode==='cards'?'relative':'absolute';
    figure.append(img,caption);const entry={figure,img,caption,animations:new Set(),ghosts:new Set(),target:placement(c,i,scene.cast.length,scene.mode==='cards')};
    Object.assign(figure.style,entry.target);speaking(entry,c,scene,i);this.entries.set(c.id,entry);this.layer.append(figure);return entry;
  }
  stop(entry){
    const computed=globalThis.getComputedStyle?.(entry.figure),current={...entry.target};
    if(computed)for(const k of Object.keys(current))current[k]=computed[k];
    for(const a of entry.animations){a.cancel();this.animations.delete(a);}entry.animations.clear();
    for(const img of entry.ghosts)img.remove();entry.ghosts.clear();entry.img.style.opacity='';
    return current;
  }
  animate(entry,node,frames,duration,easing,done=()=>{}){
    if(!duration||!node.animate){done();return;}
    const a=node.animate(frames,{duration,easing,fill:'none'});entry.animations.add(a);this.animations.add(a);
    a.finished.then(()=>{if(entry.animations.has(a)){entry.animations.delete(a);this.animations.delete(a);done();}},()=>{});
  }
  render(parent,scene,cue=null,mode='full',session=null){
    if(this.session!==session){this.reset();this.key=null;this.session=session;}
    const target=scene??{mode:'stage',cast:[]},cards=target.mode==='cards';
    if(this.cards!==cards){this.reset();this.cards=cards;}
    if(!this.layer){this.layer=document.createElement('div');this.layer.className=cards?'story-cast scene-cards':'scene-cast';this.layer.setAttribute('aria-label','この場面の登場人物');}
    parent.append(this.layer);
    const key=cue?`${cue.session}/${cue.id}`:null,newCue=key!==null&&key!==this.key;
    const signature=JSON.stringify([target.mode,target.cast]);
    const reduced=mode==='reduced'||Boolean(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
    if(signature===this.signature&&!newCue&&mode===this.motionMode){
      target.cast.forEach((c,i)=>{const entry=this.entries.get(c.id);if(entry&&!entry.exiting)speaking(entry,c,target,i);});return this.layer;
    }
    const t=newCue?cue.transition??{}:{},easing=t.easing??'linear';
    const time=k=>mode==='off'?0:reduced?Math.min(t[k]??0,150):t[k]??0;
    if(newCue&&!this.entries.size&&cue.from?.mode===target.mode)cue.from.cast.forEach((c,i)=>this.create(c,i,cue.from));
    this.key=key;this.signature=signature;this.motionMode=mode;
    const present=new Set(target.cast.map(c=>c.id));
    for(const [id,entry] of this.entries)if(!present.has(id)){
      const from=this.stop(entry);entry.exiting=true;entry.figure.setAttribute('aria-hidden','true');entry.figure.style.opacity='0';
      this.animate(entry,entry.figure,[from,{...from,opacity:'0'}],time('exit'),easing,()=>{entry.figure.remove();if(this.entries.get(id)===entry)this.entries.delete(id);});
    }
    target.cast.forEach((c,i)=>{
      let entry=this.entries.get(c.id);const existed=Boolean(entry),from=entry?this.stop(entry):null;
      if(!entry)entry=this.create(c,i,target);
      entry.exiting=false;entry.figure.removeAttribute('aria-hidden');speaking(entry,c,target,i);
      const dest=placement(c,i,target.cast.length,cards);entry.target=dest;Object.assign(entry.figure.style,dest);
      const image=portrait(c,cards),imageChanged=entry.img.src!==image.src||entry.img.style.transform!==image.style.transform;
      if(imageChanged){
        const old=entry.img;entry.img=image;entry.figure.insertBefore(image,entry.caption);
        if(time('change')){
          old.alt='';old.setAttribute('aria-hidden','true');Object.assign(old.style,{position:'absolute',inset:'0',width:'100%',height:'100%',pointerEvents:'none'});entry.ghosts.add(old);
          this.animate(entry,old,[{opacity:1},{opacity:0}],time('change'),easing,()=>{old.remove();entry.ghosts.delete(old);});
          this.animate(entry,image,[{opacity:0},{opacity:1}],time('change'),easing);
        }else old.remove();
      }
      if(!existed)this.animate(entry,entry.figure,[{...dest,opacity:0},dest],time('enter'),easing);
      else this.animate(entry,entry.figure,[reduced?{...dest,opacity:from.opacity}:from,dest],time('move'),easing);
    });
    return this.layer;
  }
}
export function appendSceneCast(parent,scene){if(!scene?.cast?.length)return;return new SceneCastRenderer().render(parent,scene);}
