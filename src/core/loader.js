import {applyEditionGeography} from './edition-geography.js';
import {projectQuestObjects} from './quest-events.js';
import {LEGACY_SCENARIO_EDITIONS,resolveScenarioEdition} from './scenario-editions.js';
import { validateContent } from './validation.js';
export async function loadContent(read = async path => {
  const response = await fetch(new URL(`../../${path}`, import.meta.url),{cache:'no-store'});
  if (!response.ok) throw new Error(`読込失敗: ${path} (${response.status})`);
  return response.json();
},{edition='e1'}={}) {
  const game = await read('data/game.json');
  const data = {game, maps:{}, quests:{}, scripts:{}};
  const merge = (dest, source, label) => {
    for(const [key,value] of Object.entries(source)) {
      if(Object.hasOwn(dest,key)) throw new Error(`${label} ID重複: ${key}`);
      dest[key]=value;
    }
  };
  const paths = [...Object.entries(game.files.databases).map(([type,path])=>({type,path})), ...game.files.maps.map(path=>({type:'map',path})), ...game.files.quests.map(path=>({type:'quest',path})), ...game.files.scripts.map(path=>({type:'script',path}))];
  const docs = await Promise.all(paths.map(async entry=>({...entry,value:await read(entry.path)})));
  const catalogDocument=docs.find(doc=>doc.type==='scenarioEditions');
  const catalog=catalogDocument?catalogDocument.value:structuredClone(LEGACY_SCENARIO_EDITIONS);
  data.scenarioEdition=resolveScenarioEdition(catalog,edition);data.scenarioEditions=catalog;
  const baseQuests=new Set(docs.filter(doc=>doc.type==='quest').map(doc=>doc.value.id));
  const overrides=await Promise.all(Object.entries(catalog.editions[data.scenarioEdition].questOverrides).map(async([id,path])=>{
    if(!baseQuests.has(id))throw Error(`シナリオ差替え元の依頼がありません: ${id}`);
    const quest=await read(path);
    if(!quest||quest.id!==id)throw Error(`シナリオ差替え先の依頼IDが一致しません: ${id}`);
    return [id,quest];
  }));
  const selectedQuests=new Map(overrides);
  for(const {type,value} of docs) {
    if(type==='map') {
      if(value.objects.some(o=>o.quest))throw Error(`${value.id}: クエスト専用objectはクエストJSONに定義してください`);
      merge(data.maps,{[value.id]:value},type);
    }
    else if(type==='quest') {const quest=selectedQuests.get(value.id)??value;merge(data.quests,{[quest.id]:quest},type);merge(data.scripts,quest.scripts,'script');}
    else if(type==='script') merge(data.scripts,value.scripts,type);
    else data[type]=value;
  }
  const additionsPath=catalog.editions[data.scenarioEdition].additions;
  if(additionsPath){
    const additions=await read(additionsPath);
    if(additions?.schemaVersion!==1||!Array.isArray(additions.quests)||!additions.quests.length||!additions.locations||!additions.characters)throw Error('シナリオ版の追加定義が不正です。');
    for(const key of Object.keys(additions))if(!['schemaVersion','quests','locations','characters','regions'].includes(key))throw Error(`未対応の追加定義: ${key}`);
    if(!Array.isArray(additions.regions))throw Error('追加地域の一覧が不正です。');
    data.regions=[...data.regions];
    for(const region of additions.regions){if(!Number.isInteger(region.id)||region.id<1||data.regions.some(r=>r.id===region.id))throw Error('追加地域のID重複または不正');data.regions.push(region);}
    merge(data.locations,additions.locations,'location');merge(data.characters,additions.characters,'character');
    const ids=[];
    for(const quest of additions.quests){
      if(!quest||typeof quest.id!=='string')throw Error('追加依頼のIDが不正です。');
      merge(data.quests,{[quest.id]:quest},'quest');merge(data.scripts,quest.scripts,'script');ids.push(quest.id);
    }
    if(data.questOrder)data.questOrder={...data.questOrder,ids:[...data.questOrder.ids,...ids]};
    data.game={...game,subtitle:`${Object.keys(data.quests).length}の依頼と、帰還の記録`,questAdditions:[...(game.questAdditions??[]),{ids}]};
  }
  const geography=catalog.editions[data.scenarioEdition].geography;
  if(geography){
    const legacy=structuredClone(data);projectQuestObjects(legacy);
    await applyEditionGeography(data,await read(geography));
    data.worldTravelLegacy=legacy;
  }
  projectQuestObjects(data);
  const errors=validateContent(data);
  if(errors.length) throw new Error(`シナリオ検証エラー\n${errors.join('\n')}`);
  return data;
}
