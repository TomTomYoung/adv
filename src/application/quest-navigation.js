import {nextQuestPlace,questEntryPlan} from '../core/quest-navigation.js';
import {atWorldPlace,locationRoot} from '../core/world.js';

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
    const entrance=place.kind==='town'?locationRoot(data,place.location)?.dungeonEntrance:null;
    const automatic=state.journey?.quest===q.id||q.events?.some(e=>e.id===place.event&&e.trigger==='enter');
    destination.atPlace=atWorldPlace(state,place,{exact:Boolean(automatic)});
    destination.hint=destination.atPlace?(automatic?'このセルへの進入でイベントが始まる。':place.kind==='town'?'この施設で話を聞く。':'足元・正面を調べる。'):place.kind==='town'?'町の施設を移動して、この場所へ向かう。':state.location?.map===place.map?(automatic?'指定セルを踏むとイベントが始まる。':'地図を確認し、イベント地点まで歩いて調べる。'):state.mode==='town'?'迷宮の入口に入り、イベント地点まで探索する。':'入口や階段を使い、イベントのあるマップへ向かう。';
    if(entrance)destination.hint=destination.atPlace?'詰所内で話を続ける。':`${data.maps[entrance.map].name} (${entrance.x}, ${entrance.y})の戸口で調べ、詰所に入る。${data.locations[place.location].parent?'受付から留置室前へ進む。':''}`;
  }
  return {destination,dungeonIds,dungeonNames:dungeonIds.map(id=>data.dungeons[id].name),entryDungeon:plan.place?.kind==='dungeon'?plan.place.dungeon:null,entryDungeonName:data.dungeons[plan.place?.dungeon]?.name,canEnter:plan.ok,entryReason:plan.reason};
}
