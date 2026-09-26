import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {data,newGame,walk,navigateMaps,drain} from './helpers.mjs';
import {validateContent} from '../src/core/validation.js';
import {validateSave} from '../src/core/save.js';
import {projectGame} from '../src/application/projection.js';
import {dungeonActionPlan} from '../src/core/dungeons.js';
import {compartmentBlocked} from '../src/core/systems/compartment-water.js';
import {traceDungeonRay} from '../src/view/dungeon.js';

const begin=()=>{const g=newGame();g.random=()=>.999999;assert.ok(g.dispatch({type:'travel',dungeon:'region_1'}));return g;};
const act=(g,system,action,target)=>g.dispatch({type:'dungeon.action',system,action,target});
const stable=g=>structuredClone({location:g.state.location,steps:g.state.steps,light:g.state.light,inventory:g.state.inventory,actors:g.state.actors,dungeons:g.state.dungeons,events:g.state.events});
const roundtrip=g=>{const text=g.save();assert.deepEqual(validateSave(JSON.parse(text),data),[]);g.load(text);assert.equal(g.save(),text);};

test('retired 3D layout is preserved byte for byte and absent from normal loading and travel',async()=>{
  const base=new URL('../authoring/legacy/2026-09-18-map-layout/',import.meta.url),manifest=JSON.parse(await fs.readFile(new URL('manifest.json',base)));
  for(const [file,hash] of Object.entries(manifest.files))assert.equal(createHash('sha256').update(await fs.readFile(new URL(file,base))).digest('hex'),hash,file);
  assert.ok(!data.maps.waterworks_shaft);assert.ok(Object.values(data.maps).every(m=>!m.voxels));
  assert.ok(!data.game.files.scripts.includes('data/scripts/voxel-space.json'));
  for(const q of Object.values(data.quests).filter(q=>q.number<=30))for(const e of q.events)for(const p of e.points){const d=data.dungeons[p.dungeon];assert.ok(d.systems.connections?.links.length,q.id);assert.ok(!data.maps[p.map].voxels);}
});

test('unchanged q002-q010 scenarios preserve their migration baseline',async()=>{
  for(let n=2;n<=10;n++){
    if(n===4)continue; // q004 now has real travel; its three conclusions are covered by checkpoint routes.
    const id=`q${String(n).padStart(3,'0')}`,old=JSON.parse(await fs.readFile(new URL(`../authoring/legacy/2026-09-18-map-layout/data/quests/${id}.json`,import.meta.url)));
    for(const key of ['scripts','outcomes'])assert.deepEqual(data.quests[id][key],old[key],`${id}/${key}`);
    assert.deepEqual(data.quests[id].model.graph,old.model.graph,id);
  }
});

test('a sealed flooded map cannot be entered by moving, interacting, an action, teleport, diving gear or a forged save',()=>{
  const g=begin();walk(g,9,1);g.state.location.facing='east';const before=stable(g);
  for(const run of [()=>g.dispatch({type:'move',direction:'forward'}),()=>act(g,'connections','cross','upper_inlet')]){assert.equal(run(),false);assert.deepEqual(stable(g),before);}
  assert.ok(g.dispatch({type:'interact'}));const choice=projectGame(g).dialog.options.find(o=>o.text==='隣の区画へ進む');assert.equal(choice.enabled,false);assert.equal(g.dispatch({type:'choose',id:choice.id}),false);assert.deepEqual(stable(g),before);assert.ok(g.dispatch({type:'choose',id:'cancel'}));
  assert.throws(()=>g.teleport('region_1_canal_a',1,1),/移動できない/);assert.deepEqual(stable(g),before);
  g.give('diving_kit',1);const inventory=structuredClone(g.state.inventory);assert.equal(g.dispatch({type:'item',item:'diving_kit',actor:'ada'}),false);assert.deepEqual(g.state.inventory,inventory);
  const save=JSON.parse(g.save());save.state.location={map:'region_1_canal_a',x:1,y:1,facing:'east'};save.state.fieldEntry={...save.state.location,z:0,fired:[]};assert.ok(validateSave(save,data).length);roundtrip(g);
});

