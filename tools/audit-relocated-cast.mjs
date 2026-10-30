import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {RELOCATED_CAST_REVIEW} from '../authoring/relocated-cast-review.mjs';

const root=path.resolve(import.meta.dirname,'..');
const regions=[{id:4,name:'礼拝堂'},{id:7,name:'沈没城'},{id:9,name:'地下観測所'},{id:5,name:'書庫'},{id:8,name:'機関廟'}];
export const relocatedCastFingerprint=q=>createHash('sha256').update(JSON.stringify(q)).digest('hex');
const count=o=>Object.keys(o??{}).length;
export async function loadRelocatedCastQuests(){
 const dir=path.join(root,'data/scenario-editions/e2');
 const files=(await fs.readdir(dir)).filter(f=>/^q\d{3}\.json$/.test(f)).sort();
 const quests=await Promise.all(files.map(async f=>JSON.parse(await fs.readFile(path.join(dir,f),'utf8'))));
 return quests.filter(q=>q.model?.relocation);
}

// Empty casts are measured independently of editorial judgments. A review of a
// person-free scene is not a missing portrait, and a role is not a unique person.
export function auditRelocatedCast(quests,review=RELOCATED_CAST_REVIEW){
 const byId=new Map(quests.map(q=>[q.id,q]));
 assert.equal(byId.size,quests.length,'duplicate quest');
 for(const [id,r] of Object.entries(review.quests)){
  const q=byId.get(id);assert.ok(q,`${id}: reviewed quest missing`);
  assert.equal(relocatedCastFingerprint(q),r.sourceSha256,`${id}: source changed; reread and update the cast review`);
  assert.deepEqual(Object.keys(r.scenes).sort(),Object.keys(q.story.scenes).sort(),`${id}: review must cover every scene`);
  for(const [other,client] of Object.entries(r.relatedClients??{}))assert.equal(byId.get(other)?.client,client,`${id}: related client ${other} changed`);
  const used=new Set();
  for(const [sceneId,s] of Object.entries(r.scenes)){
   const node=q.model.graph.find(n=>n.id===sceneId);
   assert.ok(node&&typeof node.text==='string'&&s.evidence?.length&&node.text.includes(s.evidence),`${id}/${sceneId}: evidence missing`);
   assert.ok(['no-person-evidence','person-evidence'].includes(s.decision),`${id}/${sceneId}: invalid review decision`);
   assert.ok(Array.isArray(s.people),`${id}/${sceneId}: people missing`);
   assert.equal(s.people.length>0,s.decision==='person-evidence',`${id}/${sceneId}: decision and people disagree`);
   assert.equal(new Set(s.people).size,s.people.length,`${id}/${sceneId}: duplicate role`);
   assert.ok(s.reason?.length&&s.visual?.length,`${id}/${sceneId}: rationale missing`);
   for(const person of s.people){assert.ok(r.people[person],`${id}/${sceneId}: unknown role ${person}`);used.add(person);}
  }
  for(const [person,p] of Object.entries(r.people)){
   assert.ok(used.has(person),`${id}: role ${person} has no scene evidence`);
   assert.ok(p.label&&p.need&&['candidate','connected'].includes(p.status),`${id}: invalid role ${person}`);
   if(p.status==='connected'){
    assert.equal(q.story.entities[p.entity]?.character,person,`${id}: connected role ${person} lacks its character`);
    for(const [sceneId,s] of Object.entries(r.scenes))assert.equal(q.story.scenes[sceneId].cast.some(c=>c.entity===p.entity),s.people.includes(person),`${id}/${sceneId}: connected cast differs from evidence`);
   }
  }
 }
 const entries=quests.slice().sort((a,b)=>a.number-b.number).map(q=>{
  assert.ok(regions.some(r=>r.id===q.region),`${q.id}: unexpected region`);
  const r=review.quests[q.id],scenes=Object.entries(q.story.scenes),people=Object.entries(q.story.entities).filter(([,e])=>e.kind==='person');
  return {id:q.id,title:q.title,region:q.region,client:q.client,source:q.model.source,sourceSha256:relocatedCastFingerprint(q),
   scenes:scenes.map(([id,s])=>({id,place:s.place,world:q.story.worldPlaces[s.place],cast:s.cast,review:r?.scenes[id]??null})),
   personEntities:people.map(([id,e])=>({id,character:e.character??null})),
   review:r?{identityNotes:r.identityNotes,relatedClients:r.relatedClients,people:r.people,next:r.next}:null};
 });
 const summarize=rows=>({quests:rows.length,scenes:rows.reduce((n,q)=>n+q.scenes.length,0),emptyCastScenes:rows.reduce((n,q)=>n+q.scenes.filter(s=>!s.cast.length).length,0),
  personEntities:rows.reduce((n,q)=>n+q.personEntities.length,0),characterLinkedEntities:rows.reduce((n,q)=>n+q.personEntities.filter(e=>e.character).length,0),
  reviewedQuests:rows.filter(q=>q.review).length,reviewedScenes:rows.reduce((n,q)=>n+q.scenes.filter(s=>s.review).length,0),
  noPersonEvidenceScenes:rows.reduce((n,q)=>n+q.scenes.filter(s=>s.review?.decision==='no-person-evidence').length,0),
  personEvidenceScenes:rows.reduce((n,q)=>n+q.scenes.filter(s=>s.review?.decision==='person-evidence').length,0),
  candidateRoles:rows.reduce((n,q)=>n+Object.values(q.review?.people??{}).filter(p=>p.status==='candidate').length,0),
  connectedRoles:rows.reduce((n,q)=>n+Object.values(q.review?.people??{}).filter(p=>p.status==='connected').length,0)});
 const summary=summarize(entries);summary.unreviewedScenes=summary.scenes-summary.reviewedScenes;
 return {reviewedAt:review.reviewedAt,scope:'relocated-e2-100',summary,regions:regions.map(r=>({...r,...summarize(entries.filter(q=>q.region===r.id))})),quests:entries};
}

