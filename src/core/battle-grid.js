import {frontlineStart} from './battle-frontline.js';
import {unitKey} from './buffs.js';
import {isRecord} from './expression.js';
import {PARTY_CELLS,ENEMY_CELLS,nextFormation,sameCell,validCell,formationErrors} from './battle-formation.js';
export const isGrid=state=>state.battle?.mode==='grid';
export const distance=(a,b)=>Math.max(Math.abs(a.x-b.x),Math.abs(a.y-b.y));
export const battleUnits=state=>[...state.members.map(id=>state.actors[id]),...state.battle.enemies];
export const position=(state,unit)=>state.battle?.grid?.positions[typeof unit==='string'?unit:unitKey(unit)];
export const gridCells=()=>Array.from({length:30},(_,i)=>({x:i%5,y:Math.floor(i/5)}));
export const cellId=p=>`cell:${p.x},${p.y}`;
export function gridStart(data,state,encounter,options={}){
  const mode=options.battleMode??encounter.battleMode??(state.battleModePreference==='auto'?undefined:state.battleModePreference)??data.game.battle?.defaultMode??'classic';
  if(!['classic','grid','frontline'].includes(mode))throw Error('戦闘モード不正');
  if(mode==='classic')return {mode};
  if(mode==='frontline')return frontlineStart(state,encounter,data);
  const movement=options.movement??encounter.movement??'step';
  if(!['step','fixed'].includes(movement)||formationErrors(state).length)throw Error('Grid陣形・移動設定不正');
  const enemies=encounter.enemyPositions??ENEMY_CELLS.slice(0,encounter.enemies.length);
  if(encounter.enemies.length>15||enemies.length!==encounter.enemies.length||enemies.some(p=>!validCell(p))||new Set(enemies.map(p=>`${p.x},${p.y}`)).size!==enemies.length)throw Error('敵出現配置不正');
  const formation=nextFormation(state.members,state.partyFormation);if(!formation)throw Error('味方出現配置不正');
  return {mode,grid:{movement,positions:Object.fromEntries([...state.members.map(id=>['actor:'+id,{x:formation[id].x,y:formation[id].y+3}]),...enemies.map((p,i)=>['enemy:enemy_'+i,{...p}])])}};
}
export function gridMovePlan(state,unit,to){
  const fail=reason=>({ok:false,reason});
  if(!isGrid(state)||state.battle.grid.movement!=='step')return fail('この戦闘では移動できません。');
  if(!unit||unit.hp<=0||!validCell(to,unit.instance?0:3,unit.instance?2:5))return fail('自陣内のセルを選んでください。');
  if(distance(position(state,unit),to)!==1)return fail('移動できるのは隣接する1マスです。');
  if(battleUnits(state).some(u=>u.hp>0&&sameCell(position(state,u),to)))return fail('そのセルには生存するユニットがいます。');
  return {ok:true,to:{...to}};
}
export function revivePosition(state,unit){
  if(!isGrid(state))return null;
  const occupied=battleUnits(state).filter(u=>u!==unit&&u.hp>0).map(u=>position(state,u)),old=position(state,unit);
  return !occupied.some(p=>sameCell(p,old))?{...old}:(unit.instance?ENEMY_CELLS:PARTY_CELLS.map(p=>({x:p.x,y:p.y+3}))).find(p=>!occupied.some(q=>sameCell(p,q)))??false;
}
export function gridSaveErrors(state){
  const errors=formationErrors(state),b=state.battle;
  if(state.battleModePreference!==undefined&&!['auto','classic','grid','frontline'].includes(state.battleModePreference))errors.push('戦闘モード希望値不正');
  if(!b)return errors;
  if(b.mode!==undefined&&!['classic','grid','frontline'].includes(b.mode))errors.push('戦闘モード不正');
  if(!isGrid(state)){if(b.grid!==undefined)errors.push('Classic戦闘にGrid構造があります');return errors;}
  const g=b.grid;
  if(!isRecord(g)||Object.keys(g).some(k=>!['movement','positions'].includes(k))||!['step','fixed'].includes(g.movement)||!isRecord(g.positions)||!Array.isArray(b.enemies)){errors.push('Grid構造不正');return errors;}
  const units=battleUnits(state);if(Object.keys(g.positions).length!==units.length||units.some(u=>!u||!validCell(g.positions[unitKey(u)],u.instance?0:3,u.instance?2:5))){errors.push('戦闘位置の個体・座標不正');return errors;}
  const alive=units.filter(u=>u.hp>0).map(u=>g.positions[unitKey(u)]);if(new Set(alive.map(p=>`${p.x},${p.y}`)).size!==alive.length)errors.push('戦闘位置の占有重複');
  return errors;
}
export function gridDefinitionErrors(data){
  const errors=[],mode=v=>v===undefined||['classic','grid','frontline'].includes(v),movement=v=>v===undefined||['fixed','step'].includes(v);
  if(!mode(data.game?.battle?.defaultMode)||data.game?.battle!==undefined&&(!isRecord(data.game.battle)||Object.keys(data.game.battle).some(k=>!['defaultMode','weaponRanges','frontlineWeaponRanges'].includes(k))))errors.push('既定戦闘モード不正');
  const ranges=data.game?.battle?.weaponRanges;
  if(ranges!==undefined&&(!isRecord(ranges)||Object.entries(ranges).some(([type,r])=>!data.jobProfile?.equipmentTypes.weapon.includes(type)||!Array.isArray(r)||r.length!==2||r.some(n=>!Number.isInteger(n)||n<0||n>5)||r[0]>r[1])))errors.push('武器射程定義不正');
  for(const [id,e] of Object.entries(data.encounters??{})){
    if(!mode(e.battleMode)||!movement(e.movement))errors.push(`${id}: 戦闘モード・移動不正`);
    if(e.battleMode==='grid'&&e.enemies?.length>15)errors.push(`${id}: Grid敵数超過`);
    const p=e.enemyPositions;if(p!==undefined&&(!Array.isArray(p)||p.length!==e.enemies?.length||p.length>15||p.some(p=>!validCell(p))||new Set(p.map(p=>`${p.x},${p.y}`)).size!==p.length))errors.push(`${id}: 敵配置不正`);
  }
  const presentation=data.presentation?.battleGrid;
  if(presentation!==undefined){const p=presentation?.enemyPresentation;
    if(!isRecord(presentation)||Object.keys(presentation).some(k=>k!=='enemyPresentation')||!isRecord(p)||Object.keys(p).some(k=>!['anchor','rowScale','maxOverlapRatio','depthSort','sprites'].includes(k))||p.anchor!=='bottom-center'||p.depthSort!=='back-to-front'||!Array.isArray(p.rowScale)||p.rowScale.length!==3||p.rowScale.some(v=>!Number.isFinite(v)||v<=0||v>2)||!Number.isFinite(p.maxOverlapRatio)||p.maxOverlapRatio<0||p.maxOverlapRatio>.5)errors.push('Grid敵描画定義不正');
    if(p?.sprites!==undefined&&(!isRecord(p.sprites)||Object.values(p.sprites).some(v=>!isRecord(v)||Object.keys(v).some(k=>!['spriteScale','offsetX','offsetY'].includes(k))||v.spriteScale!==undefined&&(!Number.isFinite(v.spriteScale)||v.spriteScale<=0||v.spriteScale>4)||['offsetX','offsetY'].some(k=>v[k]!==undefined&&(!Number.isFinite(v[k])||Math.abs(v[k])>25)))))errors.push('Grid敵描画補正不正');
  }
  return errors;
}
