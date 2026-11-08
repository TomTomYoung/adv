import {battleAccent,battleAccentColors} from '../battle-accent.js';

// Localized light and debris: no camera movement and no screen-wide flashes.
export function playBattleAccent(renderer,event,mode){
  if(mode==='off'||mode==='reduced'||renderer.media?.matches)return;
  if(!['impact','defeat'].includes(event.phase))return;
  for(const target of event.targets){
    const kind=battleAccent(event,target);if(!kind)continue;
    const anchor=renderer.anchor(target),color=battleAccentColors[kind],heal=kind==='heal',defeat=kind==='defeat';
    const size=Math.max(45,Math.min(140,Math.max(anchor.rect.width,anchor.rect.height)*.72));
    const cx=anchor.rect.left+anchor.rect.width/2,cy=anchor.rect.top+anchor.rect.height*(defeat ? .65 : .45);
    const count=kind==='critical'?10:heal||defeat?8:kind==='heavy'?7:4;
    const duration=heal?420:defeat?360:kind==='critical'?300:240;
    if(['heavy','critical','guard','heal'].includes(kind)){
      const ring=renderer.layer({left:cx-size/2,top:cy-size/2,width:size,height:size},`fx-impact-ring fx-accent-${kind}`);
      ring.element.style.borderColor=color;ring.element.style.boxShadow=`0 0 14px ${color}66,inset 0 0 12px ${color}33`;
      renderer.animate(ring.element,[{opacity:.85,transform:'scale(.3)'},{offset:.3,opacity:.6,transform:'scale(.9)'},{opacity:0,transform:'scale(1.45)'}],Math.min(300,duration),ring.clean);
    }
    for(let i=0;i<count;i++){
      const angle=(i/count*Math.PI*2)+.37,reach=size*(.4+(i%3)*.11),dx=Math.cos(angle)*reach,dy=heal?-size*(.5+(i%3)*.15):defeat?Math.abs(Math.sin(angle))*size*.5+20:Math.sin(angle)*reach;
      const width=heal?4:defeat?5:kind==='critical'?13:8,height=heal||defeat?4:2;
      const g=renderer.layer({left:cx-width/2,top:cy-height/2,width,height},`fx-impact-particle fx-accent-${kind}`);
      g.element.style.background=color;g.element.style.borderRadius=heal?'50%':'1px';g.element.style.boxShadow=`0 0 6px ${color}99`;
      const rotate=heal?0:angle*180/Math.PI;
      renderer.animate(g.element,[{opacity:0,transform:`translate(${heal?dx*.45:0}px,0) rotate(${rotate}deg) scale(.5)`},{offset:.15,opacity:1,transform:`translate(${dx*.2}px,${dy*.2}px) rotate(${rotate}deg) scale(1)`},{opacity:0,transform:`translate(${dx}px,${dy}px) rotate(${rotate+30}deg) scale(${defeat?.2:.7})`}],duration,g.clean,'ease-out');
    }
  }
}
