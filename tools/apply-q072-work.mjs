import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const sha=s=>createHash('sha256').update(s).digest('hex');
const expected={
 'authoring/editions/e2/salome/machine-first.mjs':'3bce7bf4ce49fcbdf52460c2b9c9d8684688ae422079a24a4ad82c6c4d1515d6',
 'tools/build-machine-quests.mjs':'c347732873a1e08bebc2fff269bd787d9ff9773f77db34e9cb3e109d07bda47b',
 'authoring/relocated-character-art.mjs':'3361401229339d404eb1125aebccc4305d7dd3d46ee55840476434979122f701',
 'authoring/relocated-cast-review.mjs':'aed56bca29f8036ebc6ec224b672d92abb46623b8c59eda4858d3e356b3017f7',
 'tests/relocated-cast-audit.test.mjs':'1daa9f64fb33d4d32e0215a9f33395747bb11c7a4283a1ebba8e51d473fabc16',
 'data/scenario-editions/e2/q072.json':'6f1b92836b925527fbb33c8660487eddf0ee4d1effa6f4cff16ba5c12eec23be'
};
function replace(file,from,to){const s=fs.readFileSync(file,'utf8');if(!s.includes(from))throw Error('Missing anchor: '+file);fs.writeFileSync(file,s.replace(from,to));}
if(process.argv.includes('--record')){
 const rows=JSON.parse(fs.readFileSync('doc/development/Q072_PLAYTEST_RESULTS.json','utf8'));
 if(rows.length!==5||rows.some(r=>r.status!=='cleared'))throw Error('Normal trial results incomplete');
 const summary='q072「油の洗礼」の原稿・初版3場面・現行5場面を出演監査へ登録した。油工房の職人と祈祷師をoilの1場面だけへ呼称表示し、全6旅程の同行者は空のまま。依頼人イオとの同一性・外見・専用画は追加しない。';
 const state='物語改訂1→2では旧定義で保存全体を検証後、職人と祈祷師の所在oilshopを補う。先に温めた場合に見本が入口へ残って交換相談が選べない既存不具合を修復し、entry_heat出発時の見本携行を明記した。旧保存はentry_heatの移動中または完了履歴があり見本がentryにある場合だけpartyへ補正する。旧定義での全体検証を先に行い、他経路や旧受注は変えない。既存の油の保持者定義域・9行動・3結末・報酬は保持した。entry・changed・discardedの3本文をfinish前の状態へ合わせ、旧保存の表示途中の文章と選択肢は保持する。交換・封止は到着ではなくfinishで確定する。';
 const checks='専用11試験と出演監査7試験、既存q072回帰2試験の計20件が成功した。初回に温めた後の交換相談不能と未監査例q072の固定参照を検出し、修正して再検証した。現行と旧開始保存からの移行で各14経路、全5場面・6旅程・9行動の保存再開、再相談2往復、全旅程の帰還印・敗北救助、二種類の油の保持者、旧受注3場面・6経路、不正保存の原子的拒否と一回報酬を検証した。';
 const trials='標準Lv8・現場開始・seed1907で3編成5経路を通常攻略した。結果は[Q072_PLAYTEST_RESULTS.json](development/Q072_PLAYTEST_RESULTS.json)に保存し、`node tools/measure-oil-baptism.mjs`で再現できる。能力補正・乱数上書き・強制回復は使用しない。有限5条件の観測であり全編成・全seedの保証ではない。';
 const pending='表示fixtureは現行・旧保存・旧受注の18保存点をScene／Classic×1440／390pxの72条件で検査する。高レベル・遭遇抑制の表示検査は通常攻略と区別する。全体CI・実画面・統合・公開の結果はPRで別途確認し、未完了を成功扱いしない。';
 const next='出演監査82件・630場面、未監査18件・123場面。q171の妻は別途未接続候補1役のまま。次工程はq073「天使の予備腕」で、出演監査と人物表示は未着手。';
 const prior='2026-11-15：PR #251の全11ワークフロー成功を確認し、master `54788902c71f38226e01ecfad6ed5e77cfc4c15d`へ統合した。';
 for(const file of ['doc/HANDOFF.md','doc/CURRENT_STATUS.md','doc/development/PROGRESS.md','doc/development/REMAINING_WORK.md','doc/development/TEST_OVERVIEW.md']){
  const s=fs.readFileSync(file,'utf8'),i=s.indexOf('\n');
  if(s.includes('## q072 油の洗礼 — 2026-11-15'))throw Error('Already recorded '+file);
  const body=[prior,summary,state,checks,trials,pending,next].join('\n\n').replaceAll('(development/Q072_PLAYTEST_RESULTS.json)',file.includes('/development/')?'(Q072_PLAYTEST_RESULTS.json)':'(development/Q072_PLAYTEST_RESULTS.json)');
  fs.writeFileSync(file,s.slice(0,i+1)+'\n## q072 油の洗礼 — 2026-11-15\n\n'+body+'\n'+s.slice(i+1));
 }
 console.log('Recorded tested q072 implementation, trials and pending CI.');
}else{
 for(const [p,h] of Object.entries(expected))if(sha(fs.readFileSync(p))!==h)throw Error('Source changed: '+p);
 const fixture='tests/fixtures/e2-q072-before-cast.json';if(fs.existsSync(fixture))throw Error('Existing fixture');
 fs.copyFileSync('data/scenario-editions/e2/q072.json',fixture);
 replace('authoring/editions/e2/salome/machine-first.mjs',' if(q.number===73){',` if(q.number===72&&cast){
  for(const [id,character] of [['artisanPerson','q072_artisan'],['priestPerson','q072_priest']]){
   entity(id,'oilshop','person');x.entities[id].character=character;
  }
  node('entry').text+=' 温める試験へ向かう際も、現用油の見本は持っていく。';
  choice('entry','heat').depart=[give('oilSample','entry','party')];
  node('oil').cast=[{entity:'artisanPerson',display:{x:31}},{entity:'priestPerson',display:{x:69}}];
  node('changed').text='下層用の油を持って冷えた試験台へ戻った。交換して同じ温度で動作を試し、祈祷の記録と整備の合否を分けて記す。';
  node('discarded').text='現用油を持って回収槽へ着いた。携行油へは混ぜず、槽へ封止して再稼働までの手動の鐘当番を確認する。';
 }
 if(q.number===73){`);
 replace('tools/build-machine-quests.mjs','  if(n===171)',`  if(n===72){
   const previous=compileRelocatedQuest(first,source(first,{cast:false}),options).story;
   for(const [key,entry] of Object.entries(previous.registry))quest.story.registry[key]=structuredClone(entry);
   for(const key of ['artisanPersonAt','priestPersonAt'])quest.story.registry[key].values=['oilshop'];
   quest.story.revision=2;quest.model.edition.revision=2;
   quest.model.storyUpgrades=[{fromRevision:1,toRevision:2,previous,values:[
    {key:'artisanPersonAt',value:'oilshop'},{key:'priestPersonAt',value:'oilshop'},
    {key:'oilSampleAt',value:'party',when:and(eq(ref('stories.q072.values.oilSampleAt'),'entry'),{op:'or',args:[
     {op:'in',left:'entry_heat',right:ref('stories.q072.events')},
     and(eq(ref('journey.quest'),'q072'),eq(ref('journey.action'),'entry_heat'))
    ]})}
   ]}];
  }
  if(n===171)`);
 fs.appendFileSync('authoring/relocated-character-art.mjs',`\nfor(const [id,name,role] of [
 ['artisan','油工房の職人','下層の温度に適した油を用意する職人'],
 ['priest','工房で話す祈祷師','儀式を続けたいという希望を工房で伝える祈祷師']
])relocatedCharacters['q072_'+id]={id:'q072_'+id,name,role,detail:'油の工房oilshopに固定し、温める試験台や交換・封止の現場へ同行させない。',provenance:'2026-11-15。整備側原稿と現行oilの明示的な発言に基づく呼称表示。依頼人イオとの同一性・氏名・容貌・専用画を追加しない。'};\n`);
 execFileSync('node',['tools/build-scenario-editions.mjs'],{stdio:'inherit'});
 const q=JSON.parse(fs.readFileSync('data/scenario-editions/e2/q072.json','utf8'));
 const scene=(people,evidence,reason,visual)=>({decision:people.length?'person-evidence':'no-person-evidence',people,evidence,reason,visual});
 const review={sourceSha256:sha(JSON.stringify(q)),identityNotes:[
  '整備側原稿authoring/quests.txtとstructures-4.mjsのQ(72)、初版3場面・現行5場面・6旅程・9行動・3結末を精読した。参照原稿の同番号だけで別題を出典にしない。',
  '職人と祈祷師はoilで明示的に発言する二役として油工房に固定する。依頼人イオと祈祷師の同一性は断定せず、全旅程の同行者を空のまま維持する。',
  '温める処置heatedと下層用油への交換oilChanged、儀式と合否の分離ritualSeparated、現用油の封止discardedを分ける。再相談の往復で油を重複取得しない。現用油と下層用油の保持者は別に保存する。',
  '二役の所在を物語改訂1から2へ補い、旧registryの既存定義域を保存する。先に温めた場合に見本が入口に残って交換相談が選べない既存不具合を修復し、entry_heatの出発時に見本を携行する。旧保存はentry_heatの履歴または移動中を検証してから、entryに残った見本だけpartyへ補正する。entry・changed・discardedの3本文を受渡し前へ修正し、entry_heatの携行以外の既存行動・報酬・旧受注と保存中の待機本文は保持する。'
 ],relatedClients:{},people:{
  q072_artisan:{label:'油工房の職人',status:'connected',entity:'artisanPerson',need:'油工房oilの発言場面だけへ呼称表示する。'},
  q072_priest:{label:'工房で話す祈祷師',status:'connected',entity:'priestPerson',need:'油工房oilの発言場面だけへ呼称表示し、他の場所へ同行させない。'}
 },scenes:{
  entry:scene([],'寒い下層のものだけ震える。','機械の比較観察で、依頼人や職人の同席は書かれていない。','温度差の情報と特定人物の同席を混同しない。'),
  warm:scene([],'祈祷は追加していない。','機械を温めた結果の観察で、工房の二人が移動する記述はない。','暖房の処置と交換・儀式を別に表示する。'),
  oil:scene(['q072_artisan','q072_priest'],'職人は下層用の油を用意した。祈祷師は儀式も続けたいと話す。','用意した職人と希望を話す祈祷師が工房に実在する。','二役のみ表示し、下層用油はseparate出発まで工房が保持する。'),
  changed:scene([],'下層用の油を持って冷えた試験台へ戻った。','隊だけが工房から移動した。職人・祈祷師の同行根拠はない。','到着時は隊が油を保持し、交換と記録はfinishで確定する。'),
  discarded:scene([],'現用油を持って回収槽へ着いた。','隊だけが現用油を運ぶ。鐘当番や依頼人の同席を推測で補わない。','現用油はfinishまで隊の保持物で、携行燃料と混ぜない。')
 },next:'全5場面・6旅程・9行動の新旧保存、再相談の反復、油の保持者、帰還・敗北再開、全3結末と旧受注を検証する。次はq073。'};
 replace('authoring/relocated-cast-review.mjs',' quests:{\n',' quests:{\n  q072:'+JSON.stringify(review,null,2)+',\n');
 replace('tests/relocated-cast-audit.test.mjs',"assert.equal(report.quests.find(q=>q.id==='q072').scenes[0].review,null);","assert.ok(report.quests.some(q=>!q.review&&q.scenes.every(s=>s.review===null)));\n const oil=report.quests.find(q=>q.id==='q072');assert.deepEqual(oil.scenes.filter(s=>s.cast.length).map(s=>s.id),['oil']);assert.equal(oil.scenes.find(s=>s.id==='oil').cast.length,2);");
 const before={quests:100,scenes:753,emptyCastScenes:295,personEntities:145,characterLinkedEntities:136,reviewedQuests:81,reviewedScenes:625,noPersonEvidenceScenes:166,personEvidenceScenes:459,candidateRoles:1,connectedRoles:183,unreviewedScenes:128};
 const after={...before,emptyCastScenes:294,personEntities:147,characterLinkedEntities:138,reviewedQuests:82,reviewedScenes:630,noPersonEvidenceScenes:170,personEvidenceScenes:460,connectedRoles:185,unreviewedScenes:123};
 replace('tests/relocated-cast-audit.test.mjs',JSON.stringify(before),JSON.stringify(after));
 execFileSync('node',['tools/audit-relocated-cast.mjs'],{stdio:'inherit'});
 console.log('q072 authoring generated; old definition preserved verbatim.');
}
