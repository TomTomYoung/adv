import {gearErrors} from './equipment.js';
import {voxelMapState,voxelOccupancyReason,voxelAt,voxelPoint} from './voxels.js';
import {scaledEnemy} from './enemy.js';
import {freshDungeons,enterDungeon,validateDungeonState,DUNGEON_SYSTEMS,dungeonTile,dungeonBlock,dungeonWaterAccess} from './dungeons.js';
import {storyStateErrors,storyEnding} from './story.js';
import {actorStats,canEquip} from './jobs.js';
import {validateJobState} from './job-validation.js';
import {layersValid} from './feedback-validation.js';
import {isRecord,clone,evaluate} from './expression.js';
import {commandsAt} from './script.js';
import {freshRecords,snapshotRecords,recordsValid} from './records.js';
function addScenarioState(save,data){
  const s=save.state;
  for(const id of Object.keys(data.quests))s.quests[id]??={stage:'available',evidence:[],outcome:null};
  s.records=freshRecords(false);
  if(s.battle){
    s.records.battles=1;
    // An old save has no trustworthy pre-save kills. Do not count its dead enemies again.
    s.battle.recordedKills=s.battle.enemies.filter(e=>e.hp===0).map(e=>e.instance);
  }
  for(const [id,q] of Object.entries(s.quests))if(q.stage==='active')s.records.baselines[id]=snapshotRecords(s.records);
}
function keepLegacyRoutes(save,data,migration){
  save.state.stories??={};
  const storyRoutes=save.state.flags.legacyStoryRoutes??={};
  for(const [id,q] of Object.entries(save.state.quests))if(q.stage!=='available'&&data.quests[id]?.story)storyRoutes[id]=true;
  if(!migration.legacyQuestRouting)return;
  const routes=save.state.flags.legacyQuestRoutes??={};
  for(const [id,q] of Object.entries(save.state.quests))if(q.stage==='active'&&data.quests[id]?.model.flowVersion>=2)routes[id]=true;
}
function upgradeStoryRevisions(original,data){
  if(!isRecord(original.state?.stories))return original;
  let save=original;
  for(const [id,q] of Object.entries(data.quests)){
    const current=save.state.stories[id];
    if(!current||!q.story||(current.revision??1)===(q.story.revision??1))continue;
    const upgrade=q.model.storyUpgrades?.find(u=>u.fromRevision===(current.revision??1)&&u.toRevision===(q.story.revision??1));
    if(!upgrade)continue;
    // Validate the entire old save against its shipped definition before transforming it.
    const previousData={...data,quests:{...data.quests,[id]:{...q,story:upgrade.previous}}};
    if(validateSave(save,previousData).length)return original;
    save=clone(save);
    for(const change of upgrade.values){
      if(!Object.hasOwn(q.story.registry,change.key))throw Error('移行先に未登録の物語状態があります');
      if(change.when===undefined||evaluate(change.when,save.state))save.state.stories[id].values[change.key]=clone(evaluate(change.value,save.state));
    }
    save.state.stories[id].revision=upgrade.toRevision;
  }
  return save;
}
function migrateContentSave(original,data){
  if(!isRecord(original))return original;
  if(original.contentVersion===data.game.version)return upgradeStoryRevisions(original,data);
  const migration=data.game.migrations?.[original.contentVersion];if(!migration)return original;
  if(migration.environmentRevision){
    // Validate the old version's system membership before adding only the missing state.
    const dungeons=clone(data.dungeons);
    for(const [id,systems] of Object.entries(migration.addedSystems))for(const system of systems)delete dungeons[id].systems[system];
    const legacy={...data,dungeons,game:{...data.game,version:original.contentVersion}};
    if(validateSave(original,legacy).length)return original;
    const save=clone(original),s=save.state;save.contentVersion=data.game.version;s.contentVersion=data.game.version;
    for(const [id,persistent] of Object.entries(s.dungeons.persistent))for(const [system,spec] of Object.entries(data.dungeons[id].systems))if(spec.enabled!==false){
      const implementation=DUNGEON_SYSTEMS[spec.use];
      persistent.systems[system]??=implementation.createPersistent(spec);
      if(s.dungeons.active?.id===id)s.dungeons.active.systems[system]??=implementation.createRun(spec);
    }
    return upgradeStoryRevisions(save,data);
  }
  const oldQuests=Object.fromEntries((migration.quests??Object.keys(data.quests)).map(id=>[id,data.quests[id]]));
  if(migration.dungeonRevision){
    const legacy={...data,game:{...data.game,version:original.contentVersion,dungeonVersion:undefined}};
    if(validateSave(original,legacy).length)return original;
    const save=clone(original);save.contentVersion=data.game.version;save.state.contentVersion=data.game.version;return upgradeStoryRevisions(save,{...data,game:{...data.game,dungeonVersion:undefined}});
  }
  if(migration.scenarioRevision){
    const legacy={...data,quests:oldQuests,game:{...data.game,version:original.contentVersion,dungeonVersion:undefined,storyVersion:undefined,recordVersion:migration.preserveRecords?data.game.recordVersion:undefined}};
    if(validateSave(original,legacy).length)return original;
    const save=clone(original);save.contentVersion=data.game.version;save.state.contentVersion=data.game.version;
    if(!migration.preserveRecords)addScenarioState(save,data);
    keepLegacyRoutes(save,data,migration);return save;
  }
  // Old records must pass their old growth limits before any normalization.
  const legacy={...data,quests:oldQuests,jobs:undefined,game:{...data.game,version:original.contentVersion,dungeonVersion:undefined,storyVersion:undefined,recordVersion:undefined},actors:Object.fromEntries(migration.actors.map(id=>[id,data.actors[id]]))};
  if(validateSave(original,legacy).length)return original;
  const save=clone(original),s=save.state;
  save.contentVersion=data.game.version;s.contentVersion=data.game.version;
  for(const [id,definition] of Object.entries(data.actors)){
    if(!s.actors[id])s.actors[id]={id,hp:definition.stats.hp+data.system.growth.hp*(s.level-1),mp:definition.stats.mp+data.system.growth.mp*(s.level-1),statuses:[],equipment:{}};
    const actor=s.actors[id];
    if(data.jobs){
      actor.job=definition.initialJob;actor.growthHistory={legacy:s.level-1};
      for(const [slot,item] of Object.entries(actor.equipment))if(!canEquip(data,s,id,item)){
        const count=(s.inventory[item]??0)+1;
        if(count>data.system.maxStack)throw new Error(`${data.items[item].name}の袋が満杯のため職業付きセーブへ移行できません。旧版で空きを作ってください。`);
        s.inventory[item]=count;delete actor.equipment[slot];
      }
      const stats=actorStats(data,s,id,false);actor.hp=Math.min(actor.hp,stats.hp);actor.mp=Math.min(actor.mp,stats.mp);
    }
  }
  if(data.jobs&&s.battle){s.battle.buffs=[];s.battle.covers=[];s.battle.analyzed=[];}
  addScenarioState(save,data);
  keepLegacyRoutes(save,data,migration);

  return save;
}
export function migrateSave(original,data){
  const migrated=migrateContentSave(original,data);
  if(!data.game.dungeonVersion||migrated?.contentVersion!==data.game.version||original?.contentVersion===data.game.version)return migrated;
  if(data.game.migrations?.[original?.contentVersion]?.environmentRevision)return migrated;
  const save=clone(migrated);save.state.dungeons=freshDungeons();
  if(save.state.mode==='dungeon')enterDungeon({data,state:save.state,notify:()=>{}},save.state.location.map);
  return save;
}
export function validateSave(save,data){
  const errors=[],fail=s=>errors.push(s),integer=(v,min,max)=>Number.isInteger(v)&&v>=min&&v<=max;
  if(!isRecord(save)||save.saveVersion!==1||save.gameId!==data.game.id||save.contentVersion!==data.game.version)return ['作品またはセーブ形式のバージョンが一致しません'];
  const s=save.state;if(!isRecord(s))return ['状態がありません'];
  if(s.gameId!==data.game.id||s.contentVersion!==data.game.version||s.version!==1)fail('状態のバージョン不正');
  for(const key of ['flags','vars','actors','inventory','quests','objects','events','discovered','presentation'])if(!isRecord(s[key]))fail(`${key}不正`);
  for(const key of ['members','journal','log','vm'])if(!Array.isArray(s[key]))fail(`${key}不正`);
  if(errors.length)return errors;
  const checkPlain=(v,depth=0)=>{
    if(depth>48){fail('入れ子超過');return;}
    if(typeof v==='number'&&!Number.isFinite(v))fail('数値不正');
    if(v&&typeof v==='object')for(const [key,value] of Object.entries(v)){if(['__proto__','constructor','prototype'].includes(key))fail('予約キー不正');checkPlain(value,depth+1);}
  };checkPlain(s);
  if(data.game.recordVersion===1&&!recordsValid(s.records,data))fail('戦績状態不正');
  if(!['town','dungeon'].includes(s.mode))fail('モード不正');
  for(const [key,min,max] of [['gold',0,1e9],['xp',0,1e9],['level',1,data.system.maxLevel],['steps',0,1e9],['light',0,data.system.lightCapacity],['rng',1,4294967295]])if(!integer(s[key],min,max))fail(`${key}不正`);
  if(s.mode==='dungeon'){
    const l=s.location,m=data.maps[l?.map];
    try{if(!m||!integer(l?.z??0,-32,32)||(m.voxels?(!Number.isSafeInteger(l.z)||Boolean(voxelOccupancyReason(m,voxelMapState(data,s,m),l,{waterAccess:dungeonWaterAccess(data,s)}))):((l?.z??0)!==0||dungeonTile(data,s,m,l?.x,l?.y)!=='.'))||!['north','east','south','west'].includes(l?.facing))fail('位置不正');}catch{fail('位置または地形状態不正');}
  }else if(s.location!==null)fail('町の位置不正');
  if(!layersValid(s.presentation.layers))fail('画面レイヤー不正');
  if(s.members.length<1||s.members.length>data.system.maxParty||new Set(s.members).size!==s.members.length||s.members.some(id=>!data.actors[id]))fail('隊員不正');
  if(Object.keys(s.actors).some(id=>!Object.hasOwn(data.actors,id)))fail('未知の隊員状態');
  for(const [id,definition] of Object.entries(data.actors)){
    const actor=s.actors[id];if(!isRecord(actor)||!isRecord(actor.equipment)||!Array.isArray(actor.statuses)){fail('隊員状態不正');continue;}
    let stats;
    try{stats=actorStats(data,s,id,false);}catch{fail('職業または能力不正');continue;}
    for(const [slot,itemId] of Object.entries(actor.equipment)){const item=data.items[itemId];if(!item||item.slot!==slot)fail('装備不正');}
    if(actor.id!==id||!integer(actor.hp,0,stats.hp)||!integer(actor.mp,0,stats.mp)||actor.statuses.some(x=>!data.statuses[x]))fail('HP・MP・状態異常不正');
  }
  errors.push(...gearErrors(data,s),...validateJobState(data,s));
  for(const [id,count] of Object.entries(s.inventory))if(!data.items[id]||!integer(count,0,data.system.maxStack))fail('所持品不正');
  for(const [id,q] of Object.entries(data.quests)){
    const qs=s.quests[id];if(!isRecord(qs)||!['available','active','completed'].includes(qs.stage)||!Array.isArray(qs.evidence)){fail('依頼状態不正');continue;}
    if(data.game.recordVersion===1&&qs.stage==='active'&&!s.records?.baselines?.[id])fail('受注時の戦績がありません');
    const evidenceKeys=q.locations.filter(loc=>loc.role!=='decision').map(loc=>loc.role);
    if(qs.evidence.some(e=>!evidenceKeys.includes(e))||new Set(qs.evidence).size!==qs.evidence.length)fail('証拠不正');
    if(qs.stage==='completed'?!q.outcomes[qs.outcome]:qs.outcome!==null)fail('結末不正');
  }
  if(data.game.storyVersion===1){
    if(!isRecord(s.stories))fail('物語状態不正');
    else for(const [id,story] of Object.entries(s.stories)){
      const def=data.quests[id]?.story;
      if(!def){fail('不明な物語状態');continue;}
      try{errors.push(...storyStateErrors(def,story,s,id,{scene:s.quests[id]?.stage==='active'}));}catch{fail('物語状態不正');}
    }
    for(const [id,q] of Object.entries(data.quests))if(q.story&&s.quests[id]?.stage==='completed'&&!s.flags.legacyStoryRoutes?.[id])try{storyEnding({data,state:s},id,s.quests[id].outcome);}catch{fail('物語の結末条件不正');}
  }
  if(s.trackedQuest!==null&&!data.quests[s.trackedQuest])fail('追跡依頼不正');
  for(const [id,cells] of Object.entries(s.discovered)){const map=data.maps[id];if(!map||!Array.isArray(cells)||cells.some(c=>typeof c!=='string'||!(map.voxels?/^\d+,\d+,-?\d+$/:/^\d+,\d+$/).test(c)||map.voxels&&voxelAt(map,null,voxelPoint(c))===null))fail('地図不正');}
  if(s.vm.length>32)fail('スタック超過');
  if(!integer(s.nextScope,1,1e9))fail('スクリプトスコープ不正');
  for(const frame of s.vm){try{if(!isRecord(frame)||!Array.isArray(frame.path)||!isRecord(frame.local)||!integer(frame.scope,1,s.nextScope-1)||typeof frame.branch!=='boolean'||frame.path.some(p=>typeof p!=='string'&&!Number.isInteger(p))||frame.path.some(p=>['__proto__','constructor','prototype'].includes(p)))throw Error();const commands=commandsAt(data,frame);if(!integer(frame.index,0,commands.length))throw Error();}catch{fail('スクリプト位置不正');}}
  if(s.waiting!==null){
    if(!isRecord(s.waiting)||!['text','choice','battle'].includes(s.waiting.type))fail('待機状態不正');
    else if(s.waiting.type==='text'&&(!s.vm.length||typeof s.waiting.text!=='string'||typeof s.waiting.speaker!=='string'))fail('会話不正');
    else if(s.waiting.type==='choice'){try{const f=s.vm.at(-1),c=commandsAt(data,f)[s.waiting.index];if(c?.op!=='choice'||f.index!==s.waiting.index+1)fail('選択肢位置不正');}catch{fail('選択肢不正');}}
  }
  if(s.battle!==null){
    const b=s.battle,e=data.encounters[b?.encounter];
    if(!isRecord(b)||!e||!Array.isArray(b.enemies)||b.enemies.length!==e.enemies.length||!Array.isArray(b.acted)||!Array.isArray(b.guards)||!Array.isArray(b.log)||!integer(b.round,1,1e6)){fail('戦闘状態不正');}
    else{
      if(b.enemyScale!==undefined&&(!Number.isFinite(b.enemyScale)||b.enemyScale<.1||b.enemyScale>5))fail('敵の環境倍率不正');
      if(data.game.recordVersion===1&&(!Array.isArray(b.recordedKills)||new Set(b.recordedKills).size!==b.recordedKills.length||b.recordedKills.some(id=>!b.enemies.some(e=>e?.instance===id&&e.hp===0))))fail('撃破記録不正');
      if(new Set(b.acted).size!==b.acted.length||new Set(b.guards).size!==b.guards.length||b.acted.some(id=>!s.members.includes(id))||b.guards.some(id=>!s.members.includes(id)))fail('行動済み隊員不正');
      b.enemies.forEach((enemy,i)=>{const def=scaledEnemy(data.enemies[e.enemies[i]],i,b.enemyScale??1);if(!isRecord(enemy)||enemy.id!==def.id||enemy.instance!==`enemy_${i}`||JSON.stringify(enemy.stats)!==JSON.stringify(def.stats)||JSON.stringify(enemy.resist)!==JSON.stringify(def.resist)||JSON.stringify(enemy.ai)!==JSON.stringify(def.ai)||JSON.stringify(enemy.rewards)!==JSON.stringify(def.rewards)||!integer(enemy.hp,0,def.stats.hp)||!integer(enemy.mp,0,def.stats.mp)||!Array.isArray(enemy.statuses)||enemy.statuses.some(x=>!data.statuses[x]))fail('敵状態不正');});
      const c=b.continuations;
      if(!isRecord(c))fail('戦闘継続不正');
      else if(c.frame){try{const cmd=commandsAt(data,c.frame)[c.index];if(cmd?.op!=='battle.start'||cmd.encounter!==b.encounter||c.win!=='on_win'||c.lose!=='on_lose'||c.escape!=='on_escape')throw Error();}catch{fail('戦闘継続不正');}}
    }
    if(s.waiting?.type!=='battle')fail('戦闘待機不正');
  }else if(s.waiting?.type==='battle')fail('戦闘がありません');
  if(s.vm.length&&!s.waiting)fail('待機位置がありません');
  errors.push(...validateDungeonState(data,s));
  return [...new Set(errors)];
}
