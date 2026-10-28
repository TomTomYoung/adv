import fs from 'node:fs/promises';
import {RELOCATED_CHARACTER_ART,relocatedCharacterImages} from '../authoring/relocated-character-art.mjs';
const root=new URL('../',import.meta.url),file=new URL('data/assets.json',root);
for(const art of Object.values(RELOCATED_CHARACTER_ART))await fs.access(new URL(art.file,root));
const assets=JSON.parse(await fs.readFile(file,'utf8'));
Object.assign(assets.images,relocatedCharacterImages());
await fs.writeFile(file,JSON.stringify(assets,null,2)+'\n');
console.log(`RELOCATED CHARACTER ART: ${Object.keys(RELOCATED_CHARACTER_ART).length} dedicated images registered`);
