import {faces,object,integer,identifier,closeTo,validPoint,knownPoint,available} from './common.js';

export function waterPhase(spec,elapsed){
  let tick=elapsed%spec.phases.reduce((sum,p)=>sum+p.duration,0);
  for(const phase of spec.phases){if(tick<phase.duration)return {...phase,remaining:phase.duration-tick};tick-=phase.duration;}
}
function zoneLevel(ctx,zone,elapsed=ctx.run.elapsed,controls=ctx.persistent.controls){
  if(zone.control&&!controls[zone.control])return 0;
  return zone.kind==='channel'?2:waterPhase(ctx.spec,elapsed).level;
}
export function waterAt(ctx,map,x,y,elapsed=ctx.run.elapsed,controls=ctx.persistent.controls){
  return ctx.spec.zones.filter(z=>z.map===map&&z.cells.some(c=>c.x===x&&c.y===y)).reduce((level,z)=>Math.max(level,zoneLevel(ctx,z,elapsed,controls)),0);
}
function dryRetreat(ctx,previous){
  const {state,data,engine}=ctx,loc=state.location,map=data.maps[loc.map];
  if(waterAt(ctx,loc.map,loc.x,loc.y)!==2)return;
  // Search the routes that were open before the rise, respecting closed doors and other waterways.
  const queue=[[loc.x,loc.y]],seen=new Set([`${loc.x},${loc.y}`]);
  for(let i=0;i<queue.length;i++){
    const [x,y]=queue[i];
    if(waterAt(ctx,map.id,x,y)<2&&engine.walkable(map,x,y)){
      loc.x=x;loc.y=y;engine.reveal();engine.notify('足元まで水が迫ったため、通ってきた区画内の水没していない足場へ退避しました。');return;
    }
    for(const [dx,dy] of Object.values(faces)){
      const nx=x+dx,ny=y+dy,key=`${nx},${ny}`;
      if(seen.has(key)||map.tiles[ny]?.[nx]!=='.'||waterAt(ctx,map.id,nx,ny,previous.elapsed,previous.controls)===2)continue;
      if(map.objects.some(o=>o.x===nx&&o.y===ny&&o.blocking&&(state.objects[`${map.id}/${o.id}`]??o.initialState)!=='open'))continue;
      seen.add(key);queue.push([nx,ny]);
    }
  }
  // A custom layout can close every escape route. Return through the existing rescue system.
  engine.returnTown(true);engine.notify('増水で安全な足場へ戻れず、帰還印で町へ退避しました。');
}
function advance(ctx,previous={elapsed:ctx.run.elapsed,controls:{...ctx.persistent.controls}}){
  const before=waterPhase(ctx.spec,ctx.run.elapsed);ctx.run.elapsed++;
  const after=waterPhase(ctx.spec,ctx.run.elapsed);
  if(before.id!==after.id)ctx.engine.notify(`水位が「${after.name}」に変わりました。${after.level===2?'水没区画は通行できません。':after.level===1?'浅い水の区画は通行できます。':'周期で水没する区画の水が引いています。'}`);
  dryRetreat(ctx,previous);
}
function plan(ctx,intent){
  if(intent.action==='wait')return {ok:true};
  const control=ctx.spec.controls.find(c=>c.id===intent.target);
  if(!control||!closeTo(ctx.state,control))return {ok:false,reason:'足元か正面の水門・バルブを選んでください。'};
  if(!['open','close'].includes(intent.action))return {ok:false,reason:'水門・バルブの操作が不正です。'};
  const open=intent.action==='open';
  if(ctx.persistent.controls[control.id]===open)return {ok:false,reason:open?'すでに水を流しています。':'すでに水を止めています。'};
  return {ok:true,control,open};
}
function act(ctx,intent,p){
  const previous={elapsed:ctx.run.elapsed,controls:{...ctx.persistent.controls}};
  if(intent.action==='wait')ctx.engine.notify('水位を見ながら1刻待ちました。');
  else{ctx.persistent.controls[p.control.id]=p.open;ctx.engine.notify(`${p.control.name}を${p.open?'開き、水を流しました':'閉じ、水を止めて排水しました'}。`);}
  advance(ctx,previous);
}
function project(ctx){
  const phase=waterPhase(ctx.spec,ctx.run.elapsed),states=['水なし','浅い水・通行可','完全水没・通行不可'];
  const controls=ctx.spec.controls.filter(c=>closeTo(ctx.state,c)).map(c=>({id:c.id,name:c.name,open:ctx.persistent.controls[c.id],actions:[['open','開く・水を流す'],['close','閉じる・水を止める']].map(([action,label])=>available(ctx,{type:'dungeon.action',system:ctx.id,action,target:c.id},plan,label))}));
  const markers=[];
  for(const z of ctx.spec.zones)for(const cell of z.cells){const point={map:z.map,...cell};if(knownPoint(ctx.state,point)){const level=zoneLevel(ctx,z);markers.push({...cell,id:`${z.id}/${cell.x}/${cell.y}`,name:`${z.name}：${states[level]}`,kind:'water',glyph:level===2?'≈':level===1?'~':'·',level});}}
  for(const c of ctx.spec.controls)if(knownPoint(ctx.state,c))markers.push({id:c.id,name:`${c.name}：${ctx.persistent.controls[c.id]?'開':'閉'}`,x:c.x,y:c.y,kind:'water_control',glyph:c.kind==='gate'?'門':'弁'});
  const zones=ctx.spec.zones.filter(z=>z.map===ctx.state.location.map&&z.cells.some(c=>knownPoint(ctx.state,{map:z.map,...c}))).map(z=>({id:z.id,name:z.name,level:zoneLevel(ctx,z),status:states[zoneLevel(ctx,z)]}));
  return {kind:'waterworks',id:ctx.id,title:'水位と水路',phase:phase.name,remaining:phase.remaining,elapsed:ctx.run.elapsed,zones,controls,markers,actions:[available(ctx,{type:'dungeon.action',system:ctx.id,action:'wait'},plan,'1刻待つ')]};
}
function validate(data,definition,spec){
  const errors=[],bad=m=>errors.push(m),ids=new Set(),cells=new Set();
  if(!Array.isArray(spec.phases)||spec.phases.length<2||spec.phases.some(p=>!object(p)||!identifier(p.id)||!p.name||!integer(p.duration,1,10000)||!integer(p.level,0,2))||new Set(spec.phases.map(p=>p?.id)).size!==spec.phases.length)return ['水位周期が不正です'];
  if(!spec.phases.some(p=>p.level===0)||!spec.phases.some(p=>p.level===2)||spec.phases[0].level!==0)bad('水位周期には初期の干潮と完全水没が必要です');
  if(!Array.isArray(spec.controls)||!Array.isArray(spec.zones)||!spec.zones.length)return [...errors,'水門・区画一覧がありません'];
  for(const c of spec.controls){if(!validPoint(data,definition,c)||!identifier(c.id)||ids.has(c.id)||!c.name||!['gate','valve'].includes(c.kind)||typeof c.initiallyOpen!=='boolean')bad('水門・バルブが不正です');ids.add(c.id);}
  const zones=new Set();
  for(const z of spec.zones){
    if(!object(z)||!identifier(z.id)||zones.has(z.id)||!z.name||!definition.maps.includes(z.map)||!['tidal','channel'].includes(z.kind)||z.control!==undefined&&!ids.has(z.control)||!Array.isArray(z.cells)||!z.cells.length){bad('水域定義が不正です');continue;}zones.add(z.id);
    for(const cell of z.cells){const point={map:z.map,...cell},key=`${z.map}/${cell?.x},${cell?.y}`,map=data.maps[z.map];
      if(!validPoint(data,definition,point)||cells.has(key)||map.entrance.x===cell.x&&map.entrance.y===cell.y||map.objects.some(o=>o.x===cell.x&&o.y===cell.y)||spec.controls.some(c=>c.map===z.map&&c.x===cell.x&&c.y===cell.y))bad('水域は重複せず、入口・既存イベント・操作盤を避けた床に配置してください');cells.add(key);
    }
  }
  for(const c of spec.controls)if(!spec.zones.some(z=>z.control===c.id))bad('接続先のない水門・バルブです');
  return errors;
}
function validateState(spec,persistent,run){
  if(!object(persistent)||!object(persistent.controls)||Object.keys(persistent).some(k=>k!=='controls')||Object.keys(persistent.controls).length!==spec.controls.length||spec.controls.some(c=>typeof persistent.controls[c.id]!=='boolean'))return ['水門の保存が不正です'];
  if(run&&(!object(run)||!integer(run.elapsed,0,1e9)||Object.keys(run).some(k=>k!=='elapsed')))return ['水位時刻の保存が不正です'];
  return [];
}
export const waterworks={createPersistent:spec=>({controls:Object.fromEntries(spec.controls.map(c=>[c.id,c.initiallyOpen]))}),createRun:()=>({elapsed:0}),step:advance,plan,act,project,validate,validateState,
  block:(ctx,map,x,y)=>waterAt(ctx,map.id,x,y)===2?'完全に水没しています。水が引くのを待つか、水門・バルブで水を止めてください。':null};
