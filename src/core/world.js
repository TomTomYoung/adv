import {voxelAt} from './voxels.js';
import {closeTo} from './systems/common.js';
import {isRecord} from './expression.js';

export const townRoot=data=>data.game.world?.townRoot;
export const townLocation=(data,state)=>data.locations?.[state.townLocation];
export function locationRoot(data,id){
  const seen=new Set();let location=data.locations?.[id];
  while(location?.parent&&!seen.has(location.id)){seen.add(location.id);location=data.locations[location.parent];}
  return location;
}
export const dungeonInterior=(data,state)=>state.mode==='town'?locationRoot(data,state.townLocation)?.dungeonEntrance??null:null;
export const interiorEntrances=(data,state)=>state.mode==='dungeon'?Object.values(data.locations??{}).filter(l=>l.dungeonEntrance&&atWorldPlace(state,{kind:'dungeon',...l.dungeonEntrance})):[];
export function atWorldPlace(state,place){
  if(!place)return true;
  if(place.kind==='town')return state.mode==='town'&&state.townLocation===place.location;
  return state.mode==='dungeon'&&closeTo(state,place,'here');
}
const arrivalPoint=place=>({map:place.map,x:place.x,y:place.y,...(place.z===undefined?{}:{z:place.z}),...(place.event===undefined?{}:{event:place.event})});
const arrivalWorldPlace=(base,point)=>({kind:'dungeon',dungeon:base.dungeon,...point});
const samePoint=(a,b)=>a?.map===b?.map&&a?.x===b?.x&&a?.y===b?.y&&(a?.z??0)===(b?.z??0)&&a?.event===b?.event;
const pointValid=p=>isRecord(p)&&Object.keys(p).every(k=>['map','x','y','z','event'].includes(k))&&typeof p.map==='string'&&p.map.length>0&&Number.isSafeInteger(p.x)&&Number.isSafeInteger(p.y)&&(p.z===undefined||Number.isSafeInteger(p.z))&&(p.event===undefined||typeof p.event==='string'&&p.event.length>0);

