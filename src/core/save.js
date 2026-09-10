import {actorStats,canEquip} from './jobs.js';
import {validateJobState} from './job-validation.js';
import {layersValid} from './feedback-validation.js';
import {isRecord,clone} from './expression.js';
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
export function migrateSave(original,data){
  if(!isRecord(original)||original.contentVersion===data.game.version)return original;
  const migration=data.game.migrations?.[original.contentVersion];if(!migration)return original;
  const oldQuests=Object.fromEntries((migration.quests??Object.keys(data.quests)).map(id=>[id,data.quests[id]]));
  if(migration.scenarioRevision){
    const legacy={...data,quests:oldQuests,game:{...data.game,version:original.contentVersion,recordVersion:undefined}};
    if(validateSave(original,legacy).length)return original;
    const save=clone(original);save.contentVersion=data.game.version;save.state.contentVersion=data.game.version;
    addScenarioState(save,data);return save;
  }
  // Old records must pass their old growth limits before any normalization.
  const legacy={...data,quests:oldQuests,jobs:undefined,game:{...data.game,version:original.contentVersion,recordVersion:undefined},actors:Object.fromEntries(migration.actors.map(id=>[id,data.actors[id]]))};
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
    const l=s.location,m=data.maps[l?.map];if(!m||m.tiles[l?.y]?.[l?.x]!=='.'||!['north','east','south','west'].includes(l?.facing))fail('位置不正');
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
  errors.push(...validateJobState(data,s));
  for(const [id,count] of Object.entries(s.inventory))if(!data.items[id]||!integer(count,0,data.system.maxStack))fail('所持品不正');
  for(const [id,q] of Object.entries(data.quests)){
    const qs=s.quests[id];if(!isRecord(qs)||!['available','active','completed'].includes(qs.stage)||!Array.isArray(qs.evidence)){fail('依頼状態不正');continue;}
    if(data.game.recordVersion===1&&qs.stage==='active'&&!s.records?.baselines?.[id])fail('受注時の戦績がありません');
    const evidenceKeys=q.locations.filter(loc=>loc.role!=='decision').map(loc=>loc.role);
    if(qs.evidence.some(e=>!evidenceKeys.includes(e))||new Set(qs.evidence).size!==qs.evidence.length)fail('証拠不正');
    if(qs.stage==='completed'?!q.outcomes[qs.outcome]:qs.outcome!==null)fail('結末不正');
  }
  if(s.trackedQuest!==null&&!data.quests[s.trackedQuest])fail('追跡依頼不正');
  for(const [map,cells] of Object.entries(s.discovered))if(!data.maps[map]||!Array.isArray(cells)||cells.some(c=>typeof c!=='string'||!/^\d+,\d+$/.test(c)))fail('地図不正');
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
      if(data.game.recordVersion===1&&(!Array.isArray(b.recordedKills)||new Set(b.recordedKills).size!==b.recordedKills.length||b.recordedKills.some(id=>!b.enemies.some(e=>e?.instance===id&&e.hp===0))))fail('撃破記録不正');
      if(new Set(b.acted).size!==b.acted.length||new Set(b.guards).size!==b.guards.length||b.acted.some(id=>!s.members.includes(id))||b.guards.some(id=>!s.members.includes(id)))fail('行動済み隊員不正');
      b.enemies.forEach((enemy,i)=>{const def=data.enemies[e.enemies[i]];if(!isRecord(enemy)||enemy.id!==def.id||enemy.instance!==`enemy_${i}`||JSON.stringify(enemy.stats)!==JSON.stringify(def.stats)||JSON.stringify(enemy.resist)!==JSON.stringify(def.resist)||JSON.stringify(enemy.ai)!==JSON.stringify(def.ai)||JSON.stringify(enemy.rewards)!==JSON.stringify(def.rewards)||!integer(enemy.hp,0,def.stats.hp)||!integer(enemy.mp,0,def.stats.mp)||!Array.isArray(enemy.statuses)||enemy.statuses.some(x=>!data.statuses[x]))fail('敵状態不正');});
      const c=b.continuations;
      if(!isRecord(c))fail('戦闘継続不正');
      else if(c.frame){try{const cmd=commandsAt(data,c.frame)[c.index];if(cmd?.op!=='battle.start'||cmd.encounter!==b.encounter||c.win!=='on_win'||c.lose!=='on_lose'||c.escape!=='on_escape')throw Error();}catch{fail('戦闘継続不正');}}
    }
    if(s.waiting?.type!=='battle')fail('戦闘待機不正');
  }else if(s.waiting?.type==='battle')fail('戦闘がありません');
  if(s.vm.length&&!s.waiting)fail('待機位置がありません');
  return [...new Set(errors)];
}
