import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {createHash} from 'node:crypto';
import {PaintCore} from './vendor/AIPaint/src/core.js';
import characters from '../../authoring/characters.mjs';
const root=path.resolve(import.meta.dirname,'../..');
const output=path.join(root,'assets/images/characters'),source=path.join(root,'assets/source/characters');
fs.mkdirSync(output,{recursive:true});fs.mkdirSync(source,{recursive:true});
const sha=b=>createHash('sha256').update(b).digest('hex');
const table=Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function crc(b){let n=0xffffffff;for(const v of b)n=table[(n^v)&255]^(n>>>8);return(n^0xffffffff)>>>0;}
function chunk(type,data){const t=Buffer.from(type),n=Buffer.alloc(4),c=Buffer.alloc(4);n.writeUInt32BE(data.length);c.writeUInt32BE(crc(Buffer.concat([t,data])));return Buffer.concat([n,t,data,c]);}
function png({width,height,data}){const h=Buffer.alloc(13);h.writeUInt32BE(width);h.writeUInt32BE(height,4);h[8]=8;h[9]=6;const raw=Buffer.alloc((width*4+1)*height);for(let y=0;y<height;y++)raw.set(data.subarray(y*width*4,(y+1)*width*4),y*(width*4+1)+1);return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',h),chunk('IDAT',zlib.deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);}
const palettes={teal:['#183a3b','#2d6260','#569185'],brown:['#3c302c','#725342','#a37c55'],plum:['#35293d','#674656','#a36a75'],navy:['#202c40','#3c526b','#687f90'],ochre:['#443626','#937043','#c69b58'],ivory:['#3c4742','#858d78','#c7c5a4']};
const skins=[['#71523f','#b88a65','#deb98c'],['#584437','#9c7358','#c69e78'],['#825844','#c49472','#e4ba94']];
const ink='#101c25',brass='#c19a56',light='#eed6a0';
const files=[];
for(const [index,c] of characters.entries()){
 const core=new PaintCore({documentId:`adv-${c.id}`,width:112,height:128});let cmds=[],batches=[],layerId='';
 const flush=()=>{if(!cmds.length)return;const batch={documentId:`adv-${c.id}`,batchId:`draw-${batches.length}`,expectedRevision:core.getState().revision,commands:cmds};core.applyBatch(batch);batches.push(batch);cmds=[];};
 const cmd=x=>{cmds.push(x);if(cmds.length>=650)flush();};
 const layer=id=>{layerId=id;cmd({type:'layer.add',id,name:id});};
 const rgba=color=>color.length===7?color+'ff':color;
 const rect=(x,y,w,h,fill)=>cmd({type:'shape.rect',layerId,x,y,width:w,height:h,fill:rgba(fill)});
 const line=(x,y,x2,y2,color,size=1)=>cmd({type:'shape.line',layerId,x,y,x2,y2,color:rgba(color),size});
 const ellipse=(x,y,w,h,fill)=>cmd({type:'shape.ellipse',layerId,x,y,width:w,height:h,fill:rgba(fill)});
 const poly=(points,color)=>{for(let y=Math.min(...points.map(p=>p[1]));y<=Math.max(...points.map(p=>p[1]));y++){const hits=[];for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];if(a[1]<=y&&b[1]>y||b[1]<=y&&a[1]>y)hits.push(a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]));}hits.sort((a,b)=>a-b);for(let i=0;i<hits.length;i+=2)if(hits[i+1]>=hits[i])line(Math.ceil(hits[i]),y,Math.floor(hits[i+1]),y,color);}};
 const look=c.design,[dark,cloth,highlight]=palettes[look.color],skin=skins[index%skins.length],old=look.age==='old',young=look.age==='young',hair=old?'#a4a99b':['#322c29','#584133','#242d32','#725343'][index%4],x=53+(index%3-1)*3,y=42+(young?4:0);
 layer('silhouette');
 if(look.group){for(const [bx,by] of [[16,52],[82,49]]){poly([[bx-10,123],[bx-10,86],[bx-4,76],[bx+10,76],[bx+20,91],[bx+23,123]],dark);ellipse(bx-1,by,17,25,skin[0]);poly([[bx-2,by+9],[bx-3,by+2],[bx+5,by-4],[bx+16,by],[bx+17,by+8]],ink);line(bx+4,by+13,bx+7,by+13,ink);line(bx+12,by+13,bx+14,by+13,ink);}}
 poly([[14,125],[18,91],[30,77],[42,73],[68,73],[83,79],[97,98],[99,125]],ink);
 poly([[19,125],[23,93],[34,81],[47,77],[66,77],[81,83],[92,100],[94,125]],cloth);
 poly([[20,124],[23,96],[36,86],[33,117],[45,125]],dark);
 poly([[66,79],[81,86],[89,102],[87,117],[77,100],[74,125],[59,125]],dark);
 line(28,94,27,115,highlight,2);line(81,87,88,101,highlight,2);
 layer('face');
 if(['bob','braid','hood'].includes(look.hair))poly([[x-23,y-13],[x-17,y-23],[x+18,y-25],[x+27,y-8],[x+29,y+38],[x+14,y+46],[x-26,y+32]],look.hair==='hood'?dark:hair);
 rect(x-9,y+25,18,15,skin[0]);rect(x-5,y+26,11,12,skin[1]);
 poly([[x-19,y-9],[x-13,y-17],[x+10,y-20],[x+21,y-9],[x+20,y+14],[x+12,y+30],[x,y+35],[x-15,y+26],[x-22,y+9]],ink);
 poly([[x-16,y-9],[x-10,y-14],[x+9,y-16],[x+17,y-7],[x+17,y+14],[x+10,y+27],[x,y+31],[x-12,y+24],[x-18,y+8]],skin[1]);
 poly([[x-12,y-9],[x-7,y-13],[x+8,y-14],[x+12,y-6],[x+10,y+9],[x+1,y+14],[x-10,y+9]],skin[2]);
 poly([[x+14,y+1],[x+17,y+4],[x+16,y+16],[x+9,y+27],[x+2,y+29],[x+7,y+17]],skin[0]);
 rect(x-20,y+4,4,10,skin[1]);rect(x+17,y+4,4,9,skin[0]);
 line(x-13,y+1,x-5,y,ink);line(x+4,y,x+12,y+1,ink);
 rect(x-11,y+5,4,3,ink);rect(x+6,y+5,4,3,ink);rect(x-10,y+5,1,1,light);rect(x+7,y+5,1,1,light);
 line(x,y+7,x-2,y+15,skin[0]);line(x-2,y+15,x+3,y+16,skin[0]);
 line(x-5,y+22,x+5,y+22,skin[0]);line(x-2,y+24,x+4,y+24,skin[2]);
 if(old){line(x-15,y+10,x-10,y+12,skin[0]);line(x+8,y+12,x+13,y+10,skin[0]);line(x-10,y+19,x-8,y+25,skin[0]);line(x+9,y+19,x+7,y+25,skin[0]);line(x-8,y+27,x+5,y+30,hair,2);}
 if(look.glasses){line(x-16,y+3,x-3,y+3,brass);line(x-16,y+3,x-14,y+11,brass);line(x-14,y+11,x-4,y+11,brass);line(x-4,y+11,x-3,y+3,brass);line(x+2,y+3,x+15,y+3,brass);line(x+2,y+3,x+3,y+11,brass);line(x+3,y+11,x+13,y+11,brass);line(x+13,y+11,x+15,y+3,brass);line(x-3,y+5,x+2,y+5,brass);}
 const h=look.hair;
 if(h==='bald'){poly([[x-20,y-8],[x-20,y+4],[x-15,y],[x-13,y-10]],hair);poly([[x+15,y-11],[x+22,y-6],[x+21,y+9],[x+17,y+4]],hair);line(x-9,y-14,x+3,y-16,skin[2],2);}
 else if(h==='hood'){poly([[x-27,y-10],[x-15,y-26],[x+12,y-29],[x+27,y-9],[x+27,y+29],[x+19,y+14],[x+18,y-9],[x+4,y-20],[x-14,y-9],[x-20,y+16],[x-25,y+30]],cloth);line(x-21,y-10,x-12,y-20,highlight,2);line(x+14,y-18,x+23,y-4,highlight);}
 else if(h==='cap'){poly([[x-24,y-9],[x-21,y-23],[x+13,y-24],[x+23,y-12],[x+27,y-8]],dark);poly([[x-20,y-12],[x-18,y-21],[x+11,y-22],[x+20,y-12]],cloth);rect(x-24,y-10,51,5,ink);rect(x-18,y-9,42,2,highlight);rect(x-3,y-19,7,6,brass);}
 else {poly([[x-22,y-3],[x-23,y-16],[x-12,y-25],[x+8,y-27],[x+23,y-16],[x+23,y+2],[x+15,y-8],[x+3,y-14],[x-6,y-7],[x-13,y-9],[x-17,y+3]],hair);line(x-13,y-19,x+6,y-22,old?'#d3d1b6':'#89745b',2);
 if(h==='slick'){for(let t=0;t<3;t++)line(x-13+t*7,y-19,x+7+t*5,y-13,'#89745b');}
 if(h==='bob'){rect(x-23,y-5,7,33,hair);rect(x+18,y-6,7,35,hair);line(x-21,y+5,x-21,y+21,'#89745b');}
 if(h==='tied'||h==='bun'){ellipse(x+11,y-30,18,17,hair);rect(x+16,y-16,6,4,brass);if(h==='tied')poly([[x+20,y-13],[x+29,y-7],[x+30,y+22],[x+24,y+15]],hair);}
 if(h==='braid'){for(let i=0;i<6;i++){ellipse(x+16+(i%2)*3,y+10+i*6,9,10,hair);line(x+18,y+14+i*6,x+24,y+14+i*6,'#89745b');}rect(x+19,y+48,6,4,brass);}
 if(h==='curly'){for(const [hx,hy] of [[-19,-17],[-10,-24],[1,-27],[12,-24],[21,-15]])ellipse(x+hx-4,y+hy,12,12,hair);}
 if(h==='band'){rect(x-22,y-11,43,6,highlight);line(x-20,y-8,x+19,y-8,light);poly([[x+20,y-10],[x+30,y-3],[x+25,y+8],[x+21,y+3]],cloth);}}
 layer('workwear');
 poly([[41,78],[51,87],[54,97],[46,95],[34,83]],highlight);poly([[64,78],[56,88],[54,97],[65,93],[75,84]],cloth);
 line(54,96,54,124,ink);for(let by=99;by<125;by+=9)rect(57,by,2,2,brass);
 if(['ledger','map','letter','paper','tag'].includes(look.prop)){
  poly([[32,101],[70,95],[81,120],[42,127]],ink);poly([[35,102],[69,98],[77,118],[43,124]],look.prop==='ledger'?dark:light);line(41,104,46,120,brass);
  for(let t=0;t<3;t++)line(49,104+t*4,65+t*2,102+t*4,look.prop==='ledger'?highlight:'#997b55');
  if(look.prop==='map'){line(53,103,61,108,'#5c796a');line(61,108,58,118,'#5c796a');}
  if(look.prop==='letter')rect(59,111,5,5,'#94584b');
  if(look.prop==='tag')rect(44,104,3,3,ink);
  ellipse(27,102,12,8,skin[1]);ellipse(72,111,12,8,skin[1]);
 }else{
 const px=index%2?80:28;ellipse(px-4,103,12,9,skin[1]);
 switch(look.prop){
  case 'lantern':line(px,80,px,90,brass,2);line(px-7,87,px+7,87,brass,2);rect(px-9,91,20,28,ink);rect(px-6,94,14,21,'#936239');rect(px-3,97,8,15,'#e5b35f');rect(px,99,3,10,'#ffebac');rect(px-10,118,22,3,brass);line(px,91,px,116,brass);break;
  case 'bottle':rect(px-4,83,8,6,brass);rect(px-3,89,6,7,'#97b09a');poly([[px-3,93],[px-9,100],[px-9,120],[px+10,120],[px+10,100],[px+3,93]],ink);rect(px-6,101,14,16,'#467c72');rect(px-4,110,10,6,brass);line(px-4,101,px-4,108,'#a1c2a1');break;
  case 'rope':for(let n=0;n<4;n++){ellipse(px-10+n*2,85,20,36,'#9c8050');ellipse(px-7+n*2,88,14,30,dark);}line(px+10,95,px+13,124,brass,2);break;
  case 'key':line(px,89,px,118,brass,3);ellipse(px-5,82,12,12,brass);ellipse(px-2,85,6,6,ink);rect(px,113,8,3,brass);rect(px+5,113,3,7,brass);break;
  case 'bell':poly([[px-4,94],[px+4,94],[px+8,109],[px+12,114],[px-12,114],[px-8,109]],brass);rect(px-2,88,4,8,light);line(px-6,102,px-8,110,light,2);rect(px-2,115,4,4,ink);break;
  case 'seal':rect(px-4,94,8,18,'#7d4d3e');ellipse(px-6,89,12,10,'#b27255');rect(px-10,112,20,7,brass);break;
  case 'hammer':line(px,92,px,124,'#9a7350',5);rect(px-13,85,27,11,ink);rect(px-11,87,23,6,'#8d9b97');rect(px-10,87,5,2,light);break;
  case 'wheel':ellipse(px-15,88,32,32,brass);ellipse(px-11,92,24,24,dark);line(px-13,104,px+14,104,brass,2);line(px+1,91,px+1,117,brass,2);ellipse(px-3,100,8,8,light);break;
  case 'flower':line(px,99,px,124,'#64886d',2);for(const [fx,fy] of [[-5,-2],[1,-6],[6,-1],[4,5],[-3,5]])ellipse(px+fx-3,95+fy,7,7,'#bfaac1');rect(px-1,97,4,4,brass);break;
  case 'incense':for(let n=-1;n<=1;n++){line(px+n*4,92,px+n*4,121,'#a98558');rect(px+n*4,90,2,2,'#e7aa67');}line(px,86,px-4,80,'#8fa39480');line(px-4,80,px,73,'#8fa39460');break;
  case 'brush':line(px,91,px,122,'#8d6f4c',4);rect(px-10,84,21,9,brass);for(let t=-9;t<11;t+=3)line(px+t,85,px+t,98,light);break;
  case 'scoop':line(px,97,px,123,brass,4);ellipse(px-10,82,20,19,'#a5aaa1');ellipse(px-6,84,12,13,'#5b7270');break;
  case 'bowl':ellipse(px-15,98,31,19,ink);ellipse(px-12,100,25,13,'#ab875f');line(px-13,103,px+13,103,light,2);break;
  default:poly([[px-12,100],[px-6,93],[px+8,94],[px+15,104],[px+12,124],[px-12,124]],dark);line(px-5,96,px+5,96,brass,2);line(px,100,px,121,highlight);
 }
 }
 flush();const image=png(core.composite()),project=JSON.stringify(core.exportProject()),commands=JSON.stringify({documentId:`adv-${c.id}`,width:112,height:128,batches});
 fs.writeFileSync(path.join(output,`${c.id}.png`),image);fs.writeFileSync(path.join(source,`${c.id}.paint.json`),project);fs.writeFileSync(path.join(source,`${c.id}.commands.json`),commands);
 files.push({id:c.id,png:`assets/images/characters/${c.id}.png`,project:`assets/source/characters/${c.id}.paint.json`,commands:`assets/source/characters/${c.id}.commands.json`,sha256:{png:sha(image),project:sha(project),commands:sha(commands)},width:112,height:128,layers:3});
}
fs.writeFileSync(path.join(source,'manifest.json'),JSON.stringify({format:'adv-aipaint-characters',version:1,engine:{repository:'TomTomYoung/AIPaint',commit:'be94fc261c1ce926a5d63bf0720feb4b6bb2fd0d',coreSha256:sha(fs.readFileSync(new URL('./vendor/AIPaint/src/core.js',import.meta.url)))},generator:'tools/assets/generate-characters.mjs',files},null,2)+'\n');
console.log(`AIPaint: ${files.length} character PNGs, editable projects and replayable command streams`);
// Review sheet: copy the actual AIPaint composite pixels through AIPaint's API.
const sheet=new PaintCore({documentId:'adv-character-sheet',width:672,height:768});let batchIndex=0,pixels=[];
const flushSheet=()=>{if(!pixels.length)return;sheet.applyBatch({documentId:'adv-character-sheet',batchId:`sheet-${batchIndex++}`,expectedRevision:sheet.getState().revision,commands:pixels});pixels=[];};
pixels.push({type:'layer.add',id:'portraits',name:'portraits'},{type:'shape.rect',layerId:'portraits',x:0,y:0,width:672,height:768,fill:'#1b282eff'});flushSheet();
for(const [i,c] of characters.entries()){
 const im=PaintCore.fromProject(JSON.parse(fs.readFileSync(path.join(source,`${c.id}.paint.json`),'utf8'))).composite(),ox=(i%6)*112,oy=Math.floor(i/6)*128;
 for(let y=0;y<128;y++)for(let x=0;x<112;){const p=(y*112+x)*4;if(!im.data[p+3]){x++;continue;}const start=x,color=Array.from(im.data.subarray(p,p+4));x++;while(x<112&&color.every((v,k)=>im.data[(y*112+x)*4+k]===v))x++;pixels.push({type:'shape.line',layerId:'portraits',x:ox+start,y:oy+y,x2:ox+x-1,y2:oy+y,color:'#'+color.map(v=>v.toString(16).padStart(2,'0')).join(''),size:1});if(pixels.length>=650)flushSheet();}
}
flushSheet();fs.writeFileSync(path.join(output,'contact-sheet.png'),png(sheet.composite()));
