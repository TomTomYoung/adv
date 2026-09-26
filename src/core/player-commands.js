import {dungeonViews,dungeonAction,dungeonCell} from './dungeons.js';
import {questEvents,questEventPlan,openQuestEvent,eventVisible} from './quest-events.js';
import {processFieldEvents} from './field-events.js';
import {closeTo,faces} from './systems/common.js';
import {connectionSurfaces} from './systems/map-connections.js';
import {inspectionSignature,inspectionOrigin,inspectScript,finishInspection} from './inspection.js';
import {interiorEntrances} from './world.js';
import {dungeonRestrictions,dungeonRestrictionReason} from './dungeon-restrictions.js';

const key=value=>JSON.stringify(value);
const idleState=state=>({...state,waiting:null});
const flameText=t=>`${t.effect}。${t.lit?(t.fuel===null?'火は消耗しない。':`燃料は残り${t.fuel}歩。`):'火は消えている。'}`;
const receiptKey=(state,id)=>`${state.location.map}/${id}`;

export function commandTargets(engine,command='interact'){
  const {data}=engine,state=idleState(engine.state),targets=[],manual=command==='inspect',inspection=manual||command==='interact';
  const add=(id,name,text,actions,extra={})=>{
    const signature=extra.signature??inspectionSignature([name,text,actions.map(a=>[a.label,a.enabled,a.reason])]);
    targets.push({id,name,text,actions,signature,record:receiptKey(state,id),...extra});
  };
  for(const system of dungeonViews(data,state)){
    if(command==='portable'){
      if(system.portable)add(`portable:${system.id}`,system.portable.name,flameText(system.portable),system.portable.actions);
      continue;
    }
    if(command==='environment'){
      if(system.actions?.length)add(`environment:${system.id}`,system.title,system.summary??'',system.actions);
      continue;
    }
    for(const card of system.cards??[])add(key([system.id,card.name]),card.name,card.text??'',card.actions??[]);
    for(const t of system.fixtures??[])add(key([system.id,t.id]),t.name,flameText(t),t.actions);
    for(const t of system.controls??[])add(key([system.id,t.id]),t.name,t.open?'弁が開いている。':'弁が閉じている。',t.actions);
    for(const t of system.walls??[])add(key([system.id,t.id]),t.name,t.broken?'壁は崩れ、通路が開いている。':'壁に亀裂がある。',t.broken?[]:t.actions);
  }
  if(!inspection)return targets;
  for(const location of interiorEntrances(data,state))add(`interior:${location.id}`,location.name,location.description,[{label:location.enterLabel??`${location.name}に入る`,enabled:true,consumes:false,explicit:true,intent:{type:'location.enter',id:location.id}}]);
  for(const event of questEvents(data)){
    if(event.trigger!=='action'||!eventVisible(state,event)||!event.points.some(p=>closeTo(state,p))||event.dungeon&&event.dungeon!==state.dungeons?.active?.id)continue;
    const plan=questEventPlan(data,state,event.quest,event.id);
    // Unaccepted quest requirements must not reveal private scene information.
    if(!plan.ok&&state.quests[event.quest]?.stage==='available')continue;
    const info=inspectScript(engine,event.script),done=event.once&&state.events[`quest/${event.quest}/${event.id}`];
    add(`quest:${event.quest}:${event.id}`,event.title,`関連依頼：${data.quests[event.quest].title}${done?'。調査済み。':''}`,[{label:'調査する',enabled:plan.ok,reason:plan.reason??'',consumes:info.consumes,meaningful:info.effect,intent:{type:'quest.event',quest:event.quest,id:event.id}}],{signature:info.signature,information:info.information,completed:Boolean(done),status:inspectionSignature([plan.ok,plan.reason,done]),script:done?null:event.script,args:{}});
  }
  for(const object of engine.nearbyObjects()){
    if(object.trigger!=='interact'||!eventVisible(state,{visibleWhen:object.visibleWhen??object.condition}))continue;
    const reason=object.kind==='exit'?dungeonRestrictionReason(state,'return'):'';
    const done=object.once&&state.events[`${state.location.map}/${object.id}`],enabled=!reason&&!done&&(object.condition===undefined||engine.value(object.condition));
    const args={object:object.id,map:state.location.map},info=inspectScript(engine,object.script,args);
    add(`object:${object.id}`,object.name,reason||(done?'調査済み。':object.name),[{label:'調べる',enabled,reason:reason||(done?'この対象の処理は完了している。':enabled?'':'今は実行条件を満たしていない。'),consumes:info.consumes,meaningful:info.effect,intent:{type:'field.object',id:object.id}}],{signature:info.signature,information:info.information,completed:Boolean(done),status:inspectionSignature([enabled,done,reason]),script:done?null:object.script,args});
  }
  if(manual){
    const l=state.location,[dx,dy]=faces[l.facing];
    for(const [id,name,x,y] of [['here','足元のセル',l.x,l.y],['ahead','正面のセル',l.x+dx,l.y+dy]]){
      const cell=dungeonCell(data,state,engine.map(),x,y);if(!cell)continue;
      add(`cell:${id}`,name,`${engine.walkable(engine.map(),x,y)?'通行できる。':'通行できない。'}${cell.visual.floor?'床がある。':'床はない。'}`,[]);
    }
    const door=connectionSurfaces(data,state).doors[`${l.x},${l.y}/${l.facing}`];
    const names={north:'北',east:'東',south:'南',west:'西'};
    add('edge:front','正面のエッジ',`${names[l.facing]}側の境界。${door?`${door.name}。${door.closed?'閉鎖中。':'通行可能。'}`:'この面にある対象は一覧から選べる。'}`,[]);
    return targets;
  }
  // Keep a selected target available while its detail/consumption choices are open.
  return targets.filter(t=>!t.completed&&(engine.state.waiting?.target===t.id||t.actions.some(a=>a.enabled&&a.meaningful!==false)||state.inspections?.[t.record]!==t.signature||t.status&&state.inspections?.[`${t.record}/status`]!==t.status));
}

