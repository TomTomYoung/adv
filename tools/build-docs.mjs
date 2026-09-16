import {questEvents} from '../src/core/quest-events.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {loadContent} from '../src/core/loader.js';
import {GameEngine} from '../src/core/engine.js';
import {COMMANDS} from '../src/core/script.js';
import {EXPRESSION_OPS} from '../src/core/expression.js';
import {cellCatalogInventory} from './cell-catalog.mjs';
const root=path.resolve(import.meta.dirname,'..'),folder=path.join(root,'doc');
const read=async f=>JSON.parse(await fs.readFile(path.join(root,f),'utf8'));
const data=await loadContent(read),engine=new GameEngine(data),version=data.game.version,date=new Date().toISOString().slice(0,10);
const quests=Object.values(data.quests),count=o=>Object.keys(o??{}).length;
const files=[...new Set(['data/game.json',...Object.values(data.game.files.databases),...data.game.files.maps,...data.game.files.quests,...data.game.files.scripts])].sort();
const digest=createHash('sha256');for(const file of files){digest.update(file+'\n');digest.update(await fs.readFile(path.join(root,file)));}
const snapshot={updated:date,contentVersion:version,contentSha256:digest.digest('hex'),method:'game manifestの配布JSONを読み込み、ID数と現在のoutcomes/model.graphを集計。旧スクリプトを含む。story.scenesは互換場面名も含む。',counts:Object.fromEntries(['dungeons','maps','quests','scripts','actors','characters','jobs','skills','buffs','fieldAbilities','items','enemies','encounters','sounds','effects','statuses'].map(k=>[k,count(data[k])])),questOutcomes:quests.reduce((n,q)=>n+count(q.outcomes),0),questGraphScenes:quests.reduce((n,q)=>n+(q.model.graph?.length??0),0),typedStoryQuests:quests.filter(q=>q.story).length,typedStoryScenesIncludingAliases:quests.reduce((n,q)=>n+count(q.story?.scenes),0),questEvents:questEvents(data).length,questEventPlacements:questEvents(data).filter(e=>e.trigger!=='action').reduce((n,e)=>n+e.points.length,0),questObservations:questEvents(data).filter(e=>e.note).length,commands:[...COMMANDS],operators:[...EXPRESSION_OPS],migrationVersions:Object.keys(data.game.migrations),assets:{images:count(data.assets.images),audio:count(data.assets.audio)},files};
await fs.writeFile(path.join(folder,'DATA_SNAPSHOT.json'),JSON.stringify(snapshot,null,2)+'\n');
async function section(name,key,text){const file=path.join(folder,name),begin=`<!-- generated:${key} -->`,end=`<!-- /generated:${key} -->`,block=`${begin}\n\n${text.trim()}\n\n${end}`;let s=await fs.readFile(file,'utf8');if(s.includes(begin)){const a=s.indexOf(begin),b=s.indexOf(end,a);if(b<0)throw Error(`Unclosed documentation section: ${name}`);s=s.slice(0,a)+block+s.slice(b+end.length);}else s=s.trimEnd()+'\n\n'+block+'\n';await fs.writeFile(file,s);}
const names=ids=>ids.map(id=>data.skills[id]?.name??data.fieldAbilities[id]?.name??id).join('・');
const stats=v=>Object.entries(v).map(([k,n])=>`${k.toUpperCase()} ${n}`).join(' / ');
const jobs=[`## 現行${count(data.jobs)}職の定義`,'',`作品版${version}の data/jobs.json から生成。習得Lv・API・材料のある技能は使用時に個別検査します。`,''];
for(const j of Object.values(data.jobs)){jobs.push(`### ${j.name} (${j.id})`,'',j.role,'',`成長/Lv：${stats(j.growth)}。現在職の加算：${Object.keys(j.stats).length?stats(j.stats):'なし'}。`,`装備：${Object.entries(j.equipment).map(([slot,types])=>`${slot}＝${types.join('・')}`).join(' / ')}。`,`習得：${j.grants.map(g=>`Lv${g.level} ${names([g.skill])} (${g.api})`).join(' / ')}。`,`特性：${JSON.stringify(j.passives)}。${j.limitation}`,'');}
jobs.push(`## 探索特技${count(data.fieldAbilities)}定義`,'');for(const [id,a] of Object.entries(data.fieldAbilities))jobs.push(`### ${a.name} (${id})`,'',`${a.description} API: ${a.api}。使用場所: ${(a.modes??[]).join(' / ')}。`,'');await section('JOB_SYSTEM.md','jobs',jobs.join('\n'));
const actors=['# 仲間一覧と酒場の編成','',`更新日: ${date}。作品版${version}。仲間${count(data.actors)}人から1〜${data.system.maxParty}人を編成します。初期隊は${data.game.initial.members.map(id=>data.actors[id].name).join('・')}です。`,'','## 編成と状態','','町の酒場で加入・待機・入れ替えを行います。生存者を最低1人残し、会話・戦闘中は編成しません。HP・MP・状態異常・装備・職業と成長履歴を保持し、編成変更だけでは回復しません。NPCの人物一覧は[CHARACTERS.md](CHARACTERS.md)に分けます。','','技能は現在職とレベル、装備、貸出、固有環境から判定します。下記はLv1・初期職・初期装備の状態です。人物定義に残る旧skills配列だけを現在の習得技能として表示しません。','','## 現行の仲間',''];
for(const [id,a] of Object.entries(data.actors))actors.push(`### ${a.name} (${id})`,'',`![${a.name}](../${data.assets.images[a.portrait]})`,'',a.bio,`人物の役割：${a.class}／${a.role}。初期職：${data.jobs[a.initialJob].name}。`,`初期能力：${stats(engine.stats(id))}。`,`初期戦闘技能：${names(engine.skills(id))}。`,'');
actors.push('## 編集と保存','','人物・初期能力・肖像の正本は authoring/entities.json、職業は authoring/jobs.json です。職業別の成長と使用可能な探索特技は[JOB_SYSTEM.md](JOB_SYSTEM.md)、移行全体は[SPEC.md](SPEC.md)を参照してください。既存の5人・10人セーブは対応版の人物集合で検証してから不足する仲間を補います。');await fs.writeFile(path.join(folder,'COMPANION_CATALOG.md'),actors.join('\n')+'\n');
const enemies=[`## 現行の敵${count(data.enemies)}定義`,'',`作品版${version}の data/enemies.json から生成。画像IDを共有する敵も含みます。基礎数値にダンジョンの敵倍率や戦闘補正が作用します。`,''];
for(const [id,e] of Object.entries(data.enemies)){const encounters=Object.entries(data.encounters).filter(([,c])=>(c.enemies??[]).some(v=>typeof v==='string'?v===id:v.id===id||v.enemy===id)).map(([id])=>id);enemies.push(`### ${e.name} (${id})`,'',`基礎能力：${stats(e.stats)}。報酬：${e.rewards?.gold??0}G / ${e.rewards?.xp??0}EXP。`,`代表技能：${names([e.skill??'attack'])}。属性倍率：${JSON.stringify(e.resist??{})}。`,`画像：[${e.sprite}](../${data.assets.images[e.sprite]})。出現定義：${encounters.join('・')||'data/encounters.json を参照'}。`,'');}await section('MONSTER_CATALOG.md','enemies',enemies.join('\n'));
const dungeons=['## 配布データの構成',''];for(const dungeon of Object.values(data.dungeons))dungeons.push(`${dungeon.name} (${dungeon.id})：${dungeon.maps.length}マップ。部品：${Object.entries(dungeon.systems).map(([id,s])=>`${id}=${s.use}${s.enabled===false?'（無効）':''}`).join(' / ')}。現地調査：${questEvents(data).filter(e=>e.dungeon===dungeon.id&&e.note).map(s=>`${s.title} → ${s.quest}`).join(' / ')||'なし'}。`,'');await section('DUNGEON_CATALOG.md','dungeons',dungeons.join('\n'));
await section('SCRIPT_REFERENCE.md','commands',`## 実装との照合用一覧\n\n${COMMANDS.size}命令：${[...COMMANDS].map(v=>'`'+v+'`').join(' / ')}。\n\n${EXPRESSION_OPS.size}式演算子：${[...EXPRESSION_OPS].map(v=>'`'+v+'`').join(' / ')}。`);
await section('CELL_CATALOG.md','cell-inventory',cellCatalogInventory(data));
const observations=[];
for(const e of questEvents(data).filter(e=>e.note))observations.push(`### ${data.dungeons[e.dungeon]?.name??e.quest} / ${e.title}`,'',`正本: [${e.quest}](../data/quests/${e.quest}.json) の events.${e.id}。調査地点: ${e.points.map(p=>`${p.map} (${p.x}, ${p.y})`).join(' / ')}。`,'',e.note.text,'',`記録の表示条件: \`${JSON.stringify(e.note.when)}\`。本文・観察条件・選択肢は同じJSONの \`${e.script}\`。`,'');
await section('DUNGEON_ART_AND_SCENARIOS.md','quest-observations',observations.join('\n'));
// Update metadata only: authored quest prose must survive documentation-only builds.
for(const name of ['QUEST_CATALOG.md','SCENARIOS_Q001_Q010_V11.md']){const f=path.join(folder,name);let s=await fs.readFile(f,'utf8');s=s.replace(/作品版 \d+\.\d+\.\d+。/g,`作品版 ${version}。`).replace(/更新日: \d{4}-\d{2}-\d{2}。/g,`更新日: ${date}。`);await fs.writeFile(f,s);}
// Plain prose/numbered lists are the repository owner's preferred documentation format.
export function plainMarkdown(source){
 const lines=source.split('\n'),out=[];let code=false;
 for(let i=0;i<lines.length;i++){
  let line=lines[i];if(/^\s*```/.test(line)){code=!code;out.push(line);continue;}if(code){out.push(line);continue;}
  if(/^\s*\|/.test(line)&&/^\s*\|[\s:|\-]+\|?\s*$/.test(lines[i+1]??'')){
   const split=v=>v.trim().replace(/^\||\|$/g,'').split(/(?<!\\)\|/).map(v=>v.trim()),header=split(line);i++;
   while(/^\s*\|/.test(lines[i+1]??'')){const cells=split(lines[++i]);out.push(cells.map((v,n)=>`${header[n]??''}：${v}`).join(' / ').replaceAll('**',''),'');}continue;
  }
  line=line.replaceAll('**','').replace(/^(\s*)-\s+/, (_match,space)=>space+'1. ');out.push(line);
 }
 return out.join('\n').replace(/\n{3,}/g,'\n\n').trimEnd()+'\n';
}
for(const file of (await fs.readdir(folder)).filter(f=>f.endsWith('.md'))){const p=path.join(folder,file);await fs.writeFile(p,plainMarkdown(await fs.readFile(p,'utf8')));}
console.log(`DOCS: ${snapshot.counts.quests} quests, ${snapshot.questOutcomes} endings, ${snapshot.counts.dungeons} dungeons; authored prose preserved`);
