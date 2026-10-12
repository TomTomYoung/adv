import {dungeonCell,dungeonEncounter} from './dungeons.js';
import {occurrenceAvailable} from './event-occurrence.js';
import {TRAP_NAMES} from './dungeon-packages.js';
import {objectVisible} from './quest-events.js';
import {skillLevel} from './skill-levels.js';

const DIRS=['north','east','south','west'],DELTAS=[[0,-1],[1,0],[0,1],[-1,0]];
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
export const SCOUT_FIELD_APIS=new Set(['trap.disarm','trap.detect','battle.ambush','battle.seek','battle.patrol','encounter.camouflage','scout.recon']);
export const freshScouting=()=>({discovered:[],disabled:[],effects:{ambush:null,patrol:null,camouflage:null},detached:[]});
export function ensureScouting(state){
  if(!object(state.scouting))state.scouting=freshScouting();
  const s=state.scouting;s.discovered??=[];s.disabled??=[];s.effects??={ambush:null,patrol:null,camouflage:null};s.detached??=[];
  for(const k of ['ambush','patrol','camouflage'])if(!(k in s.effects))s.effects[k]=null;
  return s;
}
export const trapCellKey=(map,x,y,event)=>`cell/${map}/${x},${y}/${event}`;
export const trapObjectKey=(map,id)=>`object/${map}/${id}`;
export const trapDisabled=(state,key)=>ensureScouting(state).disabled.includes(key);
const discover=(state,key)=>{const s=ensureScouting(state);if(!s.discovered.includes(key))s.discovered.push(key);};
const disable=(state,key)=>{const s=ensureScouting(state);discover(state,key);if(!s.disabled.includes(key))s.disabled.push(key);};
const currentRun=state=>state.dungeons?.active?.run??null;
const rankValue=(ability,key,level,fallback)=>ability[key]?.[Math.max(0,level-1)]??fallback;

