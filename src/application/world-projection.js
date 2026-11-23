import {clone} from '../core/expression.js';
import {atWorldPlace,worldPlaceName,localPlaceName,townLocation,dungeonInterior,resolveStoryWorldPlace,storyJourneyPlaces} from '../core/world.js';
import {storyPlace} from '../core/story.js';
export function projectWorld(engine,dialog){
  const {data:d,state:s}=engine,location=townLocation(d,s),busy=Boolean(s.waiting||s.battle),j=s.journey;
  let journey=null;
  if(j){const q=d.quests[j.quest],places=storyJourneyPlaces(q.story,s.stories[j.quest],j.action),place=places.find(p=>atWorldPlace(s,p))??places[0];journey={quest:j.quest,title:q.title,destination:worldPlaceName(d,place),place:{...place},atDestination:atWorldPlace(s,place)};}
  if(!location)return {town:null,journey};
  const interior=dungeonInterior(d,s);
  const ancestors=[];for(let l=location;l;l=d.locations[l.parent])ancestors.unshift(l);
  const home=d.worldTravel?.settlements[d.worldTravel.home];
  const local=home?.root===ancestors[0].id&&Boolean(ancestors[0].localName);
  const name=l=>local?localPlaceName(l):l.name;
  const links=Object.values(d.locations).filter(l=>l.parent===location.id||(location.links??[]).includes(l.id)).map(l=>({id:l.id,name:name(l)}));
  if(location.choiceOrder){
    const order=new Map(location.choiceOrder.map((id,i)=>[id,i]));
    links.sort((a,b)=>(order.get(a.id)??Infinity)-(order.get(b.id)??Infinity));
  }
  const breadcrumbs=ancestors.map(l=>({id:l.id,name:name(l)}));
  const headingPath=local?[home.name,...breadcrumbs.slice(1,-1).map(l=>l.name)].join(' › '):breadcrumbs.map(l=>l.name).join(' / ');
  const cast=(location.cast??[]).map(c=>({id:c.character,name:d.characters[c.character].name,sprite:d.assets.images[c.sprite],portrait:d.assets.images[d.characters[c.character].portrait],x:c.x}));
  for(const q of Object.values(d.quests)){
    const story=s.stories[q.id];if(!q.story?.worldPlaces||!story||s.quests[q.id].stage!=='active')continue;
    const scene=q.story.scenes[story.scene],sceneHere=scene&&atWorldPlace(s,resolveStoryWorldPlace(q.story,story,scene.place));
    for(const [id,e] of Object.entries(q.story.entities))if(e.character){
      // A person can be physically present but still hidden by the current scene.
      // Apply the authored reveal conditions to the town backdrop as well.
      if(sceneHere&&!scene.cast.some(c=>c.entity===id&&c.mode!=='remote'&&(c.when===undefined||engine.value(c.when))))continue;
      const place=resolveStoryWorldPlace(q.story,story,storyPlace(q.story,story,id)),image=d.assets.images[d.characters[e.character].sprite??`sprite_${e.character}`],display=q.story.scenes[story.scene]?.cast.find(c=>c.entity===id)?.display;
      if(place?.kind==='town'&&place.location===location.id&&image&&!cast.some(c=>c.id===e.character))cast.push({id:e.character,name:d.characters[e.character].name,sprite:image,portrait:d.assets.images[d.characters[e.character].portrait],display:clone(display??{})});
    }
  }
  for(const [i,c] of cast.entries())c.x??=c.display?.x??({left:28,center:50,right:72}[c.display?.position])??(cast.length===1?50:cast.length===2?[30,70][i]:[23,40,76,60,15,85,48,52][i%8]);
  const stories=Object.values(d.quests).filter(q=>!j&&q.story?.worldPlaces&&s.quests[q.id].stage==='active'&&atWorldPlace(s,resolveStoryWorldPlace(q.story,s.stories[q.id],q.story.scenes[s.stories[q.id]?.scene??'entry'].place))).map(q=>({id:q.id,title:q.title,enabled:!busy&&!q.requiredParty?.some(actor=>!s.members.includes(actor))}));
  const services=(location.services??[]).map(id=>d.game.services.find(service=>service.id===id))
    .filter(service=>service&&(!interior||service.interior===true))
    .map(service=>{
      const first=d.scripts[service.script]?.commands[0];
      return first?.op==='rest'&&first.cost>0?{...service,label:`${service.label}（${first.cost}G）`}:service;
    });
  return {journey,town:{id:location.id,name:name(location),headingPath,homeDistricts:local,prioritizeDestinations:Boolean(location.choiceOrder),description:location.description,background:d.assets.images[location.background],parent:location.parent?{id:location.parent,name:name(d.locations[location.parent])}:null,interior:Boolean(interior),exit:interior&&!location.parent?{label:location.exitLabel??`${location.name}を出る`,intent:{type:'location.exit'}}:null,breadcrumbs,links,cast,stories,shop:Boolean(location.shop),party:Boolean(location.party),quests:Boolean(location.quests),dungeons:(location.dungeons??[]).map(id=>({id,name:d.dungeons[id].name})),services,busy}};
}
