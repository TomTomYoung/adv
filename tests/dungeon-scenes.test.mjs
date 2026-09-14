import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {data,newGame,drain,fight} from './helpers.mjs';
import {projectGame} from '../src/application/projection.js';
import {dungeonScenePlan} from '../src/core/dungeon-scenes.js';
import {validateContent} from '../src/core/validation.js';
import {validateSave} from '../src/core/save.js';
import {snapshotRecords} from '../src/core/records.js';
import {artRect} from '../src/view/dungeon-art.js';
const scene=id=>data.dungeons[id].fieldScenes[0];
const at=(g,p)=>g.teleport(p.map,p.x,p.y,'east');
const begin=id=>{const g=newGame(1789);g.random=()=>.999999;const s=scene(id);g.state.quests[s.quest].stage='active';g.state.records.baselines[s.quest]=snapshotRecords(g.state.records);g.dispatch({type:'travel',dungeon:id});at(g,s.points[0]);return g;};
const act=(g,system,action,target,more={})=>{assert.ok(g.dispatch({type:'dungeon.action',system,action,target,...more}),g.state.notice);};
const wait=(g,system,n)=>{for(let i=0;i<n;i++)act(g,system,'wait');};
const roundtrip=g=>{const saved=g.save();assert.deepEqual(validateSave(JSON.parse(saved),g.data),[]);g.load(saved);assert.equal(g.save(),saved);};
function pending(g,id){assert.ok(g.dispatch({type:'dungeon.scene',id}));drain(g);assert.equal(g.state.waiting,null);assert.equal(g.state.flags.dungeonNotes?.[id],undefined);}
function record(g,id){
  assert.ok(g.dispatch({type:'dungeon.scene',id}));assert.equal(projectGame(g).dialog.fieldScene.title,scene(id).title);roundtrip(g);drain(g);assert.equal(g.state.waiting?.type,'choice');roundtrip(g);
  assert.ok(g.dispatch({type:'choose',id:'record'}));drain(g);assert.equal(g.state.flags.dungeonNotes[id],true);roundtrip(g);
  const q=projectGame(g).quests.find(q=>q.id===scene(id).quest);assert.equal(q.fieldNotes.length,1);assert.equal(q.evidenceCount,0);assert.equal(q.stage,'active');
  // Reopening is current-state inspection; the observation cannot be recorded twice.
  assert.ok(g.dispatch({type:'dungeon.scene',id}));drain(g);assert.equal(projectGame(g).dialog.options.find(o=>o.id==='record').enabled,false);assert.equal(g.dispatch({type:'choose',id:'record'}),false);assert.ok(g.dispatch({type:'choose',id:'leave'}));
  g.returnTown();roundtrip(g);assert.equal(projectGame(g).fieldNotes.length,1);
}

test('field scenes require a related accepted quest, current dungeon, nearby point and idle exploration',()=>{
 const g=newGame();g.dispatch({type:'travel',dungeon:'region_3'});assert.equal(g.dispatch({type:'dungeon.scene',id:'region_3'}),false);
 g.state.quests.q030.stage='active';assert.equal(g.dispatch({type:'dungeon.scene',id:'region_3'}),false);
 at(g,scene('region_3').points[0]);assert.equal(dungeonScenePlan(data,g.state,'region_3').ok,true);assert.equal(g.dispatch({type:'dungeon.scene',id:'region_4'}),false);
 assert.ok(g.dispatch({type:'dungeon.scene',id:'region_3'}));assert.equal(g.dispatch({type:'dungeon.scene',id:'region_3'}),false);assert.equal(g.dispatch({type:'dungeon.action',system:'garden',action:'wait'}),false);drain(g);
 g.returnTown();assert.equal(g.dispatch({type:'dungeon.scene',id:'region_3'}),false);
});

test('a living root bridge changes the field narrative, persists its note and reverts the live narrative after harvest',()=>{
 const g=begin('region_3');pending(g,'region_3');at(g,data.dungeons.region_3.systems.garden.supply);act(g,'garden','supplies');at(g,scene('region_3').points[0]);
 act(g,'garden','plant','bridge_1',{species:'root_bridge'});pending(g,'region_3');wait(g,'garden',5);const art=projectGame(g).dungeon.systems.find(s=>s.id==='garden').cards[0].art;assert.notDeepEqual(art.rect,data.dungeons.region_3.art.device.rect);
 record(g,'region_3');g.dispatch({type:'travel',dungeon:'region_3'});at(g,scene('region_3').points[0]);act(g,'garden','harvest','bridge_1');assert.ok(g.dispatch({type:'dungeon.scene',id:'region_3'}));drain(g);assert.equal(g.state.waiting,null);assert.equal(projectGame(g).fieldNotes.length,1);
});

