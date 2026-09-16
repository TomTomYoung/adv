import {objectBlocks} from '../quest-events.js';
import {immerseAt} from './waterworks.js';
import {permission,costProblem,payCost} from '../jobs.js';
import {voxelKey,voxelAt,sameVoxel,neighbor,faceRules,voxelDepth,voxelLevel,depthName,freshVoxelState,voxelRouteReason,voxelOccupancyReason,voxelReachableNear,redistributeWater} from '../voxels.js';
import {validateVoxelMap,validateVoxelState} from '../voxel-validation.js';
import {object,integer,available,closeTo} from './common.js';
const access=ctx=>({waterAccess:Object.entries(ctx.definition.systems).some(([id,s])=>s.use==='waterworks'&&ctx.state.dungeons.active.systems[id]?.protected)});
const current=ctx=>{const map=ctx.data.maps[ctx.state.location?.map];return map?.voxels&&ctx.spec.maps.includes(map.id)?{map,terrain:ctx.persistent.maps[map.id]??freshVoxelState(map)}:null;};
const known=(ctx,p)=>(ctx.state.discovered[ctx.state.location.map]??[]).includes(voxelKey(p));
const near=(ctx,c,p)=>voxelReachableNear(c.map,c.terrain,ctx.state.location,p);
const blockedObject=(map,state,p)=>map.objects.some(o=>o.x===p.x&&o.y===p.y&&(o.z??0)===p.z&&objectBlocks(state,map,o));
const oriented=(link,loc)=>sameVoxel(link.path[0],loc)?link.path:link.bidirectional&&sameVoxel(link.path.at(-1),loc)?[...link.path].reverse():null;
function skillPlan(ctx,actor,id,api){
  const spec=ctx.data.fieldAbilities[id];
  if(!ctx.state.members.includes(actor)||!permission(ctx.data,ctx.state,actor,id,api))return {ok:false,reason:'参加中の技能者と習得済みの探索技能が必要です。'};
  const reason=costProblem(ctx.data,ctx.state,actor,spec);return reason?{ok:false,reason}:{ok:true,actor,ability:spec};
}
function plan(ctx,intent){
  if(intent.action==='visit'){const portal=ctx.spec.portals.find(p=>p.id===intent.target);if(!portal||!closeTo(ctx.state,portal.at))return {ok:false,reason:'立坑への入口で操作してください。'};const dest=portal.destination;if(ctx.data.maps[dest.map]?.voxels){const terrain=ctx.persistent.maps[dest.map]??freshVoxelState(ctx.data.maps[dest.map]);const reason=voxelOccupancyReason(ctx.data.maps[dest.map],terrain,dest,access(ctx));if(reason)return {ok:false,reason};}return {ok:true,portal};}
  const c=current(ctx);if(!c)return {ok:false,reason:'立体地形のある場所で操作してください。'};
  const {map,terrain}=c,loc=ctx.state.location;
  if(intent.action==='traverse'||intent.action==='install'){
    const link=map.voxels.links.find(l=>l.id===intent.target),path=link&&oriented(link,loc);
    if(!path)return {ok:false,reason:'移動経路の端に立って選んでください。'};
    const reason=voxelRouteReason(map,terrain,path,access(ctx));if(reason)return {ok:false,reason};
    if(path.some(p=>blockedObject(map,ctx.state,p)))return {ok:false,reason:'移動経路に閉じた扉があります。'};
    if(intent.action==='install'){
      if(link.access.kind!=='install'||terrain.installed.includes(link.id))return {ok:false,reason:'この経路は設置済み、または設置できません。'};
      if((ctx.state.inventory[link.access.item]??0)<link.access.count)return {ok:false,reason:`${ctx.data.items[link.access.item].name}が${link.access.count}個必要です。`};
      return {ok:true,...c,link,item:link.access.item,count:link.access.count};
    }
    if(link.access.kind==='install'&&!terrain.installed.includes(link.id))return {ok:false,reason:'先に移動手段を設置してください。'};
    if(link.access.kind==='skill'){
      if(intent.ability!==link.access.ability)return {ok:false,reason:'この経路に対応した技能を選んでください。'};
      const skill=skillPlan(ctx,intent.actor,intent.ability,'voxel.traverse');if(!skill.ok)return skill;
      return {ok:true,...c,link,path,...skill};
    }
    return {ok:true,...c,link,path};
  }
  if(intent.action==='toggle'){
    const face=map.voxels.faces.find(f=>f.id===intent.target);
    if(!face?.operable||!near(ctx,c,face.handle))return {ok:false,reason:'同じ高さの操作位置で境界を操作してください。'};
    const after=structuredClone(terrain);after.faces[face.id]=!after.faces[face.id];
    const flow=redistributeWater(map,after);if(flow.rejected)return {ok:false,reason:'水を保持できない変更です。'};
    after.water=flow.water;after.drained+=flow.drained;return {ok:true,...c,face,after};
  }
  const device=map.voxels.devices.find(d=>d.id===intent.target);
  if(!device||!near(ctx,c,device.at))return {ok:false,reason:'同じ高さの装置の足元か正面で操作してください。'};
  if(intent.action==='pump'&&device.kind==='pump'){
    const flow=redistributeWater(map,terrain,[{at:device.target,amount:device.amount}]);
    if(flow.rejected)return {ok:false,reason:'水没操作の対象区域が不正です。'};
    const after={...structuredClone(terrain),water:flow.water,drained:terrain.drained+flow.drained};return {ok:true,...c,device,after};
  }
  if(intent.action==='dig'&&device.kind==='dig'){
    const key=voxelKey(device.target);if(terrain.removed.includes(key))return {ok:false,reason:'すでに掘削されています。'};
    let cost;
    if(intent.ability&&intent.ability===device.ability)cost=skillPlan(ctx,intent.actor,intent.ability,'wall.break');
    else if(intent.item===device.item)cost=(ctx.state.inventory[device.item]??0)>=device.count?{ok:true,item:device.item,count:device.count}:{ok:false,reason:'掘削の材料が足りません。'};
    else return {ok:false,reason:'許可された発破薬か掘削技能を選んでください。'};
    if(!cost.ok)return cost;const after=structuredClone(terrain);after.removed.push(key);const flow=redistributeWater(map,after);
    if(flow.rejected)return {ok:false,reason:'水量の移動を確定できません。'};after.water=flow.water;after.drained+=flow.drained;
    return {ok:true,...c,device,after,...cost};
  }
  return {ok:false,reason:'立体地形の操作が不正です。'};
}
function evacuate(ctx,map,before){
  const {engine,state}=ctx;if(state.location?.map!==map.id)return;
  const after=ctx.persistent.maps[map.id],start={x:state.location.x,y:state.location.y,z:state.location.z??0};
  if(!voxelOccupancyReason(map,after,start,access(ctx)))return;
  const queue=[start],seen=new Set([voxelKey(start)]),add=p=>{const k=voxelKey(p);if(!seen.has(k)){seen.add(k);queue.push(p);}};
  const geometric={...after,water:{}};
  for(let i=0;i<queue.length;i++){
    const p=queue[i];if(!voxelOccupancyReason(map,after,p,access(ctx))&&engine.walkable(map,p.x,p.y,p.z)){Object.assign(state.location,p);engine.reveal();engine.notify('増水・足場の変化により、通行できた経路から安全な足場へ退避しました。');return;}
    for(const side of ['north','east','south','west']){const q=neighbor(p,side);
      if(!voxelOccupancyReason(map,before,q)&&!voxelOccupancyReason(map,geometric,q)&&faceRules(map,before,p,q).passage&&faceRules(map,after,p,q).passage&&!blockedObject(map,state,q))add(q);
    }
    for(const link of map.voxels.links){const path=oriented(link,p);if(!path||link.access.kind==='skill'||link.access.kind==='install'&&!before.installed.includes(link.id))continue;
      if(!voxelRouteReason(map,before,path)&&!voxelRouteReason(map,geometric,path)&&!path.some(q=>blockedObject(map,state,q)))add(path.at(-1));}
  }
  engine.returnTown(true);engine.notify('安全な足場への経路がなく、帰還印で町へ退避しました。');
}
function act(ctx,intent,p){
  if(intent.action==='visit'){const d=p.portal.destination;ctx.engine.teleport(d.map,d.x,d.y,'east',d.z);ctx.engine.notify('貯水立坑に入りました。高さごとの空間と水門・排水蓋を確認してください。');return;}
  if(p.ability)payCost(ctx.engine,p.actor,p.ability);if(p.item)ctx.state.inventory[p.item]-=p.count;
  if(intent.action==='traverse'){ctx.engine.finishMove(p.path.at(-1));ctx.engine.notify(`${p.link.name}を使い、高さ${p.path.at(-1).z}へ移動しました。`);return;}
  const before=structuredClone(p.terrain);
  if(intent.action==='install'){const next=structuredClone(p.terrain);next.installed.push(p.link.id);ctx.persistent.maps[p.map.id]=next;ctx.engine.notify(`${p.link.name}を設置しました。隊全員で利用できます。`);}
  else{ctx.persistent.maps[p.map.id]=p.after;ctx.engine.notify(intent.action==='pump'?`${p.device.name}で水没度を${p.device.amount}段階上げる操作を行いました。`:intent.action==='dig'?`${p.device.name}を掘削し、空の立方体にしました。`:`${p.face.name}を${p.after.faces[p.face.id]?'開きました':'閉じました'}。`);}
  ctx.run.elapsed++;
  immerseAt(ctx.engine,voxelLevel(ctx.persistent.maps[p.map.id],ctx.state.location),access(ctx).waterAccess);
  if(ctx.state.mode==='dungeon')evacuate(ctx,p.map,before);
}
function project(ctx){
  const c=current(ctx);if(!c){const actions=ctx.spec.portals.filter(p=>closeTo(ctx.state,p.at)).map(p=>available(ctx,{type:'dungeon.action',system:ctx.id,action:'visit',target:p.id},plan,p.name));return {kind:'voxel_space',id:ctx.id,title:'地下水道の立体区画',summary:'貯水室・橋・排水縦坑を点検できます。',cards:[],actions,markers:[],hidden:!actions.length};}
  const {map,terrain}=c,loc=ctx.state.location,cards=[],markers=[],action=(intent,label)=>available(ctx,{type:'dungeon.action',system:ctx.id,...intent},plan,label);
  for(const f of map.voxels.faces)if(f.operable&&near(ctx,c,f.handle))cards.push({name:f.name,text:`${terrain.faces[f.id]?'開':'閉'}。人と水の通過・足場はこの面の設定に従います。`,actions:[action({action:'toggle',target:f.id},terrain.faces[f.id]?'閉じる':'開く')]});
  for(const d of map.voxels.devices)if(near(ctx,c,d.at)){
    const actions=d.kind==='pump'?[action({action:'pump',target:d.id},`水没度を${d.amount}上げる`)]:[action({action:'dig',target:d.id,item:d.item},`${ctx.data.items[d.item].name} ×${d.count}`),...ctx.state.members.filter(id=>d.ability&&permission(ctx.data,ctx.state,id,d.ability,'wall.break')).map(actor=>action({action:'dig',target:d.id,actor,ability:d.ability},`${ctx.data.actors[actor].name}の${ctx.data.fieldAbilities[d.ability].name}`))];
    cards.push({name:d.name,text:d.kind==='pump'?'同じ高さの区域に下向きの通水穴があれば、下部区域へ水没操作を送ります。穴がなければ区域全体の水没度が上がります。':terrain.removed.includes(voxelKey(d.target))?'掘削済み。':'許可された材料か技能で、密の立方体を空にします。',actions});
  }
  for(const link of map.voxels.links)if(oriented(link,loc)){
    const actions=[];if(link.access.kind==='install'&&!terrain.installed.includes(link.id))actions.push(action({action:'install',target:link.id},`${ctx.data.items[link.access.item].name} ×${link.access.count}で設置`));
    if(link.access.kind==='skill')for(const actor of ctx.state.members.filter(id=>permission(ctx.data,ctx.state,id,link.access.ability,'voxel.traverse')))actions.push(action({action:'traverse',target:link.id,actor,ability:link.access.ability},`${ctx.data.actors[actor].name}が隊を誘導`));
    else actions.push(action({action:'traverse',target:link.id},'経路を渡る'));
    cards.push({name:link.name,text:`高さ${link.path[0].z}と高さ${link.path.at(-1).z}を結びます。${link.access.kind==='skill'?'対応する探索技能が必要です。':'全区間が通行可能なときに利用できます。'}`,actions});
  }
  for(const d of map.voxels.devices)if(d.at.z===(loc.z??0)&&known(ctx,d.at))markers.push({...d.at,id:d.id,name:d.name,kind:'voxel_device',glyph:d.kind==='pump'?'給':'掘'});
  for(const link of map.voxels.links)for(const p of [link.path[0],link.path.at(-1)])if(p.z===(loc.z??0)&&known(ctx,p))markers.push({...p,id:link.id,name:link.name,kind:'voxel_link',glyph:'⇵'});
  return {kind:'voxel_space',id:ctx.id,title:'貯水立坑の地形と水',summary:`高さ ${loc.z??0} ／ 足元：${depthName(voxelDepth(terrain,loc))} ／ 水没度 ${voxelLevel(terrain,loc)}/10 ／ 排水処理 ${terrain.drained}回`,cards,actions:[],markers};
}
export const voxelSpace={
  createPersistent:()=>({maps:{}}),createRun:()=>({elapsed:0}),
  enter(ctx){const c=current(ctx);if(c)ctx.persistent.maps[c.map.id]??=freshVoxelState(c.map);},
  step(ctx){if(current(ctx))ctx.run.elapsed++;},plan,act,project,
  fieldIntent(ctx,actor,ability){const c=current(ctx);if(!c)return null;
    const link=c.map.voxels.links.find(l=>l.access.kind==='skill'&&l.access.ability===ability&&oriented(l,ctx.state.location));
    if(link)return {action:'traverse',target:link.id,actor,ability};
    const d=c.map.voxels.devices.find(d=>d.kind==='dig'&&d.ability===ability&&near(ctx,c,d.at));return d?{action:'dig',target:d.id,actor,ability}:null;
  },
  validate(data,definition,spec){
    if(!Array.isArray(spec.maps)||!spec.maps.length||new Set(spec.maps).size!==spec.maps.length||spec.maps.some(id=>!definition.maps.includes(id)||!data.maps[id]?.voxels))return ['立体地形の所属マップが不正です'];
    if(!Array.isArray(spec.portals)||new Set(spec.portals.map(p=>p?.id)).size!==spec.portals.length)return ['立坑の入口一覧が不正です'];
    for(const p of spec.portals){const a=p?.at,b=p?.destination;if(!p?.id||!p.name||!a||!b||!definition.maps.includes(a.map)||!integer(a.x)||!integer(a.y)||!Number.isSafeInteger(a.z)||voxelAt(data.maps[a.map],null,a)!=='.'||!spec.maps.includes(b.map)||!integer(b.x)||!integer(b.y)||!Number.isSafeInteger(b.z)||voxelAt(data.maps[b.map],null,b)!=='.')return ['立坑の入口・到着地点が不正です'];}
    return spec.maps.flatMap(id=>validateVoxelMap(data,data.maps[id]));
  },
  validateState(spec,persistent,run,state,data){
    if(!object(persistent)||Object.keys(persistent).join(',')!=='maps'||!object(persistent.maps))return ['立体地形の保存領域がありません'];
    const errors=[];for(const [id,terrain] of Object.entries(persistent.maps)){if(!spec.maps.includes(id))errors.push('未知の立体マップです');else errors.push(...validateVoxelState(data.maps[id],terrain));}
    if(run&&(!object(run)||Object.keys(run).join(',')!=='elapsed'||!integer(run.elapsed,0,1e9)))errors.push('立体地形の時刻が不正です');
    if(run&&spec.maps.includes(state.location?.map)&&!persistent.maps[state.location.map])errors.push('現在地の立体地形が保存されていません');return errors;
  }
};
