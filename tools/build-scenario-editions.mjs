import {buildChapelQuests} from './build-chapel-quests.mjs';
import {buildOddlandQuests} from './build-oddland-quests.mjs';
import fs from 'node:fs/promises';
import {buildOddlandGeography} from './build-oddland-geography.mjs';
import {buildCompanionEdition} from './build-companion-edition.mjs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import authored from '../authoring/editions/e2/story-q001.mjs';

const root=path.resolve(import.meta.dirname,'..');
const sid=node=>`q001.v11.${node}`;
const names={rookie:'新人灯番',elder:'老灯番',rine:'リネ'};
const textOf=commands=>commands.flatMap(c=>c.op==='if'?[{when:c.condition,yes:textOf(c.then),no:textOf(c.else??[])}]:['say','narrate'].includes(c.op)?[c.character?`${names[c.character]}「${c.text}」`:c.text]:[]);

export function buildSecondEditionQuest(first,source=authored){
 const q=structuredClone(first),s=structuredClone(source);
 q.brief=s.brief;
 q.story=s.story;
 q.outcomes=Object.fromEntries(Object.entries(s.outcomes).map(([key,value])=>[key,{gold:first.outcomes[key].gold,xp:first.outcomes[key].xp,...value}]));
 delete q.model.storyUpgrades;
 q.model.standard=s.standard;
 q.model.source='authoring/editions/e2/story-q001.mjs';
 q.model.revision='scenario-edition-e2-q001-r1';
 q.model.edition={id:s.edition,revision:s.story.revision,inherits:'e1'};
 q.model.progression=s.progression;
 q.model.world={truth:s.past.join(' '),history:s.past.map((text,i)=>({id:`fixed_${i}`,text})),initialState:'story.registry の initial。',authoringNotes:s.authoringNotes};
 q.model.audience={initialHypothesis:s.brief,openQuestion:'入口に足を止めた新人へ、何を任せられるか。助け合って帰った後、誰のそばで今夜の仕事を引き受けるか。'};
 q.model.conflict={request:s.brief,progression:s.progression};
 q.model.reveal={...q.model.reveal,operator:'reinterpretation',newInformation:s.revealText,retroactiveTargets:['entry','old','rescue','gate'],gate:null};
 q.model.design=s.design;
 q.model.stateRegistry=Object.entries(q.story.registry).map(([key,value])=>({path:`stories.q001.values.${key}`,...value,writer:'story.action',scope:'quest',lifetime:'第2版の保存・再開・完了後まで保持'}));
 q.model.narrative={...q.model.narrative,units:s.nodes.map(n=>({id:n.id,script:sid(n.id),assertion:q.story.scenes[n.id]}))};
 q.model.beats=q.model.narrative.units;
 q.model.graph=s.nodes.map(n=>({id:n.id,text:textOf(s.sceneDialogue[n.id]),...(s.sceneFlow?.[n.id]?{automatic:true}:{}),options:n.options.map(o=>({id:o.id,text:o.text,to:o.to,...(o.when?{when:o.when}:{}),action:o.action}))}));
 for(const n of s.nodes){
  const options=n.options.map(o=>{
   const commands=q.story.actions[o.action].journey
    ?[...(o.commands??[]),{op:'story.journey',quest:q.id,action:o.action}]
    :[{op:'story.action',quest:q.id,action:o.action},...(o.commands??[]),{op:'jump',script:sid(o.to.startsWith('@')?`end.${o.to.slice(1)}`:o.to)}];
   return {id:o.id,text:o.text,storyAction:{quest:q.id,action:o.action},...(o.when?{condition:o.when}:{}),requirement:'',commands};
  });
  q.scripts[sid(n.id)]={storyQuest:q.id,commands:[{op:'story.scene',quest:q.id,scene:n.id},...(s.sceneCommands[n.id]??[]),...s.sceneDialogue[n.id],...(s.sceneFlow[n.id]??[{op:'choice',options}])]};
 }
 for(const [key,outcome] of Object.entries(q.outcomes)){
  q.scripts[sid(`end.${key}`)]={commands:[{op:'quest.complete',quest:q.id,outcome:key},{op:'add',target:`vars.${key}`,value:1},...s.endingDialogue[key]]};
 }
 // Completed-quest revisits report the chosen ending without replaying its work.
 q.scripts[sid('visit')]={commands:[{op:'if',condition:{op:'eq',left:{ref:'quests.q001.stage'},right:'completed'},then:[{op:'switch',value:{ref:'quests.q001.outcome'},cases:Object.entries(q.outcomes).map(([key,o])=>({equals:key,commands:[{op:'narrate',text:o.text}]})),default:[]}],else:[{op:'story.init',quest:q.id},{op:'switch',value:{ref:'stories.q001.scene'},cases:s.nodes.map(n=>({equals:n.id,commands:[{op:'jump',script:sid(n.id)}]})),default:[{op:'jump',script:sid('entry')}]}]}]};
 for(const id of ['q001_empty_west','q001_empty_east','q001_last_lamp']){
  const command=q.scripts[`q001.wall.${id}`].commands[0];
  for(const item of command.cases)item.commands=[{op:'narrate',text:s.inspectionText[item.equals]}];
  command.default=[{op:'narrate',text:s.inspectionText[id==='q001_last_lamp'?'low':'empty']}];
 }
 q.scripts['dungeon.scene.kagaribi.v2']={dungeonScene:'kagaribi',commands:s.dungeonPreparation};
 return q;
}

