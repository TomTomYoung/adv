import {isRecord} from './expression.js';
import {commandsAt} from './script.js';
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
  if(!['town','dungeon'].includes(s.mode))fail('モード不正');
  for(const [key,min,max] of [['gold',0,1e9],['xp',0,1e9],['level',1,data.system.maxLevel],['steps',0,1e9],['light',0,data.system.lightCapacity],['rng',1,4294967295]])if(!integer(s[key],min,max))fail(`${key}不正`);
  if(s.mode==='dungeon'){
    const l=s.location,m=data.maps[l?.map];if(!m||m.tiles[l?.y]?.[l?.x]!=='.'||!['north','east','south','west'].includes(l?.facing))fail('位置不正');
  }else if(s.location!==null)fail('町の位置不正');
  if(s.members.length<1||s.members.length>data.system.maxParty||new Set(s.members).size!==s.members.length||s.members.some(id=>!data.actors[id]))fail('隊員不正');
  for(const [id,definition] of Object.entries(data.actors)){
    const actor=s.actors[id];if(!isRecord(actor)||!isRecord(actor.equipment)||!Array.isArray(actor.statuses)){fail('隊員状態不正');continue;}
    const stats={...definition.stats};for(const [key,growth] of Object.entries(data.system.growth))stats[key]=(stats[key]??0)+growth*(s.level-1);
    for(const [slot,itemId] of Object.entries(actor.equipment)){const item=data.items[itemId];if(!item||item.slot!==slot){fail('装備不正');continue;}for(const [key,amount] of Object.entries(item.stats??{}))stats[key]=(stats[key]??0)+amount;}
    if(actor.id!==id||!integer(actor.hp,0,stats.hp)||!integer(actor.mp,0,stats.mp)||actor.statuses.some(x=>!data.statuses[x]))fail('HP・MP・状態異常不正');
  }
  for(const [id,count] of Object.entries(s.inventory))if(!data.items[id]||!integer(count,0,data.system.maxStack))fail('所持品不正');
  for(const [id,q] of Object.entries(data.quests)){
    const qs=s.quests[id];if(!isRecord(qs)||!['available','active','completed'].includes(qs.stage)||!Array.isArray(qs.evidence)){fail('依頼状態不正');continue;}
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
      if(b.acted.some(id=>!s.members.includes(id))||b.guards.some(id=>!s.members.includes(id)))fail('行動済み隊員不正');
      b.enemies.forEach((enemy,i)=>{const def=data.enemies[e.enemies[i]];if(enemy.id!==def.id||enemy.instance!==`enemy_${i}`||JSON.stringify(enemy.stats)!==JSON.stringify(def.stats)||JSON.stringify(enemy.ai)!==JSON.stringify(def.ai)||JSON.stringify(enemy.rewards)!==JSON.stringify(def.rewards)||!integer(enemy.hp,0,def.stats.hp)||!integer(enemy.mp,0,def.stats.mp)||!Array.isArray(enemy.statuses)||enemy.statuses.some(x=>!data.statuses[x]))fail('敵状態不正');});
      const c=b.continuations;
      if(!isRecord(c))fail('戦闘継続不正');
      else if(c.frame){try{const cmd=commandsAt(data,c.frame)[c.index];if(cmd?.op!=='battle.start'||cmd.encounter!==b.encounter||c.win!=='on_win'||c.lose!=='on_lose'||c.escape!=='on_escape')throw Error();}catch{fail('戦闘継続不正');}}
    }
    if(s.waiting?.type!=='battle')fail('戦闘待機不正');
  }else if(s.waiting?.type==='battle')fail('戦闘がありません');
  if(s.vm.length&&!s.waiting)fail('待機位置がありません');
  return [...new Set(errors)];
}
