// One-time, source-checked authoring update. Removed before the feature is merged.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const sha=s=>createHash('sha256').update(s).digest('hex');
const expected={
 'authoring/editions/e2/salome/library-second.mjs':'621f4fd9c49943207b4aa9ebb6eb2a2d6159f664e69a51eb25ade7130c805d99',
 'authoring/relocated-character-art.mjs':'d3d4ec59b79255412ef50e5768afc33fe834fec9121cad074f03ea2fb2c0b805',
 'authoring/relocated-cast-review.mjs':'4130a8dfd9879aecd032c2228db198ba3f6ada58287a191d66f2fd92afd331bf',
 'tests/relocated-cast-audit.test.mjs':'86a8f0bdaaa25ced27bebda58f04686eb3c516d9477931171b18c10377e62dff',
 'data/scenario-editions/e2/q148.json':'2c26d43b3cbd28f436fdc797495682c7d1e83857d145f4ffee995d76d3ddee87'
};
for(const [p,h] of Object.entries(expected))if(sha(fs.readFileSync(p))!==h)throw Error('Source changed: '+p);
const fixture='tests/fixtures/e2-q148-before-cast.json';if(fs.existsSync(fixture))throw Error('Existing baseline fixture');
fs.copyFileSync('data/scenario-editions/e2/q148.json',fixture);
const source='authoring/editions/e2/salome/library-second.mjs';
let text=fs.readFileSync(source,'utf8'),anchor=' if(q.number===149){';
if(text.split(anchor).length!==2)throw Error('Source anchor mismatch');
text=text.replace(anchor,` if(q.number===148&&cast){
  x.entities.egi.character='q148_egi';
  x.entities.customer.character='q148_customer';
  // Both people follow the existing market/office journeys. Recovering the
  // scale after an accusation leaves them at the office, not at the market.
  for(const scene of ['market','proof','denied','public_demo','private_refund'])
   node(scene).cast=['egi','customer'].map((entity,i)=>({entity,display:{x:[31,69][i]}}));
 }
`+anchor);fs.writeFileSync(source,text);
const art='authoring/relocated-character-art.mjs';
fs.appendFileSync(art,`\nfor(const [id,name,role,detail] of [
 ['egi','エギ','秤師','自責に反応する秤を純度の秤と称して買取に使う。比較前の告発には反論し、既存の旅程で客と審査窓口を往復する。'],
 ['customer','買取を受ける客','市場の買取客','謝るたび買取額を下げられていた客。同じ硬貨の比較と返金の当事者であり、私的返金はこの客だけを対象とする。']
])relocatedCharacters['q148_'+id]={id:'q148_'+id,name,role,detail,provenance:'2026-11-14。原稿と現行本文・既存同行に基づく呼称表示。客の氏名・容貌・罪の内容、第二の被害客・専用画を追加しない。'};\n`);
execFileSync(process.execPath,['tools/build-scenario-editions.mjs'],{stdio:'inherit'});
const q=JSON.parse(fs.readFileSync('data/scenario-editions/e2/q148.json','utf8'));
const person=(evidence,reason,visual)=>({decision:'person-evidence',people:['q148_egi','q148_customer'],evidence,reason,visual});
const absent=(evidence,reason,visual)=>({decision:'no-person-evidence',people:[],evidence,reason,visual});
const review={
 sourceSha256:sha(JSON.stringify(q)),
 identityNotes:[
  '原稿volume-05のGQ048、初版3場面、現行8場面・8旅程・13行動・3結末を精読した。エギと客の既存person・所在・同行にだけ呼称表示を接続する。',
  '市場・比較・私的返金と、実同行で到着する審査窓口の告発・公開実演の5場面に二役を表示する。告発後の秤回収fetch_scaleでは二人はofficeに残る。保管窓口removedにはどの経路でも同行しない。',
  '比較には同じcoinを使用する。公開経路だけscaleとcoinを出発時に携行し、finishで秤をofficeへ、硬貨をcustomerへ渡す。回収経路は秤だけを携行し、finishでstorageへ渡す。',
  'proof、demonstrated、refundProcedureStarted、oneRefunded、removedを区別する。公開は返金手続の開始であって全被害者への返金完了ではない。本文・全行動・物語改訂1・保存の定義域・旧受注・報酬は変えない。原稿の第二の被害客・仕入れ元・逃走追跡を現行実装に補わない。'
 ],relatedClients:{},
 people:{
  q148_egi:{label:'秤師エギ',status:'connected',entity:'egi',need:'市場と審査窓口の既存同行先5場面に表示。秤回収への追加同行はしない。'},
  q148_customer:{label:'買取を受ける客',status:'connected',entity:'customer',need:'エギと同じ既存同行先5場面に表示。客の内心・氏名・外見を追加しない。'}
 },
 scenes:{
  entry:absent('現物と客を市場で確かめる。','相談卓で申立を読む。二人の初期所在はmarketであり同席していない。','申立と訪問先を区別する。'),
  denied:person('エギは硬貨の違いだと反論した。','market_accuseでエギと客が審査窓口へ実同行する。','比較前の反論。戻る経路と回収へ切り替える経路で所在が分かれる。'),
  proof:person('同じ硬貨でも持主を替えると重さが変わった。','市場で同じcoinの載せ手を替える実験。二人はmarketにいる。','硬貨の同一性と比較結果を扱い、内心の告白を追加しない。'),
  market:person('秤師エギは純度の違いだと言った。','エギの発言と客の謝罪が明示される。初回訪問または二人を連れた再訪で到着する。','秤と硬貨はmarketにあり、比較前に証明済みとしない。'),
  public_demo:person('同じ硬貨を替えずに載せ手だけを替え','proof_publicで二人と秤・硬貨を審査窓口へ運ぶ。','実到着だけでは受渡し・返金手続開始・報酬を確定せず、finishで確定する。'),
  private_refund:person('この客の返金を確認する。','市場に留まったエギと客の私的交渉。','この客だけの返金と、公開の返金手続を混同しない。'),
  fetch_scale:absent('買取台へ戻った。','denied_removeは隊だけが市場へ戻る。エギと客はofficeに残る。','秤はmarketにあり、carryで初めて隊が携行する。'),
  removed:absent('使用停止だけを記録する。','秤だけを保管窓口へ運ぶ。二人は経路に応じmarketまたはofficeに残る。','秤の引渡しはfinishで確定。過去の被害や返金完了を補わない。')
 },next:'全8場面・8旅程・13行動の新旧保存、告発と再比較の反復、秤と同じ硬貨の保持者、二人の同行と回収時の不在、3結末の一回報酬を検証する。次はq149「売らない剣」。'
};
const audit='authoring/relocated-cast-review.mjs';text=fs.readFileSync(audit,'utf8');
const mark=' quests:{\n';if(text.split(mark).length!==2)throw Error('Audit anchor mismatch');
fs.writeFileSync(audit,text.replace(mark,mark+'  q148:'+JSON.stringify(review,null,2).replaceAll('\n','\n  ')+',\n'));
const tests='tests/relocated-cast-audit.test.mjs';text=fs.readFileSync(tests,'utf8');
const old={quests:100,scenes:753,emptyCastScenes:318,personEntities:144,characterLinkedEntities:126,reviewedQuests:77,reviewedScenes:592,noPersonEvidenceScenes:156,personEvidenceScenes:436,candidateRoles:1,connectedRoles:173,unreviewedScenes:161};
const now={...old,emptyCastScenes:313,characterLinkedEntities:128,reviewedQuests:78,reviewedScenes:600,noPersonEvidenceScenes:159,personEvidenceScenes:441,connectedRoles:175,unreviewedScenes:153};
if(!text.includes(JSON.stringify(old)))throw Error('Audit totals changed');text=text.replace(JSON.stringify(old),JSON.stringify(now));
const testAnchor=' const banner=report.quests.find(q=>q.id===\'q141\');';
if(!text.includes(testAnchor))throw Error('Test anchor mismatch');
text=text.replace(testAnchor,` const scaleQuest=report.quests.find(q=>q.id==='q148');
 assert.deepEqual(Object.keys(scaleQuest.review.people),['q148_egi','q148_customer']);
 assert.deepEqual(Object.fromEntries(scaleQuest.scenes.map(s=>[s.id,s.cast.map(c=>c.entity)])),{
  entry:[],denied:['egi','customer'],proof:['egi','customer'],market:['egi','customer'],
  public_demo:['egi','customer'],private_refund:['egi','customer'],fetch_scale:[],removed:[]
 });
`+testAnchor);fs.writeFileSync(tests,text);
execFileSync(process.execPath,['tools/audit-relocated-cast.mjs'],{stdio:'inherit'});
console.log('q148 authoring and audited data generated; previous definition preserved verbatim.');
