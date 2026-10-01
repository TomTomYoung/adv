const DIR4 = [[1,0],[-1,0],[0,1],[0,-1]];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const key=(x,y)=>`${x},${y}`;
const randInt=(rng,a,b)=>a+Math.floor(rng()*(b-a+1));
const cloneMask=mask=>mask.map(row=>[...row]);
const makeMask=(w,h,value=false)=>Array.from({length:h},()=>Array(w).fill(value));

function hash2(x,y,seed){
  let h=(seed>>>0)^Math.imul(x|0,0x9e3779b1)^Math.imul(y|0,0x85ebca77);
  h=Math.imul(h^(h>>>16),0x7feb352d); h=Math.imul(h^(h>>>15),0x846ca68b); return (h^(h>>>16))>>>0;
}
const fade=t=>t*t*t*(t*(t*6-15)+10);
const lerp=(a,b,t)=>a+(b-a)*t;
function gradDot(ix,iy,x,y,seed){
  const h=hash2(ix,iy,seed)&7;
  const grads=[[1,0],[-1,0],[0,1],[0,-1],[0.7071,0.7071],[-0.7071,0.7071],[0.7071,-0.7071],[-0.7071,-0.7071]];
  const g=grads[h]; return g[0]*(x-ix)+g[1]*(y-iy);
}
export function perlinNoise2D(x,y,seed=1){
  const x0=Math.floor(x),y0=Math.floor(y),x1=x0+1,y1=y0+1,u=fade(x-x0),v=fade(y-y0);
  return lerp(lerp(gradDot(x0,y0,x,y,seed),gradDot(x1,y0,x,y,seed),u),lerp(gradDot(x0,y1,x,y,seed),gradDot(x1,y1,x,y,seed),u),v)*0.7071+0.5;
}
export function fbmNoise2D(x,y,seed=1,{octaves=4,lacunarity=2,gain=0.5,warp=0}={}){
  let px=x,py=y;
  if(warp>0){
    const wx=perlinNoise2D(x*0.55+13.1,y*0.55-7.2,seed^0xa511e9b3)-0.5;
    const wy=perlinNoise2D(x*0.55-5.3,y*0.55+17.8,seed^0x63d83595)-0.5;
    px+=wx*warp; py+=wy*warp;
  }
  let amp=1,freq=1,sum=0,norm=0;
  for(let i=0;i<octaves;i+=1){sum+=(perlinNoise2D(px*freq,py*freq,seed+i*0x9e37)-0.5)*2*amp;norm+=amp;freq*=lacunarity;amp*=gain;}
  return norm?sum/norm:0;
}

function maskCount(mask){let n=0;for(const row of mask)for(const cell of row)if(cell)n+=1;return n;}
function components(mask){
  const h=mask.length,w=mask[0].length,seen=new Set(),out=[];
  for(let y=0;y<h;y+=1)for(let x=0;x<w;x+=1){
    if(!mask[y][x]||seen.has(key(x,y)))continue;
    const q=[{x,y}],cells=[];seen.add(key(x,y));
    for(let i=0;i<q.length;i+=1){const p=q[i];cells.push(p);for(const[dX,dY]of DIR4){const nx=p.x+dX,ny=p.y+dY,k=key(nx,ny);if(nx>=0&&ny>=0&&nx<w&&ny<h&&mask[ny][nx]&&!seen.has(k)){seen.add(k);q.push({x:nx,y:ny});}}}
    out.push(cells);
  }
  return out.sort((a,b)=>b.length-a.length);
}
function largestConnected(mask,preferred=null){
  const comps=components(mask); if(!comps.length)return mask;
  let keep=comps[0]; if(preferred){const p=key(preferred.x,preferred.y);const hit=comps.find(c=>c.some(v=>key(v.x,v.y)===p));if(hit)keep=hit;}
  const result=makeMask(mask[0].length,mask.length,false);for(const p of keep)result[p.y][p.x]=true;return result;
}
function connectComponents(mask){
  let comps=components(mask); if(comps.length<=1)return mask;
  const out=cloneMask(mask);
  while(comps.length>1){
    const base=comps[0];let best=null;
    for(let ci=1;ci<comps.length;ci+=1){const other=comps[ci];for(const a of base)for(const b of other){const d=Math.abs(a.x-b.x)+Math.abs(a.y-b.y);if(!best||d<best.d)best={a,b,d};}}
    let x=best.a.x,y=best.a.y;
    while(x!==best.b.x){x+=Math.sign(best.b.x-x);out[y][x]=true;}
    while(y!==best.b.y){y+=Math.sign(best.b.y-y);out[y][x]=true;}
    comps=components(out);
  }
  return out;
}
function clearBoundary(mask){const h=mask.length,w=mask[0].length;for(let x=0;x<w;x+=1){mask[0][x]=false;mask[h-1][x]=false;}for(let y=0;y<h;y+=1){mask[y][0]=false;mask[y][w-1]=false;}return mask;}
function radialFactor(x,y,w,h){const nx=(x-(w-1)/2)/Math.max(1,w/2),ny=(y-(h-1)/2)/Math.max(1,h/2);return Math.max(0,1-Math.sqrt(nx*nx+ny*ny));}

