import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {PaintCore} from './vendor/AIPaint/src/core.js';
import {MusicCore,blankProject,newTrack,INSTRUMENTS} from './vendor/AIMusic/src/core.mjs';
import {renderPCM,encodeWAV,RELEASE} from './vendor/AIMusic/src/audio.mjs';
const root=path.resolve(import.meta.dirname,'../..'),plan=JSON.parse(fs.readFileSync(path.join(root,'authoring/presentation.json'),'utf8'));
const write=(f,v)=>{const p=path.join(root,f);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,v);};
const json=(f,v)=>write(f,JSON.stringify(v,null,2)+'\n'),hash=b=>createHash('sha256').update(b).digest('hex');
const table=Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function chunk(type,b){let c=0xffffffff;const t=Buffer.from(type);for(const v of Buffer.concat([t,b]))c=table[(c^v)&255]^(c>>>8);const h=Buffer.alloc(4),tail=Buffer.alloc(4);h.writeUInt32BE(b.length);tail.writeUInt32BE((c^0xffffffff)>>>0);return Buffer.concat([h,t,b,tail]);}
function png({width,height,data}){const h=Buffer.alloc(13);h.writeUInt32BE(width);h.writeUInt32BE(height,4);h[8]=8;h[9]=6;const raw=Buffer.alloc((width*4+1)*height);for(let y=0;y<height;y++)raw.set(data.subarray(y*width*4,(y+1)*width*4),y*(width*4+1)+1);return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',h),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);}
const report={version:plan.version,sounds:[],animations:[]};
for(const [id,s] of Object.entries(plan.sounds)){
 const project=blankProject(id);Object.assign(project,{title:s.name,tempo:240,bars:1,master:1});const core=new MusicCore(project),track=newTrack(id,s.name,s.instrument);track.volume=1;
 track.notes=s.notes.map((n,i)=>({id:`n${i}`,pitch:INSTRUMENTS[s.instrument].drum??n.pitch,start:Math.round(n.start*1920),duration:Math.round(n.seconds*1920),velocity:n.velocity}));
 core.applyBatch({projectId:id,expectedRevision:core.getState().revision,operationId:'original-se',commands:[{type:'track.add',track}]});const score=core.getProject(),pcm=renderPCM(score,{sampleRate:22050,mode:'tail'});
 const seconds=Math.max(...s.notes.map(n=>n.start+n.seconds+RELEASE[s.instrument]))+.015,frames=Math.ceil(seconds*pcm.sampleRate),gain=.55/pcm.report.peak;
 const channels=[pcm.left.slice(0,frames),pcm.right.slice(0,frames)];for(const ch of channels)for(let i=0;i<ch.length;i++)ch[i]*=gain*Math.min(1,i/110,(ch.length-1-i)/110);
 const wave=encodeWAV({sampleRate:pcm.sampleRate,left:channels[0],right:channels[1]});const temp=`tools/assets/generated/${id}.wav`;write(temp,wave);json(`assets/source/se/${id}.music.json`,score);
 const output=`assets/audio/se/${id}.ogg`;fs.mkdirSync(path.join(root,'assets/audio/se'),{recursive:true});const encoded=spawnSync('ffmpeg',['-v','error','-y','-i',path.join(root,temp),'-c:a','libvorbis','-q:a','4',path.join(root,output)],{encoding:'utf8'});if(encoded.status!==0)throw Error(encoded.stderr);
 const decoded=spawnSync('ffmpeg',['-v','error','-i',path.join(root,output),'-f','f32le','-acodec','pcm_f32le','-'],{maxBuffer:8e6});if(decoded.status!==0)throw Error(String(decoded.stderr));let peak=0,energy=0;for(let i=0;i<decoded.stdout.length;i+=4){const v=decoded.stdout.readFloatLE(i);if(!Number.isFinite(v))throw Error('Invalid PCM');peak=Math.max(peak,Math.abs(v));energy+=v*v;}if(peak===0||peak>=1)throw Error(`SE silence/clipping: ${id}`);
 report.sounds.push({id,file:output,seconds:decoded.stdout.length/8/22050,peakDb:Math.round(20*Math.log10(peak)*10)/10,rmsDb:Math.round(20*Math.log10(Math.sqrt(energy/(decoded.stdout.length/4)))*10)/10,sha256:hash(fs.readFileSync(path.join(root,output))),renderer:pcm.report.renderer,normalizationGain:gain});
}
for(const [id,effect] of Object.entries(plan.effects).filter(([,e])=>e.category==='animation')){
 const asset=`fx_${id}`,core=new PaintCore({documentId:asset,width:1024,height:128}),commands=[{type:'layer.add',id:'fx',name:effect.name}],c=effect.palette;
 const alpha=(color,a)=>color+Math.max(0,Math.min(255,Math.round(a*255))).toString(16).padStart(2,'0');
 const line=(x,y,x2,y2,color,size=2)=>commands.push({type:'shape.line',layerId:'fx',x:Math.round(x),y:Math.round(y),x2:Math.round(x2),y2:Math.round(y2),color,size});
 const dot=(x,y,r,color)=>commands.push({type:'shape.ellipse',layerId:'fx',x:Math.round(x-r),y:Math.round(y-r),width:Math.max(1,Math.round(2*r)),height:Math.max(1,Math.round(2*r)),fill:color});
 for(let frame=0;frame<8;frame++){
  const t=(frame+1)/8,x=frame*128+64,y=64,a=Math.sin(t*Math.PI)*.88+.08,r=10+t*40;
  if(id==='slash_arc'){for(let i=0;i<16;i++){const q=i/16,ang=-2.5+q*2.4;line(x+Math.cos(ang)*r,y+Math.sin(ang)*r,x+Math.cos(ang+.16)*r,y+Math.sin(ang+.16)*r,alpha(c,a*(.3+q*.7)),Math.max(1,Math.round(8*(1-t)+1)));}line(x-r*.65,y+r*.65,x+r*.65,y-r*.65,alpha('#ffffff',a),3);}
  if(id==='impact_burst'||id==='ice_shards'){for(let k=0;k<8;k++){const ang=k*Math.PI/4+.2,start=9+t*14,end=r;line(x+Math.cos(ang)*start,y+Math.sin(ang)*start,x+Math.cos(ang)*end,y+Math.sin(ang)*end,alpha(c,a),id==='ice_shards'?4:3);dot(x+Math.cos(ang)*end,y+Math.sin(ang)*end,2,alpha('#ffffff',a));}}
  if(id==='fire_burst'){for(let k=0;k<7;k++){const ang=k*2.4,cx=x+Math.cos(ang)*r*.55,cy=y+Math.sin(ang)*r*.35-t*24;dot(cx,cy,7+8*Math.sin(t*Math.PI),alpha('#bd422a',a*.7));dot(cx,cy-3,4+6*Math.sin(t*Math.PI),alpha(c,a));dot(cx,cy-5,3,alpha('#ffe39a',a));}}
  if(id==='lightning_arc'){for(let k=0;k<3;k++){const points=Array.from({length:7},(_,i)=>[x+(i%2?11:-9)+k*8-8+Math.sin(frame*1.3+i*.7)*5,y-49+i*15]);for(let i=1;i<points.length;i++){line(...points[i-1],...points[i],alpha(c,a*.55),5);line(...points[i-1],...points[i],alpha('#ffffff',a),1);}}}
  if(id==='healing_ring'||id==='mana_orbit'){for(let k=0;k<24;k++){const ang=k*Math.PI/12+t*2,next=ang+Math.PI/12;line(x+Math.cos(ang)*r,y+Math.sin(ang)*r*.6,x+Math.cos(next)*r,y+Math.sin(next)*r*.6,alpha(c,a),2);}for(let k=0;k<4;k++){const ang=k*Math.PI/2+t*4,cx=x+Math.cos(ang)*r,cy=y+Math.sin(ang)*r*.6;line(cx-4,cy,cx+4,cy,alpha('#ffffff',a),2);line(cx,cy-4,cx,cy+4,alpha('#ffffff',a),2);}}
  if(id==='poison_cloud'){for(let k=0;k<6;k++){const ang=k*2.1;dot(x+Math.cos(ang)*r*.5,y+Math.sin(ang)*r*.35-t*15,10+t*5,alpha(c,a*.3));dot(x+Math.cos(ang)*r*.65,y+Math.sin(ang)*r*.45-t*18,3,alpha('#dab8f5',a*.6));}}
 }
 const batches=[];for(let i=0;i<commands.length;i+=500){const batch={documentId:asset,batchId:`f${i}`,expectedRevision:core.getState().revision,commands:commands.slice(i,i+500)};core.applyBatch(batch);batches.push(batch);}
 const file=`assets/effects/${asset}.png`;write(file,png(core.composite()));json(`assets/source/effects/${asset}.paint.commands.json`,{documentId:asset,width:1024,height:128,batches});report.animations.push({id,file,width:1024,height:128,frames:8,cell:128,sha256:hash(fs.readFileSync(path.join(root,file)))});
}
json('assets/source/effects-report.json',report);console.log(`Generated and decoded ${report.sounds.length} SE; drew ${report.animations.length} eight-frame AIPaint sheets`);
