import test from 'node:test';
import assert from 'node:assert/strict';
import {data,newGame,drain} from './helpers.mjs';
import {GameEngine} from '../src/core/engine.js';
import {validateContent} from '../src/core/validation.js';
import {validateSave} from '../src/core/save.js';
import {dungeonActionPlan} from '../src/core/dungeons.js';
import {projectGame} from '../src/application/projection.js';
import {SIX_FACES,neighbor,voxelKey,sharedFace,faceRules,voxelAt,hasFooting,voxelDepth,voxelOccupancyReason,voxelRouteReason,freshVoxelState,redistributeWater} from '../src/core/voxels.js';
const p=(x,y=0,z=0)=>({x,y,z});
const rules=(open=false,support=false)=>({passage:open,water:open,support});
function tank(layers){
 const m={id:'tank',tiles:layers[0],voxels:{version:1,minZ:0,layers,faces:[],links:[],devices:[],initialWater:[]}},seen=new Set();
 for(let z=0;z<layers.length;z++)for(let y=0;y<layers[z].length;y++)for(let x=0;x<layers[z][y].length;x++)if(layers[z][y][x]==='.')for(const side of Object.keys(SIX_FACES)){
   const at=p(x,y,z),other=neighbor(at,side),key=sharedFace(at,other);if(voxelAt(m,null,other)!==null||seen.has(key))continue;seen.add(key);
   m.voxels.faces.push({id:`face_${m.voxels.faces.length}`,name:side,at,side,closed:rules(false,side==='down'),open:rules(true),operable:true,initiallyOpen:false});
 }return m;
}
const volume=s=>Object.values(s.water).reduce((n,v)=>n+v,0);
function supply(m,s,at,amount){const result=redistributeWater(m,s,[{at,amount}]);assert.equal(result.rejected,0);return {...s,water:result.water,drained:s.drained+result.drained};}
const act=(g,action,target,extra={})=>g.dispatch({type:'dungeon.action',system:'space',action,target,...extra});
function shaft(){const g=newGame();assert.ok(g.dispatch({type:'travel',region:1}));assert.ok(act(g,'visit','shaft_access'));return g;}
const state=g=>g.state.dungeons.persistent.region_1.systems.space.maps.waterworks_shaft;
const at=(g,x,y,z=0,facing='east')=>g.teleport('waterworks_shaft',x,y,facing,z);
const critical=g=>structuredClone({location:g.state.location,inventory:g.state.inventory,actors:g.state.actors,dungeons:g.state.dungeons,rng:g.state.rng,steps:g.state.steps,quests:g.state.quests});
const roundtrip=g=>{const save=g.save();assert.deepEqual(validateSave(JSON.parse(save),g.data),[]);const h=newGame();h.load(save);assert.equal(h.save(),save);return h;};

test('all six faces are shared, solid volumes exclude water and people, and a plate can support air',()=>{
 const m=tank([['.#']]),s=freshVoxelState(m);assert.equal(voxelAt(m,s,p(1)),'#');assert.equal(hasFooting(m,s,p(0)),true);
 for(const side of Object.keys(SIX_FACES)){const a=p(0),b=neighbor(a,side);assert.equal(sharedFace(a,b),sharedFace(b,a));assert.deepEqual(faceRules(m,s,a,b),faceRules(m,s,b,a));}
 const result=redistributeWater(m,s,[{at:p(1),amount:1}]);assert.equal(result.rejected,1);assert.equal(volume(result),0);
});

test('the shipped pump reaches all depth bands, shared doors block from both sides, and the bottom hatch drains',()=>{
 const g=shaft();at(g,3,2);for(const depth of [1,2,2,3]){assert.ok(act(g,'pump','hand_pump'));assert.equal(voxelDepth(state(g),p(4,2)),depth);assert.equal(voxelDepth(state(g),p(4,3)),depth);}
 let before=critical(g);assert.equal(g.dispatch({type:'move',direction:'forward'}),false);assert.deepEqual(critical(g),before);assert.ok(act(g,'toggle','drain_hatch'));assert.equal(volume(state(g)),0);assert.equal(state(g).drained,1);assert.ok(act(g,'toggle','drain_hatch'));assert.equal(volume(state(g)),0);
 assert.ok(act(g,'toggle','basin_gate'));assert.ok(g.dispatch({type:'move',direction:'forward'}));roundtrip(g);
});