function primitiveStamp(w,h,rng){
  const mask=makeMask(w,h,false),kind=randInt(rng,0,3),rw=randInt(rng,Math.max(1,Math.floor(w*.2)),Math.max(1,Math.floor(w*.65))),rh=randInt(rng,Math.max(1,Math.floor(h*.2)),Math.max(1,Math.floor(h*.65))),ox=randInt(rng,0,Math.max(0,w-rw)),oy=randInt(rng,0,Math.max(0,h-rh));
  for(let y=0;y<h;y+=1)for(let x=0;x<w;x+=1){
    if(kind===0)mask[y][x]=x>=ox&&x<ox+rw&&y>=oy&&y<oy+rh;
    else if(kind===1){const cx=ox+(rw-1)/2,cy=oy+(rh-1)/2,dx=(x-cx)/Math.max(.5,rw/2),dy=(y-cy)/Math.max(.5,rh/2);mask[y][x]=dx*dx+dy*dy<=1;}
    else if(kind===2)mask[y][x]=(x>=ox&&x<ox+rw&&Math.abs(y-(oy+Math.floor(rh/2)))<=Math.max(0,Math.floor(rh/6)))||(y>=oy&&y<oy+rh&&Math.abs(x-(ox+Math.floor(rw/2)))<=Math.max(0,Math.floor(rw/6)));
    else mask[y][x]=(x>=ox&&x<ox+Math.max(1,Math.floor(rw/3))&&y>=oy&&y<oy+rh)||(y>=oy+Math.max(0,rh-Math.max(1,Math.floor(rh/3)))&&y<oy+rh&&x>=ox&&x<ox+rw);
  }
  return mask;
}
function booleanCombine(a,b,op){const h=a.length,w=a[0].length,out=makeMask(w,h,false);for(let y=0;y<h;y+=1)for(let x=0;x<w;x+=1){if(op==='union')out[y][x]=a[y][x]||b[y][x];else if(op==='subtract')out[y][x]=a[y][x]&&!b[y][x];else if(op==='intersect')out[y][x]=a[y][x]&&b[y][x];else out[y][x]=Boolean(a[y][x])!==Boolean(b[y][x]);}return out;}
function booleanMutate(mask,rng,count){let out=cloneMask(mask);const ops=['union','subtract','xor','union','subtract'];for(let i=0;i<count;i+=1){const stamp=primitiveStamp(out[0].length,out.length,rng);out=booleanCombine(out,stamp,ops[randInt(rng,0,ops.length-1)]);if(maskCount(out)<2)out=cloneMask(mask);out=largestConnected(out);}return out;}
function asymmetryMutate(mask,rng,strength){if(strength<=0)return mask;let out=cloneMask(mask);const w=out[0].length,h=out.length,side=randInt(rng,0,3),ops=Math.max(1,Math.round(strength*Math.max(w,h)));for(let i=0;i<ops;i+=1){const stamp=primitiveStamp(w,h,rng);for(let y=0;y<h;y+=1)for(let x=0;x<w;x+=1){const favored=side===0?x<w/2:side===1?x>=w/2:side===2?y<h/2:y>=h/2;if(favored&&stamp[y][x]&&rng()<.72)out[y][x]=true;else if(!favored&&stamp[y][x]&&rng()<.28*strength)out[y][x]=false;}}return largestConnected(out);}
function dropoutMutate(mask,rng,rate){if(rate<=0)return mask;const out=cloneMask(mask),h=out.length,w=out[0].length,candidates=[];for(let y=0;y<h;y+=1)for(let x=0;x<w;x+=1)if(out[y][x]){let edge=false;for(const[dx,dy]of DIR4){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=w||ny>=h||!out[ny][nx])edge=true;}if(edge)candidates.push({x,y});}
  for(const p of candidates)if(rng()<rate){out[p.y][p.x]=false;const comps=components(out);if(comps.length!==1||comps[0].length<3)out[p.y][p.x]=true;}return out;}
