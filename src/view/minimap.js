// Render only projected discoveries, illumination and object states.
export const MAP_ASSETS=['unknown','floor','wall','water','pit','player','stairs','exit','chest','door-closed','door-open','clue','decision','trap','torch-lit','torch-unlit','control','marker'];
const make=(tag,className,text)=>{const e=document.createElement(tag);e.className=className;if(text!==undefined)e.textContent=text;return e;};
const image=(id,className)=>{const e=make('img',className);e.src=`assets/images/map/${id}.svg`;e.alt='';e.width=24;e.height=24;e.draggable=false;e.setAttribute('aria-hidden','true');return e;};
const facing={north:0,east:90,south:180,west:270};
export function markerAsset(object){
  if(object.kind==='map_connection')return object.glyph==='⇵'?'stairs':object.closed?'door-closed':'door-open';
  if(object.kind==='brazier')return object.lit?'torch-lit':'torch-unlit';
  if(object.kind==='door')return object.open?'door-open':'door-closed';
  return ({exit:'exit',stairs:'stairs',voxel_link:'stairs',chest:'chest',clue:'clue',event:'clue',decision:'decision',trap:'trap',water:'water',fountain:'water',water_control:'control',voxel_device:'control'})[object.kind]??'marker';
}
export function mapSection(model,{onExpand}={}){
  const d=model.dungeon,section=make('section','side-section map-section');
  const header=make('div','map-heading');header.append(make('span','eyebrow','測量図'));
  if(onExpand){const expand=make('button','map-expand','拡大');expand.type='button';expand.dataset.focus='map:expand';expand.setAttribute('aria-label','地図を拡大');expand.setAttribute('aria-haspopup','dialog');expand.addEventListener('click',onExpand);header.append(expand);}
  section.append(header,make('p','muted',`${model.lightLabel??'灯油'} ${model.light}/${model.lightMax}`));
  const viewport=make('div','map-viewport'),grid=make('div','minimap');grid.style.setProperty('--map-width',d.width);grid.setAttribute('aria-label','探索済みの地図');
  for(const row of d.cells)for(const cell of row){
    const here=cell.x===d.location.x&&cell.y===d.location.y,known=cell.known||here;
    const objects=known?d.objects.filter(o=>o.x===cell.x&&o.y===cell.y):[],object=objects.find(o=>!o.edge);
    const terrain=!known?'unknown':cell.wall?'wall':cell.floor===false?'pit':cell.water?'water':'floor';
    const square=make('span',`map-cell ${terrain}${here?' current':''}`);square.dataset.x=String(cell.x);square.dataset.y=String(cell.y);
    const tile=image(terrain,'map-terrain');square.append(tile);
    if(known){
      const light=Math.max(0,Math.min(8,cell.illumination??0));square.dataset.light=String(light);
      tile.style.filter=`brightness(${.85+light*.05})`;
      const glow=make('span','map-light');glow.style.backgroundColor=`rgba(255,212,115,${.28*light/8})`;square.append(glow);
      if(cell.waterDepth)square.dataset.depth=String(cell.waterDepth);
      if(object?.kind==='map_connection')square.dataset.connection=object.closed?'closed':'open';
      for(const side of Object.keys(facing)){
        const key=`${cell.x},${cell.y}/${side}`,closed=d.doors?.[key]?.closed??Boolean(cell.edges?.[side]||d.boundaries?.[key]);
        if(closed)square.append(make('span',`map-boundary ${side}`));
      }
      if(!here&&object)square.append(image(markerAsset(object),'map-object'));
      square.title=`${cell.x},${cell.y}${d.voxel?', 高さ '+d.z+' / '+cell.waterLabel:''}${objects.length?' '+objects.map(o=>o.name).join('・'):''} / 明るさ ${light}/8`;
      for(const marker of objects.filter(o=>o.edge)){
        const edge=make('span',`map-edge-marker ${marker.edge}`);edge.title=marker.name;edge.setAttribute('aria-label',`${marker.name} (${marker.edge})`);edge.append(image(markerAsset(marker),'map-edge-image'));square.append(edge);
      }
    }
    if(here){const arrow=image('player','map-player');arrow.style.transform=`rotate(${facing[d.location.facing]??0}deg)`;square.append(arrow);square.setAttribute('aria-label',`現在地 ${cell.x},${cell.y}・${{north:'北',east:'東',south:'南',west:'西'}[d.location.facing]}向き`);}
    grid.append(square);
  }
  viewport.append(grid);section.append(viewport);
  const legend=make('div','map-legend');
  for(const [id,label] of [['player','現在地'],['floor','踏査済み'],['wall','壁'],['stairs','階段'],['exit','出口'],['clue','手掛かり'],['decision','決着'],['chest','宝箱'],['door-closed','通行不可'],['door-open','扉通行可'],['water','水没'],['torch-lit','点灯'],['torch-unlit','消灯'],['control','仕掛け']]){const item=make('span','map-legend-item');item.append(image(id,'map-legend-icon'),make('span','',label));legend.append(item);}
  section.append(legend,make('p','map-note','踏査済みの場所は暗闇でも読めます。光の届くセルは明るい暖色で表示します。'));
  return section;
}
