import {story,or,not} from '../../story-kit.mjs';
import {connectWorld} from '../../world-story-kit.mjs';

export function marketQuest(number,sites,people,{floor=1,characterIds={}}={}){
  const id='q'+String(number).padStart(3,'0');
  const characters={}, places={},world={};
  const characterId=who=>characterIds[who]??'e2_'+id+'_'+who;
  for(const [place,[name,x,y]] of Object.entries(sites)){
    places[place]=name;
    world[place]={kind:'dungeon',dungeon:'region_6',map:'region_6_f'+floor,x,y,event:id+'_market_'+place};
  }
  for(const [who,[,name,goal]] of Object.entries(people)){
    const key=characterId(who);
    characters[key]={id:key,name,goal,detail:goal+'。',quests:[id]};
  }
  function create(){
    const s=story(number,{...places},[]);
    for(const [who,[place]] of Object.entries(people))s.entity(who,place,characterId(who));
    const peopleHere=Object.keys(people);
    function scene(key,place,text,choices){
      s.node(key,place,peopleHere.filter(who=>people[who][0]===place||people[who][3]?.includes(place)),text,choices);
      const cast=s.story.scenes[key].cast;
      for(const [i,c] of cast.entries()){
        c.when=s.is(c.entity+'At',place);
        c.display={x:cast.length===1?50:i===0?30:70,y:10,scale:1,cardScale:1,layer:i};
      }
    }
    function implies(key,condition,result,description){s.invariant(key,or(not(condition),result),description);}
    function finish(trips,endings){
      const journey=connectWorld(s,world,1);
      for(const [action,to,companions=[]] of trips)journey(action,to,{companions});
      s.story.endings=endings;return s.done();
    }
    return {s,scene,implies,finish};
  }
  return {create,characters};
}
