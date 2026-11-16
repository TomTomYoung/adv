import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const fingerprint=s=>createHash('sha256').update(s).digest('hex');
const file='data/scenario-editions/e2/q083.json';
const old=fs.readFileSync(file,'utf8');
assert.equal(JSON.parse(old).story.revision,1);
assert.ok(!fs.existsSync('tests/fixtures/e2-q083-before-cast.json'));
fs.writeFileSync('tests/fixtures/e2-q083-before-cast.json',old);
function replace(path,before,after){const s=fs.readFileSync(path,'utf8');assert.equal(s.split(before).length,2,path+' exact anchor');fs.writeFileSync(path,s.replace(before,after));}
replace('authoring/editions/e2/oddland/observatory-first.mjs',' if(q.number===84){',` if(q.number===83&&cast){
  entity('calendarMaker','entry','person');entity('maintainer','scaffold','person');
  x.entities.calendarMaker.character='q083_calendarMaker';x.entities.maintainer.character='q083_maintainer';
  node('entry').cast=[{entity:'calendarMaker',display:{x:50}}];
  node('scaffold').cast=[{entity:'maintainer',display:{x:50}}];
  node('stopped').text='回転制御へ着いた。ここで人工太陽の回転を止める。止めれば昼夜の循環も止まり、以後の消灯は手動になる。';
  node('corrected').text='暦の窓口へ着いた。以前の欠けた日を消さず、保守足場による影だったと注記する準備ができている。';
  node('shade').text='暦の窓口へ着いた。足場を残したまま、影の続く時間を記して短い薄明の運用をここで相談する。';
 }
 if(q.number===84){`);
replace('tools/build-observatory-quests.mjs','  if(n===181){',`  if(n===83){
   const previous=compileRelocatedQuest(first,source(first,{cast:false}),options).story;
   for(const [key,entry] of Object.entries(previous.registry))quest.story.registry[key]=structuredClone(entry);
   const values=[{key:'calendarMakerAt',value:'entry'},{key:'maintainerAt',value:'scaffold'}];
   for(const {key,value} of values)quest.story.registry[key].values=[value];
   quest.story.revision=2;quest.model.edition.revision=2;
   quest.model.storyUpgrades=[{fromRevision:1,toRevision:2,previous,values}];
  }
  if(n===181){`);
