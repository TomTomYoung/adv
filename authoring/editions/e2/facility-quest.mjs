import {story} from '../../story-kit.mjs';
import {connectWorld} from '../../world-story-kit.mjs';

export function facilityQuest(number,parent,sites,people,author){
  const id='q'+number,locations={},characters={},world={},places={};
  for(const [key,[name,description,background='location_square']] of Object.entries(sites)){
    const location='e2_'+id+'_'+key;
    locations[location]={id:location,parent,name,description,background,links:[]};
    places[key]=name;world[key]={kind:'town',location};
  }
  for(const [who,[name,place,goal]] of Object.entries(people)){
    const person='e2_'+id+'_'+who;
    characters[person]={id:person,name,goal,detail:goal+'。',quests:[id]};
  }
  function source(){
    const s=story(number,{...places},[]);
    for(const [who,[,place]] of Object.entries(people))s.entity(who,place,'e2_'+id+'_'+who);
    const scene=(key,place,cast,text,options)=>{
      s.node(key,place,cast,text,options);
      for(const [i,member] of s.story.scenes[key].cast.entries()){
        member.when=s.is(member.entity+'At',place);
        member.display={x:cast.length===1?50:cast.length===2?[30,70][i]:[17,50,83][i],y:10,scale:1,cardScale:1,layer:i};
      }
    };
    const endings=author(s,scene);
    const trip=connectWorld(s,world,1);
    for(const n of s.nodes)for(const o of n.options){
      if(o.to.startsWith('@'))continue;
      const to=s.story.scenes[o.to].place;
      if(to!==s.story.scenes[n.id].place)trip(o.action,to,{companions:o.companions??[],depart:o.effects});
    }
    s.story.endings=endings;return s.done();
  }
  return {id,source,characters,locations};
}
