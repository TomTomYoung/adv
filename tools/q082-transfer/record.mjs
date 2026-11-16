import fs from 'node:fs';
import assert from 'node:assert/strict';
import {q082Routes,starBottleArtFixtures} from '../star-bottle-art-fixtures.mjs';
const rows=JSON.parse(fs.readFileSync('doc/development/Q082_PLAYTEST_RESULTS.json','utf8'));
assert.equal(rows.length,7);assert.deepEqual(rows.map(r=>r.route),q082Routes.map(r=>r.path));
for(const r of rows){assert.equal(r.status,'cleared');assert.equal(r.config.level,9);assert.equal(r.config.seed,1907);assert.equal(r.records.losses,0);assert.equal(r.records.escapes,0);assert.equal(r.rescues,0);}
const {fixtures}=await starBottleArtFixtures();assert.equal(fixtures.length,26);
const text=`## q082 星売りの空瓶 — 2026-11-16

PR #261は先端45974952c661ff7552fe282b35d324d328238bdeの全21系統成功後、master edbccb942f44a4a7af3b585d0f67f758e11230eeへ統合した。統合後検査・公開処理はPRで最終結果を確認し、公開サイト上の実操作とは区別する。

原稿authoring/quests.txt・structures-5.mjsのQ(82)、初版4場面・現行8場面を精読。エルは売り札を外すlabelだけ、既存customerはsold・sold_spentだけに呼称表示する。エルはentry、客はvendorに留まり、全7旅程の同行者を空のまま保つ。返品の結末に現れる複数の客を現在の受取人と同定しない。物語改訂1→2は旧定義で保存全体を検証後、elPersonAt=entryだけを追加する。既存registry・14行動・3結末・報酬・旧受注は保持する。

瓶は出発時に隊が携行し、到着だけでは引き渡さない。販売finishでcustomer、返品finishでvendorへ渡す。spentとnormalは独立して保持し、返品・移動で使い切った光を復活させない。販売2場面・返品1場面の本文だけを完了操作前へ明確化し、旧保存の表示途中の文章・選択肢を保持する。原稿の旧表現から架空の光喰い戦を加えない。

専用12試験・出演監査7試験・観測所既存68試験の計87試験が成功。現行・旧保存・旧受注の各7経路を全列挙と照合した。全8場面・7旅程・14行動の保存再開、全旅程の帰還印・敗北救助、瓶と二役の所在、強い加熱と適温の区別、全返品経路、不正保存の原子的拒否、報酬一回性を確認した。

標準Lv9・現場開始・seed1907・3編成で全7経路を通常攻略した。各18歩・2戦2勝、合計14戦14勝、敗北・逃走・救助0。通常販売240→439G、光を使い切った販売240→459G、返品240→385G。能力補正・乱数上書き・強制回復なし。有限7条件で全編成・全seedの保証ではない。詳細はQ082_PLAYTEST_RESULTS.json、再現はnode tools/measure-star-bottle.mjs。

26保存点×Scene/Classic×1440/390px＝104画面条件を専用Chromium検査へ追加。試験前・適温・光の消費後、販売・返品の確定前、救助後、新旧保存と旧受注を分ける。高レベル・遭遇抑制の表示fixtureは通常攻略とは別の検査。実画面・全体CIはPRへ結果を記録し、未完了を成功扱いしない。

出演監査92件・693場面、未監査8件・60場面。q171の妻は別途候補1役として保持する。次はq083「地底の日食」。
`;
for(const p of ['doc/HANDOFF.md','doc/CURRENT_STATUS.md','doc/development/PROGRESS.md','doc/development/REMAINING_WORK.md','doc/development/TEST_OVERVIEW.md']){
 const s=fs.readFileSync(p,'utf8');assert.ok(!s.includes('## q082 星売りの空瓶 — 2026-11-16'),p);const at=s.indexOf('\n');fs.writeFileSync(p,s.slice(0,at+1)+'\n'+text+'\n'+s.slice(at+1).replace(/^\n+/,''));
}
console.log('q082 records added without removing prior history');
