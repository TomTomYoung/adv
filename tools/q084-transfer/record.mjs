import fs from 'node:fs';
import assert from 'node:assert/strict';
const rows=JSON.parse(fs.readFileSync('doc/development/Q084_PLAYTEST_RESULTS.json','utf8'));
assert.equal(rows.length,4);assert.ok(rows.every(r=>r.status==='cleared'&&r.rescues===0&&r.records.losses===0&&r.records.escapes===0));
const text=`## q084 帰還信号 — 2026-11-16

PR #263は先端b77bd88fa28adecfe7d2c7f2781d306553c031b4の全23系統成功後、master 801009ea62c8402e9a4e3594fbbcd1ae840a09c3へ統合した。統合後検査・公開処理の最終結果はPRで確認し、公開サイト上の実操作とは区別する。

原稿authoring/quests.txt・structures-5.mjsのQ(84)、初版3場面・現行10場面を精読した。家族はrecovered、担架の一行はreached、専門隊はroute_check・handoff・call_report・expert_arrivedだけへ集団呼称を表示する。遠くの返事を聞くcrossingには遭難者を表示せず、発信地点に家族を置かない。専門隊は既存のescortでだけ実同行する。人数・個人名・容貌・専用画は追加しない。

物語改訂1→2では旧定義で保存全体を検証後、familyGroupAt=familyだけを補う。既存registry・全13行動・9旅程・3結末・報酬・旧受注を保持する。発信機はcarry出発時に携行し、recoveredのfinishで場所familyへ引き渡す。本人への合流はreachedのfinish、専門隊への引継ぎは各finishで確定する。操作前を明確にする4本文以外は維持し、旧保存の表示途中の本文・選択肢も保持する。

専用13試験・出演監査7試験・観測所既存68試験、計88試験が成功した。新旧保存と旧受注の各4経路をq061引渡し有無で分けて各8条件とし、全10場面・9旅程・13行動の保存再開、全旅程での帰還印・敗北救助、物品保持者・実同行・報酬一回性・不正保存の原子的拒否を確認した。q061の未受注・受注のみ・別2結末・救難隊への実引渡しを比較し、写しの借受と条件本文を確認した。初回テストはq061の保持先を人物rescuersと誤認し、次の試行は最後の段落だけを参照して条件文を見落とした。原本で保持先が場所rescueであることとログの連続2段落を確認して期待値を修正し、全88試験を再実行した。ゲーム側の地図条件は変更していない。

標準Lv9・現場開始・seed1907・3編成で全4選択経路を通常攻略し、3結末を確認した。q061の救難図を借りていない条件で、本人合流53歩、専門隊同行60歩、直接引継ぎ34歩、機械回収34歩。各2戦2勝、合計8戦8勝、敗北・逃走・救助0。能力補正・乱数上書き・強制回復なし。q061連動有りは上記保存試験で別に確認し、通常攻略したという意味ではない。有限4条件で全編成・全seedを保証しない。詳細はQ084_PLAYTEST_RESULTS.json、再現はnode tools/measure-return-signal.mjs。

62保存点×Scene/Classic×1440/390px＝248画面条件を専用Chromium検査へ追加した。新旧保存の地図有無、家族・遭難者・専門隊の限定出演、発信機の引渡し前、救助後、旧受注を区別する。条件本文の最初の段落も実際の進行途中から保存して検査する。高レベル・遭遇抑制の表示fixtureは通常攻略と別の検査で、実画面・全体CIの最終結果はPRへ記録する。未完了を成功扱いにしない。

出演監査94件・709場面、未監査6件・44場面。q171の妻は別途候補1役のまま保持する。次はq085の既存原稿・反復経路の精読と出演監査。

`;
for(const p of ['doc/HANDOFF.md','doc/CURRENT_STATUS.md','doc/development/PROGRESS.md','doc/development/REMAINING_WORK.md','doc/development/TEST_OVERVIEW.md']){
 const s=fs.readFileSync(p,'utf8');assert.ok(!s.includes('## q084 帰還信号 — 2026-11-16'));const i=s.indexOf('\n');assert.ok(i>=0);fs.writeFileSync(p,s.slice(0,i+1)+'\n'+text+s.slice(i+1).replace(/^\n+/,''));
}
console.log('q084 verified behavior, limitations and handoff recorded.');
