import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const expected={"authoring/editions/e2/oddland/observatory-first.mjs":"62c1670ee7ba62dba630f824a3b615f09422d9d0877fe5d630002b7e40fe141f","tools/build-observatory-quests.mjs":"e1b68279f95bcf588626d0010026564f16c4289f873a2bd59911a626b1a84e15","authoring/relocated-character-art.mjs":"d2890c7673938b57274a4e763c74b970fca3e559babe95aa2564b846f83a152d","authoring/relocated-cast-review.mjs":"b1b49d8d9d289e7630ec4d64280920175aec1b355bca3d7bc32d58acad6b43b6","tests/relocated-cast-audit.test.mjs":"a9c30ec9a1cedcbc73222b751b0e4ff5e399ec4f20d25e6b8e2d97b126b1989f","data/scenario-editions/e2/q089.json":"dd227ffdb1d7b021945cba0e36be8221c228c13607647462dab652ac714ab81d"};
for(const [p,h] of Object.entries(expected))assert.equal(createHash('sha256').update(fs.readFileSync(p)).digest('hex'),h,p+' changed before apply');
const baseline=fs.readFileSync('data/scenario-editions/e2/q089.json');
const fixture='tests/fixtures/e2-q089-before-cast.json';
assert.ok(!fs.existsSync(fixture));fs.writeFileSync(fixture,baseline);
const patch=(path,from,to)=>{const s=fs.readFileSync(path,'utf8');assert.ok(s.includes(from),path+' anchor');assert.equal(s.split(from).length,2,path+' unique anchor');fs.writeFileSync(path,s.replace(from,to));};
patch('authoring/editions/e2/oddland/observatory-first.mjs',' if(q.number===90){',` if(q.number===89&&cast){
  entity('weddingParties','wedding','group');entity('payrollParties','wages','group');
  x.entities.weddingParties.character='q089_weddingParties';x.entities.payrollParties.character='q089_payrollParties';
  node('wedding_agreed').cast=[{entity:'weddingParties',display:{x:50}}];
  node('wages_agreed').cast=[{entity:'payrollParties',display:{x:50}}];
  node('dual').text='暦の窓口へ着いた。現行暦と天球儀の暦を急に切り替えず、ここで二つの暦の併記を確認する。';
 }
 if(q.number===90){`);
patch('tools/build-observatory-quests.mjs','  if(n===181){',`  if(n===89){
   const previous=compileRelocatedQuest(first,source(first,{cast:false}),options).story;
   for(const [key,entry] of Object.entries(previous.registry))quest.story.registry[key]=structuredClone(entry);
   const values=[{key:'weddingPartiesAt',value:'wedding'},{key:'payrollPartiesAt',value:'wages'}];
   for(const {key,value} of values)quest.story.registry[key].values=[value];
   quest.story.revision=2;quest.model.edition.revision=2;
   quest.model.storyUpgrades=[{fromRevision:1,toRevision:2,previous,values}];
  }
  if(n===181){`);
