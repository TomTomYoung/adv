import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {loadContent} from '../src/core/loader.js';
import {GameEngine} from '../src/core/engine.js';
import {atWorldPlace,locationRoot} from '../src/core/world.js';
import {validateSave} from '../src/core/save.js';
import {drain,walk,navigateMaps,inspect} from './helpers.mjs';
import {sources} from '../tools/build-oddland-quests.mjs';
export {sources,drain,walk,inspect};
export const read=file=>fs.readFile(new URL('../'+file,import.meta.url),'utf8').then(JSON.parse);
export const data=await loadContent(read,{edition:'e2'});
export const fresh=()=>{const g=new GameEngine(data,1907);drain(g);g.random=()=>.999999;return g;};
export function checkpoint(g){const raw=g.save();assert.deepEqual(validateSave(JSON.parse(raw),data),[]);g.load(raw);assert.equal(g.save(),raw);}
const key=p=>p.kind==='town'?'town:'+p.location:p.map;
export function go(g,p){
 const data=g.data,routes=data.worldTravel.routes;
 const root=()=>g.state.mode==='town'?locationRoot(data,g.state.townLocation).id:null;
 const here=()=>g.state.mode==='town'?'town:'+root():g.state.location.map;
 const target=p.kind==='town'?'town:'+locationRoot(data,p.location).id:p.map;
 if(here()!==target){
  const queue=[here()],seen=new Map([[here(),null]]);
  for(let i=0;i<queue.length;i++)for(const r of routes)for(const [from,to] of [[r.a,r.b],[r.b,r.a]])if(key(from)===queue[i]&&!seen.has(key(to))){seen.set(key(to),{from,to,route:r.id});queue.push(key(to));}
  assert.ok(seen.has(target),`${here()} -> ${target}`);const edges=[];for(let e=seen.get(target);e;e=seen.get(key(e.from)))edges.unshift(e);
  for(const e of edges){if(e.from.kind==='town')town(g,e.from.location);else walk(g,e.from.x,e.from.y);assert.ok(g.dispatch({type:'world.cross',route:e.route}),g.state.notice);drain(g);}
 }
 if(p.kind==='town')town(g,p.location);else walk(g,p.x,p.y);drain(g);assert.ok(atWorldPlace(g.state,p));
}
export function town(g,id){
 const data=g.data;
 const queue=[g.state.townLocation],seen=new Map([[queue[0],null]]);
 for(let i=0;i<queue.length&&!seen.has(id);i++){const here=data.locations[queue[i]];for(const next of [here.parent,...here.links,...Object.values(data.locations).filter(l=>l.parent===here.id).map(l=>l.id)].filter(Boolean))if(!seen.has(next)){seen.set(next,here.id);queue.push(next);}}
 assert.ok(seen.has(id),`town route to ${id}`);const steps=[];for(let n=id;seen.get(n);n=seen.get(n))steps.unshift(n);
 for(const next of steps){assert.ok(g.dispatch({type:'location.move',id:next}),g.state.notice);drain(g);}
}
export function border(g=fresh()){
 assert.ok(g.dispatch({type:'travel',dungeon:'region_1'}));navigateMaps(g,'region_1_landing');walk(g,15,3);
 go(g,{kind:'town',location:'oddland_border'});checkpoint(g);return g;
}
export function start(g,number){
 const q=data.quests['q'+number];go(g,{kind:'town',location:'oddland_board'});assert.ok(g.dispatch({type:'accept',id:q.id}),`${q.id}: ${g.state.notice}`);
 go(g,q.story.worldPlaces[q.story.scenes.entry.place]);assert.ok(g.dispatch({type:'story.resume',quest:q.id}),g.state.notice);drain(g);return q;
}
export function choose(g,number,id,{save=true}={}){
 const q=data.quests['q'+number],s=g.state.stories[q.id],action=q.story.actions[`${s.scene}_${id}`];assert.ok(action,`${q.id}/${s.scene}_${id}`);
 const before=g.state.gold;assert.ok(g.dispatch({type:'choose',id}),`${q.id}/${s.scene}_${id}: ${g.state.notice}`);
 drain(g);if(save)checkpoint(g);
 if(action.journey){const p=q.story.worldPlaces[action.journey.to];go(g,p);if(g.state.journey)assert.ok(g.dispatch({type:'story.resume',quest:q.id}),g.state.notice);drain(g);assert.equal(g.state.journey,null);}
 if(save)checkpoint(g);
 const reward=action.ending?q.outcomes[action.ending].gold:0;assert.equal(g.state.gold,before-(action.cost?.gold??0)+reward);
 return action;
}
export function paths(number){const x=sources.find(s=>s.number===number),out=[];function visit(node,choices,actions){for(const a of node.options){const next=[...choices,a.id],aa=[...actions,a];if(a.to.startsWith('@'))out.push({choices:next,actions:aa,outcome:a.to.slice(1)});else visit(x.nodes.find(n=>n.id===a.to),next,aa);}}visit(x.nodes[0],[],[]);return out;}
export function play(g,number,path=paths(number)[0],options={}){start(g,number);for(const id of path.choices)choose(g,number,id,options);assert.equal(g.state.quests['q'+number].outcome,path.outcome);return g;}
export function prepare(g,number,{signals=false}={}){if(number>=298){for(const n of [291,293,294])if(g.state.quests['q'+n].stage!=='completed')play(g,n,paths(n)[0],{save:false});if(signals)play(g,297,paths(297).find(p=>p.outcome==='signals'),{save:false});}if(number>=299)play(g,298,paths(298)[0],{save:false});if(number>=300)play(g,299,paths(299).find(p=>p.choices.includes('work')),{save:false});}
