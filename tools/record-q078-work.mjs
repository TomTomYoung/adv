import assert from 'node:assert/strict';
import fs from 'node:fs';
const rows=JSON.parse(fs.readFileSync('doc/development/Q078_PLAYTEST_RESULTS.json','utf8'));
assert.equal(rows.length,9);assert.ok(rows.every(r=>r.status==='cleared'&&r.rescues===0&&r.records.losses===0&&r.records.escapes===0));
const section=`## q078 部品の記憶 — 2026-11-16

PR #257は先端ff724420b2d7df4313fc93c3726c511f8d25df48の全17系統成功後、master 1e25d9eb070d411e7c03d3cb9558d0fc189af91cへ統合した。統合後検査・公開処理はPRで確認し、公開サイト上の実操作と区別する。

原稿authoring/quests.txt・structures-4.mjsのQ(78)、初版2場面・現行5場面を精読した。義肢の利用者本人を既存userPersonと全4旅程の実同行に沿って全5場面へ呼称表示。依頼人リンや前使用者との同一性、氏名・容貌・専用画・保管係の同席は追加しない。腕の作業学習と人格を区別し、物語改訂1・registry・全10行動・3結末・報酬・旧受注を維持した。

槌と針の習熟は独立し、試行へ入っただけでは確定しない。槌はreturn、針は槌作業台への実帰着で確定する。原配置記録は入口からの出発時に隊が携行し、保管室到着だけでは預入・新設定保存を確定しない。savedのfinishで登録する。savedの本文1箇所だけをこの時点へ合わせ、旧保存の表示途中の本文・選択肢を保持した。配布JSON全体の比較でcharacter参照・5場面cast・1本文以外の差がないことを検証した。

専用12試験・出演監査7試験・機関廟既存50試験、計69試験が成功。状態条件を用いた実行エンジンでの列挙と照合し、現行・旧保存・旧受注の全9選択経路を確認した。全5場面・4旅程・10行動の保存再開、全旅程の帰還印・敗北救助、同行中の本人と義肢の保持者、槌／針の習熟と再試行拒否、習熟前の保存拒否、各段階の手動切替、報酬一回性、不正保存の原子的拒否を検証した。原稿の旧表現から架空の戦闘は追加せず、全記録消去が現行・旧受注とも非戦闘であることを確認した。

標準Lv8・現場開始・seed1907・3編成で全9経路を通常攻略した。${rows.map(r=>`${r.config.party} ${r.route.join('→')}：${r.steps}歩・${r.records.battles}戦${r.records.wins}勝・${r.gold.start}→${r.gold.end}G`).join('。')}。全条件で敗北・逃走・救助0。能力補正・乱数上書き・強制回復なし。有限9条件の観測で全編成・全seedの保証ではない。詳細はQ078_PLAYTEST_RESULTS.json、再現はnode tools/measure-parts-memory.mjs。

27保存点×Scene/Classic×1440/390px＝108画面条件を専用Chromium検査へ追加した。未習熟・槌だけ・針だけ・両方習熟、保管前、新旧保存、救助後の本人の同行、旧受注を区別する。未習熟時のsaveと既習作業の再選択が無効であることも検査する。高レベル・遭遇抑制の表示fixtureは通常攻略とは別。実画面と全体CIの結果はPRへ記録し、未完了を成功扱いしない。

出演監査88件・668場面、未監査12件・85場面。q171の妻は別途候補1役のまま。次はq079「百回目の試験」。

`;
for(const p of ['doc/HANDOFF.md','doc/CURRENT_STATUS.md','doc/development/PROGRESS.md','doc/development/REMAINING_WORK.md','doc/development/TEST_OVERVIEW.md']){const s=fs.readFileSync(p,'utf8');assert.ok(!s.includes('## q078 部品の記憶 — 2026-11-16'));const n=s.indexOf('\n');fs.writeFileSync(p,s.slice(0,n+1)+'\n'+section+s.slice(n+1).trimStart());}
