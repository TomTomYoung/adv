import test from 'node:test';
import assert from 'node:assert/strict';
import {generateDungeonCandidate, normalizeDungeonLayout} from '../src/core/dungeon-generator.js';
import {featureAlgorithms, terrainAlgorithms} from '../src/core/dungeon-terrain.js';

const base={width:35,height:29,corridorWidth:1,extraLoops:{min:1,max:2}};

test('all optional terrain algorithms are deterministic and connected',()=>{
  for(const algorithm of terrainAlgorithms.filter(v=>v!=='classic')){
    const layout={...base,mode:'corridors',terrain:{algorithm,options:{noise:{warp:1.2,octaves:4},cellular:{fill:.47,steps:4},randomWalk:{fill:.42},bsp:{depth:4,minLeaf:6},voronoi:{fill:.58,sites:10}}},bulges:{count:{min:0,max:0}},rooms:{count:{min:0,max:0}}};
    const a=generateDungeonCandidate({seed:20261002,candidateIndex:2,layout});
    const b=generateDungeonCandidate({seed:20261002,candidateIndex:2,layout});
    assert.deepEqual(a,b,algorithm);
    assert.equal(a.validation.ok,true,`${algorithm}: ${a.validation.errors.join('; ')}`);
    assert.equal(a.terrainAlgorithm,algorithm);
    assert.ok(a.metrics.floorCount>10,algorithm);
  }
});

test('room masks can use every feature algorithm plus independent modifiers',()=>{
  for(const featureAlgorithm of featureAlgorithms){
    const layout={...base,mode:'rooms',terrain:{algorithm:'classic'},bulges:{count:{min:0,max:0}},rooms:{count:{min:3,max:3},width:{min:7,max:11},height:{min:7,max:11},minArea:6,wallThickness:1,mirror:true,entrances:{min:1,max:2},shapes:[{id:'rectangle',weight:2},{id:'l_shape',weight:1},{id:'roundish',weight:1}],featureAlgorithm,shapeOptions:{asymmetry:{enabled:true,strength:.55},dropout:{enabled:true,rate:.06},booleanOps:{enabled:true,count:2},noiseBlend:{enabled:featureAlgorithm!=='noise',op:'union',warp:.7,octaves:3}}}};
    const out=generateDungeonCandidate({seed:8128,candidateIndex:1,layout});
    assert.equal(out.validation.ok,true,`${featureAlgorithm}: ${out.validation.errors.join('; ')}`);
    assert.ok(out.rooms.length>=3,featureAlgorithm);
    assert.ok(out.rooms.every(room=>room.generator===featureAlgorithm),featureAlgorithm);
  }
});

test('large bulges can be promoted to room regions without changing the bulge option model',()=>{
  let promoted=null;
  for(let candidateIndex=0;candidateIndex<32&&!promoted;candidateIndex+=1){
    const out=generateDungeonCandidate({seed:4455,candidateIndex,layout:{...base,mode:'bulges',terrain:{algorithm:'classic'},bulges:{count:{min:1,max:1},positions:['along_corridor','dead_end'],addedArea:{min:10,max:14},minSpacing:1,promoteToRoomArea:4,featureAlgorithm:'boolean',shapeOptions:{asymmetry:{enabled:true,strength:.8},booleanOps:{enabled:true,count:2},dropout:{enabled:true,rate:.04}}},rooms:{count:{min:0,max:0}}}});
    promoted=out.bulges.find(b=>b.promotedToRoom);
    if(promoted){assert.ok(out.rooms.some(room=>room.source==='bulge'));assert.ok(promoted.cells.length>=4);}
  }
  assert.ok(promoted,'expected at least one promoted bulge in fixed candidate range');
});

test('new algorithm options remain optional and invalid identifiers are rejected',()=>{
  const classic=normalizeDungeonLayout({mode:'rooms'});
  assert.equal(classic.terrain.algorithm,'classic');
  assert.equal(classic.rooms.featureAlgorithm,'primitive');
  assert.throws(()=>normalizeDungeonLayout({mode:'rooms',terrain:{algorithm:'unknown'}}),/unsupported terrain algorithm/);
  assert.throws(()=>normalizeDungeonLayout({mode:'rooms',rooms:{featureAlgorithm:'unknown'}}),/unsupported room feature algorithm/);
});
