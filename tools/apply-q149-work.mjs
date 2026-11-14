import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const hash=x=>createHash('sha256').update(x).digest('hex');
const expected={
 'authoring/editions/e2/salome/library-second.mjs':'cbe89b8872ea1a04a8dccde635d321b79da2dfa343d288c0b722027ae7a3acdc',
 'tools/build-library-second-quests.mjs':'69070333a9b78d192188e82e81fc5610625c287b46caae7bdc880dd6e118c379',
 'authoring/relocated-character-art.mjs':'766271d7ac573f1feea70bbd6552b3ae4274714431a9a797cc03a9de1220bb86',
 'authoring/relocated-cast-review.mjs':'b6436702ecbc28f99461df916b6d379d6ce8b0d1a82eeb178d525c52ca9d8655',
 'tests/relocated-cast-audit.test.mjs':'84eed70abb69dfb23bd4aa2f6a84a5cf0b7e6095cff5b8243515ae7781282f5b',
 'data/scenario-editions/e2/q149.json':'ebaa26fd9a55da2402711b612a512f98ccaf2f33fa74a172f3a042ec5edb3a9d'
};
for(const [p,h] of Object.entries(expected))if(hash(fs.readFileSync(p))!==h)throw Error('Source changed: '+p);
const read=p=>fs.readFileSync(p,'utf8');
const write=(p,s)=>fs.writeFileSync(p,s);
const patch=(p,a,b)=>{const s=read(p);if(!s.includes(a))throw Error('Missing anchor in '+p);write(p,s.replace(a,b));};
const fixture='tests/fixtures/e2-q149-before-cast.json';
if(fs.existsSync(fixture))throw Error('Previous fixture already exists');
fs.copyFileSync('data/scenario-editions/e2/q149.json',fixture);
patch('authoring/editions/e2/salome/library-second.mjs',' if(q.number===150){',` if(q.number===149&&cast){
  entity('smithPerson','smith','person');
  for(const id of ['farmer','collector','smithPerson'])x.entities[id].character='q149_'+id;
  const casts={auction:['farmer'],user:['farmer','smithPerson'],sold:['farmer','collector'],delivered:['farmer']};
  const display=people=>people.map((entity,i)=>({entity,display:{x:people.length===2?[31,69][i]:50}}));
  for(const [scene,people] of Object.entries(casts))node(scene).cast=display(people);
  choice('user','pay').readyCast=display(['farmer','smithPerson']);
  node('entry').text='競売へ運ぶ剣を相談卓で確かめた。試持ちの性質は、客が触れる前に会場で説明する。';
  node('delivered').text='農夫と庭へ着いた。製作費の支払を確かめ、隊が預かる道具を渡す。農夫は鍬として使うつもりだ。';
  node('withdrawn').text='剣を預かったまま保管窓口へ着いた。競売の取下げを届けて返却し、損失を精算する。貸出費用の相談はその後に残る。';
 }
 if(q.number===150){`);
patch('tools/build-library-second-quests.mjs','  quests.push(quest);',`  if(n===149){
   const previous=compileRelocatedQuest(first,source(first,{cast:false}),options).story;
   // The added person must not broaden the old sword/actor holder domains.
   for(const [key,entry] of Object.entries(previous.registry))quest.story.registry[key]=structuredClone(entry);
   quest.story.registry.smithPersonAt.values=['smith'];
   quest.story.revision=2;quest.model.edition.revision=2;
   quest.model.storyUpgrades=[{fromRevision:1,toRevision:2,previous,values:[{key:'smithPersonAt',value:'smith'}]}];
  }
  quests.push(quest);`);
