import test from 'node:test';
import assert from 'node:assert/strict';
import {data,newGame,drain} from './helpers.mjs';
import {newGame as legacyGame} from './legacy-map-helpers.mjs';
import {dungeonActionPlan,dungeonDanger} from '../src/core/dungeons.js';
import {projectGame} from '../src/application/projection.js';
import {fireContext} from '../src/core/systems/fire-network.js';

const begin=(id,create=newGame)=>{const g=create();g.random=()=>.999999;assert.ok(g.dispatch({type:'travel',dungeon:id}));return g;};
const spec=(g,id)=>g.data.dungeons[g.state.dungeons.active.id].systems[id];
const persistent=(g,id)=>g.state.dungeons.persistent[g.state.dungeons.active.id].systems[id];
const at=(g,p,facing='east')=>g.teleport(p.map,p.x,p.y,facing,p.z);
const adjacent=(g,p)=>[[p.x-1,p.y,'east'],[p.x+1,p.y,'west'],[p.x,p.y-1,'south'],[p.x,p.y+1,'north']].find(([x,y])=>g.walkable(g.data.maps[p.map],x,y,p.z));
const panel=(g,id)=>projectGame(g).dungeon.systems.find(s=>s.id===id);
const marker=(g,id,p)=>panel(g,id)?.markers.find(m=>m.id===p.id||m.id===`${id}_${p.id}`);
const critical=g=>structuredClone({inventory:g.state.inventory,actors:g.state.actors,gold:g.state.gold,dungeons:g.state.dungeons,steps:g.state.steps,location:g.state.location});
const intent=(system,action,target,extra={})=>({type:'dungeon.action',system,action,target,...extra});

function hereOnly(g,system,p,command,{hasMarker=true}={}){
  const beforeCell=adjacent(g,p);assert.ok(beforeCell,`${p.name}: approachable cell`);
  g.teleport(p.map,beforeCell[0],beforeCell[1],beforeCell[2],p.z);
  const key=p.z===undefined?`${p.x},${p.y}`:`${p.x},${p.y},${p.z}`;
  if(!g.state.discovered[p.map].includes(key))g.state.discovered[p.map].push(key);
  assert.equal(dungeonActionPlan(g.data,g.state,command).ok,false,`${p.name}: no operation from the front`);
  if(hasMarker)assert.equal(marker(g,system,p)?.inInteractionRange,false,`${p.name}: map marker remains, exploration marker is out of reach`);
  const before=critical(g);assert.equal(g.dispatch(command),false);assert.deepEqual(critical(g),before);
  at(g,p);
  for(const facing of ['north','east','south','west']){
    g.state.location.facing=facing;
    const plan=dungeonActionPlan(g.data,g.state,command);assert.ok(plan.ok,`${p.name}: ${plan.reason??facing}`);
    if(hasMarker)assert.equal(marker(g,system,p)?.inInteractionRange,true,`${p.name}: operation and marker share the occupied cell`);
  }
  assert.ok(g.dispatch(command),`${p.name}: operation succeeds after arrival`);
}

const cases=[
  ['fire pedestal','kagaribi','fires',s=>({point:s.fixtures[0],action:'collect'})],
  ['compartment drain control','region_1','water',s=>({point:s.controls[0],action:'close'})],
  ['seed supplies','region_3','garden',s=>({point:s.supply,action:'supplies',hasMarker:false})],
  ['plant bed','region_3','garden',s=>({point:s.plots[0],action:'plant',extra:{species:'cool_spore'},prepare:g=>{for(const [id,n] of Object.entries(s.species.cool_spore.materials))g.give(id,n);}})],
  ['warp mirror','region_4','mirrors',s=>({point:s.portals[0],action:'warp'})],
  ['skill book','region_5','library',s=>({point:s.books[0],action:'borrow',extra:{actor:'ada',sealed:'attack'}})],
  ['seal control beside its blocked passage','region_5','library',s=>({point:s.gates[0],action:'unlock',extra:{actor:'ada'},prepare:g=>{g.state.dungeons.active.systems.library.loans.ada={book:s.books.find(b=>b.skill===s.gates[0].ability).id,sealed:'attack'};}})],
  ['market offer','region_6','market',s=>({point:s.offers[0],action:'trade'})],
  ['flotation device','region_7','air',s=>({point:s.devices[0],action:'raise'})],
  ['power control','region_8','power',s=>({point:s.controls[1],action:'toggle'})],
  ['power door control beside its blocked passage','region_8','power',s=>({point:s.devices.find(d=>d.kind==='door'),action:'disconnect'})],
  ['orrery control','region_9','terrain',(s,g)=>({point:s.controls[0],action:'shift',extra:{phase:s.states.find(p=>p.id!==persistent(g,'terrain').phase).id}})],
  ['pursuer lure point','prayerless_valley','boundary',s=>({point:s.threat.point,action:'lure'})]
];
for(const [label,dungeon,system,choose] of cases)test(`${label} requires arrival and exposes its marker only in the same operation range`,()=>{
  const g=begin(dungeon),c=choose(spec(g,system),g);c.prepare?.(g);
  hereOnly(g,system,c.point,intent(system,c.action,c.point.id,c.extra),c);
});