test('a ladder is required for climbing, checks every cube, and saves its upper landing',()=>{
 const g=shaft();at(g,2,2);let before=critical(g);assert.equal(g.dispatch({type:'move',direction:'up'}),false);assert.deepEqual(critical(g),before);
 assert.ok(act(g,'traverse','fixed_ladder'));assert.deepEqual(g.state.location,{map:'waterworks_shaft',x:3,y:2,z:1,facing:'east'});assert.ok(g.state.discovered.waterworks_shaft.includes('3,2,1'));roundtrip(g);
 assert.equal(g.walkable(g.map(),2,2,1),false);assert.ok(act(g,'traverse','fixed_ladder'));assert.equal(g.state.location.z,0);assert.equal(g.state.steps,2);
 state(g).water['2,2,1']=7;before=critical(g);assert.equal(act(g,'traverse','fixed_ladder'),false);assert.deepEqual(critical(g),before);
});

test('a dry bridge carries the party over a separate fully submerged cube',()=>{
 const g=shaft();at(g,3,2);for(let i=0;i<4;i++)act(g,'pump','hand_pump');at(g,2,2);assert.ok(act(g,'traverse','fixed_ladder'));
 assert.equal(g.walkable(g.map(),4,2,0),false);assert.equal(g.walkable(g.map(),4,2,1),true);assert.ok(g.dispatch({type:'move',direction:'forward'}));assert.equal(g.state.location.x,4);assert.equal(g.state.location.z,1);roundtrip(g);
});

test('rope installation is paid once, cannot be done remotely, and survives returning to town',()=>{
 const g=shaft(),initial=g.state.inventory.rope;let before=critical(g);assert.equal(act(g,'install','rope_route'),false);assert.deepEqual(critical(g),before);at(g,3,4);
 assert.equal(act(g,'traverse','rope_route'),false);assert.ok(act(g,'install','rope_route'));assert.equal(g.state.inventory.rope,initial-1);before=critical(g);assert.equal(act(g,'install','rope_route'),false);assert.deepEqual(critical(g),before);assert.ok(act(g,'traverse','rope_route'));roundtrip(g);
 g.returnTown();g.dispatch({type:'travel',region:1});act(g,'visit','shaft_access');assert.deepEqual(state(g).installed,['rope_route']);assert.equal(g.state.inventory.rope,initial-1);
});

test('skill traversal checks current-job permission and MP before moving the whole party',()=>{
 const g=newGame();g.dispatch({type:'job.change',actor:'ada',job:'scout'});g.dispatch({type:'travel',region:1});act(g,'visit','shaft_access');at(g,3,3);const mp=g.state.actors.ada.mp;
 let before=critical(g);assert.equal(act(g,'traverse','guided_climb',{actor:'sera',ability:'climb_route'}),false);assert.deepEqual(critical(g),before);
 assert.ok(g.dispatch({type:'job.action',actor:'ada',ability:'climb_route'}));assert.equal(g.state.actors.ada.mp,mp-3);assert.equal(g.state.location.z,1);
 g.state.actors.ada.mp=0;before=critical(g);assert.equal(act(g,'traverse','guided_climb',{actor:'ada',ability:'climb_route'}),false);assert.deepEqual(critical(g),before);roundtrip(g);
});

test('a forbidden cube cannot be crossed by a paid skill, and no MP is consumed on failure',()=>{
 const g=newGame();g.dispatch({type:'job.change',actor:'ada',job:'scout'});g.dispatch({type:'travel',region:1});act(g,'visit','shaft_access');at(g,3,3);state(g).water['4,3,1']=7;const before=critical(g);assert.equal(act(g,'traverse','guided_climb',{actor:'ada',ability:'climb_route'}),false);assert.deepEqual(critical(g),before);
});

test('excavation changes only the allowed solid cube, consumes its item once, and opens real water space',()=>{
 const g=shaft();at(g,3,4);let before=critical(g);assert.equal(act(g,'dig','excavate_drain',{item:'blasting_charge'}),false);assert.deepEqual(critical(g),before);g.give('blasting_charge',1);
 assert.ok(act(g,'dig','excavate_drain',{item:'blasting_charge'}));assert.equal(voxelAt(g.map(),state(g),p(4,4)),'.');assert.equal(g.state.inventory.blasting_charge,0);assert.equal(g.walkable(g.map(),4,4,0),true);assert.equal(g.walkable(g.map(),4,4,1),false);before=critical(g);assert.equal(act(g,'dig','excavate_drain',{item:'blasting_charge'}),false);assert.deepEqual(critical(g),before);roundtrip(g);
});

