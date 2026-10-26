import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {compileRelocatedQuest} from './compile-relocated-quest.mjs';
import {machineFirstSource} from '../authoring/editions/e2/salome/machine-first.mjs';
import {machineSecondSource} from '../authoring/editions/e2/salome/machine-second.mjs';
const root=path.resolve(import.meta.dirname,'..');
const prose=text=>typeof text==='string'?text:Array.isArray(text)?text.map(prose).join('\n\n'):`条件に応じて：${prose(text.yes)} ／ ${prose(text.no)}`;
export async function buildMachineQuests({check=false}={}){
 const quests=[];
 for(const n of [...Array.from({length:10},(_,i)=>71+i),...Array.from({length:10},(_,i)=>171+i)]){
  const first=JSON.parse(await fs.readFile(path.join(root,`data/quests/q${String(n).padStart(3,'0')}.json`),'utf8')),source=n<100?machineFirstSource:machineSecondSource;
  quests.push(compileRelocatedQuest(first,source(first),{prefix:'machine',eventPrefix:'machine',settlement:'salome',settlementName:'サロメ',board:'salome_board',boardName:'サロメの共同依頼所',source:'authoring/editions/e2/salome/'+(n<100?'machine-first':'machine-second')+'.mjs',stage:'machine-twenty',scope:'機関廟20件の現場・出張・同行・受渡し。受注済みの改訂2は旧経路を保持。',preserveAcceptedRoute:true,battle:'boss_8'}));
 }
 const outcomes=quests.reduce((n,q)=>n+Object.keys(q.outcomes).length,0);
 const lines=['# 鉄胎の機関廟・20件の第2版経路','','2026-10-27。q071〜080・q171〜180の既存本文・条件・'+outcomes+'結末・報酬を継承し、現場・同行・保持者・帰路を接続した。全文改稿ではない。','',
 '[引き継ぎ](../../../HANDOFF.md) ／ [作業票](../../../dungeons/REGIONAL_RELOCATION_WORK.md) ／ [前半原稿](../../../../authoring/editions/e2/salome/machine-first.mjs) ／ [後半原稿](../../../../authoring/editions/e2/salome/machine-second.mjs) ／ [生成器](../../../../tools/build-machine-quests.mjs)','','## 保存と適用範囲','','保存改訂2・地理版2を維持する。受注済み・完了済みは旧命令列と経路を保持し、未受注分から新経路を採用する。動力状態と修復回数、旧遠征の帰還先、初版は変更しない。','','退職記録と本人の退出、部品補給と仕事の移管、薬の保護と歌の停止、炉の記録退避と再起動、三者の署名と単独鍵の破棄を別々に保持する。','','後半は調査回数・護符20G・避難、本人の呼び名、双方の滞在同意、葬列の終了と救出、誘導と警告、道の補修当番、像の日時と公開訂正、不可逆の翌朝、三家の任意順の意思確認、怪異の封印と物語の完結を保存する。q179の縄は準備時に一つだけ消費する。q171は明示した試験・待機だけで回数が進み、通常の移動や保存再開では進まない。翌朝・後日の場面は各依頼内の時間で、ゲーム全体の時計を変更しない。','','外縁の生活道・墓地道・谷道の3区画と15施設を追加し、既存のサロメと機関廟の入口から往復する。新しい道は固定照明で通常遭遇がなく、物語内の扉や柵で通常帰路を塞がない。旧迷宮の動力装置を依頼の設備と同一状態にしない。','','旧100件の個別現場接続が揃った。次工程は三地域配分の移設採否を検証結果と照合して確定し、第六・第七・第八群の新作30件へ進む。最終盤・追加職と人物は今回含めない。',''];
 for(const q of quests){lines.push(`## ${q.id} ${q.title}`,'',q.brief,'');for(const n of q.model.graph){const p=q.story.worldPlaces[n.place];lines.push(`### ${n.id} — ${q.story.places[n.place]}`,'',p.kind==='town'?`現場：\`${p.location}\``:`現場：\`${p.map} (${p.x},${p.y})\``,'',prose(n.text),'');for(const a of n.options)lines.push(`1. ${a.id}：${a.text} → ${a.to}`);lines.push('');}for(const [key,o] of Object.entries(q.outcomes))lines.push(`### 結末 ${key}`,'',o.text,'',`報酬：${o.gold}G、${o.xp}EXP。`,'');}
 const files={...Object.fromEntries(quests.map(q=>['data/scenario-editions/e2/'+q.id+'.json',JSON.stringify(q,null,2)+'\n'])),'doc/scenarios/editions/e2/MACHINE_TWENTY.md':lines.join('\n').trimEnd()+'\n'};
 for(const [file,text] of Object.entries(files)){const target=path.join(root,file);if(check){if(await fs.readFile(target,'utf8').catch(()=>null)!==text)throw Error(file+': machine generation differs');}else await fs.writeFile(target,text);}
 return quests;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)await buildMachineQuests({check:process.argv.includes('--check')});
