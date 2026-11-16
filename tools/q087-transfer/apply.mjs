import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const hashes={"authoring/editions/e2/oddland/observatory-first.mjs":"bc6b807d02e7469582bd449a137d1ebfb5ccf0aadc821f83236f85af53cfbd23","authoring/relocated-character-art.mjs":"c8917016cf877e2d163eeb9e3742e0f88d1273f5d4ece1b6193dc0eb029d3fad","authoring/relocated-cast-review.mjs":"90d9278139b79e0e46f357f609ba6a130df2466b9abf64b7e6a63e4678f9f323","tests/relocated-cast-audit.test.mjs":"8f52e6de0aa7dcd421e8afc92c02f83f5f994e5e088db55df394c85942ae4998","data/scenario-editions/e2/q087.json":"7aaf2a263586cc0fd58e2c83cac7b2c3c92933b248b2c2c3bbf5e8b115fbea80"};
for(const [p,h] of Object.entries(hashes))assert.equal(createHash('sha256').update(fs.readFileSync(p)).digest('hex'),h,p+' changed');
const fixture='tests/fixtures/e2-q087-before-cast.json';assert.ok(!fs.existsSync(fixture));fs.copyFileSync('data/scenario-editions/e2/q087.json',fixture);
const path='authoring/editions/e2/oddland/observatory-first.mjs';let text=fs.readFileSync(path,'utf8');
const anchor=' if(q.number===88){';assert.equal(text.split(anchor).length,2);
text=text.replace(anchor,` if(q.number===87&&cast){
  x.entities.haku.character='q087_haku';
  for(const scene of ['entry','ticket','firststep','written','desk'])node(scene).cast=[{entity:'haku',display:{x:50}}];
  node('desk').text='ハクと家の机へ戻った。願いを読み返し、これから最初の一つを棚へ片付ける。最初の一つはまだ机にあり、ここで実行を確認する。';
 }
`+anchor);fs.writeFileSync(path,text);
const art='authoring/relocated-character-art.mjs';assert.ok(!fs.readFileSync(art,'utf8').includes('relocatedCharacters.q087_haku='));
fs.appendFileSync(art,`
relocatedCharacters.q087_haku={id:'q087_haku',name:'ハク',role:'願いを筒へ入れた見習い',detail:'机を片付けたいと願い、受付札を願いの実現と取り違えた本人。上映席や自宅へ実際に同行し、記録と実行を分けて確かめる。',provenance:'2026-11-16。原稿と現行5場面の発言・初期所在・既存同行に基づく呼称表示。容貌・年齢・専用画像、同行者を追加しない。'};
`);
execFileSync(process.execPath,['tools/build-scenario-editions.mjs'],{stdio:'inherit'});
const q=JSON.parse(fs.readFileSync('data/scenario-editions/e2/q087.json','utf8'));
const review={"sourceSha256":"PENDING_Q087","identityNotes":["原稿authoring/quests.txt・structures-5.mjsのQ(87)、初版3場面・現行5場面・4旅程・9行動を精読した。ハクは冒頭で発言し、既存hakuの初期所在と実同行に従って全5場面に表示する。筒の番人・観客・家族・専用画は追加しない。","完了札は願いの実現ではなく受付完了を示す。ticketIssued、wordingFixed、written、firstStepを別々に保持し、札の訂正や手帳への記入を片付けの実行と混同しない。","上映席へ向かう3経路ではwrittenを出発時に確定し、ハクが実同行する。手帳は既存のまま隊が保持し、机の物はdeskに残る。本人の希望を記録しただけでは棚への片付けは行わない。","家の机への到着ではclutterAt=desk・firstStep=falseを保ち、desk_finishで最初の一つをshelfへ移す。家の本文1箇所だけを操作前へ明確化する。筒の破壊は誤認を止める別の結末であり、架空の戦闘を加えない。","物語改訂1、全registry・全9行動・報酬・旧受注を維持し、移行処理は追加しない。character参照・5場面のcast・机の1本文以外の配布JSONが旧版と一致し、旧保存の待機本文と選択肢を含む保存全体を維持する。"],"relatedClients":{},"people":{"q087_haku":{"label":"見習いのハク","status":"connected","entity":"haku","need":"冒頭と同じ現場の試験・読み直し、既存の実同行後の上映席・家の机だけへ呼称表示する。"}},"scenes":{"entry":{"decision":"person-evidence","people":["q087_haku"],"evidence":"もう終わった気がすると言う。","reason":"ハク本人が願いを話し、既存の初期所在entryにいる。机が散らかったままであることは願いの実現と別に扱う。","visual":"ハクの呼称を既存の所在に沿って表示し、受付・記録・実行と処理の確定時点を区別する。"},"ticket":{"decision":"person-evidence","people":["q087_haku"],"evidence":"歩く前に完了札が出た。","reason":"冒頭のハクが同じ現場に残る。entry_testは移動を含まず、hakuAt=entryを保持する。札や筒を別の人物にしない。","visual":"ハクの呼称を既存の所在に沿って表示し、受付・記録・実行と処理の確定時点を区別する。"},"firststep":{"decision":"person-evidence","people":["q087_haku"],"evidence":"ハクは札を読み直した。","reason":"札の意味を読み直すハク本人が明示される。訂正したことだけで本人が片付けを実行したことにしない。","visual":"ハクの呼称を既存の所在に沿って表示し、受付・記録・実行と処理の確定時点を区別する。"},"written":{"decision":"person-evidence","people":["q087_haku"],"evidence":"ハクと上映席へ来た。","reason":"3通りの記録経路のいずれもハクが上映席へ実同行する。writtenは記録の旗であり、本人の片付け実行を表さない。","visual":"ハクの呼称を既存の所在に沿って表示し、受付・記録・実行と処理の確定時点を区別する。"},"desk":{"decision":"person-evidence","people":["q087_haku"],"evidence":"最初の一つはまだ机にあり","reason":"ハクが隊と家へ実同行して到着する。片付ける対象はまだdeskにあり、finishで棚へ移す。家族や筒の番人は追加しない。","visual":"ハクの呼称を既存の所在に沿って表示し、受付・記録・実行と処理の確定時点を区別する。"}},"next":"受付と実行、手帳の記録と片付け、ハクの実同行、全5経路・新旧保存・中断再開を検証する。次工程はq088「観測窓の亀裂」。"};review.sourceSha256=createHash('sha256').update(JSON.stringify(q)).digest('hex');
const editorial='authoring/relocated-cast-review.mjs';text=fs.readFileSync(editorial,'utf8');assert.equal(text.split(' quests:{\n').length,2);text=text.replace(' quests:{\n',' quests:{\n  q087:'+JSON.stringify(review,null,2).replaceAll('\n','\n  ')+',\n');fs.writeFileSync(editorial,text);
const test='tests/relocated-cast-audit.test.mjs';text=fs.readFileSync(test,'utf8');
const before='{"quests":100,"scenes":753,"emptyCastScenes":260,"personEntities":157,"characterLinkedEntities":152,"reviewedQuests":96,"reviewedScenes":723,"noPersonEvidenceScenes":229,"personEvidenceScenes":494,"candidateRoles":1,"connectedRoles":204,"unreviewedScenes":30}';
const after='{"quests":100,"scenes":753,"emptyCastScenes":255,"personEntities":157,"characterLinkedEntities":153,"reviewedQuests":97,"reviewedScenes":728,"noPersonEvidenceScenes":229,"personEvidenceScenes":499,"candidateRoles":1,"connectedRoles":205,"unreviewedScenes":25}';
assert.ok(text.includes(before));fs.writeFileSync(test,text.replace(before,after));execFileSync(process.execPath,['tools/audit-relocated-cast.mjs'],{stdio:'inherit'});
console.log('q087: five Haku casts, one pending-action sentence and reviewed evidence generated.');
