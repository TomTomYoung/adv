import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const hashes={
 'authoring/editions/e2/oddland/observatory-first.mjs':'ac462d729cf0123a40eeafda6a14315c22cc8cd48ce861a493d86698e9928a84',
 'tools/build-observatory-quests.mjs':'9517e463f7da9257ca5f741a9793cf60fcad894d87cb4dfa046959c2eb9e353c',
 'authoring/relocated-character-art.mjs':'ffe8b5548a50e9529b40c3956d56d6651bcd80856889843c0778ce134bee3361',
 'authoring/relocated-cast-review.mjs':'087ef5032c68edd1a4f050627c687d0db7f392cff1657969093eedc2038a1de9',
 'tests/relocated-cast-audit.test.mjs':'0b58205bde572115bf2a99b57f72ace236220e166b790c244403006c5cf1706d',
 'data/scenario-editions/e2/q081.json':'a21ede5b3b2cd87ea5a270306174512f4f98f786e0f2f1d3473ce4af741c972e'
};
const sha=x=>createHash('sha256').update(x).digest('hex');
for(const [p,h] of Object.entries(hashes))assert.equal(sha(fs.readFileSync(p)),h,p+' source changed');
const old=fs.readFileSync('data/scenario-editions/e2/q081.json');
const fixture='tests/fixtures/e2-q081-before-cast.json';assert.ok(!fs.existsSync(fixture));fs.writeFileSync(fixture,old);
function edit(p,from,to){const text=fs.readFileSync(p,'utf8');assert.equal(text.split(from).length,2,p+' unique edit anchor');fs.writeFileSync(p,text.replace(from,to));}
const source='authoring/editions/e2/oddland/observatory-first.mjs';
edit(source,'export function observatoryFirstSource(q){','export function observatoryFirstSource(q,{cast=true}={}){');
edit(source,' if(q.number===82){',` if(q.number===81&&cast){
  entity('evacuatedGroup','refuge','group');
  x.entities.evacuatedGroup.character='q081_evacuated';
  node('correction').cast=[{entity:'evacuatedGroup',display:{x:50}}];
  node('posted').text='告知所へ着いた。上映と実際の天気を分けた訂正を、ここで掲示する。';
  node('observed').text='地上の観測台へ着いた。実際の空と延期した盤の記録を、これから照合する。';
 }
 if(q.number===82){`);
edit('tools/build-observatory-quests.mjs','  if(n===181){',`  if(n===81){
   const previous=compileRelocatedQuest(first,source(first,{cast:false}),options).story;
   for(const [key,entry] of Object.entries(previous.registry))quest.story.registry[key]=structuredClone(entry);
   quest.story.registry.evacuatedGroupAt.values=['refuge'];
   quest.story.revision=2;quest.model.edition.revision=2;
   quest.model.storyUpgrades=[{fromRevision:1,toRevision:2,previous,values:[{key:'evacuatedGroupAt',value:'refuge'}]}];
  }
  if(n===181){`);
