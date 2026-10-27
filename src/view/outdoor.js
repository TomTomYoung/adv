// Code-native pixel scenery. These themes never add passable cells or interactable objects.
import {paintFieldLandmark} from './outdoor-fields.js';
const common={sky:'#85adbc',cloud:'#d8d6bf',far:'#697e83',hill:'#778e74',green:'#536849',stone:'#858574',mortar:'#555b52',light:'#acaa91',wood:'#705943',dark:'#3a4540',water:'#507b87',roof:'#786553',ground:[139,128,98],grain:[164,151,116]};
const theme=(changes)=>Object.freeze({...common,...changes});
export const OUTDOOR_PALETTES=Object.freeze({
  market_road:theme({boundary:'parapet',landmark:'bridge',paving:true}),
  pilgrim_road:theme({boundary:'terrace',landmark:'chapel',sky:'#a6b3b7',hill:'#7d8580',ground:[137,133,120],grain:[171,166,147],paving:true}),
  village_road:theme({boundary:'hedge',landmark:'coast',hill:'#82936b',ground:[135,111,74],grain:[167,141,91]}),
  highland_lower:theme({boundary:'terrace',landmark:'hills',ground:[145,126,92],grain:[174,157,115]}),
  highland_upper:theme({boundary:'parapet',landmark:'academy',sky:'#8faeba',ground:[153,148,127],grain:[183,175,148],paving:true}),
  salome_canal:theme({boundary:'canal',landmark:'water',sky:'#91b6bf',ground:[130,139,126],grain:[163,164,141],paving:true}),
  salome_outskirts:theme({boundary:'fence',landmark:'homes',ground:[137,121,91],grain:[170,151,111]}),
  salome_cemetery:theme({boundary:'cemetery',landmark:'cypress',sky:'#a4b1ad',cloud:'#d7d8c5',hill:'#7a8980',ground:[128,132,113],grain:[158,160,138],paving:true}),
  salome_valley:theme({boundary:'rock',landmark:'valley',sky:'#8ba6b0',hill:'#737f75',stone:'#777f79',ground:[123,114,91],grain:[156,145,116]}),
  royal_bridge:theme({boundary:'parapet',landmark:'royal_bridge',river:true,sky:'#90b2bc',ground:[143,137,115],grain:[177,167,141],paving:true}),
  royal_trial:theme({boundary:'boulders',landmark:'royal_trial',sky:'#b1b9b5',hill:'#8a8b79',stone:'#85887b',ground:[142,128,103],grain:[177,162,130]}),
  royal_fort:theme({boundary:'ruin',landmark:'royal_fort',sky:'#9fadb4',hill:'#7d857a',stone:'#7d8177',ground:[124,120,103],grain:[154,148,128],paving:true}),
  royal_lakeshore:theme({boundary:'fence',landmark:'royal_lakeshore',river:true,sky:'#99bdc5',water:'#527e8b',ground:[154,138,103],grain:[183,168,126]}),
  royal_island:theme({boundary:'hedge',landmark:'royal_island',waterSurround:true,river:true,sky:'#8cb6c2',hill:'#7c9269',ground:[130,119,84],grain:[168,151,107]}),
  observatory_front:theme({boundary:'sandbags',landmark:'observatory_front',sky:'#a5ada8',hill:'#7a8171',stone:'#8d8670',light:'#afa58c',ground:[121,111,87],grain:[151,139,109]}),
  observatory_artillery:theme({boundary:'terrace',landmark:'observatory_artillery',sky:'#adb9bc',hill:'#818779',ground:[136,132,112],grain:[166,162,136],paving:true}),
  observatory_camp:theme({boundary:'fence',landmark:'observatory_camp',sky:'#a2b7b8',hill:'#869078',ground:[142,125,96],grain:[173,156,119]}),
  observatory_bridge:theme({boundary:'timber',landmark:'observatory_bridge',river:true,waterSurround:true,sky:'#a1b8be',water:'#5d7f83',ground:[134,106,75],grain:[164,132,92],boards:true}),
  observatory_fort:theme({boundary:'rampart',landmark:'observatory_fort',sky:'#98adb6',hill:'#7b8576',stone:'#858779',ground:[136,132,116],grain:[170,164,143],paving:true}),
  observatory_village:theme({boundary:'hedge',landmark:'observatory_village',sky:'#a4bac0',hill:'#87956e',roof:'#866b4e',ground:[145,125,89],grain:[176,154,108]}),
  observatory_supply:theme({boundary:'palisade',landmark:'observatory_supply',sky:'#a9b7b8',hill:'#838a71',wood:'#776247',ground:[131,116,90],grain:[163,145,111]})
});
const frac=n=>n-Math.floor(n);
const noise=(x,y)=>((Math.imul(x|0,374761393)^Math.imul(y|0,668265263))>>>0)%17;
const rect=(ctx,color,x,y,w,h)=>{ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),Math.ceil(w),Math.ceil(h));};
const polygon=(ctx,color,points)=>{ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(...points[0]);for(const p of points.slice(1))ctx.lineTo(...p);ctx.closePath();ctx.fill();};

