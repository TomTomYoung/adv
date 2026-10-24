import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {data,newGame,drain,walk,navigateMaps,inspect,goTownLocation,fight} from './helpers.mjs';
import {campPlan,skillPurchasePlan,expeditionShopTier} from '../src/core/expedition.js';
import {connectionBlocked,connectionSide} from '../src/core/systems/map-connections.js';
import {validateSave} from '../src/core/save.js';
import {purchasePlan} from '../src/core/inventory.js';
import {projectGame} from '../src/application/projection.js';
import {oilTotal} from '../src/core/expedition-oil.js';
import {recordSchemas} from '../config/shared/studio/supplemental.js';
import {validateSchema} from '../config/shared/schema.js';
const fixtures=JSON.parse(await fs.readFile(new URL('./fixtures/kagaribi-saves-1.26.0.json',import.meta.url)));
const ready=()=>{const g=newGame();g.data=structuredClone(data);delete g.data.quests.q001.story;g.accept('q001');g.complete('q001','informed');drain(g);g.random=()=>.99999;return g;};
const checkpoint=g=>{const s=g.save();assert.deepEqual(validateSave(JSON.parse(s),g.data),[]);g.load(s);assert.equal(g.save(),s);};
const act=(g,camp,action)=>g.dispatch({type:'expedition.action',camp,action});
const at=(g,id)=>{const c=g.data.expedition.camps.find(c=>c.id===id);g.teleport(c.map,c.x,c.y,c.facing);return c;};
const link=id=>data.dungeons.kagaribi.systems.connections.links.find(l=>l.id===id);

test('fresh routes require 3F, 6F and 9F; local latches make actual return shortcuts',()=>{
 const g=ready();
 for(const [id,map] of [['oilstore_crossroads','kagaribi_oilstore'],['soot_relay','kagaribi_f2'],['last_altar','kagaribi_last_patrol']])assert.ok(connectionBlocked(data,g.state,connectionSide(link(id),map)));
 g.teleport('kagaribi_kilns',7,1,'north');inspect(g,'kiln_latch');drain(g);assert.ok(g.dispatch({type:'choose',id:'open'}));drain(g);
 assert.equal(connectionBlocked(data,g.state,connectionSide(link('soot_relay'),'kagaribi_f2')),null);
 g.teleport('kagaribi_f3',1,7,'west');inspect(g,'altar_latch');drain(g);assert.ok(g.dispatch({type:'choose',id:'open'}));drain(g);
 assert.equal(connectionBlocked(data,g.state,connectionSide(link('last_altar'),'kagaribi_last_patrol')),null);checkpoint(g);
});

test('3F to 4F supply dependency, first-only experience and 4F/7F skill shelves are authoritative',()=>{
 const g=ready();at(g,'kagaribi_crossroads');const before=g.save();assert.equal(act(g,'kagaribi_crossroads','repair'),false);assert.equal(g.state.expedition.gems,0);
 at(g,'kagaribi_gate');assert.ok(act(g,'kagaribi_gate','repair'));assert.equal(act(g,'kagaribi_gate','relay'),false);
 assert.ok(g.returnTown());goTownLocation(g,'hikarigaeri_shop');g.give('iron_sword',1);g.dispatch({type:'equip',actor:'ada',item:'iron_sword'});
 assert.equal(purchasePlan(g,'exp_t1_sword').ok,false);goTownLocation(g,data.expedition.skillShopLocation);assert.equal(skillPurchasePlan(data,g.state,'ada','exp_row_sweep',1).ok,false);
 g.give('rope',5);const xp=g.state.actors.ada.xp;at(g,'kagaribi_manifold');assert.ok(act(g,'kagaribi_manifold','repair'));assert.equal(g.state.actors.ada.xp,xp+600);assert.equal(act(g,'kagaribi_manifold','repair'),false);assert.equal(g.state.actors.ada.xp,xp+600);
 at(g,'kagaribi_crossroads');assert.ok(act(g,'kagaribi_crossroads','repair'));assert.ok(act(g,'kagaribi_crossroads','relay'));assert.equal(g.state.actors.ada.xp,xp+1400);checkpoint(g);
 assert.ok(g.returnTown());goTownLocation(g,'hikarigaeri_shop');g.state.gold=500;assert.ok(purchasePlan(g,'exp_t1_sword').ok);assert.ok(g.dispatch({type:'buy',item:'exp_t1_sword'}));assert.equal(g.state.inventory.exp_t1_sword,1);
 goTownLocation(g,data.expedition.skillShopLocation);g.state.expedition.gems=500;assert.ok(skillPurchasePlan(data,g.state,'ada','exp_row_sweep',1).ok);
 at(g,'kagaribi_relay');assert.equal(act(g,'kagaribi_relay','repair'),false);
 g.state.flags.kagaribi={kilnGate:true};assert.ok(act(g,'kagaribi_relay','repair'));assert.equal(expeditionShopTier(data,g.state),1);assert.ok(act(g,'kagaribi_relay','relay'));assert.equal(expeditionShopTier(data,g.state),2);assert.equal(g.state.expedition.capacity,270);checkpoint(g);
});

