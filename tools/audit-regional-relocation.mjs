import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {loadContent} from '../src/core/loader.js';
import {GameEngine} from '../src/core/engine.js';
import {commandsAt} from '../src/core/script.js';
import {validateSave} from '../src/core/save.js';
import {drain,fight,walk,inspect} from '../tests/helpers.mjs';

const root=path.resolve(import.meta.dirname,'..');
export const read=file=>fs.readFile(path.join(root,file),'utf8').then(JSON.parse);
export const groups=[
 {dungeon:'region_4',destination:'oddland',location:'巡礼台地',note:'礼拝堂・巡礼の現場と周辺出張を区別する。宗教者を聖教会や狂火へ自動所属させない。'},
 {dungeon:'region_7',destination:'oddland',location:'旧王領の村',note:'城の水域・浮上・水上出口を接続する。海王や既存の水没を古代の大水門・アダの事件と結び付けない。'},
 {dungeon:'region_9',destination:'oddland',location:'旧王領の周辺',note:'天球儀の状態と帰路を保つ。後半の停戦・捕虜・終戦を最終盤のトルネア侵攻として確定しない。'},
 {dungeon:'region_5',destination:'salome',location:'灰時計の書庫周辺',note:'既存e2_academy・e2_archive・e2_stacksと入口を統合する。技能貸出と返却、イルの個人連作を維持する。'},
 {dungeon:'region_8',destination:'salome',location:'遺物管理区・外縁調査道',note:'既存e2_workshop・e2_relic・e2_storageを保持する。ミカの所属組織と機関廟の所有権を新たに断定しない。'}
];
export const candidates=data=>groups.flatMap(group=>Object.values(data.quests).filter(q=>q.locations.some(p=>data.maps[p.map]?.dungeon===group.dungeon)).sort((a,b)=>a.number-b.number).map(q=>({group,q})));
export const fingerprint=q=>createHash('sha256').update(JSON.stringify(q)).digest('hex');
const visit=q=>q.model.entryScript??`${q.id}.visit`;
const scene=(g,id)=>g.state.flags.flow?.[id]?.node??g.state.flags.quest?.[id]?.node??null;
const options=g=>g.state.waiting?.type==='choice'?commandsAt(g.data,g.state.vm.at(-1))[g.state.waiting.index].options:[];
const enabled=(g,o)=>(o.condition===undefined||g.value(o.condition))&&(o.visibleWhen===undefined||g.value(o.visibleWhen));
function save(g){const raw=g.save();assert.deepEqual(validateSave(JSON.parse(raw),g.data),[]);g.load(raw);assert.equal(g.save(),raw);}

// This is a reachability fixture, not a balance measurement. Prerequisites are
// explicitly completed fixtures; combat/resources are raised to isolate scripts.
export function fixture(data,id,{accepted=true,entered=true,started=true,absent=null}={}){
 const g=new GameEngine(data,1907);drain(g);
 g.award(0,data.system.xpBase*24*25);g.healAll();g.state.gold=5000;
 for(const item of ['rope','ration','potion','torch'])g.state.inventory[item]=99;
 const q=data.quests[id];
 if(q.requires)for(const other of Object.values(data.quests).filter(o=>o.region===q.region&&o.number<q.number&&o.number<=100)){
  assert.ok(g.accept(other.id));g.complete(other.id,'compromise');
 }
 if(absent)assert.ok(g.dispatch({type:'party',action:'leave',actor:absent}));
 if(accepted)assert.ok(g.accept(id),id);
 if(entered){const spot=q.locations.find(p=>p.role==='decision');g.teleport(spot.map,spot.x,spot.y);}
 if(started)g.run(visit(q));
 return g;
}