write('authoring/relocated-character-art.mjs',read('authoring/relocated-character-art.mjs')+`
for(const [id,name,role,detail] of [
 ['farmer','鍬を使いたい農夫','剣を生活の道具として使いたい客','競売会場から工房へ同行して製作費を相談する。支払後は庭へ、販売へ戻る場合は競売会場へ同行し、取下げの保管窓口へは同行しない。'],
 ['collector','剣の収集家','性質を説明された購入希望者','競売会場に留まり、性質を承知した購入意思を示す。農夫の工房や庭、取下げ品の保管窓口には来ない。'],
 ['smithPerson','剣を作った鍛冶師','製作費と道具の使い道を相談する作り手','工房で製作費の残り40Gについて答え、道具が実際に使われることを望む。結末での後日の訪問を現在の庭への同行と混同しない。']
])relocatedCharacters['q149_'+id]={id:'q149_'+id,name,role,detail,provenance:'2026-11-14。GQ049・初版・現行の発言、初期所在、既存同行に基づく呼称表示。固有名・性別・容貌・専用画を追加せず、武具商を依頼人欄だけから現場へ補わない。'};
`);
execFileSync(process.execPath,['tools/build-scenario-editions.mjs'],{stdio:'inherit'});
const q=JSON.parse(read('data/scenario-editions/e2/q149.json'));
const people={
 q149_farmer:{label:'鍬を使いたい農夫',status:'connected',entity:'farmer',need:'競売、工房、支払後の準備、販売へ戻った席、本人の庭に既存所在・同行で表示。'},
 q149_collector:{label:'剣の収集家',status:'connected',entity:'collector',need:'購入意思を確認するsoldのみ。工房や庭へ同行させない。'},
 q149_smithPerson:{label:'剣を作った鍛冶師',status:'connected',entity:'smithPerson',need:'発言する工房と同じ場所の支払済み準備だけ。smithに固定。'}
};
const evidence={
 entry:['競売へ運ぶ剣を相談卓で確かめた。','相談卓では剣を確かめる。依頼人欄から武具商や鍛冶師の同席を推定しない。剣の携行はcarryの出発時。'],
 auction:['客が握ると鍬になった。','農夫の初期所在auctionと次の実同行を根拠に試持ちの客として表示する。収集家の購入意思は後のsoldで扱う。'],
 user:['鍛冶師は製作費の一部を減らし','農夫が競売から工房へ実同行し、鍛冶師がその場で費用を答える。鍛冶師は工房に固定する。'],
 sold:['収集家の購入意思を確かめて渡す。','収集家が購入相手。農夫は直接経路では競売に留まり、工房経由では実同行して競売へ戻る。剣はfinishまで隊の保持。'],
 delivered:['農夫と庭へ着いた。','支払済みの農夫だけが庭へ同行する。鍛冶師が後日道具を測る結末の言及は現場への同席・同行にしない。'],
 withdrawn:['剣を預かったまま保管窓口へ着いた。','隊だけの旅程で保管窓口へ来る。農夫は選択元の競売または工房に残り、剣はfinishまで隊が保持。'],
 user_pay_ready:['ここから目的地まで運ぶ。','40G支払後も農夫と鍛冶師は工房にいる。自動生成される準備場面へreadyCastで接続し、出発・到着とは別に扱う。']
};
const review={sourceSha256:hash(JSON.stringify(q)),identityNotes:[
 '原稿volume-05のGQ049・初版2場面・現行7場面・6旅程・11行動・3結末を精読。剣を触る前の性質の説明を保持し、人物の望みをプレイヤーの内心の推測へ拡張しない。',
 '農夫と収集家の既存personへ接続し、本文で答える鍛冶師を工房に固定して追加する。農夫の既存同行以外を増やさず、武具商や原稿だけの別の客を現行場面へ追加しない。',
 '40G支払は工房のuser_payで一度確定し、移動と道具の引渡しを別にする。剣はcarry出発から各finishまで隊が保持する。入口・庭・保管窓口の3本文だけを既存の確定時点へ合わせる。',
 '物語改訂1→2で旧保存全体を旧定義に照合後、smithPersonAt=smithのみ補う。既存の保持者定義域・全行動・報酬・旧受注・表示途中の本文と選択肢を保持する。'
],relatedClients:{},people,scenes:Object.fromEntries(Object.entries(q.story.scenes).map(([id,s])=>[id,{decision:s.cast.length?'person-evidence':'no-person-evidence',people:s.cast.map(c=>q.story.entities[c.entity].character),evidence:evidence[id][0],reason:evidence[id][1],visual:'氏名や外見の補作をせず、実所在と受渡し前後を区別する。'}])),next:'新旧保存の全7場面・6旅程・11行動、5経路・3結末、40G不足と支払済み再開、途中帰還・敗北、旧受注、原子的拒否と実画面を検証する。次はq150「大道芸人の弟子」。'};
patch('authoring/relocated-cast-review.mjs',' quests:{',' quests:{\n  q149:'+JSON.stringify(review,null,2).replaceAll('\n','\n  ')+',');
const oldSummary=JSON.parse(read('doc/scenarios/RELOCATED_CAST_AUDIT.json')).summary;
const newSummary={...oldSummary,emptyCastScenes:308,personEntities:145,characterLinkedEntities:131,reviewedQuests:79,reviewedScenes:607,noPersonEvidenceScenes:161,personEvidenceScenes:446,connectedRoles:178,unreviewedScenes:146};
patch('tests/relocated-cast-audit.test.mjs',JSON.stringify(oldSummary),JSON.stringify(newSummary));
execFileSync(process.execPath,['tools/audit-relocated-cast.mjs'],{stdio:'inherit'});
// Reuse the existing verified migration/save helpers, with this quest's paths.
let f=read('tools/flower-delivery-art-fixtures.mjs').replaceAll('147','149').replaceAll('flowerDelivery','unsoldSword').replaceAll('recipientAt','smithPersonAt').replaceAll("'receiver'","'smith'");
f=f.replace("id!=='q149_recipient'","!['q149_farmer','q149_collector','q149_smithPerson'].includes(id)");
f=f.replace(/export const q149Routes=\[[\s\S]*?\n\];/,`export const q149Routes=[
 {path:['carry','collector','finish'],accepted:['collector'],outcome:'collector',fee:0},
 {path:['carry','withdraw','finish'],accepted:['withdraw'],outcome:'withdraw',fee:0},
 {path:['carry','user','pay','continue','finish'],accepted:['user','pay'],outcome:'user',fee:40},
 {path:['carry','user','collector','finish'],accepted:['user','collector'],outcome:'collector',fee:0},
 {path:['carry','user','withdraw','finish'],accepted:['user','withdraw'],outcome:'withdraw',fee:0}
];`);
f=f.replace(/export const q149Cast=.*?;/,`export const q149Cast=scene=>({entry:[],auction:['q149_farmer'],user:['q149_farmer','q149_smithPerson'],user_pay_ready:['q149_farmer','q149_smithPerson'],sold:['q149_farmer','q149_collector'],delivered:['q149_farmer'],withdrawn:[]})[scene];`);
f=f.replace(/const available=\{.*?\};/,"const available={entry:'carry',auction:'user',user:'pay',user_pay_ready:'continue',sold:'finish',delivered:'finish',withdrawn:'finish'};");
f=f.replace("s.values.deliveryMode","s.values.farmerAt+'-'+(s.values.costPaid?'paid':'unpaid')");
f=f.replace("const g=q149Engine({legacy});g.state.gold=29;", "const g=q149Engine({legacy});chooseQ149(g,'carry');chooseQ149(g,'user');g.state.gold=39;");
f=f.replace("scene:'entry',variant:generation+'-shortage',cast:[],textOnlyCast:[]", "scene:'user',variant:generation+'-shortage',cast:q149Cast('user'),textOnlyCast:q149Cast('user')");
f=f.replace("blockedChoice:'car',availableChoice:'water'","blockedChoice:'pay',availableChoice:'collector'");
f=f.replace("availableChoice:scene==='entry'?'water':'tomorrow'","availableChoice:scene==='entry'?'user':'collector'");
write('tools/unsold-sword-art-fixtures.mjs',f);
write('tools/browser-unsold-sword-cast-smoke.mjs',read('tools/browser-flower-delivery-cast-smoke.mjs').replaceAll('flowerDelivery','unsoldSword').replaceAll('flower-delivery','unsold-sword'));
let measure=read('tools/measure-scale-comparison.mjs').replaceAll('measureScaleComparison','measureUnsoldSword').replaceAll('q148','q149');
measure=measure.replace(/for\(const \[party,route,outcome\] of \[[\s\S]*?\n \]\)/,`for(const [party,route,outcome] of [
  ['balanced',['carry','collector','finish'],'collector'],
  ['explore',['carry','user','pay','continue','finish'],'user'],
  ['sustain',['carry','withdraw','finish'],'withdraw'],
  ['balanced',['carry','user','collector','finish'],'collector'],
  ['sustain',['carry','user','withdraw','finish'],'withdraw']
 ])`);