test('rock breaking uses the same skill permission and payment when it targets a solid cube',()=>{
 const g=shaft();at(g,3,4);const mp=g.state.actors.ada.mp;assert.ok(g.dispatch({type:'job.action',actor:'ada',ability:'break_rock'}));assert.equal(g.state.actors.ada.mp,mp-3);assert.deepEqual(state(g).removed,['4,4,0']);roundtrip(g);
});

test('operations at matching xy on another height cannot reach through the floor',()=>{
 const g=shaft();at(g,2,2);act(g,'traverse','fixed_ladder');const before=critical(g);for(const [action,target] of [['pump','hand_pump'],['toggle','drain_hatch']])assert.equal(act(g,action,target),false);assert.deepEqual(critical(g),before);
});

test('the upper inspection script is not triggered while below it, and stays resumable above',()=>{
 const g=shaft();at(g,2,2);act(g,'traverse','fixed_ladder');for(let i=0;i<3;i++)g.dispatch({type:'move',direction:'forward'});assert.equal(g.state.location.x,6);assert.ok(g.dispatch({type:'interact'}));assert.equal(g.state.waiting.type,'text');roundtrip(g);drain(g);
});

test('projection keeps height slices, physical boundaries and water separate from gameplay',()=>{
 const g=shaft();at(g,3,2);act(g,'pump','hand_pump');let vm=projectGame(g);assert.equal(vm.dungeon.cells[2][4].waterDepth,1);assert.equal(vm.dungeon.boundaries['3,2/east'],true);
 const before=g.save();for(const c of vm.dungeon.systems.flatMap(s=>s.cards??[]))for(const a of c.actions)assert.equal(a.enabled,dungeonActionPlan(data,g.state,a.intent).ok);
 vm.dungeon.cells[2][4].waterDepth=99;vm.dungeon.currentCube.neighbors[0].passage=false;assert.equal(g.save(),before);
 at(g,2,2);act(g,'traverse','fixed_ladder');vm=projectGame(g);assert.equal(vm.dungeon.z,1);assert.equal(vm.dungeon.cells[2][4].waterDepth,0);assert.equal(vm.dungeon.cells[2][4].floor,true);
});

test('malformed six-face definitions, floating endpoints and disconnected paths are rejected',()=>{
 const cases=[v=>v.layers[0].pop(),v=>v.faces.push({...v.faces[0],id:'duplicate',at:p(4,2),side:'west'}),v=>v.faces[0].side='diagonal',v=>v.faces[0].closed.water='yes',v=>v.links[0].path[1]=p(4,4,1),v=>v.links[0].path[2]=p(2,3,1),v=>v.links[0].access={kind:'skill',ability:'attack'},v=>v.initialWater=[{at:p(0,0),amount:1}],v=>v.devices[0].amount=Infinity];
 for(const change of cases){const d=structuredClone(data);change(d.maps.waterworks_shaft.voxels);assert.ok(validateContent(d).length);}
});

test('current saves reject impossible height, missing terrain and forged water or excavation atomically',()=>{
 const g=shaft(),before=g.save();for(const change of [s=>s.location.z=50,s=>s.location.z=.5,s=>delete s.location.z,s=>delete s.dungeons.persistent.region_1.systems.space.maps.waterworks_shaft,s=>s.dungeons.persistent.region_1.systems.space.maps.waterworks_shaft.water={'0,0,0':3},s=>s.dungeons.persistent.region_1.systems.space.maps.waterworks_shaft.water={'1,1,0':4},s=>s.dungeons.persistent.region_1.systems.space.maps.waterworks_shaft.removed=['0,0,0'],s=>s.dungeons.persistent.region_1.systems.space.maps.waterworks_shaft.faces.bridge_3=true,s=>s.discovered.waterworks_shaft.push('1,1,99')]){
  const bad=JSON.parse(before);change(bad.state);assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),before);
 }
});