test('retired tidal control and cubic devices also require their actual control cells',()=>{
  const water=begin('region_1',legacyGame),valve=spec(water,'water').controls[0];
  hereOnly(water,'water',valve,intent('water','close',valve.id),{hasMarker:false});
  for(const [action,id] of [['pump','hand_pump'],['toggle','drain_hatch'],['dig','excavate_drain']]){
    const g=begin('region_1',legacyGame),portal=spec(g,'space').portals[0];at(g,portal.at);assert.ok(g.dispatch(intent('space','visit',portal.id)));
    const map=g.map(),source=action==='toggle'?map.voxels.faces.find(f=>f.id===id):map.voxels.devices.find(d=>d.id===id);
    const p={...(source.handle??source.at),id,name:source.name,map:map.id};g.give('blasting_charge',1);
    hereOnly(g,'space',p,intent('space',action,id,action==='dig'?{item:'blasting_charge'}:{}),{hasMarker:action!=='toggle'});
  }
});

test('wall-mounted fire fixtures require their owner cell and facing, never an adjacent cell',()=>{
  const g=begin('kagaribi');g.data=structuredClone(g.data);const f=spec(g,'fires').fixtures.find(f=>f.id==='calm');f.edge='north';
  at(g,{map:f.map,x:f.x+1,y:f.y},'west');assert.equal(dungeonActionPlan(g.data,g.state,intent('fires','ignite',f.id)).ok,false);assert.equal(marker(g,'fires',f).inInteractionRange,false);
  at(g,f,'east');assert.equal(dungeonActionPlan(g.data,g.state,intent('fires','ignite',f.id)).ok,false);assert.equal(marker(g,'fires',f).inInteractionRange,false);
  g.state.location.facing='north';assert.equal(marker(g,'fires',f).inInteractionRange,true);assert.ok(g.dispatch(intent('fires','ignite',f.id)));
});

test('all four solid breakable walls remain explicit front-only operation exceptions',()=>{
  const g=begin('region_2'),walls=spec(g,'walls').walls;assert.equal(walls.length,4);g.give('blasting_charge',walls.length);
  for(const wall of walls){
    const spot=adjacent(g,wall);g.teleport(wall.map,spot[0],spot[1],spot[2]);
    const command=intent('walls','item',wall.id,{item:'blasting_charge'});assert.equal(g.walkable(g.map(),wall.x,wall.y),false);assert.equal(marker(g,'walls',wall).inInteractionRange,true);
    assert.ok(dungeonActionPlan(g.data,g.state,command).ok);
    const facing=g.state.location.facing;g.state.location.facing={north:'south',south:'north',east:'west',west:'east'}[facing];
    assert.equal(dungeonActionPlan(g.data,g.state,command).ok,false);assert.equal(marker(g,'walls',wall).inInteractionRange,false);g.state.location.facing=facing;
    assert.ok(g.dispatch(command));assert.ok(g.dispatch({type:'move',direction:'forward'}));assert.equal(marker(g,'walls',wall).inInteractionRange,false);
  }
});

test('all four blocking guards allow facing access and a guard activated on the occupied cell remains operable',()=>{
  const g=begin('region_6'),s=spec(g,'market');assert.equal(s.guards.length,4);g.state.dungeons.active.systems.market.alarm=s.maxAlarm;
  for(const guard of s.guards){
    const spot=adjacent(g,guard);g.teleport(guard.map,spot[0],spot[1],spot[2]);assert.equal(g.walkable(g.map(),guard.x,guard.y),false);
    const command=intent('market','fight',guard.id);assert.ok(dungeonActionPlan(g.data,g.state,command).ok);assert.equal(marker(g,'market',guard).inInteractionRange,true);
    g.state.location.facing={north:'south',south:'north',east:'west',west:'east'}[g.state.location.facing];assert.equal(dungeonActionPlan(g.data,g.state,command).ok,false);assert.equal(marker(g,'market',guard).inInteractionRange,false);
  }
  const h=begin('region_6'),guard=spec(h,'market').guards[0];at(h,guard);
  for(let i=0;i<guard.alarm;i++){h.startBattle('roaming_6',{win:[],escape:[],lose:[]});h.random=()=>0;assert.ok(h.dispatch({type:'battle',action:'escape'}));drain(h);}
  assert.equal(h.state.location.x,guard.x);assert.equal(h.state.location.y,guard.y);assert.equal(marker(h,'market',guard).inInteractionRange,true);assert.ok(h.dispatch(intent('market','fight',guard.id)));
});