const location=p=>p.kind==='town'?`施設 \`${p.location}\``:`\`${p.map}\` (${p.x},${p.y})`;
export function relocatedCastMarkdown(report){
 const s=report.summary,lines=['# 旧100件の人物・出演監査','',
  `照合日: ${report.reviewedAt}。第2版の現場接続済み${s.quests}件を配布JSONから集計する。出演根拠の精読は${s.reviewedQuests}件・${s.reviewedScenes}場面まで。集計と精読、素材制作と実装を区別する。`,'',
  '[不足素材](../world/ASSET_BACKLOG.md) ／ [町・シーン切替](../world/SCENE_SWITCH_PLAN.md) ／ [機械可読の全場面一覧](RELOCATED_CAST_AUDIT.json) ／ [精読の正本](../../authoring/relocated-cast-review.mjs) ／ [集計器](../../tools/audit-relocated-cast.mjs)','',
  '## 現在の結果','',
  `- ${s.scenes}場面中${s.emptyCastScenes}場面のcastが空。空であることだけから人物画の不足とは判定しない。`,
  `- 人物エンティティは延べ${s.personEntities}件、そのうちcharacter接続は${s.characterLinkedEntities}件。依頼間の重複や集団を含み、新規人物数ではない。`,
  `- 精読${s.reviewedScenes}場面のうち、特定人物の同席根拠なし${s.noPersonEvidenceScenes}場面、人物の発言・動作や所在から出演根拠あり${s.personEvidenceScenes}場面。接続済み${s.connectedRoles}役、未接続の制作候補${s.candidateRoles}役。候補数は独立人物としての最終確定数ではない。`,
  `- 残る${s.unreviewedScenes}場面は未精読。未精読を「人物なし」や「制作不要」に変換しない。`,'',
  '## 精読済みの依頼',''];
 for(const q of report.quests.filter(q=>q.review)){
  lines.push(`### ${q.id} ${q.title}`,'',`依頼人: ${q.client}。[配布JSON](../../data/scenario-editions/e2/${q.id}.json) ／ [現場接続の原稿](../../${q.source})。`,'',...q.review.identityNotes.flatMap(n=>[n,'']));
  for(const [id,p] of Object.entries(q.review.people))lines.push(`- ${p.status==='connected'?'接続済み':'制作候補'} \`${id}\`：${p.label}。${p.need}`);
  if(count(q.review.people))lines.push('');
  for(const n of q.scenes){const r=n.review;lines.push(`#### ${n.id}`,'',`場所: ${location(n.world)}。判定: ${r.decision==='person-evidence'?'人物の出演根拠あり':'特定人物の同席根拠なし'}。${r.people.length?'出演役: '+r.people.map(id=>`\`${id}\``).join('、')+'。':''}`,'',`本文の根拠: ${r.evidence}`,'',r.reason,'',`描き分け候補: ${r.visual}`,'');}
  lines.push(`次の作業: ${q.review.next}`,'');
 }
 lines.push('## 全100件の集計','', '次の「人物」はstory.entitiesのkind: personの延べ件数。「精読」は出演根拠の確認範囲で、人物画の接続済み数ではない。','');
 for(const region of report.regions){lines.push(`### ${region.name}`,'',`${region.quests}件・${region.scenes}場面。cast空${region.emptyCastScenes}場面、人物${region.personEntities}件、character接続${region.characterLinkedEntities}件。`,'');
  for(const q of report.quests.filter(q=>q.region===region.id))lines.push(`- [${q.id} ${q.title}](../../data/scenario-editions/e2/${q.id}.json)：${q.scenes.length}場面、cast空${q.scenes.filter(s=>!s.cast.length).length}、人物${q.personEntities.length}。依頼人: ${q.client}。${q.review?'精読済み。':'未精読。'}`);
  lines.push('');
 }
 lines.push('## 更新と検査','',
  '`node tools/audit-relocated-cast.mjs` で本書とJSONを再生成し、`node tools/audit-relocated-cast.mjs --check` で照合する。通常の `npm run check:docs` とCIでも照合する。精読済み依頼は配布JSON全体のSHA-256を固定し、本文・状態・場所・出演・結末等が変われば精読し直すまで検査を失敗させる。再生成だけで精読印を更新しない。関連依頼人の表記変更、根拠の引用消失、場面の追加・欠落、未定義の候補役も拒否する。','',
  '候補IDは監査内だけの識別子。接続済みの役は実際のcharacterとentity・castも照合する。q032の匿名2役・q033の巡礼者・q034の商人・q035の配膳係と顔を隠す患者・q036の指揮者・q037の三人の返却先・q038の検査人・q039の修理人・q040の外の証人は専用画を第2版へ接続済み。q034の被害者たち・q036の六人の歌い手・q039の三人は集団名だけを表示し、人物画を意図的に割り当てない。初版は保持し、全体の保存改訂2・地理版2も維持する。q032・q036は物語改訂2へ移し、正当な旧保存に各2役の所在だけを補う。複数の旧改訂はまとめて検証してから適用する。q036の聖歌隊はgroupであり、上記personエンティティの集計に含まれないが接続済み役数には含まれる。q033〜q035・q037・q040は物語改訂1のまま保存内容を変更しない。q038は物語改訂2へ移し、旧保存の到着履歴・旅程に応じて検査人の所在だけを補う。q039は物語改訂2で修理人と三人の集団の所在だけを補い、buyerへの保持者参照と三人に含まれる人数を保つ。q039のclaimantsもgroupでperson集計には含めない。q040の断片経路は日付だけを記録し、鏡を元の場所に残す本文へ整理した。q131の三人も既存の同行・所在に合わせて専用画とcastを接続した。物語改訂1と現場接続済み旧保存を維持し、現場接続前に受注した旧経路へは人物表示を追加しない。q132の管理人はtest・isolateの2場面へ専用画と実同行を接続済み。物語改訂2では到着履歴と旅程からmanagerAtだけを旧保存へ補い、現場接続前の旧受注経路は保持する。q133の二人を全5場面と往復同行へ接続済み。物語改訂2では隊の所在からdomaAt・masonAtだけを旧保存へ補い、旧受注経路を保持する。q134の全8場面を精読し、ザグ・師・届け先・庫番を人物候補とした。q031〜q040・q131〜q134の局所背景と道具差分は制作候補の段階である。','');
 return lines.join('\n');
}

export async function buildRelocatedCastAudit({check=false}={}){
 const report=auditRelocatedCast(await loadRelocatedCastQuests());
 assert.equal(report.summary.quests,100,'expected all 100 relocated quests');
 for(const r of report.regions)assert.equal(r.quests,20,`${r.name}: expected 20 quests`);
 const files={'doc/scenarios/RELOCATED_CAST_AUDIT.md':relocatedCastMarkdown(report),'doc/scenarios/RELOCATED_CAST_AUDIT.json':JSON.stringify(report,null,2)+'\n'};
 for(const [file,text] of Object.entries(files)){
  const target=path.join(root,file);
  if(check)assert.equal(await fs.readFile(target,'utf8'),text,`${file}: cast audit differs; regenerate after review`);
  else await fs.writeFile(target,text);
 }
 return report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const report=await buildRelocatedCastAudit({check:process.argv.includes('--check')});
 console.log('RELOCATED CAST AUDIT OK: '+JSON.stringify(report.summary));
}
