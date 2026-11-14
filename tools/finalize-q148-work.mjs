// Run only after the focused tests and normal party measurements succeed.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const rows=JSON.parse(fs.readFileSync('doc/development/Q148_PLAYTEST_RESULTS.json','utf8'));
assert.equal(rows.length,4);assert.ok(rows.every(r=>r.status==='cleared'&&r.rescues===0&&r.records.losses===0&&r.records.escapes===0));
const totals=JSON.parse(fs.readFileSync('doc/scenarios/RELOCATED_CAST_AUDIT.json','utf8')).summary;
assert.equal(totals.reviewedQuests,78);assert.equal(totals.reviewedScenes,600);
const prepend=(file,section,rename=false)=>{
 let s=fs.readFileSync(file,'utf8');if(s.includes('## q148の実装・検証（2026-11-14）'))throw Error('q148 record already exists: '+file);
 if(rename)s=s.replace('## 2026-11-14の再開点','## 過去の再開点（q147着手時）').replace('## 2026-11-14の更新','## 過去の更新（q147着手時）');
 const cut=s.indexOf('\n\n');assert.ok(cut>=0);fs.writeFileSync(file,s.slice(0,cut+2)+section.trim()+'\n\n'+s.slice(cut+2));
};
const headline='## q148の実装・検証（2026-11-14）';
const implementation='q148「贋金より軽い金」の原稿GQ048・初版3場面・現行8場面を精読した。エギと客を既存同行に沿う5場面へ接続した。告発後の秤回収では二人を審査窓口に残し、回収先・保管窓口には表示しない。本文・8旅程・13行動・3結末・105G/75EXP・物語改訂1・全保存定義を維持し、専用画や新たな登場人物を追加しない。';
const tests='専用12試験と出演監査7試験が成功した（計19成功、失敗0、スキップ0）。新旧の全場面・旅程・行動の保存再開、15経路、告発と再比較の反復、秤と同じ硬貨の保持者、全旅程での帰還印・敗北救助、私的返金と公開手続の区別、旧受注3場面・15経路、報酬の一回性、不正保存の原子的拒否を検証した。';
const counts='出演監査は78件・600場面（出演根拠あり441・同席根拠なし159）、未監査22件・153場面。q171の妻は別途未接続候補1役。次の未着手の監査はq149「売らない剣」。';
const pending='表示検査用の23保存点をScene／Classic×1440／390pxの92画面条件へ接続した。表示用fixtureは高レベル・遭遇抑制であり、通常攻略とは別の検査。全体CI、画面証跡の確認、統合・公開は実際の結果をPRへ記録してから確定する。';
prepend('doc/HANDOFF.md',`${headline}\n\nq147のPR #247は先端3b76e618の全8ワークフロー成功を確認し、master 7e619feb45e0747524c9ec6961412b9e6cb189dfへ統合した。\n\n${implementation}\n\n${tests}\n\n${pending}\n\n${counts}`,true);
prepend('doc/CURRENT_STATUS.md',`${headline}\n\nq147はPR #247でmasterへ統合済み。q148は人物表示と保存再開の検証を実装した段階であり、統合・公開済みとは扱わない。\n\n${counts}\n\n詳細は[引き継ぎ](HANDOFF.md)と[検証結果](development/PROGRESS.md)を参照する。`,true);
const trials=rows.map(r=>`${r.config.party}：${r.route.join(' → ')}、${r.steps}歩、${r.records.battles}戦${r.records.wins}勝、${r.gold.start}→${r.gold.end}G`).join('。');
prepend('doc/development/PROGRESS.md',`${headline}\n\n${implementation}\n\n${tests}\n\n標準Lv5・現場開始・seed1907・3編成4経路の通常攻略：${trials}。全条件で敗北・逃走・救助0。乱数上書き・能力補正・強制回復なし。有限条件の観測であり全編成・全seedの保証ではない。[詳細JSON](Q148_PLAYTEST_RESULTS.json)、再現はnode tools/measure-scale-comparison.mjs。\n\n${pending}\n\n${counts}`,true);
prepend('doc/development/REMAINING_WORK.md',`${headline}\n\nq147はmasterへ統合済み。q148の専用検証と監査登録を実装した。${counts}\n\nq148の全体CI・92画面条件の証跡、統合と公開を確認する。以下の古い件数と未着手表記は各記録時点のものとして保持し、現在の対象は本節を優先する。`,true);
prepend('doc/development/TEST_OVERVIEW.md',`${headline}\n\n専用テストはtests/scale-comparison-cast.test.mjsの12試験。表示追加前の定義はtests/fixtures/e2-q148-before-cast.jsonへそのまま保存した。本文・状態定義・旅程が不変であることも全体比較で検査する。\n\n23保存点と92画面条件はtools/scale-comparison-art-fixtures.mjsとtools/browser-scale-comparison-cast-smoke.mjsで検査する。保管場面で二人が市場に残る経路と審査窓口に残る経路、比較済みと未比較、旧受注を分ける。\n\n通常攻略はtools/measure-scale-comparison.mjsで再現できる。[測定結果](Q148_PLAYTEST_RESULTS.json)は標準Lv5・3編成4経路・seed1907の記録であり、表示fixtureとは別に扱う。`);
console.log('Updated current handoff, progress and remaining work without deleting historical records.');
