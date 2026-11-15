import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const sha=s=>createHash('sha256').update(s).digest('hex');
const expected={"authoring/editions/e2/salome/machine-first.mjs":"19b5ac06cac2aa09b7618bac0ee9db7470f4fc5ee9a17da99f808e5e8dc9f615","authoring/relocated-character-art.mjs":"bbbfbc05a179f00e4cd86156fb309ade1b243bb65b247bc3053b6ee779b9d5fa","authoring/relocated-cast-review.mjs":"cc7cef776db2afd522c672e119c9227d23912ca4a0862af219c79887a78f1ebe","tests/relocated-cast-audit.test.mjs":"21ca3f04d7c1060efb7628777c3b48c722694ca15984b8e573f72cda6af04bed","data/scenario-editions/e2/q075.json":"baab2e62e6c8a0de5755a6db456afd0d30342e892fd3fb3dcd5b8e6c86a2f282"};
for(const [file,hash] of Object.entries(expected))if(sha(fs.readFileSync(file))!==hash)throw Error('Source changed: '+file);
const source='authoring/editions/e2/salome/machine-first.mjs';
const old=fs.readFileSync('data/scenario-editions/e2/q075.json');
const baseline=JSON.parse(old);
if(baseline.story.revision!==1||baseline.story.entities.workersGroup.character)throw Error('q075 baseline changed');
const fixture='tests/fixtures/e2-q075-before-cast.json';
if(fs.existsSync(fixture))throw Error('q075 fixture already exists');
fs.writeFileSync(fixture,old);
let s=fs.readFileSync(source,'utf8');
const anchor=' if(q.number===76){';
if(s.includes('if(q.number===75&&cast)')||s.split(anchor).length!==2)throw Error('q075 source anchor changed');
s=s.replace(anchor,` if(q.number===75&&cast){
  x.entities.workersGroup.character='q075_workers';
  for(const scene of ['share','shared'])node(scene).cast=[{entity:'workersGroup',display:{x:50}}];
  node('shared').text='作業者が聖者のいる場所へ着き、人用の工具を揃えた。担当を引き継ぎ、聖者の稼働量を下げる。';
  node('registered').text='補給先を記した要求票を持って部品庫へ着いた。受領と登録を確かめ、次の補給先を共有する。';
 }
`+anchor);
fs.writeFileSync(source,s);
fs.appendFileSync('authoring/relocated-character-art.mjs',`\nrelocatedCharacters.q075_workers={id:'q075_workers',name:'修繕の作業者たち',role:'聖者の仕事を分担する作業者',detail:'作業所で引き受ける仕事と工具を相談し、合意した作業を現地で引き継ぐ。部品の補給や要求票の登録とは別の対応。',provenance:'2026-11-16。整備側原稿と現行本文・既存workersGroupの実同行に基づく呼称表示。個々の氏名・人数・容貌・専用画や依頼人セリとの同一性を追加しない。'};\n`);
execFileSync(process.execPath,['tools/build-scenario-editions.mjs'],{stdio:'inherit'});
const q=JSON.parse(fs.readFileSync('data/scenario-editions/e2/q075.json','utf8'));
const review={sourceSha256:sha(JSON.stringify(q)),identityNotes:[
 '整備側原稿authoring/quests.txtとstructures-4.mjsのQ(75)、初版3場面・現行7場面・7旅程・11行動・4結末を精読。機械聖者が求めた部品補給を賃金と誤訳した問題であり、同番号の別原稿と混同しない。',
 '既存workersGroupを作業所shareと実同行後のsharedにだけ呼称表示する。依頼人セリとの同一性、作業者の人数・個人像、機械聖者の人物画、部品庫の受付人・翻訳者の新規同席を推測しない。',
 '要求票requestSheetはentry_gearの出発時に隊が携行し、registeredのfinishで部品庫へ渡す。歯車gearPartはparts_deliverの出発時に携行、実到着時に補給する。作業分担workSharedはsharedのfinishで確定し、部品補給suppliedや登録translatedを代用しない。',
 '既存の全行動・registry・物語改訂1・4結末・報酬・旧受注を保持する。sharedとregisteredの2本文だけを既存の確定時点へ合わせる。表示途中の旧本文と選択肢はそのまま保持し、保存の書換えは行わない。'
],relatedClients:{},people:{q075_workers:{label:'修繕の作業者たち',status:'connected',entity:'workersGroup',need:'作業所と実同行後の現地の2場面にgroupとして表示。個人像・専用画は追加しない。'}},scenes:{
 entry:{decision:'no-person-evidence',people:[],evidence:'聖者は給付票を差し出し',reason:'描写は機械聖者の動作。作業者の初期所在はworkersであり、依頼人セリの同席根拠はない。',visual:'給付票と欠けた歯車を扱い、人間の作業者を先に配置しない。'},
 parts:{decision:'no-person-evidence',people:[],evidence:'倉に必要な歯車はあるが',reason:'要求の誤訳と部品の在庫を照合する場面。受付の人物やセリが同席する記述はない。',visual:'要求票は隊、歯車は部品庫にある。作業者は作業所に残る。'},
 running:{decision:'no-person-evidence',people:[],evidence:'聖者が動いた。',reason:'隊が歯車を実際に届け、機械が稼働した場面。人間の同行は存在しない。',visual:'部品補給は済んだが要求票の翻訳登録は未完了。'},
 share:{decision:'person-evidence',people:['q075_workers'],evidence:'引き受ける作業と人手を相談し',reason:'既存workersGroupはこの作業所にいて、次の旅程で初めて同行する。相談相手と現地の引継ぎを同時にしない。',visual:'工具と仕事の分担を相談する作業者の呼称のみを示す。'},
 shared:{decision:'person-evidence',people:['q075_workers'],evidence:'作業者が聖者のいる場所へ着き',reason:'share_escortの実同行により現地へ到着した同じgroup。作業引継ぎと完了はfinishで確定する。',visual:'作業者の到着を表示し、歯車納入済みと取り違えない。'},
 translated:{decision:'no-person-evidence',people:[],evidence:'原本を部品庫へ届ける。',reason:'要求票の部品名と補給先を整理する窓口。個別の翻訳者の発言・同席の記述はない。',visual:'要求票の原本を隊が保持していることと、登録の未完了を区別する。'},
 registered:{decision:'no-person-evidence',people:[],evidence:'要求票を持って部品庫へ着いた。',reason:'部品庫への持込みと受領登録を区別する。窓口の担当者は本文で特定されない。',visual:'原本はfinishまで隊が保持する。登録が済んだ本文を先取りしない。'}
},next:'人物の実同行、歯車の実到着時補給、要求票のfinish受渡しと作業分担、全5経路・4結末、新旧保存・旧受注、戦闘敗北後再開を検証する。次はq076「子守歌の空調」。'};
// Resolve the next title from distribution data rather than guessing it.
review.next=review.next.replace('子守歌の空調',JSON.parse(fs.readFileSync('data/scenario-editions/e2/q076.json','utf8')).title);
const audit='authoring/relocated-cast-review.mjs';s=fs.readFileSync(audit,'utf8');if(s.includes('  q075:'))throw Error('q075 audit exists');
s=s.replace(' quests:{',' quests:{\n  q075:'+JSON.stringify(review,null,2)+',');fs.writeFileSync(audit,s);
const test='tests/relocated-cast-audit.test.mjs';s=fs.readFileSync(test,'utf8');
const before={quests:100,scenes:753,emptyCastScenes:289,personEntities:149,characterLinkedEntities:140,reviewedQuests:84,reviewedScenes:645,noPersonEvidenceScenes:180,personEvidenceScenes:465,candidateRoles:1,connectedRoles:187,unreviewedScenes:108};
const after={...before,emptyCastScenes:287,reviewedQuests:85,reviewedScenes:652,noPersonEvidenceScenes:185,personEvidenceScenes:467,connectedRoles:188,unreviewedScenes:101};
if(!s.includes(JSON.stringify(before)))throw Error('audit baseline changed');
fs.writeFileSync(test,s.replace(JSON.stringify(before),JSON.stringify(after)));
execFileSync(process.execPath,['tools/audit-relocated-cast.mjs'],{stdio:'inherit'});
console.log('q075 source, preserved baseline and editorial audit generated');