test('closing a physical water gate supplies only its optional observation, never evacuation or main-story evidence',()=>{
 const g=begin('region_1');pending(g,'region_1');act(g,'water','close','upper_gate');record(g,'region_1');assert.equal(g.state.stories.q010,undefined);
});

test('the salt wall opening is distinct from the quest statue',()=>{
 const g=begin('region_2');pending(g,'region_2');g.give('blasting_charge',1);act(g,'walls','item','upper_entry',{item:'blasting_charge'});record(g,'region_2');assert.equal(g.state.flags.flow?.q011,undefined);
});

test('the chapel observes a real warp and can be investigated at its destination',()=>{
 const g=begin('region_4');pending(g,'region_4');act(g,'mirrors','warp','mirror_1_0');assert.equal(g.state.location.map,scene('region_4').points[1].map);record(g,'region_4');
});

test('library observation requires opening the seal through the borrowed field ability',()=>{
 const g=begin('region_5');pending(g,'region_5');act(g,'library','borrow','book_1_0',{actor:'ada',sealed:'attack'});
 const gate=data.dungeons.region_5.systems.library.gates.find(g=>g.id==='seal_1_0');const spot=[[gate.x-1,gate.y,'east'],[gate.x+1,gate.y,'west'],[gate.x,gate.y-1,'south'],[gate.x,gate.y+1,'north']].find(([x,y])=>g.walkable(g.data.maps[gate.map],x,y));g.teleport(gate.map,spot[0],spot[1],spot[2]);act(g,'library','unlock',gate.id,{actor:'ada'});at(g,scene('region_5').points[0]);record(g,'region_5');
});

test('a failed market payment never creates an observation',()=>{
 const g=begin('region_6');g.state.gold=0;assert.equal(g.dispatch({type:'dungeon.action',system:'market',action:'trade',target:'toll_1'}),false);pending(g,'region_6');g.state.gold=15;act(g,'market','trade','toll_1');assert.equal(g.state.gold,0);record(g,'region_6');
});

test('sunken castle observation follows actual sectional flotation',()=>{
 const g=begin('region_7');pending(g,'region_7');act(g,'air','raise','float_1_0');record(g,'region_7');
});

test('powered circuit observation resumes after its awakened guardian encounter',()=>{
 const g=begin('region_8');pending(g,'region_8');act(g,'power','toggle','circuit_1_0');assert.ok(g.state.battle);g.award(0,100000);fight(g);at(g,scene('region_8').points[0]);record(g,'region_8');
});

test('manual and random terrain produce observations through their own controls',()=>{
 const manual=begin('region_9');pending(manual,'region_9');act(manual,'terrain','shift','orrery_1',{phase:'west'});record(manual,'region_9');
 const random=begin('moving_village');pending(random,'moving_village');wait(random,'terrain',7);record(random,'moving_village');
});

test('abyss observation reflects actual reverse movement and survives the run ending',()=>{
 const g=begin('region_10');pending(g,'region_10');const vectors=data.dungeons.region_10.systems.return_flow.vectors;
 const v=vectors.find(v=>(v.dx||v.dy)&&g.walkable(g.data.maps[v.map],v.x-v.dx,v.y-v.dy));const facing=v.dx===1?'west':v.dx===-1?'east':v.dy===1?'north':'south';g.teleport(v.map,v.x,v.y,facing);assert.ok(g.dispatch({type:'move',direction:'forward'}));at(g,scene('region_10').points[0]);record(g,'region_10');assert.equal(g.state.dungeons.active,null);
});

test('valley observation requires standing inside the boundary and does not cast a forbidden skill',()=>{
 const g=begin('prayerless_valley');pending(g,'prayerless_valley');assert.ok(g.dispatch({type:'move',direction:'forward'}));const before=g.state.members.map(id=>g.state.actors[id].mp);record(g,'prayerless_valley');assert.deepEqual(g.state.members.map(id=>g.state.actors[id].mp),before);
});

