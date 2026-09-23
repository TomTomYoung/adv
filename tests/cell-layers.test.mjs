import test from 'node:test';
import assert from 'node:assert/strict';
import {data,drain} from './helpers.mjs';
import {GameEngine} from '../src/core/engine.js';
import {authoredCellLayers,cellEventKey} from '../src/core/cell-layers.js';
import {dungeonCell,dungeonTile,dungeonWaterDepth} from '../src/core/dungeons.js';
import {projectGame} from '../src/application/projection.js';
import {traceDungeonRay} from '../src/view/dungeon.js';
import {validateContent} from '../src/core/validation.js';
import {validateSave} from '../src/core/save.js';

function game(map='region_2_f1'){
  const d=structuredClone(data),g=new GameEngine(d);drain(g);
  for(const m of Object.values(d.maps)){m.encounterRate=0;m.objects=m.objects.filter(o=>!o.quest);}
  g.teleport(map,1,1,'east');g.random=()=>.99999;return {g,d,m:g.map()};
}
const step=(g,direction)=>assert.ok(g.dispatch({type:'move',direction}));
const checkpoint=g=>{const save=g.save();assert.deepEqual(validateSave(JSON.parse(save),g.data),[]);g.load(save);assert.equal(g.save(),save);};
function override(m,x,y,patch){m.cells.overrides[`${x},${y}`]=patch;if(patch.passage){const row=[...m.tiles[y]];row[x]=patch.passage;m.tiles[y]=row.join('');}}
function hazard({once=false,condition=true,commands}={}){
  const ctx=game(),{d,m}=ctx;m.objects=[];
  d.cellEvents.poison={trigger:'enter',script:'test.cell.poison',once,condition};
  d.scripts['test.cell.poison']={commands:commands??[{op:'actor.damage',target:'party',amount:3},{op:'narrate',text:'毒の沼地を踏んだ。'}]};
  d.cellTypes.poison_swamp={...structuredClone(d.cellTypes.stone_floor),events:['poison'],parameters:{illumination:0,water_passable:true,toxic:true}};
  m.cells.legend.P='poison_swamp';m.cells.rows[1]=m.cells.rows[1].slice(0,2)+'PP'+m.cells.rows[1].slice(4);
  return ctx;
}

