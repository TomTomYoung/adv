import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {data,newGame,drain,goTownLocation,inspect} from './helpers.mjs';
import {validateSave} from '../src/core/save.js';
import {oilTotal} from '../src/core/expedition-oil.js';
import {capacityUpgradePlan,weaponCraftPlan,workshopDefinitionErrors} from '../src/core/expedition-workshop.js';
import {fieldActionPlan} from '../src/core/jobs.js';
import {projectGame} from '../src/application/projection.js';
import {corrosion} from '../src/core/systems/corrosion.js';
import {installDOM} from './view-dom.mjs';
import {renderShop} from '../src/view/inventory-view.js';
import {renderSkillShop} from '../src/view/expedition-view.js';
const setup=()=>{const g=newGame();g.data=structuredClone(data);delete g.data.quests.q001.story;g.accept('q001');g.complete('q001','informed');drain(g);g.award(1000,8400);return g;};
const act=(g,action,camp)=>g.dispatch({type:'expedition.action',action,camp});
function camp(g,id){
 const c=g.data.expedition.camps.find(c=>c.id===id),requires={kagaribi_crossroads:'kagaribi_manifold',water_bridge:'water_branch',mine_hoist:'mine_sorting',garden_rest:'garden_nursery'};
 if(requires[id]&&!g.state.expedition.camps[requires[id]]?.supply)camp(g,requires[id]);
 if(id==='mine_central')(g.state.flags.mine??={}).shellbreakerWon=true;
 const water=g.data.dungeons[c.dungeon].systems.water,zone=water?.use==='compartment_water'&&water.zones.find(z=>z.map===c.map);
 if(zone){const handle=water.controls.find(p=>p.id===zone.control);g.teleport(handle.map,handle.x,handle.y);if(g.state.dungeons.persistent[c.dungeon].systems.water.controls[zone.control])assert.ok(g.dispatch({type:'dungeon.action',system:'water',action:'close',target:zone.control}));}
 g.teleport(c.map,c.x,c.y,c.facing);if(!g.state.expedition.camps[id]?.supply){g.give('rope',1);assert.ok(act(g,'repair',id));}return c;
}
const town=g=>{assert.ok(g.returnTown());goTownLocation(g,data.expedition.shopLocation);};
const save=g=>{const saved=g.save();assert.deepEqual(validateSave(JSON.parse(saved),g.data),[]);g.load(saved);assert.equal(g.save(),saved);};
const reject=(g,fn)=>{const before=g.save(),bad=JSON.parse(before);fn(bad.state);assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),before);};
const materials=(g,tier=2)=>{for(const [id,n] of Object.entries(data.expedition.workshop.recipes[`exp_t${tier}_sword`].materials))g.give(id,n);};

