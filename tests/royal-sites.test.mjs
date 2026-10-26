import test from 'node:test';
import assert from 'node:assert/strict';
import {read} from '../tools/audit-regional-relocation.mjs';
import {data,ready,go,checkpoint,drain} from './royal-helpers.mjs';
test('five village sites retain free, registered walking and boat routes with empty supplies',()=>{
 const g=ready();g.state.gold=0;g.state.light=0;for(const k of Object.keys(g.state.inventory))g.state.inventory[k]=0;
 for(const map of data.dungeons.royal_sites.maps){go(g,{kind:'dungeon',dungeon:'royal_sites',map,x:1,y:1});assert.equal(g.state.worldTravel.returnAnchor,'oddland_village');checkpoint(g);go(g,{kind:'town',location:'royal_board'});checkpoint(g);}
 assert.equal(g.state.gold,0);assert.equal(g.state.light,0);
 const routes=data.worldTravel.routes.filter(r=>[r.a,r.b].some(p=>p.map==='e2_royal_island'));assert.deepEqual(routes.map(r=>r.id),['royal_lake_boat']);
});
for(const kind of ['mark','defeat'])test(`village sites ${kind} return to the village with valid saved expedition state`,()=>{
 const g=ready();go(g,{kind:'dungeon',dungeon:'royal_sites',map:'e2_royal_island',x:9,y:5});if(kind==='mark')assert.ok(g.dispatch({type:'retreat'}));else g.defeat();drain(g);assert.equal(g.state.townLocation,'oddland_village');checkpoint(g);
});
test('original ten quest identifiers, prerequisites, endings and reward amounts stay intact',async()=>{
 for(let n=161;n<=170;n++){const id='q'+n,old=await read('data/quests/'+id+'.json'),q=data.quests[id];for(const k of ['id','number','region','title','requires','outcomes'])assert.deepEqual(q[k],old[k],id+'/'+k);assert.equal(q.settlement,'oddland_village');assert.deepEqual(q.receptionLocations,['royal_board']);assert.equal(q.model.preserveAcceptedRoute,true);}
});
