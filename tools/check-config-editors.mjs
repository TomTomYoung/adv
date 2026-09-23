import fs from 'node:fs/promises';
import path from 'node:path';
import {configArtifacts} from './build-config-editors.mjs';
import {createValidator} from '../config/shared/validation.js';
import {parseJSON,serialize} from '../config/shared/model.js';
const root=path.resolve(import.meta.dirname,'..'),read=async file=>JSON.parse(await fs.readFile(path.join(root,file),'utf8'));
const {entries,artifacts}=await configArtifacts(root),validate=createValidator(read),errors=[];
for(const [file,expected] of artifacts){const actual=await fs.readFile(path.join(root,'config',file),'utf8').catch(()=>null);if(actual!==expected)errors.push(`config/${file}: npm run build:configで再生成してください。`);}
for(const entry of entries){const value=parseJSON(await fs.readFile(path.join(root,'config',entry.file),'utf8'));errors.push(...(await validate(entry,value)).map(e=>`${entry.file}: ${e}`));if(serialize(parseJSON(serialize(value)))!==serialize(value))errors.push(`${entry.file}: JSON出力が安定しません。`);}
for(const dir of ['','dungeons','quests'])for(const name of await fs.readdir(path.join(root,'config',dir)))if(name.endsWith('.html')&&name!=='index.html'&&!artifacts.has(path.posix.join(dir,name)))errors.push(`config/${dir}/${name}: 対応JSONのない編集HTMLです。`);
if(errors.length)throw Error(errors.join('\n'));
console.log(`CONFIG VALID: ${entries.length} sources, ${entries.length} matching HTML pages, schemas and stable JSON output`);
