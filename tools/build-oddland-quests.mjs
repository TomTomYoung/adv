import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import first from '../authoring/editions/e2/oddland/first.mjs';
import middle from '../authoring/editions/e2/oddland/middle.mjs';
import finale from '../authoring/editions/e2/oddland/finale.mjs';
import {compileQuest,locations,characters,places} from '../authoring/editions/e2/oddland/kit.mjs';
import {revise,revisions} from '../authoring/editions/e2/oddland/prose-revisions.mjs';
const root=path.resolve(import.meta.dirname,'..');
export const sources=revise([...first,...middle,...finale]);
export function oddlandBundle(){return {schemaVersion:1,locations,characters,regions:[{id:12,kind:'story',name:'オッドランド・国境宿場',description:'国境を歩いて訪れ、現地の仕事と生活へ関わる地域依頼。',color:'#d7ac7b',recommendedLevel:3}],quests:sources.map(compileQuest)};}
const prose=text=>typeof text==='string'?text:text.map(c=>c.op==='narrate'?c.text:`条件 ${JSON.stringify(c.condition)}\n\n成立時：${prose(c.then)}\n\n不成立時：${prose(c.else)}`).join('\n\n');
function document(bundle){
 const lines=['# オッドランド第一群の第2版・全10件','','2026-10-26。OD001〜010、実装ID q291〜q300。第2版だけに追加し、合計300件。地域の新作10件と個人80件を区別する。',[`[越境基盤](../../../world/ODDLAND_ACCESS_IMPLEMENTATION.md) ／ [100企画](../../ODDLAND_100_QUEST_DESIGN.md) ／ [三地域配分](../../REGIONAL_QUEST_ALLOCATION.md) ／ [シナリオモデル](../../SCENARIO_MODEL_V12B.md) ／ [文章モデル](../../PROSE_MODEL_V1.md) ／ [点検基準](../../PROSE_CHECKLIST.md)`],'',
 '## 遊ぶ順序と範囲','','国境宿場の共同依頼所だけで受注する。初めの7件は互いに独立。任意の3件完了でOD008、次にOD009、OD010を解放する。初回の越境を依頼報酬にせず、q004の姉妹の通行証とも結び付けない。各場面へは実際に歩き、国境の通過、人物の同行、物品の保持と受渡し、費用をCoreで検証する。',
 '',`全${bundle.quests.length}件、${bundle.quests.reduce((n,q)=>n+Object.keys(q.story.scenes).length,0)}場面、${bundle.quests.reduce((n,q)=>n+Object.keys(q.outcomes).length,0)}結末。追加7施設、既存3通路を利用し、新マップ・戦闘は追加しない。第一群の導入時に仮表示だったNPCは、q291〜q295の12人へ専用透過画を接続済み。[人物画と検証](../../../scenarios/ODDLAND_CHARACTER_ART.md)。残る10人の画像は未制作。25分・45分は作中の便の設定で、現実のタイマーや快速移動機能ではない。食事の温度、NPCの自律生活、宿泊予約の恒常システムはシミュレートしない。各episodeの結果と協力条件を保存する。`,'',
 '運搬・休みの相談・修繕・登録照合・試乗・検査・実演・夜番・宿泊準備・食事会を別の経路にした。新作だけを完了して旧地域1の締めを解放しない。礼拝堂前半10件の現場接続は別工程として実装済み。後半10件・他迷宮の移設・サロメ・残る地域新作は後続。侵攻・古代の大水門・アダの最終盤は含めない。','',
 '## 配布・原稿・検証','','正本は [前半](../../../../authoring/editions/e2/oddland/first.mjs)、[中盤](../../../../authoring/editions/e2/oddland/middle.mjs)、[後半](../../../../authoring/editions/e2/oddland/finale.mjs)。[改稿履歴](../../../../authoring/editions/e2/oddland/prose-revisions.mjs)を適用し、[生成器](../../../../tools/build-oddland-quests.mjs)から配布JSONと本書を生成する。初稿は上書きしない。',
 '', '[専用試験](../../../../tests/oddland-quests.test.mjs)で全結末・費用・保存・受付・任意3件の組合せ・旧e2の各段階の拒否と改訂2の再開を検証する。旧保存の自動移行は行わず、[現行の保存方針](../../SCENARIO_EDITIONS.md)に従う。最新結果は [PROGRESS](../../../development/PROGRESS.md) を参照。UI・新背景の制作状態をシナリオの実装件数と混同しない。',''];
 for(const q of bundle.quests){const x=sources.find(s=>s.number===q.number);lines.push(`## ${q.id} ${q.title}`,'',q.brief,'',q.unlockHint,'',`作者が扱う事実：${x.truth}`,'',`代案と注意：${x.counterfactual}`,'');for(const n of x.nodes){lines.push(`### ${n.id} — ${places[n.place].name}`,'',prose(n.text),'');for(const a of n.options)lines.push(`1. ${a.label} → ${a.to}${a.cost?`。消費 ${JSON.stringify(a.cost)}`:''}${a.when?`。条件 ${JSON.stringify(a.when)}`:''}`);lines.push('');}lines.push('### 結末と報酬','');for(const [id,e] of Object.entries(q.outcomes))lines.push(`1. ${id}：${e.label}。${e.gold}G、各参加者${e.xp}EXP、技能宝石${e.gems}。${e.text}`);lines.push('');}
 lines.push('## 文章の改稿記録','','全場面と全結末を初見の提示順で読み直し、主語・情報源・人物の所在・実行前後を照合した。以下は具体的な修正。感情的な効果の実測や、読者による試読ではない。','');for(const [number,before,after,reason] of revisions)lines.push(`### q${number}`,'',`初稿：${before}`,'',`採用稿：${after}`,'',`理由：${reason}`,'');return lines.join('\n').trimEnd()+'\n';
}
export async function buildOddlandQuests({check=false}={}){
 const b=oddlandBundle();if(b.quests.length!==10||b.quests.some((q,i)=>q.number!==291+i))throw Error('OD001〜010の連番不正');
 for(const [name,text] of Object.entries({'data/scenario-editions/e2/oddland-first-ten.json':JSON.stringify(b,null,2)+'\n','doc/scenarios/editions/e2/ODDLAND_FIRST_TEN.md':document(b)})){
 const file=path.join(root,name);if(check){if(await fs.readFile(file,'utf8').catch(()=>null)!==text)throw Error(`${name}: オッドランド第一群の生成結果が古い`);}else{await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,text);}}
 return b;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){const b=await buildOddlandQuests({check:process.argv.includes('--check')});console.log(`ODDLAND E2: ${b.quests.length} quests, ${b.quests.reduce((n,q)=>n+Object.keys(q.outcomes).length,0)} endings`);}
