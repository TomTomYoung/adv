import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {compileRelocatedQuest} from './compile-relocated-quest.mjs';
import {sunkenFirstSource} from '../authoring/editions/e2/oddland/sunken-first.mjs';
const root=path.resolve(import.meta.dirname,'..');
const prose=text=>typeof text==='string'?text:Array.isArray(text)?text.map(prose).join('\n\n'):`条件に応じて：${prose(text.yes)} ／ ${prose(text.no)}`;
export async function buildSunkenQuests({check=false}={}){
 const quests=[];
 for(let n=61;n<=70;n++){
  const first=JSON.parse(await fs.readFile(path.join(root,'data/quests/q'+String(n).padStart(3,'0')+'.json'),'utf8'));
  quests.push(compileRelocatedQuest(first,sunkenFirstSource(first),{prefix:'sunken',eventPrefix:'sunken',settlement:'oddland_village',settlementName:'旧王領の村',board:'royal_board',boardName:'旧王領の村の依頼所',source:'authoring/editions/e2/oddland/sunken-first.mjs',stage:'sunken-first-ten',scope:'沈没城前半10件の現場接続。受注済みの改訂2は旧経路を保持。',preserveAcceptedRoute:true,battle:'guard_7'}));
 }
 const lines=['# 黒潮の沈没城・前半10件の第2版経路','','2026-10-26。q061〜070の既存本文・真相・結末・報酬を保って、現地の操作、実移動、同行、受渡しを接続した。全文改稿ではない。沈没城後半10件と観測所20件は入口・受付・帰路までの接続で、個別の現場は後続。','',
 '[引き継ぎ](../../../HANDOFF.md) ／ [作業票](../../../dungeons/REGIONAL_RELOCATION_WORK.md) ／ [原稿](../../../../authoring/editions/e2/oddland/sunken-first.mjs) ／ [生成器](../../../../tools/build-sunken-quests.mjs)','','## 保存・往復・環境','','保存改訂2を維持する。受注済み・完了済みのq061〜070は旧イベントと命令列を保持し、未受注分から新経路を使う。更新前から沈没城・観測所を探索中なら、保存された出発拠点と固有状態を保ち、通常出口・帰還印・敗北は灯帰りへ戻る。村へ来たことや入国登録を捏造しない。新しく村から出発した探索は村へ戻る。','','沈没城の空気消費・空気溜まり・浮上装置と、観測所の天球儀は従来どおり。q070の三浮上区画は物語内の作業状態であり、通常探索の空気設備と別に記録する。q067の小弁・大門も局所の操作で、古代の大水門とは結び付けない。潮の待機は選択ごとの進行で、現実時間の待機は設けない。儀礼用の油は携行灯の燃料から独立する。',''];
 for(const q of quests){lines.push(`## ${q.id} ${q.title}`,'',q.brief,'');for(const n of q.model.graph){const p=q.story.worldPlaces[n.place];lines.push(`### ${n.id} — ${q.story.places[n.place]}`,'',p.kind==='town'?`現場：\`${p.location}\``:`現場：\`${p.map} (${p.x},${p.y})\``,'',prose(n.text),'');for(const a of n.options)lines.push(`1. ${a.id}：${a.text} → ${a.to}`);lines.push('');}for(const [key,o] of Object.entries(q.outcomes))lines.push(`### 結末 ${key}`,'',o.text,'',`報酬：${o.gold}G、${o.xp}EXP。`,'');}
 const files={...Object.fromEntries(quests.map(q=>['data/scenario-editions/e2/'+q.id+'.json',JSON.stringify(q,null,2)+'\n'])),'doc/scenarios/editions/e2/SUNKEN_FIRST_TEN.md':lines.join('\n').trimEnd()+'\n'};
 for(const [file,text] of Object.entries(files)){const target=path.join(root,file);if(check){if(await fs.readFile(target,'utf8').catch(()=>null)!==text)throw Error(file+': sunken generation differs');}else await fs.writeFile(target,text);}
 return quests;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)await buildSunkenQuests({check:process.argv.includes('--check')});
