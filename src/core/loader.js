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
  projectQuestObjects(data);
  const errors=validateContent(data);
  if(errors.length) throw new Error(`シナリオ検証エラー\n${errors.join('\n')}`);
  return data;
}
