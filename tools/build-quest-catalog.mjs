import fs from 'node:fs/promises';
import path from 'node:path';
import {loadContent} from '../src/core/loader.js';
import {questCatalog,questPages} from './quest-catalog.mjs';
import {questPageBundle} from './quest-page.mjs';
import {locationCatalog} from './location-catalog.mjs';

const root=path.resolve(import.meta.dirname,'..');
const data=await loadContent(file=>fs.readFile(path.join(root,file),'utf8').then(JSON.parse));
await fs.writeFile(path.join(root,'doc/QUEST_CATALOG.md'),questCatalog(data,new Date().toISOString().slice(0,10)));
await fs.writeFile(path.join(root,'doc/LOCATION_CATALOG.md'),locationCatalog(data));
for(const id of Object.keys(questPages))for(const [file,content] of Object.entries(questPageBundle(data,id))){
  const target=path.join(root,'doc',file);
  await fs.mkdir(path.dirname(target),{recursive:true});
  await fs.writeFile(target,content);
}
console.log('CATALOG: q001 dedicated page and event map; q002–q020 scripts in the 200-quest catalog');
