export const MAX_LIGHT=8;
// Center-to-center Euclidean falloff, clipped by walls, closed doors and voxel faces.
export function lightReaches(geometry,boundaries,source,x,y){
  let cx=source.x,cy=source.y;if(cx===x&&cy===y)return true;
  const dx=x-cx,dy=y-cy,sx=Math.sign(dx),sy=Math.sign(dy),ax=dx?1/Math.abs(dx):Infinity,ay=dy?1/Math.abs(dy):Infinity;
  let tx=ax/2,ty=ay/2;
  const closed=(x,y,side)=>Boolean(boundaries[`${x},${y}/${side}`]);
  const ex=sx>0?'east':'west',ey=sy>0?'south':'north';
  while(cx!==x||cy!==y){
    if(Math.abs(tx-ty)<1e-9){
      if(closed(cx,cy,ex)||closed(cx,cy,ey)||geometry[cy]?.[cx+sx]!=='.'||geometry[cy+sy]?.[cx]!=='.'||closed(cx+sx,cy,ey)||closed(cx,cy+sy,ex))return false;
      cx+=sx;cy+=sy;tx+=ax;ty+=ay;
    }else if(tx<ty){if(closed(cx,cy,ex))return false;cx+=sx;tx+=ax;}
    else{if(closed(cx,cy,ey))return false;cy+=sy;ty+=ay;}
    if(cx===x&&cy===y)return true; // The first wall face receives light, cells behind it do not.
    if(geometry[cy]?.[cx]!=='.')return false;
  }
  return true;
}
export function computeLightGrid(geometry,sources,boundaries={}){
  const grid=geometry.map(row=>Array(row.length).fill(0));
  for(const source of sources){
    const r=source.radius,peak=source.intensity??MAX_LIGHT;
    for(let y=Math.max(0,source.y-r);y<=Math.min(grid.length-1,source.y+r);y++)for(let x=Math.max(0,source.x-r);x<=Math.min(grid[y].length-1,source.x+r);x++){
      const distance=Math.hypot(x-source.x,y-source.y);if(distance>r)continue;
      const level=r===0?peak:Math.max(1,Math.round(peak-(peak-1)*distance/r));
      if(level>grid[y][x]&&lightReaches(geometry,boundaries,source,x,y))grid[y][x]=Math.min(MAX_LIGHT,level);
    }
  }
  return grid;
}