test('hostile guardian approach and nearby fire burnout keep their proximity behavior without enabling remote operation',()=>{
  const g=begin('region_8'),guardian=spec(g,'power').devices.find(d=>d.kind==='guardian'),spot=adjacent(g,guardian);
  persistent(g,'power').circuits=[guardian.circuit];g.teleport(guardian.map,spot[0],spot[1],spot[2]);
  assert.equal(dungeonActionPlan(g.data,g.state,intent('power','disconnect',guardian.id)).ok,false);assert.equal(marker(g,'power',guardian).inInteractionRange,false);dungeonDanger(g);assert.equal(g.state.battle?.encounter,'machine_sentry');
  const h=begin('kagaribi'),f=spec(h,'fires').fixtures.find(f=>f.id==='calm');at(h,f);Object.assign(fireContext(h.data,h.state).persistent.fixtures[f.id],{lit:true,effect:f.effect,fuel:1});
  assert.ok(h.dispatch({type:'move',direction:'back'}));assert.equal(marker(h,'fires',f).inInteractionRange,false);assert.ok(h.state.log.includes(`${f.name}の火が消えました。`));
});

function controlPoints(s){
  const points=['fixtures','controls','devices','plots','books','gates','offers','portals'].flatMap(k=>s[k]??[]).map(p=>p.at??p).filter(p=>p.map);
  if(s.supply)points.push(s.supply);if(s.use==='suppression_zone'&&s.threat)points.push(s.threat.point);return points;
}
test('authored control cells remain occupiable through flooding, plant growth, door states, alarm and terrain changes',()=>{
  let checked=0;
  for(const [id,d] of Object.entries(data.dungeons)){
    const g=begin(id);
    for(const [key,s] of Object.entries(d.systems)){
      const points=controlPoints(s);if(!points.length)continue;checked+=points.length;
      const original=structuredClone(persistent(g,key)),originalRun=structuredClone(g.state.dungeons.active.systems[key]);
      const variants=[()=>{}];
      if(s.use==='compartment_water')for(const flooded of [true,false])variants.push(p=>{for(const id of Object.keys(p.controls))p.controls[id]=flooded;});
      if(s.use==='plant_garden')for(const [id,plant] of Object.entries(s.species))variants.push(p=>{for(const plot of s.plots)if(!plant.terrain||plot.terrain[plant.terrain])p.plants[plot.id]={species:id,age:plant.growth};});
      if(s.use==='skill_library')variants.push(p=>{p.opened=s.gates.map(g=>g.id);});
      if(s.use==='market_pacts')variants.push((p,r)=>{p.paid=s.offers.filter(o=>['toll','barter'].includes(o.kind)).map(o=>o.id);r.alarm=s.maxAlarm;});
      if(s.use==='air_supply')variants.push(p=>{p.raised=s.devices.map(d=>d.id);});
      if(s.use==='power_grid')for(let mask=0;mask<2**s.controls.length;mask++){
        const circuits=s.controls.filter((_c,i)=>mask&(1<<i)).map(c=>c.id);if(s.devices.filter(d=>circuits.includes(d.circuit)).reduce((n,d)=>n+d.power,0)<=s.capacity)variants.push(p=>{p.circuits=circuits;});
      }
      if(s.use==='terrain_shift')for(const phase of s.states)variants.push(p=>{p.phase=phase.id;});
      for(const change of variants){
        g.state.dungeons.persistent[id].systems[key]=structuredClone(original);g.state.dungeons.active.systems[key]=structuredClone(originalRun);change(persistent(g,key),g.state.dungeons.active.systems[key]);
        for(const point of points)assert.ok(g.walkable(g.data.maps[point.map],point.x,point.y,point.z),`${id}/${key}/${point.id}: the control cell must stay available`);
      }
      g.state.dungeons.persistent[id].systems[key]=original;g.state.dungeons.active.systems[key]=originalRun;
    }
  }
  assert.ok(checked>70,'the audit includes the full set of authored operation points');
});
