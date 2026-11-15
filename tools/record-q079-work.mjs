import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const rows=JSON.parse(await fs.readFile('doc/development/Q079_PLAYTEST_RESULTS.json','utf8'));
assert.equal(rows.length,7);for(const r of rows){assert.equal(r.status,'cleared');assert.equal(r.records.losses,0);assert.equal(r.records.escapes,0);assert.equal(r.rescues,0);}
const text=`## q079 九十九回の再起動 — 2026-11-16

前工程q078のPR #258は先端9c22965a96a55d1400c7d3d3f3cae6f407491ab3の全18系統成功を確認し、master c3d124f1bfa661fcadc8e59668d57f91c9810e45へ統合した。統合後検査・公開処理の最終結果はPRへ記録し、公開サイトでの実操作とは区別する。

原稿authoring/quests.txt・structures-4.mjsのQ(79)、初版3場面・現行5場面を精読した。全5場面は同席者の根拠がなく、人物不在として監査登録した。結末で確認するユアを作業場面へ追加せず、人物画・同行者・新規状態も加えない。物語改訂1・全registry・4旅程・9行動・3結末・報酬・旧受注を維持する。

試験観察と満杯表示の確認、炉停止と記録板携行、退避先の読取り、元の板の消去、原板保管、小炉稼働を区別する。炉停止と板携行はfull_shutdown出発、退避確認は実到着、消去はarchive_clear出発、原板保管はarchive_replace出発、板の設置・再起動・終了記録保存はrestartedのfinish、小炉稼働はsmallのfinishで確定する。restarted・smallの本文2箇所だけを確定時点に合わせ、表示途中の旧本文と選択肢を保持する。配布JSON全体比較で本文以外の不変を確認した。

専用12試験・出演監査7試験・機関廟既存50試験、計69件が成功。現行・旧保存・旧受注の全7選択経路を非循環グラフからの全列挙と照合した。全5場面・4旅程・9行動、戦闘中の保存再開、全旅程の帰還印・敗北救助、記録板と退避記録の保持者、強行戦の逃走拒否・敗北後再戦と通常手順への切替、不正保存の原子的拒否、報酬一回性を確認した。初回の検査でfixtureの保存文字列を関数として呼んだ試験コード1件が失敗し、参照を修正して全69件を再実行した。ゲーム側の状態定義は変更せず、失敗試行を成功件数に含めない。

標準Lv8・現場開始・seed1907・3編成で全7経路を通常攻略。再起動の2経路は各105歩・2戦2勝・240→444G、原板保管後の小炉2経路は各82歩・2戦2勝・240→394G、直接小炉2経路は各23歩・1戦1勝・240→373G、強行経路は0歩・1戦1勝・240→443G。全条件で敗北・逃走・救助0。能力補正・乱数上書き・強制回復なし。有限7条件の観測で、全編成・全seedの保証ではない。詳細はQ079_PLAYTEST_RESULTS.json、再現はnode tools/measure-restart-ledger.mjs。

27保存点×Scene/Classic×1440/390px＝108画面条件を専用Chromium検査へ追加した。試験観察の有無、原板の所在、直接小炉と記録室経由、finish前、旧保存・旧受注・敗北後再開を分ける。表示用の高レベル・遭遇抑制fixtureは通常攻略とは別。実画面と全体CIの結果はPRへ記録する。

出演監査89件・673場面、未監査11件・80場面。q171の妻は別途候補1役のまま。次は配布JSONの正式題名q080「鉄胎の継承」。

`;
for(const p of ['doc/HANDOFF.md','doc/CURRENT_STATUS.md','doc/development/PROGRESS.md','doc/development/REMAINING_WORK.md','doc/development/TEST_OVERVIEW.md']){
 const s=await fs.readFile(p,'utf8');assert.ok(!s.includes('## q079 九十九回の再起動 — 2026-11-16'));const at=s.indexOf('\n');await fs.writeFile(p,s.slice(0,at+1)+'\n'+text+s.slice(at+1).replace(/^\n+/,''));
}
console.log('q079 verified trial results and handoff recorded');