export function auditQuest(data,id,{makeFixture=fixture}={}){
 const q=data.quests[id],g=makeFixture(data,id),queue=[{state:structuredClone(g.state),path:[]}],seen=new Set(),ends={},nodes=new Set(),transitions=new Set();
 const stats={states:0,saves:0,battleSaves:0,zeroResourceChoices:0};
 if(id==='q165')queue.push({state:structuredClone(makeFixture(data,id,{absent:'il'}).state),path:['[イル不在]']});
 for(let i=0;i<queue.length;i++){
  const current=queue[i];g.state=structuredClone(current.state);save(g);stats.saves++;
  if(g.state.battle){
   stats.battleSaves++;const battle=structuredClone(g.state);
   for(const result of ['win',...(data.encounters[g.state.battle.encounter].escape?['escape']:[]),'lose']){
    g.state=structuredClone(battle);resolveBattle(g,result);queue.push({state:structuredClone(g.state),path:[...current.path,'[戦闘:'+result+']']});
   }
   continue;
  }
  drain(g);
  const key=JSON.stringify({flow:g.state.flags.flow?.[id],quest:g.state.flags.quest?.[id],members:g.state.members,outcome:g.state.quests[id].outcome,kills:Object.fromEntries(Object.entries(g.state.records.kills).map(([k,n])=>[k,Math.min(n,2)]))});
  if(seen.has(key))continue;seen.add(key);assert.ok(++stats.states<2500,id+' finite graph');save(g);stats.saves++;
  if(g.state.quests[id].stage==='completed'){
   ends[g.state.quests[id].outcome]??=current.path;
   const earned={gold:g.state.gold,actors:structuredClone(g.state.actors),vars:structuredClone(g.state.vars)};
   assert.equal(g.accept(id),false);assert.throws(()=>g.complete(id,g.state.quests[id].outcome));
   g.run(visit(q));drain(g);assert.deepEqual({gold:g.state.gold,actors:g.state.actors,vars:g.state.vars},earned);continue;
  }
  if(!g.state.waiting){g.run(visit(q));drain(g);}
  assert.equal(g.state.waiting?.type,'choice',id+' live choice');
  const before=structuredClone(g.state),from=scene(g,id),choices=options(g).filter(o=>enabled(g,o));nodes.add(from);
  g.state.gold=0;for(const key of Object.keys(g.state.inventory))g.state.inventory[key]=0;
  assert.ok(options(g).some(o=>enabled(g,o)),id+' has a resource-free continuation');stats.zeroResourceChoices++;
  for(const o of choices){
   g.state=structuredClone(before);assert.ok(g.dispatch({type:'choose',id:o.id}),id+'/'+o.id);
   const to=scene(g,id);if(from!==to)transitions.add(from+'→'+to);
   queue.push({state:structuredClone(g.state),path:[...current.path,o.id]});
  }
 }
 assert.deepEqual(Object.keys(ends).sort(),Object.keys(q.outcomes).sort(),id+' all outcomes');
 return {id,title:q.title,sourceSha256:fingerprint(q),modelVersion:q.model.standard?.version??null,entry:visit(q),decision:q.locations.find(p=>p.role==='decision'),sceneIds:[...nodes].sort(),endings:ends,...stats,logicalTransitions:transitions.size,physicalWorldPlaces:Boolean(q.story?.worldPlaces),adoption:'blocked-pending-world-routes'};
}

export function resolveBattle(g,result){
 if(result==='win'){g.healAll();fight(g);return;}
 const key=result==='escape'?'escapes':'losses',before=g.state.records[key];let remaining=200;
 if(result==='lose')for(const id of g.state.members)g.state.actors[id].hp=1;
 while(g.state.battle){
  if(g.state.waiting?.type==='text'){drain(g);continue;}
  assert.ok(--remaining,'battle terminates');
  if(result==='escape'){g.healAll();assert.ok(g.dispatch({type:'battle',action:'escape'}));}
  else assert.ok(g.dispatch({type:'battle',action:'skill',skill:'guard'}));
 }
 drain(g);assert.equal(g.state.records[key],before+1);
}

