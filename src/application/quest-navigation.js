import {nextQuestPlace,questEntryPlan} from '../core/quest-navigation.js';
import {atWorldPlace} from '../core/world.js';

export function projectQuestNavigation(data,state,q){
  const place=nextQuestPlace(data,state,q.id),plan=questEntryPlan(data,state,q.id);
  const dungeonIds=[...new Set([
    ...Object.values(q.story?.worldPlaces??{}).filter(p=>p.kind==='dungeon').map(p=>p.dungeon),
    ...(q.events??[]).flatMap(e=>e.points.map(p=>data.maps[p.map]?.dungeon))
  ].filter(id=>data.dungeons[id]))];
  let destination=null;
  if(place){
    if(place.kind==='town')destination={...place,name:data.locations[place.location].name,label:data.locations[place.location].name};
    else{
      const dungeon=data.dungeons[place.dungeon],map=data.maps[place.map];
      destination={...place,name:dungeon.name,mapName:map.name,floor:map.floor,label:`${dungeon.name} / ${map.name} (${place.x}, ${place.y}${place.z===undefined?'':`, 高さ${place.z}`})`};
    }
    destination.atPlace=atWorldPlace(state,place);
    destination.hint=destination.atPlace?'この場所で続きを進める。':place.kind==='town'?'町の施設を移動して、この場所へ向かう。':state.location?.map===place.map?'地図を確認し、イベント地点まで歩いて調べる。':state.mode==='town'?'迷宮の入口に入り、イベント地点まで探索する。':'入口や階段を使い、イベントのあるマップへ向かう。';
  }
  return {destination,dungeonIds,dungeonNames:dungeonIds.map(id=>data.dungeons[id].name),entryDungeon:place?.kind==='dungeon'?place.dungeon:null,canEnter:plan.ok,entryReason:plan.reason};
}
