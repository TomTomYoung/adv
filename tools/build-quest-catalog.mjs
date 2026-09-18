import {docPath,relocateDoc} from './doc-layout.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {loadContent} from '../src/core/loader.js';
import {questCatalog,questPages} from './quest-catalog.mjs';
import {questPageBundle} from './quest-page.mjs';
import {locationCatalog} from './location-catalog.mjs';

const root=path.resolve(import.meta.dirname,'..');
const data=await loadContent(file=>fs.readFile(path.join(root,file),'utf8').then(JSON.parse));
await fs.mkdir(path.join(root,'doc/scenarios'),{recursive:true});
await fs.writeFile(path.join(root,'doc',docPath('QUEST_CATALOG.md')),relocateDoc(questCatalog(data,new Date().toISOString().slice(0,10)),'QUEST_CATALOG.md'));
await fs.writeFile(path.join(root,'doc/LOCATION_CATALOG.md'),relocateDoc(locationCatalog(data),'LOCATION_CATALOG.md'));
for(const id of Object.keys(questPages))for(const [file,content] of Object.entries(questPageBundle(data,id))){
  const target=path.join(root,'doc',docPath(file));
  await fs.mkdir(path.dirname(target),{recursive:true});
  await fs.writeFile(target,relocateDoc(content,file));
}
console.log('CATALOG: q001–q002 dedicated pages and event maps; q003–q020 scripts in the 200-quest catalog');
