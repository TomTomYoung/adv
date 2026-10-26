import test from 'node:test';
import assert from 'node:assert/strict';
import {loadContent} from '../src/core/loader.js';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {worldTravelView} from '../src/core/world-travel.js';
import {data,read,ready,go,walk,inspect,checkpoint,drain} from './library-helpers.mjs';
const previous=await loadContent(async file=>{
 if(file==='data/scenario-editions/e2/salome-geography.json')return read('tests/fixtures/e2-geography-before-library.json');
 const v=await read(file);if(file==='data/scenario-editions.json'){for(let n=41;n<=50;n++)delete v.editions.e2.questOverrides['q0'+n];for(let n=141;n<=150;n++)delete v.editions.e2.questOverrides['q'+n];}return v;
},{edition:'e2'});
const act=(g,system,action,target,extra={})=>assert.ok(g.dispatch({type:'dungeon.action',system,action,target,...extra}),g.state.notice);
function operate(g,id){
 if(id==='region_5'){
  const s=g.data.dungeons[id].systems.library,b=s.books[0],gate=s.gates[0];walk(g,b.x,b.y);act(g,'library','borrow',b.id,{actor:'ada',sealed:'attack'});walk(g,gate.x,gate.y);act(g,'library','unlock',gate.id,{actor:'ada'});
 }else{
  const s=g.data.dungeons[id].systems.power,guard=s.devices.find(d=>d.kind==='guardian'),c=s.controls[1],repair=s.devices.find(d=>d.kind==='repair');walk(g,guard.x,guard.y);act(g,'power','disconnect',guard.id);walk(g,c.x,c.y);act(g,'power','toggle',c.id);walk(g,repair.x,repair.y);g.state.actors.ada.hp=1;act(g,'power','repair',repair.id);
 }
}
function leave(g,id,kind){if(kind==='exit'){walk(g,1,1);inspect(g,'exit');}else if(kind==='cross'){walk(g,1,1);assert.ok(g.dispatch({type:'world.cross',route:id==='region_5'?'library_surface':'machine_surface'}));}else if(kind==='mark')assert.ok(g.dispatch({type:'retreat'}));else g.defeat();drain(g);}
for(const id of ['region_5','region_8'])for(const kind of ['exit','cross','mark','defeat'])test(`${id}/${kind}: an old exploration returns home with its own loans, circuits and run; a new visit returns to Salome`,()=>{
 const old=new GameEngine(previous,1907);drain(old);old.random=()=>.999999;assert.ok(old.dispatch({type:'travel',dungeon:id}));operate(old,id);const raw=old.save(),g=new GameEngine(data);g.load(raw);g.random=()=>.999999;assert.equal(g.save(),raw);assert.deepEqual(g.state.worldTravel.visited,{hikarigaeri:true});assert.equal(worldTravelView(g).country,'聖王国トルネア領');checkpoint(g);
 leave(g,id,kind);assert.equal(g.state.townLocation,'hikarigaeri_square');assert.equal(g.dispatch({type:'travel',dungeon:id}),false);assert.equal(g.dispatch({type:'world.cross',route:id==='region_5'?'library_surface':'machine_surface'}),false);checkpoint(g);
 const persistent=structuredClone(g.state.dungeons.persistent[id]);go(g,{kind:'town',location:'e2_academy'});assert.ok(g.dispatch({type:'travel',dungeon:id}));assert.deepEqual(g.state.dungeons.persistent[id],persistent);assert.equal(g.state.worldTravel.returnAnchor,'salome');checkpoint(g);leave(g,id,kind);assert.equal(g.state.townLocation,'e2_academy');checkpoint(g);
});
test('all forty receptions and both departures move; systems, first edition and quest identities remain unchanged',async()=>{
 for(const id of ['region_5','region_8']){assert.deepEqual(data.dungeons[id],previous.dungeons[id]);assert.ok(!data.locations.hikarigaeri_square.dungeons.includes(id));for(const map of data.dungeons[id].maps){const physical=m=>({...m,objects:m.objects.filter(o=>!o.quest)});assert.deepEqual(physical(data.maps[map]),physical(previous.maps[map]));}}
 assert.equal(Object.keys(data.maps).length,83);assert.equal(Object.keys(data.quests).length,300);assert.equal(data.scenarioEditions.editions.e2.saveRevision,2);assert.equal(data.worldTravel.version,2);
 const g=ready();for(const n of [41,71,141,171].flatMap(s=>Array.from({length:10},(_,i)=>s+i))){const id='q'+String(n).padStart(3,'0');assert.equal(g.accept(id),false);const q=data.quests[id],base=await read('data/quests/'+id+'.json');for(const key of ['id','number','title','region','requires','outcomes'])assert.deepEqual(q[key],base[key]);}
 go(g,{kind:'town',location:'salome_board'});assert.equal(projectGame(g).quests.filter(q=>q.stage==='available'&&q.receptionHere).length,60);assert.equal(g.accept('q050'),false);assert.equal(g.accept('q080'),false);assert.ok(g.accept('q041'));assert.ok(g.accept('q071'));assert.ok(g.accept('q141'));assert.ok(g.accept('q171'));checkpoint(g);
 const e1=await loadContent(read);assert.equal(Object.keys(e1.maps).length,56);assert.equal(Object.keys(e1.quests).length,210);assert.ok(e1.locations.hikarigaeri_square.dungeons.includes('region_5'));
});
test('free entrance round trips and malformed saves do not create visits or change return anchors',()=>{
 const g=ready();g.state.gold=0;g.state.light=0;g.state.expedition.lamp.fuel=0;g.state.expedition.reserve=0;for(const key of Object.keys(g.state.inventory))g.state.inventory[key]=0;
 for(const id of ['region_5','region_8']){go(g,{kind:'dungeon',dungeon:id,map:id+'_f1',x:1,y:1});const raw=g.save();for(const mutate of [s=>delete s.worldTravel.visited.salome,s=>{s.worldTravel.returnAnchor='oddland';},s=>{s.worldTravel.version=3;}]){const bad=JSON.parse(raw);mutate(bad.state);assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),raw);}go(g,{kind:'town',location:'salome_board'});checkpoint(g);}
 go(g,{kind:'town',location:'hikarigaeri_square'});assert.equal(g.state.light,0);assert.equal(g.state.gold,0);
});
