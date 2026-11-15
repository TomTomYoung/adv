import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const hash=b=>createHash('sha256').update(b).digest('hex');
const expected={
 'authoring/editions/e2/salome/machine-first.mjs':'69955ed7a515e51906c6957e9ff0cd92f92d4c0fb84408f0a10840ed04beaf45',
 'tools/build-machine-quests.mjs':'6d48d335af175a1bc7328c463003c771d40d0109cb78f7b7c3909223da739d65',
 'authoring/relocated-character-art.mjs':'22cbb903d04e4882a6860f5c9a465fa1faf2e7c4e643d8b93bbd23ebcffe34e0',
 'authoring/relocated-cast-review.mjs':'174150d896cb918482524f2e0fd1828224feddc19112973ccb0ddc3c71c18a47',
 'tests/relocated-cast-audit.test.mjs':'8aebd848941040aad5f8b9f0f37cb0f44fd9cc5bb7860cd380973a076b13921a',
 'data/scenario-editions/e2/q073.json':'f6106fe4fa89f83edf48f2363ce7b4905a7f6fc3bd966da94be8581d2e20ba15'
};
for(const [p,h] of Object.entries(expected))assert.equal(hash(fs.readFileSync(p)),h,'Source changed: '+p);
const fixture='tests/fixtures/e2-q073-before-cast.json';assert.ok(!fs.existsSync(fixture));fs.copyFileSync('data/scenario-editions/e2/q073.json',fixture);
const replace=(p,from,to)=>{const s=fs.readFileSync(p,'utf8');assert.equal(s.split(from).length,2,'Unique anchor: '+p);fs.writeFileSync(p,s.replace(from,to));};
replace('authoring/editions/e2/salome/machine-first.mjs',' if(q.number===74){',` if(q.number===73&&cast){
  entity('artisanPerson','smith','person');x.entities.artisanPerson.character='q073_artisan';
  for(const scene of ['copy','brace','recovered','taken'])node(scene).cast=[{entity:'artisanPerson',display:{x:50}}];
  node('returned').text='複製と借りた原品を持って扉へ戻った。原品を元の位置へ据え、返却を確認して依頼を終える。';
  node('tested').text='腕を回収し、常設の支えの荷重確認位置へ来た。扉が開閉できることを試してから、腕を工房へ運ぶ。';
  node('recovered').text='支えと扉の試験結果を添え、回収した腕を持って工房へ戻った。職人への引渡しを確認して依頼を終える。';
  node('taken').text='三本の腕を持って工房へ着いた。職人へ渡す際、避難扉には人が支える番が必要になったと申し送る。通常の石段の帰路は塞がない。';
 }
 if(q.number===74){`);
replace('tools/build-machine-quests.mjs',"  if(n===171)quest.story.scenes.watch_ward_ready.cast=",`  if(n===73){
   const previous=compileRelocatedQuest(first,source(first,{cast:false}),options).story;
   for(const [key,entry] of Object.entries(previous.registry))quest.story.registry[key]=structuredClone(entry);
   quest.story.registry.artisanPersonAt.values=['smith'];
   quest.story.revision=2;quest.model.edition.revision=2;
   quest.model.storyUpgrades=[{fromRevision:1,toRevision:2,previous,values:[{key:'artisanPersonAt',value:'smith'}]}];
  }
  if(n===171)quest.story.scenes.watch_ward_ready.cast=`);
