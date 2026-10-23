import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {data,newGame,drain,walk,navigateMaps,inspect,goTownLocation} from './helpers.mjs';
import {campPlan,checkpointPlan} from '../src/core/expedition.js';
import {connectionBlocked,connectionSide} from '../src/core/systems/map-connections.js';
import {validateSave} from '../src/core/save.js';
import {oilTotal} from '../src/core/expedition-oil.js';
const fixture=JSON.parse(await fs.readFile(new URL('./fixtures/waterway-save-1.27.0.json',import.meta.url)));
const ready=()=>{const g=newGame();g.data=structuredClone(data);delete g.data.quests.q001.story;g.accept('q001');g.complete('q001','informed');drain(g);g.random=()=>.99999;return g;};
const action=(g,camp,action)=>g.dispatch({type:'expedition.action',camp,action});
const saved=g=>{const s=g.save();assert.deepEqual(validateSave(JSON.parse(s),g.data),[]);g.load(s);assert.equal(g.save(),s);};
const at=(g,id)=>{const c=g.data.expedition.camps.find(c=>c.id===id);navigateMaps(g,c.map);walk(g,c.x,c.y);return c;};
const choose=(g,id)=>{assert.ok(g.dispatch({type:'choose',id}));drain(g);};
const dryStair=data.dungeons.region_1.systems.connections.links.find(l=>l.id==='dry_stair');

test('waterway follows all ten existing IDs; the old stair opens from 6F without moving story objects',()=>{
 const g=ready();g.dispatch({type:'travel',dungeon:'region_1'});
 assert.deepEqual(data.dungeons.region_1.maps.map(id=>data.maps[id].floor),[1,2,3,4,5,6,7,8,9,10]);
 assert.ok(connectionBlocked(data,g.state,connectionSide(dryStair,'region_1_landing')));
 navigateMaps(g,'region_1_f2');
 for(const id of data.dungeons.region_1.maps.slice(0,6))assert.ok(g.state.discovered[id]?.length,id);
 walk(g,1,1);inspect(g,'dry_stair_latch');drain(g);saved(g);choose(g,'leave');
 assert.ok(connectionBlocked(data,g.state,connectionSide(dryStair,'region_1_f2')));
 inspect(g,'dry_stair_latch');drain(g);choose(g,'open');saved(g);
 assert.equal(connectionBlocked(data,g.state,connectionSide(dryStair,'region_1_f2')),null);
 assert.ok(g.dispatch({type:'dungeon.action',system:'connections',action:'cross',target:'dry_stair'}));drain(g);
 assert.deepEqual([g.state.location.map,g.state.location.x,g.state.location.y],['region_1_landing',5,3]);
 assert.deepEqual(data.locations.waterway_checkpoint.dungeonEntrance,{dungeon:'region_1',map:'region_1_landing',x:13,y:3,facing:'south'});
 assert.ok(data.maps.region_1_landing.objects.some(o=>o.id==='q004_decision'&&o.x===13&&o.y===5));
});

test('fixed ropes, first repair rewards, separate relays and free oil survive saves and do not heal',()=>{
 const g=ready();g.dispatch({type:'travel',dungeon:'region_1'});at(g,'water_bridge');
 assert.equal(action(g,'water_bridge','repair'),false);
 let expectedXp=g.state.actors.ada.xp,expectedGems=g.state.expedition.gems;
 for(const [id,xp,gems] of [['water_landing',0,80],['water_branch',250,40],['water_bridge',350,50],['water_lower',0,100]]){
  at(g,id);const rope=g.state.inventory.rope??0;inspect(g,'supply_rope');drain(g);assert.equal(g.state.inventory.rope,rope+1);
  inspect(g,'supply_rope');drain(g);assert.equal(g.state.inventory.rope,rope+1);
  assert.ok(action(g,id,'repair'));expectedXp+=xp;expectedGems+=gems;
  assert.equal(g.state.actors.ada.xp,expectedXp);assert.equal(g.state.expedition.gems,expectedGems);
  assert.equal(g.state.expedition.camps[id].relay,false);assert.equal(action(g,id,'repair'),false);
  assert.equal(action(g,id,'relay'),['water_branch','water_bridge'].includes(id));saved(g);
  g.state.actors.ada.hp--;g.state.actors.sera.mp--;const hp=g.state.actors.ada.hp,mp=g.state.actors.sera.mp;
  if(oilTotal(data,g.state)<g.state.expedition.capacity)assert.ok(action(g,id,'draw'));
  assert.equal(g.state.actors.ada.hp,hp);assert.equal(g.state.actors.sera.mp,mp);
 }
 assert.equal(g.state.expedition.capacity,180);saved(g);
});

