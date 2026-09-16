import {permission,costProblem,payCost} from '../jobs.js';
import {voxelMapState,voxelLevel} from '../voxels.js';
import {object,integer,identifier,closeTo,validPoint,available} from './common.js';

export const floodDepth=level=>level===0?0:level<=3?1:level<=6?2:3;
export function waterPhase(spec,elapsed){
 let tick=elapsed%spec.phases.reduce((sum,p)=>sum+p.duration,0);
 for(const phase of spec.phases){if(tick<phase.duration)return {...phase,remaining:phase.duration-tick};tick-=phase.duration;}
}
export function waterAt(ctx,map,x,y,elapsed=ctx.run.elapsed,controls=ctx.persistent.controls){
 const floor=ctx.spec.floors.find(f=>f.map===map);if(!floor||ctx.data.maps[map].tiles[y]?.[x]!=='.')return 0;
 return floor.controls.every(id=>controls[id])?waterPhase(ctx.spec,elapsed).level:0;
}
export function waterLevel(ctx){
 const l=ctx.state.location,m=ctx.data.maps[l?.map];if(!m)return 0;
 return m.voxels?voxelLevel(voxelMapState(ctx.data,ctx.state,m),l):waterAt(ctx,m.id,l.x,l.y);
}
function markWet(ctx){
 if(waterLevel(ctx)>0)for(const id of ctx.state.members){const a=ctx.state.actors[id];if(a.hp>0&&!a.statuses.includes('wet'))a.statuses.push('wet');}
}
function immerse(ctx){
 immerseAt(ctx.engine,waterLevel(ctx),ctx.run.protected);
}
export function immerseAt(engine,level,protectedWater){
 if(level>0)for(const id of engine.state.members){const a=engine.state.actors[id];if(a.hp>0&&!a.statuses.includes('wet'))a.statuses.push('wet');}
 if(level===10&&!protectedWater){engine.notify('水没度10。呼吸を確保できず、隊は溺れました。');for(const id of engine.state.members)engine.state.actors[id].hp=0;engine.defeat();}
}
function advance(ctx){
 if(ctx.data.maps[ctx.state.location?.map]?.voxels){immerse(ctx);return;}
 const before=waterPhase(ctx.spec,ctx.run.elapsed);ctx.run.elapsed++;
 const after=waterPhase(ctx.spec,ctx.run.elapsed);
 if(before.id!==after.id)ctx.engine.notify(`水位が「${after.name}」になりました。水没度${after.level}/10。${after.level>=6?'潜水の備えがなければ移動できません。水位が下がるのを待てます。':''}`);
 immerse(ctx);
}
function plan(ctx,intent){
 if(intent.action==='wait')return {ok:true};
 if(intent.action==='protect'){
  if(ctx.run.protected)return {ok:false,reason:'この探索の潜水準備は済んでいます。'};
  if(intent.item===ctx.spec.protectionItem)return ctx.state.inventory[intent.item]>0?{ok:true,item:intent.item}:{ok:false,reason:'潜水具が必要です。'};
  const ability=ctx.data.fieldAbilities[intent.ability];
  if(ability?.api!=='water.traverse'||!ctx.state.members.includes(intent.actor)||!permission(ctx.data,ctx.state,intent.actor,intent.ability,'water.traverse'))return {ok:false,reason:'対応する潜水技能と生存する隊員が必要です。'};
  const reason=costProblem(ctx.data,ctx.state,intent.actor,ability);return reason?{ok:false,reason}:{ok:true,ability};
 }
 const control=ctx.spec.controls.find(c=>c.id===intent.target);
 if(!control||!closeTo(ctx.state,control))return {ok:false,reason:'足元か正面の水門・バルブを選んでください。'};
 if(!['open','close'].includes(intent.action))return {ok:false,reason:'水門・バルブの操作が不正です。'};
 const open=intent.action==='open';if(ctx.persistent.controls[control.id]===open)return {ok:false,reason:'すでにその状態です。'};
 return {ok:true,control,open};
}
function act(ctx,intent,p){
 if(intent.action==='protect'){if(p.item)ctx.engine.give(p.item,-1);if(p.ability)payCost(ctx.engine,intent.actor,p.ability);ctx.run.protected=true;ctx.engine.notify('隊全員の呼吸と移動を確保しました。この地下水道の探索中は水没度10まで通れます。');return;}
 if(intent.action==='wait')ctx.engine.notify('水位を見ながら1刻待ちました。');
 else{ctx.persistent.controls[p.control.id]=p.open;ctx.engine.notify(`${p.control.name}を${p.open?'開きました':'閉じ、フロアを排水しました'}。`);}
 advance(ctx);
}
function project(ctx){
 const phase=waterPhase(ctx.spec,ctx.run.elapsed),level=waterLevel(ctx),actions=[available(ctx,{type:'dungeon.action',system:ctx.id,action:'wait'},plan,'1刻待つ'),available(ctx,{type:'dungeon.action',system:ctx.id,action:'protect',item:ctx.spec.protectionItem},plan,'潜水具を使う')];
 const controls=ctx.spec.controls.filter(c=>closeTo(ctx.state,c)).map(c=>({id:c.id,name:c.name,open:ctx.persistent.controls[c.id],actions:[['open','開く'],['close','閉じて排水']].map(([action,label])=>available(ctx,{type:'dungeon.action',system:ctx.id,action,target:c.id},plan,label))}));
 const map=ctx.data.maps[ctx.state.location.map],markers=[];
 if(!map.voxels)for(let y=0;y<map.tiles.length;y++)for(let x=0;x<map.tiles[y].length;x++)if(map.tiles[y][x]==='.'&&(ctx.state.discovered[map.id]??[]).includes(`${x},${y}`)){const n=waterAt(ctx,map.id,x,y);markers.push({id:`water/${x}/${y}`,name:`フロア水没度 ${n}/10`,x,y,kind:'water',glyph:n?'≈':'·',level:floodDepth(n),floodLevel:n,waitable:true});}
 return {kind:'waterworks',id:ctx.id,title:'フロアの水没',phase:phase.name,remaining:phase.remaining,elapsed:ctx.run.elapsed,level,protected:ctx.run.protected,zones:[{id:map.id,name:map.name,level,status:`水没度 ${level}/10・${['乾燥','足元まで','腰まで','完全水没'][floodDepth(level)]}`}],controls,markers,actions};
}
function validate(data,d,s){
 const errors=[];
 if(!Array.isArray(s.phases)||s.phases.length<2||s.phases.some(p=>!object(p)||!identifier(p.id)||!p.name||!integer(p.duration,1,10000)||!integer(p.level,0,10))||s.phases[0]?.level!==0||!s.phases.some(p=>p.level===10))errors.push('0〜10の水没周期が必要です');
 if(!data.items[s.protectionItem])errors.push('潜水具がありません');
 if(!Array.isArray(s.controls)||s.controls.some(c=>!validPoint(data,d,c)||!identifier(c.id)||!['gate','valve'].includes(c.kind)||typeof c.initiallyOpen!=='boolean'))errors.push('水門が不正です');
 if(!Array.isArray(s.floors)||s.floors.some(f=>!d.maps.includes(f.map)||data.maps[f.map]?.voxels||!Array.isArray(f.controls)||!f.controls.length||f.controls.some(id=>!s.controls.some(c=>c.id===id&&c.map===f.map))))errors.push('冠水フロアが不正です');
 if(!Array.isArray(s.encounters)||s.encounters.some(e=>!integer(e.min,0,10)||!data.encounters[e.encounter]))errors.push('水位別の敵が不正です');
 return errors;
}
export const waterworks={
 createPersistent:s=>({controls:Object.fromEntries(s.controls.map(c=>[c.id,c.initiallyOpen]))}),createRun:()=>({elapsed:0,protected:false}),step:advance,enter:immerse,battleStart:markWet,battleRound:markWet,plan,act,project,validate,
 itemIntent:(ctx,item)=>item===ctx.spec.protectionItem?{action:'protect',item}:null,
 fieldIntent:(ctx,actor,ability)=>ctx.data.fieldAbilities[ability]?.api==='water.traverse'?{action:'protect',actor,ability}:null,
 actorStats:(ctx,_id,stats)=>{const n=waterLevel(ctx);return {...stats,agi:Math.max(0,Math.floor(stats.agi*(1-.06*n))),str:Math.max(0,Math.floor(stats.str*(1-.04*n)))};},
 damageScale:(ctx,element)=>element==='fire'?Math.max(0,1-waterLevel(ctx)*.12):element==='water'?1+waterLevel(ctx)*.1:1,
 abilityReason:(ctx,id,api)=>api==='battle.skill'&&waterLevel(ctx)>=7&&ctx.data.skills[id]?.effects.some(e=>e.type==='damage'&&e.element==='fire')?'完全水没では炎魔法を使用できません。':null,
 encounter:ctx=>{const encounter=[...ctx.spec.encounters].sort((a,b)=>b.min-a.min).find(e=>waterLevel(ctx)>=e.min)?.encounter;return {rate:1,enemyScale:1,...(encounter?{encounter}:{})};},
 waterDepth:(ctx,map,x,y)=>floodDepth(waterAt(ctx,map.id,x,y)),
 block:(ctx,map,x,y)=>waterAt(ctx,map.id,x,y)>=6&&!ctx.run.protected?'水没度6以上は潜水具か潜水技能が必要です。水位が下がるまで待つこともできます。':null,
 validateState(s,p,r){const errors=[];if(!object(p)||!object(p.controls)||Object.keys(p.controls).length!==s.controls.length||s.controls.some(c=>typeof p.controls[c.id]!=='boolean'))errors.push('水門の保存が不正です');if(r&&(!object(r)||!integer(r.elapsed,0,1e9)||typeof r.protected!=='boolean'))errors.push('水位・潜水状態の保存が不正です');return errors;}
};
