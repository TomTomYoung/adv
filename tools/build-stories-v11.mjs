import {characterCatalog} from './character-catalog.mjs';
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
await fs.mkdir(path.join(root,'doc/scenarios'),{recursive:true});
const characterData={characters:Object.fromEntries(characters.map(c=>[c.id,c])),quests:Object.fromEntries(quests.map(q=>[q.id,q])),actors:await read('data/actors.json'),assets};
await fs.writeFile(path.join(root,'doc',docPath('CHARACTERS.md')),relocateDoc(characterCatalog(characterData),'CHARACTERS.md'));
console.log(`v1.1: ${drafts.length} stories, ${drafts.reduce((n,s)=>n+s.nodes.length,0)} scenes, ${characters.length} NPC identities; authored revisions generated`);