for(const id of ['water_bridge','mine_hoist','garden_rest'])test(`${id}: local recipe works without K270, upgrades to330 once for120G, never supplies oil or HP/MP`,()=>{
 const g=setup();townFromStart(g);assert.equal(act(g,'upgrade_capacity'),false);
 const c=camp(g,id),before=structuredClone(g.state.actors),oil=oilTotal(g.data,g.state),gold=g.state.gold;
 g.state.location.x++;assert.equal(act(g,'recipe',id),false);g.state.location.x--;
 assert.ok(act(g,'recipe',id));assert.equal(g.state.expedition.capacity,180);assert.equal(g.state.gold,gold);assert.equal(oilTotal(g.data,g.state),oil);assert.deepEqual(g.state.actors,before);save(g);
 assert.equal(act(g,'recipe',id),false);assert.equal(act(g,'upgrade_capacity'),false);town(g);
 const townOil=oilTotal(g.data,g.state);g.state.gold=119;assert.equal(act(g,'upgrade_capacity'),false);assert.equal(g.state.gold,119);g.state.gold=120;
 assert.ok(act(g,'upgrade_capacity'));assert.equal(g.state.gold,0);assert.equal(g.state.expedition.capacity,330);assert.equal(oilTotal(g.data,g.state),townOil);assert.equal(act(g,'upgrade_capacity'),false);save(g);
 g.teleport(c.map,c.x,c.y,c.facing);assert.ok(act(g,'draw',id));assert.equal(oilTotal(g.data,g.state),330);save(g);
 assert.ok(act(g,'relay',id));assert.equal(g.state.expedition.capacity,330);save(g);
});
function townFromStart(g){if(g.state.mode==='dungeon')assert.ok(g.returnTown());goTownLocation(g,data.expedition.shopLocation);}
test('duplicate7F recipes become two spare machine parts once; a full bag keeps claim available',()=>{
 const g=setup();camp(g,'mine_hoist');assert.ok(act(g,'recipe','mine_hoist'));camp(g,'garden_rest');g.give('machine_part',99);const gold=g.state.gold;
 assert.equal(act(g,'recipe','garden_rest'),false);assert.deepEqual(g.state.expedition.workshop.claims,['mine_hoist']);g.give('machine_part',-2);
 assert.ok(act(g,'recipe','garden_rest'));assert.equal(g.state.inventory.machine_part,99);assert.equal(g.state.gold,gold);assert.equal(act(g,'recipe','garden_rest'),false);save(g);
 camp(g,'water_bridge');g.give('machine_part',-2);assert.ok(act(g,'recipe','water_bridge'));assert.equal(g.state.inventory.machine_part,99);save(g);
});
test('capacity save rejects missing provenance, duplicate/foreign claims, unsupported stages and impossible upgrades',()=>{
 const g=setup();camp(g,'mine_hoist');assert.ok(act(g,'recipe','mine_hoist'));town(g);assert.ok(act(g,'upgrade_capacity'));save(g);
 for(const change of [s=>delete s.expedition.workshop,s=>s.expedition.workshop.claims=[],s=>s.expedition.workshop.claims.push('mine_hoist'),s=>s.expedition.workshop.claims=['kagaribi_gate'],s=>s.expedition.workshop.upgraded=1,s=>s.expedition.workshop.unrecognized=true,s=>s.expedition.capacity=390,s=>s.expedition.workshop.upgraded=false,s=>s.expedition.camps.mine_hoist.supply=false])reject(g,change);
});
for(const [key,flag] of [['kagaribi','altarGuardianWon'],['waterway','sluiceBeastWon'],['mine','shellbreakerWon'],['garden','prunerWon']])test(`${key}: permanent10F record unlocks all nine260G T2 purchases and cheaper material reconstruction`,()=>{
 const g=setup();townFromStart(g);assert.equal(g.dispatch({type:'buy',item:'exp_t2_sword'}),false);assert.equal(g.dispatch({type:'weapon.craft',item:'exp_t2_sword'}),false);
 (g.state.flags[key]??={})[flag]=true;
 for(const id of Object.keys(data.expedition.workshop.recipes).filter(id=>id.startsWith('exp_t2_'))){
  g.state.gold=260;assert.ok(g.dispatch({type:'buy',item:id}));assert.equal(g.state.gold,0);
  materials(g);g.state.gold=170;assert.ok(g.dispatch({type:'weapon.craft',item:id}));assert.equal(g.state.gold,0);assert.equal(g.state.inventory[id],2);assert.equal(g.state.inventory.machine_part,0);assert.equal(g.state.inventory.soft_fiber,0);
  const copies=g.state.gear.bag[id];assert.equal(copies.length,2);assert.notEqual(copies[0],copies[1]);assert.ok(copies.every(id=>g.state.gear.items[id].salt===0));
 }save(g);
});
test('crafting checks current town, conversation, funds, materials and output capacity before any payment',()=>{
 const g=setup();camp(g,'mine_central');materials(g);assert.equal(g.dispatch({type:'weapon.craft',item:'exp_t2_sword'}),false);town(g);
 const unchanged=()=>({gold:g.state.gold,items:structuredClone(g.state.inventory),gear:structuredClone(g.state.gear)});
 for(const prepare of [()=>{g.state.gold=169;},()=>{g.state.gold=170;g.give('machine_part',-1);},()=>{g.give('machine_part',1);g.give('exp_t2_sword',99);}]){prepare();const before=unchanged();assert.equal(g.dispatch({type:'weapon.craft',item:'exp_t2_sword'}),false);assert.deepEqual(unchanged(),before);}
 g.give('exp_t2_sword',-1);g.run('mine.salt_warning.5');const before=unchanged();assert.equal(g.dispatch({type:'weapon.craft',item:'exp_t2_sword'}),false);assert.deepEqual(unchanged(),before);drain(g);
 assert.equal(g.dispatch({type:'weapon.craft',item:'constructor'}),false);assert.ok(g.dispatch({type:'weapon.craft',item:'exp_t2_sword'}));save(g);
});
test('T1 reconstruction uses its permanent4F record and replenishable shop materials; no recipe consumes oil',()=>{
 const g=setup();camp(g,'kagaribi_crossroads');town(g);materials(g,1);g.state.gold=70;assert.ok(g.dispatch({type:'weapon.craft',item:'exp_t1_sword'}));assert.equal(g.state.gold,0);save(g);
 for(const recipe of Object.values(data.expedition.workshop.recipes))for(const [id,n] of Object.entries(recipe.materials)){assert.notEqual(id,'torch');assert.ok(data.shops.goods.some(g=>g.item===id));assert.ok(n>0);}
 const invalid=structuredClone(data);invalid.expedition.workshop.recipes.exp_t2_sword.materials={torch:1};assert.ok(workshopDefinitionErrors(invalid).length);
});

