import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {data,drain} from './helpers.mjs';
import {GameEngine} from '../src/core/engine.js';
import {validateContent} from '../src/core/validation.js';
import {validateSave} from '../src/core/save.js';
import {dungeonCell,dungeonWaterDepth} from '../src/core/dungeons.js';
import {collapseKey,cellBindingErrors} from '../src/core/cell-behaviors.js';
import {floorColor} from '../src/view/dungeon.js';
import {projectGame} from '../src/application/projection.js';
import {Workspace} from '../config/shared/studio/workspace.js';
import {EditorContext} from '../config/shared/studio/context.js';
import {paintCell} from '../config/shared/studio/map-model.js';
const read=f=>fs.readFile(new URL('../'+f,import.meta.url),'utf8');
function game(){const d=structuredClone(data),g=new GameEngine(d);drain(g);for(const m of Object.values(d.maps)){m.encounterRate=0;m.objects=[];}g.teleport('region_2_f1',1,1,'east');g.random=()=>.99999;return {g,d,m:g.map()};}
function put(d,m,id,x,y){let symbol=Object.keys(m.cells.legend).find(k=>m.cells.legend[k]===id);if(!symbol){symbol=[...'abcdefghijklmnopqrstuvwxyz'].find(k=>!m.cells.legend[k]);m.cells.legend[symbol]=id;}m.cells.rows[y]=m.cells.rows[y].slice(0,x)+symbol+m.cells.rows[y].slice(x+1);m.tiles[y]=m.tiles[y].slice(0,x)+d.cellTypes[id].passage+m.tiles[y].slice(x+1);delete m.cells.overrides[`${x},${y}`];}
const forward=g=>g.dispatch({type:'move',direction:'forward'});
test('the authored 24-type catalog is deployed with named presets, a real poison script and compatible existing device placements',async()=>{
 const source=JSON.parse(await read('config/cell-layers.json'));assert.equal(Object.keys(data.cellTypes).length,24);assert.deepEqual(source.presets,data.cellTypes);for(const p of Object.values(data.cellTypes)){assert.ok(p.name&&p.description);}assert.deepEqual(cellBindingErrors(source,data.dungeons),[]);assert.deepEqual(validateContent(data),[]);assert.ok(data.scripts[data.cellEvents.poison_step.script]);
});
test('authored poison damages on each entry, not rotation, and saves once-per-entry execution',()=>{
 const {g,d,m}=game();put(d,m,'poison_swamp',2,1);const hp=g.state.actors.ada.hp;forward(g);assert.equal(g.state.actors.ada.hp,hp-3);const save=g.save();assert.deepEqual(validateSave(JSON.parse(save),d),[]);g.load(save);drain(g);g.dispatch({type:'move',direction:'right'});g.dispatch({type:'move',direction:'left'});assert.equal(g.state.actors.ada.hp,hp-3);g.dispatch({type:'move',direction:'back'});forward(g);assert.equal(g.state.actors.ada.hp,hp-6);
});
test('ice crosses each cell, consumes each step, stops on floor or obstruction and does not skip events',()=>{
 const {g,d,m}=game();put(d,m,'ice_floor',2,1);put(d,m,'ice_floor',3,1);const steps=g.state.steps;forward(g);assert.equal(g.state.location.x,4);assert.equal(g.state.steps,steps+3);
 g.teleport(m.id,1,1,'east');m.cells.overrides['3,1']={events:['poison_step']};forward(g);assert.equal(g.state.location.x,3);assert.equal(g.state.waiting.type,'text');drain(g);g.teleport(m.id,1,1,'east');put(d,m,'stone_wall',3,1);forward(g);assert.equal(g.state.location.x,2);
});
test('fragile floor collapses after successful departure, persists through save, and never drops the party',()=>{
 const {g,d,m}=game();put(d,m,'fragile_floor',2,1);forward(g);assert.equal(g.state.location.x,2);assert.equal(g.state.events[collapseKey(m.id,2,1)],undefined);put(d,m,'stone_wall',3,1);assert.equal(forward(g),false);assert.equal(g.state.events[collapseKey(m.id,2,1)],undefined);g.dispatch({type:'move',direction:'back'});assert.equal(g.walkable(m,2,1),false);assert.equal(dungeonCell(d,g.state,m,2,1).visual.floor,false);const save=g.save();assert.deepEqual(validateSave(JSON.parse(save),d),[]);g.load(save);assert.equal(g.walkable(m,2,1),false);assert.equal(projectGame(g).dungeon.cells[1][2].wall,false);
});
test('safe ground suppresses random encounters but not cell events, and shallow/deep water retain traversable floor geometry',()=>{
 const {g,d,m}=game();put(d,m,'safe_floor',2,1);m.encounterRate=1;g.random=()=>0;g.state.steps=d.system.encounterCheckSteps-1;forward(g);assert.equal(g.state.battle,null);
 g.teleport(m.id,1,1,'east');m.cells.overrides['2,1']={events:['poison_step']};const hp=g.state.actors.ada.hp;forward(g);assert.equal(g.state.actors.ada.hp,hp-3);
 for(const [id,depth] of [['shallow_water',1],['deep_water',2]]){put(d,m,id,3,1);assert.equal(dungeonWaterDepth(d,g.state,m,3,1),depth);assert.equal(g.walkable(m,3,1),true);assert.equal(projectGame(g).dungeon.cells[1][3].opaque,false);}
});
test('corrosion ground changes actual equipped gear and washing removes the penalty',()=>{
 const {g,d,m}=game();g.give('iron_sword',1);g.equip('ada','iron_sword');put(d,m,'corrosive_floor',2,1);const ids=g.state.members.flatMap(a=>Object.values(g.state.gear.equipped[a]??{}));assert.ok(ids.length);forward(g);for(const id of ids)assert.equal(g.state.gear.items[id].salt,1);forward(g);forward(g);for(const id of ids)assert.equal(g.state.gear.items[id].salt,0);
});
test('painting a system-dependent preset rejects unrelated locations and permits matching authored targets',async()=>{
 const w=new Workspace(read),c=new EditorContext(w,read);await c.ensureMap('kagaribi_f1');assert.throws(()=>paintCell(w,'kagaribi_f1',2,1,'salt_wall'),/対象地点/);assert.equal(w.dirty,false);await c.ensureMap('region_2_f1');paintCell(w,'region_2_f1',6,1,'salt_wall');assert.equal(w.dirty,false);paintCell(w,'region_2_f1',2,1,'corrosive_floor');assert.ok(w.dirty);const source=w.value('cell-layers.json'),dungeons=structuredClone(data.dungeons);delete dungeons.region_2.systems.salt;assert.ok(cellBindingErrors(source,dungeons).some(e=>e.binding==='corrosion'));
});
test('surface patterns distinguish material types without changing passage and known parameters reject invalid values',()=>{
 const colors=['earth','wood','wet','ice','cracked','roots','thorns','poison','corrosion','rune'].map(surface=>floorColor(null,.23,.34,{floor:true,surface,illumination:8},1).map(Math.round).join(','));assert.equal(new Set(colors).size,colors.length);
 for(const patch of [{water_depth:3},{slippery:'yes'},{fragile:1},{safe:'true'},{corrosion:-1},{binding:'unknown'}]){const d=structuredClone(data);Object.assign(d.cellTypes.stone_floor.parameters,patch);assert.ok(validateContent(d).length);}
});
test('ice stops at a battle or same-map relocation instead of continuing past the interrupted entry',()=>{
 for(const command of [{op:'battle.start',encounter:'roaming_2',win:[],escape:[],lose:[]},{op:'map.teleport',map:'region_2_f1',x:4,y:1,facing:'east'}]){const {g,d,m}=game();put(d,m,'ice_floor',2,1);put(d,m,'ice_floor',4,1);d.cellEvents.interrupt={trigger:'enter',once:false,script:'cell.test_interrupt'};d.scripts['cell.test_interrupt']={commands:[command]};m.cells.overrides['2,1']={events:['interrupt']};forward(g);assert.equal(g.state.location.x,command.op==='battle.start'?2:4);if(command.op==='battle.start')assert.ok(g.state.battle);}
});
test('fragile floor departure via teleport is persistent, invalid departures have no effect and forged collapse saves are rejected',()=>{
 const {g,d,m}=game();put(d,m,'fragile_floor',2,1);forward(g);assert.throws(()=>g.teleport(m.id,0,0));assert.equal(g.state.events[collapseKey(m.id,2,1)],undefined);g.teleport(m.id,1,1);assert.equal(g.state.events[collapseKey(m.id,2,1)],1);const save=JSON.parse(g.save());save.state.events[collapseKey(m.id,1,1)]=1;assert.ok(validateSave(save,d).some(e=>e.includes('崩れたセル')));
});
