import {closeTo} from './systems/common.js';
import {edgeBetween} from './edge-layers.js';
import {faceRules,voxelMapState} from './voxels.js';

export const INTERACTION_RANGES=['here','front','here-or-front'];
export const interactionRangeValid=event=>event.interactionRange===undefined||
  ['interact','action'].includes(event.trigger)&&INTERACTION_RANGES.includes(event.interactionRange);

// An event's position is independent of when it fires. Unspecified cell events
// require arrival; edge placements still require their own cell and facing.
export function canInteractAt(data,state,point,range=point.interactionRange??'here'){
  if(!INTERACTION_RANGES.includes(range)||!closeTo(state,point,range))return false;
  if(point.edge)return true;
  const loc=state.location,here=point.x===loc.x&&point.y===loc.y;
  if(here)return range!=='front';
  if(range==='here')return false;
  const map=data.maps[loc.map];
  return Boolean(map&&!edgeBetween(data,map,loc,point)?.visual.opaque&&
    (!map.voxels||faceRules(map,voxelMapState(data,state,map),loc,point).passage));
}

export const canInteractWithEvent=(data,state,event)=>event.points.some(point=>
  canInteractAt(data,state,point,event.interactionRange??'here'));
