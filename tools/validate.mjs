import fs from 'node:fs/promises';
import path from 'node:path';
import {loadContent} from '../src/core/loader.js';
const root=path.resolve(import.meta.dirname,'..');
const data=await loadContent(file=>fs.readFile(path.join(root,file),'utf8').then(JSON.parse));
for(const file of [...Object.values(data.assets.images),...Object.values(data.assets.audio)]){const buffer=await fs.readFile(path.join(root,file));if(!buffer.length)throw Error(`Empty asset ${file}`);}
for(const [id,effect] of Object.entries(data.effects??{}))for(const track of effect.tracks)if(track.kind==='sprite'){const file=data.assets.images[track.asset];if(file.endsWith('.png')){const b=await fs.readFile(path.join(root,file));if(b.readUInt32BE(16)!==track.columns*track.cell||b.readUInt32BE(20)!==Math.ceil(track.frames/track.columns)*track.cell)throw Error(`Sprite sheet size mismatch: ${id}`);}}
if(Object.keys(data.quests).length!==100)throw Error('Expected 100 playable quests');
console.log(`VALID: ${Object.keys(data.quests).length} quests, ${Object.keys(data.maps).length} maps, ${Object.keys(data.scripts).length} scripts, all assets present`);
