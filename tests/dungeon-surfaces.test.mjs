import test from 'node:test';
import assert from 'node:assert/strict';
import {data,newGame} from './helpers.mjs';
import {projectGame} from '../src/application/projection.js';
import {validateContent} from '../src/core/validation.js';
import {traceDungeonRay,visibleDungeonObjects} from '../src/view/dungeon.js';
const wait=(g,n)=>{for(let i=0;i<n;i++)assert.ok(g.dispatch({type:'dungeon.action',system:'water',action:'wait'}));};
const begin=()=>{const g=newGame();g.dispatch({type:'travel',region:1});g.teleport('region_1_f1',3,1,'south');return g;};

test('shallow water has a surface and remains traversable instead of disappearing from the picture',()=>{
 const g=begin();wait(g,24);const d=projectGame(g).dungeon,c=d.cells[2][3];assert.equal(c.waterDepth,1);assert.equal(c.water,true);assert.equal(c.blocked,false);assert.equal(d.geometry[2][3],'.');assert.match(d.surfaceNotice.text,/足元まで・通行可/);
 assert.ok(g.dispatch({type:'move',direction:'forward'}));assert.equal(g.state.location.y,2);
});
test('full water blocks movement but not the sightline, and the displayed wait action restores the route',()=>{
 const g=begin();g.state.dungeons.active.systems.water.elapsed=70;const d=projectGame(g).dungeon,c=d.cells[2][3];assert.equal(c.waterDepth,3);assert.equal(c.blocked,true);assert.equal(d.geometry[2][3],'.');
 const hit=traceDungeonRay(d,3.5,1.5,0,1);assert.ok(hit.distance>.5);assert.match(d.surfaceNotice.text,/完全水没・通行不可/);assert.ok(d.surfaceNotice.action.enabled);
 const before=structuredClone({location:g.state.location,steps:g.state.steps,dungeons:g.state.dungeons});assert.equal(g.dispatch({type:'move',direction:'forward'}),false);assert.deepEqual({location:g.state.location,steps:g.state.steps,dungeons:g.state.dungeons},before);
 for(let i=0;i<6;i++)assert.ok(g.dispatch(projectGame(g).dungeon.surfaceNotice.action.intent));assert.ok(projectGame(g).dungeon.cells[2][3].waterDepth<3);assert.ok(g.dispatch({type:'move',direction:'forward'}));
});
test('closing the matching channel valve removes water visually and opens the same cells in the engine',()=>{
 const g=begin();g.teleport('region_1_f1',2,3,'west');wait(g,48);let d=projectGame(g).dungeon;assert.equal(d.cells[3][4].waterDepth,3);assert.equal(g.walkable(g.map(),4,3),false);
 assert.ok(g.dispatch({type:'dungeon.action',system:'water',action:'close',target:'upper_valve'}));d=projectGame(g).dungeon;assert.equal(d.cells[3][4].waterDepth,0);assert.equal(d.cells[3][4].water,false);assert.equal(d.cells[3][4].blocked,false);assert.equal(g.walkable(g.map(),4,3),true);
});
test('water markers stay on the surface and climbing markers do not acquire water-valve artwork',()=>{
 const g=begin();wait(g,24);assert.ok(projectGame(g).dungeon.objects.filter(o=>o.kind==='water').every(o=>o.art===null));
 g.teleport('region_1_f1',1,1,'east');assert.ok(g.dispatch({type:'dungeon.action',system:'space',action:'visit',target:'shaft_access'}));g.teleport('waterworks_shaft',2,2,'east',0);
 const links=projectGame(g).dungeon.objects.filter(o=>o.kind==='voxel_link');assert.ok(links.length);assert.ok(links.every(o=>o.art===null));
});
test('solid terrain, closed object doors and thin boundary walls retain their sightline occlusion',()=>{
 const g=begin();g.data=structuredClone(data);g.map().objects.push({id:'test_door',name:'試験扉',kind:'door',x:3,y:2,blocking:true,initialState:'closed'});
 let d=projectGame(g).dungeon;assert.equal(d.geometry[2][3],'#');assert.equal(traceDungeonRay(d,3.5,1.5,0,1).distance,.5);
 g.state.objects['region_1_f1/test_door']='open';d=projectGame(g).dungeon;assert.equal(d.geometry[2][3],'.');assert.ok(traceDungeonRay(d,3.5,1.5,0,1).distance>.5);
 d.boundaries={'3,1/south':true,'3,2/north':true};assert.equal(traceDungeonRay(d,3.5,1.5,0,1).distance,.5);assert.equal(traceDungeonRay(d,3.5,2.5,0,-1).distance,.5);
});
test('rays at an exact grid corner cannot leak through touching walls',()=>{
 const d={geometry:['#####','#.###','##..#','#####']};const hit=traceDungeonRay(d,1.5,1.5,1,1);assert.equal(hit.distance,.5);
 const open={geometry:['####','#..#','#..#','####'],boundaries:{'2,1/south':true}};assert.equal(traceDungeonRay(open,1.5,1.5,1,1).distance,.5);
});
test('floor material reaches all 13 dungeon projections and is detached from authored data',()=>{
 const g=newGame();for(const dungeon of Object.values(data.dungeons)){g.dispatch({type:'travel',dungeon:dungeon.id});const vm=projectGame(g);assert.ok(vm.dungeon.floorArt.url);assert.ok(vm.dungeon.floorArt.rect.width>0);const before=g.save();vm.dungeon.floorArt.rect.x=100;assert.ok(dungeon.art.floor.rect.x<1);assert.equal(g.save(),before);g.returnTown();}
});
test('invalid floor images and sampling rectangles are rejected',()=>{
 for(const change of [floor=>floor.asset='missing',floor=>floor.rect.width=2,floor=>floor.rect.y=-1]){const d=structuredClone(data);change(d.dungeons.region_1.art.floor);assert.ok(validateContent(d).some(e=>e.includes('素材')));}
});
test('sunken castle water is shown with its existing air-based traversal permission',()=>{
 const g=newGame();g.dispatch({type:'travel',region:7});const d=projectGame(g).dungeon,cell=d.cells.flat().find(c=>c.waterDepth===3&&!c.blocked);assert.ok(cell);assert.equal(d.geometry[cell.y][cell.x],'.');assert.ok(g.walkable(g.map(),cell.x,cell.y));
});


test('sideways devices never float in the forward view, and closed faces hide the far-side device',()=>{
 const d={location:{x:2,y:2,facing:'south'},objects:[{id:'left',x:3,y:2},{id:'right',x:1,y:2},{id:'back',x:2,y:1},{id:'front',x:2,y:3},{id:'feet',x:2,y:2},{id:'water',kind:'water',x:2,y:3}]};
 assert.deepEqual(visibleDungeonObjects(d).map(o=>o.id),['front','feet']);d.boundaries={'2,2/south':true};assert.deepEqual(visibleDungeonObjects(d).map(o=>o.id),['feet']);
});
