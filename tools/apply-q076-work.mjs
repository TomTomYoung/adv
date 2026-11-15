import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const sha=x=>createHash('sha256').update(x).digest('hex');
const review={
 "sourceSha256": "8b2a32b6e36af87ee59a912bb4d13cf17ac0c90e9322e57643dc40cc4c79fe84",
 "identityNotes": [
  "整備側原稿authoring/quests.txt・structures-4.mjsのQ(76)、初版3場面・現行6場面・7旅程・10行動・3結末を精読。保育室は無人と明記され、歌は空調の制御信号。子供・整備士フウ・薬師・保管係の現場への同席を推測しない。",
  "現行6場面すべてno-person-evidenceとして登録する。自動人形を人間の役へ変換せず、人物定義・画像・同行者は追加しない。結末での整備士や薬師への言及を完了前の固定出演へ読み替えない。",
  "薬はentry_medicineまたはfetch_carryの出発時に隊が携行し、冷蔵庫への実到着で保護と受領が確定する。protected後のcontrol_moveは無効のまま。録音はcontrol_rewireの出発時に携行、recorded_finishで預ける。別回線化・薬の物理移送・歌停止・録音預入を混同しない。",
  "物語改訂1・registry・全行動・報酬・旧受注を維持。fetch・stopped・recordedの3本文だけを確定時点へ合わせる。表示途中の旧本文と選択肢を保持し、既存の非戦闘電源断に戦闘を追加しない。旧受注の反復可能な経路は現行の保護後制限へ変更しない。"
 ],
 "relatedClients": {},
 "people": {},
 "scenes": {
  "entry": {
   "decision": "no-person-evidence",
   "people": [],
   "evidence": "子守歌が保育室の空調灯と同じ拍で続く。",
   "reason": "無人の保育室で機械の歌と薬を確認する。依頼人の職業や結末の整備士から同席を推測しない。",
   "visual": "薬は棚、録音は操作盤。先に電源を切ると薬の損失が確定する。"
  },
  "control": {
   "decision": "no-person-evidence",
   "people": [],
   "evidence": "保育室の空調を一定に保つ制御信号だ。",
   "reason": "歌と空調信号の技術的関係を調べる場面であり、操作者や職人の同席は明記されない。",
   "visual": "薬保護の前後でmoveの可否を区別し、人影で制御を説明しない。"
  },
  "moved": {
   "decision": "no-person-evidence",
   "people": [],
   "evidence": "薬は別の冷蔵庫へ収まった。",
   "reason": "別回線の冷蔵庫に受領された薬を確認する。受領した人物の描写ではない。",
   "visual": "薬の保持者fridgeとprotectedは実到着で確定し、歌はまだ止めていない。"
  },
  "fetch": {
   "decision": "no-person-evidence",
   "people": [],
   "evidence": "薬は棚にあり",
   "reason": "隊が保育室へ戻って薬を運ぶ準備をする。原稿どおり保育室は無人である。",
   "visual": "薬の保持者は出発前entry。受取済みと先取りしない。"
  },
  "stopped": {
   "decision": "no-person-evidence",
   "people": [],
   "evidence": "薬の移送記録を持って保育室へ戻った。",
   "reason": "薬の保護確認と人形停止の準備。完了後の整備士の行動は完了前の同席根拠ではない。",
   "visual": "歌停止はfinish時点。保育室到着だけではstoppedを立てない。"
  },
  "recorded": {
   "decision": "no-person-evidence",
   "people": [],
   "evidence": "録音はまだ隊が保持しており",
   "reason": "保管室で試験記録と録音を預ける準備。保管係の同席は書かれていない。",
   "visual": "separateCircuitは出発時、録音預入recordedと完了はfinish時。"
  }
 },
 "next": "現行・旧保存の全6経路、旧受注の有界12経路、全7旅程の帰還・敗北救助、薬と録音の保持者、全場面の人物不在を検証する。次はq077「聖痕の配線」。"
};
if(process.argv.includes('--record')){
 const rows=JSON.parse(fs.readFileSync('doc/development/Q076_PLAYTEST_RESULTS.json','utf8'));
 assert.equal(rows.length,6);assert.ok(rows.every(r=>r.status==='cleared'&&r.records.losses===0&&r.records.escapes===0&&r.rescues===0));
 const summary=rows.map(r=>r.config.party+' '+r.route.join('→')+'：'+r.steps+'歩・'+r.records.battles+'戦'+r.records.wins+'勝・'+r.gold.start+'→'+r.gold.end+'G').join('。');
 const text='## q076 鉄の子守歌 — 2026-11-16\n\n'+
 'PR #255は先端1f48deb490492f07be053ad6d2f9ce97fe65cfaeの全15系統成功後、master 83575ee479a1d3780d37066032a74fc5bb63a281へ統合した。統合後検査・公開処理はPRで確認し、公開サイトでの実操作とは区別する。\n\n'+
 '整備側原稿・初版3場面・現行6場面を精読し、全場面を人物不在として監査登録。無人の保育室に子供・整備士フウ・薬師を追加せず、人形を人物画像へ変換しない。物語改訂1、全registry、7旅程・10行動・3結末・報酬・旧受注を維持する。fetch・stopped・recordedの3本文だけを薬の携行・歌の停止・録音の預入の確定時点へ合わせ、表示途中の旧本文と選択肢を保持する。\n\n'+
 '専用12試験・出演監査7試験・機関廟既存50試験の計69試験が成功。現行・旧保存の全6経路を状態条件付きの列挙と照合し、旧受注の反復はmoveを2回までに限定した12経路を検証した。全6場面・7旅程・10行動の保存再開、全旅程の帰還印・敗北救助、薬保護後の再移送拒否、薬と録音の保持者、不正保存の原子的拒否・報酬の一回性を確認した。旧受注の無限反復全体を有限12経路で網羅したとは扱わない。\n\n'+
 '初回fixture作成で電源断を戦闘と誤認した検査が失敗した。現行・旧版とも非戦闘であることを確認し、架空の戦闘を追加せず、移動中の敗北救助へfixtureを修正して再実行した。失敗試行は成功件数に含めない。\n\n'+
 '標準Lv8・現場開始・seed1907・3編成で全6経路を通常攻略。'+summary+'。敗北・逃走・救助0。能力補正・乱数上書き・強制回復なし。有限6条件の観測であり全編成・全seedの保証ではない。詳細はQ076_PLAYTEST_RESULTS.json、再現はnode tools/measure-iron-lullaby.mjs。\n\n'+
 '21保存点×Scene/Classic×1440/390px＝84画面条件を専用Chromium検査へ追加。全場面の人物不在、薬保護後のmove無効、旧本文、旧受注、敗北救助後の再開を分ける。高レベル・遭遇抑制fixtureは通常攻略と別の検査。実画面と全体CIの実施結果はPRへ記録する。\n\n'+
 '出演監査86件・658場面、未監査14件・95場面。q171の妻は別途候補1役を保持する。次はq077「聖痕の配線」。\n\n';
 for(const file of ['doc/HANDOFF.md','doc/CURRENT_STATUS.md','doc/development/PROGRESS.md','doc/development/REMAINING_WORK.md','doc/development/TEST_OVERVIEW.md']){
  const old=fs.readFileSync(file,'utf8');assert.ok(!old.includes('## q076 鉄の子守歌 — 2026-11-16'));const n=old.indexOf('\n');fs.writeFileSync(file,old.slice(0,n+1)+'\n'+text+old.slice(n+1).trimStart());
 }
}else{
 const expected={
  'authoring/editions/e2/salome/machine-first.mjs':'7b4648e67be952c7ab6bd20c41a4cd52700bb17c0656b030babc7946b355dea3',
  'authoring/relocated-cast-review.mjs':'d65f5c64a34f1733cff46c7722592a74ff62eb4dd543678914c4277fa0fbd4b6',
  'tests/relocated-cast-audit.test.mjs':'fe418c13d882e70dae674a9cd7fc32878500e9c2aba488240c4036ed0c6f8859',
  'data/scenario-editions/e2/q076.json':'267e9f356b3f9b286789ecde95a679f639829bad2feeff464d320f37e240ca61'
 };
 for(const [file,hash] of Object.entries(expected))assert.equal(sha(fs.readFileSync(file)),hash,file+' changed');
 const fixture='tests/fixtures/e2-q076-before-audit.json';assert.ok(!fs.existsSync(fixture));fs.copyFileSync('data/scenario-editions/e2/q076.json',fixture);
 const source='authoring/editions/e2/salome/machine-first.mjs',old=fs.readFileSync(source,'utf8'),anchor=' if(q.number===77){';assert.equal(old.split(anchor).length,2);fs.writeFileSync(source,old.replace(anchor," if(q.number===76&&cast){\n  // The nursery is explicitly unoccupied. Do not infer an offstage cast from\n  // the client or ending text; keep medication receipt and song storage distinct.\n  node('fetch').text='保育室へ戻った。薬は棚にあり、ここから携行して別回線の冷蔵庫へ運ぶ。受領されるまでは移送を終えていない。';\n  node('stopped').text='薬の移送記録を持って保育室へ戻った。別回線の冷蔵庫での受領を確かめてから、人形の歌を止める。';\n  node('recorded').text='空調を別回線へ移した試験記録と歌の録音を持って、保管室へ着いた。録音はまだ隊が保持しており、預けてから依頼を終える。';\n }\n"+anchor));
 execFileSync('node',['tools/build-machine-quests.mjs'],{stdio:'inherit'});
 const q=JSON.parse(fs.readFileSync('data/scenario-editions/e2/q076.json','utf8'));assert.equal(sha(JSON.stringify(q)),review.sourceSha256);
 const path='authoring/relocated-cast-review.mjs',r=fs.readFileSync(path,'utf8');assert.ok(!r.includes('  q076:'));fs.writeFileSync(path,r.replace(' quests:{\n',' quests:{\n  q076:'+JSON.stringify(review,null,2)+',\n'));
 const test='tests/relocated-cast-audit.test.mjs',t=fs.readFileSync(test,'utf8');assert.ok(t.includes('"reviewedQuests":85,"reviewedScenes":652,"noPersonEvidenceScenes":185'));fs.writeFileSync(test,t.replace('"reviewedQuests":85,"reviewedScenes":652,"noPersonEvidenceScenes":185','"reviewedQuests":86,"reviewedScenes":658,"noPersonEvidenceScenes":191').replace('"unreviewedScenes":101','"unreviewedScenes":95'));
 execFileSync('node',['tools/audit-relocated-cast.mjs'],{stdio:'inherit'});
}
