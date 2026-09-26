import {dungeonInterior} from './world.js';
// Domain mutations enqueue only subscribers in the current dungeon. Rendering,
// turning and opening/cancelling a command never publish a signal.
export const FIELD_SIGNALS=['enter','move','light','object','state'];
export const FIELD_REPEATS=['once','entry','change'];
export const freshFieldReactions=()=>({dungeon:null,run:null,pending:[],fired:[]});
export const fieldReactionKey=(dungeon,id)=>`field/${dungeon}/${id}`;
const indexes=new WeakMap();
export function fieldEventIndex(definition){
  const events=definition?.fieldEvents??[];
  let index=indexes.get(events);
  if(!index){
    index={events:new Map(events.map(e=>[e.id,e])),signals:new Map(FIELD_SIGNALS.map(s=>[s,events.filter(e=>e.watch.includes(s)).map(e=>e.id)]))};
    indexes.set(events,index);
  }
  return index;
}
export function signalFieldChange(data,state,...signals){
  const active=state.dungeons?.active,definition=data.dungeons?.[active?.id];
  if(state.mode!=='dungeon'||!definition?.fieldEvents?.length)return;
  let queue=state.fieldReactions;
  if(!queue||queue.dungeon!==active.id||queue.run!==active.run)queue=state.fieldReactions={...freshFieldReactions(),dungeon:active.id,run:active.run};
  const index=fieldEventIndex(definition);
  for(const signal of signals)for(const id of index.signals.get(signal)??[])if(!queue.pending.includes(id))queue.pending.push(id);
}
export function consumeFieldBattleSignals(data,state){
  const q=state.fieldReactions;if(!q?.pending.length)return;
  const index=fieldEventIndex(data.dungeons[q.dungeon]);
  q.pending=q.pending.filter(id=>index.events.get(id)?.action.type!=='battle');
}
export function validateFieldReactions(data,state){
  const q=state.fieldReactions;
  if(!q||typeof q!=='object'||Array.isArray(q)||Object.keys(q).sort().join()!=='dungeon,fired,pending,run')return ['条件付きイベントの保存形式不正'];
  const empty=q.dungeon===null&&q.run===null;
  const events=data.dungeons?.[q.dungeon]?.fieldEvents??[];
  if(!empty&&(state.mode!=='dungeon'&&!dungeonInterior(data,state)||q.dungeon!==state.dungeons?.active?.id||q.run!==state.dungeons?.active?.run))return ['条件付きイベントの探索参照不正'];
  for(const key of ['pending','fired'])if(!Array.isArray(q[key])||new Set(q[key]).size!==q[key].length||q[key].some(id=>empty||!events.some(e=>e.id===id&&(key!=='fired'||e.repeat==='entry'))))return ['条件付きイベントの実行記録不正'];
  for(const [key,count] of Object.entries(state.events??{}))if(key.startsWith('field/')){
    const [,dungeon,id,...rest]=key.split('/');
    if(rest.length||!data.dungeons?.[dungeon]?.fieldEvents?.some(e=>e.id===id)||!Number.isSafeInteger(count)||count<1)return ['条件付きイベントの回数不正'];
  }
  return [];
}
