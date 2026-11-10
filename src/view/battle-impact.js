import {battleAccent} from '../battle-accent.js';
import {defaultPresentation} from '../presentation-presets.js';
import {cosmeticRandom,sampleCurve} from '../presentation-design.js';

function colorAt(stops,t,fallback){
  if(!stops)return fallback;let i=1;while(i<stops.length-1&&t>stops[i].at)i++;
  const a=stops[i-1],b=stops[i],u=(t-a.at)/(b.at-a.at),rgb=hex=>[1,3,5].map(n=>parseInt(hex.slice(n,n+2),16));
  return '#'+rgb(a.color).map((v,j)=>Math.round(v+(rgb(b.color)[j]-v)*u).toString(16).padStart(2,'0')).join('');
}
export function particleFrames(profile,index,seed){
  const random=cosmeticRandom(`${seed}:${index}`),angle=(profile.directionDeg+(random()-.5)*profile.spreadDeg)*Math.PI/180,speed=profile.speed*(.75+random()*.5),vx=Math.cos(angle)*speed,vy=Math.sin(angle)*speed;
  return Array.from({length:17},(_,i)=>{const t=i/16,seconds=t*profile.durationMs/1000,x=vx*seconds,y=vy*seconds+.5*profile.gravity*seconds*seconds;
    return {offset:t,opacity:sampleCurve(profile.alpha,t),backgroundColor:colorAt(profile.colors,t,profile.color),transform:`translate(${x}px,${y}px) rotate(${profile.shape==='circle'?0:angle*180/Math.PI+t*30}deg) scale(${sampleCurve(profile.scale,t)})`};});
}
// Localized particles; the same data and renderer are used by the editor and game.
export function playBattleAccent(renderer,event,mode,design=renderer.design??defaultPresentation){
  if(mode==='off'||mode==='reduced'||renderer.media?.matches)return;
  if(!event.decorated&&!['impact','defeat'].includes(event.phase))return;
  for(const target of event.targets??[]){
    const kind=event.decorated?event.particles:battleAccent(event,target),profile=design.particles[kind];if(!profile)continue;
    const anchor=renderer.anchor(target),color=profile.color,size=Math.max(45,Math.min(140,Math.max(anchor.rect.width,anchor.rect.height)*.72));
    const cx=anchor.rect.left+anchor.rect.width/2,cy=anchor.rect.top+anchor.rect.height*.45;
    if(profile.ring){const ring=renderer.layer({left:cx-size/2,top:cy-size/2,width:size,height:size},`fx-impact-ring fx-accent-${kind}`),r=profile.ring;
      ring.element.style.borderColor=color;ring.element.style.boxShadow=`0 0 14px ${color}66,inset 0 0 12px ${color}33`;
      renderer.animate(ring.element,[{opacity:r.opacity,transform:`scale(${r.from})`},{opacity:0,transform:`scale(${r.to})`}],r.durationMs,ring.clean);
    }
    for(let i=0;i<profile.count;i++){
      const width=profile.size,height=profile.shape==='spark'?Math.max(1,profile.size/4):profile.size,g=renderer.layer({left:cx-width/2,top:cy-height/2,width,height},`fx-impact-particle fx-accent-${kind}`);
      g.element.style.background=color;g.element.style.borderRadius=profile.shape==='circle'?'50%':'1px';g.element.style.boxShadow=`0 0 6px ${color}99`;
      renderer.animate(g.element,particleFrames(profile,i,`${kind}:${target.key}:${event.at}`),profile.durationMs,g.clean);
    }
  }
}
export function trajectoryPoint(dx,dy,arc,t){return {x:dx*t,y:dy*t+4*arc*t*(1-t),angle:Math.atan2(dy+4*arc*(1-2*t),dx)*180/Math.PI};}
export function playPath(renderer,profile,target,source,mode){
  if(!source||mode!=='full'||renderer.media?.matches)return;
  const a=renderer.anchor(target),x=source.rect.left+source.rect.width/2,y=source.rect.top+source.rect.height/2,dx=a.rect.left+a.rect.width/2-x,dy=a.rect.top+a.rect.height/2-y;
  if(profile.beam){const length=Math.hypot(dx,dy),g=renderer.layer({left:x,top:y-profile.height/2,width:length,height:profile.height},'fx-projectile fx-beam');g.element.style.background=profile.color;g.element.style.transformOrigin='left center';
    const rotate=`rotate(${Math.atan2(dy,dx)*180/Math.PI}deg)`;renderer.animate(g.element,[{opacity:0,transform:rotate+' scaleX(0)'},{offset:.2,opacity:1,transform:rotate+' scaleX(1)'},{offset:.75,opacity:.8,transform:rotate+' scaleX(1)'},{opacity:0,transform:rotate+' scaleX(1)'}],profile.durationMs,g.clean);return;
  }
  for(let i=profile.trail;i>=0;i--){const g=renderer.layer({left:x-profile.width/2,top:y-profile.height/2,width:profile.width,height:profile.height},i?'fx-projectile fx-trail':'fx-projectile');g.element.style.background=profile.color;g.element.style.borderRadius='50%';
    const frames=Array.from({length:25},(_,j)=>{const t=j/24,u=Math.max(0,t-i*.025),p=trajectoryPoint(dx,dy,profile.arc,u);return {offset:t,opacity:j===24?0:t<i*.025?0:.7**i,transform:`translate(${p.x}px,${p.y}px) rotate(${p.angle}deg) scale(${1-i*.035})`};});
    renderer.animate(g.element,frames,profile.durationMs,g.clean);
  }
}