test('all current maps resolve explicit presets and preserve the existing passage projection',()=>{
  assert.equal(data.game.cellLayerVersion,1);assert.equal(Object.keys(data.maps).length,33);
  for(const m of Object.values(data.maps))for(let y=0;y<m.tiles.length;y++)for(let x=0;x<m.tiles[y].length;x++)assert.equal(authoredCellLayers(data,m,x,y).passage,m.tiles[y][x]);
  assert.deepEqual(validateContent(data),[]);
});
test('an impassable cell can retain a floor and transmit light without becoming a wall',()=>{
  const {g,m}=game();override(m,2,1,{passage:'#',parameters:{water_passable:true}});
  const d=projectGame(g).dungeon,c=d.cells[1][2];
  assert.equal(g.walkable(m,2,1),false);assert.equal(c.blocked,true);assert.equal(c.wall,false);assert.equal(c.floor,true);assert.equal(c.opaque,false);assert.equal(d.geometry[1][2],'.');
  assert.ok(traceDungeonRay(d,1.5,1.5,1,0).distance>.5);assert.ok(d.cells[1][3].illumination>0);
  assert.equal(g.dispatch({type:'move',direction:'forward'}),false);assert.equal(g.state.location.x,1);
});
test('opacity, material, ambient illumination and per-cell overrides do not change passage',()=>{
  const {g,d,m}=game();override(m,2,1,{visual:{opaque:true,image:'slime'},parameters:{illumination:5,water_passable:false}});
  const vm=projectGame(g).dungeon,c=vm.cells[1][2];
  assert.ok(g.walkable(m,2,1));assert.equal(c.wall,false);assert.equal(c.floor,true);assert.equal(c.opaque,true);assert.equal(c.art.url,d.assets.images.slime);assert.equal(traceDungeonRay(vm,1.5,1.5,1,0).distance,.5);assert.equal(vm.cells[1][3].illumination,0);
  g.state.light=0;assert.equal(projectGame(g).dungeon.cells[1][2].illumination,5);
  const before=JSON.stringify(d.cellTypes);c.parameters.illumination=8;c.art.rect.width=.1;assert.equal(JSON.stringify(d.cellTypes),before);assert.equal(m.cells.overrides['2,1'].parameters.illumination,5);
  step(g,'forward');assert.equal(g.state.location.x,2);
});
test('compartment water uses its explicit water layer, independently of passage',()=>{
  const {g,d}=game('region_1_f1'),water=d.dungeons.region_1.systems.water,zone=water.zones.find(z=>z.initiallyFlooded),m=d.maps[zone.map];
  const y=m.tiles.findIndex(r=>r.includes('.')),x=m.tiles[y].indexOf('.');
  override(m,x,y,{passage:'#',parameters:{water_passable:true}});assert.equal(dungeonWaterDepth(d,g.state,m,x,y),3);
  // A projection of this compartment must not erase water because of wall artwork.
  g.state.location={map:m.id,x,y,facing:'east'};override(m,x,y,{passage:'#',visual:{wall:true},parameters:{water_passable:true}});
  assert.equal(projectGame(g).dungeon.cells[y][x].waterDepth,3);
  override(m,x,y,{passage:'.',parameters:{water_passable:false}});assert.equal(dungeonWaterDepth(d,g.state,m,x,y),0);
});
test('cell hazards execute a script only on occupation, resume across save and repeat on a new entry',()=>{
  const {g,d,m}=hazard(),hp=g.state.actors.ada.hp;
  step(g,'right');step(g,'left');g.dispatch({type:'interact'});drain(g);if(g.state.waiting?.type==='command')g.dispatch({type:'choose',id:'cancel'});assert.equal(g.state.actors.ada.hp,hp);
  step(g,'forward');assert.equal(g.state.actors.ada.hp,hp-3);assert.equal(g.state.waiting.text,'毒の沼地を踏んだ。');checkpoint(g);drain(g);checkpoint(g);
  step(g,'right');step(g,'left');assert.equal(g.state.actors.ada.hp,hp-3);
  step(g,'back');step(g,'forward');assert.equal(g.state.actors.ada.hp,hp-6);assert.equal(g.state.events[cellEventKey(m.id,2,1,'poison')],2);
  assert.deepEqual(d.cellTypes.poison_swamp.events,['poison']);
});
test('once cell events are tracked per placement, and a condition can read cell parameters',()=>{
  const {g,m}=hazard({once:true,condition:{ref:'cell.parameters.toxic'},commands:[{op:'add',target:'vars.cellVisits',value:1}]});
  step(g,'forward');checkpoint(g);step(g,'back');step(g,'forward');assert.equal(g.state.vars.cellVisits,1);
  step(g,'forward');assert.equal(g.state.vars.cellVisits,2);assert.equal(g.state.events[cellEventKey(m.id,3,1,'poison')],1);
  override(m,4,1,{events:['poison'],parameters:{toxic:false}});step(g,'forward');assert.equal(g.state.vars.cellVisits,2);
});
test('a cell battle pauses later cell events and resumes without repeating rewards or start',()=>{
  const {g,d,m}=hazard({once:true,commands:[{op:'battle.start',encounter:'kuragari_hunt',on_win:[],on_lose:[],on_escape:[],on_interrupt:[],events:[{id:'stop',triggers:['start'],commands:[{op:'narrate',text:'停止前'},{op:'battle.end'}]}]}]});
  d.cellEvents.after={trigger:'enter',script:'test.cell.after',once:true};d.scripts['test.cell.after']={commands:[{op:'gold.change',amount:7},{op:'narrate',text:'停止後'}]};override(m,2,1,{events:['poison','after']});
  const gold=g.state.gold;step(g,'forward');assert.equal(g.state.waiting.text,'停止前');checkpoint(g);g.dispatch({type:'advance'});assert.equal(g.state.battle,null);assert.equal(g.state.waiting.text,'停止後');assert.equal(g.state.gold,gold+7);checkpoint(g);drain(g);assert.equal(g.state.gold,gold+7);
});
test('breaking a current salt wall changes authored passage and visual layers together',()=>{
  const {g,d}=game(),spec=d.dungeons.region_2.systems,system=Object.entries(spec).find(([,s])=>s.use==='breakable_walls'),wall=system[1].walls[0],m=d.maps[wall.map];
  const directions=[[1,0,'west'],[-1,0,'east'],[0,1,'north'],[0,-1,'south']],near=directions.find(([dx,dy])=>g.walkable(m,wall.x+dx,wall.y+dy));assert.ok(near);
  g.teleport(m.id,wall.x+near[0],wall.y+near[1],near[2]);g.give(wall.items[0],1);
  assert.equal(dungeonCell(d,g.state,m,wall.x,wall.y).visual.wall,true);
  assert.ok(g.dispatch({type:'dungeon.action',system:system[0],action:'item',target:wall.id,item:wall.items[0]}));
  assert.equal(dungeonTile(d,g.state,m,wall.x,wall.y),'.');assert.equal(dungeonCell(d,g.state,m,wall.x,wall.y).visual.wall,false);assert.ok(g.walkable(m,wall.x,wall.y));checkpoint(g);
});
test('current plant and terrain patches project all layer changes and restore their authored base',()=>{
  for(const [id,use] of [['region_3','plant_garden'],['region_9','terrain_shift'],['moving_village','terrain_shift']]){
    const {g,d}=game(data.dungeons[id].entries.main.map),[system,spec]=Object.entries(d.dungeons[id].systems).find(([,s])=>s.use===use),persistent=g.state.dungeons.persistent[id].systems[system];
    const plot=spec.plots?.find(p=>p.terrain.bridge),patch=plot?.terrain.bridge[0]??spec.states[1].tiles[0],m=d.maps[patch.map];
    if(plot){const [species,kind]=Object.entries(spec.species).find(([,s])=>s.terrain==='bridge');persistent.plants[plot.id]={species,age:kind.growth};}else persistent.phase=spec.states[1].id;
    assert.equal(dungeonCell(d,g.state,m,patch.x,patch.y).passage,patch.tile);assert.deepEqual(dungeonCell(d,g.state,m,patch.x,patch.y).visual,patch.layers.visual);
    if(plot){delete persistent.plants[plot.id];assert.deepEqual(dungeonCell(d,g.state,m,patch.x,patch.y),authoredCellLayers(d,m,patch.x,patch.y));}
  }
});
test('missing layers, unknown references, duplicate events and invalid overrides are rejected',()=>{
  const mutations=[
    d=>delete d.maps.region_2_f1.cells,
    d=>d.maps.region_2_f1.cells.legend.F='missing',
    d=>d.maps.region_2_f1.cells.rows[1]='F',
    d=>d.maps.region_2_f1.cells.overrides['2,1']=null,
    d=>d.maps.region_2_f1.cells.overrides['200,1']={},
    d=>d.maps.region_2_f1.cells.overrides['2,1']={passage:'#'},
    d=>d.cellTypes.stone_floor.visual.image='missing',
    d=>d.cellTypes.stone_floor.parameters.illumination=9,
    d=>d.cellTypes.stone_floor.parameters.water_passable=1,
    d=>d.cellTypes.stone_floor.events=['missing'],
    d=>d.cellTypes.stone_floor.events={},
    d=>d.cellEvents.bad={trigger:'enter',once:true,script:'missing'},
    d=>{d.cellEvents.test={trigger:'enter',once:false,script:'prologue'};d.cellTypes.stone_floor.events=['test','test'];},
    d=>{const s=Object.values(d.dungeons.region_3.systems).find(s=>s.use==='plant_garden');delete s.plots.find(p=>p.terrain.bridge).terrain.bridge[0].layers;}
  ];
  for(const change of mutations){const d=structuredClone(data);change(d);assert.ok(validateContent(d).length);}
});
