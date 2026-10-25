import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {compileEpisode,locations,names} from '../authoring/editions/e2/companions/kit.mjs';
import ada from '../authoring/editions/e2/companions/ada.mjs';
import nio from '../authoring/editions/e2/companions/nio.mjs';
import sera from '../authoring/editions/e2/companions/sera.mjs';
import il from '../authoring/editions/e2/companions/il.mjs';
import berg from '../authoring/editions/e2/companions/berg.mjs';
import luka from '../authoring/editions/e2/companions/luka.mjs';
import toma from '../authoring/editions/e2/companions/toma.mjs';
import mika from '../authoring/editions/e2/companions/mika.mjs';
import {reviseArcs,revisions} from '../authoring/editions/e2/companions/prose-revisions.mjs';

const root=path.resolve(import.meta.dirname,'..');
export const arcs=reviseArcs({ada,nio,sera,il,berg,luka,toma,mika});
export async function companionBundle(){
 const actors=JSON.parse(await fs.readFile(path.join(root,'data/actors.json'),'utf8'));
 const characters=Object.fromEntries(Object.keys(arcs).map(actor=>[`e2_${actor}`,{id:`e2_${actor}`,name:names[actor],portrait:actors[actor==='mika'?'mica':actor].portrait,role:'第2版・仲間連作',goal:arcs[actor][0].title,detail:'既存のプレイアブル人物と同一。能力・加入条件は変更しない。'}]));
 const quests=Object.entries(arcs).flatMap(([actor,episodes])=>episodes.map((s,index)=>compileEpisode(s,actor,index)));
 if(quests.length!==80||Object.values(arcs).some(a=>a.length!==10))throw Error('仲間連作は8人各10件');
 return {schemaVersion:1,characters,locations,regions:[{id:11,kind:'story',name:'仲間と巡るトルネア',description:'第2版の仲間連作。街道・地下街・学術都市の各拠点を実際に移動して進める。',color:'#bdaca0',recommendedLevel:2}],quests};
}
function document(actor,quests){
 const lines=[`# ${names[actor]}の第2版・全10クエスト`,'','[連作の入口](COMPANION_QUESTS.md)。作者用の分岐全文を含む。シナリオモデルv1.2bで設計し、[GAMEBOOK文章モデル](../../PROSE_MODEL_V1.md)で改稿。',
  '',`実行原稿：[${actor}.mjs](../../../../authoring/editions/e2/companions/${actor}.mjs)。表示される選択肢は編成・先行結果・所持金で判定する。`,''];
 for(const q of quests){
  const source=arcs[actor].find(s=>s.number===q.number);
  lines.push(`## ${q.id} ${q.title}`,'',q.unlockHint,'',`開始：${q.story.places.base}。現場：${q.story.places.site}。`,'','### 依頼と現場','',source.entry,'',source.clue,'','### 選択・実行・帰還','');
  for(const c of source.choices)lines.push(`#### ${c.id}：${c.label}`,'',...(c.when?[`条件：\`${JSON.stringify(c.when)}\`。`,'']:[]),...(c.cost?[`消費：\`${JSON.stringify(c.cost)}\`。`,'']:[]),c.action,'',c.result,'',c.closing,'');
  lines.push('### 設計と保存される違い','',`作者が扱う事実：${q.model.world.truth}`,'',`判定前に渡す情報は現場本文。解決の行為と確認は各分岐の第1・第2段落、人物の返答は帰還段落。${q.id}のoutcomeに選択IDを保存し、帰還前の中断もresolution・所在・観察済み情報で保持する。`,'',`代案：${q.model.authoring.counterfactual}`,'','報酬は各結末10G・各参加者5EXP・宝石0。選択時の費用は別に一回消費する。','');
 }
 return lines.join('\n').trimEnd()+'\n';
}
export async function buildCompanionEdition({check=false}={}){
 const bundle=await companionBundle();
 const files={'data/scenario-editions/e2/companions.json':JSON.stringify(bundle,null,2)+'\n'};
 const review=['# 仲間連作第2版の文章レビュー','','[連作の入口](COMPANION_QUESTS.md)。[適用したモデル](../../PROSE_MODEL_V1.md)と[構造点検](../../PROSE_CHECKLIST.md)。','','8人80件の依頼、現場、全162分岐の実行・結果・帰還を作者自身が点検した。盲検の試読や実読者の感想ではなく、読み順と状態・因果の整合を確認した記録。初稿と置換は [prose-revisions.mjs](../../../../authoring/editions/e2/companions/prose-revisions.mjs) で保存し、対象の一致件数が一件でない場合は生成を拒否する。','','## 作品群の確認','','救助・捜索・弔い・労働・信仰・踏査・実験・栽培を分けた。全件を真相暴露や罰のある選択にはせず、固定過去の悲劇と選択後に変わる結果を区別した。短編の拠点往復という共通形式は残る。新しい戦闘や迷宮の階層追加はこの80件の実装に含まれない。','','ニオの三勢力の支援とミカの先行試験は後続の選択可否に作用する。他の選択の多くは各件の解決・人物の返答・保存されたoutcomeに作用し、独立した都市経済やNPC行動AIを動かすものではない。','','## 修正箇所',''];
 for(const [number,before,after,reason] of revisions)review.push(`### q${number} ${bundle.quests.find(q=>q.number===number).title}`,'',`初稿：${before}`,'',`第2版：${after}`,'',`理由・変更範囲：${reason}`,'');
 review.push('## 全件の点検対象','');
 for(const q of bundle.quests)review.push(`1. ${q.id} ${q.title}：${q.model.authoring.review.scope.join(' → ')}。修正${q.model.authoring.review.changes.length}箇所。`);
 review.push('','修正0箇所の件も本文と選択後の結果を確認対象に含めた。自動試験が保証するのは経路・状態・費用・保存・条件付き支援であり、文章の感情的効果を保証するものではない。','');
 files['doc/scenarios/editions/e2/PROSE_REVIEW.md']=review.join('\n');
 for(const actor of Object.keys(arcs))files[`doc/scenarios/editions/e2/COMPANION_${actor.toUpperCase()}.md`]=document(actor,bundle.quests.filter(q=>q.model.companion===(actor==='mika'?'mica':actor)));
 for(const [file,text] of Object.entries(files)){
  const target=path.join(root,file);
  if(check){if(await fs.readFile(target,'utf8').catch(()=>null)!==text)throw Error(`${file}: 仲間連作の生成結果が古い`);}
  else{await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,text);}
 }
 return bundle;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){const b=await buildCompanionEdition({check:process.argv.includes('--check')});console.log(`COMPANION E2: ${b.quests.length} quests, ${b.quests.reduce((n,q)=>n+Object.keys(q.outcomes).length,0)} endings`);}
