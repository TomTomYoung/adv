import {story} from './story-kit.mjs';
import {connectWorld} from './world-story-kit.mjs';
import {kagaribiCharacterArt} from './kagaribi-character-art.mjs';

// Each episode owns its people and portable props. Existing lamps, incidents,
// the deep-fire item and q001's cast are never duplicated in story state.
export const point=(map,x,y)=>({kind:'dungeon',dungeon:'kagaribi',map,x,y});
export function episode(number,title,client,places,world,kernel){
  const s=story(number,places,[]);
  s.title=title;s.client=client;s.kernel=kernel;s.castCards=[];s.world=world;
  s.routeNotes=[];s.agentCards={};
  return s;
}
export function person(s,key,place,name,role,goal,belief,fear,detail){
  const id=`${s.id}_${key}`;
  s.entity(key,place,id);
  s.castCards.push({id,name,role,quests:[s.id],goal,detail,provenance:'篝火迷宮の追加10編。人物・呼称を固定。専用肖像は未制作。',...kagaribiCharacterArt(id)});
  s.agentCards[key]={belief,fear,knowledgeSource:detail,publicGoal:goal,privateStake:fear};
  return s;
}
export function worldRoutes(s,routes){
  const route=connectWorld(s,Object.fromEntries(Object.entries(s.world).map(([id,p])=>[id,{...p,event:`${s.id}_${id}`} ])),1);
  for(const [action,to,options] of routes)route(action,to,options);
  return s.done();
}
