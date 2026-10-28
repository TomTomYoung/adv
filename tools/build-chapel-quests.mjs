import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {compileRelocatedQuest} from './compile-relocated-quest.mjs';
import {chapelSecondSource} from '../authoring/editions/e2/oddland/chapel-second.mjs';
import {chapelSource} from '../authoring/editions/e2/oddland/chapel.mjs';
const root=path.resolve(import.meta.dirname,'..');
export function compileChapelQuest(first){
 const second=first.number>=131;
 const options={
  prefix:'pilgrimage',eventPrefix:'pilgrim',settlement:'oddland_plateau',settlementName:'巡礼台地',board:'pilgrim_board',boardName:'巡礼台地の依頼所',
  source:'authoring/editions/e2/oddland/'+(second?'chapel-second':'chapel')+'.mjs',stage:second?'second-ten':'first-ten',preserveAcceptedRoute:second,
  scope:second?'後半10件の実地接続。既に受注済みの改訂2は旧経路を保持。':'礼拝堂20件のうち前半10件の実地接続。後半10件はchapel-second.mjsで接続。'
 };
 const quest=compileRelocatedQuest(first,second?chapelSecondSource(first):chapelSource(first),options);
 if(first.number===32){
  // Validate shipped revision-one saves before adding only the two stationary roles.
  const previous=compileRelocatedQuest(first,chapelSource(first,{cast:false}),options).story;
  quest.story.revision=2;quest.model.edition.revision=2;
  quest.model.storyUpgrades=[{fromRevision:1,toRevision:2,previous,values:[
   {key:'prisonerAt',value:'cell'},{key:'craftspersonAt',value:'workshop'}
  ]}];
 }
 return quest;
}

function document(quests,{second=false}={}){
 const lines=[`# 鏡沈みの礼拝堂・${second?'後半':'前半'}10件の第2版経路`,'',`2026-10-26。${second?'q131〜140':'q031〜040'}の既存本文・真相・結末・報酬を保持して、実際の場所と同行・受渡しへ接続した。旧本文の全文改稿ではない。礼拝堂20件の受付・入口・現場・帰路を巡礼台地へ接続済み。受注済みの旧経路は保存方針に従って保持する。`,'',
 `[引き継ぎ](../../../HANDOFF.md) ／ [移設作業票](../../../dungeons/REGIONAL_RELOCATION_WORK.md) ／ [原稿](../../../../authoring/editions/e2/oddland/${second?'chapel-second':'chapel'}.mjs) ／ [生成器](../../../../tools/build-chapel-quests.mjs)`,'',
 '## 保存と往復','','前半10件の導入時に第2版の旧セーブ互換を一度切り、保存改訂2とした。後半10件の導入では改訂2を維持し、受注済み・完了済みのq131〜140は旧命令列と経路を保持する。未受注分から新経路を使う。旧VM・戦闘・費用・報酬を初期化しない。改訂2より前のe2は引き続き非対応で、原文を保護する。初版は変更しない。','',
 '国境宿場→石橋の交易市→巡礼台地／旧王領の村を実際に歩く。巡礼台地の依頼所で受注し、礼拝堂へ出発する。通常出口・帰還印・敗北救助は巡礼台地へ戻る。街道は固定照明のある安全経路で、油0・資金0でも往復できる。礼拝堂内の遭遇・鏡・階段は従来どおりで、街道の安全性を迷宮全体の無消耗とは扱わない。','',
 second?'砂の回廊、沈んだ宿、燃え残る図書館、崩落坑道、整備別棟の5マップと6施設を追加した。水底の宿では歩行で空気を消費し、潜水口で補給する。同行NPCは戦闘隊へ加えず、受渡しと救出は到着時に確定する。費用と戦闘は出発前に確定し、その後に移動を開始する。':'一室の会話・録音の試験・合唱・修理台の話合いは同じ座標に置く。地下牢、石工台、病室側、客室、面会室、三軒の返却先、検査台、閉鎖区画は実到着が必要。本文中の昼夜は場面の経過であり、現実のタイマー待ちは設けない。',''];
 if(!second)lines.push('2026-10-29追記：q032の囚人・職人を各現場のcastと専用画へ接続した。宝玉が棚に残る本文へ整理し、個別物語改訂を1→2へ進めた。保存改訂2・地理版2は維持し、検証済みの旧物語に2人の所在だけを補う。読込時の待機本文は保持する。[人物画・互換性・検証](../../RELOCATED_CHARACTER_ART.md)。','');
 for(const q of quests){lines.push(`## ${q.id} ${q.title}`,'',q.brief,'');for(const n of q.model.graph){const p=q.story.worldPlaces[n.place];lines.push(`### ${n.id} — ${q.story.places[n.place]}`,'',p.kind==='town'?`現場：\`${p.location}\``:`現場：\`${p.map} (${p.x},${p.y})\``,'',...(typeof n.text==='string'?[n.text]:n.text.map(p=>typeof p==='string'?p:`条件に応じて：${p.yes} ／ ${p.no}`)),'');for(const a of n.options)lines.push(`1. ${a.id}：${a.text} → ${a.to}`);lines.push('');}for(const [key,o] of Object.entries(q.outcomes))lines.push(`### 結末 ${key}`,'',o.text,'',`報酬：${o.gold}G、${o.xp}EXP。`,'');}
 return lines.join('\n').trimEnd()+'\n';
}
export async function buildChapelQuests({check=false}={}){
 const quests=[];
 for(const n of [...Array.from({length:10},(_,i)=>31+i),...Array.from({length:10},(_,i)=>131+i)]){const id='q'+String(n).padStart(3,'0'),first=JSON.parse(await fs.readFile(path.join(root,'data/quests/'+id+'.json'),'utf8'));quests.push(compileChapelQuest(first));}
 const files=Object.fromEntries(quests.map(q=>['data/scenario-editions/e2/'+q.id+'.json',JSON.stringify(q,null,2)+'\n']));
 files['doc/scenarios/editions/e2/CHAPEL_FIRST_TEN.md']=document(quests.filter(q=>q.number<100));
 files['doc/scenarios/editions/e2/CHAPEL_SECOND_TEN.md']=document(quests.filter(q=>q.number>100),{second:true});
 for(const [file,text] of Object.entries(files)){const target=path.join(root,file);if(check){if(await fs.readFile(target,'utf8').catch(()=>null)!==text)throw Error(file+': chapel generation differs');}else await fs.writeFile(target,text);}
 return quests;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)await buildChapelQuests({check:process.argv.includes('--check')});
