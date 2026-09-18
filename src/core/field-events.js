import {eventVisible,objectVisible,questEvents} from './quest-events.js';
import {nextQuestPlace} from './quest-navigation.js';
import {arriveStoryJourney,resumeWorldStory} from './story.js';

export const FIELD_EVENT_TRIGGERS=['enter','auto','interact','action'];
export const fieldIdle=state=>!state.waiting&&!state.battle&&!state.vm.length;
export function onFieldCell(state,point){
  const p=state.location;
  return state.mode==='dungeon'&&p?.map===point?.map&&p.x===point.x&&p.y===point.y&&(p.z??0)===(point.z??0);
}
export function recordFieldEntry(state){
  const {map,x,y,z=0}=state.location;
  state.fieldEntry={map,x,y,z,fired:[]};
}

// Exact occupied cell, never the facing cell. Keep the entry's consumed IDs in
// saves so pausing a conversation does not immediately start it again.
function enterEvent(engine){
  const s=engine.state,entry=s.fieldEntry;if(!entry||!onFieldCell(s,entry))return false;
  for(const o of engine.map().objects){
    if(o.trigger!=='enter'||!onFieldCell(s,{map:entry.map,...o})||entry.fired.includes(o.id)||!objectVisible(s,engine.map(),o))continue;
    if(o.condition!==undefined&&!engine.value(o.condition))continue;
    const q=engine.data.quests[o.quest],story=q?.story?.worldPlaces&&o.script===q.model.entryScript;
    if(story&&!onFieldCell(s,nextQuestPlace(engine.data,s,q.id)))continue;
    entry.fired.push(o.id);
    const key=`${entry.map}/${o.id}`;s.events[key]=(s.events[key]??0)+1;
    engine.cue(engine.data.presentation?.bindings.objects[o.kind]);
    if(story)resumeWorldStory(engine,q.id);
    else engine.run(o.script,{object:o.id,map:entry.map});
    return true;
  }
  return false;
}
function arriveEvent(engine){
  const s=engine.state,j=s.journey;if(!j)return false;
  const q=engine.data.quests[j.quest],place=q.story.worldPlaces[q.story.actions[j.action].journey.to];
  const arrived=place.kind==='town'?s.mode==='town'&&s.townLocation===place.location:onFieldCell(s,place);
  return arrived&&arriveStoryJourney(engine);
}
function conditionEvent(engine){
  const s=engine.state;if(s.mode!=='dungeon')return false;
  for(const event of questEvents(engine.data)){
    if(event.trigger!=='auto'||s.quests[event.quest]?.stage!=='active')continue;
    const key=`quest/${event.quest}/${event.id}`;
    if(s.events[key]||!eventVisible(s,event)||!engine.value(event.condition))continue;
    if(event.dungeon&&s.dungeons?.active?.id!==event.dungeon)continue;
    if(event.points.length&&!event.points.some(p=>onFieldCell(s,p)))continue;
    s.events[key]=1;engine.run(event.script,{quest:event.quest,event:event.id});return true;
  }
  return false;
}
export function processFieldEvents(engine){
  let fired=false,budget=engine.data.system.scriptBudget;
  while(fieldIdle(engine.state)){
    if(--budget<0)throw Error('フィールドイベントが実行上限に達しました');
    if(!enterEvent(engine)&&!arriveEvent(engine)&&!conditionEvent(engine))break;
    fired=true;
  }
  return fired;
}
