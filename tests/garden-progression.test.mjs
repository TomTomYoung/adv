import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import {data,newGame,drain,walk,inspect,goTownLocation} from './helpers.mjs';
import {validateSave} from '../src/core/save.js';
import {dungeonEncounter} from '../src/core/dungeons.js';
import {oilTotal} from '../src/core/expedition-oil.js';
import {campaignRoute} from '../tools/campaign-route.mjs';
import {measureGarden} from '../tools/measure-garden-campaign.mjs';
const fixture=JSON.parse(await fs.readFile(new URL('./fixtures/garden-save-1.29.0.json',import.meta.url)));
const garden=data.dungeons.region_3.systems.garden;
const ready=()=>{const g=newGame();g.data=structuredClone(data);delete g.data.quests.q001.story;g.accept('q001');g.complete('q001','informed');drain(g);g.random=()=>.99999;assert.ok(g.dispatch({type:'travel',dungeon:'region_3'}));return g;};
const saved=g=>{const s=g.save();assert.deepEqual(validateSave(JSON.parse(s),g.data),[]);g.load(s);assert.equal(g.save(),s);};
const choose=(g,id)=>{assert.ok(g.dispatch({type:'choose',id}));drain(g);};
const act=(g,action,target,extra={})=>{assert.ok(g.dispatch({type:'dungeon.action',system:'garden',action,target,...extra}));drain(g);};
const plant=(g,id,species)=>{const p=garden.plots.find(p=>p.id===id);g.teleport(p.map,p.x,p.y);act(g,'plant',id,{species});for(let n=0;n<garden.species[species].growth;n++)act(g,'wait');};
const go=(g,map,x,y)=>{
 for(let n=0;n<2000;n++){
  const step=campaignRoute(g,{map,x,y})[0];if(!step)return;
  if(step.connection){assert.ok(g.dispatch({type:'dungeon.action',system:'connections',action:'cross',target:step.connection}));drain(g);}
  else walk(g,step.at.x,step.at.y);
 }
 assert.fail('route did not terminate');
};
const open=(g,map,x,y,id)=>{go(g,map,x,y);inspect(g,id);drain(g);choose(g,'open');};

test('garden preserves six species, original plots and supplies; adds eight floors with permanent shore access',()=>{
 const hash=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
 assert.equal(hash({species:garden.species,plots:garden.plots.slice(0,6),supply:garden.supply,supplies:garden.supplies}),"a8e94696411021d81d45c9dd7bc5e70d0e0b306b1b3795d688dfa50f2080189e");
 assert.deepEqual(data.dungeons.region_3.maps.map(id=>data.maps[id].floor),[1,2,3,4,5,6,7,8,9,10]);
 const g=ready();go(g,'region_3_f3',5,3);assert.throws(()=>campaignRoute(g,{map:'region_3_f4'}));inspect(g,'intake');drain(g);choose(g,'leave');assert.throws(()=>campaignRoute(g,{map:'region_3_f4'}));
 inspect(g,'intake');drain(g);choose(g,'open');saved(g);go(g,'region_3_f10',9,1);
 for(const id of data.dungeons.region_3.maps)assert.ok(g.state.discovered[id]?.length,id);
 const before=campaignRoute(g,{map:'region_3_f1',x:1,y:1}).length;
 open(g,'region_3_f10',9,1,'lift_latch');open(g,'region_3_f6',5,1,'walk_latch');saved(g);go(g,'region_3_f10',9,1);
 assert.ok(campaignRoute(g,{map:'region_3_f1',x:1,y:1}).length<before);go(g,'region_3_f1',1,1);
});