function noiseMask(w,h,rng,opts={}){const seed=Math.floor(rng()*0xffffffff)>>>0,scale=opts.scale??.22,threshold=opts.threshold??-.08,octaves=opts.octaves??4,warp=opts.warp??.8,out=makeMask(w,h,false);for(let y=0;y<h;y+=1)for(let x=0;x<w;x+=1){const n=fbmNoise2D(x*scale,y*scale,seed,{octaves,warp});const fall=radialFactor(x,y,w,h);out[y][x]=n+fall*(opts.centerBias??.55)>threshold;}return largestConnected(out);}
function cellularMask(w,h,rng,opts={}){let out=makeMask(w,h,false);const fill=opts.fill??.48;for(let y=0;y<h;y+=1)for(let x=0;x<w;x+=1)out[y][x]=rng()<fill;const steps=opts.steps??4;for(let s=0;s<steps;s+=1){const next=makeMask(w,h,false);for(let y=0;y<h;y+=1)for(let x=0;x<w;x+=1){let n=0;for(let dy=-1;dy<=1;dy+=1)for(let dx=-1;dx<=1;dx+=1){if(!dx&&!dy)continue;const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=w||ny>=h||out[ny][nx])n+=1;}next[y][x]=n>=4+(out[y][x]?0:1);}out=next;}return largestConnected(out);}
function randomWalkMask(w,h,rng,opts={}){const out=makeMask(w,h,false),target=Math.max(3,Math.round(w*h*(opts.fill??.48)));let x=Math.floor(w/2),y=Math.floor(h/2),count=1;out[y][x]=true;let guard=target*40;while(count<target&&guard-->0){const[dX,dY]=DIR4[randInt(rng,0,3)];x=clamp(x+dX,0,w-1);y=clamp(y+dY,0,h-1);if(!out[y][x]){out[y][x]=true;count+=1;}if(rng()<.08){x=clamp(x+randInt(rng,-2,2),0,w-1);y=clamp(y+randInt(rng,-2,2),0,h-1);}}return out;}
function voronoiMask(w,h,rng,opts={}){const sites=Array.from({length:opts.sites??Math.max(4,Math.round(Math.sqrt(w*h)/2))},()=>({x:rng()*w,y:rng()*h,floor:rng()<(opts.fill??.58),bias:rng()*.35-.175}));const out=makeMask(w,h,false);for(let y=0;y<h;y+=1)for(let x=0;x<w;x+=1){let best=null;for(const s of sites){const d=(x-s.x)**2+(y-s.y)**2+s.bias*w*h;if(!best||d<best.d)best={s,d};}out[y][x]=best.s.floor;}return largestConnected(out);}

export function generateFeatureMask({width,height,baseMask,algorithm='primitive',options={},preferred=null},rng){
  let out=baseMask?cloneMask(baseMask):makeMask(width,height,false);
  if(algorithm==='noise')out=noiseMask(width,height,rng,options.noise);
  else if(algorithm==='cellular')out=cellularMask(width,height,rng,options.cellular);
  else if(algorithm==='random_walk')out=randomWalkMask(width,height,rng,options.randomWalk);
  else if(algorithm==='voronoi')out=voronoiMask(width,height,rng,options.voronoi);
  else if(algorithm==='boolean')out=booleanMutate(out,rng,Math.max(1,options.booleanOps?.count??3));
  if(options.asymmetry?.enabled)out=asymmetryMutate(out,rng,options.asymmetry.strength??.65);
  if(options.booleanOps?.enabled)out=booleanMutate(out,rng,options.booleanOps.count??3);
  if(options.noiseBlend?.enabled){const n=noiseMask(width,height,rng,options.noiseBlend);out=booleanCombine(out,n,options.noiseBlend.op??'xor');out=largestConnected(out);}
  if(options.dropout?.enabled)out=dropoutMutate(out,rng,options.dropout.rate??.08);
  let preferredCell=preferred;
  if(preferred&&preferred.x>=0&&preferred.y>=0&&preferred.y<height&&preferred.x<width&&!out[preferred.y][preferred.x]){
    let nearest=null;
    for(let y=0;y<height;y+=1)for(let x=0;x<width;x+=1)if(out[y][x]){const d=Math.abs(x-preferred.x)+Math.abs(y-preferred.y);if(!nearest||d<nearest.d)nearest={x,y,d};}
    if(nearest){let x=preferred.x,y=preferred.y;out[y][x]=true;while(x!==nearest.x){x+=Math.sign(nearest.x-x);out[y][x]=true;}while(y!==nearest.y){y+=Math.sign(nearest.y-y);out[y][x]=true;}}
  }
  if(maskCount(out)<3)out=baseMask?largestConnected(baseMask,preferred):randomWalkMask(width,height,rng,{fill:.4});
  return largestConnected(out,preferredCell);
}

