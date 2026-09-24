// Shared by authoring validation and the game. No engine or UI dependency.
export const cellSurfaces=['stone','earth','wood','wet','ice','cracked','salt','roots','thorns','poison','corrosion','rune','rock'];
export const cellBindings=['compartment_water','air_pocket','corrosion','vector_curse','suppression_zone','breakable_walls','root_bridge','thorn_wall'];
export const collapseKey=(map,x,y)=>`cell-collapse/${map}/${x},${y}`;
export const collapsedCell=(state,map,x,y)=>Boolean(state.events?.[collapseKey(map,x,y)]);
export function collapseAfterLeaving(engine,from,to){
 if(!from||from.map===to?.map&&from.x===to.x&&from.y===to.y)return;
 const map=engine.data.maps[from.map],c=map?.cells,preset=engine.data.cellTypes?.[c?.legend[c.rows[from.y]?.[from.x]]];
 const fragile=c?.overrides?.[`${from.x},${from.y}`]?.parameters?.fragile??preset?.parameters?.fragile;
 if(fragile&&!collapsedCell(engine.state,from.map,from.x,from.y)){engine.state.events[collapseKey(from.map,from.x,from.y)]=1;engine.notify('通り過ぎた床が崩れ、穴が残った。');}
}
const same=(p,map,x,y)=>p?.map===map&&p.x===x&&p.y===y;
export function bindingSatisfied(binding,dungeon,map,x,y){
 const systems=Object.values(dungeon?.systems??{}).filter(s=>s.enabled!==false),has=(use,match)=>systems.some(s=>s.use===use&&match(s));
 switch(binding){
 case undefined:case '':return true;
 case 'compartment_water':return has(binding,s=>s.zones?.some(z=>z.map===map));
 case 'air_pocket':return has('air_supply',s=>s.pockets?.some(p=>same(p,map,x,y)));
 case 'corrosion':return has(binding,()=>true);
 case 'vector_curse':return has(binding,s=>s.vectors?.some(p=>same(p,map,x,y))||['↑','→','↓','←','・'].includes(s.vectorRows?.[map]?.[y]?.[x]));
 case 'suppression_zone':return has(binding,s=>s.cells?.some(p=>same(p,map,x,y)));
 case 'breakable_walls':return has(binding,s=>s.walls?.some(p=>same(p,map,x,y)));
 case 'root_bridge':case 'thorn_wall':return has('plant_garden',s=>Object.values(s.species??{}).some(p=>p.terrain===(binding==='root_bridge'?'bridge':'barrier'))&&s.plots?.some(p=>p.terrain?.[binding==='root_bridge'?'bridge':'barrier']?.some(t=>same(t,map,x,y))));
 default:return false;
 }
}
export function cellBindingErrors(source,dungeons){
 const errors=[];for(const [map,p] of Object.entries(source.maps??{})){const dungeon=Object.values(dungeons).find(d=>d.maps?.includes(map));
 for(const [y,row] of (Array.isArray(p.rows)?p.rows:[]).entries())for(const [x,symbol] of [...(typeof row==='string'?row:'')].entries()){const preset=source.presets?.[p.legend?.[symbol]],binding=p.overrides?.[`${x},${y}`]?.parameters?.binding??preset?.parameters?.binding;
 if(binding&&!bindingSatisfied(binding,dungeon,map,x,y))errors.push({map,x,y,binding,message:`${map} ${x},${y}：${preset?.name??p.legend?.[symbol]} に必要な仕掛け・対象座標（${binding}）がありません。迷宮の仕掛けを設定してください。`});}}
 return errors;
}
