import fs from 'node:fs';
import assert from 'node:assert/strict';
const text=`## q088 観測窓の亀裂 — 2026-11-16

PR #267は先端109083d867fafa445cac871271e5aef0f746cd49の全27系統成功後、master eb3eb42420a4ab56d39871b74adb4c2c88d8c883へ統合した。統合後検査・公開処理の最終結果はPRへ記録し、公開サイト上の実操作とは区別する。

原稿と初版3場面・現行10場面を精読した。既存の専門点検班を工房で依頼する場面と実同行後の窓前だけに呼称表示する。交換材の受取だけで班を同席させず、イチや資料室の係・専用画像を追加しない。同行は既存のexperts_escortだけを維持する。

割れた測定目盛板と無傷の耐圧窓を区別し、交換材は工房から出発するときに隊が携行、install_testで窓へ設置する。観測は資料室への出発時に確定し、旧板の預入はlesson_finishだけで行う。専門班は到着だけでは点検済みにならず、finishで結果を確認する。3本文のみを操作前へ明確化した。物語改訂1・全registry・全14行動・3結末・報酬・旧受注を維持し、移行処理を追加しない。character参照・2場面cast・3本文以外の配布JSON全体と、旧保存の待機本文・選択肢を含む保存全体の一致を検証した。

専用13試験・出演監査7試験・観測所既存68試験、計88試験が成功した。現行・旧保存・旧受注の各5経路を非循環グラフの全列挙と照合し、17状態・3結末を確認した。全10場面・8旅程・14行動の保存再開、全旅程の帰還印・敗北救助、窓・旧板・交換材・専門班の所在、報酬一回性、不正保存の原子的拒否を確認した。初回試験は工房の町状態で帰還印を使おうとして1件失敗したため、町から出る旅程は実際に地下へ進んでから中断する試験に修正し、全88件を再実行した。ゲーム側の移動・帰還条件は変更していない。

標準Lv9・現場開始・seed1907・3編成で全5選択経路を通常攻略した。交換後に観測し旧板を保存する経路は178歩・5戦5勝・240→531G。交換後の観測中止は127歩・3戦3勝・240→431G。旧板を外してからの専門点検と直接の専門点検は各115歩・2戦2勝・240→408G。全面封鎖は0歩・戦闘なし・240→413G。合計12戦12勝、敗北・逃走・救助0。能力補正・乱数上書き・強制回復なし。有限5条件であり全編成・全seedを保証しない。詳細はdoc/development/Q088_PLAYTEST_RESULTS.json、再現はnode tools/measure-observation-window.mjs。

35保存点×Scene/Classic×1440/390px＝140画面条件を専用Chromium検査へ追加した。新旧保存・旧受注、受取前・設置前・保存前、旧板を外す前後の専門依頼、実同行、各種携行中の救助を区別する。高レベル・遭遇抑制の表示fixtureは通常攻略と別の検査であり、実画面と全体CIの最終結果をPRへ記録し、未確認を成功扱いにしない。

出演監査98件・738場面、未監査2件・15場面。q171の妻は別途候補1役のまま保持する。次工程はq089「逆さまの天球儀」。

`;
for(const path of ['doc/HANDOFF.md','doc/CURRENT_STATUS.md','doc/development/PROGRESS.md','doc/development/REMAINING_WORK.md','doc/development/TEST_OVERVIEW.md']){
 const old=fs.readFileSync(path,'utf8');assert.ok(!old.includes('## q088 観測窓の亀裂 — 2026-11-16'),path+' already updated');const i=old.indexOf('\n');assert.ok(i>=0);fs.writeFileSync(path,old.slice(0,i+1)+'\n'+text+old.slice(i+1).replace(/^\n/,''));
}
