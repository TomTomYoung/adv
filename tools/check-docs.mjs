import {docPath,relocateDoc,currentMarkdown,scenarioDocs,uiDocs} from './doc-layout.mjs';
import {catalogContentHash,questPages} from './quest-catalog.mjs';
import {questPageBundle} from './quest-page.mjs';
import {eventCatalog} from './event-catalog.mjs';
import {locationCatalog,questPlaces} from './location-catalog.mjs';
import {questEvents} from '../src/core/quest-events.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {loadContent} from '../src/core/loader.js';
import {COMMANDS} from '../src/core/script.js';
import {EXPRESSION_OPS} from '../src/core/expression.js';
const root=path.resolve(import.meta.dirname,'..'),folder=path.join(root,'doc');
const read=async file=>JSON.parse(await fs.readFile(path.join(root,file),'utf8'));
const errors=[],check=(ok,message)=>{if(!ok)errors.push(message);};
const current=(await currentMarkdown(folder)).map(f=>'doc/'+f);
for(const name of [...scenarioDocs,...uiDocs]){
 check(!current.includes('doc/'+name),`doc/${name}: obsolete output; use doc/${docPath(name)}`);
}
const manifests=[];
for(const entry of await fs.readdir(path.join(folder,'legacy'),{withFileTypes:true}))if(entry.isDirectory())manifests.push(`doc/legacy/${entry.name}/manifest.json`);
let archived=0;
for(const file of manifests){const manifest=await read(file);for(const entry of manifest.entries){
 const bytes=await fs.readFile(path.join(root,entry.file));
 check(entry.date===manifest.archivedAt&&entry.file.includes('/'+entry.date+'/'),`${file}: archive date mismatch`);
 check(Boolean(entry.reason)&&['move','snapshot'].includes(entry.operation),`${file}: missing disposition`);
 check(createHash('sha256').update(bytes).digest('hex')===entry.originalSha256,`${entry.file}: original bytes changed`);archived++;
}}
// Archived bodies deliberately retain their original relative links. Check their indexes,
// while the manifests above check the exact original content, including those links.
const indexes=['doc/legacy/README.md',...manifests.map(f=>path.posix.join(path.posix.dirname(f),'README.md'))];
let links=0;
for(const file of [...current,...indexes,'README.md']){
 const source=(await fs.readFile(path.join(root,file),'utf8')).replace(/```[^\n]*\n[\s\S]*?```/g,'');
 const targets=[...source.matchAll(/\[[^\]\n]*\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g)].map(m=>m[1]);
 targets.push(...[...source.matchAll(/(?:src|href)=["']([^"']+)["']/g)].map(m=>m[1]));
 for(const target of targets){if(/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(target))continue;
  const [filePart,fragment]=target.split('#'),relative=decodeURIComponent(filePart.split('?')[0]);
  const resolved=path.resolve(root,path.dirname(file),relative||path.basename(file));links++;
  let stat;try{stat=await fs.stat(resolved);}catch{errors.push(`${file}: broken link ${target}`);continue;}
  if(fragment&&stat.isFile()&&resolved.endsWith('.md')){
   const content=await fs.readFile(resolved,'utf8');
   const slugs=[...content.matchAll(/^#{1,6}\s+(.+)$/gm)].map(m=>m[1].toLowerCase().replace(/[^\p{L}\p{N}\p{M}\s_-]/gu,'').trim().replace(/\s/g,'-'));
   check(slugs.includes(decodeURIComponent(fragment)),`${file}: missing heading ${target}`);
  }
 }
}
const data=await loadContent(read),snapshot=await read('doc/DATA_SNAPSHOT.json'),count=o=>Object.keys(o??{}).length;
check(await fs.readFile(path.join(folder,docPath('EVENT_CATALOG.md')),'utf8')===relocateDoc(eventCatalog(data),'EVENT_CATALOG.md'),'EVENT_CATALOG: generated inventory differs');
check(snapshot.contentVersion===data.game.version,'DATA_SNAPSHOT: content version differs');
const catalog=await fs.readFile(path.join(folder,docPath('QUEST_CATALOG.md')),'utf8');
check(catalog.includes(`<!-- quest-catalog-source:${catalogContentHash(data)} -->`),'QUEST_CATALOG: implementation changed; review catalog edits, then run npm run build:catalog');
check(await fs.readFile(path.join(folder,'LOCATION_CATALOG.md'),'utf8')===relocateDoc(locationCatalog(data),'LOCATION_CATALOG.md'),'LOCATION_CATALOG: location references differ');
for(const q of Object.values(data.quests)){
 const file=questPages[q.id],source=file?await fs.readFile(path.join(folder,docPath(file)),'utf8'):catalog;
 for(const line of questPlaces(data,q))check(source.includes(relocateDoc(line,file??'QUEST_CATALOG.md')),`${file??'QUEST_CATALOG'}: ${q.id} placement reference differs`);
 if(file){
  check(catalog.includes(`](${file})`),`QUEST_CATALOG: missing ${q.id} dedicated-page link`);
  for(const [name,expected] of Object.entries(questPageBundle(data,q.id)))check(await fs.readFile(path.join(folder,docPath(name)),'utf8')===relocateDoc(expected,name),`${name}: implementation or map differs; review edits before npm run build:catalog`);
 }
}
for(const [key,n] of Object.entries(snapshot.counts))check(n===count(data[key]),`DATA_SNAPSHOT: ${key} count differs`);
const quests=Object.values(data.quests);
check(snapshot.questOutcomes===quests.reduce((n,q)=>n+count(q.outcomes),0),'DATA_SNAPSHOT: endings differ');
check(snapshot.questGraphScenes===quests.reduce((n,q)=>n+(q.model.graph?.length??0),0),'DATA_SNAPSHOT: graph scenes differ');
check(snapshot.typedStoryQuests===quests.filter(q=>q.story).length,'DATA_SNAPSHOT: story count differs');
check(snapshot.typedStoryScenesIncludingAliases===quests.reduce((n,q)=>n+count(q.story?.scenes),0),'DATA_SNAPSHOT: story aliases differ');
check(snapshot.questEvents===questEvents(data).length,'DATA_SNAPSHOT: quest events differ');
check(snapshot.questObservations===questEvents(data).filter(e=>e.note).length,'DATA_SNAPSHOT: quest observations differ');
check(snapshot.questEventPlacements===questEvents(data).filter(e=>!['action','auto'].includes(e.trigger)).reduce((n,e)=>n+e.points.length,0),'DATA_SNAPSHOT: quest placements differ');
for(const [label,actual] of [['commands',[...COMMANDS]],['operators',[...EXPRESSION_OPS]],['migrationVersions',Object.keys(data.game.migrations)]])check(JSON.stringify(snapshot[label])===JSON.stringify(actual),`DATA_SNAPSHOT: ${label} differ`);
const files=[...new Set(['data/game.json',...Object.values(data.game.files.databases),...data.game.files.maps,...data.game.files.quests,...data.game.files.scripts])].sort();
check(JSON.stringify(files)===JSON.stringify(snapshot.files),'DATA_SNAPSHOT: manifest files differ');
const digest=createHash('sha256');for(const file of files){digest.update(file+'\n');digest.update(await fs.readFile(path.join(root,file)));}
check(snapshot.contentSha256===digest.digest('hex'),'DATA_SNAPSHOT: content changed; run npm run build:docs');
for(const key of ['images','audio'])check(snapshot.assets[key]===count(data.assets[key]),`DATA_SNAPSHOT: ${key} asset count differs`);
for(const file of current){
 if(file==='doc/README.md')continue;
 const indexFile=path.posix.join(path.posix.dirname(file.endsWith('/README.md')?path.posix.dirname(file):file),'README.md');
 const index=await fs.readFile(path.join(root,indexFile),'utf8');
 check(index.includes(`](${path.posix.relative(path.posix.dirname(indexFile),file)})`),`${indexFile}: missing ${file}`);
}
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}else console.log(`DOCS OK: ${current.length} current Markdown files, ${links} local links, ${archived} original archives, data snapshot matches`);
