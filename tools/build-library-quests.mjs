import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {compileRelocatedQuest} from './compile-relocated-quest.mjs';
import {libraryFirstSource} from '../authoring/editions/e2/salome/library-first.mjs';
const root=path.resolve(import.meta.dirname,'..');
const prose=text=>typeof text==='string'?text:Array.isArray(text)?text.map(prose).join('\n\n'):`条件に応じて：${prose(text.yes)} ／ ${prose(text.no)}`;
export async function buildLibraryQuests({check=false}={}){
 const quests=[];
 for(const n of Array.from({length:10},(_,i)=>41+i)){
  const first=JSON.parse(await fs.readFile(path.join(root,`data/quests/q${String(n).padStart(3,'0')}.json`),'utf8')),source=libraryFirstSource;
  quests.push(compileRelocatedQuest(first,source(first),{prefix:'library',eventPrefix:'library',settlement:'salome',settlementName:'サロメ',board:'salome_board',boardName:'サロメの共同依頼所',source:'authoring/editions/e2/salome/library-first.mjs',stage:'library-first-ten',scope:'書庫前半10件の現場・出張・同行・受渡し。受注済みの改訂2は旧経路を保持。',preserveAcceptedRoute:true,battle:'boss_5'}));
 }
 const outcomes=quests.reduce((n,q)=>n+Object.keys(q.outcomes).length,0);
 const lines=['# 灰時計の書庫・前半10件の第2版経路','','2026-10-26。q041〜050の既存本文・条件・30結末・報酬を継承し、現場・同行・保持者・帰路を接続した。全文改稿ではない。','',
 '[引き継ぎ](../../../HANDOFF.md) ／ [作業票](../../../dungeons/REGIONAL_RELOCATION_WORK.md) ／ [原稿](../../../../authoring/editions/e2/salome/library-first.mjs) ／ [生成器](../../../../tools/build-library-quests.mjs)','','## 保存と適用範囲','','保存改訂2・地理版2を維持する。受注済み・完了済みは旧命令列と経路を保持し、未受注分から新経路を採用する。旧探索の通常出口・帰還印・敗北救助は保存済みの出発拠点へ戻す。初版を変更しない。','','q047の二国の国名と戦争年代は確定しない。依頼国の出張記録室をサロメ、相手国の記録係の滞在先をオッドランドの交易市へ置き、高台街道・地下水道の関所を通って照会する。所在国と史書の国を同一視せず、本編最終盤の侵攻へ結びつけない。共同保管の受領人と各国の編纂担当者は別の役割とする。','','q042の二時計、q043の保存薬、q048の自動筆記、q049の記憶封印、q050の収蔵時計は依頼内の状態であり、探索の時間・習得技能・燃料・通行地形を書き換えない。翌朝は物語の進行で、現実時間待機を設けない。q043で失った追記は復元しない。q049は封印中も物理的な帰路を残す。','','書庫・機関廟の入口と旧40件の受付はサロメへ移設する。後半10件の現場接続も実装済み。機関廟20件は旧経路を維持して後続へ残す。',''];
 for(const q of quests){lines.push(`## ${q.id} ${q.title}`,'',q.brief,'');for(const n of q.model.graph){const p=q.story.worldPlaces[n.place];lines.push(`### ${n.id} — ${q.story.places[n.place]}`,'',p.kind==='town'?`現場：\`${p.location}\``:`現場：\`${p.map} (${p.x},${p.y})\``,'',prose(n.text),'');for(const a of n.options)lines.push(`1. ${a.id}：${a.text} → ${a.to}`);lines.push('');}for(const [key,o] of Object.entries(q.outcomes))lines.push(`### 結末 ${key}`,'',o.text,'',`報酬：${o.gold}G、${o.xp}EXP。`,'');}
 const files={...Object.fromEntries(quests.map(q=>['data/scenario-editions/e2/'+q.id+'.json',JSON.stringify(q,null,2)+'\n'])),'doc/scenarios/editions/e2/LIBRARY_FIRST_TEN.md':lines.join('\n').trimEnd()+'\n'};
 for(const [file,text] of Object.entries(files)){const target=path.join(root,file);if(check){if(await fs.readFile(target,'utf8').catch(()=>null)!==text)throw Error(file+': library generation differs');}else await fs.writeFile(target,text);}
 return quests;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)await buildLibraryQuests({check:process.argv.includes('--check')});
