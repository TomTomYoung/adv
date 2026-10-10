import {evaluate} from './expression.js';
import {objectVisible} from './quest-events.js';
import {nextQuestPlace} from './quest-navigation.js';

// A decision marker points to pending work. Keep this separate from physical
// visibility so hiding a marker does not remove collision or repeat inspection.
export function objectMarkerVisible(data,state,map,object){
  if(object.kind!=='decision')return objectVisible(state,map,object);
  if(object.once&&state.events[`${map.id}/${object.id}`])return false;
  // A journey destination can need a marker before the local scene is visible.
  if(object.markerWhen!==undefined){
    if(!evaluate(object.markerWhen,state))return false;
  }else if(!objectVisible(state,map,object))return false;
  if(object.condition!==undefined&&!evaluate(object.condition,state))return false;
  if(!object.quest)return true;
  if(state.quests[object.quest]?.stage!=='active')return false;
  const place=nextQuestPlace(data,state,object.quest),id=place?.event??place?.object;
  return Boolean(place?.kind==='dungeon'&&place.map===map.id&&place.x===object.x&&place.y===object.y&&(place.z??0)===(object.z??0)&&(!id||id===object.id));
}
