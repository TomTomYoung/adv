import {isRecord} from './expression.js';
import {scaledEnemy} from './enemy.js';
import {unitKey} from './buffs.js';
import {battleAlive,frontlinePresent,traceFrontline} from './frontline-lifecycle.js';
import {ENEMY_CELLS,validCell} from './battle-formation.js';

const integer=(n,a,b)=>Number.isInteger(n)&&n>=a&&n<=b;
const fields=['id','enemy','round','afterDefeat','whileAlive','position'];
// A finite, ordered schedule. Instances are appended, never recycled. A blocked
// join waits for the next round; it consumes neither randomness nor its slot.
export function reinforcementDefinitionErrors(data){
 const errors=[];
 for(const [id,e] of Object.entries(data.encounters??{})){
  if(e.reinforcements===undefined)continue;
  const rows=e.reinforcements,initial=e.enemies??[],validInitial=v=>typeof v==='string'&&/^enemy_(0|[1-9]\d*)$/.test(v)&&initial[Number(v.slice(6))]!==undefined;
  if(!Array.isArray(rows)||!rows.length||initial.length>5||initial.length+rows.length>15||new Set(rows.map(r=>r?.id)).size!==rows.length||rows.some(r=>!isRecord(r)||Object.keys(r).some(k=>!fields.includes(k))||typeof r.id!=='string'||!/^[a-z][a-z0-9_]*$/.test(r.id)||!Object.hasOwn(data.enemies,r.enemy)||!integer(r.round,2,1000)||r.afterDefeat!==undefined&&!validInitial(r.afterDefeat)||r.whileAlive!==undefined&&!validInitial(r.whileAlive)||r.afterDefeat!==undefined&&r.afterDefeat===r.whileAlive||r.position!==undefined&&!validCell(r.position)))errors.push(`${id}: 増援の定義不正`);
 }
 return errors;
}
export function reinforcementRoster(encounter,records,round=1e6){
 if(!encounter)return null;
 const defs=encounter.reinforcements;
 if(!defs)return records===undefined?[...encounter.enemies]:null;
 if(!Array.isArray(records)||records.length>defs.length)return null;
 let previous=1;
 for(let i=0;i<records.length;i++){
  const r=records[i],d=defs[i];
  if(!isRecord(r)||Object.keys(r).length!==2||r.id!==d.id||!integer(r.round,Math.max(d.round,previous),round))return null;
  previous=r.round;
 }
 return [...encounter.enemies,...records.map((_,i)=>defs[i].enemy)];
}
function freePosition(s,preferred){
 const b=s.battle,cells=[...(preferred?[preferred]:[]),...ENEMY_CELLS];
 if(b.mode==='grid')return cells.find(p=>!b.enemies.some(u=>battleAlive(s,u)&&b.grid.positions[unitKey(u)].x===p.x&&b.grid.positions[unitKey(u)].y===p.y));
 if(b.mode==='frontline')return cells.map(p=>({lane:p.x,depth:2-p.y})).find(p=>!b.enemies.some(u=>frontlinePresent(s,u)&&b.frontline.positions[unitKey(u)].lane===p.lane&&b.frontline.positions[unitKey(u)].depth===p.depth)&&!b.frontline.objects.some(o=>o.side==='enemies'&&o.lane===p.lane&&o.depth===p.depth));
 return {};
}
export function joinReinforcements(engine){
 const {state:s,data:d}=engine,b=s.battle,defs=d.encounters[b.encounter].reinforcements;
 if(!defs)return;
 const joined=[];
 while(b.reinforcements.length<defs.length){
  const row=defs[b.reinforcements.length],unit=id=>b.enemies.find(e=>e.instance===id);
  if(b.round<row.round||!b.enemies.some(e=>battleAlive(s,e))||b.enemies.filter(e=>battleAlive(s,e)).length>=5||row.afterDefeat&&unit(row.afterDefeat).hp>0||row.whileAlive&&!battleAlive(s,unit(row.whileAlive)))break;
  const p=freePosition(s,row.position);if(!p)break;
  const enemy=scaledEnemy(d.enemies[row.enemy],b.enemies.length,b.enemyScale??1);b.enemies.push(enemy);
  if(b.mode==='grid')b.grid.positions[unitKey(enemy)]={...p};
  if(b.mode==='frontline')b.frontline.positions[unitKey(enemy)]={...p};
  b.reinforcements.push({id:row.id,round:b.round});joined.push(unitKey(enemy));b.log.push(`${enemy.name}が増援として現れた。`);
 }
 // One snapshot after the whole batch: all joins in this round share its roster.
 if(joined.length)traceFrontline(engine,'reinforcements',{units:joined});
}
