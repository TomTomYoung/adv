import {authoredCellLayers} from './cell-layers.js';
import {authoredEdge} from './edge-layers.js';
import {identifier,validPoint,faces} from './systems/common.js';

export function validateConnections(data,d,s){
  const errors=[],ids=new Set(),endpoints=new Set();if(!Array.isArray(s.links)||!s.links.length)return ['接続が必要です'];
  for(const l of s.links){
    if(!identifier(l.id)||ids.has(l.id)||!l.name||!['door','watertight_door','stairs'].includes(l.kind))errors.push('接続ID・種類が不正です');ids.add(l.id);
    if(l.a?.map===l.b?.map)errors.push('別マップ同士を接続してください');
    for(const p of [l.a,l.b]){
      if(!validPoint(data,d,p)||data.maps[p.map]?.voxels){errors.push('2D接続口の足場が不正です');continue;}
      const key=`${p.map}/${p.x}/${p.y}`;if(endpoints.has(key))errors.push('同じセルに複数の接続口があります');endpoints.add(key);
      if(p.facing!==undefined&&!faces[p.facing])errors.push('到着方向が不正です');
      if(l.kind!=='stairs'){
        const delta=faces[p.side];if(!delta||!authoredEdge(data,data.maps[p.map],p.x,p.y,p.side)?.visual.wall&&(data.game.cellLayerVersion?!authoredCellLayers(data,data.maps[p.map],p.x+delta[0],p.y+delta[1])?.visual.wall:data.maps[p.map].tiles[p.y+delta[1]]?.[p.x+delta[0]]!=='#'))errors.push('扉は壁セルか壁エッジに接する面へ置いてください');
      }else if(p.side!==undefined)errors.push('階段に水平の扉面は指定できません');
    }
  }
  const seen=new Set([d.entries.main.map]);let changed=true;while(changed){changed=false;for(const l of s.links)for(const [a,b] of [[l.a,l.b],[l.b,l.a]])if(a&&b&&seen.has(a.map)&&!seen.has(b.map)){seen.add(b.map);changed=true;}}
  if(d.maps.some(m=>!seen.has(m)))errors.push('入口と接続していない2Dマップがあります');
  return errors;
}
