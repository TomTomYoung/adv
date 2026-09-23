import {evaluate,getPath,setPath} from './expression.js';

export const inspectionOrigin=s=>s.location?JSON.stringify(s.location):'';
export function inspectionSignature(value){
  const text=JSON.stringify(value);let a=2166136261,b=5381;
  for(let i=0;i<text.length;i++){a=Math.imul(a^text.charCodeAt(i),16777619);b=Math.imul(b,33)^text.charCodeAt(i);}
  return (a>>>0).toString(16).padStart(8,'0')+(b>>>0).toString(16).padStart(8,'0');
}
const presentationOps=['scene.background','scene.cast','scene.cast.clear','audio.bgm','audio.se','effect.play','screen.set','screen.clear'];
const freeOps=[...presentationOps,'say','narrate','set','add','flag.set','object.state.set','event.mark_done','map.reveal','facing.set','story.scene','map.teleport','town.return','item.give','quest.evidence','quest.accept','actor.heal','actor.restore_mp','party.join','party.leave','status.remove','light.refill','return'];
// A prior write can change a later branch. Prove that all such paths are free
// before skipping selection; authored choices already require a selection.
function mayConsumeAfterWrite(data,id){
  let budget=1000;const active=new Set();
  function scan(commands){
    for(const c of commands??[]){
      if(--budget<0)return true;
      if(c.op==='choice')continue;
      if(c.op==='if'){if(scan(c.then)||scan(c.else))return true;}
      else if(c.op==='switch'){if(c.cases.some(v=>scan(v.commands))||scan(c.default))return true;}
      else if(c.op==='call'||c.op==='jump'){if(active.has(c.script))return true;active.add(c.script);const cost=scan(data.scripts[c.script]?.commands);active.delete(c.script);if(cost)return true;}
      else if(!freeOps.includes(c.op)&&!(c.op==='gold.change'&&typeof c.amount==='number'&&c.amount>=0))return true;
    }
    return false;
  }
  active.add(id);return scan(data.scripts[id]?.commands);
}
// Read-only analysis of the currently reachable script branches. Never pump a
// second engine, spend resources, roll randomness or execute story commands.
export function inspectScript(engine,id,args={}){
  const object=engine.data.maps[args.map]?.objects?.find(o=>o.id===args.object);
  const seen=[object?engine.state.objects[`${args.map}/${args.object}`]??object.initialState:null],context={...engine.state,local:{args:structuredClone(args)}},active=new Set();let effect=false,consumes=false,writes=false,budget=1000;
  const shown=[],value=x=>evaluate(x,context);
  function walk(commands,selected=false){
    for(const c of commands??[]){
      if(--budget<0){effect=true;consumes||=!selected;return;}
      if(!selected&&!['if','switch','call','jump','return','say','narrate','choice',...presentationOps].includes(c.op)&&!c.target?.startsWith?.('local.'))writes=true;
      if(c.op==='if'){const yes=Boolean(value(c.condition));seen.push(yes);walk(yes?c.then:c.else,selected);}
      else if(c.op==='switch'){const v=value(c.value);seen.push(v);walk(c.cases.find(x=>x.equals===v)?.commands??c.default,selected);}
      else if(c.op==='say'||c.op==='narrate'){const text=[c.op,c.character,c.name,value(c.text)];seen.push(text);shown.push(text);}
      else if(c.op==='choice'){
        for(const o of c.options.filter(o=>o.visibleWhen===undefined||value(o.visibleWhen))){const enabled=o.condition===undefined||Boolean(value(o.condition));seen.push([o.id,o.text,enabled]);shown.push([o.id,o.text,enabled]);if(enabled){const local=structuredClone(context.local);walk(o.commands,true);context.local=local;}}
      }else if(c.op==='call'||c.op==='jump'){
        if(active.has(c.script)){effect=true;consumes||=!selected;continue;}
        active.add(c.script);const local=context.local;
        context.local=c.op==='jump'?structuredClone(local):{args:Object.fromEntries(Object.entries(c.args??{}).map(([k,v])=>[k,value(v)]))};
        walk(engine.data.scripts[c.script]?.commands,selected);context.local=local;active.delete(c.script);
        if(c.op==='jump')return;
      }else if(c.op==='return')return;
      else if(['set','add','flag.set'].includes(c.op)){
        const path=c.op==='flag.set'?`flags.${c.key}`:c.target,v=c.op==='add'?(getPath(context,path)??0)+value(c.value):value(c.value);
        if(path.startsWith('local.'))setPath(context,path,v);
        else if(JSON.stringify(getPath(context,path))!==JSON.stringify(v))effect=true;
      }else if(c.op==='object.state.set'){const old=engine.state.objects[`${c.map}/${c.object}`]??engine.data.maps[c.map]?.objects?.find(o=>o.id===c.object)?.initialState;if(old!==c.state)effect=true;}else if(c.op==='event.mark_done'){if(!engine.state.events[c.event])effect=true;}
      else if(!['scene.background','scene.cast','scene.cast.clear','audio.bgm','audio.se','effect.play','screen.set','screen.clear','map.reveal','facing.set','story.scene'].includes(c.op)){
        effect=true;
        // A script's own choice already supplies the required explicit selection.
        if(!selected&&!['map.teleport','town.return','item.give','quest.evidence','quest.accept','actor.heal','actor.restore_mp','party.join','party.leave','status.remove','light.refill'].includes(c.op)&&!(c.op==='gold.change'&&value(c.amount)>=0))consumes=true;
      }
    }
  }
  try{active.add(id);walk(engine.data.scripts[id]?.commands);}catch{effect=true;consumes=true;seen.push('dynamic');}
  if(writes&&!consumes)consumes=mayConsumeAfterWrite(engine.data,id);
  return {effect,consumes,information:inspectionSignature(shown),signature:inspectionSignature([id,seen])};
}
export function validateInspections(state,data){
  const values=state.inspections;
  const errors=!values||typeof values!=='object'||Array.isArray(values)||Object.entries(values).some(([id,v])=>!id.includes('/')||id.length>500||typeof v!=='string'||!/^[0-9a-f]{16}$/.test(v))?['調査済み情報の保存が不正です']:[];
  const a=state.inspectionActive;
  if(a!==null&&(!a||typeof a!=='object'||Array.isArray(a)||Object.keys(a).sort().join(',')!=='args,information,record,script'||typeof a.record!=='string'||a.record.length>500||!a.record.includes('/')||typeof a.information!=='string'||!/^[0-9a-f]{16}$/.test(a.information)||typeof a.script!=='string'||!Object.hasOwn(data.scripts,a.script)||!a.args||typeof a.args!=='object'||Array.isArray(a.args)||Object.keys(a.args).some(k=>!['map','object'].includes(k))||Object.values(a.args).some(v=>typeof v!=='string')||a.args.map&&!data.maps[a.args.map]?.objects?.some(o=>o.id===a.args.object)))errors.push('調査途中の保存が不正です');
  return errors;
}
export function finishInspection(engine){
  const s=engine.state,a=s.inspectionActive;if(!a||s.vm.length||s.battle)return;
  const now=inspectScript(engine,a.script,a.args);
  // Do not mark a newly unlocked description as read before it is displayed.
  if(now.information===a.information)s.inspections[a.record]=now.signature;
  s.inspectionActive=null;
}
