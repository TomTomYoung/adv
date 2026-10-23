// Earn everything in Kagaribi before walking the mine. Map knowledge and the
// wash policy are explicit; resources, encounters and combat remain real.
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {Campaign} from './measure-kagaribi-campaign.mjs';
import {campaignRoute} from './campaign-route.mjs';
import {data,goTownLocation} from '../tests/helpers.mjs';
import {oilTotal} from '../src/core/expedition-oil.js';

export function measureMine({seed=1907,size=4,mode='classic',loadout='standard'}={}){
 const c=new Campaign({seed,size,mode,loadout,route:'shortcuts'});c.run();const g=c.g;
 c.act({type:'equip',actor:'ada',item:'exp_t2_sword'});goTownLocation(g,data.game.world.townRoot);
 const start={steps:g.state.steps,battles:c.report.battles.length,gold:g.state.gold,gems:g.state.expedition.gems,oil:c.report.oilSpentWalking,gear:Object.keys(g.state.gear.items),consumed:{...c.report.consumed},actors:g.state.members.map(id=>({id,level:g.state.actors[id].level,xp:g.state.actors[id].xp}))};
 const checkpoints=[],washes=[];let minOil=oilTotal(data,g.state),maxSalt=0;
 c.act({type:'travel',dungeon:'region_2'});
 const salt=()=>Math.max(0,...Object.values(g.state.gear.items).map(v=>v.salt));
 const steps=route=>{
  for(const step of route){
   c.upkeep();if(g.state.expedition.lamp.fuel<15&&g.state.expedition.reserve)c.act({type:'expedition.action',action:'refill'});
   if(step.connection)c.act({type:'dungeon.action',system:'connections',action:'cross',target:step.connection});
   else{while(g.state.location.facing!==step.direction)c.act({type:'move',direction:'right'});c.act({type:'move',direction:'forward'});}
   minOil=Math.min(minOil,oilTotal(data,g.state));maxSalt=Math.max(maxSalt,salt());c.battle();
   assert.deepEqual([g.state.location.map,g.state.location.x,g.state.location.y],[step.at.map,step.at.x,step.at.y]);
  }
 };
 const wash=()=>{
  const paths=data.dungeons.region_2.systems.salt.washZones.flatMap(p=>{try{return [{p,path:campaignRoute(g,p)}];}catch{return [];}}).sort((a,b)=>a.path.length-b.path.length);
  assert.ok(paths.length);steps(paths[0].path);assert.equal(salt(),0);washes.push({steps:g.state.steps-start.steps,...paths[0].p});
 };
 const go=(map,x,y)=>{
  for(let n=0;n<2000;n++){
   if(salt()>=2)wash();
   const path=campaignRoute(g,{map,x,y});if(!path.length)return;steps(path.slice(0,1));
  }
  throw Error('Mine route did not terminate');
 };
 const supply=id=>{
  const camp=data.expedition.camps.find(c=>c.id===id);go(camp.map,camp.x,camp.y);const arrivalOil=oilTotal(data,g.state);
  c.object('supply_rope');c.act({type:'expedition.action',camp:id,action:'repair'});c.act({type:'expedition.action',camp:id,action:'relay'});
  if(oilTotal(data,g.state)<g.state.expedition.capacity)c.act({type:'expedition.action',camp:id,action:'draw'});
  c.checkpoint(id);checkpoints.push({id,steps:g.state.steps-start.steps,arrivalOil});
 };
 supply('mine_upper');supply('mine_lower');
 go('region_2_f3',5,3);c.object('support_brace');c.choose('open');supply('mine_sorting');
 go('region_2_f6',5,1);c.object('cart_latch');c.choose('open');supply('mine_hoist');
 go('region_2_f10',9,1);c.object('lift_latch');c.choose('open');
 go('region_2_f10',3,1);assert.equal(salt(),0);go('region_2_f10',5,1);c.object('shellbreaker');c.choose('fight');
 assert.equal(g.state.flags.mine.shellbreakerWon,true);supply('mine_central');
 const at10={steps:g.state.steps-start.steps,actors:g.state.members.map(id=>({id,level:g.state.actors[id].level,xp:g.state.actors[id].xp}))};
 const beforeReturn=g.state.steps;go('region_2_f1',1,1);c.object('exit');assert.equal(g.state.mode,'town');c.checkpoint('mine returned');
 const battles=c.report.battles.slice(start.battles);
 return {seed,size,mode,loadout,startingActors:start.actors,at10,stepsReturned:g.state.steps-start.steps,returnSteps:g.state.steps-beforeReturn,
  minOil,walkingOil:c.report.oilSpentWalking-start.oil,remainingOil:oilTotal(data,g.state),checkpoints,washes,maxSalt,
  lostGear:start.gear.filter(id=>!g.state.gear.items[id]).length,battles:battles.length,bossRounds:battles.find(b=>b.encounter==='mine_shell_guardian').rounds,
  battleMpSpent:battles.reduce((n,b)=>n+b.mp,0),goldEarned:g.state.gold-start.gold,gemsEarned:g.state.expedition.gems-start.gems,
  consumed:Object.fromEntries(Object.entries(c.report.consumed).map(([k,n])=>[k,n-(start.consumed[k]??0)])),losses:g.state.records.losses};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const runs=[];
 if(process.argv.includes('--matrix'))for(const size of [4,5])for(const mode of ['classic','grid','frontline'])for(const loadout of ['standard','bow'])runs.push(measureMine({size,mode,loadout}));
 else runs.push(measureMine({size:Number(process.argv[2]??4),mode:process.argv[3]??'classic',loadout:process.argv[4]??'standard'}));
 console.log(JSON.stringify({command:'node tools/measure-mine-campaign.mjs --matrix',contentVersion:data.game.version,runs},null,2));
}
