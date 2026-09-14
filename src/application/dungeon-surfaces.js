import {dungeonTile,dungeonBlock,dungeonWaterDepth} from '../core/dungeons.js';
import {depthName} from '../core/voxels.js';
import {faces} from '../core/systems/common.js';
import {projectVoxels} from './voxel-projection.js';

export function projectDungeonSurfaces(engine,systems){
  const {data,state}=engine,map=engine.map();if(!map)return {};
  const seen=new Set(state.discovered[map.id]??[]),loc=state.location;
  const terrain=map.voxels?projectVoxels(engine):{cells:map.tiles.map((row,y)=>Array.from(row,(_,x)=>{
    const wall=dungeonTile(data,state,map,x,y)==='#',door=map.objects.some(o=>o.x===x&&o.y===y&&o.blocking&&engine.objectState(o)!=='open');
    const waterDepth=wall?0:dungeonWaterDepth(data,state,map,x,y);
    return {x,y,known:seen.has(`${x},${y}`),wall,opaque:wall||door||Boolean(dungeonBlock(data,state,map,x,y)&&!waterDepth),blocked:!engine.walkable(map,x,y),water:waterDepth>0,waterDepth,waterLabel:depthName(waterDepth),floor:!wall};
  }))};
  // A closed object door also hides the view in a cubic map; water and holes never become masonry.
  if(map.voxels)for(const row of terrain.cells)for(const cell of row)cell.opaque=cell.wall||map.objects.some(o=>o.x===cell.x&&o.y===cell.y&&(o.z??0)===(loc.z??0)&&o.blocking&&engine.objectState(o)!=='open');
  terrain.geometry=terrain.cells.map(row=>row.map(c=>c.opaque?'#':'.').join(''));
  const [dx,dy]=faces[loc.facing],ahead=terrain.cells[loc.y+dy]?.[loc.x+dx],here=terrain.cells[loc.y]?.[loc.x];
  const closedFace=Boolean(terrain.boundaries?.[`${loc.x},${loc.y}/${loc.facing}`]);
  const waterSystem=systems.find(s=>s.kind==='waterworks'),waterMarker=waterSystem?.markers.find(m=>m.kind==='water'&&m.x===loc.x+dx&&m.y===loc.y+dy);
  let text='';
  if(ahead?.waterDepth&&!ahead.opaque&&!closedFace){
    text=`正面：${ahead.waterLabel}・${ahead.blocked?'通行不可':'通行可'}。`;
    if(ahead.blocked)text+=map.voxels?'排水するか、別の足場を探してください。':waterMarker?.waitable?'水位が下がるのを待つか、水門で排水してください。':waterMarker?.controlName?`${waterMarker.controlName}で水を止めてください。待つだけでは水は引きません。`:'水を抜くか、別の経路を探してください。';
  }else if(here?.waterDepth)text=`足元：${here.waterLabel}。`;
  const wait=waterMarker?.waitable?waterSystem.actions.find(a=>a.intent.action==='wait'):null;
  terrain.surfaceNotice=text?{text,action:ahead?.blocked&&ahead.waterDepth&&!ahead.opaque&&!closedFace&&wait?structuredClone({...wait,label:'ここで水位を待つ'}):null}:null;
  return terrain;
}
