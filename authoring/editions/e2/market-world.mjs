import {dungeonQuest} from './dungeon-world.mjs';

export function marketQuest(number,sites,people,options={}){
  return dungeonQuest(number,sites,people,{dungeon:'region_6',floor:1,prefix:'market',...options});
}