test('fixed return survives all original/new terrain-plant combinations, growth and harvest without seeds or soil',()=>{
 const g=ready();g.state.flags.garden={intakeOpen:true};
 const plots=garden.plots.filter(p=>Object.keys(p.terrain).length);
 // Each terrain-capable bed is empty or fully grown. Existing thorn/bridge
 // combinations are included, without granting the new shortcut flags.
 for(let mask=0;mask<2**plots.length;mask++){
  g.feedback.events=[];const plants={};plots.forEach((p,i)=>{if(mask&(1<<i)){const kind=Object.keys(p.terrain)[0],species=Object.keys(garden.species).find(id=>garden.species[id].terrain===kind);plants[p.id]={species,age:garden.species[species].growth};}});
  g.state.dungeons.persistent.region_3.systems.garden.plants=plants;g.teleport('region_3_f10',9,1);
  assert.ok(campaignRoute(g,{map:'region_3_f1',x:1,y:1}).length,`plant mask ${mask}`);
 }
 g.state.dungeons.persistent.region_3.systems.garden.plants={};g.teleport('region_3_f1',1,1);act(g,'supplies');
 plant(g,'root_crossing','root_bridge');walk(g,6,3);saved(g);go(g,'region_3_f5',4,3);act(g,'harvest','root_crossing');assert.equal(g.walkable(g.map(),5,3),false);
 plant(g,'pollinator_vine','stair_vine');act(g,'climb','pollinator_vine');assert.equal(g.state.location.map,'region_3_f6');go(g,'region_3_f8',3,3);act(g,'harvest','pollinator_vine');
 for(const id of Object.keys(garden.supplies))g.state.inventory[id]=0;go(g,'region_3_f1',1,1);saved(g);
});

test('four supplies and two seed reserves pay once; repair, relay, oil, HP growth and successful steps stay distinct',()=>{
 const g=ready();g.state.flags.garden={intakeOpen:true};g.teleport('region_3_f7',1,1);assert.equal(g.dispatch({type:'expedition.action',camp:'garden_rest',action:'repair'}),false);
 const action=(camp,action)=>g.dispatch({type:'expedition.action',camp,action});
 let xp=g.state.actors.ada.xp,gems=g.state.expedition.gems;
 for(const [id,bonus,gem] of [['garden_upper',0,80],['garden_lower',0,100],['garden_nursery',300,40],['garden_rest',450,50]]){
  const c=data.expedition.camps.find(c=>c.id===id);go(g,c.map,c.x,c.y);const rope=g.state.inventory.rope??0;inspect(g,'supply_rope');drain(g);assert.equal(g.state.inventory.rope,rope+1);inspect(g,'supply_rope');drain(g);assert.equal(g.state.inventory.rope,rope+1);
  assert.ok(action(id,'repair'));xp+=bonus;gems+=gem;assert.equal(g.state.actors.ada.xp,xp);assert.equal(g.state.expedition.gems,gems);assert.equal(g.state.expedition.camps[id].relay,false);assert.ok(action(id,'relay'));assert.equal(action(id,'repair'),false);
  g.state.actors.ada.hp--;g.state.actors.sera.mp--;const hp=g.state.actors.ada.hp,mp=g.state.actors.sera.mp;
  if(oilTotal(data,g.state)<g.state.expedition.capacity)assert.ok(action(id,'draw'));assert.equal(g.state.actors.ada.hp,hp);assert.equal(g.state.actors.sera.mp,mp);saved(g);
 }
 for(const floor of [4,7]){
  go(g,`region_3_f${floor}`,3,1);const before={...g.state.inventory};inspect(g,'seed_reserve');drain(g);
  for(const id of Object.keys(garden.supplies))assert.equal(g.state.inventory[id],(before[id]??0)+(id==='garden_soil'?6:1));
  const after={...g.state.inventory};inspect(g,'seed_reserve');drain(g);assert.deepEqual(g.state.inventory,after);
 }
 plant(g,'rest_bed','cool_spore');if(g.state.light===0)assert.ok(g.dispatch(g.state.expedition.reserve?{type:'expedition.action',action:'refill'}:{type:'item',item:'torch',actor:'ada'}));drain(g);g.state.actors.ada.hp=1;g.state.actors.nio.hp=0;const before={steps:g.state.steps,oil:oilTotal(data,g.state),mp:g.state.actors.sera.mp,quests:structuredClone(g.state.quests)};
 for(let n=0;n<10;n++)act(g,'wait');assert.equal(g.state.actors.ada.hp,31);assert.equal(g.state.actors.nio.hp,0);assert.equal(g.state.actors.sera.mp,before.mp);assert.equal(g.state.steps,before.steps);assert.equal(oilTotal(data,g.state),before.oil);assert.deepEqual(g.state.quests,before.quests);
 walk(g,3,2);assert.equal(g.state.steps,before.steps+1);assert.equal(oilTotal(data,g.state),before.oil-1);saved(g);
 assert.equal(g.state.expedition.capacity,180);g.returnTown();goTownLocation(g,data.game.world.townRoot);const oil=oilTotal(data,g.state);assert.ok(g.dispatch({type:'checkpoint.travel',camp:'garden_rest'}));assert.equal(oilTotal(data,g.state),oil);saved(g);
});

