import fs from 'node:fs';
import zlib from 'node:zlib';
import {createHash} from 'node:crypto';
import {PaintCore} from './vendor/AIPaint/src/core.js';
import {MusicCore,blankProject,newTrack} from './vendor/AIMusic/src/core.mjs';
import {renderPCM,encodeWAV,encodeMIDI} from './vendor/AIMusic/src/audio.mjs';
const out=new URL('./generated/',import.meta.url);
fs.mkdirSync(out,{recursive:true});
const write=(name,data)=>fs.writeFileSync(new URL(name,out),data);
const sha=b=>createHash('sha256').update(b).digest('hex');
const inventory=[];
function save(name,data){write(name,data);inventory.push({file:name,bytes:Buffer.byteLength(data),sha256:sha(data)});}
// The PNG wrapper only encodes PaintCore.composite() bytes. All drawing is done by AIPaint.
const crcTable=Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function crc32(b){let n=0xffffffff;for(const v of b)n=crcTable[(n^v)&255]^(n>>>8);return (n^0xffffffff)>>>0;}
function chunk(type,data){const t=Buffer.from(type),n=Buffer.alloc(4),c=Buffer.alloc(4);n.writeUInt32BE(data.length);c.writeUInt32BE(crc32(Buffer.concat([t,data])));return Buffer.concat([n,t,data,c]);}
function png({width,height,data}){const h=Buffer.alloc(13);h.writeUInt32BE(width);h.writeUInt32BE(height,4);h[8]=8;h[9]=6;const raw=Buffer.alloc((width*4+1)*height);for(let y=0;y<height;y++)raw.set(data.subarray(y*width*4,(y+1)*width*4),y*(width*4+1)+1);return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',h),chunk('IDAT',zlib.deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);}
let state;
function begin(name,width,height){state={name,width,height,core:new PaintCore({documentId:name,width,height}),commands:[],batches:[],layer:'ink'};layer('ink');}
function flush(){if(!state.commands.length)return;const batch={documentId:state.name,batchId:`batch-${state.batches.length}`,expectedRevision:state.core.getState().revision,commands:state.commands};state.core.applyBatch(batch);state.batches.push(batch);state.commands=[];}
function cmd(c){state.commands.push(c);if(state.commands.length>=650)flush();}
function layer(name){state.layer=name;cmd({type:'layer.add',id:name,name});}
const rgba=c=>c.length===7?c+'ff':c;
const rect=(x,y,w,h,c)=>cmd({type:'shape.rect',layerId:state.layer,x:Math.round(x),y:Math.round(y),width:Math.max(1,Math.round(w)),height:Math.max(1,Math.round(h)),fill:rgba(c)});
const line=(x,y,x2,y2,c,size=1)=>cmd({type:'shape.line',layerId:state.layer,x:Math.round(x),y:Math.round(y),x2:Math.round(x2),y2:Math.round(y2),color:rgba(c),size});
const ellipse=(x,y,w,h,c)=>cmd({type:'shape.ellipse',layerId:state.layer,x:Math.round(x),y:Math.round(y),width:Math.round(w),height:Math.round(h),fill:rgba(c)});
function poly(points,c){const min=Math.ceil(Math.min(...points.map(p=>p[1]))),max=Math.floor(Math.max(...points.map(p=>p[1])));for(let y=min;y<=max;y++){const hits=[];for(let i=0;i<points.length;i++){let a=points[i],b=points[(i+1)%points.length];if((a[1]<=y&&b[1]>y)||(b[1]<=y&&a[1]>y))hits.push(a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]));}hits.sort((a,b)=>a-b);for(let j=0;j<hits.length;j+=2)if(hits[j+1]>=hits[j])line(Math.ceil(hits[j]),y,Math.floor(hits[j+1]),y,c);}}
function finish(){flush();const im=state.core.composite();save(state.name+'.png',png(im));save(state.name+'.paint.json',JSON.stringify(state.core.exportProject()));save(state.name+'.paint.commands.json',JSON.stringify({documentId:state.name,width:state.width,height:state.height,batches:state.batches}));return im;}
let seed=78231;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
function torch(x,y,s=1){ellipse(x-16*s,y-15*s,32*s,38*s,'#b77c3610');ellipse(x-11*s,y-9*s,22*s,27*s,'#dd98451e');rect(x-2*s,y+6*s,4*s,16*s,'#0b0f11');rect(x-s,y+7*s,2*s,13*s,'#745239');poly([[x-5*s,y+7*s],[x-7*s,y+2*s],[x-2*s,y-8*s],[x,y-14*s],[x+3*s,y-5*s],[x+6*s,y+3*s],[x+4*s,y+7*s]],'#bc592a');poly([[x-3*s,y+6*s],[x-4*s,y+2*s],[x,y-10*s],[x+3*s,y],[x+3*s,y+5*s]],'#e4a346');poly([[x-1*s,y+5*s],[x-2*s,y+1*s],[x+1*s,y-4*s],[x+2*s,y+5*s]],'#f6d899');rect(x-5*s,y+7*s,10*s,2*s,'#49362c');}
// A first-person corridor, restrained 16-bit palette, with nested masonry and amber torches.
begin('dungeon-corridor',320,180);
rect(0,0,320,180,'#050c10');
poly([[0,0],[320,0],[203,43],[117,43]],'#0a1418');
poly([[0,180],[320,180],[202,122],[118,122]],'#182727');
for(let y=125;y<180;y++){const v=Math.floor((y-125)/10);line(0,y,319,y,['#162323','#182728','#1b2b2c','#1e2f2f','#203131','#223334'][v]);}
// Reflecting flagstones.
for(const y of [126,132,141,155,176])line(0,y,319,y,'#0d1b20');
for(const x of [-130,-30,70,160,250,350,450])line(160+(x-160)*.15,123,x,180,'#101e22');
for(let i=0;i<140;i++){const x=Math.floor(rand()*320),y=129+Math.floor(rand()*51);line(x,y,x+2+rand()*9,y,rand()>.6?'#40504940':'#07151b50');}
// Side-wall stone courses follow perspective into the distant arch.
function wall(side){const mirror=p=>side===1?p.map(([x,y])=>[320-x,y]):p;const inner=118,top=x=>43*x/118,bottom=x=>180-(58*x/118);poly(mirror([[0,0],[118,43],[118,122],[0,180]]),'#132526');
const xs=[0,32,65,89,106,118];for(let col=0;col<xs.length-1;col++){const l=xs[col],r=xs[col+1];for(let row=0;row<7;row++){const yt=top(l)+(bottom(l)-top(l))*row/7,yb=top(l)+(bottom(l)-top(l))*(row+1)/7,zt=top(r)+(bottom(r)-top(r))*row/7,zb=top(r)+(bottom(r)-top(r))*(row+1)/7;let p=[[l+1,yt+1],[r-1,zt+1],[r-1,zb-2],[l+1,yb-2]];poly(mirror(p),['#203333','#213535','#1a2e30','#243837','#1d3030'][(row*3+col+side)%5]);const pp=mirror([[l+2,yt+2],[r-2,zt+2]]);line(...pp[0],...pp[1],'#39504a90');const cp=mirror([[l+4,(yt+yb)/2],[l+8,(yt+yb)/2+2],[l+7,(yt+yb)/2+6]]);if(col<3&&row%2===1){line(...cp[0],...cp[1],'#0b1d21');line(...cp[1],...cp[2],'#0b1d21');}}}
for(let i=0;i<140;i++){const x=2+rand()*113,y=top(x)+4+rand()*(bottom(x)-top(x)-8);const p=mirror([[x,y],[x+rand()*3,y]]);line(...p[0],...p[1],rand()>.6?'#50605050':'#081b2040');}}
wall(0);wall(1);
// Far wall and deep portal.
rect(118,43,84,80,'#162828');for(let y=45;y<123;y+=10){line(118,y,201,y,'#0c1c20');for(let x=119+(y%20?0:8);x<202;x+=16)line(x,y,x,y+10,'#0a1b1e');}
poly([[136,122],[136,72],[140,61],[147,54],[156,50],[164,50],[173,54],[180,61],[184,72],[184,122]],'#2d403a');
poly([[142,122],[142,73],[145,64],[152,58],[160,56],[168,58],[175,64],[178,73],[178,122]],'#060e13');
poly([[149,121],[149,82],[152,75],[160,72],[168,75],[171,82],[171,121]],'#0d1c20');rect(153,86,14,36,'#040c11');
for(const x of [155,159,163])line(x,87,x,120,'#182927');line(153,93,166,93,'#223731');
line(137,76,141,76,'#6b715149');line(178,77,183,77,'#6b715149');line(137,91,141,91,'#08171a');line(178,91,183,91,'#08171a');
for(let i=0;i<5;i++)line(128+i*2,123+i*2,192-i*2,123+i*2,'#243a34');
layer('torchlight');torch(73,64,1);torch(247,64,1);torch(127,77,.5);torch(193,77,.5);
for(let i=0;i<24;i++){const y=141+Math.floor(rand()*29),x=54+Math.floor(rand()*23);line(x,y,x+rand()*11,y,'#ba914029');line(320-x,y,320-x-rand()*11,y,'#ba914024');}
layer('foreground');
// Heavy near arch frame: large irregular keystones and vertical piers.
poly([[0,0],[61,0],[42,20],[30,45],[26,71],[26,180],[0,180]],'#0b1b1e');poly([[320,0],[259,0],[278,20],[290,45],[294,71],[294,180],[320,180]],'#0b1b1e');
for(const side of [0,1]){const mx=x=>side?320-x:x;for(let y=55;y<180;y+=25){const p=[[0,y],[25,y-4],[24,y+19],[0,y+24]].map(([x,v])=>[mx(x),v]);poly(p,y%50?'#263a38':'#213433');line(mx(2),y+2,mx(23),y-2,'#405349');line(mx(25),y-3,mx(25),y+18,'#070f14');}for(let i=0;i<3;i++){const p=[[[0,0],[27,0],[40,13],[29,32],[0,19]],[[29,0],[59,0],[43,18],[39,29],[24,17]],[[0,22],[26,34],[25,54],[0,59]]][i].map(([x,y])=>[mx(x),y]);poly(p,['#253834','#2c3e37','#1d312f'][i]);}}
for(let i=0;i<90;i++){const side=rand()>.5,x=rand()*23,y=rand()*180;line(side?320-x:x,y,side?318-x:x+2,y,'#70836c20');}
// Ceiling cross ribs and a few hanging roots.
for(const d of [0,1,2]){line(43+d,17+d,128+d,43+d,'#23362f');line(277-d,17+d,192-d,43+d,'#23362f');}
for(const x of [59,62,254,260]){line(x,0,x+2,8,'#263731');line(x+2,8,x,15,'#263731');}
const corridor=finish();
// Shared sprite motifs are original geometry; all use the AIPaint command API.
function shadow(w,y){ellipse(w*.2,y,w*.6,7,'#04101575');}
begin('slime',96,96);shadow(96,84);
poly([[14,78],[15,65],[20,57],[24,39],[34,28],[51,24],[66,29],[76,41],[80,59],[85,68],[82,79],[72,85],[26,85]],'#07191d');
poly([[18,75],[20,64],[25,55],[28,40],[36,31],[50,28],[63,31],[72,42],[75,57],[81,69],[79,77],[70,80],[29,80]],'#286b5c');
poly([[21,65],[28,54],[29,41],[37,34],[50,30],[61,33],[69,44],[72,58],[62,69],[42,73]],'#3b9b78');
poly([[30,47],[34,38],[43,33],[54,34],[58,38],[48,39],[43,47]],'#7ecf92');
poly([[24,68],[32,74],[49,77],[69,72],[78,69],[77,76],[67,80],[29,79]],'#164638');
rect(34,50,7,9,'#071c1e');rect(57,48,7,10,'#071c1e');rect(36,50,3,3,'#e6e8b0');rect(59,48,3,3,'#e6e8b0');line(45,64,52,64,'#123529');rect(29,46,3,4,'#b0e2a5');rect(34,40,4,3,'#b0e2a5');ellipse(61,64,6,4,'#60b38a');finish();
begin('skeleton',96,112);shadow(96,104);
// Weathered sword and asymmetric limbs.
poly([[75,14],[80,8],[82,17],[70,74],[65,76]],'#101e22');poly([[76,18],[80,12],[77,35],[69,72],[67,71]],'#8c9b95');line(78,16,68,68,'#d1d0b1');rect(62,70,15,3,'#9e743b');line(68,73,65,86,'#5a4331',3);
line(36,59,26,71,'#101b20',7);line(26,71,31,84,'#101b20',6);line(59,59,69,72,'#101b20',7);line(69,72,67,78,'#a9aa90',4);line(37,60,27,72,'#b3b298',4);line(27,72,31,82,'#898d7c',3);
line(40,81,35,97,'#0d1b20',8);line(35,97,33,104,'#0d1b20',7);line(53,81,59,96,'#0d1b20',8);line(59,96,62,104,'#0d1b20',7);line(40,83,35,97,'#b8b9a0',4);line(36,97,34,104,'#8c9585',3);line(53,83,59,96,'#c0b99c',4);line(59,97,62,104,'#949684',3);rect(27,103,10,4,'#b1ac8f');rect(59,103,11,4,'#b1ac8f');
poly([[34,52],[60,52],[64,64],[59,77],[57,86],[39,87],[34,76],[30,65]],'#112027');line(47,49,47,81,'#b7b59b',4);
for(let y=57;y<76;y+=6){line(34,y,42,y+3,'#c4c0a2',3);line(50,y+3,59,y,'#c4c0a2',3);line(34,y+2,39,y+4,'#667b72');line(54,y+4,59,y+2,'#667b72');}poly([[34,76],[59,76],[58,84],[54,82],[51,91],[44,85],[36,88]],'#714f36');rect(45,77,6,5,'#c49549');rect(47,78,2,3,'#342e29');
poly([[33,27],[36,19],[45,15],[55,17],[64,24],[65,39],[60,45],[59,52],[39,52],[36,46],[31,38]],'#102027');poly([[36,27],[40,21],[48,18],[56,21],[61,26],[62,38],[56,43],[56,49],[41,49],[40,43],[35,38]],'#b7b496');poly([[39,25],[46,20],[55,23],[58,27],[58,31],[40,33]],'#d2ccb0');rect(37,34,9,7,'#263c38');rect(52,32,8,8,'#263c38');rect(40,36,3,2,'#d59448');rect(54,34,3,2,'#d59448');poly([[48,39],[45,45],[51,45]],'#3b4c3f');for(let x=42;x<56;x+=4)rect(x,47,2,4,'#415246');line(48,22,46,27,'#7f8a77');line(46,27,49,29,'#7f8a77');finish();
begin('wraith',96,112);shadow(96,104);
ellipse(13,73,71,32,'#3f8d7330');poly([[46,10],[64,15],[73,28],[77,49],[87,77],[77,70],[82,102],[66,94],[60,110],[49,100],[39,108],[33,93],[17,102],[23,75],[12,80],[22,50],[26,29],[33,17]],'#0a1720');
poly([[47,14],[61,19],[68,29],[68,45],[76,66],[74,88],[69,82],[70,99],[60,91],[56,101],[48,94],[40,101],[37,87],[25,97],[30,75],[22,78],[29,50],[29,29],[36,20]],'#29463f');
poly([[37,23],[49,16],[59,21],[65,30],[61,45],[35,47],[31,33]],'#446355');poly([[39,27],[49,23],[59,28],[61,41],[54,51],[41,47],[34,38]],'#07141d');poly([[40,32],[45,34],[43,38],[39,37]],'#a5e3b4');poly([[52,33],[58,30],[57,36],[53,38]],'#a5e3b4');rect(42,34,2,2,'#e2f7c4');rect(54,33,2,2,'#e2f7c4');
poly([[34,47],[39,53],[35,68],[28,82],[29,67]],'#597c66');poly([[64,46],[69,64],[66,83],[72,97],[61,87],[63,65]],'#587966');poly([[46,53],[54,52],[57,72],[52,91],[54,99],[44,91],[41,75]],'#172d2b');line(39,56,35,76,'#82a68a');line(61,58,63,71,'#82a68a');
poly([[23,60],[32,62],[33,66],[29,69],[25,67],[24,76],[20,70]],'#749c81');poly([[70,60],[77,57],[78,63],[75,67],[74,75],[70,68]],'#749c81');for(let i=0;i<16;i++){const x=18+rand()*63,y=83+rand()*27;rect(x,y,2,2,'#6bb79855');}finish();
begin('construct',96,112);shadow(96,104);
// Slab guardian with old brass seams, amber heart and moss.
poly([[29,29],[38,19],[57,19],[66,27],[64,45],[76,43],[85,50],[86,77],[76,84],[66,76],[63,87],[69,104],[51,108],[47,91],[42,107],[24,104],[29,85],[25,76],[17,84],[9,76],[12,49],[22,43],[30,45]],'#081a20');
poly([[17,50],[28,48],[31,59],[24,72],[24,77],[17,80],[13,74]],'#425b53');poly([[67,48],[77,48],[81,53],[83,72],[77,78],[70,74],[65,59]],'#4d6153');rect(14,61,12,3,'#243c37');rect(70,61,12,3,'#243c37');poly([[18,49],[27,49],[26,54],[17,58]],'#738071');poly([[71,49],[77,51],[79,58],[72,55]],'#899078');
poly([[34,79],[44,83],[43,99],[39,104],[28,101],[33,89]],'#4b6358');poly([[51,83],[59,80],[60,88],[66,101],[55,105],[51,100]],'#587062');line(33,91,43,93,'#273f3e');line(53,93,61,90,'#273f3e');rect(29,101,12,4,'#6a7b65');rect(54,102,12,4,'#71816b');
poly([[31,43],[64,43],[70,59],[64,82],[53,89],[40,88],[29,78],[25,59]],'#536657');poly([[31,46],[42,44],[40,54],[29,58]],'#91a083');poly([[48,45],[62,46],[65,56],[54,53]],'#6c7c63');poly([[32,64],[40,70],[39,82],[32,76]],'#344f49');poly([[60,67],[66,61],[62,80],[54,84],[55,75]],'#819078');
poly([[44,50],[55,53],[60,62],[56,72],[46,77],[37,70],[36,59]],'#162c2e');poly([[44,54],[52,56],[55,62],[51,69],[45,72],[40,67],[40,60]],'#bc7836');poly([[46,56],[51,59],[52,64],[47,69],[43,65],[43,60]],'#f1cb70');rect(46,60,3,5,'#fff0a3');
poly([[35,26],[42,22],[55,22],[62,29],[61,40],[55,45],[39,43],[34,37]],'#7d876d');poly([[35,32],[62,30],[61,36],[35,37]],'#233e3c');rect(39,33,7,3,'#dbb15d');rect(52,32,6,3,'#dbb15d');rect(42,40,12,3,'#3c5146');
for(const [x,y] of [[32,25],[57,23],[18,47],[28,78],[60,98]]){rect(x,y,6,3,'#506f42');rect(x+2,y+3,4,3,'#668244');}line(57,24,56,28,'#304c42');line(56,28,59,30,'#304c42');finish();
begin('dragon',128,128);shadow(128,117);
// A low, broad ancient drake: torn wings, plated chest and a curling tail.
poly([[45,49],[30,25],[14,13],[17,41],[4,63],[27,57],[17,82],[42,70],[52,88],[79,88],[91,70],[115,83],[104,57],[124,64],[113,40],[115,14],[98,26],[82,47]],'#101820');
poly([[45,54],[31,29],[19,21],[22,43],[11,57],[32,53],[26,72],[44,62],[55,84]],'#773b39');poly([[80,54],[96,31],[110,23],[107,45],[117,58],[99,52],[106,73],[85,65],[74,84]],'#793936');
poly([[43,55],[31,32],[27,49]],'#aa5548');poly([[31,57],[27,68],[41,61]],'#a25545');poly([[82,54],[95,35],[99,47]],'#ad5547');poly([[85,62],[103,68],[99,56]],'#a24b41');
line(19,21,46,56,'#bd7352',2);line(21,43,45,57,'#512f31',2);line(13,58,44,59,'#bd7352');line(110,24,81,56,'#b97152',2);line(107,45,81,57,'#4c2a2b',2);line(117,60,82,59,'#b97152');
poly([[48,68],[78,64],[89,86],[84,103],[99,106],[113,99],[121,87],[120,104],[113,115],[97,119],[78,113],[61,109],[41,117],[22,113],[23,106],[38,100],[36,88]],'#181d23');poly([[52,71],[74,70],[83,86],[78,104],[98,112],[110,108],[119,97],[112,112],[97,116],[74,108],[64,105],[43,113],[27,110],[41,104],[43,88]],'#88483a');
poly([[51,72],[69,70],[75,84],[72,101],[64,108],[53,103],[46,88]],'#b9814c');for(let y=79;y<103;y+=6)line(51,y,71,y-1,'#674436');
poly([[44,82],[49,91],[44,107],[36,112],[29,110],[37,103]],'#a35d43');poly([[78,82],[70,91],[75,107],[82,112],[94,111],[81,102]],'#a35d43');for(const x of [30,36,42,79,85,91])poly([[x,108],[x+3,108],[x+2,114],[x-1,114]],'#c6b48a');
poly([[43,52],[40,39],[46,28],[54,24],[72,24],[83,33],[86,46],[79,63],[77,72],[68,78],[54,76],[48,66]],'#1a2023');poly([[46,49],[44,39],[50,31],[57,28],[69,28],[78,35],[81,46],[74,59],[74,69],[67,73],[56,71],[52,61]],'#a6563d');
poly([[49,31],[45,18],[50,21],[56,28]],'#d0b070');poly([[72,29],[81,17],[78,31]],'#d0b070');poly([[47,32],[44,26],[46,14],[50,22],[52,30]],'#91704b');poly([[74,29],[82,16],[81,28],[78,34]],'#ad8b59');
poly([[47,43],[57,45],[60,51],[52,50]],'#26282a');poly([[68,47],[78,41],[76,49],[69,52]],'#26282a');line(50,45,57,47,'#ecc967',2);line(70,48,76,44,'#ecc967',2);rect(54,45,2,4,'#1b211c');rect(72,44,2,4,'#1b211c');
poly([[57,49],[67,49],[70,57],[77,60],[75,67],[68,71],[57,68],[51,61],[55,57]],'#bd7048');rect(56,58,3,2,'#57302a');rect(67,57,3,2,'#57302a');line(54,64,74,64,'#402c29');poly([[57,64],[60,64],[58,69]],'#dfc895');poly([[68,64],[71,64],[69,69]],'#dfc895');
for(const [x,y] of [[51,37],[60,33],[68,35],[75,39],[47,81],[78,79],[95,110]]){rect(x,y,3,2,'#d18852');rect(x+3,y+3,3,2,'#6c382e');}finish();
// Contact sheet in AIPaint from the same original pixel buffers, useful for visual QA.
// Audio: manually composed original modal motifs, rendered by AIMusic's actual synth.
function score(name,title,tempo,bars,master){const p=blankProject(name);Object.assign(p,{title,tempo,bars,master});return new MusicCore(p);}
function track(id,instrument,volume,pan,notes){const t=newTrack(id,id,instrument);Object.assign(t,{volume,pan,notes:notes.map((n,i)=>({id:`${id}-${i}`,pitch:n[0],start:Math.round(n[1]*480),duration:Math.round(n[2]*480),velocity:n[3]??78}))});return t;}
function renderMusic(name,core,tracks){const s=core.getState();core.applyBatch({projectId:s.projectId,expectedRevision:s.revision,operationId:'original-composition',commands:tracks.map(t=>({type:'track.add',track:t}))});const project=core.getProject();const pcm=renderPCM(project,{sampleRate:22050,mode:'loop'});save(name+'.music.json',JSON.stringify(project,null,2)+'\n');save(name+'.wav',encodeWAV(pcm));save(name+'.mid',encodeMIDI(project));save(name+'.report.json',JSON.stringify({engine:'TomTomYoung/AIMusic',...pcm.report,sha256:sha(encodeWAV(pcm)),state:core.getState()},null,2)+'\n');return pcm.report;}
let exp=score('exploration','Under the Amber Vault',84,8,.6),bass=[],pad=[],bell=[],pluck=[];
const roots=[38,38,34,34,41,41,36,36];const chords=[[50,53,57],[50,53,57],[46,50,53],[46,50,53],[53,57,60],[53,57,60],[48,52,55],[48,52,57]];
for(let bar=0;bar<8;bar++){bass.push([roots[bar],bar*4,3.85,68]);for(const n of chords[bar])pad.push([n,bar*4,3.65,48]);for(let beat=0;beat<4;beat++)pluck.push([chords[bar][beat%3]+12,bar*4+beat+.5,.45,42+(beat===0?8:0)]);}
for(const [b,n,d] of [[.5,74,1],[2.5,72,.8],[4.5,69,1.7],[7,65,.8],[8.5,70,1],[10.5,69,.8],[12.5,65,1.7],[15,62,.8],[16.5,72,1],[18.5,74,.8],[20.5,77,1.7],[23,72,.8],[24.5,67,1],[26.5,69,.8],[28.5,72,1.2],[30.5,69,.8]])bell.push([n,b,d,60]);
const expReport=renderMusic('exploration',exp,[track('depths','bass',.48,0,bass),track('vault','pad',.35,-.15,pad),track('lantern','bell',.42,.22,bell),track('footsteps','pluck',.3,-.28,pluck)]);
let battle=score('battle','The Gatekeeper Wakes',144,8,.68),b2=[],lead=[],arp=[],kick=[],snare=[],hat=[];
const battleRoots=[38,38,34,36,38,41,34,33];
const motifs=[[74,74,77,76,74,72,69,72],[74,77,81,77,76,74,72,69],[70,70,74,77,74,72,70,65],[72,72,76,79,76,74,72,69],[74,77,81,86,81,77,76,74],[77,77,81,84,81,79,77,72],[70,74,77,82,77,74,72,70],[69,73,76,81,79,76,73,69]];
for(let bar=0;bar<8;bar++){const root=battleRoots[bar];for(let i=0;i<8;i++){b2.push([root+(i%4===3?12:0),bar*4+i*.5,.38,i%2?78:95]);lead.push([motifs[bar][i],bar*4+i*.5,.36,i%2?73:85]);arp.push([root+24+[0,7,12,7][i%4],bar*4+i*.5+.25,.18,56]);hat.push([42,bar*4+i*.5,.08,i%2?48:62]);}for(let i=0;i<4;i++){kick.push([36,bar*4+i,.1,96]);if(i%2)snare.push([38,bar*4+i,.12,85]);}}
const battleReport=renderMusic('battle',battle,[track('iron-step','bass',.56,0,b2),track('challenge','pulse',.31,-.13,lead),track('sparks','pluck',.32,.25,arp),track('war-drum','kick',.61,0,kick),track('snare','snare',.31,.1,snare),track('chain','hat',.19,-.3,hat)]);
write('manifest.json',JSON.stringify({format:'adv-original-assets',version:1,generator:'generate.mjs',sources:[{repository:'TomTomYoung/AIPaint',commit:'be94fc261c1ce926a5d63bf0720feb4b6bb2fd0d',files:[{path:'src/core.js',gitBlobSha:'fa403774d1da0500d4c5af4927c465f242f65e12'}]},{repository:'TomTomYoung/AIMusic',commit:'399fe1351368755f116512a459c95ecf555c5cba',files:[{path:'src/core.mjs',gitBlobSha:'39937c3c3d299f1915e3997418d582815239c157'},{path:'src/audio.mjs',gitBlobSha:'eb91880744510179fe649135e1d39b4d4cb55af2'}]}],music:[expReport,battleReport],files:inventory},null,2)+'\n');
console.log(JSON.stringify({generated:inventory.length,music:[expReport,battleReport],pngs:inventory.filter(f=>f.file.endsWith('.png'))},null,2));
