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
  encounter=null,
}={}){
  if(!candidate?.tiles?.length||!candidate.cells)throw new Error('セル種付きの生成候補が必要です');
  const {source,map:sourceMap}=sourceDungeonFor(data,sourceDungeonId);
  const goalScript=`${dungeonId}.goal`;
  const configuredEnemies=(encounter?.enemies??[]).filter(id=>Object.hasOwn(data.enemies??{},id));
  const encounterId=configuredEnemies.length?`${dungeonId}.encounter`:sourceMap.encounter;
  if(configuredEnemies.length)data.encounters[encounterId]={
    id:encounterId,
    text:'試遊設定の魔物が現れた。',
    escape:true,
    enemies:[...configuredEnemies],
  };
  const encounterEnabled=encounter?.enabled??encounters;
  const encounterRate=encounter?.rate??sourceMap.encounterRate;
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
    encounter:encounterId,
    encounterRate:encounterEnabled?encounterRate:0,
    encounterPool:[{encounter:encounterId,weight:1}],
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
  return {dungeonId,mapId,goalScript,encounterId,map,dungeon};
}

export function applyGeneratedPlaytestParty(engine,party){
  const rows=(party??[]).filter(row=>row&&Object.hasOwn(engine.data.actors,row.id));
  if(!rows.length)return engine;
  const unique=[];for(const row of rows)if(!unique.some(item=>item.id===row.id))unique.push(row);
  if(unique.length>engine.data.system.maxParty)throw new Error(`試遊パーティは${engine.data.system.maxParty}人までです`);
  engine.state.members=unique.map(row=>row.id);
  for(const row of unique){
    const actor=engine.state.actors[row.id],level=Math.max(1,Math.min(engine.data.system.maxLevel,Math.floor(row.level??1)));
    actor.level=level;
    actor.xp=level>1?engine.data.system.xpBase*(level-1)*level:0;
    if(engine.data.jobs)actor.growthHistory=level>1?{[actor.job]:level-1}:{};
    actor.statuses=[];
  }
  return engine;
}

export function prepareGeneratedPlaytestEngine(engine,installed,{party=null}={}){
  engine.state.vm=[];
  engine.state.waiting=null;
  engine.state.battle=null;
  engine.state.battleResult=null;
  engine.state.notice='';
  delete engine.state.presentation.message;
  delete engine.state.presentation.cast;
  delete engine.state.presentation.castCue;
  applyGeneratedPlaytestParty(engine,party);
  engine.teleport(installed.mapId,installed.map.entrance.x,installed.map.entrance.y,installed.map.entrance.facing);
  for(const id of engine.state.members){const actor=engine.state.actors[id],stats=engine.stats(id);actor.hp=stats.hp;actor.mp=stats.mp;actor.statuses=[];}
  return engine;
}

export function validateGeneratedPlaytestData(data){
  return validateContent(data);
}
