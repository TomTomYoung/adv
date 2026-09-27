import {isRecord,clone} from './expression.js';

export const CAST_EASINGS=['linear','ease-in','ease-out','ease-in-out'];
export const durationValid=value=>Number.isInteger(value)&&value>=0&&value<=10000;
export function transitionValid(value){
  return value===undefined||isRecord(value)&&Object.keys(value).every(k=>['enter','exit','move','change','easing','wait'].includes(k))&&
    ['enter','exit','move','change'].every(k=>value[k]===undefined||durationValid(value[k]))&&
    (value.easing===undefined||CAST_EASINGS.includes(value.easing))&&(value.wait===undefined||typeof value.wait==='boolean');
}
export const transitionDuration=t=>Math.max(0,...['enter','exit','move','change'].map(k=>t?.[k]??0));
export function storyCast(engine){
  const {data,state}=engine,frame=state.vm.findLast(f=>data.scripts[f.script]?.storyQuest);
  const quest=data.quests[data.scripts[frame?.script]?.storyQuest];
  const scene=state.quests[quest?.id]?.stage==='active'?quest?.story.scenes[state.stories[quest?.id]?.scene]:null;
  return {quest,scene};
}
export function castDefinition(engine){
  if(engine.state.presentation.cast)return clone(engine.state.presentation.cast);
  const {quest,scene}=storyCast(engine);
  return {mode:scene?.castMode??'stage',cast:scene?scene.cast.filter(c=>c.when===undefined||engine.value(c.when)).map(c=>({character:quest.story.entities[c.entity].character,remote:c.mode==='remote',display:clone(c.display??{})})):[]};
}
export function beginPresentationWait(engine,duration,kind='wait'){
  if(!duration)return;
  const p=engine.state.presentation;p.sequence=(p.sequence??0)+1;
  engine.state.waiting={type:'presentation',id:p.sequence,duration,kind};
}
export function setCast(engine,command){
  const p=engine.state.presentation,from=castDefinition(engine);
  if(command.op==='scene.cast.clear')delete p.cast;
  else p.cast={mode:command.mode??'stage',cast:clone(command.cast)};
  p.sequence=(p.sequence??0)+1;
  p.castCue={id:p.sequence,from,transition:clone(command.transition??{})};
  if(command.transition?.wait)beginPresentationWait(engine,transitionDuration(command.transition),'cast');
}
export function castCueValid(cue,data){
  return isRecord(cue)&&Number.isSafeInteger(cue.id)&&cue.id>0&&castValid(cue.from,data)&&transitionValid(cue.transition);
}

// Author-controlled presentation data; it never changes a person's story location.
export function placementValid(p,data){
  if(p===undefined)return true;
  if(!isRecord(p)||Object.keys(p).some(k=>!['position','x','y','scale','flip','layer','asset','opacity','angle'].includes(k)))return false;
  if(p.position!==undefined&&!['left','center','right'].includes(p.position))return false;
  for(const [key,min,max] of [['x',0,100],['y',-25,50],['scale',.5,1.5],['layer',0,99],['opacity',0,1],['angle',-360,360]])if(p[key]!==undefined&&(!Number.isFinite(p[key])||p[key]<min||p[key]>max))return false;
  return (p.flip===undefined||typeof p.flip==='boolean')&&(p.layer===undefined||Number.isInteger(p.layer))&&(p.asset===undefined||typeof p.asset==='string'&&Object.hasOwn(data.assets.images,p.asset));
}
export function castValid(value,data){
  if(!isRecord(value)||!['stage','cards'].includes(value.mode)||!Array.isArray(value.cast)||value.cast.length>8)return false;
  const ids=new Set();
  return value.cast.every(c=>{
    if(!isRecord(c)||typeof c.character!=='string'||!Object.hasOwn(data.characters,c.character)||ids.has(c.character)||!placementValid(c.display,data))return false;
    ids.add(c.character);return true;
  });
}
