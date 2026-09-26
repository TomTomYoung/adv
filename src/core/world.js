import {voxelAt} from './voxels.js';
import {closeTo} from './systems/common.js';

export const townRoot=data=>data.game.world?.townRoot;
export const townLocation=(data,state)=>data.locations?.[state.townLocation];
export function locationRoot(data,id){
  const seen=new Set();let location=data.locations?.[id];
  while(location?.parent&&!seen.has(location.id)){seen.add(location.id);location=data.locations[location.parent];}
  return location;
}
export const dungeonInterior=(data,state)=>state.mode==='town'?locationRoot(data,state.townLocation)?.dungeonEntrance??null:null;
export const interiorEntrances=(data,state)=>state.mode==='dungeon'?Object.values(data.locations??{}).filter(l=>l.dungeonEntrance&&atWorldPlace(state,{kind:'dungeon',...l.dungeonEntrance},{exact:true})):[];
export function atWorldPlace(state,place,{exact=false}={}){
  if(!place)return true;
  if(place.kind==='town')return state.mode==='town'&&state.townLocation===place.location;
  return state.mode==='dungeon'&&closeTo(state,place)&&(!exact||state.location.x===place.x&&state.location.y===place.y);
}
// Between conversations the party follows the actual world position. NPCs stay
// where they were left; declared journey companions travel with the party.
export function worldStoryPlace(state,definition){
  return Object.entries(definition.worldPlaces).find(([,p])=>atWorldPlace(state,p))?.[0]??'transit';
}
export function syncWorldStories(engine){
  for(const [id,s] of Object.entries(engine.state.stories)){
    const d=engine.data.quests[id]?.story;
    if(d?.worldPlaces&&engine.state.quests[id].stage==='active'&&engine.state.journey?.quest!==id)s.values[d.entities.party.holder]=worldStoryPlace(engine.state,d);
  }
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
      }
    }
  }
  return errors;
}
