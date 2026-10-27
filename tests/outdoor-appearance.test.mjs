import test from 'node:test';
import assert from 'node:assert/strict';
import {loadContent} from '../src/core/loader.js';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {validateContent} from '../src/core/validation.js';
import {OUTDOOR_THEMES} from '../src/core/outdoor-appearance.js';
import {OUTDOOR_PALETTES} from '../src/view/outdoor.js';
import {traceDungeonRay} from '../src/view/dungeon.js';
import {data,read,drain} from './oddland-helpers.mjs';
const old=structuredClone(data);for(const map of Object.values(old.maps))delete map.outdoor;
function at(content,id){const g=new GameEngine(content,1907);drain(g);g.state.worldTravel.registrations.oddland_entry=true;g.teleport(id,1,1,'east');return g;}

test('all second-edition outdoor themes have renderers; the first edition has none',async()=>{
  assert.deepEqual(Object.keys(OUTDOOR_PALETTES).sort(),[...OUTDOOR_THEMES].sort());
  assert.deepEqual(Object.values(data.maps).filter(m=>m.outdoor).map(m=>m.outdoor).sort(),[...OUTDOOR_THEMES].sort());
  const first=await loadContent(read);assert.ok(Object.values(first.maps).every(m=>m.outdoor===undefined));
  for(const id of ['region_4_f1','region_5_f1','region_8_f1']){const d=projectGame(at(data,id)).dungeon;assert.equal(d.outdoor,undefined);assert.ok(d.wall?.url&&d.floorArt?.url);}
  for(const id of ['e2_observatory_rescue','e2_sunken_inn']){const d=projectGame(at(data,id)).dungeon;assert.equal(d.outdoor,undefined);assert.equal(d.indoor,id.slice(3));}
});
test('outdoor appearance changes neither collision, occlusion, lighting nor save state',()=>{
  for(const theme of OUTDOOR_THEMES){
    const id='e2_'+theme,a=at(old,id),b=at(data,id),before=JSON.parse(a.save()),pa=projectGame(a).dungeon,pb=projectGame(b).dungeon;
    assert.deepEqual(JSON.parse(b.save()),before,id);b.load(a.save());assert.deepEqual(JSON.parse(b.save()),before,id);
    assert.equal(pb.outdoor,theme);assert.equal(pb.wall,null);assert.equal(pb.floorArt,null);
    assert.deepEqual(pb.geometry,pa.geometry,id);assert.deepEqual(pb.boundaries,pa.boundaries,id);assert.deepEqual(pb.lighting,pa.lighting,id);
    for(let y=0;y<b.map().tiles.length;y++)for(let x=0;x<b.map().tiles[y].length;x++){
      assert.equal(b.walkable(b.map(),x,y),a.walkable(a.map(),x,y),`${id} ${x},${y}`);
      const {art:oldArt,...oldCell}=pa.cells[y][x],{art:newArt,...newCell}=pb.cells[y][x];
      assert.deepEqual(newCell,oldCell);assert.equal(newArt,null);
    }
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1]])assert.deepEqual(traceDungeonRay(pa,1.5,1.5,dx,dy),traceDungeonRay(pb,1.5,1.5,dx,dy));
    for(const direction of ['forward','right','forward','left']){assert.equal(b.dispatch({type:'move',direction}),a.dispatch({type:'move',direction}));drain(a);drain(b);assert.deepEqual(JSON.parse(b.save()),JSON.parse(a.save()));}
  }
});
test('outdoor metadata rejects unknown themes and leaves explicit cell artwork intact',()=>{
  const invalid=structuredClone(data);invalid.maps.e2_market_road.outdoor='typo';assert.ok(validateContent(invalid).some(e=>e.includes('e2_market_road: 屋外描画')));
  const g=at(data,'e2_market_road'),before=g.save(),vm=projectGame(g);vm.dungeon.cells[1][1].parameters.safe=false;assert.equal(g.save(),before);
  const explicit=structuredClone(data);explicit.maps.e2_market_road.cells.overrides['1,1'].visual={image:'location_square'};
  assert.equal(projectGame(at(explicit,'e2_market_road')).dungeon.cells[1][1].art.url,data.assets.images.location_square);
});
