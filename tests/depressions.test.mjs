import test from 'node:test';
import assert from 'node:assert/strict';
import {data,drain} from './helpers.mjs';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {validateContent} from '../src/core/validation.js';
import {traceDungeonRay} from '../src/view/dungeon.js';
import {floorElevation,eyeElevation,stepFace,traceFloorSegments,sampleRelief} from '../src/view/dungeon-relief.js';
import {Workspace} from '../config/shared/studio/workspace.js';
import {EditorContext} from '../config/shared/studio/context.js';
import {paintCell} from '../config/shared/studio/map-model.js';
import {setComponentField} from '../config/shared/studio/map-components.js';
import fs from 'node:fs/promises';
const dry=['shallow_depression','deep_depression','bottomless_depression'],ids=[...dry,...dry.map(id=>id+'_water')];
function setup(){
 const d=structuredClone(data),g=new GameEngine(d);drain(g);g.random=()=>.9999;
 const m=d.maps.region_2_f1;m.objects=[];m.encounterRate=0;g.teleport(m.id,1,1,'east');
 return {d,g,m};
}
function put(d,m,x,y,id){m.cells.overrides[`${x},${y}`]=structuredClone(d.cellTypes[id]);m.tiles[y]=m.tiles[y].slice(0,x)+d.cellTypes[id].passage+m.tiles[y].slice(x+1);}
const plain={floor:true,illumination:8},shallow={...plain,relief:{depth:.3,bottomless:false,waterLevel:null}},deep={...plain,relief:{depth:1.5,bottomless:false,waterLevel:null}},abyss={floor:false,relief:{depth:0,bottomless:true,waterLevel:null}};
function room(){return {cells:Array.from({length:7},()=>Array.from({length:7},()=>({...plain}))),geometry:['#######','#.....#','#.....#','#.....#','#.....#','#.....#','#######']};}