export function outdoorFloorColor(themeId,wx,wy,cell,distance){
  const p=OUTDOOR_PALETTES[themeId],u=frac(wx),v=frac(wy),n=noise(Math.floor(wx*48),Math.floor(wy*48));
  const seam=p.boards?frac(wy*6)<.08||frac(wx+Math.floor(wy*6)*.3)<.025:p.paving&&(frac(wx*3+Math.floor(wy*4)*.5)<.055||frac(wy*4)<.06);
  const grass=!p.paving&&!p.boards&&(u<.06||u>.94||v<.025)&&n<11;
  const base=grass?[83,104,57]:seam?p.ground.map(v=>v*.65):n<4?p.grain:p.ground;
  const light=Math.max(.4,1/(1+distance*.055))*(.22+.78*(cell.illumination??8)/8);
  return base.map(v=>v*light);
}

// A wide panorama is tied to compass direction, so turning changes the distant view.
export function paintOutdoorSky(ctx,themeId,facing,width,height){
  const p=OUTDOOR_PALETTES[themeId],h=height/2,offset={east:0,south:1,west:2,north:3}[facing]*width*.55;
  const water=p.landmark==='water'||p.waterSurround;
  rect(ctx,p.sky,0,0,width,height);rect(ctx,water?p.water:p.hill,0,h,width,h);
  for(let y=h+4;y<height;y+=8+Math.floor((y-h)/15))for(let x=0;x<width;x+=52){
    rect(ctx,water?p.sky:p.green,x+(y%23),y,12+(y-h)/12,2);
  }
  for(let i=-2;i<8;i++){
    const x=((i*211-offset)%(width+240)+width+240)%(width+240)-120,y=30+(i+2)%3*19;
    rect(ctx,p.cloud,x,y,83,5);rect(ctx,p.cloud,x+17,y-6,46,6);
  }
  for(let i=-2;i<8;i++){
    const x=i*180-offset%180;
    polygon(ctx,p.far,[[x-90,h],[x+15,h-60-(i%2)*14],[x+75,h-40],[x+180,h]]);
    polygon(ctx,p.hill,[[x-40,h],[x+50,h-27],[x+130,h-39],[x+220,h]]);
  }
  if(p.river||['coast','water','bridge'].includes(p.landmark)){
    rect(ctx,p.water,0,h-30,width,30);
    for(let x=0;x<width;x+=48)rect(ctx,p.cloud,x+(offset%48),h-16+(x%3)*2,21,2);
  }
  const landmarkX=((width*.6-offset)%(width*1.8)+width*1.8)%(width*1.8)-width*.25;
  if(p.landmark==='bridge'){
    rect(ctx,p.stone,landmarkX-130,h-45,260,10);
    for(let x=-130;x<=130;x+=52){rect(ctx,p.light,landmarkX+x,h-50,8,50);rect(ctx,p.mortar,landmarkX+x+7,h-35,4,35);}
  }
  if(['chapel','academy','homes'].includes(p.landmark)){
    for(let i=-2;i<=2;i++){
      const x=landmarkX+i*40,y=h-32-Math.abs(i)*4;
      rect(ctx,p.stone,x,y,35,h-y);polygon(ctx,p.roof,[[x-4,y],[x+17,y-19],[x+39,y]]);
      rect(ctx,p.dark,x+9,y+9,5,9);rect(ctx,p.light,x+23,y+8,5,10);
    }
    if(p.landmark!=='homes'){
      rect(ctx,p.light,landmarkX+4,h-90,20,90);polygon(ctx,p.roof,[[landmarkX,h-90],[landmarkX+14,h-113],[landmarkX+29,h-90]]);
      rect(ctx,p.dark,landmarkX+11,h-82,7,13);
      if(p.landmark==='academy')for(let i=0;i<14;i++){const w=Math.round(Math.sqrt(14*14-(14-i)**2)*2);rect(ctx,p.water,landmarkX+60-w,h-64+i,w*2,1);}
    }
  }
  if(['cypress','valley','hills'].includes(p.landmark))for(let i=0;i<12;i++){
    const x=(i*113-offset/2+width*3)%width,y=h-20-(i%3)*8;
    polygon(ctx,p.green,[[x-8,h],[x,y-(p.landmark==='cypress'?55:20)],[x+9,h]]);
  }
  paintFieldLandmark(ctx,themeId,p,landmarkX,h);
}

