import fs from 'node:fs';
const rows=JSON.parse(fs.readFileSync('doc/development/Q075_PLAYTEST_RESULTS.json','utf8'));
if(rows.length!==5||rows.some(r=>r.status!=='cleared'||r.rescues||r.records.losses||r.records.escapes))throw Error('Normal trials incomplete');
const block=`## q075 無給の聖者 — 2026-11-16

PR #254は先端2e1598ae8448767197f150efe147928b3f63b394の全14系統成功後、master 3fe9420e3e890506bd8d02f37799f4b9e65c5dccへ統合した。統合後検査・公開処理の最終結果はPRに記録し、公開サイトの実操作確認とは区別する。

整備側原稿authoring/quests.txt・structures-4.mjsのQ(75)、初版3場面・現行7場面を精読。既存workersGroupを作業所shareと実同行後のsharedの2場面に呼称表示した。機械聖者の人物画、依頼人セリの同席、窓口担当者・作業者の個人像や人数は追加していない。物語改訂1・registry・7旅程・11行動・4結末・報酬・旧受注を維持する。

歯車は出発時に携行し、現地への実到着で補給する。要求票はentry_gearの出発時に隊が携行、registeredのfinishで部品庫へ渡して登録する。作業分担は作業者の実同行後、sharedのfinishで確定する。shared・registeredの2本文だけを確定時点に合わせ、旧保存の表示途中の文章・選択肢を保持した。作業分担と部品補給、今回のみの修理と要求票登録を混同しない。

専用12試験＋出演監査7試験＋機関廟既存50試験、計69試験が成功した。現行・旧保存・旧受注の各5経路を非循環グラフの列挙と照合。全7場面・7旅程・11行動、戦闘中保存、全旅程の途中帰還・敗北救助、命令板書換え戦の逃走拒否・敗北後再戦と作業分担への切替、不正保存の原子的拒否・報酬一回性を検証した。

標準Lv8・現場開始・seed1907・3編成で全5経路を通常攻略。要求票登録は55歩・240→402G、今回のみの修理は37歩・240→402G、直接作業分担と部品庫からの作業分担は各37歩・240→352G、命令板書換えは0歩・240→443G。各1戦1勝で敗北・逃走・救助0。能力補正・乱数上書き・強制回復なし。有限5条件の観測で全編成・全seedの保証ではない。詳細はQ075_PLAYTEST_RESULTS.json、再現はnode tools/measure-unpaid-saint.mjs。

23保存点×Scene/Classic×1440/390px＝92画面条件を専用Chromium検査へ追加した。作業所へ向かう二つの経路と要求票の保持者、引継ぎ前・登録前、新旧保存・旧受注と敗北後再開を分ける。高レベル・遭遇抑制の表示fixtureと通常攻略は別の検査。全体CI・実画面の結果をPRへ記録し、未確認を成功扱いしない。

出演監査85件・652場面、未監査15件・101場面。q171の妻は別途候補1役を保持する。次はq076「鉄の子守歌」。

`;
for(const path of ['doc/HANDOFF.md','doc/CURRENT_STATUS.md','doc/development/PROGRESS.md','doc/development/REMAINING_WORK.md','doc/development/TEST_OVERVIEW.md']){
 const s=fs.readFileSync(path,'utf8');if(s.includes('## q075 無給の聖者 — 2026-11-16'))throw Error('Already recorded '+path);
 const end=s.indexOf('\n');fs.writeFileSync(path,s.slice(0,end+1)+'\n'+block+s.slice(end+1).replace(/^\n/,''));
}
console.log('q075 verified results and next step recorded');
