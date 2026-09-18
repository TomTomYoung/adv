import {commandsAt,pushBranch,pump} from './script.js';
import {clone} from './expression.js';

export const BATTLE_EVENT_PHASES=['start','round_start','before_end'];

export function battleDefinition(data,battle){
  const c=battle?.continuations;
  return c?.frame?commandsAt(data,c.frame)[c.index]:null;
}
export function triggerBattleEvent(engine,phase){
  const b=engine.state.battle;if(!b||b.event)return false;
  const events=battleDefinition(engine.data,b)?.events??[];
  const index=events.findIndex(e=>e.triggers.includes(phase)&&!b.firedEvents.includes(e.id)&&(e.condition===undefined||engine.value(e.condition)));
  if(index<0)return false;
  const event=events[index],c=b.continuations;
  b.firedEvents.push(event.id);b.event={id:event.id,index,phase,depth:engine.state.vm.length};
  engine.state.waiting=null;
  pushBranch(engine,c.frame,c.index,['events',index,'commands']);pump(engine);return true;
}
export function resumeBattleEvent(engine){
  const b=engine.state.battle;if(!b?.event)return;
  b.continuations.frame.local=clone(engine.state.vm[b.event.depth-1].local);
  const phase=b.event.phase;b.event=null;
  if(triggerBattleEvent(engine,phase))return;
  if(b.pendingResult){engine.finishBattle(b.pendingResult,true);return;}
  engine.state.waiting={type:'battle'};
}
export function interruptBattle(engine){
  const b=engine.state.battle;if(!b?.event)throw Error('battle.end は戦闘中イベント内で実行します');
  b.continuations.frame.local=clone(engine.state.vm.at(-1).local);
  engine.state.vm[b.event.depth-1].local=clone(b.continuations.frame.local);
  engine.state.vm.length=b.event.depth;b.event=null;
  engine.finishBattle('interrupted',true);
}
