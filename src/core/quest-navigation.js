import {clone} from './expression.js';
import {townLocation} from './world.js';

// Resolve the pending physical event, without advancing a script or choosing a branch.
export function nextQuestPlace(data,state,id){
  if(typeof id!=='string'||!Object.hasOwn(data.quests,id))return null;
  const q=data.quests[id],progress=state.quests[id];
  if(!q||!progress||progress.stage==='completed')return null;
  if(q.story?.worldPlaces&&!state.flags.legacyStoryRoutes?.[id]){
    const journey=state.journey?.quest===id?state.journey:null;
    const placeKey=journey?q.story.actions[journey.action]?.journey?.to:q.story.scenes[state.stories[id]?.scene??'entry']?.place;
    return clone(q.story.worldPlaces[placeKey]??null);
  }
  // Stories without worldPlaces are still resumed through their placed event hub.
  const clues=(q.model.flowVersion??0)<2||state.flags.legacyQuestRoutes?.[id];
  const pending=clues?q.locations.find(p=>p.role.startsWith('clue_')&&!progress.evidence.includes(p.role)):null;
  const point=pending??q.locations.find(p=>p.role==='decision');
  return point?{kind:'dungeon',...clone(point),dungeon:data.maps[point.map]?.dungeon}:null;
}

export function dungeonEntryReason(data,state,id){
  if(!data.dungeons[id])return '行き先の迷宮が見つからない。';
  if(state.waiting||state.battle)return '会話・戦闘を終えてから出発する。';
  if(state.mode!=='town')return '現在の迷宮から町へ戻ってから出発する。';
  if(data.game.world&&!townLocation(data,state)?.dungeons?.includes(id)){
    const gates=Object.values(data.locations).filter(l=>l.dungeons?.includes(id));
    return gates.length?`${gates.map(l=>l.name).join('・')}から出発できる。`:'この場所からは出発できない。';
  }
  return '';
}

export function questEntryPlan(data,state,id){
  const place=nextQuestPlace(data,state,id);
  let reason='';
  if(state.quests[id]?.stage!=='active')reason='受注中の依頼を選ぶ。';
  else if(!place)reason='次のイベントの場所が未定義。';
  else if(place.kind==='town')reason=`次のイベントは${data.locations[place.location]?.name??place.location}にある。`;
  else reason=dungeonEntryReason(data,state,place.dungeon);
  return {ok:!reason,reason,place};
}
