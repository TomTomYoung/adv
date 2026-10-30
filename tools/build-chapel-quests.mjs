import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {compileRelocatedQuest} from './compile-relocated-quest.mjs';
import {chapelSecondSource} from '../authoring/editions/e2/oddland/chapel-second.mjs';
import {chapelSource} from '../authoring/editions/e2/oddland/chapel.mjs';
import {ref,eq,and} from '../authoring/story-kit.mjs';
const root=path.resolve(import.meta.dirname,'..');
export function compileChapelQuest(first){
 const second=first.number>=131;
 const options={
  prefix:'pilgrimage',eventPrefix:'pilgrim',settlement:'oddland_plateau',settlementName:'巡礼台地',board:'pilgrim_board',boardName:'巡礼台地の依頼所',
  source:'authoring/editions/e2/oddland/'+(second?'chapel-second':'chapel')+'.mjs',stage:second?'second-ten':'first-ten',preserveAcceptedRoute:second,
  scope:second?'後半10件の実地接続。既に受注済みの改訂2は旧経路を保持。':'礼拝堂20件のうち前半10件の実地接続。後半10件はchapel-second.mjsで接続。'
 };
 const current=structuredClone(first);
 if(current.number===40){
  current.outcomes.fragment.label='覚えている日付を記録し、鏡はその場に残す';
  current.outcomes.fragment.text='門が閉じた日付だけを残した。名と言葉の続きは失われたまま、記録係は伝聞と明記し、別の証人を探すことにした。';
 }
 const quest=compileRelocatedQuest(current,second?chapelSecondSource(current):chapelSource(current),options);
 // Paying for the rope creates a preparation scene in the same refuge room.
 // All three people remain there until the separate departure action.
 if(first.number===131)quest.story.scenes.room_both_ready.cast=structuredClone(quest.story.scenes.room.cast);
 if(first.number===134)quest.story.scenes.entry_break_ready.cast=structuredClone(quest.story.scenes.entry.cast);
 if([132,133,134].includes(first.number)){
  const previous=compileRelocatedQuest(first,chapelSecondSource(first,{cast:false}),options).story;
  quest.story.revision=2;quest.model.edition.revision=2;
  quest.model.storyUpgrades=[{fromRevision:1,toRevision:2,previous,values:first.number===134?[
   {key:'custodianAt',value:'keeper'},
   {key:'custodianAt',value:'vault',when:{op:'in',left:'receipt_enter',right:ref('stories.q134.events')}},
   {key:'custodianAt',value:'transit',when:and(eq(ref('journey.quest'),'q134'),eq(ref('journey.action'),'receipt_enter'))}
  ]:first.number===133?['doma','mason'].map(role=>({key:role+'At',value:ref('stories.q133.values.partyAt')})):[
   {key:'managerAt',value:'station'},
   {key:'managerAt',value:'seal',when:{op:'in',left:'test_decoy',right:ref('stories.q132.events')}},
   {key:'managerAt',value:'transit',when:and(eq(ref('journey.quest'),'q132'),eq(ref('journey.action'),'test_decoy'))}
  ]}];
 }
 if([32,36,38,39].includes(first.number)){
  // Validate shipped revision-one saves before adding role locations. For q038,
  // the arrival event and pending journey distinguish the inspector's route.
  const previous=compileRelocatedQuest(first,chapelSource(first,{cast:false}),options).story;
  quest.story.revision=2;quest.model.edition.revision=2;
  quest.model.storyUpgrades=[{fromRevision:1,toRevision:2,previous,values:first.number===32?[
   {key:'prisonerAt',value:'cell'},{key:'craftspersonAt',value:'workshop'}
  ]:first.number===36?[{key:'conductorAt',value:'entry'},{key:'choirAt',value:'entry'}]:first.number===39?[
   {key:'repairerAt',value:'entry'},{key:'claimantsAt',value:'entry'}
  ]:[
   {key:'inspectorAt',value:'lab'},
   {key:'inspectorAt',value:'entry',when:{op:'in',left:'water_filter',right:ref('stories.q038.events')}},
   {key:'inspectorAt',value:'transit',when:and(eq(ref('journey.quest'),'q038'),eq(ref('journey.action'),'water_filter'))}
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
 if(!second)lines.push('2026-10-29追記：q033の匿名巡礼者を5場面へ接続した。外套は本人が持ったまま話す客室の本文へ整理した。既存の同行・保持者・行動を使い、物語改訂1と保存内容を維持する。初版は変更しない。[人物画・保存再開・検証](../../RELOCATED_CHARACTER_ART.md)。','');
 if(!second)lines.push('2026-10-29追記：q034の商人を専用画で全3場面へ、被害者たちを集団名で面会室の1場面へ接続した。人数・代表者は追加しない。本文・同行・保持者・面会への同意・物語改訂1と保存内容は不変。[人物表示と検証](../../RELOCATED_CHARACTER_ART.md)。','');
 if(!second)lines.push('2026-10-29追記：q035の配膳係を全3場面へ、顔を隠す患者を配膳口側の2場面へ専用画で接続した。皿の実到着での受渡し、追加糧食だけの消費、修理への同意と見学拒否を維持する。本文・行動・物語改訂1・旧保存は不変。[人物表示と検証](../../RELOCATED_CHARACTER_ART.md)。','');
 if(!second)lines.push('2026-10-30追記：q036の指揮者を専用画、六人の歌い手を集団名で全3場面へ接続した。本文・生歌停止・練習・結末は不変。物語改訂1→2で検証済みの旧保存に2役の所在だけを追加し、複数の旧改訂も一括検証して移行する。[人物表示と検証](../../RELOCATED_CHARACTER_ART.md)。','');
 if(!second)lines.push('2026-10-30追記：q037の三人の返却先を各家の1場面だけへ専用画で接続した。机・控室には人物を置かず、本人は家に留まる。本文・返却順・封書の実到着での受渡し・物語改訂1・旧保存は不変。[人物表示と検証](../../RELOCATED_CHARACTER_ART.md)。','');
 if(!second)lines.push('2026-10-30追記：q038の匿名の検査人を検査台と設備確認の2場面へ専用画で接続した。検査台から水瓶へ実際に同行し、別経路の交換後検査・掲示・受取所には表示しない。物語改訂1→2で検証済みの旧保存に、到着履歴と同行中の記録に応じた所在だけを補う。本文・採水・交換・結末・全体の保存改訂2と地理版2は維持する。[人物表示と検証](../../RELOCATED_CHARACTER_ART.md)。','');
 if(!second)lines.push('2026-10-30追記：q039の匿名の修理人を専用画、仮面の所有を主張する三人を集団名で同じ修理台の全3場面へ接続した。最初の買い手は三人に含め、四人目として表示しない。物語改訂1→2で検証済みの旧保存に2役の所在だけを補う。本文・仮面の受渡し・修理印の履歴・結末は保持する。[人物表示と検証](../../RELOCATED_CHARACTER_ART.md)。','');
 if(!second)lines.push('2026-10-30追記：q040の外の証人を写しの受取場面shadowだけへ専用画で接続した。断片経路は日付だけを記録して鏡を元の場所に残す本文・選択・結末へ整理し、既存の所在・移動・戦闘・報酬と物語改訂1を維持する。旧保存の待機本文と選択待ち位置はそのまま再開し、選択肢のラベルは訂正後の現行定義から表示する。[人物表示と保存互換の検証](../../RELOCATED_CHARACTER_ART.md)。','');
 if(second)lines.push('2026-10-30追記：q131のシェル・師・荷担ぎへ専用画とcastを接続した。シェルと荷担ぎは全7場面、師は避難室・縄の準備後・師を救出した帰還の4場面に表示する。標本だけの帰還には師を表示しない。既存の同行・標本の到着時受渡し・縄の一回消費・本文・結末・物語改訂1を維持し、現場接続前から受注済みの旧経路とその表示も保持する。[人物表示と保存互換の検証](../../RELOCATED_CHARACTER_ART.md)。','');
 if(second)lines.push('2026-10-30追記：q132の管理人へ専用画・所在・詰所から封鎖地点への実同行を接続した。表示はtest・isolateだけで、討伐へは同行しない。物語改訂1→2で到着履歴と旅程からmanagerAtだけを旧保存へ補い、本文・囮の到着時受渡し・縄の消費・戦闘・報酬を保持する。現場接続前の旧受注経路には所在もcastも追加しない。[人物表示と保存互換の検証](../../RELOCATED_CHARACTER_ART.md)。','');
 if(second)lines.push('2026-10-30追記：q133のドマと同行の石工を全5場面へ専用画で接続し、階段上と荷台の往復に実際に同行させた。物語改訂1→2で検証済みの旧保存のpartyAtから二人の所在だけを補う。本文・錘試験と手動固定の到着時確定・準備なしの退避と再試行・両結末・報酬を保ち、現場接続前に受注した旧経路には人物状態とcastを追加しない。[人物表示と保存互換の検証](../../RELOCATED_CHARACTER_ART.md)。','');
 if(second)lines.push('2026-10-30追記：q134のザグ・師・預かり物の持主・庫番へ専用画を接続し、庫番custodianは受付keeperから庫内へ実同行する。7場面に人物を表示し、brokenには置かない。物語改訂1→2で旧保存へ庫番の所在だけを補い、本文・剣と受領証の到着時受渡し・戦闘・4結末・旧受注経路を保持する。[人物表示と保存互換の検証](../../RELOCATED_CHARACTER_ART.md)。','');
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
