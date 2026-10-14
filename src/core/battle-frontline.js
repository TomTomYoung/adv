import {unitKey} from './buffs.js';
import {clone,isRecord} from './expression.js';
import {PARTY_CELLS,ENEMY_CELLS,nextFormation,formationPlan} from './battle-formation.js';
export const isFrontline=s=>s.battle?.mode==='frontline';
export const frontlineUnits=s=>[...s.members.map(id=>s.actors[id]),...(s.battle?.enemies??[])];
export const frontPosition=(s,u)=>s.battle?.frontline?.positions[typeof u==='string'?u:unitKey(u)];
export const depthNames=['前衛','中衛','後衛'];
const integer=(v,min,max)=>Number.isInteger(v)&&v>=min&&v<=max;
export const validFrontPosition=p=>isRecord(p)&&Object.keys(p).length===2&&integer(p.depth,0,2)&&integer(p.lane,0,4);
export const sameFrontPosition=(a,b)=>a?.depth===b?.depth&&a?.lane===b?.lane;
export function nextFrontFormation(members,previous={},replace){
 const p=nextFormation(members,Object.fromEntries(Object.entries(previous).map(([id,p])=>[id,{x:p.lane,y:p.depth}])),replace);
 return p&&Object.fromEntries(Object.entries(p).map(([id,p])=>[id,{lane:p.x,depth:p.y}]));
}
export const startingFrontFormation=s=>s.partyFrontlineFormation??Object.fromEntries(Object.entries(s.partyFormation).map(([id,p])=>[id,{lane:p.x,depth:p.y}]));
export function syncFrontFormation(s,replace){if(s.partyFrontlineFormation)s.partyFrontlineFormation=nextFrontFormation(s.members,s.partyFrontlineFormation,replace);}
export function setFrontFormation(engine,actor,depth,lane){
 const s=engine.state,p=formationPlan(engine.data,{...s,partyFormation:Object.fromEntries(Object.entries(startingFrontFormation(s)).map(([id,p])=>[id,{x:p.lane,y:p.depth}]))},actor,lane,depth);
 if(!p.ok){engine.notify(p.reason);return false;}s.partyFrontlineFormation=Object.fromEntries(Object.entries(p.positions).map(([id,p])=>[id,{lane:p.x,depth:p.y}]));return true;
}
export function frontlineStart(state,encounter,data){
 if(frontReactionErrors(encounter.frontlineReactions,data).length)throw Error('前中後衛の反応定義が不正です');
 const keys=[...state.members.map(id=>'actor:'+id),...encounter.enemies.map((_,i)=>'enemy:enemy_'+i)];if(Object.keys(encounter.frontlineReactions??{}).some(k=>!keys.includes(k)))throw Error('反応する個体がありません');
 const own=startingFrontFormation(state),enemies=encounter.frontlinePositions??ENEMY_CELLS.slice(0,encounter.enemies.length).map(p=>({lane:p.x,depth:2-p.y}));
 if(state.members.length>15||encounter.enemies.length>15||Object.keys(own).length!==state.members.length||state.members.some(id=>!validFrontPosition(own[id]))||!validPositions(enemies,encounter.enemies.length)||!validPositions(Object.values(own),state.members.length))throw Error('前中後衛の開始配置が不正です');
 return {mode:'frontline',frontline:{positions:Object.fromEntries([...state.members.map(id=>['actor:'+id,{...own[id]}]),...enemies.map((p,i)=>['enemy:enemy_'+i,{...p}])]),reactions:clone(encounter.frontlineReactions??{}),preparedRound:0,eventSerial:0,events:[]}};
}
const validPositions=(ps,n)=>Array.isArray(ps)&&ps.length===n&&ps.every(validFrontPosition)&&new Set(ps.map(p=>`${p.depth},${p.lane}`)).size===n;
export function traceFrontline(engine,type,detail={}){
 const b=engine.state.battle;if(!isFrontline(engine.state))return;
 const f=b.frontline,event={id:++f.eventSerial,round:b.round,type,...clone(detail),positions:clone(f.positions),hp:Object.fromEntries(frontlineUnits(engine.state).map(u=>[unitKey(u),u.hp]))};
 f.events.push(event);if(f.events.length>512)f.events.shift();return event;
}
export function prepareFrontlineRound(engine,react=()=>{}){
 const s=engine.state,b=s.battle;if(!isFrontline(s)||b.frontline.preparedRound===b.round)return;
 b.frontline.preparedRound=b.round;traceFrontline(engine,'round_start');
 for(const enemy of [false,true]){
  for(let step=1;step<=2;step++){
   const units=frontlineUnits(s).filter(u=>Boolean(u.instance)===enemy&&u.hp>0);
   if(!units.length||units.some(u=>frontPosition(s,u).depth===0))break;
   const moves=units.map(u=>({unit:unitKey(u),from:{...frontPosition(s,u)},to:{...frontPosition(s,u),depth:frontPosition(s,u).depth-1}}));
   for(const m of moves)b.frontline.positions[m.unit]=m.to;
   traceFrontline(engine,'advance',{side:enemy?'enemies':'allies',step,moves});
   b.log.push(`${enemy?'敵':'味方'}の前衛不在：${moves.map(m=>`${depthNames[m.from.depth]}→${depthNames[m.to.depth]}`).filter((v,i,a)=>a.indexOf(v)===i).join('・')}（${step}歩目）。`);
   for(const u of units)react(u,'onAdvance',null);
  }
 }
}
export function frontlineMovePlan(s,unit,to){
 const fail=reason=>({ok:false,reason});
 if(!isFrontline(s)||!unit||unit.hp<=0||!isRecord(to)||Object.keys(to).some(k=>k!=='depth')||!integer(to.depth,0,2))return fail('移動先の前衛・中衛・後衛を選んでください。');
 const from=frontPosition(s,unit);if(from.depth===to.depth)return fail('現在とは異なる段を選んでください。');
 const occupied=frontlineUnits(s).filter(u=>u!==unit&&u.hp>0&&Boolean(u.instance)===Boolean(unit.instance)).map(u=>frontPosition(s,u));
 const lanes=[0,1,2,3,4].sort((a,b)=>Math.abs(a-from.lane)-Math.abs(b-from.lane)||a-b),lane=lanes.find(lane=>!occupied.some(p=>p.depth===to.depth&&p.lane===lane));
 if(lane===undefined)return fail('その段は満員です。');return {ok:true,to:{depth:to.depth,lane}};
}
export function moveFrontline(engine,unit,to){const b=engine.state.battle,from={...frontPosition(engine.state,unit)};b.frontline.positions[unitKey(unit)]={...to};traceFrontline(engine,'move',{unit:unitKey(unit),from,to});b.log.push(`${unit.name??engine.data.actors[unit.id].name}は${depthNames[to.depth]}へ移動した。`);}
export function frontlineRevivePosition(s,unit){
 const occupied=frontlineUnits(s).filter(u=>u!==unit&&u.hp>0&&Boolean(u.instance)===Boolean(unit.instance)).map(u=>frontPosition(s,u)),old=frontPosition(s,unit);
 return [old,...PARTY_CELLS.map(p=>({lane:p.x,depth:p.y}))].find(p=>!occupied.some(q=>sameFrontPosition(p,q)))??false;
}
export function frontReactionErrors(r,data){
 if(r===undefined)return [];
 if(!isRecord(r)||Object.entries(r).some(([key,rules])=>! /^(actor:[a-z0-9_]+|enemy:enemy_\d+)$/.test(key)||!Array.isArray(rules)||rules.length>8||rules.some(v=>!isRecord(v)||Object.keys(v).some(k=>!['on','skill','cancelRemaining'].includes(k))||!['onHit','onAdvance'].includes(v.on)||!data.skills[v.skill]||typeof v.cancelRemaining!=='boolean')))return ['前中後衛の反応定義不正'];return [];
}
export function frontlineSaveErrors(s,data){
 const errors=[],f=s.partyFrontlineFormation;
 if(f!==undefined&&(!isRecord(f)||Object.keys(f).length!==s.members.length||s.members.some(id=>!Object.hasOwn(f,id))||!validPositions(Object.values(f),s.members.length)))errors.push('前中後衛の保存陣形不正');
 if(!isFrontline(s)){if(s.battle?.frontline!==undefined)errors.push('別方式に前中後衛の戦闘構造があります');return errors;}
 const b=s.battle,g=b.frontline,units=frontlineUnits(s),keys=units.map(unitKey);
 if(!isRecord(g)||Object.keys(g).some(k=>!['positions','reactions','preparedRound','events','eventSerial'].includes(k))||!isRecord(g.reactions)||!isRecord(g.positions)||Object.keys(g.positions).length!==keys.length||keys.some(k=>!validFrontPosition(g.positions[k]))||!integer(g.preparedRound,0,b.round)||!integer(g.eventSerial,0,1e9)||!Array.isArray(g.events)||g.events.length>512){errors.push('前中後衛の戦闘保存不正');return errors;}
 for(const side of [false,true]){const ps=units.filter(u=>u.hp>0&&Boolean(u.instance)===side).map(u=>g.positions[unitKey(u)]);if(!validPositions(ps,ps.length))errors.push('前中後衛の占有重複');}
 errors.push(...frontReactionErrors(g.reactions,data));
 if(Object.keys(g.reactions).some(k=>!keys.includes(k)))errors.push('反応個体がありません');
 if(g.events.some((e,i)=>!isRecord(e)||!integer(e.id,1,g.eventSerial)||i>0&&g.events[i-1].id>=e.id||!integer(e.round,1,b.round)||typeof e.type!=='string'||!isRecord(e.positions)||keys.some(k=>!validFrontPosition(e.positions[k]))||!isRecord(e.hp)||keys.some(k=>!integer(e.hp[k],0,1e9))))errors.push('前中後衛のイベント履歴不正');
 return errors;
}
export function frontlineDefinitionErrors(data){
 const errors=[];for(const [id,e] of Object.entries(data.encounters??{})){
  if(e.battleMode==='frontline'&&e.enemies.length>15)errors.push(`${id}: 前中後衛の敵数超過`);
  if(e.frontlinePositions!==undefined&&!validPositions(e.frontlinePositions,e.enemies.length))errors.push(`${id}: 前中後衛の敵配置不正`);
  errors.push(...frontReactionErrors(e.frontlineReactions,data).map(x=>`${id}: ${x}`));
 }
 const ranges=data.game?.battle?.frontlineWeaponRanges;if(ranges!==undefined&&(!isRecord(ranges)||Object.entries(ranges).some(([id,r])=>!data.jobProfile.equipmentTypes.weapon.includes(id)||!Array.isArray(r)||r.length!==2||!integer(r[0],0,5)||!integer(r[1],r[0],5))))errors.push('前中後衛の武器レンジ不正');
 return errors;
}
