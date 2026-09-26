import {beginFeedback} from '../src/core/feedback.js';
// Optional software Canvas QA. This is not a real-browser/layout test.
import fs from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadContent} from '../src/core/loader.js';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {paintDungeon} from '../src/view/dungeon.js';
const require=createRequire(import.meta.url),root=path.resolve(import.meta.dirname,'..');
const {createCanvas,Image}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/@napi-rs/canvas':'@napi-rs/canvas');
const pending=[];
globalThis.Image=class extends Image{set src(value){const promise=new Promise((resolve,reject)=>{const onload=this.onload,onerror=this.onerror;this.onload=()=>{onload?.();resolve();};this.onerror=e=>{onerror?.();reject(e);};});pending.push(promise);super.src=readFileSync(path.join(root,value));}get src(){return super.src;}};
const data=await loadContent(f=>fs.readFile(path.join(root,f),'utf8').then(JSON.parse)),g=new GameEngine(data);
while(g.state.waiting?.type==='text')g.dispatch({type:'advance'});
const m=data.maps.region_2_f1;m.objects=[];m.encounterRate=0;
const ids=['shallow_depression','deep_depression','bottomless_depression','shallow_depression_water','deep_depression_water','bottomless_depression_water'];
const shapes={single:[[4,4]],pair:[[3,4],[4,4]],square:[[3,3],[4,3],[3,4],[4,4]],elbow:[[3,3],[3,4],[4,4]],mixed:[[3,3],[4,3],[5,3],[3,4],[4,4],[5,4]]};
const positions={north:[4,6],east:[1,4],south:[4,1],west:[6,4]},folder=process.argv[2]??'/tmp/adv-depressions';await fs.mkdir(folder,{recursive:true});
const canvas=createCanvas(800,400);canvas.isConnected=true;canvas.ownerDocument={createElement:()=>createCanvas(128,128)};
const contact=createCanvas(1600,1320),ctx=contact.getContext('2d');ctx.fillStyle='#101a20';ctx.fillRect(0,0,1600,1320);
const hashes=new Set();let frames=0;
for(const [i,id] of ids.entries())for(const [shape,points] of Object.entries(shapes))for(const [facing,[x,y]] of Object.entries(positions)){
 const rows=Array.from({length:9},(_,y)=>Array.from({length:9},(_,x)=>!x||!y||x===8||y===8?'W':'F'));
 for(const [x,y] of points)rows[y][x]=String(shape==='mixed'?(x-3)+(id.endsWith('_water')?3:0):i);
 m.cells={legend:{W:'stone_wall',F:'stone_floor',...Object.fromEntries(ids.map((id,i)=>[i,id]))},rows:rows.map(row=>row.join('')),overrides:{}};
 m.tiles=m.cells.rows.map(row=>[...row].map(c=>data.cellTypes[m.cells.legend[c]].passage).join(''));beginFeedback(g);g.teleport(m.id,x,y,facing);
 const model=projectGame(g);model.dungeon.objects=[];for(const row of model.dungeon.cells)for(const c of row)c.illumination=8;
 const start=performance.now();paintDungeon(canvas,model.dungeon,null);await Promise.all(pending);paintDungeon(canvas,model.dungeon,null);
 const buffer=await canvas.encode('png');assert.ok(buffer.length>5000);frames++;
 if(shape==='square'&&facing==='north'){
  hashes.add(createHash('sha256').update(buffer).digest('hex'));
  const cx=(i<3?0:800),cy=(i%3)*440;ctx.fillStyle='#e0e7e4';ctx.font='22px sans-serif';ctx.fillText(id,cx+12,cy+29);ctx.drawImage(canvas,cx,cy+40);
 }
 if(shape==='mixed'||shape==='square')await fs.writeFile(path.join(folder,`${id}-${shape}-${facing}.png`),buffer);
 if(shape==='single'&&facing==='north')console.log(`${id}: ${Math.round(performance.now()-start)} ms including PNG encode`);
}
await fs.writeFile(path.join(folder,'contact.png'),await contact.encode('png'));assert.equal(hashes.size,6);
console.log(`SOFTWARE CANVAS: ${frames} frames (6 types × 5 shapes × 4 directions); six distinct images; ${folder}/contact.png`);
