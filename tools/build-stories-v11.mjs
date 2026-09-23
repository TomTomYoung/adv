import {docPath,relocateDoc} from './doc-layout.mjs';
import {applyQuestEvents} from './quest-event-source.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import stories1 from '../authoring/stories-v11-1.mjs';
import stories2 from '../authoring/stories-v11-2.mjs';
import characters from '../authoring/characters.mjs';
import {ref,eq} from '../authoring/story-kit.mjs';
import {applyCatalogRevisions} from './apply-catalog-revisions.mjs';
const root=path.resolve(import.meta.dirname,'..'),read=async f=>JSON.parse(await fs.readFile(path.join(root,f),'utf8')),write=async(f,v)=>fs.writeFile(path.join(root,f),JSON.stringify(v,null,2)+'\n');
const standard={id:'game-scenario-model',version:'1.1',source:'https://app.notion.com/p/v1-1-3dac3c1966b38069ab3bf87729e453c4',adapter:'adv-story-state/1',revision:'2026-09-13',scope:'quest-episode'};
const previous={id:'game-scenario-model',version:'1.0',source:'https://app.notion.com/p/v1-0-3d7c3c1966b381818a0fcb62493abcc3'};
const drafts=[...stories1,...stories2],game=await read('data/game.json'),quests=[];
await applyCatalogRevisions(root);
const say=text=>({op:'say',text}),render=t=>Array.isArray(t)?t.flatMap(render):typeof t==='string'?[say(t)]:[{op:'if',condition:t.when,then:render(t.yes),else:render(t.no)}];
for(const file of game.files.quests){
 const q=await read(file),s=drafts.find(s=>s.id===q.id);q.model.standard??=previous;
 if(s){
  if(s.resetScripts)q.scripts={};
  q.legacyOutcomes??=structuredClone(q.outcomes);const sid=n=>`${q.id}.v11.${n}`;
  if(s.brief){q.brief=s.brief;q.model.audience={...q.model.audience,initialHypothesis:s.brief};}
  if(s.revealText)q.model.reveal={...q.model.reveal,newInformation:s.revealText};
  if(s.storyUpgrades)q.model.storyUpgrades=s.storyUpgrades;
  q.story=s.story;q.outcomes=Object.fromEntries(Object.entries(s.outcomes).map(([k,o])=>[k,{gold:q.legacyOutcomes[k]?.gold??57,xp:q.legacyOutcomes[k]?.xp??51,...o}]));
  q.model.standard=standard;q.model.flowVersion=3;q.model.entryScript=sid('visit');q.model.progression=s.progression;
  q.model.world={...q.model.world,truth:s.past.join(' '),history:s.past.map((text,i)=>({id:`fixed_${i}`,text})),initialState:'story.registry の initial。過去の真相と現在の所在を別に持つ。'};
  // Author constraints are metadata and documentation, not automatically narrated facts.
  if(s.authoringNotes)q.model.world.authoringNotes=s.authoringNotes;
  q.model.agents=Object.entries(q.story.entities).filter(([,e])=>e.character).map(([id,e])=>{const c=characters.find(c=>c.id===e.character);return {id,character:c.id,name:c.name,goal:c.goal,initialLocation:q.story.registry[e.holder].initial};});
  q.model.stateRegistry=Object.entries(q.story.registry).map(([key,v])=>({path:`stories.${q.id}.values.${key}`,...v,writer:'story.action',scope:'quest',lifetime:'保存・再開・完了後まで保持'}));
  q.model.narrative={...q.model.narrative,units:s.nodes.map(n=>({id:n.id,script:sid(n.id),assertion:q.story.scenes[n.id]}))};q.model.beats=q.model.narrative.units;
  q.model.graph=s.nodes.map(n=>({id:n.id,text:n.text,...(s.sceneFlow?.[n.id]?{automatic:true}:{}),options:n.options.map(o=>({id:o.id,text:o.text,to:o.to,...(o.when?{when:o.when}:{}),...(o.combat?{combat:true}:{}),action:o.action}))}));
  q.model.conflict={request:q.brief,progression:s.progression};q.model.reveal={...q.model.reveal,gate:null,retroactiveTargets:s.nodes.map(n=>n.id),window:'story.actions の observe が情報源への接触を確認し、story.knowledge へ記録する'};
  q.model.choiceContract={resources:'物語物品は entities、共通の縄・松明・金は cost。戦闘作業は勝利時だけ一括確定する。',residue:'現在の所在・所持・合意・観察・到着を保存し、結末条件を検証する。',interruption:'中断・逃走・敗北中は物語時刻を止める。現場に戻ると最後の場面から再開する。'};
  for(const n of s.nodes){
   const options=n.options.map(o=>{
    const effect=[{op:'story.action',quest:q.id,action:o.action},...(o.commands??[]),{op:'jump',script:sid(o.to.startsWith('@')?`end.${o.to.slice(1)}`:o.to)}];
    const commands=q.story.actions[o.action].journey?[{op:'story.journey',quest:q.id,action:o.action}]:o.combat?[{op:'battle.start',encounter:`guard_${q.region}`,on_win:effect,on_escape:[say('退路へ戻った。この作業の移動・受け渡し・支払いはまだ確定していない。')],on_lose:[say('現場から救援された。依頼を再開すると、未完了の作業からやり直せる。')]}]:effect;
    return {id:o.id,text:o.text,storyAction:{quest:q.id,action:o.action},...(o.when?{condition:o.when}:{}),requirement:[o.requirement,...Object.entries(o.cost??{}).map(([k,n])=>`${{rope:'縄',torch:'松明',gold:'G'}[k]??k} ${n}消費`),...(o.combat?['戦闘・作業と消費は勝利時に確定']:[])].filter(Boolean).join(' ／ '),commands};
   });
   if(!s.noPauseScenes?.includes(n.id))options.push({id:'pause',text:'ここで中断し、同じ場面から再開する',commands:[]});
   q.scripts[sid(n.id)]={storyQuest:q.id,commands:[{op:'story.scene',quest:q.id,scene:n.id},...(s.sceneCommands?.[n.id]??[]),...(s.sceneDialogue?.[n.id]??render(n.text)),...(s.sceneFlow?.[n.id]??[{op:'choice',options}])]};
  }
  for(const [alias,canonical] of Object.entries(s.sceneAliases??{})){
   q.scripts[sid(alias)]=structuredClone(q.scripts[sid(canonical)]);
   q.scripts[sid(alias)].commands[0].scene=alias;
  }
  for(const [key,o] of Object.entries(q.outcomes))q.scripts[sid(`end.${key}`)]={commands:[{op:'quest.complete',quest:q.id,outcome:key},...(['informed','contract','compromise'].includes(key)?[{op:'add',target:`vars.${key}`,value:1}]:[]),say(o.text)]};
  q.scripts[sid('visit')]={commands:[{op:'if',condition:s.resetScripts?false:eq(ref(`flags.legacyStoryRoutes.${q.id}`),true),then:s.resetScripts?[]:[{op:'jump',script:`${q.id}.flow.visit`}],else:[{op:'if',condition:eq(ref(`quests.${q.id}.stage`),'completed'),then:[{op:'switch',value:ref(`quests.${q.id}.outcome`),cases:Object.entries(q.outcomes).map(([k,o])=>({equals:k,commands:[say(o.text)]})),default:[]}],else:[{op:'story.init',quest:q.id},{op:'switch',value:ref(`stories.${q.id}.scene`),cases:[...s.nodes.map(n=>n.id),...Object.keys(s.sceneAliases??{})].map(id=>({equals:id,commands:[{op:'jump',script:sid(id)}]})),default:[{op:'jump',script:sid('entry')}]}]}]}]};
 }
 await write(file,q);quests.push(q);
}
await applyQuestEvents(root);
const assets=await read('data/assets.json');for(const c of characters)assets.images[c.portrait]=`assets/images/characters/generated/${c.id}.webp`;await write('data/assets.json',assets);
await write('data/characters.json',Object.fromEntries(characters.map(({design,...c})=>[c.id,{...c,visualDesign:design}])));
game.version='1.4.0';game.storyVersion=1;game.files.databases.characters='data/characters.json';
game.migrations['1.3.2']={actors:Object.keys(await read('data/actors.json')),quests:quests.map(q=>q.id),scenarioRevision:true,preserveRecords:true};await write('data/game.json',game);
const doc=['# 登場人物一覧','','更新: 2026-09-14。q001〜q010 の登場人物は安定した ID で定義し、会話場面に画像生成で制作した肖像を表示する。従来の AIPaint 製PNG・編集原稿・描画コマンドは保存している。同じリネを別人として増やさず、関所番と水門番は分ける。名無しの役割に本名を捏造せず、集団は集団実体として記載する。','','外見・服装・小道具は今回の美術設定であり、元のシナリオから確定した外見ではない。NPC は戦闘隊員へ自動加入しない。','','[画像生成プロンプト（英語・日本語）](../assets/source/characters/imagegen-prompts.json) ／ [画像とハッシュの一覧](../assets/source/characters/imagegen-manifest.json)','','## q001〜q010 の実装済み人物','','| ID | 名前・役割 | 登場 | 動機 |','|---|---|---|---|'];
doc.splice(doc.indexOf('## q001〜q010 の実装済み人物'),0,"## 会話用の透過立ち絵（1.15.0）\n\nルーキー・老灯番・リネにsprite_rookie・sprite_elder・sprite_rineを追加しました。元のgenerated肖像はカード用に保持します。立ち絵は元画像を参照して画像生成で透過版を作成し、WebPへ変換したものです。[画像とハッシュ](../assets/source/characters/dialogue-sprites-manifest.json)と[使用プロンプト](../assets/source/characters/dialogue-sprites-prompts.json)を記録しています。\n\nq001の帰還報告では二人を左、リネを右に配置し、発話者を手前へ出します。[人物演出の仕様](CHARACTER_STAGING.md)を参照してください。",'');
for(const c of characters)doc.push(`| ${c.id} | ${c.name}／${c.role} | ${c.quests.join(', ')} | ${c.goal} |`);
for(const c of characters)doc.push('',`### ${c.name} (${c.id})`,'',`![${c.name}](../${assets.images[c.portrait]})`,'',c.detail,'',`[旧AIPaint PNG](../assets/images/characters/${c.id}.png) ／ [AIPaint 編集原稿](../assets/source/characters/${c.id}.paint.json) ／ [描画コマンド](../assets/source/characters/${c.id}.commands.json)`);
doc.push('','## 歴史上・物語内で言及される人物','','| 人物 | 関係 | 扱い |','|---|---|---|','| ミレの夫 | q007、弟の兄 | 故人。声の主ではない。生存 NPC の所在を持たせない。 |','| 関所番の兄 | q004 | 故人。関所番が使う資格の名義人。 |','| 棺の故人 | q008 | 遺体を物品 body として棺の内室に保持。生存 NPC として表示しない。 |','','## 既存の探索隊員','','| ID | 名前 | 役割 |','|---|---|---|');
for(const [id,c] of Object.entries(await read('data/actors.json')))doc.push(`| ${id} | ${c.name} | ${c.bio??c.role??c.class} |`);
doc.push('','## q011〜q200 の依頼人索引','','原文の依頼人表記を列挙する。同名だけで同一人物とは確定せず、各クエスト内で言及される関係者も今後の人物化対象とする。この範囲の新規肖像と所在モデルは未実装。','','| 依頼 | 依頼人（既存表記） |','|---|---|');for(const q of quests.filter(q=>q.number>10))doc.push(`| [${q.id} ${q.title}](QUEST_CATALOG.md#${q.id}-${q.title}) | ${q.client} |`);
await fs.mkdir(path.join(root,'doc/scenarios'),{recursive:true});
await fs.writeFile(path.join(root,'doc',docPath('CHARACTERS.md')),relocateDoc(doc.join('\n')+'\n','CHARACTERS.md'));
console.log(`v1.1: ${drafts.length} stories, ${drafts.reduce((n,s)=>n+s.nodes.length,0)} scenes, ${characters.length} NPC identities; authored revisions generated`);
