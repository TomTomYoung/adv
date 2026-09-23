import {eventVisible,objectVisible} from './quest-events.js';
import {nextQuestPlace} from './quest-navigation.js';
import {arriveStoryJourney,resumeWorldStory} from './story.js';
import {dungeonCell,dungeonFieldParameters} from './dungeons.js';
import {cellEventKey,cellEntryId} from './cell-layers.js';
import {freshFieldReactions,fieldEventIndex,fieldReactionKey} from './field-signals.js';
import {currentIllumination} from './lighting.js';

export const FIELD_EVENT_TRIGGERS=['enter','auto','interact','action'];
export const fieldIdle=state=>!state.waiting&&!state.battle&&!state.vm.length;
export function onFieldCell(state,point){
  const p=state.location;
  return state.mode==='dungeon'&&p?.map===point?.map&&p.x===point.x&&p.y===point.y&&(p.z??0)===(point.z??0);
}
export function recordFieldEntry(state){
  const {map,x,y,z=0}=state.location;
  state.fieldEntry={map,x,y,z,fired:[]};
  state.fieldReactions=freshFieldReactions();
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
function cellEnterEvent(engine){
  const s=engine.state,entry=s.fieldEntry;if(!entry||!onFieldCell(s,entry))return false;
  const cell=dungeonCell(engine.data,s,engine.map(),entry.x,entry.y);
  for(const id of cell?.events??[]){
    const event=engine.data.cellEvents[id],firedId=cellEntryId(id),key=cellEventKey(entry.map,entry.x,entry.y,id);
    if(event.trigger!=='enter'||entry.fired.includes(firedId)||event.once&&s.events[key]||event.condition!==undefined&&!engine.value(event.condition,{cell}))continue;
    entry.fired.push(firedId);s.events[key]=(s.events[key]??0)+1;
    engine.run(event.script,{map:entry.map,x:entry.x,y:entry.y,event:id});return true;
  }
  return false;
}
function conditionEvent(engine){
  const s=engine.state;if(s.mode!=='dungeon')return false;
  const candidates=Object.entries(s.quests).filter(([,q])=>q.stage==='active').flatMap(([id])=>(engine.data.quests[id].events??[]).filter(e=>e.trigger==='auto').map(e=>({...e,quest:id})));
  for(const event of candidates){
    if(event.trigger!=='auto'||s.quests[event.quest]?.stage!=='active')continue;
    const key=`quest/${event.quest}/${event.id}`;
    if(s.events[key]||!eventVisible(s,event)||!engine.value(event.condition))continue;
    if(event.dungeon&&s.dungeons?.active?.id!==event.dungeon)continue;
    if(event.points.length&&!event.points.some(p=>onFieldCell(s,p)))continue;
    s.events[key]=1;engine.run(event.script,{quest:event.quest,event:event.id});return true;
  }
  return false;
}
function environmentEvent(engine){
  const s=engine.state,q=s.fieldReactions,active=s.dungeons?.active;
  if(s.mode!=='dungeon'||!q?.pending.length||q.dungeon!==active?.id||q.run!==active.run)return false;
  const index=fieldEventIndex(engine.data.dungeons[active.id]);
  // Definition order is stable even when several mutation signals were coalesced.
  const candidates=[...index.events.values()].filter(e=>q.pending.includes(e.id));
  const field={cell:dungeonCell(engine.data,s,engine.map(),s.location.x,s.location.y)};
  let parameters,illumination;
  Object.defineProperties(field,{
    environment:{enumerable:true,get:()=>parameters??=dungeonFieldParameters(engine.data,s)},
    illumination:{enumerable:true,get:()=>illumination??=currentIllumination(engine.data,s)}
  });
  for(const event of candidates){
    q.pending.splice(q.pending.indexOf(event.id),1);
    const key=fieldReactionKey(active.id,event.id);
    if(event.repeat==='once'&&s.events[key]||event.repeat==='entry'&&q.fired.includes(event.id))continue;
    if(event.points?.length&&!event.points.some(p=>onFieldCell(s,p))||!engine.value(event.condition,{field}))continue;
    s.events[key]=(s.events[key]??0)+1;
    if(event.repeat==='entry')q.fired.push(event.id);
    if(event.action.type==='battle')engine.startBattle(event.action.encounter,{win:[],escape:[],lose:[]});
    else engine.run(event.action.script,{event:event.id,dungeon:active.id,map:s.location.map,x:s.location.x,y:s.location.y});
    if(event.message)engine.notify(event.message);
    return true;
  }
  return false;
}
export function processFieldEvents(engine){
  let fired=false,budget=engine.data.system.scriptBudget;
  while(fieldIdle(engine.state)){
    if(--budget<0)throw Error('フィールドイベントが実行上限に達しました');
    if(!enterEvent(engine)&&!arriveEvent(engine)&&!cellEnterEvent(engine)&&!conditionEvent(engine)&&!environmentEvent(engine))break;
    fired=true;
  }
  return fired;
}