test('six authored presets project independent floor heights, bottom visibility and water planes',()=>{
 const {d,g,m}=setup();
 for(const id of ids){put(d,m,2,1,id);const before=g.save(),c=projectGame(g).dungeon.cells[1][2];
  assert.equal(c.wall,false);assert.equal(c.opaque,false);assert.equal(c.relief.bottomless,id.startsWith('bottomless'));
  assert.equal(c.relief.depth,id.startsWith('shallow')?.3:id.startsWith('deep')?1.5:0);
  assert.equal(c.relief.waterLevel,id.endsWith('_water')?-.1:null);
  assert.equal(c.blocked,!id.startsWith('shallow'));assert.equal(g.save(),before);
 }
});
test('shallow dry/wet floors allow real movement and save reload; deeper defaults stop movement without a step',()=>{
 for(const id of ids){const {d,g,m}=setup();put(d,m,2,1,id);const steps=g.state.steps,ok=g.dispatch({type:'move',direction:'forward'});
  assert.equal(ok,id.startsWith('shallow'));assert.equal(g.state.steps,steps+(ok?1:0));assert.equal(g.state.location.x,ok?2:1);
  const saved=g.save();g.load(saved);assert.equal(g.state.location.x,ok?2:1);
  // Authoring passage remains independent of display height.
  if(!ok){m.cells.overrides['2,1'].passage='.';m.tiles[1]=m.tiles[1].slice(0,2)+'.'+m.tiles[1].slice(3);assert.equal(g.walkable(m,2,1),true);}
 }
});
test('equal depth eliminates interior sides; differing depth emits only the height difference',()=>{
 assert.equal(stepFace(shallow,shallow),null);assert.equal(stepFace(abyss,abyss),null);
 assert.equal(stepFace(shallow,{...shallow,surface:'wood',waterDepth:1}),null);
 assert.ok(Math.abs(floorElevation(shallow)+.1)<1e-8);assert.equal(eyeElevation(shallow),.4);
 const f=stepFace(shallow,deep);assert.ok(Math.abs(f.top+.1)<1e-8);assert.equal(f.bottom,-.5);
 assert.equal(stepFace(plain,abyss).bottom,-Infinity);
});
test('single, joined, square and L shapes retain only their outer perimeter including concave corners',()=>{
 for(const [points,perimeter] of [[[[3,3]],4],[[[3,3],[4,3]],6],[[[3,3],[4,3],[3,4],[4,4]],8],[[[3,3],[3,4],[4,4]],8]]){
  const d=room();for(const [x,y] of points)d.cells[y][x]=shallow;
  let faces=0;for(const [x,y] of points)for(const [dx,dy] of [[0,1],[1,0],[0,-1],[-1,0]])if(stepFace(d.cells[y][x],d.cells[y+dy][x+dx]))faces++;
  assert.equal(faces,perimeter);
 }
});
test('all four viewing directions trace lowered floors and finite cliff faces; same-level seam is absent',()=>{
 for(const [ox,oy,dx,dy] of [[3.5,5.5,0,-1],[1.5,3.5,1,0],[3.5,1.5,0,1],[5.5,3.5,-1,0]]){
  const d=room();d.cells[3][3]=deep;const hit=traceDungeonRay(d,ox,oy,dx,dy),segments=traceFloorSegments(d,ox,oy,dx,dy,hit.distance);
  const pit=segments.find(s=>s.cell===deep);assert.ok(pit);assert.equal(pit.face.top,0);assert.equal(pit.face.bottom,-.5);
  const slope=(-.5-.5)/((pit.start+pit.end)/2),sample=sampleRelief(segments,.5,slope);
  assert.ok(sample.solid);assert.ok(['floor','side'].includes(sample.solid.kind));
 }
 const d=room();d.cells[3][2]=deep;d.cells[3][3]=deep;const s=traceFloorSegments(d,1.5,3.5,1,0,4.5);assert.equal(s.find(v=>v.start===.5).face,null);
});
test('bottomless holes have no floor intersection; water is horizontal, transparent overlay and occluded by foreground',()=>{
 const segments=[{start:0,end:16,cell:abyss,face:null,side:'x'}];assert.equal(sampleRelief(segments,.5,-.5).solid,null);
 const wet={...abyss,relief:{...abyss.relief,waterLevel:-.1}};segments[0].cell=wet;
 const sample=sampleRelief(segments,.5,-.5);assert.equal(sample.solid,null);assert.ok(sample.water);assert.equal(sample.water.level,-.1/3);
 assert.equal(sampleRelief([{start:0,end:2,cell:plain},{start:2,end:16,cell:wet}],.5,-.5).water,null);
 const distant=traceFloorSegments({cells:[[abyss,abyss]]},.5,.5,1,0,1,false);assert.equal(distant.at(-1).face,null);
});
test('partitions stop the relief ray and extend to a depressed floor without revealing water behind them',()=>{
 const d=room();d.cells[3][2]=deep;d.cells[3][3]={...shallow,relief:{...shallow.relief,waterLevel:-.1}};d.boundaries={'2,3/east':true};
 const hit=traceDungeonRay(d,2.5,3.5,1,0),s=traceFloorSegments(d,2.5,3.5,1,0,hit.distance);
 assert.equal(hit.distance,.5);assert.equal(s.length,1);assert.equal(s[0].face.bottom,-.5);assert.equal(sampleRelief(s,.5,-.8).water,null);
});
test('all six brushes export from the actual editor model, including fractional depth and negative water level',async()=>{
 const read=file=>fs.readFile(new URL('../'+file,import.meta.url),'utf8'),w=new Workspace(read),context=new EditorContext(w,read);await context.ensureMap('region_2_f1');
 for(const id of ids){paintCell(w,'region_2_f1',2,1,id,'reset');const source=w.value('cell-layers.json'),m=source.maps.region_2_f1;assert.equal(m.legend[m.rows[1][2]],id);}
 setComponentField(w,'region_2_f1',{x:2,y:1},['parameters','floor_depth'],.45);setComponentField(w,'region_2_f1',{x:2,y:1},['parameters','water_level'],-.2);
 const json=JSON.parse(JSON.stringify(w.value('cell-layers.json')));assert.equal(json.maps.region_2_f1.overrides['2,1'].parameters.floor_depth,.45);assert.equal(json.maps.region_2_f1.overrides['2,1'].parameters.water_level,-.2);
});
test('invalid depth, bottom flag, water height and water below a finite floor are rejected',()=>{
 for(const patch of [{floor_depth:-.1},{floor_depth:'0.3'},{floor_depth:31},{bottomless:1},{water_level:.1},{water_level:-31},{floor_depth:.3,water_depth:1,water_level:-.5}]){
  const d=structuredClone(data);Object.assign(d.cellTypes.shallow_depression.parameters,patch);assert.ok(validateContent(d).length,JSON.stringify(patch));
 }
});

test('diagonally touching deep cells do not leak through higher floors at the shared corner',()=>{
 const d=room();d.cells[2][2]=deep;d.cells[3][3]=deep;
 let segment=traceFloorSegments(d,2.5,2.5,1,1,2,false)[0];assert.equal(segment.face.top,0);assert.equal(segment.face.bottom,-.5);
 d.cells[2][3]=deep;d.cells[3][2]=deep;segment=traceFloorSegments(d,2.5,2.5,1,1,2,false)[0];assert.equal(segment.face,null);
});
