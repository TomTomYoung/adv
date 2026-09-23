import {integer,closeTo} from './common.js';
import {exact,idList,pointsValid,floorValid,patchValid,patchTile,patchCell,materialsValid,inventoryPlan,action,markers,panel,sameCell} from './environment.js';
const connected=(ctx,d)=>!ctx.persistent.disconnected.includes(d.id);
const powered=(ctx,d)=>connected(ctx,d)&&ctx.persistent.circuits.includes(d.circuit);
const load=(ctx,circuits=ctx.persistent.circuits)=>ctx.spec.devices.filter(d=>connected(ctx,d)&&circuits.includes(d.circuit)).reduce((n,d)=>n+d.power,0);
const standingOn=(ctx,device)=>device.kind==='door'&&device.tiles.some(p=>sameCell(p,ctx.state.location));
function plan(ctx,intent){
  if(intent.action==='toggle'){
    const control=ctx.spec.controls.find(c=>c.id===intent.target);
    if(!control||!closeTo(ctx.state,control))return {ok:false,reason:'配電盤の前で系統を切り替えてください。'};
    const circuits=ctx.persistent.circuits.includes(control.id)?ctx.persistent.circuits.filter(id=>id!==control.id):[...ctx.persistent.circuits,control.id];
    if(!circuits.includes(control.id)&&ctx.spec.devices.some(d=>d.circuit===control.id&&powered(ctx,d)&&standingOn(ctx,d)))return {ok:false,reason:'動力扉の通路から降りてください。'};
    if(load(ctx,circuits)>ctx.spec.capacity)return {ok:false,reason:`動力が不足しています（必要 ${load(ctx,circuits)}／容量 ${ctx.spec.capacity}）。別系統を切るか不要な部品を外してください。`};
    return {ok:true,control,circuits};
  }
  const device=ctx.spec.devices.find(d=>d.id===intent.target);
  if(!device||!closeTo(ctx.state,device))return {ok:false,reason:'装置の前で操作してください。'};
  if(intent.action==='disconnect'&&connected(ctx,device)){if(powered(ctx,device)&&standingOn(ctx,device))return {ok:false,reason:'動力扉の通路から降りてください。'};return {...inventoryPlan(ctx,{},device.salvage),device};}
  if(intent.action==='reconnect'&&!connected(ctx,device)){
    if(ctx.persistent.circuits.includes(device.circuit)&&load(ctx)+device.power>ctx.spec.capacity)return {ok:false,reason:'先に系統の動力を切ってください。'};
    return {...inventoryPlan(ctx,device.salvage),device};
  }
  if(!powered(ctx,device))return {ok:false,reason:'装置へ動力を配分してください。'};
  if(intent.action==='repair'&&device.kind==='repair'&&ctx.run.repairs<ctx.spec.repairsPerRun)return {ok:true,device};
  if(intent.action==='ride'&&device.kind==='elevator')return {ok:true,device};
  return {ok:false,reason:'この装置ではその操作ができません。修復装置の使用回数も確認してください。'};
}
function fight(ctx,device){ctx.run.fighting=device.id;ctx.engine.startBattle(ctx.spec.guardEncounter,{win:[],escape:[],lose:[]});}
export const powerGrid={createPersistent:()=>({circuits:[],disconnected:[]}),createRun:()=>({fought:[],fighting:null,repairs:0}),plan,
  act(ctx,intent,p){
    if(p.control){ctx.persistent.circuits=p.circuits;ctx.engine.reveal();ctx.engine.notify(`${p.control.name}を切り替えました。動力 ${load(ctx)}/${ctx.spec.capacity}。`);const guard=ctx.spec.devices.find(d=>d.kind==='guardian'&&d.circuit===p.control.id&&powered(ctx,d)&&!ctx.run.fought.includes(d.id));if(guard)fight(ctx,guard);return;}
    if(p.inventory)ctx.state.inventory=p.inventory;
    if(intent.action==='disconnect'){ctx.persistent.disconnected.push(p.device.id);ctx.engine.notify('部品を外して配線を切り離しました。部品を使えば再接続できます。');}
    if(intent.action==='reconnect'){ctx.persistent.disconnected=ctx.persistent.disconnected.filter(id=>id!==p.device.id);ctx.engine.notify('部品を取り付け、配線を接続しました。');}
    if(intent.action==='repair'){ctx.run.repairs++;ctx.engine.healAll();ctx.engine.notify('修復装置で隊を回復しました。');}
    if(intent.action==='ride'){const d=p.device.destination;ctx.engine.teleport(d.map,d.x,d.y,d.facing??'north');}
    ctx.engine.reveal();
  },
  danger(ctx){const guard=ctx.spec.devices.find(d=>d.kind==='guardian'&&powered(ctx,d)&&!ctx.run.fought.includes(d.id)&&closeTo(ctx.state,d));if(!guard)return false;fight(ctx,guard);return true;},
  battleEnd(ctx){if(ctx.run.fighting){if(ctx.result==='win')ctx.run.fought.push(ctx.run.fighting);ctx.run.fighting=null;}},
  tile:(ctx,map,x,y)=>patchTile(ctx.spec.devices.filter(d=>d.kind==='door'&&powered(ctx,d)).flatMap(d=>d.tiles),map,x,y),
  cell:(ctx,map,x,y)=>patchCell(ctx.spec.devices.filter(d=>d.kind==='door'&&powered(ctx,d)).flatMap(d=>d.tiles),map,x,y),
  project(ctx){
    const cards=ctx.spec.controls.filter(c=>closeTo(ctx.state,c)).map(c=>({name:c.name,text:`${ctx.persistent.circuits.includes(c.id)?'通電':'停止'}。接続先：${ctx.spec.devices.filter(d=>d.circuit===c.id).map(d=>`${d.name}（${d.power}）`).join('・')}`,actions:[action(ctx,plan,'系統の動力を切り替える',{action:'toggle',target:c.id})]}));
    for(const d of ctx.spec.devices.filter(d=>closeTo(ctx.state,d))){const actions=[action(ctx,plan,connected(ctx,d)?'部品を外して切り離す':'部品を戻して接続する',{action:connected(ctx,d)?'disconnect':'reconnect',target:d.id})];if(d.kind==='repair')actions.push(action(ctx,plan,'隊を修復する',{action:'repair',target:d.id}));if(d.kind==='elevator')actions.push(action(ctx,plan,'昇降機に乗る',{action:'ride',target:d.id}));cards.push({name:d.name,text:`${connected(ctx,d)?powered(ctx,d)?'稼働中':'停止中':'配線切断'} ／ 動力 ${d.power}`,actions});}
    return panel(ctx,'機関廟の動力配分',`使用動力 ${load(ctx)}/${ctx.spec.capacity} ／ 修復 ${ctx.run.repairs}/${ctx.spec.repairsPerRun}回。同じ系統の門番も起動します。不要な部品を外すと動力を節約できます。`,cards,{markers:markers(ctx,[...ctx.spec.controls,...ctx.spec.devices],'機')});
  },
  validate(data,d,s){return !integer(s.capacity,1,100)||!integer(s.repairsPerRun,1,100)||!pointsValid(data,d,s.controls)||!pointsValid(data,d,s.devices)||!data.encounters[s.guardEncounter]||s.devices.some(v=>!s.controls.some(c=>c.id===v.circuit)||!integer(v.power,1,s.capacity)||!materialsValid(data,v.salvage)||!['door','elevator','repair','guardian'].includes(v.kind)||v.kind==='door'&&(!patchValid(data,d,v.tiles)||v.tiles.some(p=>p.tile!=='.'))||v.kind==='elevator'&&!floorValid(data,d,v.destination))?['配電盤・装置・容量が不正です']:[];},
  validateState(s,p,r){
    if(!exact(p,['circuits','disconnected'])||!idList(p.circuits,s.controls.map(c=>c.id))||!idList(p.disconnected,s.devices.map(d=>d.id))||load({spec:s,persistent:p})>s.capacity)return ['動力配分の保存が不正です'];
    return r&&(!exact(r,['fought','fighting','repairs'])||!idList(r.fought,s.devices.filter(d=>d.kind==='guardian').map(d=>d.id))||r.fighting!==null&&!s.devices.some(d=>d.kind==='guardian'&&d.id===r.fighting)||!integer(r.repairs,0,s.repairsPerRun))?['装置の探索状態が不正です']:[];
  }
};
