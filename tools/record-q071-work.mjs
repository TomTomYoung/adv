import fs from 'node:fs';
import assert from 'node:assert/strict';
const rows=JSON.parse(fs.readFileSync('doc/development/Q071_PLAYTEST_RESULTS.json','utf8'));
assert.equal(rows.length,4);for(const r of rows){assert.equal(r.status,'cleared');assert.equal(r.rescues,0);assert.equal(r.records.losses,0);}
const heading='## 2026-11-15 q071「止まれない門番」';
const detail=`q150のPR #250は実装先端338abfa9e92ef57da9c4c40daea9f5abb2ad3ae5の全10ワークフロー成功後、master ca7a9d47ddde20e792e4ca12427a4710b43d8d0aへ統合した。公開サイト上の実操作を確認した意味ではない。

q071の整備側原稿・初版2場面・現行7場面を出演監査へ登録し、既存workerPersonを作業室と門前帰還後の2場面だけへ呼称表示した。依頼人フウとの同一性、機械の人物画、新しい同行者を追加していない。returned・cut・repairedの3本文だけを帰還印・一時停電・補修復帰の既存確定時点へ合わせた。物語改訂1・全状態定義・7旅程・10行動・3結末・報酬・旧受注は保持する。

専用11試験と出演監査7試験の計18件が成功。新旧保存の全場面・全旅程・全行動・戦闘中再開、全7旅程での帰還印と敗北救助による中断、帰還印と返却記録の保持者、電源遮断と復帰、解体戦の逃走不可・敗北後再戦と別経路への切替、旧受注2場面・4経路、不正保存の原子的拒否、報酬一回性を確認した。旧保存の表示途中の本文と選択肢も保持する。

標準Lv8・現場開始・seed1907で3編成4経路を通常攻略した。基本4人の整備人帰還は45歩・1戦1勝・240→402G、守備回復の直接補修は58歩・1戦1勝・240→352G、支援編成の照会後補修は95歩・1戦1勝・240→352G、基本4人の解体は0歩・1戦1勝・240→443G。敗北・逃走・救助0。能力補正・乱数上書き・強制回復なし。有限条件の観測で全編成・全seedの保証ではない。詳細はQ071_PLAYTEST_RESULTS.jsonとtools/measure-gatekeeper.mjs。

22保存点×Scene/Classic×1440/390px＝88画面条件を専用q071 Chromium検査に追加した。比較前後の電源経路、押印前の帰還、敗北再開、新旧保存、旧受注を区別する。高レベル・遭遇抑制の表示fixtureは通常攻略とは別。実画面と全体CIの完了結果はPRで確認し、未確認の検査を成功と扱わない。

出演監査81件・625場面、未監査19件・128場面。q171の妻は別途未接続候補1役のまま。次工程はq072「油の洗礼」の出演監査・実装。`;
function prepend(file,text){const s=fs.readFileSync(file,'utf8');assert.ok(!s.includes(heading),'Already recorded '+file);const i=s.indexOf('\n');fs.writeFileSync(file,s.slice(0,i+1)+'\n'+heading+'\n\n'+text+'\n\n'+s.slice(i+1).trimStart());}
for(const file of ['doc/HANDOFF.md','doc/CURRENT_STATUS.md','doc/development/PROGRESS.md'])prepend(file,detail+(file.endsWith('PROGRESS.md')?'\n\nローカル初回で、未監査の例として固定されていたq071を監査済みにしたため監査試験2件が失敗した。未監査人物を動的抽出する例へ変更して再検証した。解体戦の逃走fixtureも既存の逃走不可設定に合わせ、逃走操作の拒否を専用試験で検証した。失敗試行は成功へ算入していない。':''));
prepend('doc/development/REMAINING_WORK.md','q071を実装し出演監査81件・625場面、残り19件・128場面。次はq072「油の洗礼」。実画面88条件と全体CIの完了、統合、公開確認は区別する。');
prepend('doc/development/TEST_OVERVIEW.md','q071はtests/gatekeeper-cast.test.mjsの専用11試験と既存出演監査7試験。tools/gatekeeper-art-fixtures.mjsは22保存点を作り、.github/workflows/q071-cast.ymlでScene/Classic×1440/390pxの88画面を確認する。通常攻略はtools/measure-gatekeeper.mjsとQ071_PLAYTEST_RESULTS.jsonで標準Lv8・3編成4経路を再現する。');
console.log('Recorded q071 implementation and observed normal trials; browser/whole-suite completion remains explicit.');
