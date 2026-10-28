// Register adopted edition-two artwork without changing base-edition characters.
import fs from 'node:fs/promises';
import {ODDLAND_CHARACTER_ART,oddlandCharacterImages} from '../authoring/oddland-character-art.mjs';
const root=new URL('../',import.meta.url),file=new URL('data/assets.json',root);
for(const art of Object.values(ODDLAND_CHARACTER_ART))await fs.access(new URL(art.file,root));
const assets=JSON.parse(await fs.readFile(file,'utf8'));
Object.assign(assets.images,oddlandCharacterImages());
await fs.writeFile(file,JSON.stringify(assets,null,2)+'\n');
console.log(`ODDLAND CHARACTER ART: ${Object.keys(ODDLAND_CHARACTER_ART).length} dedicated images registered`);
