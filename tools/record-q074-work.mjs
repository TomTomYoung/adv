import fs from 'node:fs';
import assert from 'node:assert/strict';
const rows=JSON.parse(fs.readFileSync('doc/development/Q074_PLAYTEST_RESULTS.json','utf8'));
assert.equal(rows.length,9);
const expected=[['informed',70,1,402],['informed',74,1,402],['compromise',0,0,331],['compromise',36,1,352],['compromise',48,1,352],['compromise',52,1,352],['compromise',48,1,352],['compromise',52,1,352],['contract',0,1,443]];
for(const [i,r] of rows.entries()){
 assert.equal(r.status,'cleared');assert.deepEqual([r.outcome,r.steps,r.records.wins,r.gold.end],expected[i]);
 assert.equal(r.records.losses,0);assert.equal(r.records.escapes,0);assert.equal(r.rescues,0);
}
const summary=`## q074 祈祷の順番 — 2026-11-16

PR #253は先端799080e5fe698f1e9c22e7543d5a957a15580bd5の全13系統成功後、master 629be8af553485631e867cbada8c59e2c81accc9へ統合した。統合後検査と公開処理の確認結果はPRに記録する。公開サイトでの実操作とは区別する。

整備側原稿authoring/quests.txt・structures-4.mjsのQ(74)、初版4場面・現行7場面を精読した。ユアを訂正窓口correctedの1場面だけへ呼称表示し、全9旅程の同行者は空のまま。外見・専用画を追加しない。物語改訂1→2で旧定義による保存全体の検証後、yuaPersonAt=copyだけを追加する。既存registry・13行動・3結末・報酬・旧受注は保持する。

冷却と炉の起動は各操作盤への実到着で確定する。誤順序では炉が自動停止し、failedTrialは再試験到着時の既存記録を維持する。開扉はopenedからの出発時、写本訂正はcorrectedのfinish時、手動経路の炉停止と開扉はmanualのfinish時。opened・corrected・manualの3本文だけを処理時点に合わせ、旧保存の表示途中の文章・選択肢を保持した。

専用12試験＋出演監査7試験の19件と、機関廟既存50試験の計69件が成功した。現行・旧保存・旧受注の各9経路、全7場面・9旅程・13行動と戦闘中の保存再開、全旅程の帰還印・敗北救助、強行戦の逃走拒否・敗北後再戦と別経路への切替、不正保存の原子的拒否と報酬一回性を確認した。9経路の網羅は現行・旧受注の両グラフから列挙して照合している。

標準Lv8・現場開始・seed1907・3編成で全9選択経路を通常攻略した。正順序の訂正は70歩、誤順序からのやり直しは74歩で、ともに1戦1勝・240→402G。直接手動は0歩・戦闘0・240→331G。他の手動5経路は36〜52歩・各1戦1勝・240→352G。強行は0歩・1戦1勝・240→443G。全条件で敗北・逃走・救助0。能力補正・乱数上書き・強制回復なし。有限9条件の観測であり全編成・全seedの保証ではない。詳細はQ074_PLAYTEST_RESULTS.json、再現はnode tools/measure-prayer-order.mjs。

36保存点×Scene/Classic×1440/390px＝144画面条件を専用Chromium検査へ追加した。正順序・やり直し、手動運用へ切り替える際の炉の稼働有無、訂正前、新旧保存・旧受注と敗北再開を分ける。高レベル・遭遇抑制の表示fixtureは通常攻略と別の検査。全体CI・実画面・統合・公開の確認結果はPRに記録し、未確認を成功と扱わない。

出演監査84件・645場面、未監査16件・108場面。q171の妻は別途候補1役のまま。次はq075「無給の聖者」。

`;
for(const p of ['doc/HANDOFF.md','doc/CURRENT_STATUS.md','doc/development/PROGRESS.md','doc/development/REMAINING_WORK.md','doc/development/TEST_OVERVIEW.md']){
 const s=fs.readFileSync(p,'utf8');assert.ok(!s.includes('## q074 祈祷の順番 — 2026-11-16'),p+' already updated');
 const i=s.indexOf('\n');fs.writeFileSync(p,s.slice(0,i+1)+'\n'+summary+s.slice(i+1).trimStart());
}
console.log('q074 verified trials and handoff recorded.');
