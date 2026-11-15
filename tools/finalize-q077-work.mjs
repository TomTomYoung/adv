import fs from 'node:fs';
import assert from 'node:assert/strict';
const rows=JSON.parse(fs.readFileSync('doc/development/Q077_PLAYTEST_RESULTS.json','utf8'));
assert.equal(rows.length,4);assert.ok(rows.every(r=>r.status==='cleared'&&r.rescues===0&&r.records.losses===0&&r.records.escapes===0));
const results=rows.map(r=>`${r.config.party} ${r.route.join('→')}：${r.steps}歩・${r.records.battles}戦${r.records.wins}勝・${r.gold.start}→${r.gold.end}G`).join('。');
const section=`## q077 聖痕の配線 — 2026-11-16

PR #256は先端8fb071a3f14b462c6c99c02ff0d92086a8bfd07aの適用対象15系統成功を確認し、master 75470a74d924fdc50da17ef1f4eb3e7db4710a8dへ統合した。統合後検査・公開処理はPRで結果を確認し、公開サイト上の実操作とは区別する。

整備側原稿authoring/quests.txt・structures-4.mjsのQ(77)、初版2場面・現行5場面を精読した。壁に触れた巡礼者をentry、仮灯を用意する保守員をoutageだけへ呼称表示し、二人を壁前entryの固定所在とする。診療室と迂回路への同行、依頼人イオとの同一性、人物画・容貌は追加していない。物語改訂1→2は旧定義で保存全体を検証してから二役の固定所在だけを追加し、既存registry・全4旅程・8行動・3結末・報酬を保持する。

停電は壁前でのcutpower、仮灯は出発時携行と診療室への実到着時受領、修理と復電はrepairedのfinishで確定する。迂回路は出発時に柵と通電状態を確定し、detouredのfinishで帰路確認を終える。repaired・detouredの2本文だけを処理の確定時点へ合わせた。旧保存の待機本文・選択肢を保持し、焦げ跡を削る非戦闘経路に架空の戦闘を加えない。

専用12試験・出演監査7試験・機関廟既存50試験、計69試験が成功。現行・旧保存・旧受注の全4経路を非循環グラフの全列挙と照合した。全5場面・4旅程・8行動の保存再開、全旅程の途中帰還・敗北救助、仮灯の保持者、停電と復電、二役の固定所在と限定出演、不正保存の原子的拒否、報酬一回性を検証した。初回のローカル生成では編集前に読み込まれたモジュールを参照して監査根拠が不一致になったため、適用後に生成器を読み込む方式へ直し、再生成・再検証した。失敗試行は成功件数に含めない。

標準Lv8・現場開始・seed1907・3編成で全4経路を通常攻略。${results}。敗北・逃走・救助0。能力補正・乱数上書き・強制回復なし。有限4条件の観測で全編成・全seedの保証ではない。詳細はQ077_PLAYTEST_RESULTS.json、再現はnode tools/measure-stigmata-wiring.mjs。

16保存点×Scene/Classic×1440/390px＝64画面条件を専用Chromium検査へ追加した。二役の出演場面、直接迂回と停電後の復電迂回、仮灯納入後・修理前、敗北救助後、旧保存と旧受注を分ける。高レベル・遭遇抑制の表示fixtureは通常攻略と別の検査。実画面と全体CIの結果はPRへ記録し、未完了を成功扱いしない。

出演監査87件・663場面、未監査13件・90場面。q171の妻は別途候補1役として保持する。次はq078「部品の記憶」。

`;
for(const file of ['doc/HANDOFF.md','doc/CURRENT_STATUS.md','doc/development/PROGRESS.md','doc/development/REMAINING_WORK.md','doc/development/TEST_OVERVIEW.md']){
 const s=fs.readFileSync(file,'utf8');assert.ok(!s.includes('## q077 聖痕の配線 — 2026-11-16'));const at=s.indexOf('\n')+1;fs.writeFileSync(file,s.slice(0,at)+'\n'+section+s.slice(at).replace(/^\n/,''));
}
console.log('Updated q077 handoff, progress and verified trial record.');
