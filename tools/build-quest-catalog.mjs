import fs from 'node:fs/promises';
import path from 'node:path';
import {loadContent} from '../src/core/loader.js';
import {questCatalog} from './quest-catalog.mjs';

const root=path.resolve(import.meta.dirname,'..');
const data=await loadContent(file=>fs.readFile(path.join(root,file),'utf8').then(JSON.parse));
await fs.writeFile(path.join(root,'doc/QUEST_CATALOG.md'),questCatalog(data,new Date().toISOString().slice(0,10)));
console.log('CATALOG: current q001–q020 scripts integrated into the 200-quest catalog');