export function playerCommands(engine){
  if(engine.state.mode!=='dungeon')return null;
  const enabled=!engine.state.waiting&&!engine.state.battle&&!engine.state.vm.length;
  const reason=dungeonRestrictionReason(engine.state,'return_mark');
  const command=(id,label)=>({id,label:id==='retreat'&&reason?'帰還印封印中':label,enabled:enabled&&!(id==='retreat'&&reason),reason:id==='retreat'?reason:'',intent:{type:'player.command',id}});
  return {title:'プレイヤーコマンド',restrictions:[...new Set(dungeonRestrictions(engine.state).map(r=>r.reason))],movement:[['前へ','forward'],['左を向く','left'],['後ろへ','back'],['右を向く','right']].map(([label,direction])=>({label,direction,enabled,intent:{type:'move',direction}})),actions:[command('interact','便利調べる'),command('inspect','任意調べる'),command('retreat','帰還印で町へ戻る'),...(commandTargets(engine,'portable').length?[command('portable','携帯松明を扱う')]:[]),...(commandTargets(engine,'environment').length?[command('environment','待機・周囲への行動')]:[])]};
}

export function commandDialog(engine){
  const wait=engine.state.waiting;
  if(wait?.type!=='command')return null;
  if(wait.command==='result')return {type:'text',text:wait.text,speaker:''};
  const cancel={id:'cancel',text:wait.command==='retreat'?'やめる':wait.command==='inspect'&&wait.target?'対象一覧へ戻る':'離れる',enabled:true};
  if(wait.command==='retreat'){const reason=dungeonRestrictionReason(engine.state,'return_mark');return {type:'choice',text:reason||`帰還印で町へ戻る。救援費は${Math.ceil(engine.state.gold*engine.data.system.retreatGoldRate*engine.partyEffect('retreatCost'))}G。受注中の依頼と手掛かりは残る。`,options:[{id:'confirm',text:'帰還する',enabled:!reason,requirement:reason},cancel]};}
  const targets=wait.origin!==inspectionOrigin(engine.state)?[]:commandTargets(engine,wait.command),target=targets.find(t=>t.id===wait.target);
  if(!target)return {type:'choice',text:targets.length?'何を調べる？':'今は調べられるものがない。',options:[...targets.map(t=>({id:key(['target',t.id]),text:t.name,enabled:true,target:t.id})),cancel]};
  return {type:'choice',text:`${target.name}\n\n${target.text}`,options:[...target.actions.map(a=>({id:key(['action',target.id,a.intent]),text:a.label,enabled:a.enabled,requirement:a.reason??'',intent:a.intent})),cancel]};
}
function remember(engine,target,executing=false){
  if(!target.script||executing||!target.actions.some(a=>a.enabled))engine.state.inspections[target.record]=target.signature;
  if(target.status)engine.state.inspections[`${target.record}/status`]=target.status;
}
function performTarget(engine,target,action){
  const s=engine.state;remember(engine,target,true);
  if(target.script)s.inspectionActive={record:target.record,script:target.script,args:target.args,information:target.information};
  let changed;
  if(action.intent.type==='quest.event')changed=openQuestEvent(engine,action.intent.quest,action.intent.id);
  else if(action.intent.type==='field.object')changed=engine.trigger('interact',action.intent.id);
  else if(action.intent.type==='location.enter')changed=engine.enterLocation(action.intent.id);
  else changed=dungeonAction(engine,action.intent);
  if(!changed){s.inspectionActive=null;return false;}
  finishInspection(engine);processFieldEvents(engine);
  if(!s.waiting&&!s.battle&&!s.vm.length)s.waiting={type:'command',command:'result',text:s.notice||'操作を終えた。'};
  return true;
}
function selectTarget(engine,wait,target){
  remember(engine,target);
  const actions=target.actions.filter(a=>a.enabled);
  // Only convenient inspection skips an unambiguous, resource-free action.
  if(wait.command==='interact'&&actions.length===1&&!actions[0].consumes&&!actions[0].explicit){engine.state.waiting=null;return performTarget(engine,target,actions[0]);}
  engine.state.waiting={...wait,target:target.id};return true;
}
export function openPlayerCommand(engine,id){
  const s=engine.state;
  if(s.mode!=='dungeon'||s.waiting||s.battle||s.vm.length||!['interact','inspect','retreat','portable','environment'].includes(id))return false;
  if(id==='retreat'){const reason=dungeonRestrictionReason(s,'return_mark');if(reason){engine.notify(reason);return false;}s.waiting={type:'command',command:id};return true;}
  const targets=commandTargets(engine,id),wait={type:'command',command:id,origin:inspectionOrigin(s)};
  if(!targets.length){if(id==='interact')return false;s.waiting={type:'command',command:'result',text:'今は新しく調べる対象がない。'};return true;}
  if(id!=='inspect'&&targets.length===1)return selectTarget(engine,wait,targets[0]);
  s.waiting=wait;return true;
}
export function advanceCommand(engine){
  if(engine.state.waiting?.type!=='command'||engine.state.waiting.command!=='result')return false;
  engine.state.waiting=null;return true;
}
export function chooseCommand(engine,id){
  const s=engine.state,wait=s.waiting;
  if(wait?.type!=='command'||wait.command==='result')return false;
  const option=commandDialog(engine).options.find(o=>o.id===id);
  if(!option?.enabled)return false;
  if(id==='cancel'){
    if(wait.command==='inspect'&&wait.target){const {target,...parent}=wait;s.waiting=parent;}
    else s.waiting=null;
    return true;
  }
  const targets=commandTargets(engine,wait.command);
  if(option.target){const target=targets.find(t=>t.id===option.target);return Boolean(target&&selectTarget(engine,wait,target));}
  s.waiting=null;
  if(wait.command==='retreat'){if(!engine.returnTown(true)){s.waiting=wait;return false;}s.waiting={type:'command',command:'result',text:s.notice};return true;}
  const target=targets.find(t=>t.id===wait.target),action=target?.actions.find(a=>a.enabled&&key(a.intent)===key(option.intent));
  if(!action||!performTarget(engine,target,action)){s.waiting=wait;return false;}
  return true;
}
