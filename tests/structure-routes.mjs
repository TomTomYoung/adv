import assert from 'node:assert/strict';
import {data,newGame,drain,fight} from './helpers.mjs';
import {commandsAt} from '../src/core/script.js';
export function prepareQuest(id){
 const g=newGame(1907);g.award(0,data.system.xpBase*24*25);g.healAll();
 for(const q of Object.values(data.quests).filter(q=>q.number<data.quests[id].number&&q.number<=100)){g.dispatch({type:'accept',id:q.id});g.complete(q.id,'compromise');}
 g.state.gold=5000;for(const item of ['rope','ration','potion','torch'])g.state.inventory[item]=99;
 assert.ok(g.accept(id));g.run(data.quests[id].model.entryScript??`${id}.visit`);drain(g);return g;
}
export function routeTo(id,outcome){
 const g=prepareQuest(id),queue=[{state:structuredClone(g.state),path:[]}],seen=new Set();
 for(let i=0;i<queue.length;i++){
  const entry=queue[i];g.state=structuredClone(entry.state);
  const key=JSON.stringify({flow:g.state.flags.flow?.[id],old:g.state.flags.quest?.[id],outcome:g.state.quests[id].outcome});
  if(seen.has(key))continue;seen.add(key);
  if(g.state.quests[id].stage==='completed'){if(g.state.quests[id].outcome===outcome)return entry.path;continue;}
  const options=commandsAt(data,g.state.vm.at(-1))[g.state.waiting.index].options.filter(o=>o.id!=='pause'&&(o.condition===undefined||g.value(o.condition))&&(o.visibleWhen===undefined||g.value(o.visibleWhen)));
  for(const o of options){
   g.state=structuredClone(entry.state);assert.ok(g.dispatch({type:'choose',id:o.id}));drain(g);if(g.state.battle)fight(g);
   queue.push({state:structuredClone(g.state),path:[...entry.path,o.id]});
  }
 }
 assert.fail(`${id}: no route to ${outcome}`);
}
