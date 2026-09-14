import {artRect} from './dungeon-art.js';
// A presentation-only ray caster. Geometry is a snapshot; it never moves or mutates the game.
const textures=new Map();
function texture(src,draw){if(textures.has(src)){const image=textures.get(src);if(!image.complete)image.addEventListener('load',draw,{once:true});return image;}const image=new Image();image.onload=draw;image.src=src;textures.set(src,image);return image;}
export function paintDungeon(canvas,dungeon,battle){
  const ctx=canvas.getContext('2d');if(!ctx)return;
  const width=800,height=400;canvas.width=width;canvas.height=height;
  const draw=()=>{
    if(!canvas.isConnected)return;
    ctx.imageSmoothingEnabled=false;
    const sky=ctx.createLinearGradient(0,0,0,height);sky.addColorStop(0,'#080e12');sky.addColorStop(.5,'#17282b');sky.addColorStop(.5,'#2a2924');sky.addColorStop(1,'#0a1011');ctx.fillStyle=sky;ctx.fillRect(0,0,width,height);
    const art=texture(dungeon.wall?.url??dungeon.background,draw), {x,y,facing}=dungeon.location;
    const wallDepth=[];
    const angle={north:-Math.PI/2,east:0,south:Math.PI/2,west:Math.PI}[facing],fov=Math.PI/2.6;
    for(let column=0;column<width;column+=3){
      const ray=angle+(column/width-.5)*fov,dx=Math.cos(ray),dy=Math.sin(ray);
      let dist=.01,hx=x+.5,hy=y+.5,px=x,py=y;
      while(dist<16){hx=x+.5+dx*dist;hy=y+.5+dy*dist;const nx=Math.floor(hx),ny=Math.floor(hy),sx=nx>px?'east':nx<px?'west':null,sy=ny>py?'south':ny<py?'north':null;if(sx&&dungeon.boundaries?.[`${px},${py}/${sx}`]||sy&&dungeon.boundaries?.[`${px},${py}/${sy}`])break;if(dungeon.geometry[ny]?.[nx]!=='.')break;px=nx;py=ny;dist+=.025;}
      wallDepth[column]=dist;
      const corrected=dist*Math.cos(ray-angle),wallHeight=Math.min(height*2,height/Math.max(.2,corrected)),top=(height-wallHeight)/2;
      const u=((Math.abs(hx-Math.round(hx))<.04?hy:hx)%1+1)%1;
      const water=dungeon.cells[Math.floor(hy)]?.[Math.floor(hx)]?.water;
      if(water&&!dungeon.voxel){ctx.fillStyle='#287f9a';ctx.fillRect(column,top,3,wallHeight);ctx.fillStyle='#8fd4dd';for(let line=top+8;line<top+wallHeight;line+=18)ctx.fillRect(column,line,3,2);}
      else if(art.complete&&art.naturalWidth){
        if(dungeon.wall){const [sx,sy,sw,sh]=artRect(art,dungeon.wall);ctx.drawImage(art,sx+u*(sw-1),sy,1,sh,column,top,3,wallHeight);}
        else ctx.drawImage(art,Math.floor(18+u*50),45,2,76,column,top,3,wallHeight);
      }
      else{ctx.fillStyle='#405b5a';ctx.fillRect(column,top,3,wallHeight);}
      ctx.fillStyle=`rgba(2,9,11,${Math.min(.92,.16+corrected*.095)})`;ctx.fillRect(column,top,3,wallHeight);
    }
    if(dungeon.voxel){
      // Floor casting uses only the current height's projected water and support surfaces.
      for(let row=height/2+4;row<height;row+=4)for(let column=0;column<width;column+=3){
        const ray=angle+(column/width-.5)*fov,dist=height*.32/((row-height/2)*Math.cos(ray-angle));
        if(dist>=wallDepth[column])continue;const tx=Math.floor(x+.5+Math.cos(ray)*dist),ty=Math.floor(y+.5+Math.sin(ray)*dist),cell=dungeon.cells[ty]?.[tx];
        if(!cell||cell.wall)continue;
        if(cell.waterDepth){ctx.fillStyle=['','#356e75','#23607e','#123e60'][cell.waterDepth];ctx.fillRect(column,row,3,4);if((row+tx*5+ty*3)%20<4){ctx.fillStyle='#8dc8cf';ctx.fillRect(column,row,3,1);}}
        else if(!cell.floor){ctx.fillStyle='#03070a';ctx.fillRect(column,row,3,4);}
      }
    }
    const shade=ctx.createRadialGradient(width*.5,height*.55,60,width*.5,height*.5,width*.62);shade.addColorStop(0,'#00000000');shade.addColorStop(1,'#000000d8');ctx.fillStyle=shade;ctx.fillRect(0,0,width,height);
    if(!battle){
      const ahead=dungeon.objects.filter(o=>{const vx=o.x-x,vy=o.y-y;return Math.abs(vx)+Math.abs(vy)<=1&&vx*Math.cos(angle)+vy*Math.sin(angle)>=-.1;});
      if(ahead.length){
        const object=ahead.find(o=>o.art)??ahead[0],sprite=object.art?texture(object.art.url,draw):null;
        if(sprite?.complete&&sprite.naturalWidth){ctx.drawImage(sprite,...artRect(sprite,object.art),width/2-60,height*.45,120,120);return;}
        ctx.textAlign='center';ctx.font='bold 38px serif';ctx.fillStyle='#edc989';ctx.fillText(ahead[0].glyph,width/2,height*.6);}
    }
  };draw();
}
