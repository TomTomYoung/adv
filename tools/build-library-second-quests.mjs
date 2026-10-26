import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {compileRelocatedQuest} from './compile-relocated-quest.mjs';
import {librarySecondSource} from '../authoring/editions/e2/salome/library-second.mjs';
const root=path.resolve(import.meta.dirname,'..');
const prose=text=>typeof text==='string'?text:Array.isArray(text)?text.map(prose).join('\n\n'):`条件に応じて：${prose(text.yes)} ／ ${prose(text.no)}`;
export async function buildLibrarySecondQuests({check=false}={}){
 const quests=[];
 for(const n of Array.from({length:10},(_,i)=>141+i)){
  const first=JSON.parse(await fs.readFile(path.join(root,`data/quests/q${String(n).padStart(3,'0')}.json`),'utf8')),source=librarySecondSource;
  quests.push(compileRelocatedQuest(first,source(first),{prefix:'library',eventPrefix:'library',settlement:'salome',settlementName:'サロメ',board:'salome_board',boardName:'サロメの共同依頼所',source:'authoring/editions/e2/salome/library-second.mjs',stage:'library-second-ten',scope:'書庫後半10件の現場・出張・同行・受渡し。受注済みの改訂2は旧経路を保持。',preserveAcceptedRoute:true,battle:'boss_5'}));
 }
 const outcomes=quests.reduce((n,q)=>n+Object.keys(q.outcomes).length,0);
 const lines=['# 灰時計の書庫・後半10件の第2版経路','','2026-10-26。q141〜150の既存本文・条件・32結末・報酬を継承し、現場・同行・保持者・帰路を接続した。全文改稿ではない。','',
 '[引き継ぎ](../../../HANDOFF.md) ／ [作業票](../../../dungeons/REGIONAL_RELOCATION_WORK.md) ／ [原稿](../../../../authoring/editions/e2/salome/library-second.mjs) ／ [生成器](../../../../tools/build-library-second-quests.mjs)','','## 保存と適用範囲','','保存改訂2・地理版2を維持する。受注済み・完了済みは旧命令列と経路を保持し、未受注分から新経路を採用する。旧探索の通常出口・帰還印・敗北救助は保存済みの出発拠点へ戻す。初版を変更しない。','','曲の使用許可と出演同意、贈呈前後の説明、精霊の代役と休暇、衣装の弁償と引退、母の判断期限、軍服の誓約、花の運搬状態、秤の比較証拠、剣の保持者、候補者の仕事と採用同意を別々に保持する。','', 'q147は山道と静かな水路を実際に歩き、懸架車は30Gで借りる。到着前には受領を確定しない。翌晩は物語上の進行であり、現実時間の待機やゲーム全体の時計変更は行わない。','', '書庫20件の新規受注を現場へ接続した。機関廟20件は旧経路で続行可能で、個別接続を次工程へ残す。',''];
 for(const q of quests){lines.push(`## ${q.id} ${q.title}`,'',q.brief,'');for(const n of q.model.graph){const p=q.story.worldPlaces[n.place];lines.push(`### ${n.id} — ${q.story.places[n.place]}`,'',p.kind==='town'?`現場：\`${p.location}\``:`現場：\`${p.map} (${p.x},${p.y})\``,'',prose(n.text),'');for(const a of n.options)lines.push(`1. ${a.id}：${a.text} → ${a.to}`);lines.push('');}for(const [key,o] of Object.entries(q.outcomes))lines.push(`### 結末 ${key}`,'',o.text,'',`報酬：${o.gold}G、${o.xp}EXP。`,'');}
 const files={...Object.fromEntries(quests.map(q=>['data/scenario-editions/e2/'+q.id+'.json',JSON.stringify(q,null,2)+'\n'])),'doc/scenarios/editions/e2/LIBRARY_SECOND_TEN.md':lines.join('\n').trimEnd()+'\n'};
 for(const [file,text] of Object.entries(files)){const target=path.join(root,file);if(check){if(await fs.readFile(target,'utf8').catch(()=>null)!==text)throw Error(file+': library generation differs');}else await fs.writeFile(target,text);}
 return quests;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)await buildLibrarySecondQuests({check:process.argv.includes('--check')});
