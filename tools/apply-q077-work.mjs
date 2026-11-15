import fs from 'node:fs';
import {createHash} from 'node:crypto';
const sha=x=>createHash('sha256').update(x).digest('hex');
const expected={
 "authoring/editions/e2/salome/machine-first.mjs": "5bdbe8daaab9b9784f155390f3fc6b6fdeeb5c75e82b74ff5c53950f48db2d0a",
 "tools/build-machine-quests.mjs": "b62e524623b52df98c2003a9b10570bd2186cea531bab6d2e1419254ddb2f6f4",
 "authoring/relocated-character-art.mjs": "efab5785b7b3df4f07389c1bcecfb71d351d4c69e30808be420072db7e21d24d",
 "authoring/relocated-cast-review.mjs": "3de4fa9db9a3c102d0166029799c3d798affb8cb5c07837b38be6157bfac26d5",
 "tests/relocated-cast-audit.test.mjs": "968e523e365ccaad9ea6c0448e4ffd63351f5698527720bf11a406aaced2a244",
 "data/scenario-editions/e2/q077.json": "95ad4803731b8a1c0e7a5272717d1da3934fcb0d0f7313c3413c09167235de72"
};
for(const [file,hash] of Object.entries(expected))if(sha(fs.readFileSync(file))!==hash)throw Error('Source changed: '+file);
const fixture='tests/fixtures/e2-q077-before-cast.json';
if(fs.existsSync(fixture))throw Error('Previous q077 fixture already exists');
fs.copyFileSync('data/scenario-editions/e2/q077.json',fixture);
function insert(file,anchor,text){const s=fs.readFileSync(file,'utf8');if(s.split(anchor).length!==2)throw Error('Ambiguous anchor: '+file);fs.writeFileSync(file,s.replace(anchor,text+anchor));}
insert('authoring/editions/e2/salome/machine-first.mjs',' if(q.number===78){', "\n if(q.number===77&&cast){\n  for(const [id,character] of [['pilgrimPerson','q077_pilgrim'],['maintainerPerson','q077_maintainer']]){\n   entity(id,'entry','person');x.entities[id].character=character;\n  }\n  node('entry').cast=[{entity:'pilgrimPerson',display:{x:50}}];\n  node('outage').cast=[{entity:'maintainerPerson',display:{x:50}}];\n  node('repaired').text='仮灯が診療室へ届いたことを確認し、給電を止めたまま放電壁へ戻った。ここで配線を絶縁し、壁を閉じて試験を終えてから通電を戻す。';\n  node('detoured').text='壁を柵で隔離し、給電が続く状態で別の巡礼路へ来た。入口へ戻る道を確かめ、案内札を立てて案内を終える。';\n }\n");
insert('tools/build-machine-quests.mjs','  if(n===171)', "\n  if(n===77){\n   const previous=compileRelocatedQuest(first,source(first,{cast:false}),options).story;\n   for(const [key,entry] of Object.entries(previous.registry))quest.story.registry[key]=structuredClone(entry);\n   for(const key of ['pilgrimPersonAt','maintainerPersonAt'])quest.story.registry[key].values=['entry'];\n   quest.story.revision=2;quest.model.edition.revision=2;\n   quest.model.storyUpgrades=[{fromRevision:1,toRevision:2,previous,values:[\n    {key:'pilgrimPersonAt',value:'entry'},{key:'maintainerPersonAt',value:'entry'}\n   ]}];\n  }\n");
fs.appendFileSync('authoring/relocated-character-art.mjs',"\nrelocatedCharacters.q077_pilgrim={id:'q077_pilgrim',name:'壁に触れた巡礼者',role:'放電跡の壁に触れた巡礼者',detail:'壁へ触れて手を引く。隊の診療室への運搬や迂回路の確認には同行しない。',provenance:'2026-11-16。原稿と現行entryの動作による呼称表示。氏名・年齢・性別・容貌・専用画を追加しない。'};\nrelocatedCharacters.q077_maintainer={id:'q077_maintainer',name:'仮灯を用意する保守員',role:'停電時の代替照明を準備する保守員',detail:'壁前で仮灯を用意する。仮灯を診療室へ運ぶのは隊で、保守員は同行者に追加しない。',provenance:'2026-11-16。現行outageの明示された準備動作に基づく呼称表示。依頼人イオと同一人物とはせず、外見・専用画を補わない。'};\n");
const review={
 "sourceSha256": "Q077_FINGERPRINT_PENDING",
 "identityNotes": [
  "整備側原稿authoring/quests.txt・structures-4.mjsのQ(77)、初版2場面・現行5場面・4旅程・8行動・3結末を精読。巡礼者が壁に触れて手を引く動作と、停電後に保守員が仮灯を用意する動作を別の出演根拠として扱う。",
  "巡礼者をentry、保守員をoutageだけに呼称表示する。どちらも壁前entryの固定所在で、同行者・人物画・依頼人イオとの同一性は追加しない。診療室の受領を新しい医療職員の人物描写に置換せず、前場面の出演を修理場面へ自動的に引き継がない。",
  "停電outageは壁前でのcutpower、仮灯lampsは出発時携行・診療室への実到着で受領する。repairedのfinishで配線修理と復電を確定し、到着だけで修理済みにしない。迂回は出発時に隔離と通電状態を確定し、detouredのfinishで帰路確認を完了する。",
  "物語改訂1→2は旧定義で保存全体を検証後、pilgrimPersonAt・maintainerPersonAtのentryだけを補う。既存registry・全行動・報酬・旧受注を保持し、repairedとdetouredの2本文だけを既存確定時点へ合わせる。表示途中の旧本文と選択肢は保持し、焦げ跡を削る非戦闘経路へ架空の戦闘を追加しない。"
 ],
 "relatedClients": {},
 "people": {
  "q077_pilgrim": {
   "label": "壁に触れた巡礼者",
   "status": "connected",
   "entity": "pilgrimPerson",
   "need": "壁へ触れて手を引くentryだけに呼称表示。同行や個人の容貌を追加しない。"
  },
  "q077_maintainer": {
   "label": "仮灯を用意する保守員",
   "status": "connected",
   "entity": "maintainerPerson",
   "need": "停電後のoutageだけに呼称表示。仮灯を運ぶのは隊であり、診療室へ同行しない。"
  }
 },
 "scenes": {
  "entry": {
   "decision": "person-evidence",
   "people": [
    "q077_pilgrim"
   ],
   "evidence": "壁へ触れた巡礼者が手を引いた。",
   "reason": "壁に触れて手を引く当人の動作が明記される。保守員の出演はまだ描写されていない。",
   "visual": "巡礼者だけを表示し、通電中の壁の焦げ跡を確認する。"
  },
  "outage": {
   "decision": "person-evidence",
   "people": [
    "q077_maintainer"
   ],
   "evidence": "保守員が仮灯を用意している。",
   "reason": "停電の影響を受けた診療室に備え、壁前で保守員が仮灯を用意する。先の巡礼者をこの場面の出演へ持ち越さない。",
   "visual": "仮灯はまだentryにある。隊がlampsを選んで出発するまで携行・納入を確定しない。"
  },
  "delivered": {
   "decision": "no-person-evidence",
   "people": [],
   "evidence": "壁の修理はこれから行う。",
   "reason": "仮灯の納入と手元の照明を確認する場面。受領者の個人描写はなく、保守員は同行しない。",
   "visual": "lampsAt=clinic・lampsDeliveredは実到着時に確定するが、停電と未修理は継続する。"
  },
  "repaired": {
   "decision": "no-person-evidence",
   "people": [],
   "evidence": "給電を止めたまま放電壁へ戻った。",
   "reason": "隊が配線と壁を修理する準備の場面。保守員や巡礼者の同席は明記されず、固定所在だけから出演を補わない。",
   "visual": "到着時はrepaired=false・outage=true。finishで絶縁・壁の修理と復電を確定する。"
  },
  "detoured": {
   "decision": "no-person-evidence",
   "people": [],
   "evidence": "別の巡礼路へ来た。",
   "reason": "隊が隔離した壁を避ける帰路を確認する。巡礼者をこの経路の同行者にしない。",
   "visual": "fenced=true・outage=falseは出発時に確定し、detourCheckedはfinishまでfalseのまま。"
  }
 },
 "next": "現行・旧保存・旧受注の全4経路、全4旅程の帰還・敗北救助、停電・仮灯の保持者・復電・迂回確認の順序、二役の限定出演と報酬一回性を検証する。次はq078「部品の記憶」。"
};
insert('authoring/relocated-cast-review.mjs','  q076:{','  q077:'+JSON.stringify(review,null,2)+',\n');
const path='tests/relocated-cast-audit.test.mjs',s=fs.readFileSync(path,'utf8'),before="{\"quests\":100,\"scenes\":753,\"emptyCastScenes\":287,\"personEntities\":149,\"characterLinkedEntities\":140,\"reviewedQuests\":86,\"reviewedScenes\":658,\"noPersonEvidenceScenes\":191,\"personEvidenceScenes\":467,\"candidateRoles\":1,\"connectedRoles\":188,\"unreviewedScenes\":95}",after="{\"quests\":100,\"scenes\":753,\"emptyCastScenes\":285,\"personEntities\":151,\"characterLinkedEntities\":142,\"reviewedQuests\":87,\"reviewedScenes\":663,\"noPersonEvidenceScenes\":194,\"personEvidenceScenes\":469,\"candidateRoles\":1,\"connectedRoles\":190,\"unreviewedScenes\":90}";
if(!s.includes(before))throw Error('Audit baseline changed');fs.writeFileSync(path,s.replace(before,after));
const {buildMachineQuests}=await import('./build-machine-quests.mjs');
await buildMachineQuests();
const quest=JSON.parse(fs.readFileSync('data/scenario-editions/e2/q077.json','utf8'));
const file='authoring/relocated-cast-review.mjs';fs.writeFileSync(file,fs.readFileSync(file,'utf8').replace('Q077_FINGERPRINT_PENDING',sha(JSON.stringify(quest))));
console.log('Applied q077 cast and exact previous state migration.');