fs.appendFileSync('authoring/relocated-character-art.mjs',`\nfor(const [id,name,role,detail] of [
 ['weddingParties','婚礼の当事者たち','婚礼の日程を相談する相手','集会所で代わりの婚礼日を合意する。天球儀や暦の窓口には同行しない。'],
 ['payrollParties','支払日の相談相手','工房の支払窓口で合意する相手','工房で賃金支払日の変更に合意する。人数や担当者の固有名を定めず、他の現場へ同行させない。']
])relocatedCharacters['q089_'+id]={id:'q089_'+id,name,role,detail,provenance:'2026-11-17。現行本文の婚礼当事者との相談と工房の支払窓口での合意に基づく集団呼称。ツキとの同一視・氏名・人数・容貌・専用画を追加しない。'};\n`);
const review={sourceSha256:'Q089_PENDING',identityNotes:[
 '原稿authoring/quests.txt・structures-5.mjsのQ(89)、初版2場面・現行5場面・6旅程・10行動を精読した。婚礼の当事者と工房の支払日の相談相手をそれぞれ合意の現場だけへ表示し、依頼人ツキや別の窓口担当者を補わない。',
 '婚礼と給与日の合意は相談先への実到着時に個別に確定する。出発時・移動中には未合意のまま。合意済みの同じ相談は再選択できず、両方を確認した後だけswitchが有効になる。窓口からの帰路も実移動する。',
 '天球儀を南へ戻すsouth、歯車を削るground、暦を切り替えるswitchedを分ける。両合意の前後・片方だけでも二暦併用へ進めるが、暦の窓口への到着ではfinished=falseを保ち、finishで結果を確定する。',
 '旧保存を旧定義で全体検証後、二つの固定所在だけを補う。既存registry、全行動・結末・報酬・旧受注を維持する。人物追加と移行定義とdualの1本文を除いた配布JSONは旧版と一致し、旧保存の待機本文・選択肢も保持する。原稿の旧表現から戦闘を追加しない。'
],relatedClients:{},people:{
 q089_weddingParties:{label:'婚礼の当事者たち',status:'connected',entity:'weddingParties',need:'婚礼の相談と日程合意を行う集会所だけで表示する。'},
 q089_payrollParties:{label:'支払日の相談相手',status:'connected',entity:'payrollParties',need:'工房の支払窓口で合意する相手だけを表示する。人数・個人役職は確定しない。'}
},scenes:{
 entry:{decision:'no-person-evidence',people:[],evidence:'持ち手の摩耗も南側にある。',reason:'装置の字と摩耗を確認する場面。依頼人ツキが同席する本文はない。',visual:'字を見る向きと台の操作を分ける。'},
 dates:{decision:'no-person-evidence',people:[],evidence:'婚礼と賃金支払が、その月へ予定されている。',reason:'予定への言及だけで当事者が装置の前に来ているとは判断しない。',visual:'二つの相談の完了状態とswitchの条件を区別する。'},
 wedding_agreed:{decision:'person-evidence',people:['q089_weddingParties'],evidence:'婚礼の当事者と集会所で話し',reason:'集会所で本人たちと代わりの日を決める。合意は実到着時に確定済みであり、帰路では同行しない。',visual:'婚礼の合意を給与日の合意へ代用しない。'},
 wages_agreed:{decision:'person-evidence',people:['q089_payrollParties'],evidence:'工房の支払窓口で、賃金の支払日を移す合意を得た。',reason:'工房で合意を得る相談相手を集団呼称として表示する。人数・固有名・個別の職位は補わない。',visual:'給与日の合意だけで婚礼日や暦全体を変更しない。'},
 dual:{decision:'no-person-evidence',people:[],evidence:'ここで二つの暦の併記を確認する。',reason:'窓口の実操作前であり、結末で二欄を作るツキをこの待機場面に推測で配置しない。',visual:'到着時とfinishでの併用確定を分ける。'}
},next:'q090「空を返す日」の出演監査。q089の9条件付き経路・保存移行・固定所在・途中帰還と敗北救助・通常編成・実画面の結果はPRに記録する。'};
// Pin only after rereading the exact generated quest.
execFileSync(process.execPath,['tools/build-scenario-editions.mjs'],{stdio:'inherit'});
const q=JSON.parse(fs.readFileSync('data/scenario-editions/e2/q089.json','utf8'));
review.sourceSha256=createHash('sha256').update(JSON.stringify(q)).digest('hex');
patch('authoring/relocated-cast-review.mjs',' quests:{\n',' quests:{\n  q089:'+JSON.stringify(review,null,2).replaceAll('\n','\n  ')+',\n');
patch('authoring/relocated-cast-review.mjs'," reviewedAt:'2026-11-16'"," reviewedAt:'2026-11-17'");
patch('tests/relocated-cast-audit.test.mjs','{"quests":100,"scenes":753,"emptyCastScenes":253,"personEntities":157,"characterLinkedEntities":153,"reviewedQuests":98,"reviewedScenes":738,"noPersonEvidenceScenes":237,"personEvidenceScenes":501,"candidateRoles":1,"connectedRoles":206,"unreviewedScenes":15}',
'{"quests":100,"scenes":753,"emptyCastScenes":251,"personEntities":157,"characterLinkedEntities":153,"reviewedQuests":99,"reviewedScenes":743,"noPersonEvidenceScenes":240,"personEvidenceScenes":503,"candidateRoles":1,"connectedRoles":208,"unreviewedScenes":10}');
console.log('q089 authoring, old fixture, migration and audit applied');