test('flood rescue cannot cross a closed face or invent a ladder to an upper safe cube',()=>{
 const g=shaft();g.data=structuredClone(data);const map=g.data.maps.waterworks_shaft;
 map.tiles=['####','#..#','####'];map.voxels={version:1,minZ:-1,layers:[['####','####','####'],map.tiles,['####','#.##','####']],faces:[{id:'sealed_door',name:'隔壁',at:p(1,1),side:'east',operable:false,initiallyOpen:false,closed:rules(false),open:rules(true)}],links:[],devices:[{id:'flood_pump',name:'給水',kind:'pump',at:p(1,1),target:p(1,1),amount:7}],initialWater:[]};map.objects=[];
 g.state.dungeons.persistent.region_1.systems.space.maps.waterworks_shaft=freshVoxelState(map);const steps=g.state.steps,gold=g.state.gold;
 assert.ok(act(g,'pump','flood_pump'));assert.equal(g.state.mode,'town');assert.equal(g.state.location,null);assert.equal(g.state.steps,steps);assert.equal(g.state.gold,gold-Math.ceil(gold*data.system.retreatGoldRate));
});

test('removing the standing floor retreats along a real horizontal route without extra steps or events',()=>{
 const g=shaft();g.data=structuredClone(data);const map=g.data.maps.waterworks_shaft;
 map.voxels.devices.push({id:'floor_cut',name:'床の掘削',kind:'dig',at:p(3,2),target:p(3,2,-1),item:'blasting_charge',count:1});
 at(g,3,2);g.give('blasting_charge',1);const steps=g.state.steps,events=structuredClone(g.state.events);assert.ok(act(g,'dig','floor_cut',{item:'blasting_charge'}));assert.equal(g.state.mode,'dungeon');assert.notDeepEqual({x:g.state.location.x,y:g.state.location.y,z:g.state.location.z},p(3,2));assert.equal(g.state.steps,steps);assert.deepEqual(g.state.events,events);assert.equal(g.walkable(map,3,2,0),false);
});


test('authored initially known cubic cells retain their height through entry and saving',()=>{
 const content=structuredClone(data);content.maps.waterworks_shaft.initiallyKnown=['3,2,1','4,2,0'];assert.deepEqual(validateContent(content),[]);
 const g=new GameEngine(content);drain(g);g.dispatch({type:'travel',region:1});assert.ok(g.state.discovered.waterworks_shaft.includes('3,2,1'));assert.ok(act(g,'visit','shaft_access'));
 assert.deepEqual(validateSave(JSON.parse(g.save()),content),[]);const h=new GameEngine(content);h.load(g.save());assert.equal(h.save(),g.save());
 for(const key of ['4,2','4,2,99','99,2,0']){content.maps.waterworks_shaft.initiallyKnown=[key];assert.ok(validateContent(content).some(e=>e.includes('初期踏査セル')));}
});

test('cubic movement requires water protection from level six, independently of the visual band',()=>{
 const m=tank([['.']]),s=freshVoxelState(m);
 for(const level of [5,6,7,10]){s.water={'0,0,0':level};assert.equal(Boolean(voxelOccupancyReason(m,s,p(0))),level>=6);assert.equal(voxelOccupancyReason(m,s,p(0),{waterAccess:true}),'');}
});
test('a pump reaching level ten drowns an unprotected party but preserves a prepared party',()=>{
 for(const protectedWater of [false,true]){
  const g=shaft();g.data=structuredClone(data);const map=g.data.maps.waterworks_shaft;
  map.tiles=['###','#.#','###'];map.voxels={version:1,minZ:-1,layers:[['###','###','###'],map.tiles,['###','###','###']],faces:[],links:[],devices:[{id:'flood_pump',name:'給水',kind:'pump',at:p(1,1),target:p(1,1),amount:10}],initialWater:[]};map.objects=[];
  g.state.dungeons.persistent.region_1.systems.space.maps.waterworks_shaft=freshVoxelState(map);g.state.dungeons.active.systems.water.protected=protectedWater;const gold=g.state.gold;
  assert.ok(act(g,'pump','flood_pump'));
  if(protectedWater){assert.equal(g.state.mode,'dungeon');assert.equal(state(g).water['1,1,0'],10);assert.ok(g.state.members.every(id=>g.state.actors[id].statuses.includes('wet')));}
  else{assert.equal(g.state.mode,'town');assert.equal(g.state.gold,Math.floor(gold*(1-data.system.defeatGoldRate)));assert.ok(g.state.log.some(line=>line.includes('溺れ')));}
 }
});
