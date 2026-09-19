// The snapshot owns membership and placement. The view supplies neutral defaults.
const defaults=count=>count===1?[50]:count===2?[28,72]:[22,78,36,64,15,85,43,57];
export function appendSceneCast(parent,scene){
  if(!scene?.cast?.length)return;
  const cards=scene.mode==='cards',layer=document.createElement('div');layer.className=cards?'story-cast scene-cards':'scene-cast';layer.setAttribute('aria-label','この場面の登場人物');
  scene.cast.forEach((c,i)=>{
    const d=c.display??{},speaking=c.id===scene.speakerId,figure=document.createElement('figure');
    figure.className=(cards?'story-person':'scene-actor')+(c.remote?' remote':'')+(speaking?' speaking':'');figure.dataset.character=c.id;
    if(!cards){
      figure.style.left=`${d.x??({left:28,center:50,right:72}[d.position])??defaults(scene.cast.length)[i%8]}%`;
      figure.style.bottom=`${d.y??-2}%`;figure.style.setProperty('--cast-scale',d.scale??1);figure.style.zIndex=String((d.layer??i)+(speaking?100:0));
    }
    const img=document.createElement('img');img.src=cards?c.portrait??c.sprite:c.sprite??c.portrait;img.alt=c.name;img.decoding='async';if(d.flip)img.style.transform='scaleX(-1)';figure.append(img);
    const caption=document.createElement('figcaption');caption.textContent=c.name+(c.remote?'（声）':'')+(speaking?'・発話中':'');figure.append(caption);layer.append(figure);
  });parent.append(layer);
}
