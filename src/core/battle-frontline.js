import {battleAlive,frontlinePresent,frontlineState,frontlineRows,traceFrontline,syncFrontlineDefeats,displaceFrontlineDown,shrinkFrontline,frontlineObjectErrors} from './frontline-lifecycle.js';
export {traceFrontline} from './frontline-lifecycle.js';
import {unitKey,movementBlockReason} from './buffs.js';
import {clone,isRecord} from './expression.js';
import {ENEMY_CELLS,nextFormation,formationPlan} from './battle-formation.js';
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
 if(frontlineObjectErrors(encounter.frontlineObjects).length)throw Error('衝突オブジェクトが不正です');
 if(frontReactionErrors(encounter.frontlineReactions,data).length)throw Error('前中後衛の反応定義が不正です');
 const keys=[...state.members.map(id=>'actor:'+id),...encounter.enemies.map((_,i)=>'enemy:enemy_'+i)];if(Object.keys(encounter.frontlineReactions??{}).some(k=>!keys.includes(k)))throw Error('反応する個体がありません');
 if(encounter.frontlineDown!==undefined&&(!Array.isArray(encounter.frontlineDown)||new Set(encounter.frontlineDown).size!==encounter.frontlineDown.length||encounter.frontlineDown.some(k=>!keys.includes(k))))throw Error('開始時の戦闘不能者が不正です');
 const own=startingFrontFormation(state),enemies=encounter.frontlinePositions??ENEMY_CELLS.slice(0,encounter.enemies.length).map(p=>({lane:p.x,depth:2-p.y}));
 if(state.members.length>15||encounter.enemies.length>15||Object.keys(own).length!==state.members.length||state.members.some(id=>!validFrontPosition(own[id]))||!validPositions(enemies,encounter.enemies.length)||!validPositions(Object.values(own),state.members.length))throw Error('前中後衛の開始配置が不正です');
 return {mode:'frontline',frontline:{rows:3,removed:{},objects:clone(encounter.frontlineObjects??[]),positions:Object.fromEntries([...state.members.map(id=>['actor:'+id,{...own[id]}]),...enemies.map((p,i)=>['enemy:enemy_'+i,{...p}])]),reactions:clone(encounter.frontlineReactions??{}),preparedRound:0,eventSerial:0,events:[]}};
}
const validPositions=(ps,n)=>Array.isArray(ps)&&ps.length===n&&ps.every(validFrontPosition)&&new Set(ps.map(p=>`${p.depth},${p.lane}`)).size===n;
export function prepareFrontlineRound(engine,react=()=>{}){
 const s=engine.state,b=s.battle;if(!isFrontline(s)||b.frontline.preparedRound===b.round)return;
 syncFrontlineDefeats(engine);b.frontline.preparedRound=b.round;traceFrontline(engine,'round_start');
 for(const enemy of [false,true]){
  for(let step=1;step<=2;step++){
   const units=frontlineUnits(s).filter(u=>Boolean(u.instance)===enemy&&battleAlive(s,u));
   if(!units.length||units.some(u=>frontPosition(s,u).depth===0))break;
   let moving=units.filter(u=>!movementBlockReason(engine.data,b,u));
   // A bound survivor keeps its cell. Resolve blockers before moving anybody;
   // another survivor may advance only if its destination is vacated too.
   for(let pass=0;pass<units.length;pass++){
    const stationary=units.filter(u=>!moving.includes(u));
    const next=moving.filter(u=>!stationary.some(v=>frontPosition(s,v).lane===frontPosition(s,u).lane&&frontPosition(s,v).depth===frontPosition(s,u).depth-1));
    if(next.length===moving.length)break;moving=next;
   }
   if(!moving.length)break;
   const moves=moving.map(u=>({unit:unitKey(u),from:{...frontPosition(s,u)},to:{...frontPosition(s,u),depth:frontPosition(s,u).depth-1}}));
   const retreats=displaceFrontlineDown(s,enemy,moves);
   for(const m of moves)b.frontline.positions[m.unit]=m.to;
   if(retreats.length)traceFrontline(engine,'retreat',{side:enemy?'enemies':'allies',step,moves:retreats});
   traceFrontline(engine,'advance',{side:enemy?'enemies':'allies',step,moves});
   b.log.push(`${enemy?'敵':'味方'}の前衛不在：${moves.map(m=>`${depthNames[m.from.depth]}→${depthNames[m.to.depth]}`).filter((v,i,a)=>a.indexOf(v)===i).join('・')}（${step}歩目）。`);
   for(const u of moving)react(u,'onAdvance',null);
   syncFrontlineDefeats(engine);
  }
 }
 shrinkFrontline(engine);
}
export function frontlineMovePlan(s,unit,to,data){
 const fail=reason=>({ok:false,reason});
 if(!isFrontline(s)||!battleAlive(s,unit)||!isRecord(to)||Object.keys(to).some(k=>k!=='depth')||!integer(to.depth,0,2))return fail('移動先の前衛・中衛・後衛を選んでください。');
 const blocked=movementBlockReason(data,s.battle,unit);if(blocked)return fail(blocked);
 const from=frontPosition(s,unit);
 if(!unit.instance&&to.depth>from.depth&&s.members.filter(id=>battleAlive(s,s.actors[id])).length===1)return fail('味方が1人だけの間は後退できません。');
 if(from.depth===to.depth)return fail('現在とは異なる段を選んでください。');
 const occupied=frontlineUnits(s).filter(u=>u!==unit&&frontlinePresent(s,u)&&Boolean(u.instance)===Boolean(unit.instance)).map(u=>frontPosition(s,u));
 const lanes=[0,1,2,3,4].sort((a,b)=>Math.abs(a-from.lane)-Math.abs(b-from.lane)||a-b),lane=lanes.find(lane=>!occupied.some(p=>p.depth===to.depth&&p.lane===lane));
 if(lane===undefined)return fail('その段は満員です。');return {ok:true,to:{depth:to.depth,lane}};
}
export function moveFrontline(engine,unit,to){const b=engine.state.battle,from={...frontPosition(engine.state,unit)};b.frontline.positions[unitKey(unit)]={...to};if(!unit.instance&&to.depth>=frontlineRows(engine.state)){const before=frontlineRows(engine.state);b.frontline.rows=to.depth+1;traceFrontline(engine,'expand',{from:before,to:b.frontline.rows});}traceFrontline(engine,'move',{unit:unitKey(unit),from,to});b.log.push(`${unit.name??engine.data.actors[unit.id].name}は${depthNames[to.depth]}へ移動した。`);}
export function frontlineRevivePosition(s,unit){
 return frontlinePresent(s,unit)&&frontPosition(s,unit).depth<frontlineRows(s,Boolean(unit.instance))?{...frontPosition(s,unit)}:false;
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
 if(!isRecord(g)||Object.keys(g).some(k=>!['positions','reactions','preparedRound','events','eventSerial','rows','removed','objects'].includes(k))||!isRecord(g.reactions)||!isRecord(g.positions)||Object.keys(g.positions).length!==keys.length||keys.some(k=>!validFrontPosition(g.positions[k]))||!integer(g.preparedRound,0,b.round)||!integer(g.eventSerial,0,1e9)||!Array.isArray(g.events)||g.events.length>512){errors.push('前中後衛の戦闘保存不正');return errors;}
 if(!integer(g.rows,1,3)||!isRecord(g.removed)||Object.entries(g.removed??{}).some(([k,r])=>!keys.includes(k)||!['defeated','shrink','skill'].includes(r)||r==='shrink'&&(!k.startsWith('actor:')||units.find(u=>unitKey(u)===k).hp>0)||r==='defeated'&&(!k.startsWith('enemy:')||units.find(u=>unitKey(u)===k).hp>0)))errors.push('前中後衛の行数・離脱状態不正');
 errors.push(...frontlineObjectErrors(g.objects));
 if(units.some(u=>frontlinePresent(s,u)&&!u.instance&&frontPosition(s,u).depth>=g.rows))errors.push('味方が現在の陣地外にいます');
 for(const side of [false,true]){const ps=units.filter(u=>frontlinePresent(s,u)&&Boolean(u.instance)===side).map(u=>g.positions[unitKey(u)]);if(!validPositions(ps,ps.length))errors.push('前中後衛の占有重複');}
 errors.push(...frontReactionErrors(g.reactions,data));
 if(Object.keys(g.reactions).some(k=>!keys.includes(k)))errors.push('反応個体がありません');
 const initial=data.encounters[b.encounter]?.enemies.length??b.enemies.length;
 const joins=Array.isArray(b.reinforcements)?b.reinforcements:[];
 // Historical snapshots contain only units that had joined by that round.
 const eventKeys=e=>keys.filter(k=>!k.startsWith('enemy:')||Number(k.slice(12))<initial||(joins[Number(k.slice(12))-initial]?.round??Infinity)<=e.round);
 const exact=(o,ks)=>isRecord(o)&&Object.keys(o).length===ks.length&&ks.every(k=>Object.hasOwn(o,k));
 if(g.events.some(e=>isRecord(e)&&e.rows!==undefined&&(!integer(e.rows,1,3)||!isRecord(e.removed)||Object.entries(e.removed).some(([k,r])=>!eventKeys(e).includes(k)||!['defeated','shrink','skill'].includes(r))||!exact(e.states,eventKeys(e))||eventKeys(e).some(k=>!['alive','down','removed'].includes(e.states[k])))))errors.push('前中後衛の状態履歴不正');
 if(g.events.some((e,i)=>!isRecord(e)||!integer(e.id,1,g.eventSerial)||i>0&&g.events[i-1].id>=e.id||!integer(e.round,1,b.round)||typeof e.type!=='string'||!exact(e.positions,eventKeys(e))||eventKeys(e).some(k=>!validFrontPosition(e.positions[k]))||!exact(e.hp,eventKeys(e))||eventKeys(e).some(k=>!integer(e.hp[k],0,1e9))))errors.push('前中後衛のイベント履歴不正');
 return errors;
}
export function frontlineDefinitionErrors(data){
 const errors=[];for(const [id,e] of Object.entries(data.enemies??{}))if(e.frontlineDefeat!==undefined&&!['remove','remain'].includes(e.frontlineDefeat))errors.push(`${id}: 撃破時の状態不正`);
 for(const [id,e] of Object.entries(data.encounters??{})){
  if(e.battleMode==='frontline'&&e.enemies.length>15)errors.push(`${id}: 前中後衛の敵数超過`);
  if(e.frontlinePositions!==undefined&&!validPositions(e.frontlinePositions,e.enemies.length))errors.push(`${id}: 前中後衛の敵配置不正`);
  if(e.frontlineDown!==undefined&&(!Array.isArray(e.frontlineDown)||new Set(e.frontlineDown).size!==e.frontlineDown.length||e.frontlineDown.some(k=>typeof k!=='string'||!(k.startsWith('actor:')?data.actors[k.slice(6)]:/^enemy:enemy_\d+$/.test(k)&&Number(k.slice(12))<e.enemies.length))))errors.push(`${id}: 開始時の戦闘不能者不正`);
  errors.push(...frontlineObjectErrors(e.frontlineObjects).map(x=>`${id}: ${x}`));
  errors.push(...frontReactionErrors(e.frontlineReactions,data).map(x=>`${id}: ${x}`));
 }
 const ranges=data.game?.battle?.frontlineWeaponRanges;if(ranges!==undefined&&(!isRecord(ranges)||Object.entries(ranges).some(([id,r])=>!data.jobProfile.equipmentTypes.weapon.includes(id)||!Array.isArray(r)||r.length!==2||!integer(r[0],0,5)||!integer(r[1],r[0],5))))errors.push('前中後衛の武器レンジ不正');
 return errors;
}
