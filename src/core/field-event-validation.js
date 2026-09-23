import {FIELD_SIGNALS,FIELD_REPEATS,fieldReactionKey} from './field-signals.js';
import {isRecord} from './expression.js';
const identifier=s=>typeof s==='string'&&/^[a-z][a-z0-9_]*$/.test(s)&&!['constructor','prototype','__proto__'].includes(s);
export function validateConditionalFieldEvents(data,expression){
  const errors=[],bad=(d,message)=>errors.push(`fieldEvents.${d}: ${message}`);
  for(const d of Object.values(data.dungeons??{})){
    if(d.fieldEvents===undefined)continue;
    if(!Array.isArray(d.fieldEvents)){bad(d.id,'イベント一覧は配列です');continue;}
    const ids=new Set();
    for(const e of d.fieldEvents){
      if(!isRecord(e)||!identifier(e.id)||ids.has(e.id)){bad(d.id,'イベントIDが不正または重複');continue;}
      ids.add(e.id);const at=fieldReactionKey(d.id,e.id);
      if(typeof e.title!=='string'||!e.title||!Array.isArray(e.watch)||!e.watch.length||new Set(e.watch).size!==e.watch.length||e.watch.some(s=>!FIELD_SIGNALS.includes(s))||!FIELD_REPEATS.includes(e.repeat)||e.condition===undefined)bad(at,'表題・購読・再発・条件が不正');
      else expression(e.condition,at);
      if(e.message!==undefined&&typeof e.message!=='string')bad(at,'通知は文字列です');
      if(e.points!==undefined&&(!Array.isArray(e.points)||e.points.some(p=>!isRecord(p)||!d.maps.includes(p.map)||!Number.isInteger(p.x)||!Number.isInteger(p.y)||p.x<0||p.y<0||data.maps[p.map]?.tiles[p.y]?.[p.x]===undefined||!Number.isInteger(p.z??0))))bad(at,'地点は所属マップ内の座標です');
      const a=e.action;
      if(!isRecord(a)||!(a.type==='battle'&&Object.keys(a).sort().join()==='encounter,type'&&data.encounters[a.encounter]||a.type==='script'&&Object.keys(a).sort().join()==='script,type'&&data.scripts[a.script]))bad(at,'成立時の戦闘またはスクリプト参照が不正');
    }
  }
  return errors;
}
