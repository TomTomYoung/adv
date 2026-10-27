// Distant silhouettes for existing quest destinations. These are decoration;
// route crossings, broken bridge cells and story outcomes remain in Core.
const rect=(c,color,x,y,w,h)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.ceil(w),Math.ceil(h));};
const poly=(c,color,points)=>{c.fillStyle=color;c.beginPath();c.moveTo(...points[0]);for(const p of points.slice(1))c.lineTo(...p);c.closePath();c.fill();};
function house(c,p,x,y,w=46){
  rect(c,p.light,x,y-29,w,29);poly(c,p.roof,[[x-5,y-29],[x+w/2,y-49],[x+w+5,y-29]]);
  rect(c,p.dark,x+w/2-4,y-17,8,17);rect(c,p.mortar,x+7,y-23,7,8);
}
function tent(c,p,x,y,w=42){
  poly(c,p.light,[[x,y],[x+w/2,y-30],[x+w,y]]);
  poly(c,p.roof,[[x+w/2,y-30],[x+w/2+3,y],[x+w,y]]);
  poly(c,p.dark,[[x+w/2-5,y],[x+w/2,y-17],[x+w/2+5,y]]);
}
function crate(c,p,x,y,w=22){
  rect(c,p.wood,x,y-w,w,w);rect(c,p.light,x+3,y-w,3,w);rect(c,p.light,x+w-6,y-w,3,w);
  rect(c,p.dark,x,y-w,w,2);rect(c,p.dark,x,y-3,w,3);
}
function tower(c,p,x,y,height=65,ruined=false){
  rect(c,p.stone,x,y-height,29,height);rect(c,p.mortar,x+21,y-height,8,height);
  for(let i=0;i<3;i++)if(!ruined||i!==1)rect(c,p.light,x+i*11,y-height-7,7,9);
  for(let j=0;j<3;j++)rect(c,p.dark,x+9,y-height+13+j*17,5,8);
}
function fort(c,p,x,y,ruined=false){
  rect(c,p.stone,x-76,y-36,155,36);rect(c,p.light,x-76,y-40,155,5);
  for(let i=-70;i<80;i+=15)if(!ruined||i%3)rect(c,p.stone,x+i,y-47,8,10);
  tower(c,p,x-86,y,70,ruined);tower(c,p,x+60,y,ruined?50:70,ruined);
  rect(c,p.dark,x-9,y-27,22,27);rect(c,p.wood,x-6,y-24,16,24);
}
function bridge(c,p,x,y,broken=false,timber=false){
  const deck=timber?p.wood:p.stone;
  for(let i=-3;i<3;i++){
    if(broken&&i===0)continue;
    rect(c,deck,x+i*36,y-22,37,8);rect(c,p.light,x+i*36,y-27,4,29);
    if(!timber)rect(c,p.mortar,x+i*36+4,y-14,5,16);
  }
  if(broken)poly(c,p.stone,[[x+4,y+3],[x+28,y-2],[x+31,y+7],[x+8,y+10]]);
}
function tree(c,p,x,y,height=48){
  rect(c,p.wood,x-2,y-20,4,20);poly(c,p.green,[[x-16,y-12],[x,y-height],[x+17,y-12]]);
}
function cannon(c,p,x,y){
  rect(c,p.dark,x-4,y-15,13,15);rect(c,p.wood,x-12,y-7,34,5);
  poly(c,p.dark,[[x-10,y-17],[x+47,y-31],[x+50,y-24],[x-7,y-10]]);
  rect(c,p.light,x+43,y-30,5,7);rect(c,p.mortar,x-1,y-6,7,8);
}

export function paintFieldLandmark(c,id,p,x,h){
  switch(id){
    case 'royal_bridge':
      bridge(c,p,x,h-10);crate(c,p,x-42,h-33,19);
      // A tipped load beside the distant deck; no new obstruction is implied.
      poly(c,p.wood,[[x-30,h-45],[x-14,h-53],[x-3,h-38],[x-20,h-31]]);break;
    case 'royal_trial':
      for(let i=-3;i<=3;i++){const height=33+(i%2===0?13:0);rect(c,p.stone,x+i*28,h-height,18,height);rect(c,p.light,x+i*28,h-height,4,height);}
      rect(c,p.mortar,x-92,h-12,190,12);break;
    case 'royal_fort':
      poly(c,p.far,[[x-170,h],[x-40,h-36],[x+120,h-24],[x+170,h]]);
      fort(c,p,x+18,h-18,true);bridge(c,p,x-136,h-7,true);break;
    case 'royal_lakeshore':
      for(let i=0;i<8;i++)rect(c,p.wood,x-90+i*13,h-16,11,5);
      for(const dx of [-90,-25,13])rect(c,p.light,x+dx,h-23,4,22);
      house(c,p,x+40,h,37);tree(c,p,x+102,h);
      poly(c,p.wood,[[x-58,h-10],[x-4,h-10],[x-13,h-1],[x-49,h-1]]);break;
    case 'royal_island':
      poly(c,p.hill,[[x-145,h+10],[x-91,h-13],[x+95,h-18],[x+165,h+10]]);
      for(const dx of [-100,45,95])tree(c,p,x+dx,h-8,57);
      tent(c,p,x-65,h-5);tent(c,p,x-8,h-7,35);break;
    case 'observatory_front':
      for(let i=-3;i<=2;i++)tent(c,p,x+i*47,h-10-(i%2)*5,38);
      for(let i=-7;i<=8;i++)rect(c,p.stone,x+i*15,h-5,13,6);
      rect(c,p.wood,x+100,h-52,5,47);rect(c,p.light,x+91,h-44,23,7);break;
    case 'observatory_artillery':
      rect(c,p.stone,x-113,h-17,230,17);rect(c,p.light,x-113,h-20,230,4);
      for(const dx of [-75,0,65])cannon(c,p,x+dx,h-20);tower(c,p,x+120,h,52);break;
    case 'observatory_camp':
      house(c,p,x+42,h,58);rect(c,p.mortar,x+81,h-62,9,29);
      tent(c,p,x-100,h,51);rect(c,p.wood,x-35,h-48,3,48);rect(c,p.wood,x+27,h-48,3,48);
      rect(c,p.dark,x-35,h-43,65,1);for(let i=0;i<4;i++)rect(c,i%2?p.cloud:p.light,x-29+i*14,h-42,10,20+i%2*4);
      rect(c,p.water,x-27,h-8,53,6);break;
    case 'observatory_bridge':
      bridge(c,p,x,h-8,false,true);rect(c,p.wood,x+110,h-16,43,5);
      poly(c,p.wood,[[x+104,h-2],[x+155,h-2],[x+147,h+7],[x+112,h+7]]);crate(c,p,x-55,h-31,16);break;
    case 'observatory_fort':
      fort(c,p,x,h);house(c,p,x+106,h,35);break;
    case 'observatory_village':
      for(let i=-2;i<=2;i++)house(c,p,x+i*53,h-(i%2===0?0:6),43);
      for(let i=-7;i<=8;i++)rect(c,p.wood,x+i*19,h-17,4,19);
      tree(c,p,x-144,h,63);break;
    case 'observatory_supply':
      house(c,p,x-93,h,75);house(c,p,x+18,h,83);
      for(let i=-2;i<=3;i++)crate(c,p,x+i*26,h+4,20);
      crate(c,p,x-26,h-16,18);crate(c,p,x+52,h-16,18);break;
  }
}
