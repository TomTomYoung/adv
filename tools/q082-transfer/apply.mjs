import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const hash=x=>createHash('sha256').update(x).digest('hex');
const expected={
 'authoring/editions/e2/oddland/observatory-first.mjs':'39454c4b1ed4ccbe98aa89c4eb14760c867730a679875bb0776b4397bb086ba4',
 'tools/build-observatory-quests.mjs':'d4fcb54c9f99fb2f2856e1fa16023f407bd7cba557de83d60513333a37e211cc',
 'authoring/relocated-cast-review.mjs':'e4d64dc544e1e3c5cc2cfd32a1da3c7ddfc98addb01425b615fd75e04bbf3b25',
 'authoring/relocated-character-art.mjs':'fff1d7b0d1edba3cebe508b0d48768be9924d7638f38aa3635ced0e75a4d11ca',
 'tests/relocated-cast-audit.test.mjs':'ae67999caba4da464e72c1ee7a1ef95f59b4051bf1e1dffc25d1075dba93d67e',
 'data/scenario-editions/e2/q082.json':'3976e11b02c662457e0c1b96cedd8584990ecf8baea83b97c5ec0483f815f49a'
};
for(const [p,h] of Object.entries(expected))assert.equal(hash(fs.readFileSync(p)),h,p+' changed');
const fixture='tests/fixtures/e2-q082-before-cast.json';assert.ok(!fs.existsSync(fixture));fs.copyFileSync('data/scenario-editions/e2/q082.json',fixture);
function edit(p,from,to){const s=fs.readFileSync(p,'utf8');assert.equal(s.split(from).length,2,p+' unique anchor');fs.writeFileSync(p,s.replace(from,to));}
edit('authoring/editions/e2/oddland/observatory-first.mjs',' if(q.number===83){',` if(q.number===82&&cast){
  entity('elPerson','entry','person');
  x.entities.elPerson.character='q082_el';
  x.entities.customer.character='q082_customer';
  node('label').cast=[{entity:'elPerson',display:{x:50}}];
  for(const scene of ['sold_spent','sold'])node(scene).cast=[{entity:'customer',display:{x:50}}];
  node('sold_spent').text='光を使い切った瓶を地上の店へ運んだ。瓶は隊が保持している。状態を客へ説明し、ここで引渡しを確認する。';
  node('sold').text='適温、光の寿命、再充填の方法を書いた札とともに瓶を地上の店へ運んだ。瓶は隊が保持しており、これから客への引渡しを確認する。';
  node('returned').text='瓶を地上の店へ運んだ。仕組みと試験後の状態を説明し、これから返品を確認する。瓶は確認が済むまで隊が保持する。';
 }
 if(q.number===83){`);
edit('tools/build-observatory-quests.mjs','  if(n===181){',`  if(n===82){
   const previous=compileRelocatedQuest(first,source(first,{cast:false}),options).story;
   // Preserve every existing holder domain, including customer and bottle.
   for(const [key,entry] of Object.entries(previous.registry))quest.story.registry[key]=structuredClone(entry);
   quest.story.registry.elPersonAt.values=['entry'];
   quest.story.revision=2;quest.model.edition.revision=2;
   quest.model.storyUpgrades=[{fromRevision:1,toRevision:2,previous,values:[{key:'elPersonAt',value:'entry'}]}];
  }
  if(n===181){`);
