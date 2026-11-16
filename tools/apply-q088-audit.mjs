import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const hash=x=>createHash('sha256').update(x).digest('hex');
const expected={
  "authoring/editions/e2/oddland/observatory-first.mjs": "24d9d8e6ceffbc0b3d9ca1ed7a0f6277d337284bf952d2110380dae00f0590bc",
  "authoring/relocated-character-art.mjs": "7489654247fb0967aeb0dc82fac341ef243cc01edd61e9739a8d2b6fc778d830",
  "authoring/relocated-cast-review.mjs": "7a62581c9ae81539105f6985c66b99b88484fe9dd7006ac6d28c7458a1f4c8d5",
  "tests/relocated-cast-audit.test.mjs": "4413a2f97343c7f1084f6b94e83af872c3822ee337d14fe7316b83d747ebe327",
  "data/scenario-editions/e2/q088.json": "25bff14a21263f2d30cb8a92fcdd1819df7bfceca0874537ee5e636d44a892e4"
};
for(const [p,h] of Object.entries(expected))assert.equal(hash(fs.readFileSync(p)),h,'Source changed: '+p);
const file='data/scenario-editions/e2/q088.json',fixture='tests/fixtures/e2-q088-before-cast.json';
assert.ok(!fs.existsSync(fixture),'Existing fixture');fs.copyFileSync(file,fixture);
const source='authoring/editions/e2/oddland/observatory-first.mjs';
let text=fs.readFileSync(source,'utf8');assert.ok(!text.includes('q.number===88&&cast'));
const anchor=' if(q.number===89){';assert.ok(text.includes(anchor));
text=text.replace(anchor,` if(q.number===88&&cast){
  x.entities.experts.character='q088_experts';
  for(const scene of ['experts','inspected'])node(scene).cast=[{entity:'experts',display:{x:50}}];
  node('spare').text='工房へ着き、交換用の測定板を確認した。板は出発時に受け取って運ぶ。耐圧窓は現場に残っている。';
  node('lesson').text='観測を終え、割れた測定板を資料室へ運んだ。板はまだ隊が保持しており、ここで教材としての預入を確認する。';
  node('inspected').text='専門の点検班と窓へ戻った。今夜の観測は行わず、ここで班の点検結果を確認して記録する。';
 }
`+anchor);fs.writeFileSync(source,text);
fs.appendFileSync('authoring/relocated-character-art.mjs',`\nrelocatedCharacters.q088_experts={id:'q088_experts',name:'専門の点検班',role:'観測窓全体を点検する専門班',detail:'工房で点検依頼を受け、隊と観測窓へ実同行する。到着しただけでは点検完了とせず、結果の確認を別に行う。',provenance:'2026-11-16。現行本文と既存group・実同行による集団呼称。依頼人イチと同一視せず、人数・個人名・容貌・専用画像を追加しない。'};\n`);
execFileSync('node',['tools/build-scenario-editions.mjs'],{stdio:'inherit'});
const q=JSON.parse(fs.readFileSync(file));
const review={sourceSha256:hash(JSON.stringify(q)),identityNotes:[
 '原稿authoring/quests.txt・structures-5.mjsのQ(88)、初版3場面・現行10場面・8旅程・14行動を精読した。既存expertsの専門点検班を依頼先と実同行後の窓前だけへ表示する。イチ・材料担当者・資料室の係は同席を推測しない。',
 '亀裂は交換式の測定目盛板にあり、耐圧窓は無傷のまま現場に残る。層確認で旧板を隊へ移し、交換材は工房への到着だけでは受け取らずcarry出発時に携行する。窓へ戻るだけでは取り付けず、install_testで窓へ設置して点検を確定する。',
 '観測はobserve_skyの出発時に確定し、旧板は資料室への到着では隊の保持のまま。lesson_finishで保存先へ渡す。交換後の観測中止は観測済みとせず、旧板も隊が保持し続ける。',
 '専門班は工房から窓へ戻るexperts_escortだけ同行する。直接依頼か旧板を外した後かを区別し、inspected到着時はchecked=false。finishで点検結果を確定する。交換材や耐圧窓を班が持ち出すことはない。',
 '物語改訂1、全registry・全14行動・全3結末・報酬・旧受注を維持し、移行処理を追加しない。character参照・2場面cast・3本文以外の配布JSON全体が旧版と一致し、旧保存の待機本文・選択肢もそのまま保持する。原稿の星獣という旧表現から戦闘は追加しない。'
],relatedClients:{},people:{q088_experts:{label:'専門の点検班',status:'connected',entity:'experts',need:'工房で依頼するexpertsと、既存旅程で同行して到着するinspectedだけへ呼称表示する。'}},scenes:{},next:'点検班の限定出演、交換材の出発時携行と窓への設置、観測と旧板保存、新旧保存・全5選択経路と全旅程の帰還・敗北を検証する。次工程はq089「逆さまの天球儀」。'};
const evidence={
 entry:['星が見える時間は今夜だけ。','窓の亀裂と観測期限の情報であり、イチが同席する記述はない。点検班は工房にいる。'],
 panel:['無傷の耐圧窓が残った。','割れた測定目盛板と耐圧窓の違いを隊が確認する。専門班への依頼はまだ行っていない。'],
 observe:['まだ観測の時間が残っている。','自分たちで点検を終えて観測位置へ移る経路。点検班は同行していない。'],
 spare:['交換用の測定板を確認した。','交換材を確認する場面であり、工房のgroupの所在だけを理由に点検班を同席させない。'],
 install:['ここで取付け、密閉と目盛を点検する。','隊が交換材を携行して窓へ戻る。材料はまだ隊が保持し、専門班は工房に残る。'],
 checked:['密閉と目盛の点検が済んだ。','隊が交換して点検済みになった場面。専門班を呼ぶ経路とは別である。'],
 lesson:['板はまだ隊が保持しており','観測後の旧板の預入準備。結末でイチが教材に残すとの言及だけで現地へ配置しない。'],
 experts:['専門の班と窓へ戻る。','工房へ点検を依頼し、既存expertsの専門班が同行を開始する現場。'],
 inspected:['専門の点検班と窓へ戻った。','工房からexperts_escortで専門班が実際に同行して到着する。到着だけでは点検完了にしない。'],
 cancelled:['今夜の観測は見送る。','自分たちの点検後に観測を見送る経路。専門班は同行しておらず、ここにも追加しない。']
};
for(const n of q.model.graph){const [e,reason]=evidence[n.id],people=['experts','inspected'].includes(n.id)?['q088_experts']:[];review.scenes[n.id]={decision:people.length?'person-evidence':'no-person-evidence',people,evidence:e,reason,visual:'耐圧窓・割れた旧板・交換材と専門班の所在を区別し、受渡し・点検・観測・教材保存の確定時点を混同しない。'};}
const reviewPath='authoring/relocated-cast-review.mjs';text=fs.readFileSync(reviewPath,'utf8');assert.ok(!text.includes('  q088:'));assert.ok(text.includes(' quests:{\n'));text=text.replace(' quests:{\n',' quests:{\n  q088:'+JSON.stringify(review,null,2).replaceAll('\n','\n  ')+',\n');fs.writeFileSync(reviewPath,text);
execFileSync('node',['tools/audit-relocated-cast.mjs'],{stdio:'inherit'});
const summary=JSON.parse(fs.readFileSync('doc/scenarios/RELOCATED_CAST_AUDIT.json')).summary;
const testPath='tests/relocated-cast-audit.test.mjs';text=fs.readFileSync(testPath,'utf8');const old='assert.deepEqual(report.summary,';assert.equal(text.split(old).length,2);text=text.replace(/assert\.deepEqual\(report\.summary,\{[^\n]+\}\);/,'assert.deepEqual(report.summary,'+JSON.stringify(summary)+');');fs.writeFileSync(testPath,text);
console.log(JSON.stringify(summary));
