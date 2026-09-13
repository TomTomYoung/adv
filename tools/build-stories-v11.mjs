import fs from 'node:fs/promises';
import path from 'node:path';
import stories1 from '../authoring/stories-v11-1.mjs';
import stories2 from '../authoring/stories-v11-2.mjs';
import characters from '../authoring/characters.mjs';
import {ref,eq} from '../authoring/story-kit.mjs';
const root=path.resolve(import.meta.dirname,'..'),read=async f=>JSON.parse(await fs.readFile(path.join(root,f),'utf8')),write=async(f,v)=>fs.writeFile(path.join(root,f),JSON.stringify(v,null,2)+'\n');
const standard={id:'game-scenario-model',version:'1.1',source:'https://app.notion.com/p/v1-1-3dac3c1966b38069ab3bf87729e453c4',adapter:'adv-story-state/1',revision:'2026-09-13',scope:'quest-episode'};
const previous={id:'game-scenario-model',version:'1.0',source:'https://app.notion.com/p/v1-0-3d7c3c1966b381818a0fcb62493abcc3'};
const drafts=[...stories1,...stories2],game=await read('data/game.json'),quests=[];
const say=text=>({op:'say',text}),render=t=>Array.isArray(t)?t.flatMap(render):typeof t==='string'?[say(t)]:[{op:'if',condition:t.when,then:render(t.yes),else:render(t.no)}];
for(const file of game.files.quests){
 const q=await read(file),s=drafts.find(s=>s.id===q.id);q.model.standard??=previous;
 if(s){
  q.legacyOutcomes??=structuredClone(q.outcomes);const sid=n=>`${q.id}.v11.${n}`;
  if(s.brief){q.brief=s.brief;q.model.audience={...q.model.audience,initialHypothesis:s.brief};}
  if(s.revealText)q.model.reveal={...q.model.reveal,newInformation:s.revealText};
  q.story=s.story;q.outcomes=Object.fromEntries(Object.entries(s.outcomes).map(([k,o])=>[k,{gold:q.legacyOutcomes[k]?.gold??57,xp:q.legacyOutcomes[k]?.xp??51,...o}]));
  q.model.standard=standard;q.model.flowVersion=3;q.model.entryScript=sid('visit');q.model.progression=s.progression;
  q.model.world={...q.model.world,truth:s.past.join(' '),history:s.past.map((text,i)=>({id:`fixed_${i}`,text})),initialState:'story.registry の initial。過去の真相と現在の所在を別に持つ。'};
  // Author constraints are metadata and documentation, not automatically narrated facts.
  if(s.authoringNotes)q.model.world.authoringNotes=s.authoringNotes;
  q.model.agents=Object.entries(q.story.entities).filter(([,e])=>e.character).map(([id,e])=>{const c=characters.find(c=>c.id===e.character);return {id,character:c.id,name:c.name,goal:c.goal,initialLocation:q.story.registry[e.holder].initial};});
  q.model.stateRegistry=Object.entries(q.story.registry).map(([key,v])=>({path:`stories.${q.id}.values.${key}`,...v,writer:'story.action',scope:'quest',lifetime:'保存・再開・完了後まで保持'}));
  q.model.narrative={...q.model.narrative,units:s.nodes.map(n=>({id:n.id,script:sid(n.id),assertion:q.story.scenes[n.id]}))};q.model.beats=q.model.narrative.units;
  q.model.graph=s.nodes.map(n=>({id:n.id,text:n.text,options:n.options.map(o=>({id:o.id,text:o.text,to:o.to,...(o.when?{when:o.when}:{}),...(o.combat?{combat:true}:{}),action:o.action}))}));
  q.model.conflict={request:q.brief,progression:s.progression};q.model.reveal={...q.model.reveal,gate:null,retroactiveTargets:s.nodes.map(n=>n.id),window:'story.actions の observe が情報源への接触を確認し、story.knowledge へ記録する'};
  q.model.choiceContract={resources:'物語物品は entities、共通の縄・松明・金は cost。戦闘作業は勝利時だけ一括確定する。',residue:'現在の所在・所持・合意・観察・到着を保存し、結末条件を検証する。',interruption:'中断・逃走・敗北中は物語時刻を止める。現場に戻ると最後の場面から再開する。'};
  for(const n of s.nodes){
   const options=n.options.map(o=>{
    const effect=[{op:'story.action',quest:q.id,action:o.action},{op:'jump',script:sid(o.to.startsWith('@')?`end.${o.to.slice(1)}`:o.to)}];
    const commands=o.combat?[{op:'battle.start',encounter:`guard_${q.region}`,on_win:effect,on_escape:[say('退路へ戻った。この作業の移動・受け渡し・支払いはまだ確定していない。')],on_lose:[say('現場から救援された。依頼を再開すると、未完了の作業からやり直せる。')]}]:effect;
    return {id:o.id,text:o.text,storyAction:{quest:q.id,action:o.action},...(o.when?{condition:o.when}:{}),requirement:[o.requirement,...Object.entries(o.cost??{}).map(([k,n])=>`${{rope:'縄',torch:'松明',gold:'G'}[k]??k} ${n}消費`),...(o.combat?['戦闘・作業と消費は勝利時に確定']:[])].filter(Boolean).join(' ／ '),commands};
   });
   options.push({id:'pause',text:'ここで中断し、同じ場面から再開する',commands:[]});
   q.scripts[sid(n.id)]={storyQuest:q.id,commands:[{op:'story.scene',quest:q.id,scene:n.id},...render(n.text),{op:'choice',options}]};
  }
  for(const [key,o] of Object.entries(q.outcomes))q.scripts[sid(`end.${key}`)]={commands:[{op:'quest.complete',quest:q.id,outcome:key},...(['informed','contract','compromise'].includes(key)?[{op:'add',target:`vars.${key}`,value:1}]:[]),say(o.text)]};
  q.scripts[sid('visit')]={commands:[{op:'if',condition:eq(ref(`flags.legacyStoryRoutes.${q.id}`),true),then:[{op:'jump',script:`${q.id}.flow.visit`}],else:[{op:'if',condition:eq(ref(`quests.${q.id}.stage`),'completed'),then:[{op:'switch',value:ref(`quests.${q.id}.outcome`),cases:Object.entries(q.outcomes).map(([k,o])=>({equals:k,commands:[say(o.text)]})),default:[]}],else:[{op:'story.init',quest:q.id},{op:'switch',value:ref(`stories.${q.id}.scene`),cases:s.nodes.map(n=>({equals:n.id,commands:[{op:'jump',script:sid(n.id)}]})),default:[{op:'jump',script:sid('entry')}]}]}]}]};
  const spot=q.locations.find(l=>l.role==='decision'),file=`data/maps/${spot.map}.json`,map=await read(file);map.objects.find(o=>o.id===spot.object).script=sid('visit');await write(file,map);
 }
 await write(file,q);quests.push(q);
}
const assets=await read('data/assets.json');for(const c of characters)assets.images[c.portrait]=`assets/images/characters/${c.id}.png`;await write('data/assets.json',assets);
await write('data/characters.json',Object.fromEntries(characters.map(({design,...c})=>[c.id,{...c,visualDesign:design}])));
game.version='1.4.0';game.storyVersion=1;game.files.databases.characters='data/characters.json';
game.migrations['1.3.2']={actors:Object.keys(await read('data/actors.json')),quests:quests.map(q=>q.id),scenarioRevision:true,preserveRecords:true};await write('data/game.json',game);
const catalog=['# シナリオ一覧','',`全 ${quests.length} 本・${quests.reduce((n,q)=>n+Object.keys(q.outcomes).length,0)} 結末。作品版 1.4.0。更新日: 2026-09-13。`,'','q001〜q010 は [シナリオモデル v1.1]('+standard.source+') と状態モデル `adv-story-state/1` に準拠。q011〜q200 は既存の v1.0 原稿・経路を維持する。作者向けの一覧のため真相と結末を含む。','','[改稿全文](SCENARIOS_Q001_Q010_V11.md) ／ [人物一覧](CHARACTERS.md) ／ [状態モデルと互換性](SCENARIO_MODEL_V11.md)',''];
const authoringNotes=notes=>notes?[`AI向け注釈: ${notes.notice}`,'','事実:','',...notes.facts.flatMap(text=>[text,''])]:[];
for(const q of quests){
 catalog.push(`## ${q.id} ${q.title}`,'',`依頼人: ${q.client}。地域: ${q.region}。${q.unlockHint}`,'',q.brief,'',`モデル: ${q.model.standard.version}。実装: [JSON](../data/quests/${q.id}.json)。場面 ${q.model.graph?.length??0}、結末 ${Object.keys(q.outcomes).length}。`,'',`固定された過去: ${q.model.world.truth}`,'',...authoringNotes(q.model.world.authoringNotes));
 for(const [k,o] of Object.entries(q.outcomes))catalog.push(`${k} — ${o.label}（${o.gold}G / ${o.xp}EXP）: ${o.text}`,'');
 catalog.push(`進行: ${q.model.progression??'各場面の選択に従う。'}`,'');
 for(const n of q.model.graph??[])catalog.push(`- ${n.id}: ${n.options.map(o=>`${o.text} → ${o.to}${o.combat?'［戦闘］':''}`).join(' / ')}`);
 catalog.push('');
}
await fs.writeFile(path.join(root,'doc/QUEST_CATALOG.md'),catalog.join('\n'));
const prose=t=>Array.isArray(t)?t.flatMap(prose):typeof t==='string'?[t]:[`［状態に応じた本文］ 条件: \`${JSON.stringify(t.when)}\``,...prose(t.yes),'［それ以外］',...prose(t.no)];
const manuscript=['# q001〜q010 改稿全文','',`準拠: [ゲームシナリオモデル v1.1](${standard.source})。原稿は authoring/stories-v11-*.mjs、人物の定義は authoring/characters.mjs。作品版 1.4.0。`,'','以下は実行データから生成した本文・選択・結果。状態条件も併記する作者向け原稿。新たな役割や物品の扱いは、この版で補完した設定であり、旧シナリオの既成事実とは区別する。',''];
for(const s of drafts){const q=quests.find(q=>q.id===s.id);manuscript.push(`## ${q.id} ${q.title}`,'',`依頼人: ${q.client}`,'',...s.past,'',...authoringNotes(s.authoringNotes),s.progression,'','| 実体 | 初期の所在・保持者 |','|---|---|');for(const [key,e] of Object.entries(s.story.entities))manuscript.push(`| ${e.character?characters.find(c=>c.id===e.character).name:key} (${key}) | ${s.story.registry[e.holder].initial} |`);manuscript.push('');for(const n of s.nodes){manuscript.push(`### ${n.id} — ${s.story.scenes[n.id].title}`,'',...prose(n.text).flatMap(t=>[t,'']));for(const o of n.options)manuscript.push(`- **${o.id}** ${o.text} → ${o.to}${o.combat?'［戦闘］':''}${o.cost?`［消費 ${JSON.stringify(o.cost)}］`:''}`);manuscript.push('');}for(const [key,o] of Object.entries(q.outcomes))manuscript.push(`### 結末 ${key} — ${o.label}`,'',o.text,'',`${o.gold}G / ${o.xp}EXP`,'');}
await fs.writeFile(path.join(root,'doc/SCENARIOS_Q001_Q010_V11.md'),manuscript.join('\n'));
const doc=['# 登場人物一覧','','更新: 2026-09-13。q001〜q010 の登場人物は安定した ID で定義し、会話場面に AIPaint 製の画像を表示する。同じリネを別人として増やさず、関所番と水門番は分ける。名無しの役割に本名を捏造せず、集団は集団実体として記載する。','','外見・服装・小道具は今回の美術設定であり、元のシナリオから確定した外見ではない。NPC は戦闘隊員へ自動加入しない。','','## q001〜q010 の実装済み人物','','| ID | 名前・役割 | 登場 | 動機 |','|---|---|---|---|'];
for(const c of characters)doc.push(`| ${c.id} | ${c.name}／${c.role} | ${c.quests.join(', ')} | ${c.goal} |`);
for(const c of characters)doc.push('',`### ${c.name} (${c.id})`,'',`![${c.name}](../assets/images/characters/${c.id}.png)`,'',c.detail,'',`[AIPaint 編集原稿](../assets/source/characters/${c.id}.paint.json) ／ [描画コマンド](../assets/source/characters/${c.id}.commands.json)`);
doc.push('','## 歴史上・物語内で言及される人物','','| 人物 | 関係 | 扱い |','|---|---|---|','| ミレの夫 | q007、弟の兄 | 故人。声の主ではない。生存 NPC の所在を持たせない。 |','| 関所番の兄 | q004 | 故人。関所番が使う資格の名義人。 |','| 棺の故人 | q008 | 遺体を物品 body として棺の内室に保持。生存 NPC として表示しない。 |','','## 既存の探索隊員','','| ID | 名前 | 役割 |','|---|---|---|');
for(const [id,c] of Object.entries(await read('data/actors.json')))doc.push(`| ${id} | ${c.name} | ${c.bio??c.role??c.class} |`);
doc.push('','## q011〜q200 の依頼人索引','','原文の依頼人表記を列挙する。同名だけで同一人物とは確定せず、各クエスト内で言及される関係者も今後の人物化対象とする。この範囲の新規肖像と所在モデルは未実装。','','| 依頼 | 依頼人（既存表記） |','|---|---|');for(const q of quests.filter(q=>q.number>10))doc.push(`| [${q.id} ${q.title}](QUEST_CATALOG.md#${q.id}-${q.title}) | ${q.client} |`);
await fs.writeFile(path.join(root,'doc/CHARACTERS.md'),doc.join('\n')+'\n');
console.log(`v1.1: ${drafts.length} stories, ${drafts.reduce((n,s)=>n+s.nodes.length,0)} scenes, ${characters.length} NPC identities; old VM arrays preserved`);
