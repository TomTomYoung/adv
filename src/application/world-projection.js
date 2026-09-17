import {atWorldPlace,worldPlaceName,townLocation} from '../core/world.js';
import {storyPlace} from '../core/story.js';
export function projectWorld(engine,dialog){
  const {data:d,state:s}=engine,location=townLocation(d,s),busy=Boolean(s.waiting||s.battle),j=s.journey;
  let journey=null;
  if(j){const q=d.quests[j.quest],a=q.story.actions[j.action],place=q.story.worldPlaces[a.journey.to];journey={quest:j.quest,title:q.title,destination:worldPlaceName(d,place),place:{...place},canArrive:!busy&&atWorldPlace(s,place)};}
  if(!location)return {town:null,journey};
  const links=Object.values(d.locations).filter(l=>l.parent===location.id||(location.links??[]).includes(l.id)).map(l=>({id:l.id,name:l.name}));
  const breadcrumbs=[];let l=location;while(l){breadcrumbs.unshift({id:l.id,name:l.name});l=d.locations[l.parent];}
  const cast=(location.cast??[]).map(c=>({id:c.character,name:d.characters[c.character].name,sprite:d.assets.images[c.sprite],x:c.x}));
  for(const q of Object.values(d.quests)){
    const story=s.stories[q.id];if(!q.story?.worldPlaces||!story||s.quests[q.id].stage!=='active')continue;
    for(const [id,e] of Object.entries(q.story.entities))if(e.character){
      const place=q.story.worldPlaces[storyPlace(q.story,story,id)],image=d.assets.images[`sprite_${e.character}`];
      if(place?.kind==='town'&&place.location===location.id&&image&&!cast.some(c=>c.id===e.character))cast.push({id:e.character,name:d.characters[e.character].name,sprite:image});
    }
  }
  for(const [i,c] of cast.entries())c.x??=cast.length===1?62:35+i*35;
  const stories=Object.values(d.quests).filter(q=>!j&&q.story?.worldPlaces&&s.quests[q.id].stage==='active'&&atWorldPlace(s,q.story.worldPlaces[q.story.scenes[s.stories[q.id]?.scene??'entry'].place])).map(q=>({id:q.id,title:q.title,enabled:!busy}));
  return {journey,town:{id:location.id,name:location.name,description:location.description,background:d.assets.images[location.background],parent:location.parent?{id:location.parent,name:d.locations[location.parent].name}:null,breadcrumbs,links,cast,stories,shop:Boolean(location.shop),party:Boolean(location.party),quests:Boolean(location.quests),dungeons:(location.dungeons??[]).map(id=>({id,name:d.dungeons[id].name})),services:d.game.services.filter(v=>location.services?.includes(v.id)),busy}};
}
