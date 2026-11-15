import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const sha=b=>createHash('sha256').update(b).digest('hex');
const expected={"authoring/editions/e2/salome/machine-first.mjs": "dfb8e4b2bac3b46a7e610fcf9efe6df73b1768c3bdf948c99307b55fadb2eea0", "tools/build-machine-quests.mjs": "669987ecac362025bd662d02339770cfaa65974c5fbeac26fe05add7349878b6", "authoring/relocated-character-art.mjs": "0a12c0146fed36f923ffd42ecc8d2777f8c21a9c4f0ea840e1a522716fddf764", "authoring/relocated-cast-review.mjs": "813ff564cfd93c1d0c206613651cbf64f372a1b41b0a99779ef22d95ac616aba", "tests/relocated-cast-audit.test.mjs": "bee73e238ba559233592b8bee88ed08efc108d6a7f28b642e3816240bbe1e614", "data/scenario-editions/e2/q074.json": "c2c163789f4e662cfc98a068ffa9efa2b512e37fd56dac85bc9159d944bd3b0d"};
for(const [p,h] of Object.entries(expected))assert.equal(sha(fs.readFileSync(p)),h,'source changed: '+p);
const fixture='tests/fixtures/e2-q074-before-cast.json';assert.equal(fs.existsSync(fixture),false);fs.copyFileSync('data/scenario-editions/e2/q074.json',fixture);
function replace(p,a,b){const s=fs.readFileSync(p,'utf8');assert.equal(s.split(a).length,2,'unique anchor: '+p);fs.writeFileSync(p,s.replace(a,b));}
replace('authoring/editions/e2/salome/machine-first.mjs',' if(q.number===75){',` if(q.number===74&&cast){
  entity('yuaPerson','copy','person');x.entities.yuaPerson.character='q074_yua';
  node('corrected').cast=[{entity:'yuaPerson',display:{x:50}}];
  node('opened').text='冷却、炉の順で起動した灯を確かめ、扉の前へ戻った。扉を開いてから、試験結果を写本室へ運ぶ。';
  node('corrected').text='検証した起動順序をユアへ持ち込んだ。写本の一節目を試験結果に合わせて訂正し、検証日を記して依頼を終える。';
  node('manual').text='扉の前で手動操作に移る。炉の停止を確かめて手動で扉を開く。祈祷書の訂正は行わない。';
 }
 if(q.number===75){`);
replace('tools/build-machine-quests.mjs','  if(n===171)',`  if(n===74){
   const previous=compileRelocatedQuest(first,source(first,{cast:false}),options).story;
   for(const [key,entry] of Object.entries(previous.registry))quest.story.registry[key]=structuredClone(entry);
   quest.story.registry.yuaPersonAt.values=['copy'];
   quest.story.revision=2;quest.model.edition.revision=2;
   quest.model.storyUpgrades=[{fromRevision:1,toRevision:2,previous,values:[{key:'yuaPersonAt',value:'copy'}]}];
  }
  if(n===171)`);
