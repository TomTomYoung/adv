import test from 'node:test';
import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {worldTravelView} from '../src/core/world-travel.js';
import {validateContent} from '../src/core/validation.js';
import {projectGame} from '../src/application/projection.js';
import {read} from '../tools/audit-regional-relocation.mjs';
import {previous} from './royal-compat-helpers.mjs';
import {border} from './oddland-helpers.mjs';
import {data,ready,checkpoint,drain,walk,inspect,go,roadGo} from './royal-helpers.mjs';
const act=(g,system,action,target,extra={})=>assert.ok(g.dispatch({type:'dungeon.action',system,action,target,...extra}));
function operate(g,id){
 if(id==='region_7'){walk(g,1,2);act(g,'air','raise','float_1_0');walk(g,1,3);assert.ok(g.state.dungeons.active.systems.air.air<36);}
 else{const c=g.data.dungeons.region_9.systems.terrain.controls[0];walk(g,c.x,c.y);act(g,'terrain','shift',c.id,{phase:'west'});}
}
function leave(g,id,kind){if(kind==='exit'){walk(g,1,1);inspect(g,'exit');drain(g);}else if(kind==='cross'){walk(g,1,1);assert.ok(g.dispatch({type:'world.cross',route:id==='region_7'?'sunken_surface':'observatory_surface'}));}else if(kind==='mark')assert.ok(g.dispatch({type:'retreat'}));else g.defeat();drain(g);}
for(const id of ['region_7','region_9'])for(const kind of ['exit','cross','mark','defeat'])test(`${id}/${kind}: old expeditions keep country, equipment and home; subsequent village trips return to the village`,()=>{
 const old=new GameEngine(previous,1907);drain(old);old.random=()=>.999999;assert.ok(old.dispatch({type:'travel',dungeon:id}));operate(old,id);const raw=old.save(),g=new GameEngine(data);g.load(raw);g.random=()=>.999999;
 const expected=JSON.parse(raw);expected.state.worldTravel.version=2;assert.deepEqual(JSON.parse(g.save()),expected);assert.equal(worldTravelView(g).country,'聖王国トルネア領');assert.deepEqual(g.state.worldTravel.visited,{hikarigaeri:true});assert.deepEqual(g.state.worldTravel.registrations,{});checkpoint(g);
 leave(g,id,kind);assert.equal(g.state.townLocation,'hikarigaeri_square');assert.equal(g.dispatch({type:'travel',dungeon:id}),false);assert.equal(g.dispatch({type:'world.cross',route:id==='region_7'?'sunken_surface':'observatory_surface'}),false);checkpoint(g);
 // A fresh registered party is a navigation fixture, not an invented visit in
 // the loaded record. Compare persistence when the old party really walks in.
 const persistent=structuredClone(g.state.dungeons.persistent[id]);border(g);roadGo(g,{kind:'town',location:'oddland_village'});assert.ok(g.dispatch({type:'travel',dungeon:id}));assert.deepEqual(g.state.dungeons.persistent[id],persistent);assert.equal(worldTravelView(g).country,'オッドランド');assert.equal(g.state.worldTravel.returnAnchor,'oddland_village');checkpoint(g);leave(g,id,kind);assert.equal(g.state.townLocation,'oddland_village');checkpoint(g);
});
test('all forty receptions move together; inherited dungeon definitions and first-edition quests stay unchanged',async()=>{
 for(const id of ['region_7','region_9']){assert.deepEqual(data.dungeons[id],previous.dungeons[id]);assert.ok(!data.locations.hikarigaeri_square.dungeons.includes(id));for(const map of data.dungeons[id].maps){const withoutQuestObjects=m=>({...m,objects:m.objects.filter(o=>!o.quest)});assert.deepEqual(withoutQuestObjects(data.maps[map]),withoutQuestObjects(previous.maps[map]));}}
 assert.equal(Object.keys(data.maps).length,82);assert.equal(Object.keys(data.dungeons).length,20);assert.equal(Object.keys(data.quests).length,300);assert.equal(data.scenarioEditions.editions.e2.saveRevision,2);
 const g=ready();for(const id of ['q061','q081','q161','q181'])assert.equal(g.accept(id),false);for(const id of ['region_7','region_9'])assert.equal(g.dispatch({type:'travel',dungeon:id}),false);
 roadGo(g,{kind:'town',location:'royal_board'});assert.equal(projectGame(g).quests.filter(q=>q.stage==='available'&&q.receptionHere).length,40);
 assert.equal(g.accept('q070'),false);assert.equal(g.accept('q090'),false);
 for(let n=61;n<=70;n++){const id='q0'+n,q=data.quests[id],base=await read('data/quests/'+id+'.json');assert.deepEqual(q.requires,base.requires);assert.deepEqual(q.outcomes,base.outcomes);assert.equal(q.region,base.region);}
});
test('new village journeys need real registration and reject unrelated return anchors without mutating a save',()=>{
 const g=ready();go(g,{kind:'dungeon',dungeon:'region_7',map:'region_7_f1',x:1,y:1});const before=g.save();
 for(const mutate of [s=>delete s.worldTravel.registrations.oddland_entry,s=>{s.worldTravel.returnAnchor='oddland';}]){const bad=JSON.parse(before);mutate(bad.state);assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),before);}
 const malformed=structuredClone(data);malformed.worldTravel.previousDungeonSettlements.region_7='oddland_village';assert.ok(validateContent(malformed).length);
});
test('empty pockets and an unlit lamp still allow free round trips to both entrances',()=>{
 const g=ready();g.state.gold=0;g.state.light=0;for(const key of Object.keys(g.state.inventory))g.state.inventory[key]=0;
 for(const dungeon of ['region_7','region_9']){go(g,{kind:'dungeon',dungeon,map:dungeon+'_f1',x:1,y:1});go(g,{kind:'town',location:'royal_board'});checkpoint(g);}assert.equal(g.state.gold,0);assert.equal(g.state.light,0);
});