write('tools/measure-unsold-sword.mjs',measure);
console.log('q149 source, fixed prior definition, cast audit, fixtures and trial generator written.');
const section=`## q149「売らない剣」の実装・検証（2026-11-14）

q148のPR #248は実装先端018c24a6852f41bc9702592cd739ed4db54d0ad0の全8ワークフロー成功を確認し、master 80fc26de920fec86dc4032c11c54c0d469f0a45eへ統合した。

農夫・収集家・工房の鍛冶師を現行7場面のうち5場面へ呼称表示した。鍛冶師は工房に固定し、農夫だけが既存の経路に沿って同行する。取下げ品の保管窓口へ人物を補わない。剣の出発時携行とfinishでの受渡し、40Gの一回支払を維持し、入口・庭・保管窓口の3本文だけを処理の確定時点へ合わせた。

物語改訂1→2では旧保存全体を旧定義で検証した後にsmithPersonAt=smithだけを補う。既存の保持者定義域・6旅程・11行動・5経路・3結末・105G/75EXPと旧受注を保持する。表示途中の旧本文・選択肢も保持する。

専用10試験と監査7試験の計17件がローカルで成功（失敗0・スキップ0）。全場面・旅程・行動の新旧再開、40G不足と支払済み再開、途中帰還と敗北救助、全5経路の一回報酬、旧受注2場面・5経路、不正保存の原子的拒否を検証した。GitHubでの再検証・全体CI・実画面の結果はPRで確認する。

標準Lv5・現場開始・seed1907で3編成5経路を完走した。各80歩・2戦2勝、農夫への譲渡は240→350G、その他4経路は240→390G。敗北・逃走・救助0。乱数上書き・能力補正・強制回復なし。有限の5条件の観測であり全編成・全seedの保証ではない。再現はnode tools/measure-unsold-sword.mjs、詳細はdoc/development/Q149_PLAYTEST_RESULTS.json。

表示専用20保存点×Scene／Classic×1440／390px＝80画面条件を追加した。高レベル・遭遇抑制の表示fixtureと標準Lv5の通常攻略は別の検査。まだ実行していない実画面・全体CI・統合・公開を成功扱いしない。

出演監査79件・607場面（出演根拠あり446・同席根拠なし161）、未監査21件・146場面。q171の妻は別途未接続候補1役。次の未着手はq150「大道芸人の弟子」。

`;
for(const p of ['doc/HANDOFF.md','doc/CURRENT_STATUS.md','doc/development/PROGRESS.md']){
 const s=read(p),i=s.indexOf('\n');write(p,s.slice(0,i+1)+'\n'+section+s.slice(i+1));
}
for(const [p,text] of [
 ['doc/development/REMAINING_WORK.md','q149の人物表示・17局所試験・標準Lv5の3編成5経路を追加。全体CI・80画面条件・統合公開の結果はPRで確認する。出演監査79件・607場面、未監査21件・146場面。次はq150「大道芸人の弟子」。'],
 ['doc/development/TEST_OVERVIEW.md','q149はtests/unsold-sword-cast.test.mjsの10試験で全7場面・6旅程・11行動の新旧保存、5経路、40G不足、帰還・敗北、旧受注、不正保存の原子的拒否を検証する。tools/browser-unsold-sword-cast-smoke.mjsは20保存点・80画面条件。tools/measure-unsold-sword.mjsは標準Lv5・3編成5経路を再現する。表示fixtureと通常攻略を混同しない。']
]){const s=read(p),i=s.indexOf('\n');write(p,s.slice(0,i+1)+'\n## q149追記（2026-11-14）\n\n'+text+'\n'+s.slice(i+1));}
