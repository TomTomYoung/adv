import test from 'node:test';
import assert from 'node:assert/strict';
import {loadContent} from '../src/core/loader.js';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {validateContent} from '../src/core/validation.js';
import {INDOOR_THEMES} from '../src/core/indoor-appearance.js';
import {INDOOR_PALETTES,paintIndoorWater} from '../src/view/indoor.js';
import {traceDungeonRay} from '../src/view/dungeon.js';
import {data,read,drain,walk} from './oddland-helpers.mjs';
const old=structuredClone(data);for(const map of Object.values(old.maps))delete map.indoor;
function at(content,id){const g=new GameEngine(content,1907);drain(g);g.state.worldTravel.registrations.oddland_entry=true;g.teleport(id,1,1,'east');return g;}

test('enclosed-site themes are complete, edition-specific and separate from outdoor maps',async()=>{
  assert.deepEqual(Object.keys(INDOOR_PALETTES).sort(),[...INDOOR_THEMES].sort());
  assert.deepEqual(Object.values(data.maps).filter(m=>m.indoor).map(m=>m.indoor).sort(),[...INDOOR_THEMES].sort());
  const first=await loadContent(read);assert.ok(Object.values(first.maps).every(m=>m.indoor===undefined));
  for(const map of Object.values(data.maps).filter(m=>m.outdoor)){assert.equal(map.indoor,undefined);assert.equal(projectGame(at(data,map.id)).dungeon.outdoor,map.outdoor);}
  for(const id of ['region_1_f1','region_4_f1','region_5_f1']){const d=projectGame(at(data,id)).dungeon;assert.equal(d.indoor,undefined);assert.ok(d.wall?.url&&d.floorArt?.url);}
});
test('all nine enclosed appearances preserve geometry, lighting, water, progression and old saves',()=>{
  for(const theme of INDOOR_THEMES){
    const id='e2_'+theme,a=at(old,id),b=at(data,id),before=JSON.parse(a.save()),pa=projectGame(a).dungeon,pb=projectGame(b).dungeon;
    assert.deepEqual(JSON.parse(b.save()),before,id);b.load(a.save());assert.deepEqual(JSON.parse(b.save()),before,id);
    assert.equal(pb.indoor,theme);assert.equal(pb.wall,null);assert.equal(pb.floorArt,null);assert.equal(pb.outdoor,undefined);
    assert.deepEqual(pb.geometry,pa.geometry,id);assert.deepEqual(pb.boundaries,pa.boundaries,id);assert.deepEqual(pb.lighting,pa.lighting,id);
    for(let y=0;y<b.map().tiles.length;y++)for(let x=0;x<b.map().tiles[y].length;x++){
      assert.equal(b.walkable(b.map(),x,y),a.walkable(a.map(),x,y),`${id} ${x},${y}`);
      const {art:oldArt,...oldCell}=pa.cells[y][x],{art:newArt,...newCell}=pb.cells[y][x];assert.deepEqual(newCell,oldCell);assert.equal(newArt,null);
    }
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1]])assert.deepEqual(traceDungeonRay(pa,1.5,1.5,dx,dy),traceDungeonRay(pb,1.5,1.5,dx,dy));
    for(const direction of ['forward','right','forward','left']){assert.equal(b.dispatch({type:'move',direction}),a.dispatch({type:'move',direction}));drain(a);drain(b);assert.deepEqual(JSON.parse(b.save()),JSON.parse(a.save()));}
  }
});
test('water atmosphere follows actual depth, air consumption and pockets after save/resume',()=>{
  for(const id of ['e2_sunken_inn','e2_observatory_rescue']){
    const g=at(data,id),air=()=>g.state.dungeons.active.systems.air.air,depth=()=>{const d=projectGame(g).dungeon;return d.cells[d.location.y][d.location.x].waterDepth;};
    assert.equal(depth(),0);assert.equal(air(),64);
    assert.ok(g.dispatch({type:'move',direction:'forward'}));drain(g);assert.equal(depth(),3);assert.equal(air(),63);
    const before=g.save();g.load(before);assert.equal(g.save(),before);assert.equal(depth(),3);assert.equal(air(),63);
    const calls=[],ctx={fillRect(...args){calls.push(args);}};paintIndoorWater(ctx,depth(),g.state.location,800,400);assert.ok(calls.length>0);assert.equal(g.save(),before);
    const [x,y]=id==='e2_observatory_rescue'?[7,3]:[1,1];walk(g,x,y);assert.equal(depth(),0);assert.equal(air(),64);
    calls.length=0;paintIndoorWater(ctx,depth(),g.state.location,800,400);assert.equal(calls.length,0);
    const pocket=g.save();g.load(pocket);assert.equal(g.save(),pocket);assert.equal(depth(),0);
  }
});
test('indoor validation rejects unknown or mixed themes and preserves explicit cell artwork',()=>{
  for(const edit of [m=>m.indoor='typo',m=>m.outdoor='market_road']){
    const invalid=structuredClone(data);edit(invalid.maps.e2_trade_corridor);assert.ok(validateContent(invalid).some(e=>e.includes('e2_trade_corridor')&&e.includes('描画テーマ')));
  }
  const explicit=structuredClone(data);explicit.maps.e2_trade_corridor.cells.overrides['1,1'].visual={image:'location_square'};
  const g=at(explicit,'e2_trade_corridor');assert.equal(projectGame(g).dungeon.cells[1][1].art.url,data.assets.images.location_square);
});
