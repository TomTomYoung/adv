import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {ref,eq,and} from '../authoring/story-kit.mjs';
import {compileRelocatedQuest} from './compile-relocated-quest.mjs';
import {observatoryFirstSource} from '../authoring/editions/e2/oddland/observatory-first.mjs';
import {observatorySecondSource} from '../authoring/editions/e2/oddland/observatory-second.mjs';
const root=path.resolve(import.meta.dirname,'..');
const prose=text=>typeof text==='string'?text:Array.isArray(text)?text.map(prose).join('\n\n'):`条件に応じて：${prose(text.yes)} ／ ${prose(text.no)}`;
export async function buildObservatoryQuests({check=false}={}){
 const quests=[];
 for(const n of [...Array.from({length:10},(_,i)=>81+i),...Array.from({length:10},(_,i)=>181+i)]){
  const first=JSON.parse(await fs.readFile(path.join(root,`data/quests/q${String(n).padStart(3,'0')}.json`),'utf8')),source=n<100?observatoryFirstSource:observatorySecondSource;
  const options={prefix:'observatory',eventPrefix:'observatory',settlement:'oddland_village',settlementName:'旧王領の村',board:'royal_board',boardName:'旧王領の村の依頼所',source:`authoring/editions/e2/oddland/observatory-${n<100?'first':'second'}.mjs`,stage:'observatory-twenty',scope:'観測所20件の現場・出張・同行・受渡し。受注済みの改訂2は旧経路を保持。',preserveAcceptedRoute:true,battle:'boss_9'};
  const quest=compileRelocatedQuest(first,source(first),options);
  if(n===181){
   const previous=compileRelocatedQuest(first,source(first,{cast:false}),options).story;
   quest.story.registry.quiverAt.values=structuredClone(previous.registry.quiverAt.values);
   const values=[{key:'postMercenariesAt',value:'mercenaries'},{key:'frontMercenariesAt',value:'signal'},{key:'counterpartAt',value:'meeting'}];
   for(const {key,value} of values)quest.story.registry[key].values=[value];
   quest.story.revision=2;quest.model.edition.revision=2;
   quest.model.storyUpgrades=[{fromRevision:1,toRevision:2,previous,values}];
  }
  if(n===182){
   const previous=compileRelocatedQuest(first,source(first,{cast:false}),options).story;
   // Added people must not become new legal holders for the existing items.
   for(const [key,entry] of Object.entries(previous.registry))quest.story.registry[key]=structuredClone(entry);
   quest.story.registry.olAt.values=['entry','gun','transit'];
   quest.story.registry.commanderAt.values=['command'];
   quest.story.revision=2;quest.model.edition.revision=2;
   quest.model.storyUpgrades=[{fromRevision:1,toRevision:2,previous,values:[
    {key:'olAt',value:'entry'},
    {key:'olAt',value:'gun',when:{op:'in',left:'entry_deploy',right:ref('stories.q182.events')}},
    {key:'olAt',value:'transit',when:and(eq(ref('journey.quest'),'q182'),eq(ref('journey.action'),'entry_deploy'))},
    {key:'commanderAt',value:'command'}
   ]}];
  }
  if(n===183){
   const previous=compileRelocatedQuest(first,source(first,{cast:false}),options).story;
   for(const [key,entry] of Object.entries(previous.registry))quest.story.registry[key]=structuredClone(entry);
   const values=[{key:'soldiersAt',value:'entry'},{key:'bereavedAt',value:'families'}];
   for(const {key,value} of values)quest.story.registry[key].values=[value];
   quest.story.revision=2;quest.model.edition.revision=2;
   quest.model.storyUpgrades=[{fromRevision:1,toRevision:2,previous,values}];
  }
  if(n===187){
   // The user permits dropping revision-1 q187 saves; do not add a migration.
   quest.story.revision=2;quest.model.edition.revision=2;
   quest.story.registry.officerPersonAt.values=['officer'];
   quest.story.registry.mayorAt.values=['contract'];
  }
  if(n===189){
   const previous=compileRelocatedQuest(first,source(first,{cast:false}),options).story;
   // Preserve existing item holders and derive Asa's location from her group.
   for(const [key,entry] of Object.entries(previous.registry))quest.story.registry[key]=structuredClone(entry);
   quest.story.registry.asaAt.values=['entry','private','transit'];
   quest.story.revision=2;quest.model.edition.revision=2;
   quest.model.storyUpgrades=[{fromRevision:1,toRevision:2,previous,values:[{key:'asaAt',value:ref('stories.q189.values.refugeesAt')}]}];
   quest.story.invariants.push({id:'asa_with_refugees',condition:eq(ref('stories.q189.values.asaAt'),ref('stories.q189.values.refugeesAt')),message:'アサは避難者と同じ場所にいる。'});
  }
  quests.push(quest);
 }
 const outcomes=quests.reduce((n,q)=>n+Object.keys(q.outcomes).length,0);
 const lines=['# 星欠けの地下観測所・20件の第2版経路','','2026-10-26。q081〜090・q181〜190の既存本文・条件・'+outcomes+'結末・報酬を継承し、観測所と周辺の現場、出張、同行、受渡しを接続した。全文改稿ではない。','',
 '[引き継ぎ](../../../HANDOFF.md) ／ [作業票](../../../dungeons/REGIONAL_RELOCATION_WORK.md) ／ [前半原稿](../../../../authoring/editions/e2/oddland/observatory-first.mjs) ／ [後半原稿](../../../../authoring/editions/e2/oddland/observatory-second.mjs) ／ [生成器](../../../../tools/build-observatory-quests.mjs)','','## 保存・装置・出張の範囲','','保存改訂2を維持する。更新前から受注・完了済みの20件は旧イベント・命令列・費用・報酬を保持し、未受注分から新経路を使う。初版は変更しない。2026-11-11の人物表示更新ではq187だけ物語改訂2へ更新し、ユーザーの許可により物語改訂1の保存移行を追加しない。q187の物語開始後に改訂1で作られた保存は読み込みを拒否する。改訂2の待機・移動・戦闘・完了の保存再開は検証する。','','観測所の東星／西星による地形変化は従来どおり。q089の暦を読む天球儀の向き、q083の人工太陽、q090の観測蓋と生活灯は依頼内の装置状態として記録し、地形装置や携行灯の燃料を書き換えない。待機・一周期・一時間は選択ごとの物語進行で、現実時間の待機を設けない。q084の上層水路には空気消費と空気室を設け、救助標の回収と本人への到達を別にする。','','後半の出張先は各既存依頼の行為を成立させる場所であり、匿名の国・軍の名称や、共通する一つの戦争の時系列を確定しない。q190の終戦を本編最終盤の侵攻終了へ同定しない。局地休戦や使者の慣習を戦争全体の停戦とせず、家族の和解を護衛報酬の必須条件にしない。','','q185/q190の逃走・敗北は通過未完了／避難へ進む。q186の逃走は交渉留保へ、q187の逃走は勝利を偽らず任用相談へ進む。q186/q187の敗北は元の経路どおり再相談できる。敗北後は村へ救助され、現場へ歩いて戻って同行者と合流してから続ける。','','q182の最後の魔石は依頼専用の数量1として追跡し、照明・攻撃で一度だけ使う。保留では未使用のまま保管する。q183の糧食2個とq185の舟代40Gは現場で支払い、無資源時も別の継続を残す。q190は三か所を個別に封鎖し、受入れを確認した軍の回収班と各区画を巡り、魔石を保管庫へ運んで終える。',''];
 for(const q of quests){lines.push(`## ${q.id} ${q.title}`,'',q.brief,'');for(const n of q.model.graph){const p=q.story.worldPlaces[n.place];lines.push(`### ${n.id} — ${q.story.places[n.place]}`,'',p.kind==='town'?`現場：\`${p.location}\``:`現場：\`${p.map} (${p.x},${p.y})\``,'',prose(n.text),'');for(const a of n.options)lines.push(`1. ${a.id}：${a.text} → ${a.to}`);lines.push('');}for(const [key,o] of Object.entries(q.outcomes))lines.push(`### 結末 ${key}`,'',o.text,'',`報酬：${o.gold}G、${o.xp}EXP。`,'');}
 const files={...Object.fromEntries(quests.map(q=>['data/scenario-editions/e2/'+q.id+'.json',JSON.stringify(q,null,2)+'\n'])),'doc/scenarios/editions/e2/OBSERVATORY_TWENTY.md':lines.join('\n').trimEnd()+'\n'};
 for(const [file,text] of Object.entries(files)){const target=path.join(root,file);if(check){if(await fs.readFile(target,'utf8').catch(()=>null)!==text)throw Error(file+': observatory generation differs');}else await fs.writeFile(target,text);}
 return quests;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)await buildObservatoryQuests({check:process.argv.includes('--check')});
