import {clone} from './expression.js';
let nextSession=0;
export const freshFeedback=()=>({session:++nextSession,revision:0,events:[],clock:0});
export function beginFeedback(engine){engine.feedback.revision++;engine.feedback.events=[];engine.feedback.clock=0;}
export function describeTarget(engine,key='scene'){
  if(typeof key!=='string')return clone(key);
  const [kind,id]=key.split(':');
  if(kind==='actor'){const a=engine.data.actors[id];return {key,image:a?.portrait,label:a?.name};}
  if(kind==='enemy'){const e=engine.state.battle?.enemies.find(e=>e.instance===id);return {key,image:e?.sprite,label:e?.name};}
  return {key};
}
export function emitFeedback(engine,{effects=[],sound=null,targets=['scene'],at=engine.feedback.clock,gain=1}){
  const f=engine.feedback;if(f.events.length>=64)throw Error('一度の演出数が多すぎます');
  f.events.push({effects:[...effects],sound,targets:targets.map(t=>describeTarget(engine,t)),at:Math.min(5000,Math.max(0,at)),gain});
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
