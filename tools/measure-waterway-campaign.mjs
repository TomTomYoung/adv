// Earn the party, equipment and resources in Kagaribi, then walk the waterway.
// No injected resources, forced victories, encounter suppression or free healing.
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {Campaign} from './measure-kagaribi-campaign.mjs';
import {campaignRoute} from './campaign-route.mjs';
import {data,goTownLocation} from '../tests/helpers.mjs';
import {oilTotal} from '../src/core/expedition-oil.js';

export function measureWaterway({seed=1907,size=4,mode='classic',loadout='standard',materials=false}={}){
 const c=new Campaign({seed,size,mode,loadout,route:'shortcuts'});c.run();const g=c.g;
 // The earned first ticket was exchanged by the Kagaribi campaign; equip it.
 c.act({type:'equip',actor:'ada',item:'exp_t2_sword'});goTownLocation(g,data.game.world.townRoot);
 const start={steps:g.state.steps,battles:c.report.battles.length,gold:g.state.gold,gems:g.state.expedition.gems,mp:c.report.mpSpent,oil:c.report.oilSpentWalking,consumed:{...c.report.consumed},actors:g.state.members.map(id=>({id,level:g.state.actors[id].level,xp:g.state.actors[id].xp}))};
 const checkpoints=[];let minOil=oilTotal(data,g.state);
 c.act({type:'travel',dungeon:'region_1'});
 const go=(map,x,y)=>{
  for(const step of campaignRoute(g,{map,x,y})){
   c.upkeep();if(g.state.expedition.lamp.fuel<15&&g.state.expedition.reserve)c.act({type:'expedition.action',action:'refill'});
   if(step.connection)c.act({type:'dungeon.action',system:'connections',action:'cross',target:step.connection});
   else{while(g.state.location.facing!==step.direction)c.act({type:'move',direction:'right'});c.act({type:'move',direction:'forward'});}
   minOil=Math.min(minOil,oilTotal(data,g.state));c.battle();
   assert.equal(g.state.location.map,step.at.map);assert.equal(g.state.location.x,step.at.x);assert.equal(g.state.location.y,step.at.y);
  }
 };
 const supply=id=>{
  const camp=data.expedition.camps.find(c=>c.id===id);go(camp.map,camp.x,camp.y);
  const arrivalOil=oilTotal(data,g.state);
  if(!g.state.expedition.camps[id]?.supply){c.object('supply_rope');c.act({type:'expedition.action',camp:id,action:'repair'});if(camp.relayEnabled!==false)c.act({type:'expedition.action',camp:id,action:'relay'});}
  if(oilTotal(data,g.state)<g.state.expedition.capacity)c.act({type:'expedition.action',camp:id,action:'draw'});
  c.checkpoint(id);checkpoints.push({id,steps:g.state.steps-start.steps,arrivalOil});
 };
 const drain=(map,control)=>{const p=data.dungeons.region_1.systems.water.controls.find(c=>c.id===control&&c.map===map);go(map,p.x,p.y);c.act({type:'dungeon.action',system:'water',action:'close',target:control});};
 drain('region_1_f1','upper_gate');supply('water_landing');
 drain('region_1_landing','upper_valve');supply('water_branch');
 go('region_1_f2',1,1);c.object('dry_stair_latch');c.choose('open');
 drain('region_1_f2','lower_gate');supply('water_bridge');supply('water_lower');
 drain('region_1_lower_landing','lower_valve');
 let recoveredMaterials=null;
 if(materials){go('region_1_canal_d',5,5);const before={...g.state.inventory};c.object('workshop_parts');recoveredMaterials=Object.fromEntries(['machine_part','soft_fiber'].map(id=>[id,(g.state.inventory[id]??0)-(before[id]??0)]));c.checkpoint('waterway materials');}
 go('region_1_gatehouse',5,3);c.object('sluice_beast');c.choose('fight');
 assert.equal(g.state.flags.waterway.sluiceBeastWon,true);supply('water_central');
 const at10={steps:g.state.steps-start.steps,actors:g.state.members.map(id=>({id,level:g.state.actors[id].level,xp:g.state.actors[id].xp}))};
 const beforeReturn=g.state.steps;go('region_1_f1',1,1);c.object('exit');assert.equal(g.state.mode,'town');
 c.checkpoint('waterway returned');
 const battles=c.report.battles.slice(start.battles);
 return {seed,size,mode,loadout,materials,recoveredMaterials,startingActors:start.actors,at10,stepsReturned:g.state.steps-start.steps,returnSteps:g.state.steps-beforeReturn,
  minOil,walkingOil:c.report.oilSpentWalking-start.oil,remainingOil:oilTotal(data,g.state),checkpoints,
  battles:battles.length,battleDetails:battles,bossRounds:battles.find(b=>b.encounter==='waterway_sluice_guardian').rounds,battleMpSpent:battles.reduce((n,b)=>n+b.mp,0),
  goldEarned:g.state.gold-start.gold,gemsEarned:g.state.expedition.gems-start.gems,consumed:Object.fromEntries(Object.entries(c.report.consumed).map(([k,n])=>[k,n-(start.consumed[k]??0)])),losses:g.state.records.losses};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const runs=[];
 if(process.argv.includes('--shallow'))for(const seed of [1907,42,2026])for(const size of [4,5])for(const mode of ['classic','grid','frontline'])for(const loadout of ['standard','bow'])for(const materials of [false,true])runs.push(measureWaterway({seed,size,mode,loadout,materials}));
 else if(process.argv.includes('--matrix'))for(const size of [4,5])for(const mode of ['classic','grid','frontline'])for(const loadout of ['standard','bow'])runs.push(measureWaterway({size,mode,loadout}));
 else runs.push(measureWaterway({size:Number(process.argv[2]??4),mode:process.argv[3]??'classic',loadout:process.argv[4]??'standard'}));
 console.log(JSON.stringify({command:`node tools/measure-waterway-campaign.mjs ${process.argv.includes('--shallow')?'--shallow':'--matrix'}`,contentVersion:data.game.version,runs},null,2));
}
