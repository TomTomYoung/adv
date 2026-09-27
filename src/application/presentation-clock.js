// UI time is separate from simulation. A stale timer cannot advance a restored game.
export class PresentationClock{
  constructor(complete,{now=()=>performance.now(),schedule=setTimeout,cancel=clearTimeout}={}){this.complete=complete;this.now=now;this.schedule=schedule;this.cancel=cancel;this.key=null;this.generation=0;}
  stop(){this.generation++;if(this.timer!==undefined){this.cancel(this.timer);this.timer=undefined;}if(this.started!==undefined){this.remaining=Math.max(0,this.remaining-(this.now()-this.started));this.started=undefined;}}
  sync(wait,paused=false){
    const key=wait?`${wait.session}/${wait.id}`:null;
    if(key!==this.key){this.stop();this.key=key;this.wait=wait;this.remaining=wait?.duration??0;this.done=false;}
    if(paused||!wait){this.stop();return;}
    if(this.done||this.timer!==undefined)return;
    const generation=++this.generation;
    this.started=this.now();this.timer=this.schedule(()=>{
      if(this.key!==key||this.generation!==generation)return;this.timer=undefined;this.started=undefined;
      this.done=true;this.complete({type:'presentation.complete',id:wait.id,session:wait.session});
    },this.remaining);
  }
  destroy(){this.stop();this.key=null;this.wait=null;}
}