test('4F and 7F relay departures reject reflooding and retain oil when reopened',()=>{
 for(const [id,map,control,handle] of [['water_branch','region_1_canal_b','upper_valve','region_1_landing'],['water_bridge','region_1_canal_c','lower_gate','region_1_f2']]){
  const g=ready();g.dispatch({type:'travel',dungeon:'region_1'});
  at(g,'water_branch');inspect(g,'supply_rope');drain(g);assert.ok(action(g,'water_branch','repair'));
  at(g,id);if(id!=='water_branch'){inspect(g,'supply_rope');drain(g);assert.ok(action(g,id,'repair'));}
  assert.ok(action(g,id,'relay'));navigateMaps(g,handle);
  const p=data.dungeons.region_1.systems.water.controls.find(c=>c.id===control&&c.map===handle);walk(g,p.x,p.y);
  assert.ok(g.dispatch({type:'dungeon.action',system:'water',action:'open',target:control}));saved(g);
  assert.ok(g.returnTown());goTownLocation(g,data.game.world.townRoot);assert.match(checkpointPlan(g,id).reason,/水没/);
  const before=g.save();assert.equal(g.dispatch({type:'checkpoint.travel',camp:id}),false);assert.equal(g.state.mode,'town');
  assert.equal(oilTotal(data,g.state),oilTotal(data,JSON.parse(before).state));
  g.dispatch({type:'travel',dungeon:'region_1'});navigateMaps(g,handle);walk(g,p.x,p.y);
  assert.ok(g.dispatch({type:'dungeon.action',system:'water',action:'close',target:control}));assert.ok(g.returnTown());goTownLocation(g,data.game.world.townRoot);
  const oil=oilTotal(data,g.state);assert.ok(g.dispatch({type:'checkpoint.travel',camp:id}));assert.equal(g.state.location.map,map);assert.equal(oilTotal(data,g.state),oil);saved(g);
 }
});

const {measureWaterway}=await import('../tools/measure-waterway-campaign.mjs');
for(const options of [{size:4,mode:'grid'},{size:5,mode:'frontline',loadout:'bow'}])test(`earned waterway campaign ${options.size}/${options.mode}/${options.loadout??'standard'}`,()=>{
 const r=measureWaterway(options);assert.equal(r.losses,0);assert.equal(r.returnSteps,63);assert.equal(r.stepsReturned,190);
 assert.ok(r.bossRounds<=9);assert.ok(r.minOil>=27);assert.equal(r.checkpoints.length,5);
});

test('actual 1.27 lower-floor save keeps water and discovery, and opens its old return route without rewards',()=>{
 const g=newGame();g.load(JSON.stringify(fixture));const s=structuredClone(g.state);
 assert.equal(s.flags.waterway.dryStairOpen,true);delete s.flags.waterway;s.contentVersion=fixture.state.contentVersion;
 assert.deepEqual(s,fixture.state);saved(g);
 assert.equal(connectionBlocked(data,g.state,connectionSide(dryStair,'region_1_f2')),null);
 for(const change of [s=>s.dungeons.persistent.region_1.systems.water.controls.lower_gate='false',s=>s.expedition.camps.water_lower={supply:false,relay:true}]){
  const bad=structuredClone(fixture);change(bad.state);const before=g.save();assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),before);
 }
});

test('unvisited 1.27 saves do not get a shortcut; old supply and relay rewards are kept without regrant',()=>{
 const fresh=JSON.parse(newGame().save());fresh.contentVersion=fresh.state.contentVersion='1.27.0';
 const g=newGame();g.load(JSON.stringify(fresh));assert.equal(g.state.flags.waterway,undefined);
 const old=structuredClone(fixture);old.state.inventory.torch=1;old.state.expedition={...old.state.expedition,managed:true,storedBottles:2,camps:{water_landing:{supply:true,relay:true},water_lower:{supply:true,relay:true}},gems:180};
 g.load(JSON.stringify(old));assert.equal(g.state.expedition.gems,180);assert.deepEqual(g.state.expedition.camps,old.state.expedition.camps);
 assert.equal(action(g,'water_lower','repair'),false);assert.ok(g.returnTown());assert.ok(checkpointPlan(g,'water_lower').ok);saved(g);
});

for(const mode of ['classic','grid','frontline'])test(`${mode}: waterway boss preview, saved battle, shell cycle and one-time central rewards`,()=>{
 const g=ready();g.award(0,8400);g.state.battleModePreference=mode;g.teleport('region_1_gatehouse',3,1);
 assert.equal(campPlan(data,g.state,{camp:'water_central',action:'repair'}).ok,false);
 walk(g,5,3);
 inspect(g,'sluice_beast');drain(g);saved(g);choose(g,'leave');assert.equal(g.state.battle,null);
 inspect(g,'sluice_beast');drain(g);choose(g,'fight');saved(g);
 const water=structuredClone(g.state.dungeons.persistent.region_1.systems.water);
 for(let n=0;g.state.battle.round<3&&n<40;n++){assert.ok(g.dispatch({type:'battle',action:'skill',skill:'guard'}));drain(g);}
 assert.ok(g.state.battle.log.some(t=>t.includes('防御')));assert.ok(g.state.battle.log.some(t=>t.includes(data.skills.gate_slam.name)));saved(g);
 g.finishBattle('escape');drain(g);assert.equal(g.state.flags.waterway?.sluiceBeastWon,undefined);
 inspect(g,'sluice_beast');drain(g);choose(g,'fight');
 // This is a lifecycle fixture; the campaign tool below exercises earned combat.
 for(const e of g.state.battle.enemies)e.hp=0;g.finishBattle('win');drain(g);
 assert.equal(g.state.flags.waterway.sluiceBeastWon,true);assert.equal(g.state.inventory.exp_t2_ticket,1);assert.deepEqual(g.state.dungeons.persistent.region_1.systems.water,water);
 at(g,'water_central');inspect(g,'supply_rope');drain(g);const xp=g.state.actors.ada.xp,gems=g.state.expedition.gems;
 assert.ok(action(g,'water_central','repair'));assert.equal(g.state.actors.ada.xp,xp+600);assert.equal(g.state.expedition.gems,gems+70);assert.ok(action(g,'water_central','relay'));saved(g);
 assert.equal(action(g,'water_central','repair'),false);walk(g,5,3);inspect(g,'sluice_beast');drain(g);assert.equal(g.state.battle,null);assert.equal(g.state.inventory.exp_t2_ticket,1);
});