// A journey can bind its destination to the cell where it actually arrived.
// Keep this in the story snapshot so save/load and event rollback share it.
export function resolveStoryWorldPlace(definition,story,key){
  const base=definition?.worldPlaces?.[key],binding=story?.arrivals?.[key];
  return base&&binding?arrivalWorldPlace(base,binding.point):base;
}
export function storyJourneyPlaces(definition,story,action){
  const journey=definition?.actions?.[action]?.journey;if(!journey)return [];
  const base=journey.arrival?definition.worldPlaces?.[journey.to]:resolveStoryWorldPlace(definition,story,journey.to);
  return base?[base,...(journey.arrival?.points??[]).map(point=>arrivalWorldPlace(base,point))]:[];
}
export function storyJourneyArrival(data,state,id,action,encounter){
  const definition=data.quests[id]?.story,journey=definition?.actions?.[action]?.journey,story=state.stories[id];
  if(!journey)return null;
  const place=storyJourneyPlaces(definition,story,action).find(p=>atWorldPlace(state,p));
  if(place)return {place};
  const base=definition.worldPlaces?.[journey.to],location=state.location;
  if(encounter===undefined||!journey.arrival?.encounters?.includes(encounter)||base?.kind!=='dungeon'||state.mode!=='dungeon'||state.dungeons?.active?.id!==base.dungeon||!data.dungeons[base.dungeon]?.maps.includes(location?.map))return null;
  return {place:arrivalWorldPlace(base,arrivalPoint(location)),encounter};
}
export function bindStoryArrival(definition,story,action,arrival){
  const journey=definition.actions[action].journey,base=definition.worldPlaces[journey.to];
  if(!journey.arrival||samePoint(base,arrival.place)&&!story.arrivals?.[journey.to])return;
  story.arrivals={...story.arrivals,[journey.to]:{action,point:arrivalPoint(arrival.place),...(arrival.encounter===undefined?{}:{encounter:arrival.encounter})}};
}
export const storyArrivalEntryId=(quest,place)=>`story-arrival/${quest}/${place}`;
export function consumeStoryArrivalEntry(state,quest,place){
  const entry=state.fieldEntry,point=state.stories[quest]?.arrivals?.[place]?.point;
  if(!entry||!point||entry.map!==point.map||entry.x!==point.x||entry.y!==point.y||(entry.z??0)!==(point.z??0))return;
  const id=storyArrivalEntryId(quest,place);if(!entry.fired.includes(id))entry.fired.push(id);
}
export function storyArrivalErrors(definition,story,data){
  if(story.arrivals===undefined)return [];
  if(!isRecord(story.arrivals))return ['物語の到着地点記録が不正です'];
  const errors=[];
  for(const [key,binding] of Object.entries(story.arrivals)){
    const action=definition.actions?.[binding?.action],journey=action?.journey,base=definition.worldPlaces?.[key],rule=journey?.arrival;
    if(!isRecord(binding)||Object.keys(binding).some(k=>!['action','point','encounter'].includes(k))||!rule||base?.kind!=='dungeon'||journey.to!==key||!story.events.includes(binding.action)||!pointValid(binding.point)){
      errors.push('物語の到着地点・移動行為の参照が不正です');continue;
    }
    const place=arrivalWorldPlace(base,binding.point);
    if(binding.encounter===undefined){
      if(!storyJourneyPlaces(definition,null,binding.action).some(p=>samePoint(p,place)))errors.push('物語の到着地点が移動行為の候補にありません');
    }else if(!rule.encounters?.includes(binding.encounter)||binding.point.event!==undefined)errors.push('物語の到着地点の遭遇条件が不正です');
    if(data)errors.push(...worldPlaceErrors(data,place));
  }
  return errors;
}
function storyPlaceAt(state,definition,story,matches){
  const scenePlace=definition.scenes?.[story?.scene]?.place;
  // A random encounter can share a cell with another authored place. The
  // active bound scene owns that cell until its conversation has finished.
  const at=key=>(story?.arrivals?.[key]?atWorldPlace:matches)(state,resolveStoryWorldPlace(definition,story,key));
  if(story?.arrivals?.[scenePlace]&&at(scenePlace))return scenePlace;
  return Object.keys(definition.worldPlaces).find(at)??'transit';
}
// Same-version saves from before cell-only interaction may contain the old
// derived party holder, or a conversation already opened from the front cell.
// This proximity rule is only for validating and finishing those saved states.
export function legacyWorldPlace(state,place){
  if(!place)return false;
  return place.kind==='town'?atWorldPlace(state,place):state.mode==='dungeon'&&closeTo(state,place,'here-or-front');
}
export function legacyWorldStoryPlace(state,definition,story){
  return storyPlaceAt(state,definition,story,legacyWorldPlace);
}
export function hasWorldConversation(data,state,id){
  const model=data.quests[id]?.model;
  // A completed entry script can recap the ending at any of its placed objects;
  // that text does not resume the final scene at its original world location.
  return state.vm.some(f=>data.scripts[f?.script]?.storyQuest===id||state.quests[id]?.stage==='active'&&
    (model?.entryScript===f?.script||model?.interruptionRoutes?.some(r=>r.shortage===f?.script||r.resume===f?.script)));
}
export function savedWorldConversation(data,state,id){
  const d=data.quests[id]?.story,story=state.stories?.[id],scene=d?.scenes[story?.scene],place=resolveStoryWorldPlace(d,story,scene?.place);
  const at=story?.arrivals?.[scene?.place]?atWorldPlace:legacyWorldPlace;
  return Boolean(place&&state.waiting&&hasWorldConversation(data,state,id)&&at(state,place)&&
    (state.quests[id]?.stage!=='active'||story.values[d.entities.party.holder]===scene.place));
}
const restoredConversations=new WeakMap();
const position=state=>JSON.stringify([state.mode,state.townLocation,state.location?.map,state.location?.x,state.location?.y,state.location?.z??0,state.location?.facing]);
const placePosition=place=>JSON.stringify(place?.kind==='town'?['town',place.location]:['dungeon',place?.map,place?.x,place?.y,place?.z??0]);
export function continuesWorldConversation(engine,id,scene=engine.state.stories[id]?.scene){
  const restored=restoredConversations.get(engine),state=engine.state,d=engine.data.quests[id]?.story,place=resolveStoryWorldPlace(d,state.stories[id],d?.scenes[scene]?.place);
  return Boolean(restored&&restored.state===state&&restored.origin===position(state)&&state.quests[id]?.stage==='active'&&!state.journey&&
    restored.places.get(id)===placePosition(place)&&hasWorldConversation(engine.data,state,id));
}
// Called only after the entire save has passed validation. The grant is never
// serialized; saving during this conversation simply preserves its existing VM.
export function restoreWorldConversations(engine){
  restoredConversations.delete(engine);
  const places=new Map();
  for(const [id,s] of Object.entries(engine.state.stories)){
    const d=engine.data.quests[id]?.story,place=resolveStoryWorldPlace(d,s,d?.scenes[s.scene]?.place);
    if(savedWorldConversation(engine.data,engine.state,id)&&!atWorldPlace(engine.state,place))places.set(id,placePosition(place));
  }
  if(places.size)restoredConversations.set(engine,{state:engine.state,origin:position(engine.state),places});
  syncWorldStories(engine);
}
export function finishWorldConversations(engine){
  if(restoredConversations.delete(engine))syncWorldStories(engine);
}
// Between conversations the party follows the actual world position. NPCs stay
// where they were left; declared journey companions travel with the party.
export function worldStoryPlace(state,definition,story){
  return storyPlaceAt(state,definition,story,atWorldPlace);
}
export function syncWorldStories(engine){
  for(const [id,s] of Object.entries(engine.state.stories)){
    const d=engine.data.quests[id]?.story;
    if(d?.worldPlaces&&engine.state.quests[id].stage==='active'&&engine.state.journey?.quest!==id&&!continuesWorldConversation(engine,id))s.values[d.entities.party.holder]=worldStoryPlace(engine.state,d,s);
  }
  const restored=restoredConversations.get(engine);
  if(restored&&![...restored.places.keys()].some(id=>continuesWorldConversation(engine,id)))restoredConversations.delete(engine);
}
export function worldPlaceName(data,place){
  if(place?.kind==='town')return data.locations[place.location]?.name??place.location;
  return place?`${data.dungeons[place.dungeon]?.name} / ${data.maps[place.map]?.name} (${place.x}, ${place.y}${place.z===undefined?'':', '+place.z})`:'';
}
export function worldPlaceErrors(data,place){
  if(place?.kind==='town')return data.locations?.[place.location]?[]:['存在しない町ロケーションです'];
  const d=data.dungeons?.[place?.dungeon],m=data.maps[place?.map];
  if(place?.kind!=='dungeon'||!d||!m||!d.maps.includes(place.map))return ['ダンジョンと所属マップの参照が不正です'];
  if(!Number.isInteger(place.x)||!Number.isInteger(place.y)||!Number.isInteger(place.z??0)||(m.voxels?voxelAt(m,null,{x:place.x,y:place.y,z:place.z??0})!=='.':(place.z??0)!==0||m.tiles[place.y]?.[place.x]!=='.'))return ['通行不能または範囲外の地点です'];
  if(place.event&&!m.objects.some(o=>o.id===place.event&&o.x===place.x&&o.y===place.y&&(o.z??0)===(place.z??0)))return ['実イベントの配置と一致しません'];
  return [];
}
export function validateWorld(data){
  if(!data.game.world)return [];
  const errors=[],fail=(id,text)=>errors.push(`${id}: ${text}`),locations=data.locations??{},root=townRoot(data);
  if(!locations[root]||locations[root].parent!==null)fail('world','町の起点が不正です');
  const owners=new Map();
  for(const d of Object.values(data.dungeons))for(const map of d.maps){
    if(owners.has(map))fail(map,'所属ダンジョンが重複しています');owners.set(map,d.id);
  }
  for(const m of Object.values(data.maps))if(!owners.has(m.id)||m.dungeon!==owners.get(m.id))fail(m.id,'マップの所属ダンジョンが一致しません');
  for(const [id,l] of Object.entries(locations)){
    if(l.id!==id||!l.name||!l.description||!data.assets.images[l.background])fail(id,'ロケーション名・本文・背景が不正です');
    if(id!==root&&!locations[l.parent]&&!l.dungeonEntrance)fail(id,'親ロケーションまたはダンジョン入口がありません');
    if(l.dungeonEntrance){
      if(l.parent!==null||!['north','east','south','west'].includes(l.dungeonEntrance.facing))fail(id,'室内入口は独立したルートと退出時の向きが必要です');
      for(const error of worldPlaceErrors(data,{kind:'dungeon',...l.dungeonEntrance}))fail(id,error);
      if(Object.values(data.dungeons[l.dungeonEntrance.dungeon]?.systems??{}).some(s=>s.use==='compartment_water'&&s.zones.some(z=>z.map===l.dungeonEntrance.map)))fail(id,'室内入口は完全水没しない区画へ置いてください');
    }
    const seen=new Set([id]);let parent=l.parent;
    while(parent){if(seen.has(parent)){fail(id,'親子関係が循環しています');break;}seen.add(parent);parent=locations[parent]?.parent;}
    for(const next of l.links??[])if(!locations[next])fail(id,'移動先がありません');else if(locationRoot(data,next)?.id!==locationRoot(data,id)?.id)fail(id,'町とダンジョン室内を直接つなぐことはできません');
    for(const c of l.cast??[])if(!data.characters[c.character]||!data.assets.images[c.sprite]||!Number.isFinite(c.x)||c.x<0||c.x>100)fail(id,'人物またはスプライト配置が不正です');
    for(const service of l.services??[])if(!data.game.services.some(s=>s.id===service))fail(id,'施設サービスがありません');
    for(const d of l.dungeons??[])if(!data.dungeons[d])fail(id,'接続するダンジョンがありません');
  }
  for(const q of Object.values(data.quests)){
    for(const e of q.events??[])for(const p of e.points??[])if(!data.dungeons[p.dungeon]||p.dungeon!==owners.get(p.map))fail(q.id,`${e.id}: 配置点の所属ダンジョンが不正です`);
    for(const [key,p] of Object.entries(q.story?.worldPlaces??{})){
      if(!q.story.places[key])fail(q.id,`${key}: 物語の場所がありません`);
      for(const e of worldPlaceErrors(data,p))fail(`${q.id}/${key}`,e);
    }
    if(q.story?.worldPlaces){
      for(const scene of Object.values(q.story.scenes))if(!q.story.worldPlaces[scene.place])fail(q.id,'場面の実在する場所が未定義です');
      for(const [id,a] of Object.entries(q.story.actions))if(a.journey){
        if(a.cost||a.ending||!q.story.worldPlaces[a.journey.to]||q.story.scenes[a.to]?.place!==a.journey.to||!Array.isArray(a.depart)||!Array.isArray(a.journey.companions)||a.journey.companions.some(e=>e==='party'||!q.story.entities[e]))fail(q.id,`${id}: 移動行為の定義が不正です`);
        const rule=a.journey.arrival;
        if(rule!==undefined){
          const base=q.story.worldPlaces[a.journey.to];
          if(!isRecord(rule)||Object.keys(rule).some(k=>!['points','encounters'].includes(k))||base?.kind!=='dungeon'||(!rule.points?.length&&!rule.encounters?.length)){
            fail(q.id,`${id}: 移動行為の到着条件が不正です`);continue;
          }
          if(rule.points!==undefined){
            if(!Array.isArray(rule.points)||!rule.points.length)fail(q.id,`${id}: 追加到着地点の一覧が不正です`);
            else{
              const points=[base];
              for(const point of rule.points){
                if(!pointValid(point)){fail(q.id,`${id}: 追加到着地点が不正です`);continue;}
                const place=arrivalWorldPlace(base,point);
                if(points.some(p=>p.map===place.map&&p.x===place.x&&p.y===place.y&&(p.z??0)===(place.z??0)))fail(q.id,`${id}: 到着地点が重複しています`);
                points.push(place);
                for(const error of worldPlaceErrors(data,place))fail(q.id,`${id}: ${error}`);
              }
            }
          }
          if(rule.encounters!==undefined&&(!Array.isArray(rule.encounters)||!rule.encounters.length||new Set(rule.encounters).size!==rule.encounters.length||rule.encounters.some(encounter=>typeof encounter!=='string'||!Object.hasOwn(data.encounters,encounter))))fail(q.id,`${id}: 到着する歩行遭遇の一覧が不正です`);
        }
      }
    }
  }
  return errors;
}
