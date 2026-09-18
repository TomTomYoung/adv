import {dungeonViews,dungeonAction} from './dungeons.js';
import {questEvents,questEventPlan,openQuestEvent} from './quest-events.js';
import {processFieldEvents} from './field-events.js';

const key=value=>JSON.stringify(value);
const idleState=state=>({...state,waiting:null});
const flameText=t=>`${t.effect}。${t.lit?(t.fuel===null?'火は消耗しない。':`燃料は残り${t.fuel}歩。`):'火は消えている。'}`;

// These are nearby domain targets, not permanent UI panels. Plans are evaluated
// against the current state every time the prompt is displayed or confirmed.
export function commandTargets(engine,command='interact'){
  const {data}=engine,state=idleState(engine.state),targets=[];
  const add=(id,name,text,actions)=>targets.push({id,name,text,actions});
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
  if(command!=='interact')return targets;
  for(const event of questEvents(data)){
    const plan=questEventPlan(data,state,event.quest,event.id);
    if(plan.ok)add(`quest:${event.quest}:${event.id}`,event.title,`関連依頼：${data.quests[event.quest].title}`,[{label:'調査する',enabled:true,intent:{type:'quest.event',quest:event.quest,id:event.id}}]);
  }
  for(const object of engine.interactionObjects())add(`object:${object.id}`,object.name,object.name,[{label:'調べる',enabled:true,intent:{type:'field.object',id:object.id}}]);
  return targets;
}

export function playerCommands(engine){
  if(engine.state.mode!=='dungeon')return null;
  const enabled=!engine.state.waiting&&!engine.state.battle&&!engine.state.vm.length;
  const command=(id,label)=>({id,label,enabled,intent:{type:'player.command',id}});
  return {title:'プレイヤーコマンド',movement:[['前へ','forward'],['左を向く','left'],['後ろへ','back'],['右を向く','right']].map(([label,direction])=>({label,direction,enabled,intent:{type:'move',direction}})),actions:[command('interact','足元・正面を調べる'),command('retreat','帰還印で町へ戻る'),...(commandTargets(engine,'portable').length?[command('portable','携帯松明を扱う')]:[]),...(commandTargets(engine,'environment').length?[command('environment','待機・周囲への行動')]:[])]};
}

export function commandDialog(engine){
  const wait=engine.state.waiting;
  if(wait?.type!=='command')return null;
  if(wait.command==='result')return {type:'text',text:wait.text,speaker:''};
  const cancel={id:'cancel',text:wait.command==='retreat'?'やめる':'離れる',enabled:true};
  if(wait.command==='retreat')return {type:'choice',text:`帰還印で町へ戻る。救援費は${Math.ceil(engine.state.gold*engine.data.system.retreatGoldRate*engine.partyEffect('retreatCost'))}G。受注中の依頼と手掛かりは残る。`,options:[{id:'confirm',text:'帰還する',enabled:true},cancel]};
  const targets=commandTargets(engine,wait.command),target=targets.find(t=>t.id===wait.target);
  if(!target)return {type:'choice',text:targets.length?'何を調べる？':'今は調べられるものがない。',options:[...targets.map(t=>({id:key(['target',t.id]),text:t.name,enabled:true,target:t.id})),cancel]};
  return {type:'choice',text:`${target.name}\n\n${target.text}`,options:[...target.actions.map(a=>({id:key(['action',target.id,a.intent]),text:a.label,enabled:a.enabled,requirement:a.reason??'',intent:a.intent})),cancel]};
}

export function openPlayerCommand(engine,id){
  const s=engine.state;
  if(s.mode!=='dungeon'||s.waiting||s.battle||s.vm.length||!['interact','retreat','portable','environment'].includes(id))return false;
  if(id==='retreat'){s.waiting={type:'command',command:id};return true;}
  const targets=commandTargets(engine,id);
  if(!targets.length){s.waiting={type:'command',command:'result',text:'足元と正面を調べた。今は新しい発見はない。'};return true;}
  // Existing single object interactions keep their authored narration and choices.
  if(targets.length===1&&targets[0].id.startsWith('object:'))return engine.trigger('interact',targets[0].actions[0].intent.id);
  if(targets.length===1&&targets[0].id.startsWith('quest:')){const i=targets[0].actions[0].intent;return openQuestEvent(engine,i.quest,i.id);}
  s.waiting={type:'command',command:id,...(targets.length===1?{target:targets[0].id}:{})};return true;
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
  if(id==='cancel'){s.waiting=null;return true;}
  if(option.target){s.waiting={...wait,target:option.target};return true;}
  s.waiting=null;
  let changed;
  if(wait.command==='retreat'){engine.returnTown(true);changed=true;}
  else if(option.intent.type==='quest.event')changed=openQuestEvent(engine,option.intent.quest,option.intent.id);
  else if(option.intent.type==='field.object')changed=engine.trigger('interact',option.intent.id);
  else changed=dungeonAction(engine,option.intent);
  if(!changed){s.waiting=wait;return false;}
  // Run real action consequences before presenting a result. Opening and
  // cancelling a prompt never consumes a turn or activates dungeon danger.
  processFieldEvents(engine);
  if(!s.waiting&&!s.battle&&!s.vm.length)s.waiting={type:'command',command:'result',text:s.notice||'操作を終えた。'};
  return true;
}
