import fs from 'node:fs';
import assert from 'node:assert/strict';
const rows=JSON.parse(fs.readFileSync('doc/development/Q085_PLAYTEST_RESULTS.json'));
assert.equal(rows.length,9);assert.ok(rows.every(r=>r.status==='cleared'&&r.records.losses===0&&r.records.escapes===0&&r.rescues===0));
const note=`## q085 方位のない羅針盤 — 2026-11-16

PR #264は最終先端c61e1cf6474f201c5b08b5eed24df5babe030cbcの全24系統成功後、master 7ad7f6a97e46a2cc84840f5b7ba7ab36924b5135へ統合した。統合後検査と公開処理の最終結果はPRで確認し、公開サイト上の実操作とは区別する。

原稿と初版4場面・現行7場面を精読し、既存の先導役二人を実同行先5場面だけに呼称表示する。冒頭の荷袋の所有者や依頼人ルウと同一視せず、人数・外見・専用画は追加しない。全7旅程の同行は既存の二人を維持する。

帰還標は入口への到着だけでは設置されず、walk出発時に置く。回収地点への到着だけでは拾わず、leader出発時にexit→party→guide、角への実到着時にnextGuideへ渡す。先導者から入口を試す場合は出発時に標を隊へ戻す。固定登録fixedはfinishだけで確定する。2本文を操作前へ明確化し、人物のcharacterとcast・2本文以外の配布JSONは旧版と一致する。物語改訂1・既存registry・全11行動・3結末・報酬・旧受注・旧保存の待機本文と選択肢を保持し、移行処理を追加しない。

専用13試験・出演監査7試験・観測所既存68試験、計88試験が成功した。有限の状態探索31状態・3結末、各場面の再訪を2回までに制限した現行・旧保存・旧受注の各9経路、全7場面・7旅程・11行動の保存再開、全旅程の帰還印と敗北救助、設置・回収・二人の受渡し、6往復の反復、報酬一回性、不正保存の原子的拒否を検証した。反復可能な無限の選択列を全列挙したという意味ではない。

標準Lv9・現場開始・seed1907・3編成で上記の9経路を通常攻略し3結末を確認した。合計16戦16勝、敗北・逃走・救助0。固定と先導交代の経路は18〜78歩、磁化は0歩・戦闘なし。能力補正・乱数上書き・強制回復なし。有限条件の測定であり全編成・全seedを保証しない。再現スクリプトtools/measure-return-compass.mjsとdoc/development/Q085_PLAYTEST_RESULTS.jsonを保存した。

30保存点×Scene/Classic×1440/390px＝120画面条件を専用Chromium検査へ追加した。新旧保存、反復再訪、回収前と受渡し、救助後、旧受注を区別する。表示fixtureは高レベル・遭遇抑制であり、通常攻略とは別の検査。実画面・全体CIの最終結果はPRへ記録し、未確認の検査を成功扱いしない。

出演監査95件・716場面、未監査5件・37場面。q171の妻は別途候補1役のまま。次工程はq086「百年前の観測者」の出演根拠・通知と旧報告の保持者・修理と記録の確定時点の精読から。

`;
for(const path of ['doc/HANDOFF.md','doc/CURRENT_STATUS.md','doc/development/PROGRESS.md','doc/development/REMAINING_WORK.md','doc/development/TEST_OVERVIEW.md']){
 const s=fs.readFileSync(path,'utf8');assert.ok(!s.includes('## q085 方位のない羅針盤 — 2026-11-16'));const at=s.indexOf('\n\n');assert.ok(at>=0);fs.writeFileSync(path,s.slice(0,at+2)+note+s.slice(at+2));
}