test('fire preparation is a real lit portable source and leaves the rescue quest untouched',()=>{
 const g=begin('kagaribi');assert.equal(g.state.dungeons.active.systems.fires.portable.lit,true);record(g,'kagaribi');assert.equal(g.state.stories.q001,undefined);
});

test('13 destinations expose distinct wall crops and all generated files match their provenance hashes',async()=>{
 const g=newGame(),destinations=projectGame(g).dungeons;assert.equal(new Set(destinations.map(d=>JSON.stringify(d.art.rect))).size,13);
 const manifest=JSON.parse(await fs.readFile(new URL('../assets/source/dungeons/imagegen-manifest.json',import.meta.url)));
 for(const f of manifest.files){const b=await fs.readFile(new URL('../'+f.file,import.meta.url));assert.equal(b.length,f.bytes);assert.equal(createHash('sha256').update(b).digest('hex'),f.sha256);}
 for(const d of destinations){g.dispatch({type:'travel',dungeon:d.id});const m=projectGame(g);assert.deepEqual(m.dungeon.wall,d.art);m.dungeon.wall.rect.x=10;assert.ok(data.dungeons[d.id].art.wall.rect.x<1);g.returnTown();}
 const box=artRect({naturalWidth:1000,naturalHeight:500},{rect:{x:.25,y:.5,width:.25,height:.25}});assert.deepEqual(box,[250,250,250,125]);
});

test('content validation rejects broken scene, image, quest and map references',()=>{
 for(const change of [d=>d.dungeons.region_3.art.wall.rect.width=2,d=>d.dungeons.region_3.fieldScenes[0].quest='missing',d=>d.dungeons.region_3.fieldScenes[0].script='missing',d=>d.dungeons.region_3.fieldScenes[0].points[0].map='region_1_f1',d=>d.dungeons.region_3.fieldScenes[0].condition={op:'unknown'}]){const d=structuredClone(data);change(d);assert.ok(validateContent(d).length);}
});

test('a revised field scene preserves the previous script and a saved choice can finish on that version',async()=>{
 const {buildDungeonScenes}=await import('../tools/build-dungeon-scenes.mjs');const {GameEngine}=await import('../src/core/engine.js');const {tmpdir}=await import('node:os');const path=await import('node:path');
 const g=begin('kagaribi');g.dispatch({type:'dungeon.scene',id:'kagaribi'});drain(g);const saved=g.save(),original=structuredClone(data.scripts['dungeon.scene.kagaribi.v1']);
 const dir=await fs.mkdtemp(path.join(tmpdir(),'adv-scene-revision-'));
 try{
  for(const sub of ['authoring','data/scripts','doc'])await fs.mkdir(path.join(dir,sub),{recursive:true});
  const source=JSON.parse(await fs.readFile(new URL('../authoring/dungeon-scenes.json',import.meta.url)));source.entries=source.entries.filter(e=>e.dungeon==='kagaribi');source.entries[0].scene.revision=2;source.entries[0].scene.intro='改稿後の導入。';
  const write=(name,value)=>fs.writeFile(path.join(dir,name),JSON.stringify(value));await write('authoring/dungeon-scenes.json',source);await write('data/assets.json',data.assets);await write('data/scripts/dungeon-scenes.json',{scripts:{'dungeon.scene.kagaribi.v1':original}});await fs.writeFile(path.join(dir,'doc/DUNGEON_ART_AND_SCENARIOS.md'),'# 素材と調査\n');
  const definition=structuredClone(data.dungeons.kagaribi);delete definition.fieldScenes;await buildDungeonScenes(dir,{kagaribi:definition});
  const scripts=JSON.parse(await fs.readFile(path.join(dir,'data/scripts/dungeon-scenes.json'))).scripts;assert.deepEqual(scripts['dungeon.scene.kagaribi.v1'],original);assert.ok(scripts['dungeon.scene.kagaribi.v2']);
  const upgraded={...data,dungeons:{...data.dungeons,kagaribi:definition},scripts:{...data.scripts,...scripts}};assert.deepEqual(validateContent(upgraded),[]);
  const resumed=new GameEngine(upgraded);resumed.load(saved);assert.ok(resumed.dispatch({type:'choose',id:'record'}));drain(resumed);assert.equal(resumed.state.flags.dungeonNotes.kagaribi,true);roundtrip(resumed);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
