import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const expected={"authoring/editions/e2/salome/machine-first.mjs":"83f0c5b49fecbf58d2ab873bc07f9562e7c4df75888f2da9d2e9b034b9dad0f9","tools/build-machine-quests.mjs":"825727c55707edffaaae53d3aff45233f61ee43cf24206f7ca104899dcb522f9","authoring/relocated-character-art.mjs":"821e3fbbd4961962dd60fa6f8efc540e70fff54c68fec8a2c780f21397f9b0e7","authoring/relocated-cast-review.mjs":"48d078ace4656bcdfba68de8b682e26a3f62f76cb0551b73e6939824e7f4a4d0","tests/relocated-cast-audit.test.mjs":"dbb265310f4cbcd52e3e3960e9765510782895022a14494e49057f93c4bf04c4","data/scenario-editions/e2/q080.json":"e24e6603a2ba2f6cec99dbe5be9ffe00bc8a3d8418f7e5b446681f1ffc5e4bbe"};
for(const [p,h] of Object.entries(expected))if(createHash('sha256').update(fs.readFileSync(p)).digest('hex')!==h)throw Error('q080 baseline changed: '+p);
const fixture='tests/fixtures/e2-q080-before-cast.json';
if(fs.existsSync(fixture))throw Error('q080 fixture already exists');
fs.copyFileSync('data/scenario-editions/e2/q080.json',fixture);
const edit=(p,f)=>{const s=fs.readFileSync(p,'utf8'),next=f(s);if(next===s)throw Error('Missing edit target: '+p);fs.writeFileSync(p,next);};
edit('authoring/editions/e2/salome/machine-first.mjs',s=>s.replace(' return finish();',` if(q.number===80&&cast){
  // Representatives stay at their own approval desks; the party brings back
  // their signed terms. Neither a signature nor arrival teleports a person.
  for(const key of ['maintenance','users','guardians']){
   entity(key+'Person',key+'_place','person');
   x.entities[key+'Person'].character='q080_'+key;
   node(key+'_signed').cast=[{entity:key+'Person',display:{x:50}}];
  }
  node('maintenance_signed').text='整備者の承認窓口へ来た。代表は、故障時に一人でも停止を請求できることを署名の条件に挙げる。条件を確認して署名を受け、中枢へ持ち帰る。';
  node('users_signed').text='利用者の相談窓口へ来た。代表は、夜の空調を勝手に切られないことを署名の条件に挙げる。条件を確認して署名を受け、中枢へ持ち帰る。';
  node('guardians_signed').text='避難路を確かめる保護者席へ来た。代表は、避難路が閉じる命令を承認しないことを署名の条件に挙げる。条件を確認して署名を受け、中枢へ持ち帰る。';
  node('restored').text='単独で承認を飛ばす鍵を破棄して、中枢へ戻った。三つの端子へ署名を接続して短絡を外し、整備・利用・保護の役割を分けた共同管理を確定する。';
 }
 return finish();`));
edit('tools/build-machine-quests.mjs',s=>s.replace("  if(n===171)",`  if(n===80){
   const previous=compileRelocatedQuest(first,source(first,{cast:false}),options).story;
   for(const [key,entry] of Object.entries(previous.registry))quest.story.registry[key]=structuredClone(entry);
   const values=['maintenance','users','guardians'].map(key=>({key:key+'PersonAt',value:key+'_place'}));
   for(const entry of values)quest.story.registry[entry.key].values=[entry.value];
   quest.story.revision=2;quest.model.edition.revision=2;
   quest.model.storyUpgrades=[{fromRevision:1,toRevision:2,previous,values}];
  }
  if(n===171)`));