function mapTraps(data,state,map){
  const rows=[];
  for(let y=0;y<map.tiles.length;y++)for(let x=0;x<map.tiles[0].length;x++){
    const cell=dungeonCell(data,state,map,x,y);
    for(const eventId of cell?.events??[]){
      const event=data.cellEvents[eventId];if(!event?.trap)continue;
      const key=trapCellKey(map.id,x,y,eventId);if(trapDisabled(state,key)||!occurrenceAvailable(state,event,`cell/${map.id}/${x},${y}/${eventId}`))continue;
      rows.push({type:'cell',key,map:map.id,x,y,eventId,trap:event.trap,name:TRAP_NAMES[event.trap.kind]??'罠'});
    }
  }
  for(const o of map.objects??[])if(o.kind==='trap'&&objectVisible(state,map,o)){
    const key=trapObjectKey(map.id,o.id);if(trapDisabled(state,key)||o.once&&state.events[`${map.id}/${o.id}`])continue;
    rows.push({type:'object',key,map:map.id,x:o.x,y:o.y,edge:o.edge,objectId:o.id,name:o.name??'罠'});
  }
  return rows;
}
function sameCellAllowed(state,trap){
  if(trap.type==='cell')return (state.events[trap.key]??0)===0;
  return (state.events[`${trap.map}/${trap.objectId}`]??0)===0;
}
function reachableTrap(data,state){
  const loc=state.location,map=data.maps[loc?.map];if(!map)return null;
  const traps=mapTraps(data,state,map),dir=DIRS.indexOf(loc.facing),[dx,dy]=DELTAS[dir],ahead={x:loc.x+dx,y:loc.y+dy};
  return traps.find(t=>{
    if(t.x===ahead.x&&t.y===ahead.y)return true;
    if(t.x!==loc.x||t.y!==loc.y||!sameCellAllowed(state,t))return false;
    return !t.edge||t.edge===loc.facing;
  })??null;
}
function revealCell(state,map,x,y,z=0){
  const list=state.discovered[map]??=[],key=z?`${x},${y},${z}`:`${x},${y}`;if(!list.includes(key))list.push(key);state.discovered[map]=list;
}
function revealTrap(state,trap){discover(state,trap.key);revealCell(state,trap.map,trap.x,trap.y);}
export function discoveredTrapMarkers(data,state,map){
  const s=ensureScouting(state),prefix=`cell/${map.id}/`,rows=[];
  for(const key of s.discovered.filter(k=>k.startsWith(prefix))){
    const m=/^cell\/([^/]+)\/(\d+),(\d+)\/([^/]+)$/.exec(key);if(!m)continue;
    const event=data.cellEvents[m[4]];if(!event?.trap)continue;
    rows.push({id:`scout:${key}`,name:`${s.disabled.includes(key)?'解除済みの':'発見した'}${TRAP_NAMES[event.trap.kind]??'罠'}`,x:Number(m[2]),y:Number(m[3]),kind:'trap',unread:true});
  }
  return rows;
}
export function scoutingFieldPlan(data,state,actorId,ability){
  const fail=reason=>({ok:false,reason}),map=data.maps[state.location?.map];if(!map)return fail('ダンジョン内で使用してください。');
  if(ability.api==='trap.disarm'){const trap=reachableTrap(data,state);return trap?{ok:true,trap}:{ok:false,reason:'解除できる罠が足元または正面にありません。'};}
  if(ability.api==='scout.recon'){
    if(!state.members.some(id=>id!==actorId&&state.actors[id].hp>0))return fail('偵察中に隊へ残る生存者が必要です。');
  }
  if(ability.api==='battle.seek'&&!map.encounter&&!map.encounterPool?.length)return fail('このフロアに索敵できる敵はいません。');
  return {ok:true};
}
function weightedEncounter(engine){
  const {data,state}=engine,map=data.maps[state.location.map],environment=dungeonEncounter(data,state);let encounter=environment.encounter??map.encounter;
  const pool=environment.encounterPool??map.encounterPool;
  if(pool?.length){let roll=engine.random()*pool.reduce((n,e)=>n+e.weight,0);encounter=pool.at(-1).encounter;for(const e of pool){roll-=e.weight;if(roll<0){encounter=e.encounter;break;}}}
  return {encounter,enemyScale:environment.enemyScale};
}
function revealRandom(engine,count){
  const {state}=engine,map=engine.map(),z=state.location.z??0,seen=new Set(state.discovered[map.id]??[]),unknown=[];
  for(let y=0;y<map.tiles.length;y++)for(let x=0;x<map.tiles[0].length;x++){const key=map.voxels?`${x},${y},${z}`:`${x},${y}`;if(!seen.has(key))unknown.push({x,y,key});}
  for(let n=0;n<count&&unknown.length;n++){const at=Math.floor(engine.random()*unknown.length),p=unknown.splice(at,1)[0];seen.add(p.key);}
  state.discovered[map.id]=[...seen];return seen;
}
function revealTrapsForKnown(data,state,map,known,disarm=false){
  let found=0,disabled=0;
  for(const trap of mapTraps(data,state,map)){
    const key=map.voxels?`${trap.x},${trap.y},${state.location.z??0}`:`${trap.x},${trap.y}`;if(!known.has(key))continue;
    revealTrap(state,trap);found++;if(disarm){disable(state,trap.key);disabled++;}
  }
  return {found,disabled};
}
function detachScout(state,actorId,steps){
  const s=ensureScouting(state),index=state.members.indexOf(actorId);state.members.splice(index,1);
  s.detached=s.detached.filter(v=>v.actor!==actorId);s.detached.push({actor:actorId,index,run:currentRun(state),returnAt:state.steps+steps});
}
export function restoreDetachedScouts(engine,force=false){
  const {state}=engine,s=ensureScouting(state);let changed=false;
  for(const row of [...s.detached]){
    if(!force&&row.run===currentRun(state)&&state.steps<row.returnAt)continue;
    s.detached.splice(s.detached.indexOf(row),1);
    if(!state.members.includes(row.actor)){state.members.splice(Math.min(row.index,state.members.length),0,row.actor);changed=true;engine.log(`${engine.data.actors[row.actor].name}が偵察から隊へ戻った。`);}
  }
  return changed;
}
export function applyScoutingFieldAction(engine,actorId,ability,plan,level){
  const {state}=engine,s=ensureScouting(state),run=currentRun(state);
  if(ability.api==='trap.disarm'){
    disable(state,plan.trap.key);let salvaged=false;
    if(level>=(ability.salvageAtSkillLevel??99)&&engine.data.items.recovered_trap){const before=state.inventory.recovered_trap??0;engine.give('recovered_trap',1);salvaged=(state.inventory.recovered_trap??0)>before;}
    return `${plan.trap.name}を解除した。${salvaged?' 罠を回収した。':''}`;
  }
  if(ability.api==='trap.detect'){
    const size=rankValue(ability,'sizeBySkillLevel',level,3),radius=Math.floor(size/2),loc=state.location,map=engine.map();let found=0;
    for(const trap of mapTraps(engine.data,state,map))if(Math.abs(trap.x-loc.x)<=radius&&Math.abs(trap.y-loc.y)<=radius){revealTrap(state,trap);found++;}
    return `${size}×${size}の範囲を調べ、罠${found}個を地図へ記した。`;
  }
  if(ability.api==='battle.ambush'){const count=rankValue(ability,'countBySkillLevel',level,1);s.effects.ambush={run,count};return `次の戦闘で先制${count}を得る準備をした。`;}
  if(ability.api==='battle.patrol'){const steps=rankValue(ability,'stepsBySkillLevel',level,20);s.effects.patrol={run,until:state.steps+steps};return `${steps}歩の間、敵の先制を防ぐ哨戒態勢を取った。`;}
  if(ability.api==='encounter.camouflage'){const steps=rankValue(ability,'stepsBySkillLevel',level,20),rate=rankValue(ability,'rateBySkillLevel',level,.7);s.effects.camouflage={run,until:state.steps+steps,rate};return `${steps}歩の間、通常遭遇率を${Math.round(rate*100)}%へ下げる迷彩を施した。`;}
  if(ability.api==='battle.seek'){const row=weightedEncounter(engine);engine.startBattle(row.encounter,{win:[],escape:[],lose:[]},{enemyScale:row.enemyScale});return 'フロアを索敵し、敵を捕捉した。';}
  if(ability.api==='scout.recon'){
    const count=rankValue(ability,'revealBySkillLevel',level,8),away=rankValue(ability,'awayStepsBySkillLevel',level,4),known=revealRandom(engine,count),result=revealTrapsForKnown(engine.data,state,engine.map(),known,level>=(ability.disarmAtSkillLevel??99));detachScout(state,actorId,away);
    return `${engine.data.actors[actorId].name}は偵察へ出た。未踏地点を${count}区画まで調べ、罠${result.found}個を発見${result.disabled?`、${result.disabled}個を解除`:''}した。`;
  }
  return '';
}
const activeEffect=(state,name)=>{const s=ensureScouting(state),e=s.effects[name];return e&&e.run===currentRun(state)&&state.steps<e.until?e:null;};
export const scoutingEncounterRate=state=>activeEffect(state,'camouflage')?.rate??1;
export const patrolActive=state=>Boolean(activeEffect(state,'patrol'));
export function battlePreemptive(engine,encounter,options={}){
  const s=ensureScouting(engine.state),ambush=s.effects.ambush;let value=options.preemptive??encounter.preemptive??null;
  if(ambush?.run===currentRun(engine.state)){value={side:'party',count:ambush.count};s.effects.ambush=null;}
  if(value?.side==='enemy'&&patrolActive(engine.state))return null;
  if(!value)return null;return {side:value.side,remaining:value.count};
}
export function scoutingStateErrors(data,state){
  const s=state.scouting;if(s===undefined)return [];if(!object(s)||!Array.isArray(s.discovered)||!Array.isArray(s.disabled)||!object(s.effects)||!Array.isArray(s.detached))return ['斥候探索状態不正'];
  const errors=[],validKey=key=>/^cell\/[a-z][a-z0-9_]*\/\d+,\d+\/[a-z][a-z0-9_]*$/.test(key)||/^object\/[a-z][a-z0-9_]*\/[a-z][a-z0-9_]*$/.test(key);
  if(new Set(s.discovered).size!==s.discovered.length||new Set(s.disabled).size!==s.disabled.length||s.discovered.some(k=>!validKey(k))||s.disabled.some(k=>!validKey(k)||!s.discovered.includes(k)))errors.push('罠発見・解除状態不正');
  for(const name of ['ambush','patrol','camouflage']){const e=s.effects[name];if(e!==null&&e!==undefined&&!object(e))errors.push('斥候一時効果不正');}
  for(const r of s.detached)if(!object(r)||!data.actors[r.actor]||state.members.includes(r.actor)||!Number.isSafeInteger(r.index)||r.index<0||!Number.isSafeInteger(r.run)||r.run<1||!Number.isSafeInteger(r.returnAt)||r.returnAt<state.steps)errors.push('偵察離脱状態不正');
  return [...new Set(errors)];
}
