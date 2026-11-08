import {feedbackDelay} from '../feedback-timing.js';

// Keep the pre-action battlefield on screen while replaying resolved results.
// This owns DOM/timers only: it never dispatches an action or modifies a model.
export class BattlePlayback {
  constructor(view){this.view=view;this.active=null;this.key=null;}
  resolve(model){return this.active&&model===this.view.model?this.active.next:model;}
  cancel(){
    const active=this.active;if(!active)return;
    clearTimeout(active.timer);this.active=null;
    for(const [node,inert] of active.inert)node.inert=inert;
    active.bar.remove();this.view.effects.onEvent=null;
  }
  finish(){
    const next=this.active?.next;if(!next)return;
    this.cancel();this.view.render(next);this.view.ui.feedbackFinished?.();
  }
  present(next){
    const view=this.view,key=next.feedback?`${next.feedback.session}/${next.feedback.revision}`:null;
    // A new render/load is authoritative; never leave old HP or a disabled UI.
    this.cancel();
    const events=next.feedback?.events??[],mode=view.ui.effectsMode?.()??'full';
    if(key===this.key||!view.model?.battle||!view.root.animate||mode==='off'||
      next.feedback?.session!==view.model.feedback?.session||!events.some(e=>e.phase==='impact'))return false;
    this.key=key;view.ui.cancelFeedback?.();view.effects.capture();
    const bar=document.createElement('div');bar.className='battle-playback';
    const label=document.createElement('span');label.setAttribute('role','status');label.textContent='';
    const skip=document.createElement('button');skip.type='button';skip.textContent='演出を省略';skip.dataset.focus='battle:skip';skip.addEventListener('click',()=>this.finish());bar.append(label,skip);
    const inert=[...view.root.children].map(node=>[node,node.inert]);for(const [node] of inert)node.inert=true;
    // The stage is inert too; place the controls outside it, above either layout.
    view.root.append(bar);
    const duration=Math.max(...events.map(e=>e.at+Math.max(240,...e.effects.map(id=>next.effects[id]?.duration??0),e.targets.some(t=>t.damage>0||t.healing>0)?620:0)))+30;
    this.active={next,bar,label,inert,timer:setTimeout(()=>this.finish(),feedbackDelay(next.feedback,duration))};
    view.effects.onEvent=event=>{
      if(event.action)label.textContent=event.action;
      for(const target of event.targets){
        if(event.phase!=='impact'||!Number.isFinite(target.hpAfter))continue;
        for(const node of view.root.querySelectorAll('[data-battle-vitals]')){
          if(node.dataset.battleVitals!==target.key)continue;
          const hp=target.hpAfter,max=Number(node.dataset.maxHp),mp=target.mpAfter;
          if(node.dataset.vitalsKind==='meter'){
            node.setAttribute('aria-valuenow',hp);node.firstElementChild.style.width=`${Math.max(0,Math.min(100,hp/max*100))}%`;
          }else node.textContent=`HP ${hp}/${max}${Number.isFinite(mp)&&node.dataset.showMp==='true'?` / MP ${mp}/${node.dataset.maxMp}`:''}`;
        }
      }
    };
    view.effects.present(next,mode);skip.focus({preventScroll:true});return true;
  }
}

export function battleVitals(node,key,unit,kind='text',showMp=false){
  Object.assign(node.dataset,{battleVitals:key,maxHp:unit.maxHp,maxMp:unit.maxMp,vitalsKind:kind,showMp:String(showMp)});return node;
}