function dialogueMarkdown(commands,indent=''){
 return commands.flatMap(c=>{
  if(c.op==='if')return [indent+'**呼び声への返事を頼んだ経路**','',...dialogueMarkdown(c.then,indent),indent+'**入口の火を守るよう頼んだ経路**','',...dialogueMarkdown(c.else??[],indent)];
  if(!['say','narrate'].includes(c.op))return [];
  return [indent+(c.character?`**${names[c.character]}**「${c.text}」`:c.text),''];
 });
}

export function secondEditionDocument(q,firstSha){
 const s=authored,out=[
  '# q001「帰らない灯番」第2版','',
  '[第2版の目次](README.md) ／ [初版の本文](../../quests/QUEST_Q001.md) ／ [設計モデル v1.2b](../../SCENARIO_MODEL_V12B.md)','',
  'シナリオ版 `e2`、q001改訂1。設計モデルv1.2bを用いて本文・選択・NPC応答を改稿した実装原稿です。初版の物理経路と固定の救援戦闘を継承しています。下記の適用範囲と継承上の課題を含み、モデル全項目への準拠を宣言するものではありません。','',
  '正本は [authoring/editions/e2/story-q001.mjs](../../../../authoring/editions/e2/story-q001.mjs)、配布データは [q001.json](../../../../data/scenario-editions/e2/q001.json) です。`npm run build:editions` でこの本文と配布データを一緒に再生成します。初版の本文・配布データは書き換えません。','',
  '## 依頼','',q.brief,'',
  '## プレイヤーに表示する本編','',
  '場面IDと条件見出しは、この文書の対照用です。実画面には、選んだ経路の本文だけが表示されます。',''
 ];
 for(const n of s.nodes){
  out.push(`### ${n.id} — ${s.story.scenes[n.id].title}`,'',...dialogueMarkdown(s.sceneDialogue[n.id]));
  if(s.sceneFlow[n.id]){
   out.push('帰路のくらがり戦闘が始まる。第2ラウンド開始時、またはそれより早い勝利・逃走・撃退の確定前に、新人が火を持って来る。','',...dialogueMarkdown(s.sceneFlow[n.id][0].events[0].commands),
    '新人の油を一度だけ使い、携帯松明を25歩分点灯する。戦闘を救援で中断し、現在の座標のまま `rescue` へ進む。','');
  }else for(const o of n.options){
   out.push(`- **${o.id}**：${o.text} → ${o.to.startsWith('@')?'結末 '+o.to.slice(1):o.to}`,'');
   if(o.commands)out.push(...dialogueMarkdown(o.commands));
  }
 }
 out.push('## 結末','');
 for(const [key,o] of Object.entries(q.outcomes))out.push(`### ${key} — ${o.label}`,'',...dialogueMarkdown(s.endingDialogue[key]),`再訪時の記録：${o.text}`,'',`報酬：${o.gold}G / ${o.xp}XP。初版と同じ一回性と額を保ち、修繕班への直接申し送りの追加手当を選択前に示します。`,'');
 out.push('## 適用範囲と制作判断','',s.design.experienceIntent,'',s.design.dramaticKernel,'',s.design.agency,'',
  '### 本文へ反映した変更','',
  '- 整合性の訂正説明を、乾いた油受け、空の瓶、足首、杖の動きへ置き換えた。火の防護規則は判断前に新人の言葉と距離の変化で示す。','',
  '- 入口で頼む役割を二つにした。返事の約束は保存状態 `signalAgreed` に残し、帰路・戦闘中・救援後の本文だけを分ける。成功率や別結末を約束する戦略分岐にはしない。','',
  '- 新人の「帰ってくる方を見る」「必ず返事をする」という承諾を、その後の自発的な救援と返事へつなげた。老人は説明を重ねる代わりに、新人の明かりへ足を出す。','',
  '- 帰還後の両選択は、二人を休ませながら必要な仕事を分担する。修繕か休養の一方を捨てる偽の対立を置かず、未実施の工事や将来の安全を結末で断定しない。','',
  '- 終わりは修繕班が受け取る経路図、椀を包む指、並ぶ空瓶へ着地させる。恐怖が消えたという説明や教訓を結末に付けない。','',
  '### 選択前の理由と合流後の回収','');
 for(const choice of s.design.choices)out.push(`- **${choice.id}**：${choice.visibleMotive} 回収：${choice.payoff.join(' → ')}。`,'');
 out.push('### 採用した補足','');
 for(const item of s.design.additions)out.push('- '+item,'');
 out.push('### 代案・失敗・継承上の課題','');
 for(const item of s.design.counterfactuals)out.push(`- **${item.id}**：${item.result}`,'');
 out.push('固定の消灯場面については、初版で修正した「再給油による必須救援イベントの通過」を再発させないことを優先しています。老人場面の燃料8、帰路の0、救援の25という変更を、自由な補充と統合した物語機構として扱う再設計は今回の範囲に含みません。V12-MECHANISM / V12B-ALTERNATIVE-RETURN の当該項目は `needs_review` とし、風・呪いなどの新規事故で後付け説明をしません。','',
  '## 検証範囲','',
  '実行検証は [tests/scenario-edition-q001.test.mjs](../../../../tests/scenario-edition-q001.test.mjs) で、入口の2選択と結末の2選択の組合せ、北側・南側帰路、物語の移動、救援戦闘、会話途中の保存、合流後の条件本文、報酬の一回性を対象にします。具体的な実施結果は変更のPRと現行引継ぎ文書へ記録します。','',
  '本文レビューは、この文書の依頼・当該条件の本文・選択肢・結末を提示順に読み、`talk → repair` と `signal → rest` を主比較、残る2組合せを合流条件の確認対象とします。作者が同時に設定を把握したうえで行う点検であり、実読者の試読や厳密な盲検ではありません。怖さ、助ける動機、役割の引受け、休養と申し送りの並行を、本文に現れている箇所から確認します。','',
  'V12B-VARIETY は今回q001一作の改稿であるため作品群比較としては適用外です。今後ほかの依頼を第2版へ改稿する際に、人物の欲望・応答・結末の像を横断して比較します。','',
  '### 初版の保持','',
  `生成時の初版 data/quests/q001.json SHA-256：\`${firstSha}\`。生成処理はこのファイルを読み取るだけで、初版のauthoring・クエストJSON・旧シナリオ本文へ書き込みません。`,'');
 // Match the repository's plain documentation format without importing the
 // side-effectful general documentation builder.
 return out.join('\n').replaceAll('**','').replace(/^(\s*)-\s+/gm,(_match,space)=>space+'1. ').replace(/\n{3,}/g,'\n\n').trimEnd()+'\n';
}

export async function buildScenarioEditions({check=false}={}){
 await buildCompanionEdition({check});
 await buildOddlandGeography({check});
 await buildOddlandQuests({check});
 await buildChapelQuests({check});
 const bytes=await fs.readFile(path.join(root,'data/quests/q001.json'));
 const q=buildSecondEditionQuest(JSON.parse(bytes));
 const files={
  'data/scenario-editions/e2/q001.json':JSON.stringify(q,null,2)+'\n',
  'doc/scenarios/editions/e2/QUEST_Q001.md':secondEditionDocument(q,createHash('sha256').update(bytes).digest('hex'))
 };
 for(const [name,text] of Object.entries(files)){
  const target=path.join(root,name);
  if(check){if(await fs.readFile(target,'utf8').catch(()=>null)!==text)throw Error(`${name}: edition output differs; run npm run build:editions`);}
  else{await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,text);}
 }
 return q;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 await buildScenarioEditions({check:process.argv.includes('--check')});
 console.log(`SCENARIO EDITIONS ${process.argv.includes('--check')?'OK':'BUILT'}: e2 q001 and chapel q031–040; e1 unchanged`);
}
