import {dungeonCell} from '../dungeons.js';
import {object,identifier,validPoint,closeTo,available} from './common.js';

// A compartment is a sealed, horizontal 2D map. Its water never creates a
// collision plane between two floor cells, or leaks through an open stairwell.
export function compartmentState(data,state,mapId){
  for(const d of Object.values(data.dungeons??{}))for(const [id,spec] of Object.entries(d.systems)){
    if(spec.use!=='compartment_water'||spec.enabled===false)continue;
    const zone=spec.zones.find(z=>z.map===mapId);if(!zone)continue;
    const controls=state.dungeons?.persistent?.[d.id]?.systems?.[id]?.controls;
    return {zone,flooded:controls?.[zone.control]??zone.initiallyFlooded};
  }
  return null;
}
export const compartmentBlocked=(data,state,map)=>compartmentState(data,state,map)?.flooded?'水密扉の向こうは完全水没している。乾いた操作室の排水弁で水を抜く。':null;
function plan(ctx,intent){
  const control=ctx.spec.controls.find(c=>c.id===intent.target&&closeTo(ctx.state,c));
  if(!control||!closeTo(ctx.state,control))return {ok:false,reason:'操作盤の足元か正面で操作する。'};
  if(!['open','close'].includes(intent.action))return {ok:false,reason:'給水・排水の操作が不正。'};
  const flooded=intent.action==='open',zone=ctx.spec.zones.find(z=>z.control===control.id);
  if(flooded&&ctx.state.location.map===zone.map)return {ok:false,reason:'在室中は給水弁を開けられない。'};
  if(ctx.persistent.controls[control.id]===flooded)return {ok:false,reason:flooded?'すでに給水済み。':'すでに排水済み。'};
  return {ok:true,control,zone,flooded};
}
export const compartmentWater={
  createPersistent:s=>({controls:Object.fromEntries(s.zones.map(z=>[z.control,z.initiallyFlooded]))}),createRun:()=>({}),plan,
  act(ctx,_intent,p){ctx.persistent.controls[p.control.id]=p.flooded;ctx.engine.notify(`${ctx.data.maps[p.zone.map].name}：${p.flooded?'水密扉を施錠して給水した。完全水没のため進入できない。':'給水を止め、通路の高さまで排水した。低いくぼみには水が残る。水密扉の圧力錠が解除された。'}`);},
  block:(ctx,map)=>compartmentBlocked(ctx.data,ctx.state,map.id),
  waterDepth:(ctx,map,x,y)=>dungeonCell(ctx.data,ctx.state,map,x,y)?.parameters.water_passable&&compartmentState(ctx.data,ctx.state,map.id)?.flooded?3:0,
  project(ctx){
    const zones=ctx.spec.zones.map(z=>({...z,name:ctx.data.maps[z.map].name,flooded:ctx.persistent.controls[z.control]}));
    const controls=ctx.spec.controls.filter(c=>closeTo(ctx.state,c));
    return {kind:'compartment_water',id:ctx.id,title:'水路の給排水',summary:'各水路は水密扉で独立している。操作盤で排水すると、その区画へ入れる。給水中は扉が閉じる。',actions:[],
      cards:controls.map(c=>({name:c.name,text:`${zones.find(z=>z.control===c.id).name}：${ctx.persistent.controls[c.id]?'完全水没・水密扉施錠':'排水済み・水密扉通行可'}`,actions:[['close','給水を止めて排水'],['open','扉を閉じて給水']].map(([action,label])=>available(ctx,{type:'dungeon.action',system:ctx.id,action,target:c.id},plan,label))})),
      zones,markers:ctx.spec.controls.filter(c=>c.map===ctx.state.location.map).map(c=>({...c,kind:'water_control',glyph:'⚙'}))};
  },
  validate(data,d,s){
    const errors=[],zones=Array.isArray(s.zones)?s.zones:[],controls=Array.isArray(s.controls)?s.controls:[];
    if(!zones.length||!controls.length)errors.push('水没区画と乾いた操作盤が必要です');
    const ids=new Set(),maps=new Set();
    for(const z of zones){
      if(!d.maps.includes(z.map)||data.maps[z.map]?.voxels||maps.has(z.map)||typeof z.initiallyFlooded!=='boolean'||!controls.some(c=>c.id===z.control))errors.push('水没区画が不正です');maps.add(z.map);
      const links=Object.values(d.systems).filter(v=>v.use==='map_connections').flatMap(v=>v.links??[]).filter(l=>l.a?.map===z.map||l.b?.map===z.map);
      if(!links.length||links.some(l=>l.kind!=='watertight_door'))errors.push(`${z.map}: 水没区画の全出入口には水密扉が必要です（階段・ロープ・穴は不可）`);
      if(d.entries.main.map===z.map)errors.push('迷宮入口は乾いた区画に置いてください');
    }
    for(const c of controls){
      if(!identifier(c.id)||!c.name||!validPoint(data,d,c)||zones.some(z=>z.map===c.map)||!zones.some(z=>z.control===c.id))errors.push('操作盤は関連する水路の外の乾いた区画に置いてください');
      // One valve may have linked handles on both sides of a pressure door.
      const key=`${c.id}/${c.map}/${c.x}/${c.y}`;if(ids.has(key))errors.push('操作盤の配置が重複しています');ids.add(key);
    }
    if(new Set(zones.map(z=>z.control)).size!==zones.length)errors.push('水路ごとに独立した給排水弁が必要です');
    // With all pressure doors closed, at least one handle per waterway must
    // be reachable from the dry entry. Drainable routes then expand the set.
    const links=Object.values(d.systems).filter(v=>v.use==='map_connections').flatMap(v=>v.links??[]),reachable=new Set([d.entries.main.map]),drained=new Set();
    let changed=true;while(changed){changed=false;for(const z of zones)if(!drained.has(z.map)&&controls.some(c=>c.id===z.control&&reachable.has(c.map))){drained.add(z.map);changed=true;}
      for(const l of links)for(const [a,b] of [[l.a,l.b],[l.b,l.a]])if(a&&b&&reachable.has(a.map)&&(!maps.has(b.map)||drained.has(b.map))&&!reachable.has(b.map)){reachable.add(b.map);changed=true;}}
    if(zones.some(z=>!drained.has(z.map)))errors.push('排水装置へ到達できない水没区画があります');
    return errors;
  },
  validateState(s,p,r,state){
    const ids=new Set(s.zones.map(z=>z.control));
    if(!object(p)||!object(p.controls)||Object.keys(p.controls).length!==ids.size||[...ids].some(id=>typeof p.controls[id]!=='boolean')||r&&(!object(r)||Object.keys(r).length))return ['水路の保存が不正です'];
    return state.mode==='dungeon'&&s.zones.some(z=>z.map===state.location?.map&&p.controls[z.control])?['完全水没区画に滞在しています']:[];
  }
};
