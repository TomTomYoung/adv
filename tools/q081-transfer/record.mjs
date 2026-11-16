import fs from 'node:fs';
import assert from 'node:assert/strict';
const rows=JSON.parse(fs.readFileSync('doc/development/Q081_PLAYTEST_RESULTS.json','utf8'));
assert.equal(rows.length,4);for(const r of rows)assert.equal(r.status,'cleared');
const trial=rows.map(r=>`${r.config.party} ${r.route.join('→')}：${r.steps}歩・${r.records.battles}戦${r.records.wins}勝・${r.gold.start}→${r.gold.end}G`).join('。');
const note=`## q081 落ちてこない星 — 2026-11-16

前工程はPR #260（q080、先端b66fa9184fb0314749a7d10d516144a8d16c2e72）。統合・公開の確認結果はPRに記録し、未完了を成功扱いしない。公開処理成功と公開サイト上の実操作確認は区別する。

原稿authoring/quests.txt・structures-5.mjsのQ(81)、初版2場面・現行5場面を精読した。避難先で訂正を聞く集団をcorrectionだけに呼称表示し、高台refugeへ固定する。依頼人シオ、上映を見る子供、告知担当者を追加せず、全4旅程の同行者は空のまま。物語改訂1→2は旧定義で保存全体を検証してから固定所在evacuatedGroupAt=refugeだけを追加し、既存registry・8行動・3結末・報酬・旧受注を維持する。

天井の試写と実際の天気、避難先への説明と告知の掲示完了、延期と再観測を別々に扱う。correctedはpostedのfinish、delayedは観測台へ向かう出発時、observedはobservedのfinishで確定する。posted・observedの2本文だけを完了操作前の状況に明確化し、旧保存の表示途中の本文・選択肢を保持する。予報盤の破壊は現行・旧受注とも既存の非戦闘で、原稿の番獣という表現から新戦闘を加えない。

専用12試験・出演監査7試験・観測所既存68試験、計87試験が成功。現行・旧保存・旧受注の各4経路を非循環グラフの全経路列挙と照合した。全5場面・4旅程・8行動の保存再開、全旅程の途中帰還・敗北救助、高台の集団の固定所在、途中で未完了の告知と再観測、報酬一回性、不正保存の原子的拒否を確認した。

標準Lv9・現場開始・seed1907・3編成で全4経路を通常攻略。${trial}。全条件で敗北・逃走・救助0。能力補正・乱数上書き・強制回復なし。有限4条件の観測であり全編成・全seedの保証ではない。詳細はQ081_PLAYTEST_RESULTS.json、再現はnode tools/measure-falling-star.mjs。

16保存点×Scene/Classic×1440/390px＝64画面条件を専用Chromium検査へ追加した。高台での限定出演、試写前後、二通りの延期、告知掲示前・再観測完了前、救助後、新旧保存・旧受注を分ける。高レベル・遭遇抑制の表示fixtureは通常攻略とは別の検査。画面と全体CIの結果はPRへ記録し、未確認を成功扱いしない。

出演監査91件・685場面、未監査9件・68場面。q171の妻は別途候補1役のまま。次はq082「星売りの空瓶」。

`;
for(const p of ['doc/HANDOFF.md','doc/CURRENT_STATUS.md','doc/development/PROGRESS.md','doc/development/REMAINING_WORK.md','doc/development/TEST_OVERVIEW.md']){
 const text=fs.readFileSync(p,'utf8');assert.ok(!text.includes('## q081 落ちてこない星 — 2026-11-16'),p+' already updated');const n=text.indexOf('\n');assert.ok(n>=0);fs.writeFileSync(p,text.slice(0,n+1)+'\n'+note+text.slice(n+1).replace(/^\n/,''));
}
