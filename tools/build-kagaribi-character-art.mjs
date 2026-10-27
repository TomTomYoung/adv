// Refresh only the adopted artwork bindings; do not rebuild older story versions.
import fs from 'node:fs/promises';
import {KAGARIBI_CHARACTER_ART,kagaribiCharacterArt,kagaribiCharacterImages} from '../authoring/kagaribi-character-art.mjs';
const root=new URL('../',import.meta.url);
const read=async file=>JSON.parse(await fs.readFile(new URL(file,root),'utf8'));
const characters=await read('data/characters.json'),assets=await read('data/assets.json');
for(const [id,art] of Object.entries(KAGARIBI_CHARACTER_ART)){
  if(!characters[id])throw new Error(`Missing character ${id}`);
  await fs.access(new URL(art.file,root));
  Object.assign(characters[id],kagaribiCharacterArt(id));
}
Object.assign(assets.images,kagaribiCharacterImages());
for(const [file,data] of [['data/characters.json',characters],['data/assets.json',assets]])await fs.writeFile(new URL(file,root),JSON.stringify(data,null,2)+'\n');
console.log(`CHARACTER ART: ${Object.keys(KAGARIBI_CHARACTER_ART).length} dedicated images connected`);
