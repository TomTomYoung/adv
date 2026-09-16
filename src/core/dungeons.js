import {voxelAt,voxelPoint} from './voxels.js';
import {voxelSpace} from './systems/voxel-space.js';
import {fireNetwork} from './systems/fire-network.js';
import {waterworks,waterLevel} from './systems/waterworks.js';
import {corrosion} from './systems/corrosion.js';
import {breakableWalls} from './systems/breakable-walls.js';
import {plantGarden} from './systems/plant-garden.js';
import {warpNetwork} from './systems/warp-network.js';
import {terrainShift} from './systems/terrain-shift.js';
import {vectorCurse} from './systems/vector-curse.js';
import {suppressionZone,restrictionText} from './systems/suppression-zone.js';
import {skillLibrary} from './systems/skill-library.js';
import {airSupply} from './systems/air-supply.js';
import {marketPacts} from './systems/market-pacts.js';
import {powerGrid} from './systems/power-grid.js';

// Dungeon IDs are data. Only reusable system implementations belong in this registry.
export const DUNGEON_SYSTEMS={voxel_space:voxelSpace,fire_network:fireNetwork,waterworks,corrosion,breakable_walls:breakableWalls,plant_garden:plantGarden,warp_network:warpNetwork,terrain_shift:terrainShift,vector_curse:vectorCurse,suppression_zone:suppressionZone,skill_library:skillLibrary,air_supply:airSupply,market_pacts:marketPacts,power_grid:powerGrid};
export const freshDungeons=()=>({version:1,nextRun:1,active:null,persistent:{}});
export const dungeonForMap=(data,map)=>Object.values(data.dungeons??{}).find(d=>d.maps.includes(map))??null;
export function dungeonContexts(data,state){
  const active=state.dungeons?.active,definition=data.dungeons?.[active?.id];
  if(!definition||state.mode!=='dungeon'||!definition.maps.includes(state.location?.map))return [];
  return Object.entries(definition.systems).filter(([,spec])=>spec.enabled!==false).map(([id,spec])=>({data,state,definition,id,spec,run:active.systems?.[id],persistent:state.dungeons.persistent?.[definition.id]?.systems?.[id]})).filter(ctx=>ctx.run&&ctx.persistent);
}
export function dungeonTile(data,state,map,x,y){
  let tile=map?.tiles[y]?.[x];
  for(const ctx of dungeonContexts(data,state))tile=DUNGEON_SYSTEMS[ctx.spec.use].tile?.(ctx,map,x,y)??tile;
  return tile;
}
export function dungeonBlock(data,state,map,x,y){
  for(const ctx of dungeonContexts(data,state)){const reason=DUNGEON_SYSTEMS[ctx.spec.use].block?.(ctx,map,x,y);if(reason)return reason;}
  return null;
}
export function dungeonEquipmentStats(data,state,item,actor,slot){
  let stats={...data.items[item]?.stats};
  for(const ctx of dungeonContexts(data,state))stats=DUNGEON_SYSTEMS[ctx.spec.use].equipmentStats?.(ctx,item,stats,actor,slot)??stats;
  return stats;
}
export function dungeonBattleStart(engine){
  for(const ctx of dungeonContexts(engine.data,engine.state))DUNGEON_SYSTEMS[ctx.spec.use].battleStart?.({...ctx,engine});
}
export function dungeonBattleRound(engine){for(const ctx of dungeonContexts(engine.data,engine.state))DUNGEON_SYSTEMS[ctx.spec.use].battleRound?.({...ctx,engine});}
export function dungeonBattleEnd(engine,battle,result){for(const ctx of dungeonContexts(engine.data,engine.state))DUNGEON_SYSTEMS[ctx.spec.use].battleEnd?.({...ctx,engine,battle,result});}
export function dungeonActorStats(data,state,id,base){let stats=base;for(const ctx of dungeonContexts(data,state))stats=DUNGEON_SYSTEMS[ctx.spec.use].actorStats?.(ctx,id,stats)??stats;return stats;}
export function dungeonGrants(data,state,id,base){let grants=base;for(const ctx of dungeonContexts(data,state))grants=DUNGEON_SYSTEMS[ctx.spec.use].grants?.(ctx,id,grants)??grants;return grants;}
export function dungeonAbilityReason(data,state,id,api){for(const ctx of dungeonContexts(data,state)){const reason=DUNGEON_SYSTEMS[ctx.spec.use].abilityReason?.(ctx,id,api);if(reason)return reason;}return null;}
export function dungeonEffectActive(data,state,kind,id){return dungeonContexts(data,state).every(ctx=>DUNGEON_SYSTEMS[ctx.spec.use].effectActive?.(ctx,kind,id)!==false);}
export function dungeonBuffs(data,state){const b=state.battle;return b?{...b,buffs:b.buffs.filter(v=>dungeonEffectActive(data,state,'buff',v.id))}:null;}
export function dungeonPreview(data,definition){return Object.values(definition.systems).filter(s=>s.enabled!==false&&s.use==='suppression_zone').map(s=>restrictionText(data,s));}
export function dungeonFieldPlan(data,state,actor,ability){
  for(const ctx of dungeonContexts(data,state)){
    const action=DUNGEON_SYSTEMS[ctx.spec.use].fieldIntent?.(ctx,actor,ability);
    if(action){const intent={type:'dungeon.action',system:ctx.id,...action};return {...dungeonActionPlan(data,state,intent),dungeonIntent:intent};}
  }
  return {ok:false,reason:'この迷宮ではその探索スキルを使えません。'};
}
export function enterDungeon(engine,mapId){
  const {data,state}=engine;if(!data.game.dungeonVersion)return;
  state.dungeons??=freshDungeons();
  const definition=dungeonForMap(data,mapId);
  if(!definition){leaveDungeon(engine);return;}
  if(state.dungeons.active?.id===definition.id)return;
  leaveDungeon(engine);
  const persistent=state.dungeons.persistent[definition.id]??={systems:{}};
  const active={id:definition.id,run:state.dungeons.nextRun++,steps:0,systems:{}};
  state.dungeons.active=active;
  for(const [id,spec] of Object.entries(definition.systems))if(spec.enabled!==false){
    const implementation=DUNGEON_SYSTEMS[spec.use];
    persistent.systems[id]??=implementation.createPersistent(spec);
    active.systems[id]=implementation.createRun(spec);
    implementation.enter?.({engine,data,state,definition,id,spec,run:active.systems[id],persistent:persistent.systems[id]});
  }
  for(const map of definition.maps){const cells=data.maps[map].initiallyKnown??[];state.discovered[map]=[...new Set([...(state.discovered[map]??[]),...cells])];}
}
export function leaveDungeon(engine){
  for(const ctx of dungeonContexts(engine.data,engine.state))DUNGEON_SYSTEMS[ctx.spec.use].leave?.({...ctx,engine});
  if(engine.state.dungeons)engine.state.dungeons.active=null;
}
export function dungeonReplacesLight(data,state){return dungeonContexts(data,state).some(ctx=>DUNGEON_SYSTEMS[ctx.spec.use].replacesLight);}
export function dungeonUseItem(engine,item){
  for(const ctx of dungeonContexts(engine.data,engine.state)){
    const intent=DUNGEON_SYSTEMS[ctx.spec.use].itemIntent?.(ctx,item);
    if(intent)return dungeonAction(engine,{system:ctx.id,...intent});
  }
  return null;
}
export function stepDungeon(engine,movement){
  if(engine.state.dungeons?.active)engine.state.dungeons.active.steps++;
  for(const ctx of dungeonContexts(engine.data,engine.state))DUNGEON_SYSTEMS[ctx.spec.use].step?.({...ctx,engine,movement});
}
export function dungeonDanger(engine){
  if(engine.state.waiting||engine.state.battle)return false;
  for(const ctx of dungeonContexts(engine.data,engine.state))if(DUNGEON_SYSTEMS[ctx.spec.use].danger?.({...ctx,engine}))return true;
  return false;
}
export function dungeonEncounter(data,state){
  let result={rate:1,enemyScale:1};
  for(const ctx of dungeonContexts(data,state)){
    const change=DUNGEON_SYSTEMS[ctx.spec.use].encounter?.(ctx);if(change)result={...result,...change,rate:result.rate*(change.rate??1),enemyScale:result.enemyScale*(change.enemyScale??1)};
  }
  return result;
}
export function dungeonWaterDepth(data,state,map,x,y){
  return dungeonContexts(data,state).reduce((depth,ctx)=>Math.max(depth,DUNGEON_SYSTEMS[ctx.spec.use].waterDepth?.(ctx,map,x,y)??0),0);
}
export function dungeonActionPlan(data,state,intent){
  if(state.mode!=='dungeon'||state.waiting||state.battle)return {ok:false,reason:'探索中に操作してください。'};
  const ctx=dungeonContexts(data,state).find(c=>c.id===intent.system);
  if(!ctx)return {ok:false,reason:'この迷宮にはその仕組みがありません。'};
  return {...DUNGEON_SYSTEMS[ctx.spec.use].plan(ctx,intent),ctx};
}
export function dungeonAction(engine,intent){
  const plan=dungeonActionPlan(engine.data,engine.state,intent);
  if(!plan.ok){engine.notify(plan.reason);return false;}
  DUNGEON_SYSTEMS[plan.ctx.spec.use].act({...plan.ctx,engine},intent,plan);
  dungeonDanger(engine);return true;
}
export function dungeonViews(data,state){return dungeonContexts(data,state).map(ctx=>DUNGEON_SYSTEMS[ctx.spec.use].project(ctx)).filter(v=>!v.hidden);}
export function validateDungeons(data){
  if(!data.game.dungeonVersion)return [];
  const errors=[],owned=new Set(),bad=m=>errors.push(`dungeons: ${m}`);
  if(data.game.dungeonVersion!==1||!data.dungeons||Array.isArray(data.dungeons))return ['dungeons: 定義が不正です'];
  for(const [id,d] of Object.entries(data.dungeons)){
    if(!/^[a-z][a-z0-9_]*$/.test(id)||['constructor','prototype','__proto__'].includes(id)||d.id!==id||d.profile!=='classic'||d.schemaVersion!==1||!d.name||!data.regions.some(r=>r.id===d.region)||!Array.isArray(d.maps)||!d.maps.length||!d.systems||Array.isArray(d.systems)){bad(`${id}: 基本定義が不正です`);continue;}
    for(const map of d.maps){if(!data.maps[map]||owned.has(map))bad(`${id}: マップ欠落・所属重複 ${map}`);owned.add(map);}
    const entry=d.entries?.main,map=data.maps[entry?.map],point=entry?.point==='entrance'?map?.entrance:null;
    if(!point||!d.maps.includes(entry.map)||map.tiles[point.y]?.[point.x]!=='.')bad(`${id}: 入口が不正です`);
    const providers=new Set();
    for(const [system,spec] of Object.entries(d.systems)){
      if(!/^[a-z][a-z0-9_]*$/.test(system)||!spec||!Object.hasOwn(DUNGEON_SYSTEMS,spec.use)){bad(`${id}/${system}: 未知のシステム`);continue;}
      if(spec.enabled===false)continue;
      if(providers.has(spec.use))bad(`${id}: 同じ環境制御の重複`);providers.add(spec.use);
      errors.push(...DUNGEON_SYSTEMS[spec.use].validate(data,d,spec).map(e=>`${id}/${system}: ${e}`));
    }
  }
  for(const [id,map] of Object.entries(data.maps)){
    if(!owned.has(id))bad(`所属のないマップ ${id}`);
    if(map.voxels&&Object.values(data.dungeons).flatMap(d=>Object.values(d.systems)).filter(s=>s.use==='voxel_space'&&s.enabled!==false&&s.maps?.includes(id)).length!==1)bad(`${id}: 立体地形の制御部品が必要です`);
    if(map.initiallyKnown!==undefined&&(!Array.isArray(map.initiallyKnown)||map.initiallyKnown.some(cell=>typeof cell!=='string'||!(map.voxels?/^\d+,\d+,-?\d+$/:/^\d+,\d+$/).test(cell)||(map.voxels?voxelAt(map,null,voxelPoint(cell))===null:map.tiles[Number(cell.split(',')[1])]?.[Number(cell.split(',')[0])]===undefined))))bad(`${id}: 初期踏査セルが不正です`);
  }
  return errors;
}
export function validateDungeonState(data,state){
  if(!data.game.dungeonVersion)return [];
  const s=state.dungeons,errors=[],bad=m=>errors.push(`迷宮保存: ${m}`),object=v=>v&&typeof v==='object'&&!Array.isArray(v);
  if(!object(s)||s.version!==1||!Number.isSafeInteger(s.nextRun)||s.nextRun<1||!object(s.persistent))return ['迷宮保存: 基本状態が不正です'];
  const active=s.active,expected=state.mode==='dungeon'?dungeonForMap(data,state.location?.map):null;
  if(expected){if(!object(active)||active.id!==expected.id||!Number.isSafeInteger(active.run)||active.run<1||active.run>=s.nextRun||!Number.isSafeInteger(active.steps)||active.steps<0||!object(active.systems))bad('現在地・探索番号が不正です');}
  else if(active!==null)bad('退場後も探索が残っています');
  for(const [id,p] of Object.entries(s.persistent)){
    const d=data.dungeons[id];if(!d||!object(p)||!object(p.systems)){bad('未知の保存先');continue;}
    for(const system of Object.keys(p.systems))if(!d.systems[system]||d.systems[system].enabled===false)bad('未知の保存部品');
    for(const [system,spec] of Object.entries(d.systems))if(spec.enabled!==false){
      const run=active?.id===id?active.systems?.[system]:null;
      if(active?.id===id&&!object(run))bad('現在の探索部品の状態がありません');
      errors.push(...DUNGEON_SYSTEMS[spec.use].validateState(spec,p.systems[system],run,state,data).map(e=>`迷宮保存 ${id}/${system}: ${e}`));
    }
  }
  if(active){if(!s.persistent[active.id])bad('現在の迷宮の保存領域がありません');for(const system of Object.keys(active.systems??{}))if(!data.dungeons[active.id]?.systems[system]||data.dungeons[active.id].systems[system].enabled===false)bad('未知の探索部品');}
  return errors;
}

export function dungeonFloodLevel(data,state){const ctx=dungeonContexts(data,state).find(c=>c.spec.use==='waterworks');return ctx?waterLevel(ctx):dungeonWaterDepth(data,state,data.maps[state.location?.map],state.location?.x,state.location?.y);}
export function dungeonDamageScale(data,state,element){return dungeonContexts(data,state).reduce((n,c)=>n*(DUNGEON_SYSTEMS[c.spec.use].damageScale?.(c,element)??1),1);}

export const dungeonWaterAccess=(data,state)=>dungeonContexts(data,state).some(c=>c.spec.use==='waterworks'&&c.run.protected);
