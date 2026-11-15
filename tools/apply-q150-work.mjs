import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const sha=x=>createHash('sha256').update(x).digest('hex');
const expected={
 'authoring/editions/e2/salome/library-second.mjs':'2ebbaf03ccf83cb8bb5588a567d3647e659f7912a2b8242240d0d9599b8f6595',
 'authoring/relocated-character-art.mjs':'43ca54fe93243f053589dbf16ec8690c85cb00a600cc4b498a5f42555a0fd351',
 'authoring/relocated-cast-review.mjs':'0fa63480ff6994194e8f46fda474256f057f6853c067c15f916637268250e81e',
 'tests/relocated-cast-audit.test.mjs':'4fcd1a6c863a401fdeb0ba0e85838bb2463ed19c3c58c481d1ce03a0bd451bfd',
 'data/scenario-editions/e2/q150.json':'0d6b8be813fd877bfbda725811e03a2d47ac8e4c000f3a5e34a0becbc7ec53bc'
};
for(const [p,h] of Object.entries(expected))assert.equal(sha(fs.readFileSync(p)),h,'source changed: '+p);
const fixture='tests/fixtures/e2-q150-before-cast.json';assert.ok(!fs.existsSync(fixture),'existing q150 fixture');
fs.writeFileSync(fixture,fs.readFileSync('data/scenario-editions/e2/q150.json'));
const source='authoring/editions/e2/salome/library-second.mjs';let s=fs.readFileSync(source,'utf8');
assert.ok(!s.includes('q.number===150&&cast'));const anchor=' return finish();';assert.equal(s.split(anchor).length,2);
const block=` if(q.number===150&&cast){
  const crew=['ritz','porterPerson','thiefPerson','singerPerson'];
  const visible=()=>crew.map((entity,i)=>({entity,display:{x:[17,39,61,83][i]}}));
  for(const id of crew)x.entities[id].character='q150_'+id;
  for(const n of x.nodes)n.cast=visible();
  choice('company','agree').readyCast=visible();
  node('settled').text='窓口へ三人と来た。ここで出演料を精算する。公演の中止や弟子不採用を、手伝った仕事の無価値さへ読み替えない。';
  node('tools').text='合意した交代制を道具の注文へ添え、支払済みの共有道具を工房で確認した。ここで受け取り、道具と三人を会場へ戻す。';
  node('formed').text='三人が会場へ戻った。共有道具は隊が運んでいる。ここで渡し、固定の裏方を押しつけず、合意した役割で一座を始める。';
 }
`;
fs.writeFileSync(source,s.replace(anchor,block+anchor));
const roles=[
 ['ritz','リッツ','曲芸師','弟子選びを依頼した曲芸師。候補者の違う強みと本人の同意を確かめる。'],
 ['porterPerson','荷役','弟子候補の荷役','客席と舞台の支えの修理を担当する。働きと弟子入りの同意は別に扱う。'],
 ['thiefPerson','スリ','弟子候補のスリ','細かな留め具の修理と、落ちた財布を持主へ返す芸を行える。修理だけで財布を返した扱いにしない。'],
 ['singerPerson','歌手','弟子候補の歌手','歌で待つ客を支え、次の演目につなぐ。出演と弟子入りの意志は別に確かめる。']
];
const art='authoring/relocated-character-art.mjs';let chars=fs.readFileSync(art,'utf8');assert.ok(!chars.includes('q150_'));chars+='\n';
for(const [id,name,role,detail] of roles)chars+='relocatedCharacters.q150_'+id+'='+JSON.stringify({id:'q150_'+id,name,role,detail,provenance:'2026-11-15。GQ050と現行場面の発言・所在・実同行による呼称表示。専用画や未知の氏名・年齢・容貌は追加しない。'})+';\n';
fs.writeFileSync(art,chars);
execFileSync('node',['tools/build-scenario-editions.mjs'],{stdio:'inherit'});
const quest=JSON.parse(fs.readFileSync('data/scenario-editions/e2/q150.json','utf8'));
const review={sourceSha256:sha(JSON.stringify(quest)),identityNotes:[
 '原稿volume-05のGQ050・初版6場面・現行11場面・10旅程・23行動・5結末を精読した。仕込まれた試験ではなく本当の舞台故障であり、練習したかどうかで事故場面の条件本文が分かれる。',
 'リッツと荷役・スリ・歌手の既存personを全11場面へ接続する。全10旅程に既にある四人の同行を保持し、支払後の自動生成準備場面にはreadyCastを用いる。人物の氏名・年齢・容貌・専用画を補わない。',
 '働きを見たこと、個別の弟子入り同意、出演料精算、一座の合意と共有道具の引渡しを別々に扱う。40Gはcompany_agreeで一回支払う。共有道具は工房出発時に隊が受け取り、formed_finishで会場へ渡す。精算・道具に関する3本文だけを既存の確定時点に合わせる。',
 '財布は最初は会場に落ちており、audience_thiefの出発時だけwalletOwnerへ返る。留め具修理でthiefが真になってもwalletReturnedを真にしない。持主は会場に固定し、選択肢での言及だけを根拠に全場面のcastへ追加しない。',
 '四人は既存entityなので状態追加・保存移行は不要。物語改訂1・既存の保持者定義域・全行動・5結末と報酬・旧受注を保持する。旧保存内の表示途中の本文・選択肢も保持する。'
],relatedClients:{},people:{},scenes:{},next:'全11場面・10旅程・23行動の新旧保存、練習有無・役割別資格・個別同意と出演料、一座の40G不足と支払済み再開、財布返却・道具の保持者、途中帰還・敗北、旧受注と実画面を検証する。書庫20件の監査後はq071「止まれない門番」の精読・実装へ進む。'};
for(const [entity,name,role] of roles)review.people['q150_'+entity]={label:role+' '+name,status:'connected',entity,need:'既存の初期所在と四人の実同行に従い、支払後準備を含む全11場面へ呼称表示する。'};
for(const [id,evidence,reason,visual] of [
 ['entry','荷役、スリ、歌手の三人が来た。','リッツと候補者三人が揃い、既存の初期所在も全員entry。','特技をまだ見ていない段階。誰かを既に採用したように表示しない。'],
 ['practice','荷役の組立、スリの細かな手仕事、歌手の歌','四人が稽古場へ実同行する。','見せてもらった仕事と弟子入りへの同意を区別する。'],
 ['accident','候補者はそれぞれ、自分ならできる仕事を申し出る。','練習の有無で本文が変わるが、四人はいずれの入口からも会場へ実同行している。','preparedに従って既知の得意分野と、その場での申し出を分ける。'],
 ['repair','荷役は支えを、スリは小さな留め具の修理を申し出た。','歌手が客を支え、残る候補者が作業を提案する。リッツも会場に残る。','歌だけでは修理を済ませたことにしない。'],
 ['audience','候補者は自分の仕事として出演したいという。','修理の担当者だけでなく四人が引き続き舞台にいる。','財布の返却を選ぶ前はwalletがstageにあり、返却済み表示を先取りしない。'],
 ['contracts','手伝った事実と弟子になる意思を別に聞いてほしい','四人が会場から窓口へ同行し、候補者の同意を確かめる。','個別採用は働きを見た候補者だけ。財布の持主を同行させない。'],
 ['company','三人は芸と裏方を固定せず交代できる条件で同意した。','四人は同じ窓口で交代制と道具費を相談する。','40G支払前。作業への同意と一座成立の最終確定は別。'],
 ['settled','窓口へ三人と来た。ここで出演料を精算する。','中止・不採用・一座辞退のいずれでも四人が窓口にいる。','feesSettledはfinishで確定。弟子を採らないことを無報酬にしない。'],
 ['tools','支払済みの共有道具を工房で確認した。','四人が窓口から実同行する。支払済みでも道具は工房にある。','carry出発時に初めてsharedToolsAtがpartyになる。'],
 ['formed','三人が会場へ戻った。共有道具は隊が運んでいる。','四人が共有道具を運んで会場へ戻る。','道具の受渡し・companyAgreed・feesSettledはfinishで確定。'],
 ['company_agree_ready','ここから目的地まで運ぶ。','40G支払後も四人は窓口にいる。自動生成準備場面にreadyCastを接続する。','支払だけで道具の所持者を変えず、一座成立の報酬も与えない。']
])review.scenes[id]={decision:'person-evidence',people:Object.keys(review.people),evidence,reason,visual};
const audit='authoring/relocated-cast-review.mjs';s=fs.readFileSync(audit,'utf8');assert.ok(!s.includes('  q150:'));
s=s.replace(/reviewedAt:'[^']+'/,"reviewedAt:'2026-11-15'").replace(' quests:{',' quests:{\n  q150:'+JSON.stringify(review,null,2)+',');fs.writeFileSync(audit,s);
const tests='tests/relocated-cast-audit.test.mjs';s=fs.readFileSync(tests,'utf8');
const before={quests:100,scenes:753,emptyCastScenes:308,personEntities:145,characterLinkedEntities:131,reviewedQuests:79,reviewedScenes:607,noPersonEvidenceScenes:161,personEvidenceScenes:446,candidateRoles:1,connectedRoles:178,unreviewedScenes:146};
const after={...before,emptyCastScenes:297,characterLinkedEntities:135,reviewedQuests:80,reviewedScenes:618,personEvidenceScenes:457,connectedRoles:182,unreviewedScenes:135};
assert.ok(s.includes(JSON.stringify(before)));fs.writeFileSync(tests,s.replace(JSON.stringify(before),JSON.stringify(after)));
execFileSync('node',['tools/audit-relocated-cast.mjs'],{stdio:'inherit'});
const note=`## q150「大道芸人の弟子」の実装・検証（2026-11-15）

q149のPR #249は先端286bf08c231384f1048e6230eb0259c72457d567の全9ワークフロー成功を確認し、master dd6ba56f29efa0d569794961afc21b44a2f7cf41へ統合した。

リッツと候補者三人の既存personを全11場面へ呼称表示した。全10旅程の四人の実同行を維持し、支払後の自動生成準備場面はreadyCastへ接続。財布の持主は会場に残り、窓口や工房へ同行させない。精算・道具の3本文のみを既存の確定時点へ合わせ、物語改訂1・全状態・23行動・5結末・105G/75EXP・40G支払と旧受注を保持した。

専用13試験と監査7試験の計20件を追加・更新した。ローカルの分割実行で成功し、新旧94経路の完走、全11場面・10旅程・23行動の保存再開、役割別の採用条件、弟子入り同意と出演料の区別、財布返却と留め具修理の区別、39G不足と40Gの一回支払、道具の保持者、全旅程の途中帰還・敗北救助、不正保存の原子的拒否、旧受注6場面・94経路を確認した。再開検査の初回は重複判定にjourneyを含めず別旅程を一件落として失敗したため、journeyも判定キーに含めて修正・再検証した。実装の検査を省略して通したものではない。

標準Lv5・現場開始・seed1907・3編成で7経路を完走し、5結末をすべて確認した。各82歩・2戦2勝、一座のみ240→350G、他6条件は240→390G。敗北・逃走・救助0、乱数上書き・能力補正・強制回復なし。有限7条件の観測であり全編成・全seedの保証ではない。再現はnode tools/measure-troupe-apprentice.mjs、詳細はdoc/development/Q150_PLAYTEST_RESULTS.json。

表示専用42保存点×Scene／Classic×1440／390px＝168画面条件を追加する。高レベル・遭遇抑制の表示fixtureと標準Lv5の通常攻略は別の検査。GitHubでの再検証・実画面・全体CI・統合・公開の結果はPRに記録し、未完了を成功扱いしない。

出演監査80件・618場面、未監査20件・135場面。書庫20件は全件監査済み。残る対象は機関廟q071〜q080と地下観測所q081〜q090。q171の妻は別途未接続候補1役のまま。次の未着手はq071「止まれない門番」。

`;
for(const p of ['doc/HANDOFF.md','doc/CURRENT_STATUS.md','doc/development/PROGRESS.md']){
 let text=fs.readFileSync(p,'utf8');const split=text.indexOf('\n\n');assert.ok(split>0);text=text.slice(0,split+2)+note+text.slice(split+2);fs.writeFileSync(p,text);
}
for(const [p,text] of [
 ['doc/development/REMAINING_WORK.md','2026-11-15：q150実装先端で出演監査80件・618場面、未監査20件・135場面。書庫20件の監査を完了し、次はq071「止まれない門番」。q150の実画面168条件と全体CI・統合・公開はPRで結果を確認する。'],
 ['doc/development/TEST_OVERVIEW.md','q150専用13試験と監査7試験。新旧94経路、11場面・10旅程・23行動、旧受注94経路、途中帰還・敗北、同意・出演料・40G・財布・共有道具を検証する。tools/browser-troupe-apprentice-cast-smoke.mjsは42保存点×4表示条件＝168条件。通常攻略はtools/measure-troupe-apprentice.mjsとQ150_PLAYTEST_RESULTS.jsonの標準Lv5・3編成7経路。']
]){const old=fs.readFileSync(p,'utf8'),split=old.indexOf('\n\n');fs.writeFileSync(p,old.slice(0,split+2)+text+'\n\n'+old.slice(split+2));}
console.log('q150 source, original fixture, review and current documentation prepared.');
