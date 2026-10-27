// Code-native materials for existing enclosed sites. Decorations do not create
// objects, openings, equipment, services or story-state changes.
const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
const theme=values=>Object.freeze(Object.fromEntries(Object.entries(values).map(([k,v])=>[k,typeof v==='string'&&v.startsWith('#')?rgb(v):v])));
export const INDOOR_PALETTES=Object.freeze({
  trade_corridor:theme({wall:'#8a8573',mortar:'#4d524b',light:'#b3a88a',wood:'#80613e',dark:'#303d3a',accent:'#ad985f',floor:'#928570',grain:'#b0a18a',ceiling:'#555950',pattern:'stone'}),
  trade_refuge:theme({wall:'#9c927c',mortar:'#5d5d50',light:'#c9ba92',wood:'#886541',dark:'#3c4038',accent:'#8f9771',floor:'#9c8c70',grain:'#b6a384',ceiling:'#6d6251',pattern:'tiles'}),
  border_customs:theme({wall:'#92978a',mortar:'#505b56',light:'#c6c4a5',wood:'#745940',dark:'#2f4140',accent:'#bba16b',floor:'#8b968a',grain:'#a7b0a0',ceiling:'#596762',pattern:'tiles'}),
  sand_gallery:theme({wall:'#b19e7c',mortar:'#76684f',light:'#d0bc92',wood:'#8d714b',dark:'#5d5845',accent:'#ab8c59',floor:'#b5a076',grain:'#d2bc8c',ceiling:'#8b7f64',pattern:'sand'}),
  burnt_library:theme({wall:'#6c7167',mortar:'#353c38',light:'#979b83',wood:'#494238',dark:'#252f2c',accent:'#98734e',floor:'#695e4b',grain:'#8b7b5e',ceiling:'#434a43',pattern:'boards'}),
  rescue_tunnel:theme({wall:'#807d70',mortar:'#454b45',light:'#a5a18a',wood:'#765938',dark:'#303b37',accent:'#a2a991',floor:'#857e68',grain:'#aaa087',ceiling:'#585d53',pattern:'rubble'}),
  chapel_works:theme({wall:'#858f88',mortar:'#454f4d',light:'#adb3a4',wood:'#745e44',dark:'#2d3b39',accent:'#a18a60',floor:'#83887c',grain:'#a2a795',ceiling:'#52625e',pattern:'tiles'}),
  sunken_inn:theme({wall:'#7d8c7e',mortar:'#435d56',light:'#b3b69b',wood:'#6d6248',dark:'#2c4945',accent:'#919b78',floor:'#817c5c',grain:'#a2a07a',ceiling:'#4d665d',pattern:'boards'}),
  observatory_rescue:theme({wall:'#789591',mortar:'#3f605e',light:'#aec5b6',wood:'#69796b',dark:'#274a4b',accent:'#a7af8b',floor:'#718f85',grain:'#99b5a4',ceiling:'#426b6b',pattern:'stone'})
});
const frac=v=>v-Math.floor(v),noise=(x,y)=>((Math.imul(x,374761393)^Math.imul(y,668265263))>>>0)%17;
const cache=new Map();
function wallColor(id,p,x,y,variant){
  const seam=y%16<2||(x+Math.floor(y/16)%2*16)%32<2;
  let c=seam?p.mortar:noise(x,y)<2?p.light:p.wall;
  if(id==='trade_corridor'){
    if(y>51)c=p.dark;
    if(y>30&&y<52&&x>7&&x<56)c=(x%16<3||y===32||y===48)?p.light:p.wood;
    if(variant&&x>26&&x<35&&y<29)c=x===27||x===33?p.light:p.mortar;
  }else if(id==='trade_refuge'){
    if(x>6&&x<58&&y>24&&y<49)c=p.dark;
    if(y>40&&y<48&&x>10&&x<54)c=y<44?p.accent:p.wood;
    if(y>48&&y<53&&x>7&&x<57)c=p.wood;
    if(variant&&x>24&&x<39&&y>17&&y<25)c=y<23?p.light:p.accent;
  }else if(id==='border_customs'){
    if(y>41)c=x%8<2?p.dark:p.wood;
    if(x>9&&x<55&&y>10&&y<38)c=x%8<2||y===25?p.mortar:p.dark;
    if(y>37&&y<43&&x>5&&x<59)c=y<40?p.light:p.wood;
    if(variant&&x>20&&x<35&&y>18&&y<35)c=y%4===0&&x>23&&x<32?p.mortar:p.light;
  }else if(id==='sand_gallery'){
    c=(y+Math.floor(Math.sin(x*.13)*3))%13<2?p.mortar:noise(x>>2,y>>1)<4?p.light:p.wall;
    if(y>48+Math.sin(x*.1)*4)c=noise(x,y)<4?p.light:p.accent;
    if(variant&&x>8&&x<55&&y>37&&y<42)c=p.wood;
  }else if(id==='burnt_library'){
    c=p.dark;
    if(x<5||x>58||y%19<4)c=noise(x,y)<3?p.mortar:p.wood;
    else if(y%19>7&&y%19<18){
      const book=Math.floor(x/5);c=x%5===0?p.dark:[p.wall,p.accent,p.light,p.mortar][book%4];
      if(y%19===10)c=p.wood;
      if(variant&&x>23&&x<43&&y<38)c=p.dark;
    }
  }else if(id==='rescue_tunnel'){
    c=noise(x>>3,y>>3)<5?p.mortar:p.wall;
    if(x<6||x>57||y<7)c=x%3===0?p.dark:p.wood;
    if(variant&&x>16&&x<48&&y>17&&y<38)c=x%5<2||y%6<2?p.light:p.dark;
    if(y>50&&noise(x>>2,y>>2)<9)c=p.mortar;
  }else if(id==='chapel_works'){
    if(x<6||y>9&&y<17)c=x===3||y===11?p.light:p.mortar;
    if(x>13&&x<55&&y>26&&y<54)c=(x%13<2||y%12<2)?p.light:p.dark;
    if(variant&&x>28&&x<34&&y>27&&y<46)c=p.accent;
    if(y>47&&y<52)c=p.wood;
  }else if(id==='sunken_inn'){
    if(y>34)c=x%8<2?p.mortar:p.wood;
    if(x>13&&x<51&&y>10&&y<34)c=x%18<3||y===23?p.wood:p.dark;
    if(y>41&&y<46&&x>5&&x<59)c=p.light;
    if(y>45&&y<59&&(x>9&&x<15||x>48&&x<54))c=p.wood;
    if(variant&&x>27&&x<37&&y>35&&y<42)c=p.accent;
  }else if(id==='observatory_rescue'){
    if(x>6&&x<13||y>12&&y<19)c=x===8||y===14?p.light:p.mortar;
    if(variant&&x>24&&x<46&&y>28&&y<47)c=x===25||x===44||y===29||y===45?p.light:p.dark;
    if(variant&&x>30&&x<40&&y>32&&y<43)c=p.accent;
  }
  return c;
}
function materials(id){
  if(cache.has(id))return cache.get(id);
  const p=INDOOR_PALETTES[id],size=64,pixels=new Uint8ClampedArray(size*size*4),walls=[[],[]];
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const joint=p.pattern==='boards'?y%8<1:p.pattern==='sand'?false:y%16<1||(x+Math.floor(y/16)%2*16)%32<1;
    const n=noise(x,y),color=joint?p.mortar:n<4?p.grain:p.floor;
    const ripple=p.pattern==='sand'&&Math.floor(y+Math.sin(x*.2)*2)%11===0;
    pixels.set([...color.map(v=>ripple?v*.86:v),255],(y*size+x)*4);
    for(let variant=0;variant<2;variant++)walls[variant].push('rgb('+wallColor(id,p,x,y,variant).join(',')+')');
  }
  const result={floor:{width:size,height:size,pixels},walls};cache.set(id,result);return result;
}
export const indoorFloorMaterial=id=>materials(id).floor;
export function indoorCeilingColor(id,wx,wy,cell,distance){
  const p=INDOOR_PALETTES[id],beam=frac(wx)<.07||frac(wy)<.07;
  const c=beam?p.mortar:p.ceiling,light=Math.max(.22,1/(1+distance*.13))*(.22+.78*(cell.illumination??8)/8);
  return c.map(v=>v*light);
}
export function paintIndoorWall(ctx,id,hit,top,height,stride){
  const column=Math.min(63,Math.floor(hit.u*64)),variant=(hit.x+hit.y)&1,colors=materials(id).walls[variant];
  for(let row=0;row<64;row++){ctx.fillStyle=colors[row*64+column];ctx.fillRect(hit.column,top+height*row/64,stride,height/64+1);}
}
export function paintIndoorBackdrop(ctx,id,width,height){
  const p=INDOOR_PALETTES[id];ctx.fillStyle='rgb('+p.ceiling.map(v=>Math.round(v*.45)).join(',')+')';ctx.fillRect(0,0,width,height/2);
  ctx.fillStyle='rgb('+p.floor.map(v=>Math.round(v*.35)).join(',')+')';ctx.fillRect(0,height/2,width,height/2);
}
// The current cell's real depth comes from Core, including existing air pockets.
export function paintIndoorWater(ctx,depth,location,width,height){
  if(depth!==3)return;
  ctx.fillStyle='rgba(15,87,105,.23)';ctx.fillRect(0,0,width,height);
  const direction={north:0,east:1,south:2,west:3}[location.facing];
  for(let i=0;i<22;i++){
    const x=(i*137+location.x*31+direction*47)%width,y=(i*89+location.y*43)%(height-40)+20;
    ctx.fillStyle='rgba(151,205,202,.24)';ctx.fillRect(x,y,2,i%3===0?5:2);
  }
}
