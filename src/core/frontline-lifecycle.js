import {unitKey} from './buffs.js';
import {clone,isRecord} from './expression.js';
const front=s=>s.battle?.mode==='frontline';
const units=s=>[...s.members.map(id=>s.actors[id]),...(s.battle?.enemies??[])];
const key=u=>typeof u==='string'?u:unitKey(u);
const position=(s,u)=>s.battle.frontline.positions[key(u)];
const same=(a,b)=>a.depth===b.depth&&a.lane===b.lane;
export const frontlineRows=(s,enemy=false)=>enemy?3:s.battle?.frontline?.rows??3;
export const frontlineState=(s,u)=>!u?'removed':front(s)&&(s.battle.frontline.removed?.[key(u)]||u.instance&&u.hp<=0&&u.frontlineDefeat!=='remain')?'removed':u.hp>0?'alive':'down';
export const battleAlive=(s,u)=>Boolean(u)&&u.hp>0&&(!front(s)||frontlineState(s,u)==='alive');
export const frontlinePresent=(s,u)=>frontlineState(s,u)!=='removed';
export const frontlineTargetState=(s,u,profile)=>frontlinePresent(s,u)&&(profile.targetStates??['alive']).includes(frontlineState(s,u));
export function traceFrontline(engine,type,detail={}){
 const s=engine.state,b=s.battle;if(!front(s))return;
 const f=b.frontline,event={id:++f.eventSerial,round:b.round,type,...clone(detail),positions:clone(f.positions),hp:Object.fromEntries(units(s).map(u=>[key(u),u.hp])),rows:frontlineRows(s),removed:clone(f.removed??{}),states:Object.fromEntries(units(s).map(u=>[key(u),frontlineState(s,u)]))};
 f.events.push(event);if(f.events.length>512)f.events.shift();return event;
}
export function removeFrontline(engine,unit,reason='skill'){
 const s=engine.state;if(!front(s)||s.battle.frontline.removed?.[key(unit)])return false;
 (s.battle.frontline.removed??={})[key(unit)]=reason;
 traceFrontline(engine,'removed',{unit:key(unit),reason});
 s.battle.log.push(`${unit.name??engine.data.actors[unit.id].name}は戦闘から離脱した。`);return true;
}
export function syncFrontlineDefeats(engine){
 const s=engine.state;if(!front(s))return;
 for(const u of s.battle.enemies)if(u.hp<=0&&u.frontlineDefeat!=='remain')removeFrontline(engine,u,'defeated');
}
// Reserve every survivor destination first, then retain unaffected bodies.
// Only displaced bodies move, nearest lane (left on ties), then rearward rows.
export function displaceFrontlineDown(s,enemy,moves){
 const f=s.battle.frontline,bodies=units(s).filter(u=>Boolean(u.instance)===enemy&&frontlineState(s,u)==='down');
 const occupied=[...moves.map(m=>m.to),...units(s).filter(u=>Boolean(u.instance)===enemy&&battleAlive(s,u)&&!moves.some(m=>m.unit===key(u))).map(u=>position(s,u))],displaced=[];
 for(const u of bodies){const p=position(s,u);if(occupied.some(q=>same(p,q)))displaced.push(u);else occupied.push(p);}
 const result=[];
 for(const u of displaced){
  const from={...position(s,u)},lanes=[0,1,2,3,4].sort((a,b)=>Math.abs(a-from.lane)-Math.abs(b-from.lane)||a-b);
  let to;for(let depth=from.depth;depth<frontlineRows(s,enemy)&&!to;depth++)for(const lane of lanes)if(!occupied.some(q=>same({depth,lane},q))){to={depth,lane};break;}
  if(!to)throw Error('戦闘不能者の退避先がありません');
  f.positions[key(u)]=to;occupied.push(to);result.push({unit:key(u),from,to});
 }
 return result;
}
export function shrinkFrontline(engine){
 const s=engine.state;if(!front(s))return;
 const f=s.battle.frontline,alive=s.members.map(id=>s.actors[id]).filter(u=>battleAlive(s,u));if(!alive.length)return;
 const rows=1+Math.max(...alive.map(u=>position(s,u).depth)),before=frontlineRows(s);if(rows>=before)return;
 f.rows=rows;
 for(const id of s.members){const u=s.actors[id];if(frontlineState(s,u)==='down'&&position(s,u).depth>=rows)removeFrontline(engine,u,'shrink');}
 traceFrontline(engine,'shrink',{from:before,to:rows});s.battle.log.push(`味方の陣地が${rows}行になった。`);
}
export function knockbackFrontline(engine,unit,effect){
 const s=engine.state;if(!front(s)||!frontlinePresent(s,unit))return 0;
 const f=s.battle.frontline,enemy=Boolean(unit.instance),side=enemy?'enemies':'allies',moves=[];let collision=null,damage=0;
 for(let i=0;i<effect.distance;i++){
  const from={...position(s,unit)},to={...from,depth:from.depth+1};
  const blocker=units(s).find(u=>u!==unit&&Boolean(u.instance)===enemy&&frontlinePresent(s,u)&&same(position(s,u),to));
  const object=f.objects?.find(o=>o.side===side&&same(o,to));
  if(to.depth>=frontlineRows(s,enemy))collision={kind:'edge'};
  else if(blocker)collision={kind:'unit',unit:key(blocker)};
  else if(object)collision={kind:'object',object:object.id};
  if(collision){damage=Math.min(unit.hp,effect.collisionDamage);unit.hp-=damage;break;}
  f.positions[key(unit)]=to;moves.push({from,to});
 }
 syncFrontlineDefeats(engine);traceFrontline(engine,'knockback',{unit:key(unit),moves,collision,damage});
 s.battle.log.push(`${unit.name??engine.data.actors[unit.id].name}は${moves.length}段押された。${collision?`衝突して追加ダメージ${damage}。`:''}`);return damage;
}
export function frontlineObjectErrors(objects){
 if(objects===undefined)return [];
 return !Array.isArray(objects)||objects.length>30||new Set(objects.map(o=>o?.id)).size!==objects.length||new Set(objects.map(o=>`${o?.side}:${o?.depth},${o?.lane}`)).size!==objects.length||objects.some(o=>!isRecord(o)||Object.keys(o).some(k=>!['id','side','depth','lane'].includes(k))||typeof o.id!=='string'||!/^[a-z][a-z0-9_]*$/.test(o.id)||!['allies','enemies'].includes(o.side)||!Number.isInteger(o.depth)||o.depth<0||o.depth>2||!Number.isInteger(o.lane)||o.lane<0||o.lane>4)?['前中後衛の衝突オブジェクト不正']:[];
}
// Old Frontline saves had no body occupancy. Preserve live positions and queue,
// separate overlapping bodies deterministically; do not advance or shrink on load.
export function migrateFrontlineLifecycle(s){
 if(!front(s)||!isRecord(s.battle.frontline)||['rows','removed','objects'].some(k=>s.battle.frontline[k]!==undefined))return;
 const f=s.battle.frontline;f.rows=3;f.removed??={};f.objects??=[];
 if(!isRecord(f.positions)||units(s).some(u=>!isRecord(position(s,u))))return;
 for(const u of s.battle.enemies)if(u.hp<=0&&u.frontlineDefeat!=='remain')f.removed[key(u)]='defeated';
 for(const enemy of [false,true])displaceFrontlineDown(s,enemy,units(s).filter(u=>Boolean(u.instance)===enemy&&battleAlive(s,u)).map(u=>({to:position(s,u)})));
}
