import {closeTo,integer,identifier} from './common.js';
import {exact,pointsValid,patchValid,patchTile,patchCell,action,markers,panel,sameCell} from './environment.js';
const current=ctx=>ctx.spec.states.find(s=>s.id===ctx.persistent.phase);
function plan(ctx,intent){
  if(intent.action==='wait'&&ctx.spec.mode==='random')return {ok:true};
  const control=ctx.spec.controls.find(c=>c.id===intent.target),phase=ctx.spec.states.find(s=>s.id===intent.phase);
  if(ctx.spec.mode!=='manual'||intent.action!=='shift'||!control||!closeTo(ctx.state,control)||!phase)return {ok:false,reason:'天球儀の前で地形を選んでください。'};
  if(ctx.persistent.phase===phase.id)return {ok:false,reason:'現在の地形です。'};
  if(phase.tiles.some(p=>p.tile==='#'&&sameCell(p,ctx.state.location)))return {ok:false,reason:'足元が失われます。安全な足場へ移動してください。'};
  return {ok:true,phase};
}
function shift(ctx,phase){
  ctx.persistent.phase=phase.id;ctx.run.changes++;
  const loc=ctx.state.location;
  if(!ctx.engine.walkable(ctx.data.maps[loc.map],loc.x,loc.y)){
    const safe=ctx.spec.refuges.find(p=>p.map===loc.map);loc.x=safe.x;loc.y=safe.y;
    ctx.engine.notify(`足場が動き、${safe.name}へ退避しました。`);
  }
  ctx.engine.reveal();ctx.engine.eventCue('stairs');ctx.engine.notify(`${ctx.spec.title}：${phase.name}へ変化しました。`);
}
function tick(ctx){
  if(ctx.spec.mode!=='random')return;
  if(ctx.run.remaining===0)ctx.run.remaining=ctx.spec.interval.min+Math.floor(ctx.engine.random()*(ctx.spec.interval.max-ctx.spec.interval.min+1));
  ctx.run.remaining--;
  if(ctx.run.remaining===0){
    const candidates=ctx.spec.states.filter(s=>s.id!==ctx.persistent.phase);
    shift(ctx,candidates[Math.floor(ctx.engine.random()*candidates.length)]);
    ctx.run.remaining=ctx.spec.interval.min+Math.floor(ctx.engine.random()*(ctx.spec.interval.max-ctx.spec.interval.min+1));
  }
}
export const terrainShift={createPersistent:s=>({phase:s.initial}),createRun:()=>({remaining:0,changes:0}),step:tick,plan,
  act(ctx,intent,p){if(p.phase)shift(ctx,p.phase);else tick(ctx);},
  tile:(ctx,map,x,y)=>patchTile(current(ctx)?.tiles??[],map,x,y),
  cell:(ctx,map,x,y)=>patchCell(current(ctx)?.tiles??[],map,x,y),
  project(ctx){return panel(ctx,ctx.spec.title,`${current(ctx).name}。${ctx.spec.mode==='manual'?'天球儀で変化のタイミングを選べます。':'巨獣の動きにより、予告なく道が変わります。'}`,ctx.spec.controls.filter(p=>closeTo(ctx.state,p)).map(p=>({name:p.name,text:'地形と通路の接続を切り替えます。',actions:ctx.spec.states.map(s=>action(ctx,plan,s.name,{action:'shift',target:p.id,phase:s.id}))})),{actions:ctx.spec.mode==='random'?[action(ctx,plan,'様子を見る',{action:'wait'})]:[],markers:markers(ctx,ctx.spec.controls,'儀')});},
  validate(data,d,s){
    const errors=[];
    if(!['manual','random'].includes(s.mode)||!s.title||!Array.isArray(s.states)||s.states.length<2||new Set(s.states.map(p=>p?.id)).size!==s.states.length||s.states.some(p=>!identifier(p?.id)||!p.name||!patchValid(data,d,p.tiles))||!s.states.some(p=>p.id===s.initial))return ['地形パターンが不正です'];
    const keys=p=>p.tiles.map(c=>`${c.map}/${c.x},${c.y}`).sort().join('|');if(s.states.some(p=>keys(p)!==keys(s.states[0])))errors.push('地形パターンの対象セルを揃えてください');
    if(!Array.isArray(s.controls)||s.mode==='manual'&&!pointsValid(data,d,s.controls)||s.mode==='random'&&s.controls.length)errors.push('操作点が不正です');
    if(!pointsValid(data,d,s.refuges)||d.maps.some(map=>!s.refuges.some(p=>p.map===map))||[...s.refuges,...s.controls].some(p=>s.states.some(v=>v.tiles.some(t=>sameCell(p,t)&&t.tile==='#'))))errors.push('全地形で安全な操作点・退避点が必要です');
    if(s.mode==='random'&&(!integer(s.interval?.min,1,1000)||!integer(s.interval?.max,s.interval.min,1000)))errors.push('自動変化の間隔が不正です');
    return errors;
  },
  validateState:(s,p,r)=>!exact(p,['phase'])||!s.states.some(v=>v.id===p.phase)||r&&(!exact(r,['remaining','changes'])||!integer(r.remaining,0,s.mode==='random'?s.interval.max:0)||!integer(r.changes,0,1e9))?['地形変化の保存が不正です']:[]
};
