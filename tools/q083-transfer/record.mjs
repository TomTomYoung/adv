import fs from 'node:fs';
import assert from 'node:assert/strict';
const rows=JSON.parse(fs.readFileSync('doc/development/Q083_PLAYTEST_RESULTS.json','utf8'));
assert.equal(rows.length,5);assert.ok(rows.every(r=>r.status==='cleared'));
const report=JSON.parse(fs.readFileSync('doc/scenarios/RELOCATED_CAST_AUDIT.json','utf8'));
assert.equal(report.summary.reviewedQuests,93);assert.equal(report.summary.reviewedScenes,699);
const section=`## q083 地底の日食 — 2026-11-16

PR #262は先端92ea475ab44ba03ee4781bec651688aa04f530fbの全22系統成功後、master 0b0fb9a6117fcb331a5eb9b26a4d70a74ee90a18へ統合した。統合後検査・公開処理の結果はPRで最終確認し、公開サイト上の実操作とは区別する。

原稿authoring/quests.txt・structures-5.mjsのQ(83)、初版2場面・現行6場面を精読。暦職人ツキは記録動作のあるentryだけ、保守員は原因を認めるscaffoldだけへ呼称表示する。二役は各現場に固定し、全5旅程の同行者は空のまま。結末のツキの言及から暦窓口への先回り表示を補わず、専用画は追加しない。

物語改訂1→2では旧定義で保存全体を検証後、calendarMakerAt=entry・maintainerAt=scaffoldだけを補う。既存registry・10行動・4結末・報酬・旧受注は保持する。足場撤去はscaffold_datesまたはscaffold_onlyの操作時、回転停止はstopped_finishで確定する。訂正窓口への到着だけでは注記を完了扱いにせず、撤去のみのrepairedとinformedを分離する。stopped・corrected・shadeの本文3箇所だけを操作前へ明確化し、旧保存の表示途中の本文・選択肢は保持する。

専用12試験・出演監査7試験・観測所既存68試験、計87試験成功。現行・旧保存・旧受注の各5経路を全列挙と照合し、全6場面・5旅程・10行動の保存再開、全旅程の途中帰還・敗北救助、人物の固定所在、撤去と暦訂正の分離、回転停止の確定点、報酬一回性、不正保存の原子的拒否を確認した。初回ローカル試験1件は完了後も未完了と期待して失敗し、完了前だけを検査する条件に修正して全87件を再実行した。失敗試行は成功件数に含めない。

標準Lv9・現場開始・seed1907・3編成で全5経路を通常攻略し、4結末を確認した。合計8戦8勝、敗北・逃走・救助0。撤去と暦訂正は22歩・2戦、撤去のみは14歩・1戦、足場確認後の薄明運用は22歩・2戦、回転停止は14歩・1戦、直接の薄明運用は22歩・2戦。能力補正・乱数上書き・強制回復なし。有限5条件であり全編成・全seedを保証するものではない。詳細はQ083_PLAYTEST_RESULTS.json、再現はnode tools/measure-underground-eclipse.mjs。

20保存点×Scene/Classic×1440/390px＝80画面条件を専用Chromium検査へ追加した。二役の限定出演、原因確認前後、撤去済みで訂正前、回転停止前、薄明運用の直接経路と原因確認後の経路、救助後、新旧保存と旧受注を分ける。高レベル・遭遇抑制の表示fixtureは通常攻略と別の検査で、実画面と全体CIの最終結果をPRへ記録する。未完了を成功扱いにしない。

出演監査93件・699場面、未監査7件・54場面。q171の妻は別途候補1役のまま保持する。次はq084「帰還信号」。

`;
for(const p of ['doc/HANDOFF.md','doc/CURRENT_STATUS.md','doc/development/PROGRESS.md','doc/development/REMAINING_WORK.md','doc/development/TEST_OVERVIEW.md']){
 const s=fs.readFileSync(p,'utf8');assert.ok(!s.includes('## q083 地底の日食 — 2026-11-16'),p);
 const at=s.indexOf('\n')+1;fs.writeFileSync(p,s.slice(0,at)+'\n'+section+s.slice(at).replace(/^\n+/,''));
}