test('door appearance, ray occlusion, map marker and action permission follow the same flood state',()=>{
  const g=begin();walk(g,9,1);g.state.location.facing='east';let d=projectGame(g).dungeon;
  assert.ok(d.doors['9,1/east'].closed);assert.ok(d.objects.find(o=>o.id==='upper_inlet').closed);
  assert.ok(d.cells[1].every(c=>c.waterDepth===0));assert.ok(d.cells.flat().some(c=>c.waterDepth===1));const ray=traceDungeonRay(d,9.5,1.5,1,0);assert.equal(ray.distance,.5);assert.equal(ray.door.kind,'watertight_door');
  walk(g,2,1);assert.ok(act(g,'water','close','upper_gate'));walk(g,9,1);g.state.location.facing='east';d=projectGame(g).dungeon;
  assert.equal(d.doors['9,1/east'].closed,false);assert.equal(d.objects.find(o=>o.id==='upper_inlet').closed,false);
  for(const a of d.systems.flatMap(s=>s.cards??[]).flatMap(c=>c.actions))assert.equal(a.enabled,dungeonActionPlan(data,g.state,a.intent).ok);
  const before=g.save();d.doors['9,1/east'].closed=true;assert.equal(g.save(),before);
});

test('drainage is local, both handles work, dry stairs remain usable and all waterway sections have a return route',()=>{
  const g=begin();walk(g,2,1);assert.ok(act(g,'water','close','upper_gate'));assert.equal(compartmentBlocked(data,g.state,'region_1_canal_a'),null);assert.ok(compartmentBlocked(data,g.state,'region_1_canal_c'));
  for(const id of data.dungeons.region_1.maps){navigateMaps(g,id,{heal:true});assert.equal(g.state.location.map,id);assert.ok(g.walkable(g.map(),g.state.location.x,g.state.location.y));roundtrip(g);}
  navigateMaps(g,'region_1_landing');walk(g,2,1);assert.ok(act(g,'water','open','upper_gate'));assert.ok(compartmentBlocked(data,g.state,'region_1_canal_a'));
  assert.ok(act(g,'water','close','upper_gate'));assert.equal(compartmentBlocked(data,g.state,'region_1_canal_a'),null);navigateMaps(g,'region_1_f1');roundtrip(g);
});

test('flooding cannot be operated remotely or from inside the flooded compartment and rejected actions spend nothing',()=>{
  const g=begin(),before=stable(g);assert.equal(act(g,'water','close','lower_gate'),false);assert.deepEqual(stable(g),before);
  walk(g,2,1);act(g,'water','close','upper_gate');navigateMaps(g,'region_1_canal_a');const inside=stable(g);
  assert.equal(act(g,'water','open','upper_gate'),false);assert.deepEqual(stable(g),inside);roundtrip(g);
});

test('crossing uses one movement step, correct facing and destination enter events only once across save/resume',()=>{
  const g=begin();g.data=structuredClone(data);g.data.scripts.test_arrival={commands:[{op:'narrate',text:'水路に入った。'}]};
  g.data.maps.region_1_canal_a.objects.push({id:'arrival',name:'到着',x:1,y:1,trigger:'enter',kind:'clue',safe:true,script:'test_arrival'});
  walk(g,2,1);act(g,'water','close','upper_gate');walk(g,9,1);g.state.location.facing='east';const steps=g.state.steps;
  assert.ok(g.dispatch({type:'move',direction:'forward'}));assert.equal(g.state.steps,steps+1);assert.deepEqual(g.state.location,{map:'region_1_canal_a',x:1,y:1,facing:'east'});
  assert.equal(g.state.waiting?.text,'水路に入った。');assert.equal(g.state.events['region_1_canal_a/arrival'],1);
  const saved=g.save();g.load(saved);drain(g);assert.equal(g.state.events['region_1_canal_a/arrival'],1);
  g.state.location.facing='west';assert.ok(g.dispatch({type:'move',direction:'forward'}));assert.deepEqual(g.state.location,{map:'region_1_f1',x:9,y:1,facing:'west'});
});

test('authoring rejects water behind open stairs, misplaced doors, a flooded entrance and unreachable drain controls',()=>{
  const mutations=[
    d=>{d.dungeons.region_1.systems.connections.links[0].kind='stairs';delete d.dungeons.region_1.systems.connections.links[0].a.side;delete d.dungeons.region_1.systems.connections.links[0].b.side;},
    d=>d.dungeons.region_1.systems.connections.links[0].a.side='west',
    d=>d.dungeons.region_1.entries.main.map='region_1_canal_a',
    d=>d.dungeons.region_1.systems.water.controls.filter(c=>c.id==='upper_gate').forEach(c=>c.map='region_1_canal_a'),
    d=>d.dungeons.region_1.systems.water.controls.filter(c=>c.id==='upper_gate').forEach(c=>c.map='region_1_gatehouse'),
    d=>d.dungeons.region_1.systems.connections.links.pop(),
    d=>d.dungeons.region_1.systems.connections.links[0].b.x=99
  ];
  for(const mutate of mutations){const content=structuredClone(data);mutate(content);assert.ok(validateContent(content).length);}
});