export async function loadStages(){
 // Historical baseline, intentionally pinned before the one-time e2 save cut.
 // Current relocation behavior is tested separately against the live catalog.
 const compatibleRead=async file=>{if(file==='data/scenario-editions/e2/geography.json')return read('tests/fixtures/e2-geography-before-relocation.json');const value=await read(file);if(file==='data/scenario-editions.json'){delete value.editions.e2.saveRevision;value.editions.e2.questOverrides={q001:value.editions.e2.questOverrides.q001};}return value;};
 const current=await loadContent(compatibleRead,{edition:'e2'}),earliest=await loadContent(async file=>{const value=await compatibleRead(file);if(file==='data/scenario-editions.json'){delete value.editions.e2.additions;delete value.editions.e2.geography;delete value.editions.e2.regionalAdditions;}return value;},{edition:'e2'});
 return {q001:earliest,companions:current.worldTravelLegacy,border:current.regionalLegacy,firstTen:current};
}
export function replay(g,id,trace){
 for(const action of trace){
  if(action==='[イル不在]')continue;
  const result=/^\[戦闘:(win|escape|lose)\]$/.exec(action);
  if(result){assert.ok(g.state.battle);resolveBattle(g,result[1]);continue;}
  drain(g);if(!g.state.waiting){g.run(visit(g.data.quests[id]));drain(g);}
  assert.ok(g.dispatch({type:'choose',id:action}),id+'/'+action);
 }
 drain(g);
}
export function verifyMigration(before,after,id,completedTrace){
 const results=[];
 for(const [name,settings] of [['unaccepted',{accepted:false,entered:false,started:false}],['accepted',{entered:false,started:false}],['dungeon',{started:false}],['text',{}],['choice',{}],['battle',{started:false}],['completed',{}]]){
  const old=fixture(before,id,settings);if(name==='choice')drain(old);
  if(name==='battle')old.startBattle(old.map().encounter,{win:[],escape:[],lose:[]});
  if(name==='completed'){replay(old,id,completedTrace);assert.equal(old.state.quests[id].stage,'completed');}
  const raw=old.save(),saved=JSON.parse(raw),g=new GameEngine(after);g.load(raw);
  for(const [key,value] of Object.entries(saved.state)){
   if(key==='quests'){for(const [qid,p] of Object.entries(value))assert.deepEqual(g.state.quests[qid],p,id+'/'+name+'/'+qid);}
   else assert.deepEqual(g.state[key],value,id+'/'+name+'/'+key);
  }
  assert.equal(old.save(),raw);save(g);results.push(name);
 }
 return results;
}

export function verifyReturns(data,dungeon){
 const result=[];
 for(const kind of ['exit','mark','defeat']){
  const g=new GameEngine(data,1907);drain(g);assert.ok(g.dispatch({type:'travel',dungeon}));
  if(kind==='exit'){const exit=g.map().objects.find(o=>o.kind==='exit');walk(g,exit.x,exit.y);inspect(g,exit.id);drain(g);}
  else if(kind==='mark')assert.ok(g.dispatch({type:'retreat'}));else g.defeat();
  assert.equal(g.state.mode,'town');assert.equal(g.state.townLocation,'hikarigaeri_square');save(g);result.push(kind);
 }
 return result;
}

