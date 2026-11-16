import fs from 'node:fs';
import assert from 'node:assert/strict';
const heading='## q087 願いを消す流星 — 2026-11-16';
const block=`${heading}

PR #266は先端4ceb29ab97831cb78b62a5109ea758b6ba7ee96cの適用対象25系統成功後、master 390b00bdf4b87f11c1d0646663f90627e97ecee8へ統合した。統合後検査と公開処理の最終結果はPRへ記録し、公開サイト上の実操作とは区別する。

原稿authoring/quests.txt・structures-5.mjsのQ(87)、初版3場面・現行5場面を精読した。既存hakuを全5場面へ呼称表示し、上映席と家への4旅程の既存同行を維持する。筒の番人・観客・家族・容貌・専用画像を追加しない。

受付札の発行ticketIssued、文言の訂正wordingFixed、手帳への記入written、本人の実行firstStepを別に保持する。上映席への3経路では出発時に記入し、手帳は隊の保持のまま、机の物はdeskに残る。家へ到着しただけでは片付け済みにせず、desk_finishで最初の一つをshelfへ移す。家の1本文だけを操作前へ明確化した。物語改訂1・全registry・全9行動・3結末・報酬・旧受注を維持し、移行処理は追加しない。character参照・cast・1本文以外の配布JSON全体が旧版と一致し、旧保存の待機本文と選択肢を含む保存全体が再読込で一致する。

専用12試験・出演監査7試験・観測所の既存68試験、計87試験が成功した。現行・旧保存・旧受注の各5経路を非循環グラフの全列挙と照合し、12状態・3結末を確認した。全5場面・4旅程・9行動の保存再開、全旅程の帰還印・敗北救助、ハクと机の物と手帳の所在、受付・記録・実行の区別、報酬一回性、不正保存の原子的拒否を検証した。筒破壊へ架空の番人戦を追加しない。

標準Lv9・現場開始・seed1907・3編成で全5選択経路を通常攻略した。札の訂正後に本人と片付ける経路は53歩・2戦2勝・240→439G。手帳へ残す3経路は各14歩・戦闘なし・240→339G。筒の破壊は0歩・戦闘なし・240→413G。合計2戦2勝、敗北・逃走・救助0。能力補正・乱数上書き・強制回復なし。有限5条件であり全編成・全seedを保証しない。詳細はdoc/development/Q087_PLAYTEST_RESULTS.json、再現はnode tools/measure-wish-ticket.mjs。

21保存点×Scene/Classic×1440/390px＝84画面条件を専用Chromium検査へ追加した。全場面のハク表示、3通りの記録履歴、片付け前、救助後、新旧保存・旧受注を区別する。高レベル・遭遇抑制の表示fixtureは通常攻略と別の検査。実画面と全体CIの最終結果をPRへ記録し、未確認の検査を成功扱いにしない。

出演監査97件・728場面、未監査3件・25場面。q171の妻は別途候補1役のまま保持する。次工程はq088「観測窓の亀裂」。

`;
for(const p of ['doc/HANDOFF.md','doc/CURRENT_STATUS.md','doc/development/PROGRESS.md','doc/development/REMAINING_WORK.md','doc/development/TEST_OVERVIEW.md']){
 const text=fs.readFileSync(p,'utf8');assert.ok(!text.includes(heading),p+' already recorded');const index=text.indexOf('\n');assert.ok(index>=0);fs.writeFileSync(p,text.slice(0,index+1)+'\n'+block+text.slice(index+1).replace(/^\n/,''));
}