fs.appendFileSync('authoring/relocated-character-art.mjs',`\nrelocatedCharacters.q073_artisan={id:'q073_artisan',name:'腕と支えの職人',role:'複製と支えを製作する工房の職人',detail:'工房で借りた腕の複製と扉の支えを製作し、回収品の引渡しに立ち会う。避難扉や荷重試験の位置へは同行しない。',provenance:'2026-11-15。整備側原稿・初版・第2版の職人の動作と工房の所在に基づく呼称表示。依頼人リンとの同一性、容貌、専用画は追加しない。'};\n`);
execFileSync(process.execPath,['tools/build-scenario-editions.mjs'],{stdio:'inherit'});
const q=JSON.parse(fs.readFileSync('data/scenario-editions/e2/q073.json','utf8'));
const scene=(people,evidence,reason,visual)=>({decision:people.length?'person-evidence':'no-person-evidence',people,evidence,reason,visual});
const person=['q073_artisan'];
const review={sourceSha256:hash(JSON.stringify(q)),identityNotes:[
 '整備側原稿authoring/quests.txt・structures-4.mjsのQ(73)、初版3場面・現行8場面・9旅程・12行動・3結末を精読した。番号が同じ別原稿を出典にせず、依頼人リンと工房の職人を推測で同定しない。',
 '職人は複製と支えの工房smithに固定し、copy・brace・recovered・takenの4場面だけに表示する。全9旅程の同行者は空のまま、扉・荷重試験位置へ人物を足さない。',
 '支えの設置supportedは扉への実到着、荷重試験loadTestedはtestedから工房へ出発するときに確定する。原品arm・残る腕otherArms・複製copyArmの保持者を区別する。原品の返却と工房への引渡しはfinishでだけ確定する。',
 '物語改訂1→2は旧定義で保存全体を検証してからartisanPersonAt=smithだけを補う。既存の保持者定義域・全行動・報酬・旧受注を維持し、表示途中の旧本文・選択肢は保持する。returned・tested・recovered・takenの4本文だけを既存処理の確定時点へ合わせる。'
 ],relatedClients:{},people:{q073_artisan:{label:'腕と支えの職人',status:'connected',entity:'artisanPerson',need:'複製製作・支えの準備・二つの工房引渡しの4場面だけへ固定所在の呼称を表示する。'}},scenes:{
 entry:scene([],'一本を緩めると扉が少し下がった。','避難扉と三本の腕を確かめる場面。工房の職人や依頼人が同席する根拠はない。','原品と残る二本はentryにあり、まだ回収していない。'),
 support:scene([],'支えが荷重を受けた。','隊が扉で支えを据えた段階。職人は工房に残る。','supportedと未実施の荷重試験を区別する。'),
 copy:scene(person,'職人が借りた腕の複製を作った。','職人本人が工房で複製を製作する。借りた原品は隊の保持のまま。','複製はcopy_returnの出発時に受け取る。原品返却を先取りしない。'),
 brace:scene(person,'扉の荷重に合う支えを用意した。','腕の複製と支えを製作する同じ工房で準備する。職人の工房固定を使い、扉へ同行させない。','支えの準備と扉への到着後の設置を別に扱う。'),
 returned:scene([],'複製と借りた原品を持って扉へ戻った。','扉へ戻るのは隊だけ。原品返却に職人の同席は必要なく、同行もない。','finish前は原品・複製を隊が保持し、原品だけが返却される。'),
 tested:scene([],'常設の支えの荷重確認位置へ来た。','荷重確認へ来るのは隊のみ。職人は工房に固定する。','荷重を試してdeliverを選ぶまでloadTestedはfalse。'),
 recovered:scene(person,'職人への引渡しを確認して依頼を終える。','試験結果と回収品を工房の職人に渡す場面。','実到着だけでは腕を渡さず、finish時にsmithへ引き渡す。'),
 taken:scene(person,'職人へ渡す際、','支えを用意せず回収した三本を工房の職人に渡す場面。','避難扉の支障を申し送り、通常の石段の帰路は変更しない。')
 },next:'新旧保存・原品と複製の保持者・反復相談・全旅程の中断・3結末と一回報酬を検証する。次工程はq074「祈祷書の誤植」。'};
replace('authoring/relocated-cast-review.mjs',' quests:{\n',' quests:{\n  q073:'+JSON.stringify(review,null,2)+',\n');
const before={quests:100,scenes:753,emptyCastScenes:294,personEntities:147,characterLinkedEntities:138,reviewedQuests:82,reviewedScenes:630,noPersonEvidenceScenes:170,personEvidenceScenes:460,candidateRoles:1,connectedRoles:185,unreviewedScenes:123};
const after={...before,emptyCastScenes:290,personEntities:148,characterLinkedEntities:139,reviewedQuests:83,reviewedScenes:638,noPersonEvidenceScenes:174,personEvidenceScenes:464,connectedRoles:186,unreviewedScenes:115};
replace('tests/relocated-cast-audit.test.mjs',JSON.stringify(before),JSON.stringify(after));
execFileSync(process.execPath,['tools/audit-relocated-cast.mjs'],{stdio:'inherit'});
console.log('q073 source and review generated; previous definition preserved.');