for(const [script,key,flag,encounter,map,x,y] of [['mine.shellbreaker.10','mine','shellbreakerWon','mine_shell_guardian','region_2_f10',5,1],['garden.root_gate.10','garden','prunerWon','garden_root_guardian','region_3_f10',5,5]]){
 test(`${key}:10F first victory yields one ticket, re-entry and old victory recovery cannot duplicate it`,()=>{
  const g=setup();g.teleport(map,x,y);g.run(script);drain(g);assert.ok(g.dispatch({type:'choose',id:'leave'}));assert.equal(g.state.inventory.exp_t2_ticket??0,0);
  g.run(script);drain(g);assert.ok(g.dispatch({type:'choose',id:'fight'}));g.finishBattle('escape');drain(g);assert.equal(g.state.flags[key]?.[flag],undefined);assert.equal(g.state.inventory.exp_t2_ticket??0,0);
  g.run(script);drain(g);assert.ok(g.dispatch({type:'choose',id:'fight'}));for(const e of g.state.battle.enemies)e.hp=0;g.finishBattle('win');drain(g);
  assert.equal(g.state.inventory.exp_t2_ticket,1);assert.equal(g.state.flags[key].t2Granted,true);save(g);g.run(script);drain(g);assert.equal(g.state.inventory.exp_t2_ticket,1);
  const old=setup();old.teleport(map,x,y);(old.state.flags[key]??={})[flag]=true;old.give('exp_t2_ticket',99);old.run(script);drain(old);assert.equal(old.state.flags[key].t2Granted,undefined);
  old.give('exp_t2_ticket',-1);old.run(script);drain(old);assert.equal(old.state.inventory.exp_t2_ticket,99);save(old);old.run(script);drain(old);assert.equal(old.state.inventory.exp_t2_ticket,99);
 });
}
function waxUser(){const g=setup();camp(g,'mine_central');town(g);assert.ok(g.dispatch({type:'job.change',actor:'sera',job:'apothecary'}));g.give('medicine_kit',1);assert.ok(g.dispatch({type:'equip',actor:'sera',item:'medicine_kit'}));g.state.expedition.gems=180;assert.ok(g.dispatch({type:'skill.buy',actor:'sera',skill:'exp_wax_care',level:1}));assert.equal(g.state.expedition.gems,0);assert.equal(g.dispatch({type:'skill.buy',actor:'sera',skill:'exp_wax_care',level:2}),false);return g;}
const wax=(g,target)=>g.dispatch({type:'job.action',actor:'sera',ability:'exp_wax_care',target});
test('wax selection names individual copies, spends6MP only on confirmation, rejects wrong/stale/already-protected targets',()=>{
 const g=waxUser();g.give('exp_t2_sword',2);const [one,two]=g.state.gear.bag.exp_t2_sword;const mp=g.state.actors.sera.mp;assert.equal(wax(g,one),false);g.teleport('region_2_f9',1,1);
 const plan=fieldActionPlan(g.data,g.state,'sera','exp_wax_care');assert.ok(plan.targets.some(t=>t.id===one&&t.name.includes(`個体${one.slice(5)}`)));assert.equal(wax(g),false);assert.equal(wax(g,'gear_999999'),false);assert.equal(g.state.actors.sera.mp,mp);
 assert.ok(wax(g,one));assert.equal(g.state.actors.sera.mp,mp-6);assert.equal(g.state.gear.items[one].wax,true);assert.equal(g.state.gear.items[two].wax,undefined);save(g);
 assert.equal(wax(g,one),false);assert.equal(g.state.actors.sera.mp,mp-6);reject(g,s=>s.gear.items[one].wax=false);reject(g,s=>s.gear.items[one].wax=2);
 g.state.actors.sera.mp=5;assert.equal(wax(g,two),false);assert.equal(g.state.gear.items[two].wax,undefined);
});
for(const mode of ['classic','grid','frontline'])test(`${mode}: wax protects only its copy once; eater still destroys salty gear and town craft rebuilds a new copy`,()=>{
 const g=waxUser();g.give('exp_t2_sword',2);assert.ok(g.dispatch({type:'equip',actor:'ada',item:'exp_t2_sword'}));const one=g.state.gear.equipped.ada.weapon,two=g.state.gear.bag.exp_t2_sword[0];g.teleport('region_2_f9',1,1);
 assert.ok(wax(g,one));g.state.gear.items[one].salt=3;g.startBattle('salt_eater_feeding',{}, {battleMode:mode,manualTurns:true});assert.equal(g.state.gear.items[one].salt,3);assert.equal(g.state.gear.items[one].wax,undefined);assert.equal(g.state.gear.items[two].salt,0);save(g);g.finishBattle('escape');drain(g);
 g.startBattle('salt_eater_feeding',{}, {battleMode:mode,manualTurns:true});assert.equal(g.state.gear.items[one].salt,4);const spec=g.data.dungeons.region_2.systems.salt;
 corrosion.battleRound({data:g.data,state:g.state,engine:g,spec});assert.equal(g.state.gear.items[one],undefined);assert.equal(g.state.actors.ada.equipment.weapon,undefined);assert.ok(g.state.gear.items[two]);g.finishBattle('escape');drain(g);town(g);
 materials(g);g.state.gold=170;assert.ok(g.dispatch({type:'weapon.craft',item:'exp_t2_sword'}));const rebuilt=g.state.gear.bag.exp_t2_sword.at(-1);assert.notEqual(rebuilt,one);assert.equal(g.state.gear.items[rebuilt].salt,0);save(g);
});
test('washing and returning preserve unused wax, and corrosion floors consume it only once',()=>{
 const g=waxUser();g.give('exp_t2_sword',1);assert.ok(g.dispatch({type:'equip',actor:'ada',item:'exp_t2_sword'}));const one=g.state.gear.equipped.ada.weapon;g.teleport('region_2_f9',1,1);assert.ok(wax(g,one));g.state.gear.items[one].salt=3;
 town(g);assert.equal(g.state.gear.items[one].salt,0);assert.equal(g.state.gear.items[one].wax,true);g.teleport('region_2_f9',1,1);const loc=g.state.location,map=g.data.maps[loc.map];
 // Authored corrosion floor: use the actual cell layer resolver, no direct status manipulation.
 map.cells.overrides[`${loc.x},${loc.y}`]={parameters:{corrosion:2}};
 const ctx={data:g.data,state:g.state,engine:g,spec:g.data.dungeons.region_2.systems.salt,movement:true};corrosion.step(ctx);assert.equal(g.state.gear.items[one].salt,0);assert.equal(g.state.gear.items[one].wax,undefined);corrosion.step(ctx);assert.equal(g.state.gear.items[one].salt,2);
});
test('real1.31 campaign migrates without auto-awarding recipes, capacity, gold, tickets or protection',async()=>{
 const original=JSON.parse(await fs.readFile(new URL('./fixtures/workshop-save-1.31.0.json',import.meta.url),'utf8')),g=newGame();g.load(JSON.stringify(original));
 const expected=structuredClone(original.state);expected.contentVersion=data.game.version;assert.deepEqual(g.state,expected);assert.equal(g.state.expedition.workshop,undefined);save(g);
 townFromStart(g);assert.equal(capacityUpgradePlan(g.data,g.state).ok,false);materials(g);assert.equal(weaponCraftPlan(g.data,g.state,'exp_t2_sword').ok,true);
});
test('shop detail follows selected weapon, browsing consumes nothing, craft button and capacity action use the displayed cost',()=>{
 const dom=installDOM();try{
  const g=setup();camp(g,'mine_hoist');assert.ok(act(g,'recipe','mine_hoist'));(g.state.flags.mine??={}).shellbreakerWon=true;town(g);materials(g);
  const view={shopItem:'exp_t2_sword',inventoryAction:null,root:document.createElement('main'),act:i=>g.dispatch(i),portrait:()=>document.createElement('img')};let model=projectGame(g);view.model=model;
  const before=g.save();renderShop(view,view.root,model);assert.equal(g.save(),before);const craft=view.root.querySelector('[data-focus="shop:craft:exp_t2_sword"]');assert.ok(craft);assert.equal(craft.disabled,false);craft.click();assert.equal(g.state.inventory.exp_t2_sword,1);
  model=projectGame(g);const parent=document.createElement('div');renderSkillShop(view,parent,model);const upgrade=[...parent.querySelectorAll('button')].find(b=>b.textContent.includes('330へ改修'));assert.ok(upgrade);upgrade.click();assert.equal(g.state.expedition.capacity,330);save(g);
 }finally{dom.restore();}
});
