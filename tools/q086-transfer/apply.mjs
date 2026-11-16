import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const source='authoring/editions/e2/oddland/observatory-first.mjs',fixture='tests/fixtures/e2-q086-before-cast.json';
assert.ok(!fs.existsSync(fixture),'Previous definition already preserved');
fs.copyFileSync('data/scenario-editions/e2/q086.json',fixture);
let s=fs.readFileSync(source,'utf8');
assert.ok(!s.includes('if(q.number===86&&cast)'));
const anchor=' if(q.number===87){';assert.equal(s.split(anchor).length,2);
s=s.replace(anchor,` if(q.number===86&&cast){
  // The observer is an automatic instrument. No person is present in these scenes.
  node('mapped').text='旧報告を新旧の対応表とともに資料室へ運んだ。報告はまだ隊が保持しており、これから保存先への引渡しを確認する。';
  node('annotated').text='旧暦の注記を付けた報告を資料室へ運んだ。新旧の一括対応表は作っていない。報告は隊が保持しており、ここで保存を確認する。';
 }
`+anchor);fs.writeFileSync(source,s);
execFileSync(process.execPath,['tools/build-scenario-editions.mjs'],{stdio:'inherit'});
const q=JSON.parse(fs.readFileSync('data/scenario-editions/e2/q086.json'));
const evidence={
 entry:['今夜しかない星の並びが描かれている。','日付と星の並びを示す報告を読む場面。書いた機械や依頼人の言及は人物の同席ではない。'],
 mail:['受領用の歯車が欠け','通信箱・受領歯車・通知が対象。receiverはitemであり、人の受付係にしない。'],
 mapping:['長命な人ではなく','観測者が自動観測器であると明示される。人の観測者、修理人、シオを推測で置かない。'],
 repaired:['受領歯車を直し','mail_repairで修理を実行済み。修理担当者の存在は記述されていない。'],
 mapped:['報告はまだ隊が保持しており','資料室へ持参した報告と対応表が対象。保存係の同席根拠はない。保存はfinishで確定する。'],
 annotate:['日ごとの注記を付ける。','日別注記を行う隊の作業場面。将来の当番への言及で人物を追加しない。'],
 annotated:['ここで保存を確認する。','注記した旧報告の預入前。資料室の受付役を補わない。対応表との違いを保持する。']
};
const review={sourceSha256:createHash('sha256').update(JSON.stringify(q)).digest('hex'),identityNotes:[
 '原稿authoring/quests.txt・structures-5.mjsのQ(86)、初版3場面・現行7場面・5旅程・11行動を精読。自動観測器を人物と取り違えず、全場面のcastを空のまま監査登録する。依頼人シオ、通信係、修理人、保存係は追加しない。',
 '通知はentry_reply出発時に隊が携行し、通信箱への到着時にreceiverへ投入する。投入だけではreceiverFixedは成立せず、mail_repairで受領歯車を修理する。修理後の報告確認でtruthを知る。',
 '旧報告は対応表または日別注記の経路で資料室へ出発するときに携行し、到着後のfinishでarchiveへ渡す。対応表と日別注記、修理の有無と報告の保存を分ける。破棄はdiscardedで記録し、架空の護衛戦を追加しない。',
 '物語改訂1・全registry・全行動・報酬・旧受注を維持し、移行処理は追加しない。資料室の2本文以外の配布JSON全体が旧版と一致し、旧保存の待機本文と選択肢も維持する。'
],relatedClients:{},people:{},scenes:Object.fromEntries(Object.entries(evidence).map(([id,[text,reason]])=>[id,{decision:'no-person-evidence',people:[],evidence:text,reason,visual:'人物呼称・人物画を追加せず、通知・報告・機構と処理の確定時点を区別する。'}])),next:'通知投入と修理、対応表と日別注記、報告の携行とfinish保存、全5経路・全旅程の新旧保存と中断再開を検証する。次はq087「願いを消す流星」。'};
const file='authoring/relocated-cast-review.mjs';s=fs.readFileSync(file,'utf8');assert.ok(!s.includes('  q086:{'));assert.ok(s.includes(' quests:{\n'));s=s.replace(' quests:{\n',' quests:{\n  q086:'+JSON.stringify(review,null,2).replaceAll('\n','\n  ')+',\n');fs.writeFileSync(file,s);
const tests='tests/relocated-cast-audit.test.mjs';s=fs.readFileSync(tests,'utf8');const before='"reviewedQuests":95,"reviewedScenes":716,"noPersonEvidenceScenes":222';assert.ok(s.includes(before));s=s.replace(before,'"reviewedQuests":96,"reviewedScenes":723,"noPersonEvidenceScenes":229').replace('"unreviewedScenes":37','"unreviewedScenes":30');fs.writeFileSync(tests,s);
execFileSync(process.execPath,['tools/audit-relocated-cast.mjs'],{stdio:'inherit'});