// Boundary bases stay at the ray-cast ground contact. Low boundaries expose sky,
// while all collisions and occlusion still come from the original geometry.
export function outdoorBoundaryHeight(themeId,hit){
  const kind=OUTDOOR_PALETTES[themeId].boundary,u=hit?.u??.5;
  if(kind==='rock')return .7;
  if(kind==='boulders')return u<.3?.36:.31;
  if(kind==='rampart')return .5;
  if(kind==='ruin')return u<.35?.46:.29;
  if(kind==='sandbags')return .24;
  if(kind==='palisade')return .44;
  if(kind==='cemetery')return u>.28&&u<.7?.4:.21;
  if(kind==='fence'||kind==='timber')return u<.08||u>.92?.38:.28;
  return kind==='hedge'?.32:.27;
}
export function paintOutdoorBoundary(ctx,themeId,{column,u,x,y},top,h,stride){
  const p=OUTDOOR_PALETTES[themeId];
  if(p.boundary!=='timber')rect(ctx,p.stone,column,top,stride,h);
  for(let band=0;band<64;band++){
    const v=band/64,stagger=Math.floor(band/16)%2*.5,n=noise(x*17+Math.floor(u*24),y*17+Math.floor(band/4));
    let color=n<3?p.light:p.stone;
    if(band%16===0||frac(u*3+stagger)<.035)color=p.mortar;
    if(p.boundary==='hedge')color=v<.92?n<5?p.hill:p.green:p.stone;
    if(p.boundary==='rock'||p.boundary==='boulders'){const rock=noise(x*7+Math.floor(u*7+Math.sin(v*13)*.2),y*7+Math.floor(v*8));color=rock<3?p.mortar:rock>12?p.light:p.stone;}
    if(p.boundary==='fence')color=u<.08||u>.92||band>=12&&band<18||band>=40&&band<46?p.wood:p.green;
    if(p.boundary==='timber')color=u<.08||u>.92||band>=12&&band<18||band>=40&&band<46?p.wood:null;
    if(p.boundary==='palisade')color=frac(u*7)<.1?p.dark:n<4?p.light:p.wood;
    if(p.boundary==='sandbags')color=band%16<3||frac(u*2+stagger)<.07?p.mortar:n<5?p.light:p.stone;
    if(p.boundary==='cemetery'&&v<.6)color=u>.28&&u<.7?p.light:p.green;
    if(color)rect(ctx,color,column,top+h*v,stride,h/64+1);
  }
  if(['parapet','terrace','canal','rampart','ruin'].includes(p.boundary))rect(ctx,p.light,column,top,stride,h*.065);
}
