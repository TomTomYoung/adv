import assert from 'node:assert/strict';
import {resolveBattle} from '../tools/audit-regional-relocation.mjs';
import {data,ready,start,go,drain,checkpoint,read,walk,inspect} from './library-helpers.mjs';
export {data,ready,start,go,drain,checkpoint,read,walk,inspect};
export function choose(g,id,choice,{combat='win'}={}){
 assert.ok(g.dispatch({type:'choose',id:choice}),`${id}/${g.state.stories[id].scene}/${choice}: ${g.state.notice}`);checkpoint(g);drain(g);
 if(g.state.battle){if(combat==='pending')return;resolve(g,id,combat);}
 if(g.state.journey){const a=g.data.quests[id].story.actions[g.state.journey.action];go(g,g.data.quests[id].story.worldPlaces[a.journey.to]);if(g.state.journey)assert.ok(g.dispatch({type:'story.resume',quest:id}));assert.equal(g.state.journey,null);drain(g);}
 checkpoint(g);
}
export function resolve(g,id,result){
 delete g.random;resolveBattle(g,result);checkpoint(g);g.random=()=>.999999;
 if(result==='lose'){assert.equal(g.state.townLocation,'e2_academy');const q=data.quests[id];go(g,q.story.worldPlaces[q.story.scenes[g.state.stories[id].scene].place]);assert.ok(g.dispatch({type:'story.resume',quest:id}));drain(g);checkpoint(g);}
}
