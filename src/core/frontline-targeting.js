import {battleAlive,frontlineRows,frontlineTargetState} from './frontline-lifecycle.js';
import {unitKey} from './buffs.js';
import {isRecord} from './expression.js';
import {frontlineUnits,frontPosition,validFrontPosition} from './battle-frontline.js';
export const FRONTLINE_SHAPES=['single','cross4','around8','row','column','side_all'];
export const FRONTLINE_ORDERS=['front_to_back','back_to_front','left_to_right','right_to_left'];
export function frontlineProfile(data,source,skill,id){
 if(skill.frontlineTargeting)return skill.frontlineTargeting;
 const r=id==='attack'?(data.game.battle?.frontlineWeaponRanges?.[data.items[source.equipment?.weapon]?.equipmentType]??[1,1]):skill.target==='self'?[0,0]:skill.target.includes('all')?[0,5]:skill.target==='ally'?[0,2]:[1,5];
 return {aim:'unit',range:{min:r[0],max:r[1]},allyRange:{min:0,max:2},area:{shape:skill.target.startsWith('all_')?'side_all':'single'},friendlyFire:false,resolution:'simultaneous',order:'front_to_back',reevaluate:'alive',damageSeries:{mode:'constant',basis:'power',start:1,step:0}};
}
// A dedicated six-rank coordinate is used only for area adjacency, never range.
export const areaPoint=(p,enemy)=>({x:p.lane,y:enemy?2-p.depth:3+p.depth});
export const requiredFrontlineRange=(a,b,sameSide=false)=>sameSide?Math.abs(a.depth-b.depth):1+a.depth+b.depth;
export function frontlineAreaCells(aim,shape){
 return Array.from({length:30},(_,i)=>({x:i%5,y:Math.floor(i/5)})).filter(p=>{
  const x=Math.abs(p.x-aim.x),y=Math.abs(p.y-aim.y);
  return shape==='single'?x+y===0:shape==='cross4'?x+y<=1:shape==='around8'?Math.max(x,y)<=1:shape==='row'?y===0:shape==='column'?x===0:shape==='side_all';
 });
}
export function orderFrontlineTargets(s,units,order='front_to_back'){
 return units.slice().sort((a,b)=>{const p=frontPosition(s,a),q=frontPosition(s,b);return (order==='left_to_right'?p.lane-q.lane||p.depth-q.depth:order==='right_to_left'?q.lane-p.lane||p.depth-q.depth:order==='back_to_front'?q.depth-p.depth||p.lane-q.lane:p.depth-q.depth||p.lane-q.lane)||Number(Boolean(a.instance))-Number(Boolean(b.instance))||unitKey(a).localeCompare(unitKey(b));});
}
export function frontlineTargetPlan(engine,source,skill,id,selection,{limit=skill.maxTargets??1,anySide=false,origin=null}={}){
 const s=engine.state,profile=frontlineProfile(engine.data,source,skill,id),units=frontlineUnits(s),from=origin??frontPosition(s,source),fail=(reason,extra={})=>({ok:false,reason,profile,...extra});
 if(!battleAlive(s,source)||!from)return fail('行動者がいません。');
 let selected=units.find(u=>[unitKey(u),u.instance??u.id].includes(selection)),aim,enemy;
 if(skill.target==='self')selected=source;
 if(selected){aim=frontPosition(s,selected);enemy=Boolean(selected.instance);}
 else if(profile.aim==='cell'&&typeof selection==='string'&&/^front:(allies|enemies):[0-2],[0-4]$/.test(selection)){const [_,side,p]=selection.split(':'),[depth,lane]=p.split(',').map(Number);aim={depth,lane};enemy=side==='enemies';}
 if(profile.area.shape==='side_all'&&!aim){selected=units.find(u=>frontlineTargetState(s,u,profile)&&(Boolean(u.instance)===Boolean(source.instance))===['ally','all_allies'].includes(skill.target));aim=selected?frontPosition(s,selected):from;enemy=Boolean(selected?.instance);}
 if(!validFrontPosition(aim)||aim.depth>=frontlineRows(s,enemy))return fail('対象を選んでください。');
 const same=u=>Boolean(u.instance)===Boolean(source.instance),allowed=u=>skill.target==='self'?u===source:anySide||profile.friendlyFire||(['ally','all_allies'].includes(skill.target)?same(u):!same(u));
 const point=areaPoint(aim,enemy),cells=frontlineAreaCells(point,profile.area.shape);
 let targets=units.filter(u=>frontlineTargetState(s,u,profile)&&allowed(u)&&cells.some(p=>{const q=areaPoint(frontPosition(s,u),Boolean(u.instance));return p.x===q.x&&p.y===q.y;}));
 if(profile.area.shape==='side_all')targets=targets.filter(u=>Boolean(u.instance)===enemy);
 if(skill.effects.some(e=>e.type==='cover'))targets=targets.filter(u=>u!==source&&!u.instance&&Math.abs(frontPosition(s,u).depth-from.depth)+Math.abs(frontPosition(s,u).lane-from.lane)<=1);
 if(skill.effects.some(e=>e.type==='purge_undead'))targets=targets.filter(u=>u.hp>0||u.instance&&engine.data.enemies[u.id]?.undead);
 if(skill.effects.some(e=>e.type==='analyze'))targets=targets.filter(u=>u.instance);
 if(skill.requiresAnalyzed)targets=targets.filter(u=>u.instance&&s.battle.analyzed.includes(u.instance));
 targets=orderFrontlineTargets(s,targets,profile.order);
 if(skill.selection==='lowest_hp_ratio')targets.sort((a,b)=>a.hp/(a.instance?a.stats.hp:engine.stats(a.id).hp)-b.hp/(b.instance?b.stats.hp:engine.stats(b.id).hp));
 targets=targets.slice(0,profile.maxAffected??limit);
 const sameSide=enemy===Boolean(source.instance),range=sameSide?(profile.allyRange??{min:0,max:2}):profile.range,d=skill.target==='self'?0:requiredFrontlineRange(from,aim,sameSide),details={skill,targets,aim:{...aim,side:enemy?'enemies':'allies'},cells,profile,requiredRange:d,range};
 if(d<range.min||d>range.max)return fail(`射程外です（必要レンジ${d}／レンジ${range.min}–${range.max}）。`,details);
 if(profile.aim==='unit'&&(!selected||!frontlineTargetState(s,selected,profile)||!allowed(selected)))return fail('技能の対象状態に合う相手を選んでください。',details);
 if(!targets.length)return fail('範囲内に有効な対象がいません。',details);
 return {ok:true,...details};
}
export function frontlineSelections(engine,source,skill,id,options={}){
 const p=frontlineProfile(engine.data,source,skill,id),units=frontlineUnits(engine.state).filter(u=>frontlineTargetState(engine.state,u,p)&&(options.anySide||p.friendlyFire||(Boolean(u.instance)===Boolean(source.instance))===['ally','all_allies'].includes(skill.target)));
 const ids=skill.target==='self'?[unitKey(source)]:p.aim==='cell'?['enemies','allies'].flatMap(side=>Array.from({length:frontlineRows(engine.state,side==='enemies')*5},(_,i)=>`front:${side}:${Math.floor(i/5)},${i%5}`)):units.map(unitKey);
 return ids.map(id2=>({id:id2,...frontlineTargetPlan(engine,source,skill,id,id2,options)}));
}
export function frontlineTargetingErrors(t){
 if(t===undefined)return [];
 const num=(v,a,b)=>Number.isFinite(v)&&v>=a&&v<=b,range=r=>isRecord(r)&&Object.keys(r).every(k=>['min','max'].includes(k))&&Number.isInteger(r.min)&&Number.isInteger(r.max)&&num(r.min,0,5)&&num(r.max,r.min,5);
 if(!isRecord(t)||Object.keys(t).some(k=>!['aim','range','allyRange','area','friendlyFire','maxAffected','resolution','order','reevaluate','damageSeries','targetStates'].includes(k))||!['unit','cell'].includes(t.aim)||!range(t.range)||!range(t.allyRange)||!isRecord(t.area)||Object.keys(t.area).length!==1||!FRONTLINE_SHAPES.includes(t.area.shape)||typeof t.friendlyFire!=='boolean'||!['simultaneous','sequential'].includes(t.resolution)||!FRONTLINE_ORDERS.includes(t.order)||!['alive','position'].includes(t.reevaluate)||t.maxAffected!==undefined&&(!Number.isInteger(t.maxAffected)||!num(t.maxAffected,1,30)))return ['前中後衛の対象定義不正'];
 if(t.targetStates!==undefined&&(!Array.isArray(t.targetStates)||!t.targetStates.length||new Set(t.targetStates).size!==t.targetStates.length||t.targetStates.some(v=>!['alive','down'].includes(v))))return ['前中後衛の対象状態不正'];
 const d=t.damageSeries;if(!isRecord(d)||Object.keys(d).some(k=>!['mode','basis','start','step'].includes(k))||!['constant','decrease','increase'].includes(d.mode)||!['power','final'].includes(d.basis)||!num(d.start,0,10)||!num(d.step,0,10))return ['前中後衛のダメージ配分不正'];return [];
}
export const seriesFactor=(series,index)=>Math.max(0,series.start+(series.mode==='decrease'?-1:series.mode==='increase'?1:0)*series.step*index);
