import {unitKey} from './buffs.js';
import {isRecord} from './expression.js';
import {sameCell,validCell} from './battle-formation.js';
import {battleUnits,position,distance,gridCells,cellId} from './battle-grid.js';
export const WEAPON_RANGES={sword:[1,1],axe:[1,1],dagger:[1,1],fist:[1,1],gauntlet:[1,1],staff:[1,1],spear:[1,2],bow:[2,5]};
export function targetingProfile(data,source,skill,skillId){
  if(skill.targeting)return skill.targeting;
  let range=skill.target==='self'?[0,0]:skill.target==='ally'?[0,4]:skill.target.startsWith('all_')?[0,5]:[1,5];
  if(skillId==='attack')range=source.instance?[1,1]:(data.game.battle?.weaponRanges??WEAPON_RANGES)[data.items[source.equipment?.weapon]?.equipmentType]??[1,1];
  return {aim:'unit',range:{min:range[0],max:range[1]},area:{shape:skill.target.startsWith('all_')?'side_all':'single'},trajectory:skillId==='attack'?'direct':'indirect',friendlyFire:false};
}
// Supercover: an exact corner crossing touches both orthogonal cells. Endpoints
// are omitted, so the caster and impact unit never block their own trajectory.
export function rayCells(from,to){
  const out=[],dx=to.x-from.x,dy=to.y-from.y,nx=Math.abs(dx),ny=Math.abs(dy),sx=Math.sign(dx),sy=Math.sign(dy);let x=from.x,y=from.y,ix=0,iy=0;
  const add=(x,y)=>{const p={x,y};if(!sameCell(p,from)&&!sameCell(p,to)&&!out.some(q=>sameCell(q,p)))out.push(p);};
  while(ix<nx||iy<ny){const a=(1+2*ix)*ny,b=(1+2*iy)*nx;if(a===b){add(x+sx,y);add(x,y+sy);x+=sx;y+=sy;ix++;iy++;}else if(a<b){x+=sx;ix++;}else{y+=sy;iy++;}add(x,y);}
  return out;
}
export function areaCells(from,aim,area){
  const dx=Math.sign(aim.x-from.x),dy=Math.sign(aim.y-from.y),r=area.radius??1,length=area.length??3,width=area.width??1;
  return gridCells().filter(p=>{
    const ax=p.x-aim.x,ay=p.y-aim.y;
    switch(area.shape){
      case 'single':return sameCell(p,aim);
      case 'cross':return (ax===0||ay===0)&&Math.abs(ax)+Math.abs(ay)<=r;
      case 'radius':return distance(p,aim)<=r;
      case 'rectangle':return ax>=-Math.floor(width/2)&&ax<Math.ceil(width/2)&&ay>=-Math.floor((area.height??1)/2)&&ay<Math.ceil((area.height??1)/2);
      case 'row':return p.y===aim.y;
      case 'column':return p.x===aim.x;
      case 'side_all':return true;
      case 'line':case 'cone':{
        if(!dx&&!dy)return sameCell(p,aim);
        const forward=(ax*dx+ay*dy)/(dx*dx+dy*dy),lateral=Math.abs(ax*dy-ay*dx);
        return forward>=0&&forward<length&&lateral<=(area.shape==='cone'?Math.floor(forward)+(width-1)/2:(width-1)/2);
      }
      default:return false;
    }
  });
}
export function gridTargetPlan(engine,source,skill,skillId,selection,{limit=skill.maxTargets??1,anySide=false,origin=null}={}){
  const s=engine.state,profile=targetingProfile(engine.data,source,skill,skillId),from=origin??position(s,source),units=battleUnits(s),fail=reason=>({ok:false,reason,profile});
  if(!from||!source||source.hp<=0)return fail('行動者の位置がありません。');
  let aim,selected;
  if(isRecord(selection)){if(profile.aim!=='cell')return fail('ユニットを選んでください。');aim=selection;}
  else if(typeof selection==='string'&&/^cell:[0-4],[0-5]$/.test(selection)){if(profile.aim!=='cell')return fail('ユニットを選んでください。');const [x,y]=selection.slice(5).split(',').map(Number);aim={x,y};}
  else{selected=units.find(u=>unitKey(u)===selection||(u.instance??u.id)===selection);aim=selected?position(s,selected):null;}
  if(skill.target==='self'){selected=source;aim=from;}
  if(profile.area.shape==='side_all'&&!aim)aim=from;
  if(!validCell(aim,0,5))return fail('対象または着弾地点を選んでください。');
  const d=distance(from,aim);
  if(d<profile.range.min||d>profile.range.max)return fail(`射程外です（距離${d}／射程${profile.range.min}–${profile.range.max}）。`);
  const same=u=>Boolean(u.instance)===Boolean(source.instance),allowed=u=>skill.target==='self'?u===source:anySide||profile.friendlyFire||(['ally','all_allies'].includes(skill.target)?same(u):!same(u));
  if(profile.aim==='unit'&&profile.area.shape!=='side_all'&&(!selected||selected.hp<=0||!allowed(selected)))return fail('生存する合法な対象を選んでください。');
  if(profile.trajectory==='direct'&&rayCells(from,aim).some(p=>units.some(u=>u!==source&&u.hp>0&&sameCell(position(s,u),p))))return fail('途中のユニットに遮られています。');
  const cells=areaCells(from,aim,profile.area);let targets=units.filter(u=>u.hp>0&&allowed(u)&&cells.some(p=>sameCell(position(s,u),p)));
  if(profile.area.shape==='side_all'&&anySide&&selected)targets=targets.filter(u=>Boolean(u.instance)===Boolean(selected.instance));
  if(skill.effects.some(e=>e.type==='cover'))targets=targets.filter(u=>u!==source&&!u.instance&&distance(from,position(s,u))<=1);
  if(skill.effects.some(e=>e.type==='analyze'))targets=targets.filter(u=>u.instance);
  if(skill.requiresAnalyzed)targets=targets.filter(u=>u.instance&&s.battle.analyzed.includes(u.instance));
  if(skill.selection==='lowest_hp_ratio')targets.sort((a,b)=>a.hp/(a.instance?a.stats.hp:engine.stats(a.id).hp)-b.hp/(b.instance?b.stats.hp:engine.stats(b.id).hp));
  targets=targets.slice(0,profile.maxAffected??limit);
  if(!targets.length&&!profile.allowEmpty)return fail('範囲内に有効な対象がいません。');
  return {ok:true,skill,targets,aim:{...aim},cells,profile};
}
export function gridSelections(engine,source,skill,skillId,options){
  const profile=targetingProfile(engine.data,source,skill,skillId);
  const ids=profile.aim==='cell'?gridCells().map(cellId):profile.area.shape==='side_all'&&!options?.anySide?[unitKey(source)]:battleUnits(engine.state).map(unitKey);
  return ids.map(id=>({id,...gridTargetPlan(engine,source,skill,skillId,id,options)}));
}
export function targetingErrors(t){
  if(t===undefined)return [];
  const integer=(n,min,max)=>Number.isInteger(n)&&n>=min&&n<=max;
  if(!isRecord(t)||Object.keys(t).some(k=>!['aim','range','area','trajectory','friendlyFire','maxAffected','allowEmpty'].includes(k))||!['unit','cell'].includes(t.aim)||!isRecord(t.range)||Object.keys(t.range).some(k=>!['min','max'].includes(k))||!integer(t.range.min,0,5)||!integer(t.range.max,t.range.min,5)||!isRecord(t.area)||!['single','cross','radius','rectangle','line','cone','row','column','side_all'].includes(t.area.shape)||Object.keys(t.area).some(k=>!['shape','radius','width','height','length'].includes(k))||!['direct','piercing','lob','indirect'].includes(t.trajectory)||typeof t.friendlyFire!=='boolean'||t.maxAffected!==undefined&&!integer(t.maxAffected,1,30)||t.allowEmpty!==undefined&&typeof t.allowEmpty!=='boolean')return ['Grid射程・範囲定義不正'];
  if(['radius','width','height','length'].some(k=>t.area[k]!==undefined&&!integer(t.area[k],k==='radius'?0:1,6)))return ['Grid範囲寸法不正'];
  return [];
}
