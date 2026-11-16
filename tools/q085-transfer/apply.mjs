import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const hash=b=>createHash('sha256').update(b).digest('hex');
const expected={
 'authoring/editions/e2/oddland/observatory-first.mjs':'62c3d797f26520beca2d254455636f13d859b6b75f684c5364a15fb988e97f0e',
 'authoring/relocated-character-art.mjs':'8c13914a56bc0641e685dc5e3e367d6c8f038ee866b6696a1ca7879ed640fe7b',
 'authoring/relocated-cast-review.mjs':'c237c19ce4a9827b5002aaf641fdd6fca6e4de877792d32c722f9bc7ee90e0f1',
 'tests/relocated-cast-audit.test.mjs':'afac85d426fd501b09911da2d666db4e970c34d3d24710185e13bf08180806ee',
 'data/scenario-editions/e2/q085.json':'39669a82a2acf07426705164abac9f989112077a5861458a4c4a0fd4ba50e638'
};
for(const [p,h] of Object.entries(expected))assert.equal(hash(fs.readFileSync(p)),h,p);
const fixture='tests/fixtures/e2-q085-before-cast.json';assert.ok(!fs.existsSync(fixture));fs.copyFileSync('data/scenario-editions/e2/q085.json',fixture);
const source='authoring/editions/e2/oddland/observatory-first.mjs';let s=fs.readFileSync(source,'utf8');
const hook=" if(q.number===86){";assert.equal(s.split(hook).length,2);
s=s.replace(hook,` if(q.number===85&&cast){
  x.entities.guide.character='q085_guide';x.entities.nextGuide.character='q085_nextGuide';
  for(const scene of ['entrance','leader','place_marker','recover_marker','fixed'])
   node(scene).cast=['guide','nextGuide'].map((entity,i)=>({entity,display:{x:[31,69][i]}}));
  node('place_marker').text='先導役の二人と入口へ着いた。帰還標はまだ隊が保持している。標をここに置いてから、二人と曲がり角へ進んで針を試す。';
  node('fixed').text='先導役の二人と入口へ戻った。置いた帰還標はここにある。これから標の固定を確認し、脱出用具として登録する。';
 }
`+hook);fs.writeFileSync(source,s);
const art='authoring/relocated-character-art.mjs';fs.appendFileSync(art,`\nfor(const [id,name,role] of [
 ['guide','先導役','帰還標を最初に受け取る先導役'],
 ['nextGuide','交代する先導役','帰還標を受け継いで先導を交代する隊員']
])relocatedCharacters['q085_'+id]={id:'q085_'+id,name,role,detail:'帰還標を使う試験で入口と曲がり角を実際に往復する。針が追う標の保持者と、同行している人物の所在は別々に記録する。',provenance:'2026-11-16。原稿と現行経路の二人の先導役・実同行による呼称表示。ルウや荷袋の所有者と同一視せず、個人名・容貌・専用画は追加しない。'};\n`);
execFileSync(process.execPath,['tools/build-scenario-editions.mjs'],{stdio:'inherit'});
const q=JSON.parse(fs.readFileSync('data/scenario-editions/e2/q085.json'));
const both=['q085_guide','q085_nextGuide'];
const row=(people,evidence,reason,visual)=>({decision:people.length?'person-evidence':'no-person-evidence',people,evidence,reason,visual});
const review={sourceSha256:hash(JSON.stringify(q)),identityNotes:[
 '原稿authoring/quests.txt・structures-5.mjsのQ(85)、初版4場面・現行7場面・7旅程・11行動を精読した。反復可能なため無限の選択列を全列挙とは呼ばない。',
 '既存guideとnextGuideだけを実同行先の5場面に表示する。冒頭の荷袋の所有者をどちらかへ同定せず、markerの選択肢による将来の役割だけで二人を表示しない。ルウを追加しない。',
 '標は荷袋bagから隊へ取り出し、入口へ置くwalkの出発時だけexitへ移る。回収場所への到着だけで拾わず、leader出発時にexit→party→guide、実到着時にnextGuideへ渡す。先導者試験から入口へ戻る際はnextGuide→partyを出発時に行う。',
 '帰還標が入口にある状態とfixed=trueの最終登録を分ける。fixedはfinishだけで確定する。磁化では帰還機能を失う別結末を保持し、架空の戦闘を加えない。',
 '物語改訂1、既存registry・全行動・報酬・旧受注を維持する。人物のcharacterとcast、設置前と登録前の2本文以外の配布JSONが旧版と一致する。旧保存にある待機本文と選択肢も保持する。'
 ],relatedClients:{},people:{
 q085_guide:{label:'先導役',status:'connected',entity:'guide',need:'既存の7旅程に沿い、実同行先5場面だけに呼称表示。'},
 q085_nextGuide:{label:'交代する先導役',status:'connected',entity:'nextGuide',need:'同じ実同行先5場面へ表示。標の受取と人物の同行を混同しない。'}
 },scenes:{
 entry:row([],'羅針盤が隊員の荷袋へ向く。','荷袋の所有者は既存の先導役のどちらかと明示されない。針と荷袋の挙動を調べる場面。','ルウや所有者を新規の人物として補わない。'),
 marker:row([],'動く先導者へ渡すかを試せる。','先導者への受渡しはまだ選択前。役割の候補を特定人物の実出演へ読み替えない。','取り出した標の保持者は隊であり、先導者にまだ渡していない。'),
 entrance:row(both,'角を曲がっても針は入口へ向く。','place_marker_walkの既存実同行で二人が曲がり角へ到着して針を確認する。','標はexitに置いたまま。二人はcornerにいる。'),
 leader:row(both,'標を次の隊員へ渡すと針が向きを変えた。','標の最初の受取人と交代する隊員の二人が明示され、既存の旅程で実到着している。','実到着時に標がguideからnextGuideへ渡る。'),
 place_marker:row(both,'先導役の二人と入口へ着いた。','markerまたはleaderから二人が既存旅程で入口へ到着する。','到着時点では標はparty。walk出発時にexitへ設置する。'),
 recover_marker:row(both,'入口へ戻り、置いてあった帰還標を確かめた。','entrance_leaderで二人が入口へ実同行した。確認だけでは標を回収していない。','leader出発時に回収・先導役への受渡し、corner到着時に交代する。'),
 fixed:row(both,'先導役の二人と入口へ戻った。','entrance_exitで二人が実同行する。標は先に入口へ置かれている。','fixedと依頼完了はfinishだけで確定する。')
 },next:'反復の有限状態探索、保存再開、設置と回収・二人の実同行、帰還と敗北救助、報酬の一回性、Scene/Classicを確認する。次はq086「百年前の観測者」。'};
const reviewPath='authoring/relocated-cast-review.mjs';s=fs.readFileSync(reviewPath,'utf8');assert.ok(!s.includes('  q085:'));assert.ok(s.includes(' quests:{\n'));s=s.replace(' quests:{\n',' quests:{\n  q085:'+JSON.stringify(review,null,2).replaceAll('\n','\n  ')+',\n');fs.writeFileSync(reviewPath,s);
execFileSync(process.execPath,['tools/audit-relocated-cast.mjs'],{stdio:'inherit'});
const t='tests/relocated-cast-audit.test.mjs';s=fs.readFileSync(t,'utf8');const summary=JSON.parse(fs.readFileSync('doc/scenarios/RELOCATED_CAST_AUDIT.json')).summary;
assert.equal(summary.reviewedQuests,95);assert.equal(summary.reviewedScenes,716);assert.equal(summary.unreviewedScenes,37);
assert.ok(s.includes('assert.deepEqual(report.summary,'));s=s.replace(/assert\.deepEqual\(report\.summary,\{[^\n]+\}\);/,'assert.deepEqual(report.summary,'+JSON.stringify(summary)+');');fs.writeFileSync(t,s);
console.log('q085 cast and audit applied; original state and revision preserved.');
