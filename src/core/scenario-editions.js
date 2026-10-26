import {isRecord} from './expression.js';

// These identify playable narrative editions, independently of contentVersion
// and each story's state-schema revision. Add newly shipped editions here too.
const supportedEditions=new Set(['e1','e2']);
export const LEGACY_SCENARIO_EDITIONS={schemaVersion:1,latest:'e1',editions:{e1:{label:'初版',questOverrides:{}}}};
const known=id=>typeof id==='string'&&supportedEditions.has(id);
const dataPath=path=>typeof path==='string'&&/^data\/[a-zA-Z0-9_./-]+\.json$/.test(path)&&path.split('/').every(part=>part&&part!=='.'&&part!=='..');

export function resolveScenarioEdition(catalog=LEGACY_SCENARIO_EDITIONS,requested='latest'){
  if(!isRecord(catalog)||catalog.schemaVersion!==1||!isRecord(catalog.editions)||!Object.hasOwn(catalog.editions,'e1')||!known(catalog.latest)||!Object.hasOwn(catalog.editions,catalog.latest))throw Error('シナリオ版の一覧が不正です。');
  for(const [id,edition] of Object.entries(catalog.editions)){
    if(!known(id)||!isRecord(edition)||typeof edition.label!=='string'||!edition.label.trim()||!isRecord(edition.questOverrides))throw Error('シナリオ版の定義が不正です。');
    for(const [quest,path] of Object.entries(edition.questOverrides))if(!/^[a-z][a-z0-9_]*$/.test(quest)||!dataPath(path))throw Error('シナリオ版の差替え先が不正です。');
    if(edition.geography!==undefined&&!dataPath(edition.geography))throw Error('シナリオ版の地理定義先が不正です。');
    if(edition.additions!==undefined&&!dataPath(edition.additions))throw Error('シナリオ版の追加定義先が不正です。');
    if(edition.regionalAdditions!==undefined&&!dataPath(edition.regionalAdditions))throw Error('シナリオ版の地域追加先が不正です。');
    if(edition.saveRevision!==undefined&&(!Number.isSafeInteger(edition.saveRevision)||edition.saveRevision<1))throw Error('シナリオ版の保存改訂番号が不正です。');
  }
  const id=requested==='latest'?catalog.latest:requested;
  if(!known(id)||!Object.hasOwn(catalog.editions,id))throw Error(`対応していないシナリオ版です: ${String(requested)}`);
  return id;
}

// Reading the envelope precedes content migration, so a different edition can
// never reinterpret old VM positions or reset that edition's quest rewards.
export function readSavedScenarioEdition(save){
  if(!isRecord(save)||save.saveVersion!==1||!isRecord(save.state)||save.state.version!==1||typeof save.gameId!=='string'||!save.gameId||save.gameId!==save.state.gameId||typeof save.contentVersion!=='string'||!save.contentVersion||save.contentVersion!==save.state.contentVersion)throw Error('記録の形式が不正です。');
  const outer=Object.hasOwn(save,'scenarioEdition'),inner=Object.hasOwn(save.state,'scenarioEdition');
  if(!outer&&!inner)return 'e1';
  if(!outer||!inner||!known(save.scenarioEdition)||save.scenarioEdition!==save.state.scenarioEdition)throw Error('記録のシナリオ版が不正または不一致です。');
  readSavedScenarioRevision(save);
  return save.scenarioEdition;
}

export const scenarioSaveRevision=data=>data.scenarioEditions?.editions[data.scenarioEdition??'e1']?.saveRevision??1;
export function readSavedScenarioRevision(save){
  const outer=Object.hasOwn(save,'scenarioRevision'),inner=Object.hasOwn(save.state,'scenarioRevision');
  if(!outer&&!inner)return 1;
  if(!outer||!inner||!Number.isSafeInteger(save.scenarioRevision)||save.scenarioRevision<1||save.scenarioRevision!==save.state.scenarioRevision)throw Error('記録の保存改訂番号が不正または不一致です。');
  return save.scenarioRevision;
}
export function scenarioRevisionError(save,data){
  try{if(readSavedScenarioRevision(save)!==scenarioSaveRevision(data))return '第2版の地理・依頼の更新により、この旧記録は非対応になりました。「記録」から第2版の新しい旅を始めてください。初版の記録は引き続き利用できます。';}
  catch(error){return error.message;}
  return '';
}

export function savedScenarioEdition(text){
  if(typeof text!=='string')throw Error('記録はJSON文字列で指定してください。');
  let save;try{save=JSON.parse(text);}catch{throw Error('記録のJSONが不正です。');}
  return readSavedScenarioEdition(save);
}
