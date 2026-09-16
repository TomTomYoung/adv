import test from 'node:test';
import assert from 'node:assert/strict';
import {SIX_FACES,neighbor,voxelAt,sharedFace,freshVoxelState,redistributeWater,voxelDepth,floodRegions} from '../src/core/voxels.js';
const p=(x,y=0,z=0)=>({x,y,z});
const rules=(water,support=false)=>({passage:water,water,support});
function tank(layers){
 const m={id:'tank',tiles:layers[0],voxels:{version:1,minZ:0,layers,faces:[],links:[],devices:[],initialWater:[]}},seen=new Set();
 for(let z=0;z<layers.length;z++)for(let y=0;y<layers[z].length;y++)for(let x=0;x<layers[z][y].length;x++)if(layers[z][y][x]==='.')for(const side of Object.keys(SIX_FACES)){
  const at=p(x,y,z),q=neighbor(at,side),key=sharedFace(at,q);if(voxelAt(m,null,q)!==null||seen.has(key))continue;seen.add(key);m.voxels.faces.push({id:`face_${m.voxels.faces.length}`,at,side,closed:rules(false,side==='down'),open:rules(true),initiallyOpen:false});
 }return m;
}
const flood=(m,s,at,amount)=>{const r=redistributeWater(m,s,[{at,amount}]);assert.equal(r.rejected,0);return {...s,water:r.water,drained:s.drained+r.drained};};
test('one operation raises the entire horizontal closed region, independent of its area',()=>{
 for(const n of [1,2,5]){const m=tank([['.'.repeat(n)]]);let s=freshVoxelState(m);for(const level of [2,4,6,8,10]){s=flood(m,s,p(0),2);assert.deepEqual(Object.values(s.water),Array(n).fill(level));}s=flood(m,s,p(0),2);assert.deepEqual(Object.values(s.water),Array(n).fill(10));assert.equal(voxelDepth(s,p(0)),3);}
});
test('an open ceiling does not prevent holding water, while a downward opening does',()=>{
 const m=tank([['.']]);let s=freshVoxelState(m);s.faces[m.voxels.faces.find(f=>f.side==='up').id]=true;s=flood(m,s,p(0),4);assert.equal(s.water['0,0,0'],4);
 s.faces[m.voxels.faces.find(f=>f.side==='down').id]=true;const r=redistributeWater(m,s);assert.deepEqual(r.water,{});assert.equal(r.drained,1);
});
test('water operations recursively bypass every region with a downward permeable hole',()=>{
 const m=tank([['..'],['..'],['..']]);let s=freshVoxelState(m);s=flood(m,s,p(0,0,2),3);
 assert.deepEqual(s.water,{'0,0,0':3,'1,0,0':3});s=flood(m,s,p(1,0,2),2);assert.deepEqual(s.water,{'0,0,0':5,'1,0,0':5});assert.equal(floodRegions(m,s).regions.length,3);
});
test('several downward holes reaching the same lower region apply one increment, not one per hole',()=>{
 const m=tank([['...'],['...']]);let s=flood(m,freshVoxelState(m),p(1,0,1),2);assert.deepEqual(Object.values(s.water),[2,2,2]);
 for(const at of [p(0,0,1),p(1,0,1),p(2,0,1)])m.voxels.faces.push({id:`lid_${at.x}`,at,side:'down',closed:rules(false,true),open:rules(true),initiallyOpen:false});
 s=flood(m,s,p(1,0,1),1);assert.equal(s.water['1,0,1'],1);assert.equal(s.water['1,0,0'],2);
});
test('horizontal water barriers divide regions; opening and re-closing retains regional depth without upward spill',()=>{
 const m=tank([['..'],['##']]);m.voxels.faces.push({id:'gate',at:p(0),side:'east',closed:rules(false),open:rules(true),initiallyOpen:false});let s=flood(m,freshVoxelState(m),p(0),6);assert.equal(s.water['1,0,0'],undefined);
 s.faces.gate=true;s={...s,water:redistributeWater(m,s).water};assert.deepEqual(s.water,{'0,0,0':6,'1,0,0':6});s.faces.gate=false;assert.deepEqual(redistributeWater(m,s).water,s.water);
});
