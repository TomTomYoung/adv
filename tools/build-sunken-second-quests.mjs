import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {compileRelocatedQuest} from './compile-relocated-quest.mjs';
import {sunkenSecondSource} from '../authoring/editions/e2/oddland/sunken-second.mjs';
const root=path.resolve(import.meta.dirname,'..');
const prose=text=>typeof text==='string'?text:Array.isArray(text)?text.map(prose).join('\n\n'):`条件に応じて：${prose(text.yes)} ／ ${prose(text.no)}`;
export async function buildSunkenSecondQuests({check=false}={}){
 const quests=[];
 for(let n=161;n<=170;n++){
  const first=JSON.parse(await fs.readFile(path.join(root,`data/quests/q${n}.json`),'utf8'));
  quests.push(compileRelocatedQuest(first,sunkenSecondSource(first),{prefix:'royal',eventPrefix:'royal',settlement:'oddland_village',settlementName:'旧王領の村',board:'royal_board',boardName:'旧王領の村の依頼所',source:'authoring/editions/e2/oddland/sunken-second.mjs',stage:'sunken-second-ten',scope:'沈没城後半10件の村・橋・試験場・砦・湖の現場接続。受注済みの改訂2は旧経路を保持。',preserveAcceptedRoute:true,battle:'guard_7'}));
 }
 const lines=['# 黒潮の沈没城・後半10件の第2版経路','','2026-10-26。q161〜170の既存本文・条件・33結末・報酬を継承し、村と周辺の現場、同行、受渡しを接続した。全文改稿ではない。城内の一か所に集まっていた会話を、各依頼が述べる場所へ移した。','',
 '[引き継ぎ](../../../HANDOFF.md) ／ [作業票](../../../dungeons/REGIONAL_RELOCATION_WORK.md) ／ [原稿](../../../../authoring/editions/e2/oddland/sunken-second.mjs) ／ [生成器](../../../../tools/build-sunken-second-quests.mjs)','','## 保存・戦闘・同行','','保存改訂2を維持し、受注・完了済みの旧経路と命令列を保持する。未受注分から新経路へ進む。初版は変更しない。','','q166とq167の勝利・逃走・敗北は実際の戦闘継続から記録する。敗北後は村で救助され、現場へ戻って同行者と合流してから面談・護衛へ進む。勝利したことには変換しない。q166の戦果は探索隊、救助はルウのまま分ける。q167の橋は最初から落ちており、偵察の選択で地形は変わらない。','','レン、イルの在隊条件は元の依頼どおり。会話の同行者としての移動と出撃隊への加入・離脱は別で、勝手に編成を変更しない。q164は現行本文のレン、q165は現行本文のイルを用いる。古い設計メタデータの別名を新しい台詞へ流用しない。','','湖の島には湖岸から渡し舟で渡り、岸へ戻って別れを迎える。一便の補給を選んだ場合は補給店から港へ荷を届ける。将来の帰郷や次の便りは元の結末の範囲で、別の国や最終盤へ接続しない。',''];
 for(const q of quests){lines.push(`## ${q.id} ${q.title}`,'',q.brief,'');for(const n of q.model.graph){const p=q.story.worldPlaces[n.place];lines.push(`### ${n.id} — ${q.story.places[n.place]}`,'',p.kind==='town'?`現場：\`${p.location}\``:`現場：\`${p.map} (${p.x},${p.y})\``,'',prose(n.text),'');for(const a of n.options)lines.push(`1. ${a.id}：${a.text} → ${a.to}`);lines.push('');}for(const [key,o] of Object.entries(q.outcomes))lines.push(`### 結末 ${key}`,'',o.text,'',`報酬：${o.gold}G、${o.xp}EXP。`,'');}
 const files={...Object.fromEntries(quests.map(q=>['data/scenario-editions/e2/'+q.id+'.json',JSON.stringify(q,null,2)+'\n'])),'doc/scenarios/editions/e2/SUNKEN_SECOND_TEN.md':lines.join('\n').trimEnd()+'\n'};
 for(const [file,text] of Object.entries(files)){const target=path.join(root,file);if(check){if(await fs.readFile(target,'utf8').catch(()=>null)!==text)throw Error(file+': sunken second generation differs');}else await fs.writeFile(target,text);}
 return quests;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)await buildSunkenSecondQuests({check:process.argv.includes('--check')});