fs.appendFileSync('authoring/relocated-character-art.mjs',`\nfor(const [id,name,role,detail] of [
 ['el','エル','星瓶を扱う商人','適温で光が戻ることを確かめ、永久の星という売り札を外す。地上の店への同行は追加しない。'],
 ['customer','瓶を受け取る客','地上の店で瓶の説明を聞く客','適温と寿命の説明、または光を使い切った状態の説明を受けて瓶を受け取る。地下の試験には同席しない。']
])relocatedCharacters['q082_'+id]={id:'q082_'+id,name,role,detail,provenance:'2026-11-16。原稿と現行場面の動作・既存の所在に基づく呼称表示。氏名のない客の個人像・人数・専用画を追加せず、返品の結末の客を現在の受取人と同定しない。'};
`);
// Import generation only after editing its source modules.
await (await import('../build-scenario-editions.mjs')).buildScenarioEditions();
const q=JSON.parse(fs.readFileSync('data/scenario-editions/e2/q082.json','utf8'));
const scene=(decision,people,evidence,reason,visual)=>({decision,people,evidence,reason,visual});
const review={sourceSha256:hash(JSON.stringify(q)),identityNotes:[
 '原稿authoring/quests.txt・structures-5.mjsのQ(82)、初版4場面・現行8場面を精読。温度に応じて放光する材質の設定と蓄えを使い切る不可逆な状態を区別し、星や人格として扱わない。',
 'エルが売り札を外すlabelだけへ本人を表示し、entryの固定所在を追加する。既存customerは地上vendorに留まり、sold・sold_spentだけへ表示する。全7旅程の同行者は空のまま。返品の結末に出る複数の客を、現在の引渡し相手へ同定しない。',
 '瓶は出発時にentryからpartyへ移り、地上への実到着では隊の保持を続ける。販売finishでcustomer、返品finishでvendorへ渡す。spentは強い加熱の操作時、normalは適温を選んだ操作時に確定し、返品や移動で消さない。',
 '物語改訂1→2は旧定義で保存全体を検証後、elPersonAt=entryだけを追加する。既存registry・14行動・3結末・報酬・旧受注を維持し、販売2場面と返品1場面の本文だけを完了操作前へ明確化する。表示途中の旧本文・選択肢は保持する。',
 '原稿に残る光喰いという旧表現から戦闘を追加しない。現行と旧受注の各7経路は全て依頼内では非戦闘で、通常探索の遭遇とは区別する。'
 ],relatedClients:{},people:{
 q082_el:{label:'商人エル',status:'connected',entity:'elPerson',need:'売り札を外すlabelだけ。初期の試験や地上へ同席を推測しない。'},
 q082_customer:{label:'瓶を受け取る客',status:'connected',entity:'customer',need:'地上の販売2場面だけ。返品先の担当者や結末の別の客へ読み替えない。'}
 },scenes:{
 entry:scene('no-person-evidence',[],'掌を当てた瓶の側面だけ細く光る。','瓶の調査のみ。エルが依頼人であることからこの場への同席を推測しない。','開封と発光の原因を区別する。'),
 temperature:scene('no-person-evidence',[],'展示箱のつまみは低・適温・高の三段','材質と展示箱の調査であり、第三者の動作・発言はない。','適温と高温を別の選択として保つ。'),
 spent:scene('no-person-evidence',[],'温度を戻しても今夜の光は戻らない。','使い切った蓄光を調べる場面。客は地上にいる。','販売か返品を選んでも消費済みの光は回復しない。'),
 label:scene('person-evidence',['q082_el'],'エルは「永久の星」という売り札を外した。','本人が売り札を外す動作が明示されている。','エルの動作と、まだ行われていない地上での引渡しを分ける。'),
 heated:scene('no-person-evidence',[],'一瞬明るくなって蓄えを使い切った。','直接加熱した結果の確認。売る相手はこの場には同席していない。','試験で光が尽きても瓶はentryにある。'),
 sold_spent:scene('person-evidence',['q082_customer'],'状態を客へ説明し','既存customerはvendorで受領待ち。地下のエルは同行していない。','光が尽きた説明後もfinishまで瓶は隊が保持する。'),
 sold:scene('person-evidence',['q082_customer'],'これから客への引渡しを確認する。','既存customerへ注意書き付きの瓶を渡す現場。エルを追加しない。','適温と寿命の札、引渡し前の瓶を区別する。'),
 returned:scene('no-person-evidence',[],'これから返品を確認する。','隊が店へ返す場面。返品担当の固有人物や、販売時と同じ客の同席は書かれていない。','瓶はfinishまで隊にあり、その後vendorへ戻る。')
 },next:'8場面・7旅程・14行動・3結末と7経路、新旧保存、瓶の保持者とspent/normal、固定所在、帰還・敗北再開を検証する。次はq083「地底の日食」。'};
edit('authoring/relocated-cast-review.mjs',' quests:{\n',' quests:{\n  q082:'+JSON.stringify(review,null,2).replaceAll('\n','\n  ')+',\n');
const before={quests:100,scenes:753,emptyCastScenes:276,personEntities:154,characterLinkedEntities:146,reviewedQuests:91,reviewedScenes:685,noPersonEvidenceScenes:207,personEvidenceScenes:478,candidateRoles:1,connectedRoles:195,unreviewedScenes:68};
const after={quests:100,scenes:753,emptyCastScenes:273,personEntities:155,characterLinkedEntities:148,reviewedQuests:92,reviewedScenes:693,noPersonEvidenceScenes:212,personEvidenceScenes:481,candidateRoles:1,connectedRoles:197,unreviewedScenes:60};
edit('tests/relocated-cast-audit.test.mjs',JSON.stringify(before),JSON.stringify(after));
console.log('q082 source and review applied; previous definition preserved');