fs.appendFileSync('authoring/relocated-character-art.mjs',"\nrelocatedCharacters.q081_evacuated={id:'q081_evacuated',name:'高台の避難者たち',role:'星の落下予報を受けて避難した人々',detail:'高台で天井の上映と実際の天気の違いを聞く。告知所や再観測の場所へは同行しない。',provenance:'2026-11-16。correctionの説明相手とrefugeの既存場所名に基づく集団の呼称表示。人数・氏名・容貌・専用画、依頼人シオや結末の子供との同一性は追加しない。'};\n");
// Spawn a fresh process so the edited source is read after the edits.
execFileSync(process.execPath,['tools/build-scenario-editions.mjs'],{stdio:'inherit'});
const q=JSON.parse(fs.readFileSync('data/scenario-editions/e2/q081.json','utf8'));
const review={
 sourceSha256:sha(JSON.stringify(q)),
 identityNotes:[
  '原稿authoring/quests.txt・structures-5.mjsのQ(81)、初版2場面・現行5場面を精読。試写される星は観覧席の天井の投影であり、実際の空の天候や地形の変化ではない。',
  'correctionで訂正を聞く相手は、既存refugeの場所名が明記する避難した人々。集団として高台に固定し、その1場面だけに呼称表示する。依頼人シオや結末の上映を見る子供を現場へ同席させず、全4旅程の同行者を空のままにする。',
  '高台での説明と、別々の告知を掲示し終えるcorrectedを分ける。correctedはpostedのfinish。延期delayedは地上へ向かう出発時、再観測observedはobservedのfinish。延期を実時間の待機や天候変更にしない。',
  '物語改訂1→2は旧定義で保存全体を検証してから避難者の固定所在refugeだけを補う。既存registry・行動・結末・報酬と旧受注を保持する。posted・observedの2本文だけを完了操作前の状況へ明確化し、表示途中の旧本文・選択肢を保持する。',
  '予報盤の破壊は現行・旧受注とも非戦闘。原稿の番獣という旧表現から戦闘を追加せず、実際の天候記録まで失う結末を訂正や再観測の成功へ読み替えない。'
 ],relatedClients:{},people:{q081_evacuated:{label:'高台の避難者たち',status:'connected',entity:'evacuatedGroup',need:'高台で訂正説明を聞く集団だけを表示する。人数や個々の人物像を追加しない。'}},
 scenes:{
  entry:{decision:'no-person-evidence',people:[],evidence:'予報盤は観覧席の天井へ向き',reason:'装置の向きと予報の表示を確認する場面。シオや避難者の同席は記述されない。',visual:'上映予定と実際の雲の不一致を示し、人物を加えない。'},
  show:{decision:'no-person-evidence',people:[],evidence:'外の空に変化はない。',reason:'天井の試写による判別であり、観覧席があることだけから観客の同席を推測しない。',visual:'試写の落下と実際の天気を区別し、天候を変更しない。'},
  correction:{decision:'person-evidence',people:['q081_evacuated'],evidence:'天井の上映と実際の天気の違いを伝えた。',reason:'避難した人の待つ高台refugeへ来て、そこに待つ人々へ説明する本文。',visual:'高台の避難者だけを表示する。説明後も告知掲示の完了はまだ確定しない。'},
  posted:{decision:'no-person-evidence',people:[],evidence:'告知所へ着いた。',reason:'隊が訂正を掲示する場所。避難者や窓口担当者の同行・同席の記述はない。',visual:'correctedはfinishで確定する。高台の人物を持ち越さない。'},
  observed:{decision:'no-person-evidence',people:[],evidence:'地上の観測台へ着いた。',reason:'隊が再観測を行う場所。結末で記録を並べるシオをこの場へ推測で配置しない。',visual:'延期は出発時に確定し、観測の終了はfinishで確定する。'}
 },next:'固定所在、限定出演、全4経路、新旧保存・旧受注、説明と告知掲示、延期と再観測、帰還・敗北後再開と報酬一回性を検証する。次はq082「星売りの空瓶」。'
};
edit('authoring/relocated-cast-review.mjs',' quests:{\n',' quests:{\n  q081:'+JSON.stringify(review,null,2).replaceAll('\n','\n  ')+',\n');
execFileSync(process.execPath,['tools/audit-relocated-cast.mjs'],{stdio:'inherit'});
const summary=JSON.parse(fs.readFileSync('doc/scenarios/RELOCATED_CAST_AUDIT.json','utf8')).summary;
const auditTest='tests/relocated-cast-audit.test.mjs',t=fs.readFileSync(auditTest,'utf8');assert.match(t,/assert.deepEqual\(report.summary,\{[^\n]+\}\);/);
fs.writeFileSync(auditTest,t.replace(/assert.deepEqual\(report.summary,\{[^\n]+\}\);/,'assert.deepEqual(report.summary,'+JSON.stringify(summary)+');'));
console.log('Q081 PATCH APPLIED',summary);
