import {validateContent} from '../core/validation.js';

const clone=value=>structuredClone(value);

function sourceDungeonFor(data,id){
  const source=data.dungeons?.[id]??Object.values(data.dungeons??{}).find(d=>d.art?.wall&&d.art?.floor);
  if(!source)throw new Error('テスト用に流用できる迷宮素材がありません');
  const mapId=source.entries?.main?.map??source.maps?.[0];
  const map=data.maps?.[mapId];
  if(!map)throw new Error('テスト用の基準マップがありません');
  return {source,map};
}

export function installGeneratedDungeon(data,candidate,{
  dungeonId='generated_preview',
  mapId='generated_preview_f1',
  sourceDungeonId='kagaribi',
  name='ランダム生成・エンジン試遊',
  encounters=false,
}={}){
  if(!candidate?.tiles?.length||!candidate.cells)throw new Error('セル種付きの生成候補が必要です');
  const {source,map:sourceMap}=sourceDungeonFor(data,sourceDungeonId);
  const goalScript=`${dungeonId}.goal`;
  data.scripts[goalScript]={commands:[{op:'say',text:'生成された目的地点に到達しました。地形・セル種・歩行処理は現行エンジンで実行されています。'}]};
  const map={
    id:mapId,
    dungeon:dungeonId,
    region:source.region,
    floor:1,
    name,
    tiles:[...candidate.tiles],
    cells:clone(candidate.cells),
    entrance:{x:candidate.entry.x,y:candidate.entry.y,facing:'east'},
    background:sourceMap.background,
    music:sourceMap.music,
    encounter:sourceMap.encounter,
    encounterRate:encounters?sourceMap.encounterRate:0,
    encounterPool:clone(sourceMap.encounterPool??[{encounter:sourceMap.encounter,weight:1}]),
    objects:[{
      id:'generated_goal',
      x:candidate.goal.x,
      y:candidate.goal.y,
      name:'生成目的地',
      kind:'clue',
      trigger:'interact',
      safe:true,
      script:goalScript,
    }],
    initiallyKnown:[`${candidate.entry.x},${candidate.entry.y}`],
  };
  const dungeon={
    schemaVersion:1,
    id:dungeonId,
    name,
    description:'ランダム生成候補を現行GameEngineへ直接ロードする試遊専用迷宮。',
    region:source.region,
    recommendedLevel:1,
    profile:'classic',
    entries:{main:{map:mapId,point:'entrance'}},
    maps:[mapId],
    systems:{},
    fieldEvents:[],
    art:clone(source.art),
    source:{kind:'generated_preview'},
  };
  data.maps[mapId]=map;
  data.dungeons[dungeonId]=dungeon;
  return {dungeonId,mapId,goalScript,map,dungeon};
}

export function prepareGeneratedPlaytestEngine(engine,installed){
  engine.state.vm=[];
  engine.state.waiting=null;
  engine.state.battle=null;
  engine.state.battleResult=null;
  engine.state.notice='';
  delete engine.state.presentation.message;
  delete engine.state.presentation.cast;
  delete engine.state.presentation.castCue;
  engine.teleport(installed.mapId,installed.map.entrance.x,installed.map.entrance.y,installed.map.entrance.facing);
  return engine;
}

export function validateGeneratedPlaytestData(data){
  return validateContent(data);
}