fs.appendFileSync('authoring/relocated-character-art.mjs',`
relocatedCharacters.q074_yua={id:'q074_yua',name:'ユア',role:'鐘番・祈祷書の訂正先',detail:'隊が試験した起動順序を訂正窓口で受け取り、訂正した頁に検証日を記す。冷却盤や炉へ同行しない。',provenance:'2026-11-16。openedの持込み先とinformed結末の本人の動作に基づく呼称表示。容貌・専用画を追加しない。'};
`);
execFileSync(process.execPath,['tools/build-scenario-editions.mjs'],{stdio:'inherit'});
const q=JSON.parse(fs.readFileSync('data/scenario-editions/e2/q074.json','utf8'));
const review={
  "sourceSha256": "PENDING",
  "identityNotes": [
    "整備側原稿authoring/quests.txt・structures-4.mjsのQ(74)、初版4場面・現行7場面・9旅程・13行動・3結末を精読した。祈祷書の誤写を設備の起動順として検証する話であり、同番号の別原稿を出典にしない。",
    "ユアはopenedの選択肢で検証結果の持込み先として明示され、informed結末で訂正頁に検証日を記す。祈祷書の訂正窓口copyのcorrectedだけへ固定所在の呼称表示を接続し、現場の操作盤や退避足場への同席・同行を追加しない。",
    "冷却coolingOnと炉furnaceOnは各操作位置への実到着で確定する。誤順序の試験は炉が自動停止しており、failedTrialは既存の再試験到着時の記録として保持する。doorOpenedはopenedから訂正窓口へ出発時、correctedは窓口でfinish時、手動経路の炉停止とmanualOpenedはmanualのfinish時に確定する。",
    "物語改訂1→2では旧定義で保存全体を検証後、yuaPersonAt=copyだけを追加する。既存registry・全行動・戦闘・報酬・旧受注を維持する。opened・corrected・manualの3本文だけを既存処理時点へ合わせ、表示途中の旧本文と選択肢は保持する。"
  ],
  "relatedClients": {},
  "people": {
    "q074_yua": {
      "label": "鐘番のユア",
      "status": "connected",
      "entity": "yuaPerson",
      "need": "検証結果を持ち込む訂正窓口の1場面だけへ表示する。人物の容貌・専用画や現場同行を追加しない。"
    }
  },
  "scenes": {
    "entry": {
      "decision": "no-person-evidence",
      "people": [],
      "evidence": "古い操作盤には冷却が最初に彫られている。",
      "reason": "祈祷書と操作盤を比較する現場。ユアがこの場にいる記述はなく、訂正窓口に固定する。",
      "visual": "新旧の手順だけを示す。初期状態は冷却・炉とも未起動。"
    },
    "lock": {
      "decision": "no-person-evidence",
      "people": [],
      "evidence": "試験盤なので炉は自動停止した。",
      "reason": "封鎖外の退避足場へ来るのは隊だけ。依頼人や別の作業者を足さない。",
      "visual": "誤った順序による封鎖と自動停止を区別し、安全な足場からやり直す。"
    },
    "furnace": {
      "decision": "no-person-evidence",
      "people": [],
      "evidence": "冷却灯が点いた。",
      "reason": "冷却操作盤で隊が冷却を確認する場面。ユアは訂正窓口に残る。",
      "visual": "冷却だけが起動し、炉は次の操作で起動する。再試験の記録を別に保つ。"
    },
    "door": {
      "decision": "no-person-evidence",
      "people": [],
      "evidence": "扉の封鎖灯が消えた。",
      "reason": "試験炉の操作盤で順序を検証する場面。封鎖灯が消えたことだけで扉の実開放や写本の訂正を確定しない。",
      "visual": "冷却と炉の点灯、まだ開いていない扉を区別する。"
    },
    "opened": {
      "decision": "no-person-evidence",
      "people": [],
      "evidence": "冷却、炉の順で起動した灯を確かめ、扉の前へ戻った。",
      "reason": "隊が扉へ戻った段階。ユアへ検証結果を持ち込むのは次の旅程。",
      "visual": "出発時に開扉を確認してdoorOpenedが立つ。到着だけでは開扉済みにしない。"
    },
    "corrected": {
      "decision": "person-evidence",
      "people": [
        "q074_yua"
      ],
      "evidence": "検証した起動順序をユアへ持ち込んだ。",
      "reason": "openedの持込み先とinformed結末の訂正者がともにユアと明示される。訂正窓口の1場面だけへ接続する。",
      "visual": "訂正内容と検証日を確認し、finishを選ぶまでcorrectedはfalse。"
    },
    "manual": {
      "decision": "no-person-evidence",
      "people": [],
      "evidence": "炉の停止を確かめて手動で扉を開く。",
      "reason": "手動操作の現場は扉の前。ユアは訂正窓口のままで、手動解決を文書訂正と混同しない。",
      "visual": "炉が起動済みの経路もあり、finishで炉停止と手動開扉を確定する。"
    }
  },
  "next": "新旧保存・全9経路・全旅程の中断・強行戦闘の敗北再戦・冷却と炉と開扉と訂正の確定時点・3結末と一回報酬を検証する。次工程はq075「無給の聖者」。"
};
review.sourceSha256=sha(JSON.stringify(q));
replace('authoring/relocated-cast-review.mjs',' quests:{',' quests:{\n  q074:'+JSON.stringify(review,null,2)+',');
replace('authoring/relocated-cast-review.mjs'," reviewedAt:'2026-11-15'"," reviewedAt:'2026-11-16'");
replace('tests/relocated-cast-audit.test.mjs','{"quests":100,"scenes":753,"emptyCastScenes":290,"personEntities":148,"characterLinkedEntities":139,"reviewedQuests":83,"reviewedScenes":638,"noPersonEvidenceScenes":174,"personEvidenceScenes":464,"candidateRoles":1,"connectedRoles":186,"unreviewedScenes":115}','{"quests":100,"scenes":753,"emptyCastScenes":289,"personEntities":149,"characterLinkedEntities":140,"reviewedQuests":84,"reviewedScenes":645,"noPersonEvidenceScenes":180,"personEvidenceScenes":465,"candidateRoles":1,"connectedRoles":187,"unreviewedScenes":108}');
execFileSync(process.execPath,['tools/audit-relocated-cast.mjs'],{stdio:'inherit'});
console.log('q074 generated; previous quest preserved byte-for-byte.');
