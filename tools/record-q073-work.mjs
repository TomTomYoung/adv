import fs from 'node:fs';
import assert from 'node:assert/strict';
const rows=JSON.parse(fs.readFileSync('doc/development/Q073_PLAYTEST_RESULTS.json','utf8'));
assert.equal(rows.length,5);for(const r of rows){assert.equal(r.status,'cleared');assert.equal(r.config.level,8);assert.equal(r.rescues,0);assert.equal(r.records.losses,0);assert.equal(r.records.escapes,0);}
const summary=`## q073 天使の予備腕 — 2026-11-15

PR #252は先端4c038eb52010da5e17665d5d3cf94caf139f0df8の全12系統成功を確認し、master 1a29972f1baa9e4ec919aa35245a6c8a356e7dc2へ統合した。

整備側原稿・初版3場面・現行8場面を精読し、職人を工房のcopy・brace・recovered・takenの4場面だけに表示した。リンとの同一性、外見、専用画や同行者は追加していない。物語改訂1→2では旧定義で保存全体を検証した後、artisanPersonAt=smithだけを補う。既存の保持者定義域・9旅程・12行動・3結末と報酬を保持した。

原品の返却と工房への引渡しはfinish、支えの設置は扉への実到着、荷重試験の確認はtestedからの出発で確定する。returned・tested・recovered・takenの4本文だけを既存処理の時点に合わせた。旧保存に残る表示途中の文章と選択肢は保持し、借りた原品・残る二本・複製の保持者を混同しない。

専用12試験＋出演監査7試験の19件と既存q073回帰3件が成功。現行・変更前の各14経路（再相談0〜2往復）、全8場面・9旅程・12行動の保存再開、全旅程の帰還印・敗北救助、旧受注3場面・14経路、不正保存の原子的拒否、報酬の一回性を検証した。

標準Lv8・現場開始・seed1907・3編成で5経路を通常攻略した。支えを設置して回収67歩・1戦1勝・240→402G、直接借用して返却37歩・1戦1勝・240→352G、借用後に支えを設置して回収67歩・1戦1勝・240→402G、三本回収18歩・1戦1勝・240→422G、再相談2往復後の返却148歩・4戦4勝・240→415G。全条件で敗北・逃走・救助0。能力補正・乱数上書き・強制回復は使用しない。有限5条件の観測であり全編成・全seedの保証ではない。詳細はQ073_PLAYTEST_RESULTS.json、再現はnode tools/measure-spare-arm.mjs。

25保存点×Scene/Classic×1440/390px＝100画面条件を専用Chromium検査へ追加した。支え有無、原品の保持者、原品返却前・工房引渡し前、旧保存と旧受注を区別する。高レベル・遭遇抑制の表示fixtureは通常攻略と別の検査。全体CI・実画面・統合・公開の確認結果はPRに記録し、未確認を成功と扱わない。

出演監査83件・638場面、未監査17件・115場面。q171の妻は別途候補1役のまま。次はq074「祈祷書の誤植」。

`;
for(const p of ['doc/HANDOFF.md','doc/CURRENT_STATUS.md','doc/development/PROGRESS.md','doc/development/REMAINING_WORK.md','doc/development/TEST_OVERVIEW.md']){
 const source=fs.readFileSync(p,'utf8'),at=source.indexOf('\n')+1;assert.ok(at>0);assert.ok(!source.includes('## q073 天使の予備腕 — 2026-11-15'));fs.writeFileSync(p,source.slice(0,at)+'\n'+summary+source.slice(at).replace(/^\n+/,''));
}
console.log('Recorded verified q073 trials and pending browser/CI scope.');