edit('authoring/relocated-character-art.mjs',s=>s+`\n// q080 representatives are roles, not inferred named clients or portraits.
for(const [id,name,role,detail] of [
 ['maintenance','整備者の代表','停止権と点検を担う承認者','故障時に一人でも停止を請求できる条件を整備者の承認窓口で確認する。'],
 ['users','利用者の代表','稼働時間を協議する承認者','夜の空調を勝手に切られない条件を利用者の相談窓口で確認する。'],
 ['guardians','保護者の代表','避難路の保護を担う承認者','避難路が閉じる命令を承認しない条件を保護者席で確認する。']
])relocatedCharacters['q080_'+id]={id:'q080_'+id,name,role,detail,provenance:'2026-11-16。原稿と現行の三者署名の発言に基づく呼称表示。代表は各窓口に留まり、セリとの同一性・氏名・容貌・専用画を追加しない。'};
`);
execFileSync(process.execPath,['tools/build-scenario-editions.mjs'],{stdio:'inherit'});
const q=JSON.parse(fs.readFileSync('data/scenario-editions/e2/q080.json','utf8'));
const roles=['maintenance','users','guardians'];
const note={
 sourceSha256:createHash('sha256').update(JSON.stringify(q)).digest('hex'),
 identityNotes:[
  '整備側原稿authoring/quests.txt・structures-4.mjsのQ(80)、初版2場面・現行7場面を精読した。三者の代表は個別の承認窓口で役割と条件を確認する。依頼人セリとの同一性や氏名・容貌を追加しない。',
  '整備・利用・保護の代表をmaintenance_signed・users_signed・guardians_signedにだけ呼称表示する。固定所在はそれぞれの窓口。全8旅程の同行者は空のまま。councilの説明だけから三者を中枢へ同席させず、鍵の破棄と復帰に人物を追加しない。',
  '受注条件は機関廟3件完了。各署名は各窓口から中枢へ戻る出発時に確定し、到着だけでは未署名。全三署名を得るまでrestoreを許さず、再署名を拒否し、途中保留では既存署名を保持する。',
  '単独支配鍵は破棄台へ向かう出発時に隊が携行し、帰路の出発時に破棄台へ渡して破砕を記録する。中枢へ戻っただけでは共同管理を確定せず、restoredのfinishで確定する。強行戦勝利時の鍵取得と単独支配は別経路。',
  '物語改訂1→2は旧定義で保存全体を検証後、三役の固定所在だけを補う。既存registry・行動・結末・報酬・旧受注と表示途中の本文・選択肢を保持する。三つの署名場面とrestoredの本文を既存の確定時点へ合わせる。'
 ],relatedClients:{},people:Object.fromEntries(roles.map((key,i)=>['q080_'+key,{label:['整備者の代表','利用者の代表','保護者の代表'][i],status:'connected',entity:key+'Person',need:'既存の署名条件を述べる個別窓口にのみ呼称表示。中枢と破棄台には同行しない。'}])),
 scenes:{
  entry:{decision:'no-person-evidence',people:[],evidence:'玉座の下には三つの端子があり',reason:'中枢の構造を観察する場面。セリや三者代表の同席は指定されていない。',visual:'単独承認の短絡と三つの端子を区別する。'},
  council:{decision:'no-person-evidence',people:[],evidence:'各代表が、自分の責任を確認してから署名する。',reason:'三者承認の手順を提示する中枢。現行旅程では個別窓口へ訪問して署名を持ち帰り、代表自身は同行しない。',visual:'署名の組合せと選択可否を表示し、代表の瞬間移動を作らない。'},
  maintenance_signed:{decision:'person-evidence',people:['q080_maintenance'],evidence:'代表は、故障時に一人でも停止を請求できることを署名の条件に挙げる。',reason:'整備者が自分の停止権と点検責任を署名の条件として述べる個別窓口。',visual:'署名はreturn出発時。到着だけで承認済みにしない。'},
  users_signed:{decision:'person-evidence',people:['q080_users'],evidence:'代表は、夜の空調を勝手に切られないことを署名の条件に挙げる。',reason:'利用者が稼働時間に関する条件を確認する相談窓口。',visual:'利用者本人をこの窓口に留め、隊が署名を持ち帰る。'},
  guardians_signed:{decision:'person-evidence',people:['q080_guardians'],evidence:'代表は、避難路が閉じる命令を承認しないことを署名の条件に挙げる。',reason:'保護者が避難路の保護を承認の条件として述べる場所。',visual:'保護者の確認と署名済み状態を区別する。'},
  destroy:{decision:'no-person-evidence',people:[],evidence:'単独で承認を飛ばす鍵だけを破棄する。',reason:'隊が三者の署名を照合して単独支配鍵を破棄する場所。代表の同行はない。',visual:'到着時は隊が鍵を保持し、return出発時に破棄する。'},
  restored:{decision:'no-person-evidence',people:[],evidence:'単独で承認を飛ばす鍵を破棄して、中枢へ戻った。',reason:'隊が中枢へ戻って共同管理を確定する場面。結末で鍵を配るセリを作業中の同席者とは断定しない。',visual:'鍵破砕は済んでいるが、共同管理と依頼完了はfinishで確定する。'}
 },next:'三者の署名順と途中保留を含む24経路、現行・旧保存・旧受注、固定所在、管理鍵、強行戦敗北後の切替と報酬一回性を検証する。次はq081「落ちてこない星」。q171の妻は別途未接続候補1役として保持する。'
};
edit('authoring/relocated-cast-review.mjs',s=>s.replace(' quests:{',' quests:{\n  q080:'+JSON.stringify(note,null,2)+',').replace(/reviewedAt:'[^']+'/g,"reviewedAt:'2026-11-16'"));
const {auditRelocatedCast,loadRelocatedCastQuests,buildRelocatedCastAudit}=await import('../tools/audit-relocated-cast.mjs');
const report=auditRelocatedCast(await loadRelocatedCastQuests());
edit('tests/relocated-cast-audit.test.mjs',s=>s.replace(/assert\.deepEqual\(report\.summary,\{[^;]+\}\);/,'assert.deepEqual(report.summary,'+JSON.stringify(report.summary)+');'));
await buildRelocatedCastAudit();
console.log('q080 audit',JSON.stringify(report.summary));
