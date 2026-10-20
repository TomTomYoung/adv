import test from 'node:test';
import assert from 'node:assert/strict';
import {data,newGame,drain,goTownLocation} from './helpers.mjs';
import {GameEngine} from '../src/core/engine.js';
import {oilTotal,oilLamp,rememberOil} from '../src/core/expedition-oil.js';
import {campPlan,checkpointPlan,skillPurchasePlan,campSafe} from '../src/core/expedition.js';
import {validateSave} from '../src/core/save.js';
import {fireContext} from '../src/core/systems/fire-network.js';
import {effectiveSkill,recordSkillUse} from '../src/core/skill-levels.js';
import {permission} from '../src/core/jobs.js';
import {battleSkillPlan,activeActor} from '../src/core/battle.js';
import {fieldSkillPlan} from '../src/core/field-skills.js';
import {projectGame} from '../src/application/projection.js';
import {commandTargets,commandDialog} from '../src/core/player-commands.js';
import {installDOM} from './view-dom.mjs';
import {replaceView} from '../src/view/view-layout.js';

function game(){
  const g=newGame();g.data=structuredClone(data);
  // The introductory story itself is covered by the real q001 route suites.
  delete g.data.quests.q001.story;g.accept('q001');g.complete('q001','informed');drain(g);
  g.random=()=>.99;return g;
}
const at=(g,camp='kagaribi_gate')=>{const c=g.data.expedition.camps.find(c=>c.id===camp);g.teleport(c.map,c.x,c.y,c.facing);return c;};
const action=(g,action,camp='kagaribi_gate')=>g.dispatch({type:'expedition.action',action,camp});
const repair=(g,camp='kagaribi_gate')=>{if(camp==='kagaribi_relay')g.state.flags.kagaribi={...g.state.flags.kagaribi,kilnGate:true};if(camp==='kagaribi_central')g.state.flags.kagaribi={...g.state.flags.kagaribi,altarGuardianWon:true};if(camp==='kagaribi_crossroads'&&!g.state.expedition.camps.kagaribi_manifold?.supply){g.give('rope',1);repair(g,'kagaribi_manifold');}at(g,camp);assert.ok(action(g,'repair',camp));};
const roundtrip=g=>{const saved=g.save();assert.deepEqual(validateSave(JSON.parse(saved),g.data),[]);g.load(saved);assert.equal(g.save(),saved);};
const town=g=>{assert.ok(g.returnTown());goTownLocation(g,g.data.expedition.shopLocation);};
function equipped(g,actor,item){g.give(item,1);assert.ok(g.dispatch({type:'equip',actor,item}));}
function shop(){const g=game();repair(g,'kagaribi_relay');assert.ok(action(g,'relay','kagaribi_relay'));town(g);equipped(g,'ada','iron_sword');equipped(g,'sera','staff');equipped(g,'il','staff');g.state.expedition.gems=10000;return g;}
const buy=(g,actor,skill,level=1)=>g.dispatch({type:'skill.buy',actor,skill,level});