for(const [scene,old] of Object.entries(fixtures))test(`actual 1.26 fixture: ${scene} retains location, VM, equipment, actors, camps and battle`,()=>{
 const g=newGame();g.load(JSON.stringify(old));const s=structuredClone(g.state);s.contentVersion=old.state.contentVersion;
 for(const k of ['legacyOilRoute','legacySootRoute','legacyAltarRoute','legacyShopTier'])delete s.flags.kagaribi?.[k];
 if(!old.state.flags.kagaribi&&s.flags.kagaribi&&!Object.keys(s.flags.kagaribi).length)delete s.flags.kagaribi;
 assert.deepEqual(s,{...old.state,scenarioEdition:'e1'});checkpoint(g);
 if(scene==='choice'){assert.equal(g.state.waiting.type,'choice');assert.ok(g.dispatch({type:'choose',id:'open'}));drain(g);assert.ok(g.state.flags.kagaribi.kilnGate);}
 if(scene==='town'){assert.equal(g.state.expedition.learned.ada.exp_row_sweep,1);goTownLocation(g,data.expedition.skillShopLocation);assert.ok(skillPurchasePlan(data,g.state,'ada','exp_stance_break',1).reason.includes('足りません'));}
 if(scene==='field'){assert.equal(g.state.flags.kagaribi.legacyOilRoute,true);assert.equal(g.state.flags.kagaribi.legacySootRoute,true);assert.equal(g.state.flags.kagaribi.legacyAltarRoute,true);assert.equal(g.state.expedition.camps.kagaribi_gate.relay,true);}
});
test('damaged 1.26 camp state cannot acquire migration exemptions',()=>{
 const bad=structuredClone(fixtures.field);bad.state.expedition.camps.kagaribi_gate.supply=false;const g=newGame(),before=g.save();assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),before);
});

test('T2 weapon exchange consumes one earned ticket, preserves cancellation, and rejects full inventory',()=>{
 const g=ready();goTownLocation(g,'hikarigaeri_shop');assert.ok(g.dispatch({type:'service',id:'kagaribi_weapon_exchange'}));drain(g);assert.equal(g.dispatch({type:'choose',id:'axe'}),false);g.dispatch({type:'choose',id:'leave'});drain(g);
 g.give('exp_t2_ticket',1);g.dispatch({type:'service',id:'kagaribi_weapon_exchange'});drain(g);checkpoint(g);g.dispatch({type:'choose',id:'leave'});drain(g);assert.equal(g.state.inventory.exp_t2_ticket,1);
 g.give('exp_t2_sword',99);g.dispatch({type:'service',id:'kagaribi_weapon_exchange'});drain(g);assert.equal(g.dispatch({type:'choose',id:'sword'}),false);assert.ok(g.dispatch({type:'choose',id:'staff'}));drain(g);assert.equal(g.state.inventory.exp_t2_ticket,0);assert.equal(g.state.inventory.exp_t2_staff,1);checkpoint(g);
 assert.deepEqual(validateSchema(data.items.exp_t1_axe,recordSchemas.item),[]);assert.ok(validateSchema({...data.enemies.kagaribi_altar_keeper,stats:{...data.enemies.kagaribi_altar_keeper.stats,agi:-1}},recordSchemas.monster).length);
});

for(const mode of ['classic','grid','frontline'])test(`${mode}: guardian preview, warning, saved battle, first win and central repair`,()=>{
 const g=ready();g.state.battleModePreference=mode;g.award(0,8400);g.teleport('kagaribi_f3',5,1,'west');
 assert.equal(campPlan(data,g.state,{camp:'kagaribi_central',action:'repair'}).ok,false);
 inspect(g,'altar_keeper');drain(g);assert.ok(g.dispatch({type:'choose',id:'fight'}));drain(g);assert.equal(g.state.battle.encounter,'kagaribi_altar_guardian');checkpoint(g);
 // Preserve all real turns until the announced attack, then win through the shared engine.
 for(let n=0;g.state.battle&&g.state.battle.round<4&&n<60;n++){assert.ok(g.dispatch({type:'battle',action:'skill',skill:'guard'}));drain(g);}
 assert.ok(g.state.battle.firedEvents.includes('fire_warning'));assert.ok(g.state.battle.log.some(t=>t.includes('炎嵐')));checkpoint(g);
 if(mode==='classic')fight(g);else {for(const e of g.state.battle.enemies)e.hp=0;g.finishBattle('win');drain(g);}
 assert.equal(g.state.flags.kagaribi.altarGuardianWon,true);assert.equal(g.state.inventory.exp_t2_ticket,1);
 at(g,'kagaribi_central');g.give('rope',1);const xp=g.state.actors.ada.xp;assert.ok(act(g,'kagaribi_central','repair'));assert.ok(act(g,'kagaribi_central','relay'));assert.equal(g.state.actors.ada.xp,xp+2000);
 assert.equal(act(g,'kagaribi_central','repair'),false);checkpoint(g);
 g.teleport('kagaribi_f3',5,1);inspect(g,'altar_keeper');drain(g);assert.equal(g.state.battle,null);assert.equal(g.state.inventory.exp_t2_ticket,1);
});

// Walk the real network and defeat the boss at earned levels; no encounter RNG
// or optional quest rewards are represented as a tuned full campaign.
const {measureRoute}=await import('../tools/measure-kagaribi-route.mjs');
for(const size of [4,5])test(`${size} members finish the deterministic equipment route without injected XP or healing`,()=>{
 const r=measureRoute(size);assert.equal(r.totalSteps,185);assert.equal(r.gems,220);assert.ok(r.actors.every(a=>a.level===12));assert.ok(r.route.slice(1).every(p=>p.arrivalOil>0));
});
