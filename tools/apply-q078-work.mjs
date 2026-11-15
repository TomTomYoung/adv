import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const hash=b=>createHash('sha256').update(b).digest('hex');
const expected={
 'authoring/editions/e2/salome/machine-first.mjs':'abde70a6d3e631ce54510017e4e470f383a311fef09865aec05530c5c7ebca64',
 'authoring/relocated-character-art.mjs':'b603c7487d836e347779aaa70e0d2ab2c1094e0f338078dbf0048657d5368b7c',
 'authoring/relocated-cast-review.mjs':'5d12be4e1c95ef443af8df907bda1cff7c5c2af94cc65e75e8e526923f197c20',
 'tests/relocated-cast-audit.test.mjs':'3d3af78db95236b5849c01a7bf9d1da49c7eee29ea616a9d53a4a51ae855407a',
 'data/scenario-editions/e2/q078.json':'e329d672f14b66b888d38e245a56e40d22fb2c4049c9d13e275e247505a084df'
};
for(const [p,h] of Object.entries(expected))if(hash(fs.readFileSync(p))!==h)throw Error('Source changed: '+p);
const fixture='tests/fixtures/e2-q078-before-cast.json';if(fs.existsSync(fixture))throw Error('Existing q078 fixture');
fs.copyFileSync('data/scenario-editions/e2/q078.json',fixture);
function replace(p,from,to){const s=fs.readFileSync(p,'utf8');if(s.split(from).length!==2)throw Error('Nonunique anchor: '+p);fs.writeFileSync(p,s.replace(from,to));}
replace('authoring/editions/e2/salome/machine-first.mjs',' if(q.number===79){',` if(q.number===78&&cast){
  x.entities.userPerson.character='q078_user';
  for(const id of ['entry','bench','hammer_trial','needle_trial','saved'])
   node(id).cast=[{entity:'userPerson',display:{x:50}}];
  node('saved').text='本人と二つの練習結果を持って保管室へ来た。結果を確認して新設定を保存し、旧配置の記録を別に預ける。人物の記憶や仲間の能力は書き換えない。';
 }
 if(q.number===79){`);
fs.appendFileSync('authoring/relocated-character-art.mjs',`\nrelocatedCharacters.q078_user={id:'q078_user',name:'義肢の利用者',role:'自分の工具配置を義肢に学習させる本人',detail:'槌と針の距離・握力を別々に練習する。隊と工具台や保管室へ実際に同行し、旧配置の記録と新設定を分けて扱う。',provenance:'2026-11-16。整備側原稿と既存userPersonの所在・実同行に基づく呼称表示。依頼人リンとの同一性、氏名・性別・年齢・容貌・専用画を追加しない。'};\n`);
execFileSync(process.execPath,['tools/build-scenario-editions.mjs'],{stdio:'inherit'});
const q=JSON.parse(fs.readFileSync('data/scenario-editions/e2/q078.json','utf8'));
const review={sourceSha256:hash(JSON.stringify(q)),identityNotes:[
 '整備側原稿authoring/quests.txt・structures-4.mjsのQ(78)、初版2場面・現行5場面を精読した。腕の反応は人格や感情でなく道具位置・距離・握力の作業学習であり、人物の記憶や仲間の能力を変更しない。',
 '既存userPersonを全5場面に呼称表示する。本人は槌・針の工具台と保管室へ既存4旅程に沿って実同行する。義肢armは本人の保持物のまま。依頼人リンや前使用者を同席者へ追加しない。',
 '槌と針の習熟は別々のreturnで確定し、両方が揃うまで保存へ進めない。既習作業の再選択を拒否し、どの練習段階でも手動操作へ切り替えられる。全9選択経路と既存3結末を保持する。',
 '原配置記録oldLayoutは入口からの出発時に隊が携行し、保管室に着いただけでは預入・設定保存を確定しない。savedのfinishで登録する。物語改訂1・全registry・行動・報酬・旧受注と、旧保存の待機本文・選択肢を保持する。'
 ],relatedClients:{},people:{q078_user:{label:'義肢の利用者',status:'connected',entity:'userPerson',need:'本人の希望・練習と既存の実同行に沿って全5場面へ呼称表示。新規外見は追加しない。'}},scenes:{
 entry:{decision:'person-evidence',people:['q078_user'],evidence:'利用者は自分の作業を覚えさせたい',reason:'本人が自分の作業を学習させたいと希望する。既存初期所在entryとも一致する。',visual:'本人と義肢の反応を区別し、写真に映る前使用者を現場へ配置しない。'},
 bench:{decision:'person-evidence',people:['q078_user'],evidence:'二つの作業を実際の配置で覚え直せる。',reason:'本人がentry_trainから実同行し、各試行後にも槌作業台へ戻る。独立した二つの習熟を相談する現場。',visual:'未習熟・片方習熟・両方習熟の選択肢を区別。本人不在で練習が進んだことにしない。'},
 hammer_trial:{decision:'person-evidence',people:['q078_user'],evidence:'本人が槌を握り',reason:'利用者本人が実際の距離で槌の補正を試す。槌作業台内なので追加の旅程はない。',visual:'習熟hammerはreturn操作で確定する。針の習熟を同時に立てない。'},
 needle_trial:{decision:'person-evidence',people:['q078_user'],evidence:'本人が針を持ち',reason:'本人が別の工具台まで実同行して針の距離・握力を試す。',visual:'針の習熟needleは槌作業台への実帰着で確定する。移動中は未確定のまま。'},
 saved:{decision:'person-evidence',people:['q078_user'],evidence:'本人と二つの練習結果を持って保管室へ来た。',reason:'二作業を学習した本人が保管室へ同行する。受付職員を推測で追加しない。',visual:'oldLayoutはfinishまで隊が保持し、savedはまだfalse。登録後だけ新設定と旧記録の保管を確定する。'}
 },next:'全9選択経路、新旧保存と旧受注、全4旅程の途中帰還・敗北救助、二種の習熟、本人の実同行と記録の預入、報酬一回性を検証する。次はq079「百回目の試験」。'};
replace('authoring/relocated-cast-review.mjs',' quests:{\n',' quests:{\n  q078:'+JSON.stringify(review,null,2).replaceAll('\n','\n  ')+',\n');
execFileSync(process.execPath,['tools/audit-relocated-cast.mjs'],{stdio:'inherit'});
const report=JSON.parse(fs.readFileSync('doc/scenarios/RELOCATED_CAST_AUDIT.json','utf8'));
const testPath='tests/relocated-cast-audit.test.mjs',testSource=fs.readFileSync(testPath,'utf8');
const pattern=/assert\.deepEqual\(report\.summary,\{[^\n]+\}\);/g;if([...testSource.matchAll(pattern)].length!==1)throw Error('Audit summary anchor');
fs.writeFileSync(testPath,testSource.replace(pattern,'assert.deepEqual(report.summary,'+JSON.stringify(report.summary)+');'));
console.log('q078 exact source patch and audit complete:',JSON.stringify(report.summary));
