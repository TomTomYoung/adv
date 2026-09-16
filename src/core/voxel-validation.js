import {SIX_FACES,clearVoxelIndex,voxelAt,voxelKey,sharedFace,neighbor,freshVoxelState,redistributeWater,hasFooting,voxelRouteReason,emptyVoxels,faceRules} from './voxels.js';
const object=v=>v&&typeof v==='object'&&!Array.isArray(v),integer=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
const id=v=>typeof v==='string'&&/^[a-z][a-z0-9_]*$/.test(v)&&!['constructor','prototype','__proto__'].includes(v);
export function validateVoxelMap(data,map){
  const v=map.voxels;if(v===undefined)return [];clearVoxelIndex(map);
  const errors=[],bad=s=>errors.push(`${map.id}/voxels: ${s}`),point=p=>object(p)&&integer(p.x,0,map.tiles[0].length-1)&&integer(p.y,0,map.tiles.length-1)&&integer(p.z,v.minZ,v.minZ+v.layers.length-1);
  if(!object(v)||v.version!==1||!integer(v.minZ,-32,0)||!Array.isArray(v.layers)||!v.layers.length||v.layers.length>16||v.layers.some(layer=>!Array.isArray(layer)||layer.length!==map.tiles.length||layer.some(row=>typeof row!=='string'||row.length!==map.tiles[0].length||/[^#.]/.test(row)))||v.layers.length*map.tiles.length*map.tiles[0].length>4096){bad('立方体の範囲・平面図が不正です');return errors;}
  if(JSON.stringify(v.layers[-v.minZ])!==JSON.stringify(map.tiles))bad('tilesとz=0の断面が違います');
  if(!Array.isArray(v.faces)||!Array.isArray(v.links)||!Array.isArray(v.devices)||!Array.isArray(v.initialWater)){bad('面・経路・装置・初期水量の一覧が必要です');return errors;}
  const ids=new Set(),faces=new Set(),unique=(value)=>{if(!id(value)||ids.has(value))bad('IDが不正または重複しています');ids.add(value);};
  const rules=r=>object(r)&&Object.keys(r).length===3&&['passage','water','support'].every(k=>typeof r[k]==='boolean');
  for(const f of v.faces){if(!object(f)){bad('境界面が不正です');continue;}unique(f.id);
    if(!f.name||!point(f.at)||!Object.hasOwn(SIX_FACES,f.side)||!rules(f.closed)||!rules(f.open)||typeof f.initiallyOpen!=='boolean'||typeof f.operable!=='boolean'){bad('境界面・開閉状態が不正です');continue;}
    const key=sharedFace(f.at,neighbor(f.at,f.side));if(faces.has(key))bad('共有面を二重定義しています');faces.add(key);
    if(f.operable&&(!point(f.handle)||voxelAt(map,null,f.handle)!=='.'))bad('操作位置は空の立方体に置いてください');
  }
  for(const link of v.links){if(!object(link)){bad('移動経路が不正です');continue;}unique(link.id);
    if(!link.name||!['ladder','stairs','vine','rope','bridge'].includes(link.kind)||typeof link.bidirectional!=='boolean'||!Array.isArray(link.path)||link.path.length<2||link.path.length>64||link.path.some(p=>!point(p)||voxelAt(map,null,p)!=='.')||!object(link.access)){bad('空間をたどる経路が不正です');continue;}
    const seen=new Set();for(let i=0;i<link.path.length;i++){const p=link.path[i],key=voxelKey(p);if(seen.has(key))bad('経路が同じ立方体を重複しています');seen.add(key);if(i){const a=link.path[i-1];if(Math.abs(a.x-p.x)+Math.abs(a.y-p.y)+Math.abs(a.z-p.z)!==1)bad('経路が六方向につながっていません');}}
    const a=link.access;if(!['fixed','install','skill'].includes(a.kind)||a.kind==='install'&&(!data.items[a.item]||!integer(a.count,1,99))||a.kind==='skill'&&data.fieldAbilities[a.ability]?.api!=='voxel.traverse')bad('移動手段のアイテム・技能が不正です');
  }
  for(const device of v.devices){if(!object(device)){bad('装置が不正です');continue;}unique(device.id);
    if(!device.name||!point(device.at)||voxelAt(map,null,device.at)!=='.'||!point(device.target)){bad('装置の位置が不正です');continue;}
    if(device.kind==='pump'){if(voxelAt(map,null,device.target)!=='.'||!integer(device.amount,1,10))bad('給水量・給水先が不正です');}
    else if(device.kind==='dig'){if(voxelAt(map,null,device.target)!=='#'||!data.items[device.item]||!integer(device.count,1,99)||device.ability&&data.fieldAbilities[device.ability]?.api!=='wall.break'||Math.abs(device.at.x-device.target.x)+Math.abs(device.at.y-device.target.y)+Math.abs(device.at.z-device.target.z)!==1)bad('掘削先・材料・技能が不正です');}
    else bad('未知の立体装置です');
  }
  const wet=new Set();for(const p of v.initialWater){if(!object(p)||!point(p.at)||voxelAt(map,null,p.at)!=='.'||!integer(p.amount,1,10)||wet.has(voxelKey(p.at)))bad('初期水量が不正です');else wet.add(voxelKey(p.at));}
  if(emptyVoxels(map,null).length+v.devices.filter(d=>d?.kind==='dig').length>512)bad('空の立方体は512個以内です');
  if(errors.length)return errors;
  const state=freshVoxelState(map),future={...state,water:{},removed:v.devices.filter(d=>d.kind==='dig').map(d=>voxelKey(d.target)),faces:Object.fromEntries(v.faces.map(f=>[f.id,f.operable?(f.open.passage?true:false):f.initiallyOpen]))};
  const entry={...map.entrance,z:map.entrance.z??0};if(voxelAt(map,state,entry)!=='.'||!hasFooting(map,state,entry)||(state.water[voxelKey(entry)]??0)>=6)bad('入口に安全な足場がありません');
  for(const link of v.links)if(voxelRouteReason(map,future,link.path)||link.bidirectional&&voxelRouteReason(map,future,[...link.path].reverse()))bad(`経路に閉じた面または足場のない終点があります: ${link.id}`);
  const queue=[entry],seen=new Set([voxelKey(entry)]),add=p=>{const key=voxelKey(p);if(!seen.has(key)){seen.add(key);queue.push(p);}};
  for(let i=0;i<queue.length;i++){
    const p=queue[i];for(const side of ['north','east','south','west']){const q=neighbor(p,side);if(voxelAt(map,future,q)==='.'&&hasFooting(map,future,q)&&faceRules(map,future,p,q).passage)add(q);}
    for(const link of v.links){if(voxelKey(p)===voxelKey(link.path[0]))add(link.path.at(-1));if(link.bidirectional&&voxelKey(p)===voxelKey(link.path.at(-1)))add(link.path[0]);}
  }
  for(const o of map.objects)if(!seen.has(voxelKey({...o,z:o.z??0})))bad(`到達不能なイベント: ${o.id}`);
  for(const d of v.devices)if(!seen.has(voxelKey(d.at)))bad(`到達不能な装置: ${d.id}`);
  for(const f of v.faces)if(f.operable&&!seen.has(voxelKey(f.handle)))bad(`到達不能な操作位置: ${f.id}`);
  return errors;
}
export function validateVoxelState(map,state){
  if(!object(state)||Object.keys(state).sort().join(',')!=='drained,faces,installed,removed,water'||!object(state.faces)||!object(state.water)||!Array.isArray(state.removed)||!Array.isArray(state.installed)||!integer(state.drained,0,1e9))return ['立方体の保存形式が不正です'];
  const v=map.voxels,errors=[];
  if(Object.keys(state.faces).length!==v.faces.length||v.faces.some(f=>typeof state.faces[f.id]!=='boolean'||!f.operable&&state.faces[f.id]!==f.initiallyOpen))errors.push('境界の保存が不正です');
  const diggable=new Set(v.devices.filter(d=>d.kind==='dig').map(d=>voxelKey(d.target))),installable=new Set(v.links.filter(l=>l.access.kind==='install').map(l=>l.id));
  if(new Set(state.removed).size!==state.removed.length||state.removed.some(k=>!diggable.has(k)))errors.push('掘削状態が不正です');
  if(new Set(state.installed).size!==state.installed.length||state.installed.some(k=>!installable.has(k)))errors.push('設置経路が不正です');
  const spaces=new Set(emptyVoxels(map,state).map(voxelKey));for(const [k,n] of Object.entries(state.water))if(!spaces.has(k)||!integer(n,1,10))errors.push('水量・水の位置が不正です');
  if(!errors.length){const normalized=redistributeWater(map,state);if(Object.entries(state.water).some(([k,n])=>normalized.water[k]!==n)||Object.keys(normalized.water).length!==Object.keys(state.water).length)errors.push('閉区域の水没度が不一致です');}
  return errors;
}