export async function auditAll(){
 const stages=await loadStages(),data=stages.firstTen,list=candidates(data);assert.equal(list.length,100);
 const allocation=await read('doc/scenarios/REGIONAL_QUEST_ALLOCATION.json');
 for(const {group,q} of list)assert.ok(allocation.primary[group.destination].includes(q.id));
 const rows=[];
 for(const {group,q} of list){const result=auditQuest(data,q.id);result.dungeon=group.dungeon;result.destination=group.destination;result.migrations=Object.fromEntries(Object.entries(stages).map(([stage,old])=>[stage,verifyMigration(old,data,q.id,Object.values(result.endings)[0])]));rows.push(result);}
 return {schemaVersion:1,baseline:'091b8085a4d27d1414529f25f1e2eddb43c0194b',scope:'移設前のe2実行・旧保存検証。新地理への移設合格や戦闘・経済バランスを表さない。',summary:{quests:rows.length,endings:rows.reduce((n,q)=>n+Object.keys(q.endings).length,0),saves:rows.reduce((n,q)=>n+q.saves,0),migrationFixtures:rows.reduce((n,q)=>n+Object.values(q.migrations).flat().length,0),missingWorldPlaces:rows.filter(q=>!q.physicalWorldPlaces).length},dungeons:groups.map(group=>({...group,name:data.dungeons[group.dungeon].name,returns:verifyReturns(data,group.dungeon)})),quests:rows};
}
export function reportMarkdown(report){
 const lines=['# 既存100件の移設前検証','','2026-10-26。基点master `'+report.baseline+'`。対象はオッドランド候補60件、サロメ候補40件。機械的な実行検証と、実際の移設採用を区別する。','',
 '[調査と採用条件](ODDLAND_RELOCATION_AUDIT.md) ／ [検証JSON](REGIONAL_RELOCATION_CHECK.json) ／ [再実行ツール](../../tools/audit-regional-relocation.mjs) ／ [個別の本文・帰路の作業](REGIONAL_RELOCATION_WORK.md)','',
 'この報告は互換切断前の固定fixtureによる歴史的基準。現行の巡礼路・礼拝堂前半10件と保存改訂2は対象外。旧保存互換の条件はユーザー指示により一回限りの切断へ変更した。現在の進捗は[個別作業票](REGIONAL_RELOCATION_WORK.md)を参照する。','','## 結果と制限','',`${report.summary.quests}件・${report.summary.endings}結末の選択をVMで実行し、${report.summary.saves}回の保存再開と${report.summary.migrationFixtures}件の世代別保存移行を確認した。5迷宮の通常出口・帰還印・敗北救助は、基準時点の所属先である灯帰りへ戻る。`,'',
 '基準時点の全100件に実座標の `story.worldPlaces` がない。場面間移動・人物同行・受渡しは旧版の文章とフラグで表現され、現地イベントの座標に隊が留まる。今回の検証成功だけを理由に入口・受付を外国へ移さない。この時点では地図上の現場・帰路と旧遠征の互換が未接続だった。','',
 '分岐の到達性を調べるため、前提完了はfixture、資金5000G・道具99・高レベルの隊を使い、決定地点へ直接配置する。物語内の戦闘は勝利・可能な逃走・敗北を実行する。現場までの往復・無資金での踏破・自然な成長を今回測ったという意味ではない。選択時に資源0でも続行手段があること、報酬が再訪で重複しないことは別に検査する。','',
 '旧e2はq001改稿期、個人80件追加後、越境追加後、第一群10件追加後の4世代を、固定した改訂1の版別定義と旧bundleから再構成したfixture。ユーザー実保存の収集や過去全リリースの復元ではない。各依頼の未受注・受注済み・迷宮内・本文表示中・選択待ち・環境戦闘中・完了済みを基準時点のe2へ読み込み、既存フィールドを逐一比較した。新しい国での旧遠征を保証する試験ではない。','',
 '`npm run audit:relocation` でJSONと本文を再測定・生成し、`npm run check:relocation` で保存済み結果との一致を確認する。通常の `npm run check` でも専用試験が各依頼の実測値をJSONと照合する。固有装置の操作後の保存・帰還・再出発、入口だけを変更した場合の国表示変更とサロメ施設内保存の拒否は専用試験で別に再現する。','',
 '## 個別結果',''];
 for(const group of report.dungeons){lines.push(`### ${group.name} → ${group.location}`,'',group.note,'');for(const q of report.quests.filter(q=>q.dungeon===group.dungeon)){lines.push(`#### ${q.id} ${q.title}`,'',`決定地点：\`${q.decision.map} (${q.decision.x},${q.decision.y})\`。場面：${q.sceneIds.join('、')}。基準時点のモデル：${q.modelVersion}。実地図への場面接続：未実装。`,'');for(const [end,route] of Object.entries(q.endings))lines.push(`- ${end}：${route.join(' → ')}`);lines.push('');}}
 return lines.join('\n').trimEnd()+'\n';
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const report=await auditAll();
 for(const [file,body] of Object.entries({'doc/dungeons/REGIONAL_RELOCATION_CHECK.json':JSON.stringify(report,null,2)+'\n','doc/dungeons/REGIONAL_RELOCATION_CHECK.md':reportMarkdown(report)})){
  if(process.argv.includes('--check'))assert.equal(await fs.readFile(path.join(root,file),'utf8'),body,file);else await fs.writeFile(path.join(root,file),body);
 }
 console.log(JSON.stringify(report.summary));
}