test('nectar and moss apply locally; 10F forecourt is outside all plant effects and grants no boss rewards',()=>{
 const g=ready();act(g,'supplies');plant(g,'nectar_bed','red_nectar');assert.equal(dungeonEncounter(data,g.state).rate,2);
 plant(g,'quiet_bed','quiet_moss');assert.equal(dungeonEncounter(data,g.state).rate,.5);
 g.teleport('region_3_f6',5,3);assert.equal(dungeonEncounter(data,g.state).rate,1);
 g.teleport('region_3_f10',5,5);assert.equal(dungeonEncounter(data,g.state).rate,1);const old=structuredClone({xp:g.state.actors.ada.xp,gems:g.state.expedition.gems,battles:g.state.records.battles});inspect(g,'root_gate');drain(g);assert.deepEqual({xp:g.state.actors.ada.xp,gems:g.state.expedition.gems,battles:g.state.records.battles},old);assert.equal(data.expedition.camps.some(c=>c.dungeon==='region_3'&&data.maps[c.map].floor===10),false);
});

test('actual 1.29 garden save retains plant ages, old relay, supplies and progress without new rewards',()=>{
 const g=newGame();g.load(JSON.stringify(fixture));const s=structuredClone(g.state);s.contentVersion=fixture.state.contentVersion;assert.deepEqual(s,fixture.state);saved(g);
 for(const mutate of [s=>s.dungeons.persistent.region_3.systems.garden.plants.bridge_1.age=999,s=>s.dungeons.persistent.region_3.systems.garden.plants.fake={species:'cool_spore',age:0},s=>s.expedition.camps.garden_lower={supply:false,relay:true}]){
  const bad=structuredClone(fixture);mutate(bad.state);const before=g.save();assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),before);
 }
});
for(const options of [{size:4,mode:'grid',cultivate:false},{size:5,mode:'frontline',loadout:'bow',cultivate:true}])test(`earned garden route ${JSON.stringify(options)}`,()=>{
 const r=measureGarden(options);assert.equal(r.losses,0);assert.ok(r.minOil>27);assert.equal(r.checkpoints.length,4);assert.ok(r.returnSteps<100);assert.equal(r.waits>0,options.cultivate);assert.equal(r.walkingOil,r.stepsReturned);
});

test('every new walkable garden cell retains a route to its permanent shore under all terrain plants',()=>{
 const g=ready(),plots=garden.plots.slice(6).filter(p=>Object.keys(p.terrain).length);
 for(let mask=0;mask<2**plots.length;mask++){
  const plants={};plots.forEach((p,i)=>{if(mask&(1<<i)){const kind=Object.keys(p.terrain)[0],species=Object.keys(garden.species).find(id=>garden.species[id].terrain===kind);plants[p.id]={species,age:garden.species[species].growth};}});
  g.state.dungeons.persistent.region_3.systems.garden.plants=plants;
  for(const id of data.dungeons.region_3.maps.slice(2)){
   const m=data.maps[id],seen=new Set(['1,1']),queue=[[1,1]];
   for(const [x,y] of queue)for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,key=`${nx},${ny}`;if(!seen.has(key)&&g.walkable(m,nx,ny)){seen.add(key);queue.push([nx,ny]);}}
   for(let y=0;y<m.tiles.length;y++)for(let x=0;x<m.tiles[y].length;x++)if(g.walkable(m,x,y))assert.ok(seen.has(`${x},${y}`),`${id}/${x},${y}, plant mask ${mask}`);
  }
 }
});
