import {isRecord} from './expression.js';
import {dungeonInterior} from './world.js';
export const PARTY_CELLS=[[2,0],[1,0],[2,2],[3,2],[2,1],[3,0],[1,1],[3,1],[1,2],[0,0],[4,0],[0,1],[4,1],[0,2],[4,2]].map(([x,y])=>({x,y}));
export const ENEMY_CELLS=[[2,2],[1,2],[3,2],[2,1],[1,1],[3,1],[2,0],[1,0],[3,0],[0,2],[4,2],[0,1],[4,1],[0,0],[4,0]].map(([x,y])=>({x,y}));
export const sameCell=(a,b)=>Boolean(a&&b&&a.x===b.x&&a.y===b.y);
export const validCell=(p,minY=0,maxY=2)=>isRecord(p)&&Object.keys(p).length===2&&Number.isInteger(p.x)&&p.x>=0&&p.x<5&&Number.isInteger(p.y)&&p.y>=minY&&p.y<=maxY;
export function nextFormation(members,previous={},replace){
  const next={};
  for(const id of members)if(previous[id])next[id]={...previous[id]};
  if(replace&&previous[replace.from])next[replace.to]={...previous[replace.from]};
  for(const id of members)if(!next[id]){const p=PARTY_CELLS.find(p=>!Object.values(next).some(q=>sameCell(p,q)));if(!p)return null;next[id]={...p};}
  return next;
}
export function formationErrors(state){
  const f=state.partyFormation;if(f===undefined)return [];
  if(!isRecord(f)||Object.keys(f).length!==state.members.length||state.members.some(id=>!Object.hasOwn(f,id))||Object.values(f).some(p=>!validCell(p))||new Set(Object.values(f).map(p=>`${p?.x},${p?.y}`)).size!==state.members.length)return ['戦闘陣形の人物・座標・重複不正'];
  return [];
}
export function formationPlan(data,state,actor,x,y){
  const fail=reason=>({ok:false,reason});
  if(state.mode!=='town'||dungeonInterior(data,state)||state.waiting||state.battle)return fail('戦闘陣形を変更できるのは町の通常滞在中だけです。');
  if(!state.members.includes(actor)||!validCell({x,y})||formationErrors(state).length)return fail('陣形の人物または配置先が不正です。');
  const positions=nextFormation(state.members,state.partyFormation),other=state.members.find(id=>id!==actor&&sameCell(positions[id],{x,y}));
  if(other)positions[other]=positions[actor];positions[actor]={x,y};
  return {ok:true,positions};
}
export function setFormation(engine,actor,x,y){const p=formationPlan(engine.data,engine.state,actor,x,y);if(!p.ok){engine.notify(p.reason);return false;}engine.state.partyFormation=p.positions;return true;}
