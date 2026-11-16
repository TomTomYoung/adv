import fs from 'node:fs';
import assert from 'node:assert/strict';
import {centuryObserverArtFixtures} from '../century-observer-art-fixtures.mjs';
const rows=JSON.parse(fs.readFileSync('doc/development/Q086_PLAYTEST_RESULTS.json'));
assert.equal(rows.length,5);assert.ok(rows.every(r=>r.status==='cleared'&&r.records.losses===0&&r.records.escapes===0&&r.rescues===0));
const {fixtures}=await centuryObserverArtFixtures();
const section=`## q086 百年前の観測者 — 2026-11-16

PR #265は先端055bfbaf6ea7d39932c33e36d3749730a8a989f6の全25系統成功後、master 21626bd41b3158799ae20778ffbd72035d801779へ統合した。統合後検査と公開処理の最終結果はPRで確認し、公開サイト上の実操作とは区別する。

原稿と初版3場面・現行7場面を精読し、全場面を人物不在として監査登録した。観測者は自動観測器であり、通信箱のreceiverもitemである。シオ・通信係・修理人・保存係、人物画像、同行者を推測で追加しない。

通知は通信箱への出発時に隊が携行し、実到着時にreceiverへ投入する。投入だけでは受領歯車を直したことにせず、mail_repairでreceiverFixedを確定する。旧報告は対応表または日別注記の経路で資料室へ出発するときに携行し、finishでarchiveへ渡す。修理を省いた日別注記と修理後の注記を区別する。資料室の2本文だけを預入前へ明確化し、全registry・全11行動・3結末・報酬・物語改訂1を維持する。移行処理は追加せず、旧保存の待機本文・選択肢を含む保存全体が再読込で一致する。

専用12試験・出演監査7試験・観測所既存68試験、計87試験が成功した。現行・旧保存・旧受注の各5経路を非循環グラフからの列挙と照合し、16状態・3結末を確認した。全7場面・5旅程・11行動の保存再開、全旅程の帰還印・敗北救助、通知・報告・通信箱の保持者、3通りの日別注記、報酬一回性、不正保存の原子的拒否を検証した。破棄の結末に原稿の旧表現から護衛戦を追加しない。

標準Lv9・現場開始・seed1907・3編成で全5経路を通常攻略し、3結末を確認した。修理と対応表、修理後の注記、通信修理を延期した注記は各57歩、直接の注記は49歩で、各1戦1勝。破棄は0歩・戦闘なし。合計4戦4勝、敗北・逃走・救助0。対応表240→439G、注記240→385G、破棄240→413G。能力補正・乱数上書き・強制回復なし。有限5条件であり全編成・全seedを保証しない。詳細はdoc/development/Q086_PLAYTEST_RESULTS.json、再現はnode tools/measure-century-observer.mjs。

${fixtures.length}保存点×Scene/Classic×1440/390px＝${fixtures.length*4}画面条件を専用Chromium検査へ追加した。全7場面の人物不在、通知投入と歯車修理、3通りの注記、資料室の預入前、通知・報告の携行中の救助、新旧保存・旧受注を区別する。高レベル・遭遇抑制の表示fixtureと通常編成の攻略は別の検査。実画面と全体CIの最終結果はPRへ記録し、未確認の検査を成功扱いにしない。

出演監査96件・723場面、未監査4件・30場面。q171の妻は別途候補1役のまま。次はq087「願いを消す流星」の本人の実行・受付札・手帳と出演の監査。

`;
for(const p of ['doc/HANDOFF.md','doc/CURRENT_STATUS.md','doc/development/PROGRESS.md','doc/development/REMAINING_WORK.md','doc/development/TEST_OVERVIEW.md']){const s=fs.readFileSync(p,'utf8');assert.ok(!s.includes('## q086 百年前の観測者 — 2026-11-16'));const i=s.indexOf('\n');fs.writeFileSync(p,s.slice(0,i+1)+'\n'+section+s.slice(i+1).replace(/^\n/,''));}