function connectMaskRooms(mask,rooms,rng){for(let i=1;i<rooms.length;i+=1){const a=rooms[i-1].center,b=rooms[i].center;let x=a.x,y=a.y;if(rng()<.5){while(x!==b.x){x+=Math.sign(b.x-x);mask[y][x]=true;}while(y!==b.y){y+=Math.sign(b.y-y);mask[y][x]=true;}}else{while(y!==b.y){y+=Math.sign(b.y-y);mask[y][x]=true;}while(x!==b.x){x+=Math.sign(b.x-x);mask[y][x]=true;}}}}
function bspTerrain(w,h,rng,opts={}){const leaves=[{x:1,y:1,w:w-2,h:h-2}],minLeaf=opts.minLeaf??7,depth=opts.depth??4;for(let d=0;d<depth;d+=1){for(let i=leaves.length-1;i>=0;i-=1){const leaf=leaves[i],splitVert=leaf.w>leaf.h?true:leaf.h>leaf.w?false:rng()<.5;if(splitVert&&leaf.w>=minLeaf*2){const cut=randInt(rng,minLeaf,leaf.w-minLeaf);leaves.splice(i,1,{x:leaf.x,y:leaf.y,w:cut,h:leaf.h},{x:leaf.x+cut,y:leaf.y,w:leaf.w-cut,h:leaf.h});}else if(!splitVert&&leaf.h>=minLeaf*2){const cut=randInt(rng,minLeaf,leaf.h-minLeaf);leaves.splice(i,1,{x:leaf.x,y:leaf.y,w:leaf.w,h:cut},{x:leaf.x,y:leaf.y+cut,w:leaf.w,h:leaf.h-cut});}}}
  const mask=makeMask(w,h,false),rooms=[];for(const leaf of leaves){const pad=randInt(rng,1,Math.max(1,Math.min(3,Math.floor(Math.min(leaf.w,leaf.h)/4)))),rw=Math.max(3,leaf.w-pad-randInt(rng,0,Math.max(0,pad))),rh=Math.max(3,leaf.h-pad-randInt(rng,0,Math.max(0,pad))),rx=clamp(leaf.x+randInt(rng,0,Math.max(0,leaf.w-rw)),1,w-rw-1),ry=clamp(leaf.y+randInt(rng,0,Math.max(0,leaf.h-rh)),1,h-rh-1),cells=[];for(let y=ry;y<ry+rh;y+=1)for(let x=rx;x<rx+rw;x+=1){mask[y][x]=true;cells.push({x,y});}rooms.push({shape:'bsp_leaf',origin:{x:rx,y:ry},width:rw,height:rh,center:{x:rx+Math.floor(rw/2),y:ry+Math.floor(rh/2)},cells});}
  rooms.sort((a,b)=>a.center.x-b.center.x||a.center.y-b.center.y);connectMaskRooms(mask,rooms,rng);return{mask,rooms};}

export function generateTerrainTopology({width,height,algorithm='classic',options={}},rng){
  if(algorithm==='classic')return null;
  let mask,rooms=[];
  if(algorithm==='noise_fbm')mask=noiseMask(width,height,rng,options.noise);
  else if(algorithm==='cellular')mask=cellularMask(width,height,rng,options.cellular);
  else if(algorithm==='random_walk')mask=randomWalkMask(width,height,rng,options.randomWalk);
  else if(algorithm==='voronoi')mask=voronoiMask(width,height,rng,options.voronoi);
  else if(algorithm==='bsp'){const out=bspTerrain(width,height,rng,options.bsp);mask=out.mask;rooms=out.rooms;}
  else throw new Error(`unsupported terrain algorithm: ${algorithm}`);
  mask=connectComponents(clearBoundary(mask));
  if(maskCount(mask)<3)throw new Error(`terrain algorithm ${algorithm} produced too little floor`);
  return{mask,rooms};
}

export const terrainAlgorithms=Object.freeze(['classic','noise_fbm','cellular','random_walk','bsp','voronoi']);
export const featureAlgorithms=Object.freeze(['primitive','boolean','noise','cellular','random_walk','voronoi']);