test('supply equipment is revealed after q001, requires local rope, and rewards repair exactly once',()=>{
  const locked=newGame();at(locked);assert.equal(action(locked,'repair'),false);assert.equal(projectGame(locked).dungeon.objects.some(o=>o.id==='camp:kagaribi_gate'),false);
  const g=game();at(g);const before=structuredClone(g.state.actors),rope=g.state.inventory.rope,gold=g.state.gold;
  g.state.location.x=2;assert.equal(action(g,'repair'),false);g.state.location.x=1;
  g.state.inventory.rope=0;assert.equal(action(g,'repair'),false);g.state.inventory.rope=rope;
  assert.ok(action(g,'repair'));assert.equal(g.state.inventory.rope,rope-1);assert.equal(g.state.expedition.gems,24);
  assert.equal(g.state.gold,gold);assert.deepEqual(g.state.actors,before);roundtrip(g);
  assert.equal(action(g,'repair'),false);assert.equal(g.state.expedition.gems,24);assert.equal(g.state.inventory.rope,rope-1);
  assert.ok(campSafe(g.data,g.state));assert.ok(projectGame(g).dungeon.objects.some(o=>o.id==='camp:kagaribi_gate'));
});
test('real inspect menu repairs, draws and activates a checkpoint without bypassing command prompts',()=>{
  const g=game();at(g);assert.ok(g.dispatch({type:'player.command',id:'inspect'}));
  const target=commandTargets(g,'inspect').find(t=>t.name==='巡回路の給油所');
  assert.ok(g.dispatch({type:'choose',id:commandDialog(g).options.find(o=>o.target===target.id).id}));
  assert.ok(g.dispatch({type:'choose',id:commandDialog(g).options.find(o=>o.intent?.action==='repair').id}));drain(g);
  assert.equal(g.state.expedition.camps.kagaribi_gate.supply,true);assert.equal(action(g,'relay'),false);assert.ok(checkpointPlan(g,'kagaribi_gate').reason);roundtrip(g);
});
test('all bottles including personally carried ones share capacity and overflow is retained at the depot',()=>{
  const g=game();g.give('torch',10);g.state.carried={ada:{torch:5}};repair(g);
  assert.equal(oilTotal(g.data,g.state),180);assert.equal(g.state.inventory.torch,1);assert.equal(g.state.expedition.storedBottles,12);roundtrip(g);
  const gold=g.state.gold;town(g);assert.equal(g.dispatch({type:'buy',item:'torch',actor:'ada'}),false);assert.equal(g.state.gold,gold);
  g.give('torch',2);assert.equal(g.state.inventory.torch,1);assert.equal(g.state.expedition.storedBottles,14);roundtrip(g);
});
test('free oil is repeatable but limited; refuel preserves fire, costs only transferred oil, and never heals',()=>{
  const g=game();repair(g);const flame=fireContext(g.data,g.state).run.portable;flame.fuel=20;flame.effect='deep';
  g.state.actors.ada.hp=1;g.state.actors.il.mp=1;const before=structuredClone(g.state.actors);
  assert.ok(action(g,'draw'));assert.equal(oilTotal(g.data,g.state),180);assert.equal(g.state.expedition.reserve,70);assert.equal(action(g,'draw'),false);
  assert.ok(g.dispatch({type:'dungeon.action',system:'fires',action:'refuel',target:'portable'}));
  assert.equal(flame.fuel,90);assert.equal(flame.effect,'deep');assert.equal(g.state.expedition.reserve,0);assert.deepEqual(g.state.actors,before);
  flame.fuel=30;assert.ok(action(g,'draw'));assert.equal(g.state.expedition.reserve,60);assert.equal(oilTotal(g.data,g.state),180);roundtrip(g);
});
test('taking a seed flame cannot create free carrying fuel; a partial reserve transfers only its quantity',()=>{
  const g=game();repair(g);const ctx=fireContext(g.data,g.state);g.give('torch',-(g.state.inventory.torch??0));g.state.expedition.reserve=12;
  assert.ok(g.dispatch({type:'dungeon.action',system:'fires',action:'collect',target:'portable'}));
  assert.ok(g.dispatch({type:'dungeon.action',system:'fires',action:'extinguish',target:'portable'}));
  assert.ok(g.dispatch({type:'dungeon.action',system:'fires',action:'transplant',target:'portable'}));
  assert.equal(ctx.run.portable.fuel,12);assert.equal(g.state.expedition.reserve,0);assert.equal(ctx.run.ember,null);
  assert.ok(g.dispatch({type:'dungeon.action',system:'fires',action:'extinguish',target:'portable'}));
  assert.equal(g.dispatch({type:'dungeon.action',system:'fires',action:'ignite',target:'portable'}),false);roundtrip(g);
});
test('bottling, withdrawals, returns and fresh departures do not duplicate or auto-fill oil',()=>{
  const g=game();repair(g);g.give('torch',-(g.state.inventory.torch??0));assert.ok(action(g,'draw'));assert.equal(g.state.expedition.reserve,90);
  const total=oilTotal(g.data,g.state);assert.ok(action(g,'bottle'));assert.equal(oilTotal(g.data,g.state),total);assert.equal(g.state.inventory.torch,1);
  fireContext(g.data,g.state).run.portable.fuel=19;rememberOil(g.data,g.state);town(g);const missing=180-oilTotal(g.data,g.state),stored=g.state.expedition.storedBottles*90;
  assert.ok(action(g,'withdraw'));assert.equal(g.state.expedition.reserve,missing);assert.equal(g.state.expedition.storedOil+g.state.expedition.storedBottles*90,stored-missing);
  goTownLocation(g,g.data.game.world.townRoot);assert.ok(g.dispatch({type:'travel',dungeon:'kagaribi'}));assert.equal(oilLamp(g.data,g.state).fuel,19);roundtrip(g);
});
test('normal lamps use the shared reserve and still respect water and gas ignition hazards',()=>{
  const g=game();repair(g,'mine_upper');g.give('torch',-(g.state.inventory.torch??0));g.state.light=0;rememberOil(g.data,g.state);assert.ok(action(g,'draw','mine_upper'));
  const d=g.data.dungeons.region_2;d.hazards=[{id:'wet_probe',name:'漏水',kind:'water_leak',condition:true,points:[{map:g.state.location.map,x:1,y:1}]}];
  const before=g.state.expedition.reserve;assert.equal(action(g,'refill'),false);assert.equal(g.state.expedition.reserve,before);
  d.hazards=[];assert.ok(action(g,'refill'));assert.equal(g.state.light,90);assert.equal(g.state.expedition.reserve,before-90);
  g.state.light=0;d.hazards=[{id:'gas_probe',name:'ガス',kind:'gas_leak',condition:true,points:[{map:g.state.location.map,x:1,y:1}],explosion:{damage:1,target:'party',patches:[]}}];
  assert.ok(action(g,'refill'));assert.equal(g.state.light,0);assert.equal(g.state.expedition.reserve,0);
});
test('relay unlock and capacity persist; checkpoint starts require the real town entrance and retain HP/MP',()=>{
  const g=game();repair(g,'kagaribi_relay');assert.equal(checkpointPlan(g,'kagaribi_relay').ok,false);assert.ok(action(g,'relay','kagaribi_relay'));assert.equal(g.state.expedition.capacity,270);
  g.state.actors.ada.hp=3;g.state.actors.il.mp=2;const hp=g.state.actors.ada.hp,mp=g.state.actors.il.mp;roundtrip(g);town(g);
  assert.equal(g.dispatch({type:'checkpoint.travel',camp:'kagaribi_relay'}),false);
  goTownLocation(g,g.data.game.world.townRoot);assert.ok(g.dispatch({type:'checkpoint.travel',camp:'kagaribi_relay'}));
  assert.equal(g.state.location.map,'kagaribi_relay');assert.equal(g.state.actors.ada.hp,hp);assert.equal(g.state.actors.il.mp,mp);
  assert.equal(g.dispatch({type:'checkpoint.travel',camp:'kagaribi_gate'}),false);roundtrip(g);
  g.state.dungeonRestrictions.push({dungeon:'kagaribi',action:'return',source:'test_seal',reason:'封印'});assert.equal(g.returnTown(),false);assert.equal(g.dispatch({type:'checkpoint.travel',camp:'kagaribi_relay'}),false);
});
test('all supply points save correctly and only relay camps permit fresh checkpoint departures',()=>{
  for(const c of data.expedition.camps){const g=game();repair(g,c.id);if(c.relayEnabled===false){assert.equal(action(g,'relay',c.id),false);roundtrip(g);continue;}assert.ok(action(g,'relay',c.id));roundtrip(g);town(g);goTownLocation(g,g.data.game.world.townRoot);assert.ok(g.dispatch({type:'checkpoint.travel',camp:c.id}),c.id);assert.equal(g.state.location.map,c.map);roundtrip(g);}
});
test('gems are committed on victory once, survive every result cursor, and are absent on defeat or escape',()=>{
  const g=game(),before=g.state.expedition.gems;g.startBattle('wild_waterwheel_beaver',{win:[],lose:[],escape:[]});const n=g.data.expedition.enemyGems.waterwheel_beaver;
  for(const e of g.state.battle.enemies)e.hp=0;g.finishBattle('win');assert.equal(g.state.expedition.gems,before+n);
  while(g.state.battleResult){roundtrip(g);g.dispatch({type:'advance'});assert.equal(g.state.expedition.gems,before+n);}
  for(const result of ['escape','repel','interrupted','lose']){const h=game(),gems=h.state.expedition.gems;h.startBattle('wild_waterwheel_beaver',{win:[],lose:[],escape:[]});h.finishBattle(result);assert.equal(h.state.expedition.gems,gems);}
});
test('skills are personal, tier/weapon/job gated, sequentially priced, and purchases cannot repeat',()=>{
  const g=shop(),id='exp_row_sweep',before=g.state.expedition.gems;
  assert.ok(buy(g,'ada',id));assert.equal(g.state.expedition.gems,before-120);assert.ok(g.skills('ada').includes(id));assert.equal(g.skills('berg').includes(id),false);
  assert.equal(buy(g,'ada',id),false);assert.equal(buy(g,'ada',id,3),false);assert.equal(buy(g,'il',id),false);assert.equal(g.state.expedition.gems,before-120);
  assert.ok(buy(g,'ada',id,2));assert.ok(buy(g,'ada',id,3));assert.equal(g.state.expedition.gems,before-840);assert.equal(effectiveSkill(g.data,g.state,'ada',id).mp,5);
  for(let n=0;n<20;n++)recordSkillUse(g,'ada',id);assert.equal(g.state.expedition.learned.ada[id],3);roundtrip(g);
  assert.ok(g.dispatch({type:'job.change',actor:'ada',job:'mage'}));assert.equal(g.skills('ada').includes(id),false);assert.equal(g.state.expedition.learned.ada[id],3);assert.ok(g.dispatch({type:'job.change',actor:'ada',job:'warrior'}));assert.ok(g.skills('ada').includes(id));roundtrip(g);
});
test('unavailable purchases never charge: no weapon, no gems, wrong location, busy, or unsold upgrade',()=>{
  const g=shop(),id='exp_chain_thunder';assert.ok(buy(g,'il',id));const gems=g.state.expedition.gems;assert.equal(buy(g,'il',id,2),false);assert.equal(g.state.expedition.gems,gems);
  g.state.expedition.gems=0;assert.equal(buy(g,'ada','exp_row_sweep'),false);assert.equal(g.state.expedition.learned.ada,undefined);
  g.state.expedition.gems=500;assert.ok(g.dispatch({type:'unequip',actor:'ada',slot:'weapon'}));assert.equal(buy(g,'ada','exp_row_sweep'),false);
  goTownLocation(g,g.data.game.world.townRoot);assert.equal(buy(g,'il','exp_chain_flame'),false);assert.equal(g.state.expedition.gems,500);
  goTownLocation(g,g.data.expedition.shopLocation);g.run('prologue');assert.equal(buy(g,'il','exp_chain_flame'),false);assert.equal(g.state.expedition.gems,500);
});
test('paid healing upgrades increase the granted target count and cleanse wet without restoring dead actors',()=>{
  const g=shop(),id='exp_clearwater_aid';for(const level of [1,2,3])assert.ok(buy(g,'sera',id,level));
  g.state.actors.ada.hp=1;g.state.actors.nio.hp=2;g.state.actors.ada.statuses=['wet'];g.state.actors.il.hp=0;
  assert.equal(permission(g.data,g.state,'sera',id,'battle.skill').maxTargets,2);assert.equal(fieldSkillPlan(g,'sera',id).targets.length,2);
  assert.ok(g.dispatch({type:'field.skill',actor:'sera',skill:id}));assert.ok(g.state.actors.ada.hp>1);assert.ok(g.state.actors.nio.hp>2);assert.deepEqual(g.state.actors.ada.statuses,[]);assert.equal(g.state.actors.il.hp,0);roundtrip(g);
});
for(const mode of ['classic','grid','frontline'])test(`${mode}: paid area attacks enter actual battle planning and resolve with their MP cost`,()=>{
  const g=shop();assert.ok(buy(g,'il','exp_chain_flame'));g.state.battleModePreference=mode;
  g.startBattle('wild_pair_1',{win:[],lose:[],escape:[]});const b=g.state.battle;
  if(mode==='grid'){b.grid.positions['actor:il']={x:2,y:3};b.grid.positions['enemy:enemy_0']={x:2,y:2};b.grid.positions['enemy:enemy_1']={x:3,y:2};}
  if(mode==='frontline'){b.frontline.positions['actor:il']={depth:1,lane:2};b.frontline.positions['enemy:enemy_0']={depth:0,lane:2};b.frontline.positions['enemy:enemy_1']={depth:0,lane:3};}
  b.turnQueue=['actor:il'];b.turnIndex=0;b.preemptive=null;b.phase='input';
  const plan=battleSkillPlan(g,'il','exp_chain_flame','enemy_0');assert.ok(plan.ok,plan.reason);assert.equal(plan.targets.length,2);
  const mp=g.state.actors.il.mp;assert.ok(g.dispatch({type:'battle',action:'skill',skill:'exp_chain_flame',target:'enemy_0'}));assert.equal(g.state.actors.il.mp,mp-9);
});
test('1.25 town, field, active battle and result saves migrate once without changing their existing progress',()=>{
  for(const scene of ['town','field','battle','result']){
    const oldData=structuredClone(data);delete oldData.expedition;oldData.game.version='1.25.0';
    const old=new GameEngine(oldData);drain(old);if(scene==='field')old.teleport('kagaribi_f1',1,1);
    if(['battle','result'].includes(scene)){old.startBattle('wild_pair_1',{win:[],lose:[],escape:[]});if(scene==='result'){for(const e of old.state.battle.enemies)e.hp=0;old.finishBattle('win');}}
    const before=structuredClone(old.state);const g=newGame();g.load(old.save());const migrated=structuredClone(g.state);delete migrated.expedition;migrated.contentVersion='1.25.0';assert.deepEqual(migrated,before);
    assert.equal(g.state.expedition.managed,false);assert.equal(g.state.expedition.gems,0);roundtrip(g);
    if(scene==='result'){drain(g);assert.equal(g.state.expedition.gems,0);}
  }
});
test('1.25 saves before q201 additions gain the complete cohort without resetting existing quests',()=>{
  const old=JSON.parse(newGame().save());old.contentVersion=old.state.contentVersion='1.25.0';delete old.state.expedition;
  for(let n=201;n<=210;n++)delete old.state.quests['q'+n];const g=newGame();g.load(JSON.stringify(old));assert.equal(Object.keys(g.state.quests).length,210);roundtrip(g);
});
test('corrupted oil, checkpoint, gem and purchase state is rejected atomically',()=>{
  const g=shop();assert.ok(buy(g,'ada','exp_row_sweep'));roundtrip(g);const saved=g.save();
  for(const corrupt of [s=>delete s.expedition,s=>s.expedition.gems=-1,s=>s.expedition.reserve=1e9,s=>s.expedition.capacity=450,s=>s.expedition.camps.fake={supply:true,relay:true},s=>s.expedition.camps.kagaribi_relay.supply=false,s=>s.expedition.learned.ada.exp_row_sweep=3,s=>s.expedition.learned.ada.attack=1,s=>s.expedition.lamp.effect='fake']){
    const bad=JSON.parse(saved);corrupt(bad.state);assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),saved);
  }
});
for(const layout of ['classic','scene'])test(`${layout}: skill shop selection is free, buying dispatches once, and checkpoint button works`,()=>{
  const g=shop(),dom=installDOM();let view;const intents=[];
  const ui={status(){},menu(){},help(){},sound(){},soundEnabled:()=>false,effectsMode:()=> 'off'};
  const dispatch=intent=>{intents.push(intent);const changed=g.dispatch(intent);view.render(projectGame(g));return changed;};
  try{
    view=replaceView(null,layout,dom.root,dispatch,ui);view.tab='shop';view.render(projectGame(g));const before=g.save();
    const card=[...dom.root.querySelectorAll('.skill-shop-card')].find(c=>c.textContent.includes('横列払い'));assert.ok(card);assert.equal(g.save(),before);
    card.querySelector('button').click();assert.equal(intents.filter(i=>i.type==='skill.buy').length,1);assert.equal(g.state.expedition.learned.ada.exp_row_sweep,1);
    goTownLocation(g,g.data.game.world.townRoot);view.render(projectGame(g));view.tab='regions';view.render(projectGame(g));const b=[...dom.root.querySelectorAll('button')].find(b=>b.textContent==='7F 中継篝火の補給営から再開');assert.ok(b);b.click();assert.equal(g.state.location.map,'kagaribi_relay');
  }finally{view?.destroy();dom.restore();}
});