fs.appendFileSync('authoring/relocated-character-art.mjs',`\nfor(const [id,name,role,detail] of [
 ['calendarMaker','暦職人ツキ','人工太陽の影を記録する暦職人','冒頭で影を日食として記録する。依頼の結末での注記や予定照合を、窓口への先回り表示にしない。'],
 ['maintainer','保守員','撤去待ちの足場を説明する保守員','足場の操作点で、影の原因が撤去待ちの足場だと認める。回転制御や暦の窓口へ同行しない。']
])relocatedCharacters['q083_'+id]={id:'q083_'+id,name,role,detail,provenance:'2026-11-16。原稿と現行本文の発言・動作に基づく呼称表示。容貌・年齢・専用画は追加しない。'};\n`);
execFileSync('node',['tools/build-scenario-editions.mjs'],{stdio:'inherit'});
const q=JSON.parse(fs.readFileSync(file,'utf8'));
const review={
 sourceSha256:fingerprint(JSON.stringify(q)),
 identityNotes:[
  '原稿authoring/quests.txt・structures-5.mjsのQ(83)、初版2場面・現行6場面を精読した。梯子状の影は保守足場によるもので、実際の天体の日食とは区別する。',
  '冒頭で記録する暦職人は依頼人欄の暦職人ツキとしてentryだけに表示する。原因を認める保守員はscaffoldだけに表示する。二役は各現場に固定し、全5旅程の同行者は空のまま。結末のツキの言及を根拠に暦窓口へ先回りさせない。',
  'scaffold_datesの選択で足場撤去が確定し、removed到着本文では既に光が戻っている。訂正窓口への到着では依頼未完了で、corrected_finishで注記を含む結末を確定する。撤去だけのrepairedは暦訂正を完了したことにしない。',
  '回転制御への到着だけではstoppedはfalseのまま。stopped_finishで停止を確定する。shadeは足場を残す運用で、直接向かう場合と原因確認後に向かう場合を区別する。地形装置・携行灯燃料は変更しない。',
  '物語改訂1→2では旧定義で保存全体を検証後、二役の固定所在のみ補う。既存registry・10行動・4結末・報酬・旧受注を保持し、stopped・corrected・shadeの本文3箇所だけを完了操作前へ明確化する。旧保存の表示途中の本文・選択肢は保持する。原稿の影獣という旧表現から戦闘は追加しない。'
 ],relatedClients:{},
 people:{
  q083_calendarMaker:{label:'暦職人ツキ',status:'connected',entity:'calendarMaker',need:'冒頭で日食と記録するentryだけ。結末の行動を他場面の同席へ拡張しない。'},
  q083_maintainer:{label:'保守員',status:'connected',entity:'maintainer',need:'足場の原因を認めるscaffoldだけ。撤去後や地上へ自動的に持ち越さない。'}
 },
 scenes:{
  entry:{decision:'person-evidence',people:['q083_calendarMaker'],evidence:'暦職人は日食と記している。',reason:'暦職人の記録動作が明記される。依頼人欄の役と接続し、保守員はこの場に追加しない。',visual:'梯子の影と暦の記述を分ける。まだ原因は未確認。'},
  scaffold:{decision:'person-evidence',people:['q083_maintainer'],evidence:'保守員は、撤去待ちの足場が影を作っていると認めた。',reason:'現場で保守員が影の原因を説明する。暦職人が同行する記述はない。',visual:'原因の観察と足場の撤去を別の操作として扱う。'},
  stopped:{decision:'no-person-evidence',people:[],evidence:'回転制御へ着いた。',reason:'操作点への到着。二役の同席根拠はなく、停止はまだ未確定。',visual:'最後の操作で回転を止め、昼夜停止と手動消灯を結果にする。'},
  removed:{decision:'no-person-evidence',people:[],evidence:'光が戻ったことを確認した。',reason:'撤去結果を確認する本文で、特定人物の動作・発言はない。保守員の呼称を前場面から自動継続しない。',visual:'足場は既に撤去済みだが、暦の訂正は残る。'},
  corrected:{decision:'no-person-evidence',people:[],evidence:'注記する準備ができている。',reason:'訂正窓口の作業前。結末でツキが記録を残すことだけから、この場への移動を補わない。',visual:'過去の日付を消去せず、完了操作で原因の注記を確定する。'},
  shade:{decision:'no-person-evidence',people:[],evidence:'足場を残したまま',reason:'短い薄明の運用相談。特定の相談相手の発言・所在は書かれていない。',visual:'直接訪問と原因確認後の訪問を保持し、足場撤去・回転停止とは別の結末にする。'}
 },next:'実画面・全体CIの最終結果をPRへ記録する。次はq084「帰還信号」。'
};
replace('authoring/relocated-cast-review.mjs',' quests:{',' quests:{\n  q083:'+JSON.stringify(review,null,2).replaceAll('\n','\n  ')+',');
execFileSync('node',['tools/audit-relocated-cast.mjs'],{stdio:'inherit'});
const summary=JSON.parse(fs.readFileSync('doc/scenarios/RELOCATED_CAST_AUDIT.json','utf8')).summary;
assert.equal(summary.reviewedQuests,93);assert.equal(summary.reviewedScenes,699);assert.equal(summary.unreviewedScenes,54);
const t='tests/relocated-cast-audit.test.mjs',s=fs.readFileSync(t,'utf8');
const m=s.match(/assert\.deepEqual\(report\.summary,(\{[^\n]+\})\);/);assert.ok(m);
const prev=JSON.parse(m[1]);assert.equal(prev.reviewedQuests,92);assert.equal(prev.reviewedScenes,693);
for(const [k,delta] of Object.entries({emptyCastScenes:-2,personEntities:2,characterLinkedEntities:2,reviewedQuests:1,reviewedScenes:6,noPersonEvidenceScenes:4,personEvidenceScenes:2,connectedRoles:2,unreviewedScenes:-6}))assert.equal(summary[k],prev[k]+delta,k);
fs.writeFileSync(t,s.replace(m[1],JSON.stringify(summary)));
console.log('q083 authoring, migration and six-scene editorial audit applied.');
