// Actual game projection and renderer in a software Canvas; not browser layout QA.
import fs from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {loadContent} from '../src/core/loader.js';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {paintDungeon} from '../src/view/dungeon.js';
import {beginFeedback} from '../src/core/feedback.js';
const root=path.resolve(import.meta.dirname,'..'),require=createRequire(import.meta.url);
const {createCanvas,Image}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/@napi-rs/canvas':'@napi-rs/canvas');
const pending=[];
globalThis.Image=class extends Image{
  set src(value){pending.push(new Promise((resolve,reject)=>{const loaded=this.onload;this.onload=()=>{loaded?.();resolve();};this.onerror=reject;}));super.src=readFileSync(path.join(root,value));}
  get src(){return super.src;}
};
const data=await loadContent(file=>fs.readFile(path.join(root,file),'utf8').then(JSON.parse)),g=new GameEngine(data);
while(g.state.waiting?.type==='text')g.dispatch({type:'advance'});
g.dispatch({type:'travel',dungeon:'region_1'});
// Arrange a drained compartment for inspection. Gameplay reachability is tested separately.
for(const key of Object.keys(g.state.dungeons.persistent.region_1.systems.water.controls))g.state.dungeons.persistent.region_1.systems.water.controls[key]=false;
const output=process.argv[2]??path.join(root,'doc/dungeons/screenshots/waterway-2026-09-26.webp');
const contact=createCanvas(1600,880),ctx=contact.getContext('2d');ctx.fillStyle='#101820';ctx.fillRect(0,0,1600,880);
const canvas=createCanvas(800,400);canvas.isConnected=true;canvas.ownerDocument={createElement:()=>createCanvas(128,128)};
const shots=[
  {map:'region_1_f1',x:1,y:5,facing:'east',label:'Shallow basin / walkable / 0.3 m'},
  {map:'region_1_canal_a',x:1,y:3,facing:'east',label:'Deep waterway / blocked / 1.5 m'},
  {map:'region_1_gatehouse',x:5,y:5,facing:'east',label:'Bottomless basin / blocked'}
];
for(const [i,shot] of shots.entries()){
  beginFeedback(g);g.teleport(shot.map,shot.x,shot.y,shot.facing);
  const model=projectGame(g);paintDungeon(canvas,model.dungeon,null);await Promise.all(pending);paintDungeon(canvas,model.dungeon,null);
  const x=i%2*800,y=Math.floor(i/2)*440;ctx.fillStyle='#e2e7e8';ctx.font='22px sans-serif';ctx.fillText(shot.label,x+14,y+29);ctx.drawImage(canvas,x,y+40);
}
const interior=new Image();interior.src=await fs.readFile(path.join(root,data.assets.images.location_checkpoint));await interior.decode();
ctx.fillStyle='#e2e7e8';ctx.fillText('Checkpoint / shared location background',814,469);
ctx.drawImage(interior,0,0,interior.width,interior.width/2,800,480,800,400);
await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,await contact.encode('webp',88));
console.log(`SOFTWARE CANVAS: 3 authored waterway views and checkpoint background: ${output}`);
