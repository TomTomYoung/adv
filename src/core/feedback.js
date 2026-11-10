import {clone} from './expression.js';
import {defaultPresentation} from '../presentation-presets.js';
let nextSession=0;
export const freshFeedback=()=>({session:++nextSession,revision:0,events:[],clock:0});
export function beginFeedback(engine){engine.feedback.revision++;engine.feedback.events=[];engine.feedback.clock=0;}
export function describeTarget(engine,key='scene'){
  if(typeof key!=='string')return clone(key);
  const [kind,id]=key.split(':');
  if(kind==='actor'){const a=engine.data.actors[id];return {key,image:a?.portrait,label:a?.name,material:a?.impactMaterial??'flesh'};}
  if(kind==='enemy'){const e=engine.state.battle?.enemies.find(e=>e.instance===id);return {key,image:e?.sprite,label:e?.name,material:engine.data.enemies[e?.id]?.impactMaterial??defaultPresentation.materialSprites[e?.sprite]??'flesh'};}
  return {key};
}
export function emitFeedback(engine,{effects=[],sound=null,targets=['scene'],source,at=engine.feedback.clock,gain=1,phase,action}){
  const f=engine.feedback;if(f.events.length>=64)throw Error('一度の演出数が多すぎます');
  f.events.push({effects:[...effects],sound,targets:targets.map(t=>describeTarget(engine,t)),...(source?{source:describeTarget(engine,source)}:{}),...(phase?{phase}:{}),...(action?{action}:{}),at:Math.min(5000,Math.max(0,at)),gain});
}
// Battle results are already resolved. This schedules presentation only; no waits or RNG.
export function playBattleCue(engine,id,source,targets,hostile=false,action){
  const cue=engine.data.presentation?.cues[id];if(!cue)return;
  const start=engine.feedback.clock,impact=start+(cue.battle?.impact??0);
  if(cue.battle?.anticipation){
    emitFeedback(engine,{effects:[source.key.startsWith('actor:')?(cue.battle.actorAnticipation??'actor_strike'):cue.battle.anticipation],targets:[source],source:targets[0],at:start,phase:'windup',action});
  }
  if(cue.battle?.projectile)emitFeedback(engine,{effects:[cue.battle.projectile],source,targets,at:start,phase:'flight'});
  const missed=targets.length>0&&targets.every(t=>t.missed),guarded=targets.length>0&&targets.every(t=>t.guarded&&!(t.healing>0));
  emitFeedback(engine,{effects:missed?[]:cue.effects,sound:missed?null:guarded?'se_guard':cue.sound,source,targets,at:impact,phase:'impact',action});
  const defeated=targets.filter(t=>t.defeated);
  if(defeated.length)emitFeedback(engine,{effects:['fade_out'],sound:'se_bump',gain:.55,targets:defeated,at:impact+160,phase:'defeat'});
  engine.feedback.clock=Math.min(5000,impact+Math.max(cue.gap??0,defeated.length?420:0));
}
export function playCue(engine,id,targets){
  const cue=engine.data.presentation?.cues[id];if(!cue)return;
  emitFeedback(engine,{effects:cue.effects,sound:cue.sound,targets:targets??[cue.target==='target'?'scene':cue.target]});
  engine.feedback.clock=Math.min(5000,engine.feedback.clock+(cue.gap??0));
}
export function setScreenLayer(engine,command){
  const layers=engine.state.presentation.layers??={};
  if(command.op==='screen.clear'){delete layers[command.layer];return;}
  if(!Object.hasOwn(layers,command.layer)&&Object.keys(layers).length>=4)throw Error('画面レイヤーは最大4個です');
  layers[command.layer]={color:command.color,opacity:command.opacity,shade:command.shade??false};
}
