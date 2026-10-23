// Real earned Kagaribi party followed by the garden's route, cultivation and
// return facilities. The root-gate boss is not implemented or measured here.
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {Campaign} from './measure-kagaribi-campaign.mjs';
import {campaignRoute} from './campaign-route.mjs';
import {data,goTownLocation} from '../tests/helpers.mjs';
import {oilTotal} from '../src/core/expedition-oil.js';

export function measureGarden({seed=1907,size=4,mode='classic',loadout='standard',cultivate=false}={}){
 const c=new Campaign({seed,size,mode,loadout,route:'shortcuts'});c.run();const g=c.g;
 c.act({type:'equip',actor:'ada',item:'exp_t2_sword'});goTownLocation(g,data.game.world.townRoot);
 const start={steps:g.state.steps,battles:c.report.battles.length,gold:g.state.gold,gems:g.state.expedition.gems,oil:c.report.oilSpentWalking,consumed:{...c.report.consumed},actors:g.state.members.map(id=>({id,level:g.state.actors[id].level,xp:g.state.actors[id].xp}))};
 let minOil=oilTotal(data,g.state),waits=0,plantHealing=0;const checkpoints=[];
 c.act({type:'travel',dungeon:'region_3'});
 const act=(action,target,extra={})=>c.act({type:'dungeon.action',system:'garden',action,target,...extra});
 const go=(map,x,y)=>{
  // Replan each move: growing plants can change the walkable terrain.
  for(let n=0;n<2000;n++){
   const step=campaignRoute(g,{map,x,y})[0];if(!step)return;
   c.upkeep();if(g.state.expedition.lamp.fuel<15&&g.state.expedition.reserve)c.act({type:'expedition.action',action:'refill'});
   if(step.connection)c.act({type:'dungeon.action',system:'connections',action:'cross',target:step.connection});
   else{while(g.state.location.facing!==step.direction)c.act({type:'move',direction:'right'});c.act({type:'move',direction:'forward'});}
   minOil=Math.min(minOil,oilTotal(data,g.state));c.battle();
   assert.deepEqual([g.state.location.map,g.state.location.x,g.state.location.y],[step.at.map,step.at.x,step.at.y]);
  }
  throw Error('Garden route did not terminate');
 };
 const wait=()=>{
  const before={steps:g.state.steps,oil:oilTotal(data,g.state),hp:g.state.members.reduce((n,id)=>n+g.state.actors[id].hp,0),mp:g.state.members.map(id=>g.state.actors[id].mp)};
  act('wait');waits++;plantHealing+=g.state.members.reduce((n,id)=>n+g.state.actors[id].hp,0)-before.hp;
  assert.equal(g.state.steps,before.steps);assert.equal(oilTotal(data,g.state),before.oil);assert.deepEqual(g.state.members.map(id=>g.state.actors[id].mp),before.mp);
 };
 const bed=(id,species,heal=false)=>{
  const p=data.dungeons.region_3.systems.garden.plots.find(p=>p.id===id);go(p.map,p.x,p.y);
  if(!cultivate)return;
  act('plant',id,{species});for(let n=0;n<data.dungeons.region_3.systems.garden.species[species].growth;n++)wait();
  if(heal)for(let n=0;g.state.members.some(id=>g.state.actors[id].hp>0&&g.state.actors[id].hp<g.stats(id).hp)&&n<1000;n++)wait();
  c.checkpoint(id);
 };
 const supply=id=>{
  const camp=data.expedition.camps.find(c=>c.id===id);go(camp.map,camp.x,camp.y);const arrivalOil=oilTotal(data,g.state);
  c.object('supply_rope');c.act({type:'expedition.action',camp:id,action:'repair'});c.act({type:'expedition.action',camp:id,action:'relay'});
  if(oilTotal(data,g.state)<g.state.expedition.capacity)c.act({type:'expedition.action',camp:id,action:'draw'});
  c.checkpoint(id);checkpoints.push({id,steps:g.state.steps-start.steps,arrivalOil});
 };
 act('supplies');supply('garden_upper');supply('garden_lower');
 go('region_3_f3',5,3);c.object('intake');c.choose('open');supply('garden_nursery');
 go('region_3_f4',3,1);c.object('seed_reserve');bed('nursery_bed','cool_spore',true);
 bed('root_crossing','root_bridge');go('region_3_f5',6,3);go('region_3_f5',4,3);if(cultivate)act('harvest','root_crossing');
 bed('nectar_bed','red_nectar');bed('quiet_bed','quiet_moss');go('region_3_f6',5,1);c.object('walk_latch');c.choose('open');
 supply('garden_rest');go('region_3_f7',3,1);c.object('seed_reserve');bed('rest_bed','cool_spore',true);
 bed('pollinator_vine','stair_vine');
 if(cultivate){act('climb','pollinator_vine');go('region_3_f8',3,3);act('harvest','pollinator_vine');}
 bed('herb_bed','cool_spore',true);
 go('region_3_f10',5,5);c.object('root_gate');go('region_3_f10',9,1);c.object('lift_latch');c.choose('open');c.checkpoint('garden root forecourt');
 const at10={steps:g.state.steps-start.steps,actors:g.state.members.map(id=>({id,level:g.state.actors[id].level,xp:g.state.actors[id].xp}))};
 const beforeReturn=g.state.steps;go('region_3_f1',1,1);c.object('exit');assert.equal(g.state.mode,'town');c.checkpoint('garden returned');
 const battles=c.report.battles.slice(start.battles);
 return {seed,size,mode,loadout,cultivate,startingActors:start.actors,at10,stepsReturned:g.state.steps-start.steps,returnSteps:g.state.steps-beforeReturn,
  minOil,walkingOil:c.report.oilSpentWalking-start.oil,remainingOil:oilTotal(data,g.state),checkpoints,waits,plantHealingWhileWaiting:plantHealing,
  battles:battles.length,battleMpSpent:battles.reduce((n,b)=>n+b.mp,0),goldEarned:g.state.gold-start.gold,gemsEarned:g.state.expedition.gems-start.gems,
  consumed:Object.fromEntries(Object.entries(c.report.consumed).map(([k,n])=>[k,n-(start.consumed[k]??0)])),losses:g.state.records.losses};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const runs=[];
 if(process.argv.includes('--matrix'))for(const size of [4,5])for(const mode of ['classic','grid','frontline'])for(const loadout of ['standard','bow'])for(const cultivate of [false,true])runs.push(measureGarden({size,mode,loadout,cultivate}));
 else runs.push(measureGarden({size:Number(process.argv[2]??4),mode:process.argv[3]??'classic',loadout:process.argv[4]??'standard',cultivate:process.argv.includes('--cultivate')}));
 console.log(JSON.stringify({command:'node tools/measure-garden-campaign.mjs --matrix',scope:'1–10F routes and cultivation, no root-gate boss or 10F supply yet',contentVersion:data.game.version,runs},null,2));
}
