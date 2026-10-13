import {encounterStoryJourney} from './story.js';
import {dungeonCell,dungeonEncounter} from './dungeons.js';
import {edgeBetween} from './edge-layers.js';
import {cellEventKey} from './cell-layers.js';
import {occurrenceAvailable} from './event-occurrence.js';
import {isRecord} from './expression.js';
import {skillDefinition} from './skill-levels.js';
import {TRAP_NAMES} from './dungeon-packages.js';

import {SCOUT_APIS} from './scout-apis.js';
export {SCOUT_APIS} from './scout-apis.js';
const faces=['north','east','south','west'],delta=[[0,-1],[1,0],[0,1],[-1,0]];
const int=(n,min=0,max=1e9)=>Number.isInteger(n)&&n>=min&&n<=max;
const keys=(o,list)=>isRecord(o)&&Object.keys(o).every(k=>list.includes(k));
const scout=state=>state.scouting??={traps:{},effects:{}};
export const trapDisabled=(state,key)=>state.scouting?.traps[key]?.disabled===true;
export const camouflageRate=state=>state.scouting?.effects.camouflage?.rate??1;
export function trapDefinitionValid(data,t){
  return keys(t,['kind','hidden','difficulty','recovery'])&&Object.hasOwn(TRAP_NAMES,t.kind)&&int(t.hidden??0,0,20)&&int(t.difficulty??1,1,20)&&
    (t.recovery===undefined||keys(t.recovery,['item','count','minLevel','chance'])&&Object.hasOwn(data.items,t.recovery.item)&&int(t.recovery.count,1,data.system.maxStack)&&int(t.recovery.minLevel,1,20)&&Number.isFinite(t.recovery.chance)&&t.recovery.chance>=0&&t.recovery.chance<=1);
}
export function scoutDefinitionErrors(a){
  if(!SCOUT_APIS.includes(a?.api))return [];
  const errors=[],bad=()=>errors.push('探索技能の範囲・期限・効果不正');
  if(a.target!=='location'||a.modes.length!==1||a.modes[0]!=='dungeon'||a.output!==undefined)bad();
  if(['trap.detect','party.recon'].includes(a.api)&&(!int(a.radius,1,8)||!int(a.hidden,0,20)||a.trapKinds!==undefined&&(!Array.isArray(a.trapKinds)||a.trapKinds.some(k=>!Object.hasOwn(TRAP_NAMES,k)))))bad();
  if(['trap.disarm','party.recon'].includes(a.api)&&!int(a.difficulty,1,20))bad();
  if(a.api==='trap.disarm'&&typeof a.recover!=='boolean')bad();
  if(['party.ambush','party.patrol','party.camouflage'].includes(a.api)&&!int(a.duration,1,10000))bad();
  if(a.api==='party.ambush'&&!int(a.actions,1,20))bad();
  if(a.api==='party.camouflage'&&(!Number.isFinite(a.rate)||a.rate<0||a.rate>1))bad();
  if(a.api==='party.recon'&&(!int(a.returnSteps,1,1000)||!int(a.cells,1,256)||!int(a.disarmCount,0,32)))bad();
  return errors;
}
export function trapsOnFloor(data,state,mapId=state.location?.map){
  const map=data.maps[mapId],traps=[];if(!map?.cells)return traps;
  for(let y=0;y<map.tiles.length;y++)for(let x=0;x<map.tiles[y].length;x++){
    const cell=dungeonCell(data,state,map,x,y);
    for(const event of cell?.events??[]){const definition=data.cellEvents[event];if(definition?.trap)traps.push({key:cellEventKey(mapId,x,y,event),map:mapId,x,y,event,edge:cell.eventFaces?.[event],trap:definition.trap});}
  }
  return traps;
}
export function discoverTrap(state,t){
  const record=scout(state).traps[t.key]??={discovered:true};if(t.edge)record.edge=t.edge;else delete record.edge;
  const seen=new Set(state.discovered[t.map]??[]);seen.add(`${t.x},${t.y}`);state.discovered[t.map]=[...seen];
}
export function discoverTriggeredTrap(data,state,map,x,y,event){
  if(!data.cellEvents[event]?.trap)return;
  discoverTrap(state,{key:cellEventKey(map,x,y,event),map,x,y,edge:dungeonCell(data,state,data.maps[map],x,y)?.eventFaces?.[event]});
}
export function rearmTrap(state,key){const t=state.scouting?.traps[key];if(t)delete t.disabled;}
function reachableTrap(data,state,t){
  const p=state.location,[dx,dy]=delta[faces.indexOf(p.facing)];
  if(t.edge)return p.x===t.x&&p.y===t.y&&p.facing===t.edge;
  if(p.x===t.x&&p.y===t.y)return !(state.events[t.key]>0);
  return p.x+dx===t.x&&p.y+dy===t.y&&edgeBetween(data,data.maps[p.map],p,t,state)?.passage!=='#';
}
const detectable=(a,t)=>(t.trap.hidden??0)<=a.hidden&&(!a.trapKinds||a.trapKinds.includes(t.trap.kind));
export function normalEncounterPool(data,state){
  const map=data.maps[state.location?.map];if(!map)return {pool:[]};
  const environment=dungeonEncounter(data,state);
  // Only the floor's ordinary encounter configuration, never object/script battles.
  const pool=environment.encounter?[{encounter:environment.encounter,weight:1}]:environment.encounterPool??map.encounterPool??(map.encounter?[{encounter:map.encounter,weight:1}]:[]);
  return {pool:pool.filter(e=>data.encounters[e.encounter]&&e.weight>0),enemyScale:environment.enemyScale};
}
export function scoutingPlan(data,state,actor,a,target){
  if(!state.location||data.maps[state.location.map]?.voxels)return {ok:false,reason:'通常のダンジョンフィールドで使ってください。'};
  if(a.api==='trap.disarm'){
    const targets=trapsOnFloor(data,state).filter(t=>!trapDisabled(state,t.key)&&occurrenceAvailable(state,data.cellEvents[t.event],t.key)&&reachableTrap(data,state,t)&&(state.scouting?.traps[t.key]?.discovered||(t.trap.hidden??0)===0));
    const options=targets.map(t=>({id:t.key,name:`${TRAP_NAMES[t.trap.kind]}${t.edge?`（${{north:'北',east:'東',south:'南',west:'西'}[t.edge]}の壁）`:''}`,enabled:(t.trap.difficulty??1)<=a.difficulty}));
    const selected=target?targets.find(t=>t.key===target):targets.length===1?targets[0]:null;
    if(!selected)return {ok:false,targets:options,reason:targets.length?'解除する罠を選んでください。':'正面の隣接床・未発動の足元・向いている壁に、既知の罠がありません。'};
    if((selected.trap.difficulty??1)>a.difficulty)return {ok:false,targets:options,reason:'この罠の解除には、より高い技能Lvが必要です。'};
    return {ok:true,trap:selected,targets:options};
  }
  if(a.api==='encounter.seek'){const encounters=normalEncounterPool(data,state);if(!encounters.pool.length)return {ok:false,reason:'このフロアに通常遭遇の候補がありません。'};return {ok:true,...encounters};}
  if(a.api==='party.recon'){
    if(state.scouting?.recon)return {ok:false,reason:'偵察中の仲間が戻るまで待ってください。'};
    if(!state.members.some(id=>id!==actor&&state.actors[id].hp>0))return {ok:false,reason:'偵察中に隊を守る、生存中の仲間が必要です。'};
    const result=reconResult(data,state,a);if(!result.cells.length&&!result.traps.length)return {ok:false,reason:'周辺の未探索域・未知の罠はすべて確認済みです。'};
    return {ok:true,result};
  }
  return {ok:true};
}
function disarm(engine,t,recover=false,level=1){
  discoverTrap(engine.state,t);scout(engine.state).traps[t.key].disabled=true;
  const r=t.trap.recovery;
  if(recover&&r&&level>=r.minLevel){
    if((engine.state.inventory[r.item]??0)+r.count>engine.data.system.maxStack){engine.log('袋が満杯のため、罠の部品は回収できませんでした。');return;}
    if(engine.random()<r.chance){engine.give(r.item,r.count);engine.log(`${engine.data.items[r.item].name}を${r.count}個回収しました。`);}
  }
}
function reconResult(data,state,a){
  const p=state.location,map=data.maps[p.map],seen=new Set(state.discovered[p.map]??[]),visited=new Set([`${p.x},${p.y}`]),queue=[{x:p.x,y:p.y}],cells=[];
  for(let i=0;i<queue.length&&cells.length<a.cells;i++){
    const from=queue[i],key=`${from.x},${from.y}`;if(!seen.has(key))cells.push(key);
    for(const [dx,dy] of delta){const to={x:from.x+dx,y:from.y+dy},key=`${to.x},${to.y}`;if(!visited.has(key)&&Math.abs(to.x-p.x)<=a.radius&&Math.abs(to.y-p.y)<=a.radius&&dungeonCell(data,state,map,to.x,to.y)?.passage==='.'&&edgeBetween(data,map,from,to,state)?.passage!=='#'){visited.add(key);queue.push(to);}}
  }
  const traps=trapsOnFloor(data,state).filter(t=>visited.has(`${t.x},${t.y}`)&&detectable(a,t)&&!state.scouting?.traps[t.key]?.discovered).map(t=>t.key);
  const disarmed=traps.filter(key=>{const event=data.cellEvents[key.split('/').at(-1)];return (event.trap.difficulty??1)<=a.difficulty;}).slice(0,a.disarmCount);
  return {cells,traps,disarmed};
}
export function applyScouting(engine,actor,a,plan){
  const s=engine.state,p=s.location,q=scout(s);
  if(a.api==='trap.disarm')disarm(engine,plan.trap,a.recover,plan.usedLevel);
  if(a.api==='trap.detect'){
    const traps=trapsOnFloor(engine.data,s).filter(t=>Math.abs(t.x-p.x)<=a.radius&&Math.abs(t.y-p.y)<=a.radius&&detectable(a,t));traps.forEach(t=>discoverTrap(s,t));engine.log(`${a.radius*2+1}×${a.radius*2+1}の範囲で罠${traps.length}件を確認しました。`);
  }
  if(a.api==='party.ambush')q.effects.ambush={remaining:a.duration,actions:a.actions};
  if(a.api==='party.patrol')q.effects.patrol={remaining:a.duration};
  if(a.api==='party.camouflage')q.effects.camouflage={remaining:a.duration,rate:a.rate};
  if(a.api==='party.recon'){
    q.recon={actor,ability:a.id,level:plan.usedLevel,map:p.map,x:p.x,y:p.y,slot:s.members.indexOf(actor),startedStep:s.steps,returnAt:s.steps+a.returnSteps,result:plan.result};
    s.members=s.members.filter(id=>id!==actor);engine.log(`${engine.data.actors[actor].name}は偵察へ。あと${a.returnSteps}歩で合流します。`);
  }
  if(a.api==='encounter.seek'){
    let roll=engine.random()*plan.pool.reduce((n,e)=>n+e.weight,0),id=plan.pool.at(-1).encounter;
    for(const e of plan.pool){roll-=e.weight;if(roll<0){id=e.encounter;break;}}
    if(!encounterStoryJourney(engine,id))engine.startBattle(id,{win:[],escape:[],lose:[]},{enemyScale:plan.enemyScale});
  }
}
export function returnRecon(engine,complete=false){
  const s=engine.state,r=s.scouting?.recon;if(!r)return;
  // Reserve the original party slot throughout departure; restoration is never lossy.
  if(!s.members.includes(r.actor))s.members.splice(Math.min(r.slot,s.members.length),0,r.actor);
  delete s.scouting.recon;
  if(complete){
    s.discovered[r.map]=[...new Set([...(s.discovered[r.map]??[]),...r.result.cells])];
    for(const t of trapsOnFloor(engine.data,s,r.map))if(r.result.traps.includes(t.key)){discoverTrap(s,t);if(r.result.disarmed.includes(t.key))disarm(engine,t);}
  }
  engine.log(`${engine.data.actors[r.actor].name}が${complete?'偵察を終えて':'偵察を切り上げて'}合流しました。`);
}
export function stepScouting(engine){
  const s=engine.state,q=s.scouting;if(!q)return;
  if(q.recon&&s.steps>=q.recon.returnAt)returnRecon(engine,true);
}
export function expireScoutingEffects(engine,effects){
  if(!effects||effects!==engine.state.scouting?.effects)return;
  for(const [id,e] of Object.entries(effects))if(--e.remaining<=0)delete effects[id];
}
export function clearScoutingTrip(engine){returnRecon(engine);if(engine.state.scouting)engine.state.scouting.effects={};}
export function trapMarkers(data,state){
  return trapsOnFloor(data,state).filter(t=>state.scouting?.traps[t.key]?.discovered).map(t=>({id:t.key,x:t.x,y:t.y,kind:'trap',glyph:'×',name:`${trapDisabled(state,t.key)?'解除済みの':''}${TRAP_NAMES[t.trap.kind]}`,disabled:trapDisabled(state,t.key),...(t.edge?{edge:t.edge}:{}),inInteractionRange:false}));
}
export function scoutingSaveErrors(data,state){
  const q=state.scouting;if(q===undefined)return [];
  const errors=[],bad=()=>errors.push('探索技能の保存状態不正');
  if(!keys(q,['traps','effects','recon'])||!isRecord(q.traps)||!isRecord(q.effects))return ['探索技能の保存構造不正'];
  const trapKey=key=>{const m=/^cell\/([^/]+)\/(\d+),(\d+)\/([^/]+)$/.exec(key);return m&&data.maps[m[1]]?.tiles[Number(m[3])]?.[Number(m[2])]!==undefined&&data.cellEvents[m[4]]?.trap;};
  for(const [key,t] of Object.entries(q.traps))if(!trapKey(key)||!keys(t,['discovered','disabled','edge'])||t.discovered!==true||t.disabled!==undefined&&t.disabled!==true||t.edge!==undefined&&!faces.includes(t.edge))bad();
  for(const [id,e] of Object.entries(q.effects)){
    if(!['ambush','patrol','camouflage'].includes(id)||!keys(e,['remaining',...(id==='ambush'?['actions']:id==='camouflage'?['rate']:[])])||!int(e.remaining,1,10000)||id==='ambush'&&!int(e.actions,1,20)||id==='camouflage'&&(!Number.isFinite(e.rate)||e.rate<0||e.rate>1))bad();
  }
  if(q.recon!==undefined){
    const r=q.recon,spec=skillDefinition(data,r?.ability),map=data.maps[r?.map];
    if(!keys(r,['actor','ability','level','map','x','y','slot','startedStep','returnAt','result'])||!Object.hasOwn(state.actors,r.actor)||state.members.includes(r.actor)||state.members.length>=data.system.maxParty||spec?.api!=='party.recon'||!int(r.level,1,spec?.maxSkillLevel??3)||!map||!int(r.x,0,(map?.tiles[0].length??0)-1)||!int(r.y,0,(map?.tiles.length??0)-1)||!int(r.slot,0,state.members.length)||!int(r.startedStep,0,state.steps)||!int(r.returnAt,r.startedStep+1,r.startedStep+1000)||state.location?.map!==r.map||state.mode!=='dungeon')bad();
    if(!keys(r?.result,['cells','traps','disarmed']))bad();
    else for(const [field,limit] of [['cells',256],['traps',1024],['disarmed',32]]){const list=r.result[field];if(!Array.isArray(list)||list.length>limit||new Set(list).size!==list.length||list.some(v=>typeof v!=='string'||(field==='cells'?!/^(0|[1-9]\d*),(0|[1-9]\d*)$/.test(v)||map?.tiles[Number(v.split(',')[1])]?.[Number(v.split(',')[0])]===undefined:!trapKey(v)||!v.startsWith(`cell/${r.map}/`)||field==='disarmed'&&(!Array.isArray(r.result.traps)||!r.result.traps.includes(v)))))bad();}
  }
  return errors;
}
