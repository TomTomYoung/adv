import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const src='authoring/editions/e2/oddland/observatory-first.mjs',builder='tools/build-observatory-quests.mjs';
const fixture='tests/fixtures/e2-q084-before-cast.json';
assert.ok(!fs.existsSync(fixture));fs.writeFileSync(fixture,fs.readFileSync('data/scenario-editions/e2/q084.json'));
function insert(path,anchor,addition){const s=fs.readFileSync(path,'utf8');assert.equal(s.split(anchor).length,2,path+' anchor');fs.writeFileSync(path,s.replace(anchor,addition+anchor));}
insert(src,' if(q.number===85){',` if(q.number===84&&cast){
  entity('familyGroup','family','group');
  for(const [entity,character] of [['familyGroup','q084_family'],['stretcherParty','q084_survivors'],['specialists','q084_specialists']])x.entities[entity].character=character;
  for(const scene of ['route_check','handoff','call_report','expert_arrived'])node(scene).cast=[{entity:'specialists',display:{x:50}}];
  node('reached').cast=[{entity:'stretcherParty',display:{x:50}}];
  node('recovered').cast=[{entity:'familyGroup',display:{x:50}}];
  node('recovered').text='反復する発信機を家族の待つ家へ運んだ。機械は隊が保持しており、本人の行方はまだ分からないと伝えて、ここで引渡しを確認する。';
  node('reached').text='返事を確かめながら次の空気室へ進み、担架の一行のそばへ着いた。本人たちの状態と合流の結果を、ここで確認する。';
  node('handoff').text='専門隊の詰所へ着いた。救助標は現場に残してある。矢印の向きと場所を示し、ここから先の捜索の引継ぎを確認する。';
  node('expert_arrived').text='専門隊が担架の跡のある空気室へ着いた。ここから先の捜索を引き継ぐ内容を、その場で確認する。';
 }
`);
insert(builder,'  if(n===181){',`  if(n===84){
   const previous=compileRelocatedQuest(first,source(first,{cast:false}),options).story;
   // The new family role must not expand existing item-holder domains.
   for(const [key,entry] of Object.entries(previous.registry))quest.story.registry[key]=structuredClone(entry);
   quest.story.registry.familyGroupAt.values=['family'];
   quest.story.revision=2;quest.model.edition.revision=2;
   quest.model.storyUpgrades=[{fromRevision:1,toRevision:2,previous,values:[{key:'familyGroupAt',value:'family'}]}];
  }
`);
fs.appendFileSync('authoring/relocated-character-art.mjs',`\nfor(const [id,name,role,detail] of [
 ['family','遭難者の家族','発信機を待つ家族','持ち帰った機械を受け取る。機械の回収と本人の発見を区別し、家に留まる。'],
 ['survivors','担架の一行','先の空気室にいる生存者たち','反復する救助標を残して移動した一行。遠くの返事だけでは同席せず、実際の合流先に表示する。'],
 ['specialists','専門の救助隊','捜索の引継ぎを受ける専門隊','詰所で経路を確認し、呼びに来た隊と上層の空気室へ実同行する。']
])relocatedCharacters['q084_'+id]={id:'q084_'+id,name,role,detail,provenance:'2026-11-16。原稿と現行10場面の発言・受渡し・既存同行による集団呼称。氏名・人数・容貌・専用画は追加せず、依頼人マオを家族全体と同一視しない。'};\n`);
execFileSync(process.execPath,['tools/build-scenario-editions.mjs'],{stdio:'inherit'});
const q=JSON.parse(fs.readFileSync('data/scenario-editions/e2/q084.json','utf8'));
const people={q084_family:{label:'遭難者の家族',status:'connected',entity:'familyGroup',need:'発信機を受け取る家のrecoveredだけ。本人発見を意味しない。'},q084_survivors:{label:'担架の一行',status:'connected',entity:'stretcherParty',need:'実際に着いたreachedだけ。遠くの返事を聞くcrossingには表示しない。'},q084_specialists:{label:'専門の救助隊',status:'connected',entity:'specialists',need:'詰所の3場面と既存の同行で戻ったexpert_arrivedだけ。'}};
const rows=[
 ['entry',[],'雑音まで繰り返している。','信号を受ける現場。依頼人マオや家族の同席は本文にない。','信号の反復は人がこの場所にいる証拠ではない。'],
 ['beacon',[],'脇には担架の跡と、新しい矢印','発信地点には救助標と移動跡がある。本人や専門隊は同席していない。','機械の発見を遭難者の発見と区別する。'],
 ['crossing',[],'遠くから生きた人の返事がある。','声の主は次の空気室の一行。遠くの返事を同席と解釈しない。','q061での実際の図の引渡しの有無による条件本文を保つ。'],
 ['recovery',[],'本人を見つけたことにはしない。','発信地点の機械を確認する場面。持出しはcarry出発時。','発信機はまだbeaconにあり、本人は別室。'],
 ['recovered',['q084_family'],'家族の待つ家へ運んだ。','引渡し先の家族だけを表示する。マオの固有名や人数は追加しない。','発信機はfinishまでpartyの保持で、本人の行方は未確認。'],
 ['route_check',['q084_specialists'],'救助標の矢印を詰所へ伝え','既存specialistsは詰所に固定待機しており、経路確認を受ける相手。','図の写しはq061のinformed成立後、follow出発時だけ借りる。'],
 ['reached',['q084_survivors'],'担架の一行のそばへ着いた。','既存stretcherPartyのいる空気室へ実到着した場面。','そばへの到着とreachedの完了確認を分ける。'],
 ['handoff',['q084_specialists'],'専門隊の詰所へ着いた。','詰所の専門隊が引継ぎ先。救助標は発信地点に残す。','到着だけではcompromiseを確定しない。'],
 ['call_report',['q084_specialists'],'専門隊と上層の空気室へ戻る。','詰所の専門隊とこれから同行する場面。','escort出発前の専門隊はrescue、出発後transit、実到着後crossing。'],
 ['expert_arrived',['q084_specialists'],'専門隊が担架の跡のある空気室へ着いた。','既存call_report_escortの実同行で到着した専門隊のみ表示する。','次室の遭難者は表示せず、最終引継ぎはfinish。']
];
const review={sourceSha256:createHash('sha256').update(JSON.stringify(q)).digest('hex'),identityNotes:[
 '原稿authoring/quests.txt・structures-5.mjsのQ(84)、初版3場面・現行10場面を精読。反復信号の発信機と、標を残して先へ移動した生存者たちは別である。',
 '家族はrecovered、一行はreached、専門隊はroute_check・handoff・call_report・expert_arrivedだけへ集団呼称を表示する。遠い返事のcrossingや発信地点へ姿を追加せず、氏名・人数・専用画像を補わない。',
 '専門隊だけがcall_report_escortで実同行する。家族と遭難者はそれぞれ既存の所在に留まる。前者を依頼人マオと同定せず、q090のマオとも結び付けない。',
 'q061の実際の図の引渡し完了によりinformedとなった場合だけ、route_check_follow出発時に写しを借りる。受注済みや別結末は条件を満たさない。条件本文・空気消費・空気室を保持する。',
 '物語改訂1→2は旧定義で全保存を検証後、familyGroupAt=familyだけ補う。既存registry・13行動・9旅程・3結末・報酬を維持し、発信機の家族への保持者は場所familyのままとする。',
 '到着と確定を分けるためrecovered・reached・handoff・expert_arrivedの本文4箇所を明確化し、旧保存に含まれる表示途中の文章と選択肢を保持する。原稿の旧戦闘表現から新たな戦闘を加えない。'
],relatedClients:{},people,scenes:Object.fromEntries(rows.map(([id,people,evidence,reason,visual])=>[id,{decision:people.length?'person-evidence':'no-person-evidence',people,evidence,reason,visual}])),next:'実画面・全体CIの最終結果をPRへ記録する。次はq085「北を向かない羅針盤」の既存原稿と経路を確認する。'};
insert('authoring/relocated-cast-review.mjs','  q083:{','  q084:'+JSON.stringify(review,null,2).replaceAll('\n','\n  ')+',\n');
const p='tests/relocated-cast-audit.test.mjs',s=fs.readFileSync(p,'utf8');
const before='{"quests":100,"scenes":753,"emptyCastScenes":271,"personEntities":157,"characterLinkedEntities":150,"reviewedQuests":93,"reviewedScenes":699,"noPersonEvidenceScenes":216,"personEvidenceScenes":483,"candidateRoles":1,"connectedRoles":199,"unreviewedScenes":54}';
const after='{"quests":100,"scenes":753,"emptyCastScenes":265,"personEntities":157,"characterLinkedEntities":150,"reviewedQuests":94,"reviewedScenes":709,"noPersonEvidenceScenes":220,"personEvidenceScenes":489,"candidateRoles":1,"connectedRoles":202,"unreviewedScenes":44}';
assert.ok(s.includes(before));fs.writeFileSync(p,s.replace(before,after));
execFileSync(process.execPath,['tools/audit-relocated-cast.mjs'],{stdio:'inherit'});
console.log('q084 source, migration, scene audit and baseline fixture prepared.');
