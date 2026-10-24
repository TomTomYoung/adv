import {enableOil} from '../src/core/expedition-oil.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {data,newGame,drain,inspect,walk,goTownLocation} from './helpers.mjs';
import {validateSave} from '../src/core/save.js';
import {reinforcementDefinitionErrors,joinReinforcements} from '../src/core/battle-reinforcements.js';
import {activeActor,battleSkillPlan,applySkill} from '../src/core/battle.js';
import {gridMovePlan} from '../src/core/battle-grid.js';
import {frontlineMovePlan} from '../src/core/battle-frontline.js';
import {buffAccuracy,tickBuffs} from '../src/core/buffs.js';
import {campPlan,skillPurchasePlan} from '../src/core/expedition.js';
import {projectBattleSkills} from '../src/application/job-projection.js';
const ready=()=>{const g=newGame();g.data=structuredClone(data);delete g.data.quests.q001.story;g.accept('q001');g.complete('q001','informed');drain(g);g.award(0,8400);return g;};
const saved=g=>{const text=g.save();assert.deepEqual(validateSave(JSON.parse(text),g.data),[]);g.load(text);assert.equal(g.save(),text);};
const start=(mode,edit=()=>{})=>{const g=ready();edit(g);g.startBattle('garden_root_guardian',{}, {battleMode:mode,manualTurns:true});return g;};
const nextRound=g=>{const round=g.state.battle.round;for(let n=0;n<80&&g.state.battle?.round===round;n++)assert.ok(g.dispatch({type:'battle.step'}));assert.equal(g.state.battle?.round,round+1);};
const badLoad=(g,mutate)=>{const before=g.save(),bad=JSON.parse(before);mutate(bad.state);assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),before);};

for(const mode of ['classic','grid','frontline']){
 test(`${mode}: finite bee joins after root defeat at round start, has one AGI slot and round-trips`,()=>{
  const g=start(mode);assert.equal(g.state.battle.enemies.length,2);saved(g);
  nextRound(g);assert.equal(g.state.battle.enemies.length,2);g.state.battle.enemies[1].hp=0;saved(g);nextRound(g);
  const b=g.state.battle;assert.equal(b.enemies.length,3);assert.deepEqual(b.reinforcements,[{id:'nectar_bee',round:3}]);assert.equal(b.enemies[2].instance,'enemy_2');
  assert.equal(b.turnQueue.filter(k=>k==='enemy:enemy_2').length,1);assert.ok(b.turnQueue.indexOf('enemy:enemy_2')<b.turnQueue.indexOf('enemy:enemy_0'));
  if(mode==='frontline'){const old=b.frontline.events.filter(e=>e.round<3);assert.ok(old.length);assert.ok(old.every(e=>!Object.hasOwn(e.hp,'enemy:enemy_2')));assert.ok(b.frontline.events.some(e=>e.type==='reinforcements'));}
  saved(g);nextRound(g);assert.equal(g.state.battle.enemies.length,3);saved(g);
  for(const mutate of [b=>b.reinforcements.push({...b.reinforcements[0]}),b=>b.reinforcements[0].id='unknown',b=>b.reinforcements[0].round=1,b=>b.reinforcements[0].round=b.round+1,b=>b.enemies[2].id='candle_bee',b=>b.enemies[2].stats.hp++,b=>b.enemies[2].instance='enemy_0',b=>b.turnQueue.push('enemy:enemy_2')])badLoad(g,s=>mutate(s.battle));
  if(mode==='grid')badLoad(g,s=>s.battle.grid.positions['enemy:enemy_2']={...s.battle.grid.positions['enemy:enemy_0']});
  if(mode==='frontline')badLoad(g,s=>s.battle.frontline.events[0].hp['enemy:enemy_2']=120);
 });
 test(`${mode}: living root delays the bee; dead boss suppresses it and all dead wins immediately`,()=>{
  const g=start(mode);nextRound(g);nextRound(g);assert.equal(g.state.battle.enemies.length,2);
  g.state.battle.enemies[0].hp=0;nextRound(g);g.state.battle.enemies[1].hp=0;
  assert.ok(g.dispatch({type:'battle.step'}));assert.equal(g.state.battle,null);assert.deepEqual(g.state.battleResult.reinforcements,[]);saved(g);drain(g);
 });
 test(`${mode}: occupied requested cell uses a deterministic vacancy without RNG; bodies and objects are retained`,()=>{
  const g=start(mode),b=g.state.battle;nextRound(g);b.enemies[1].hp=0;
  if(mode==='grid')b.grid.positions['enemy:enemy_0']={x:3,y:2};
  if(mode==='frontline'){b.enemies[1].frontlineDefeat='remain';b.frontline.positions['enemy:enemy_1']={lane:3,depth:0};b.frontline.objects=[{id:'obstacle',side:'enemies',lane:2,depth:0}];}
  b.round=3;const rng=g.state.rng;joinReinforcements(g);assert.equal(g.state.rng,rng);assert.equal(b.enemies.length,3);
  if(mode==='grid')assert.notDeepEqual(b.grid.positions['enemy:enemy_2'],{x:3,y:2});
  if(mode==='frontline'){assert.notDeepEqual(b.frontline.positions['enemy:enemy_2'],{lane:3,depth:0});assert.notDeepEqual(b.frontline.positions['enemy:enemy_2'],{lane:2,depth:0});assert.equal(b.frontline.positions['enemy:enemy_1'].depth,0);}
 });
 test(`${mode}: only joined enemies pay XP/gems/gold/drops; result save resumes once`,()=>{
  for(const joined of [false,true]){
   const g=start(mode);if(joined){g.state.battle.enemies[1].hp=0;nextRound(g);nextRound(g);}
   const b=g.state.battle,roster=b.enemies.map(e=>e.id),gold=g.state.gold,xp=g.state.actors.ada.xp,gems=g.state.expedition.gems,torch=g.state.inventory.torch;
   for(const e of b.enemies)e.hp=0;g.random=()=>0;g.finishBattle('win');
   assert.equal(g.state.gold-gold,roster.reduce((n,id)=>n+data.enemies[id].rewards.gold,0));assert.equal(g.state.actors.ada.xp-xp,roster.reduce((n,id)=>n+data.enemies[id].rewards.xp,0));assert.equal(g.state.expedition.gems-gems,joined?56:46);
   saved(g);badLoad(g,s=>s.battleResult.reinforcements.push({id:'unknown',round:3}));
   while(g.state.battleResult){saved(g);assert.ok(g.dispatch({type:'advance'}));}
   assert.equal(g.state.inventory.torch,torch+(joined?1:0));saved(g);
  }
 });
}

test('reinforcement cap defers sixth survivor and a full Frontline board defers joins without consuming schedule',()=>{
 const g=start('classic',g=>{const e=g.data.encounters.garden_root_guardian;e.enemies=Array(5).fill('garden_root_shell');e.reinforcements=[{id:'one',enemy:'garden_nectar_bee',round:2}];delete e.enemyPositions;delete e.frontlinePositions;});
 nextRound(g);assert.equal(g.state.battle.enemies.length,5);assert.deepEqual(g.state.battle.reinforcements,[]);g.state.battle.enemies[1].hp=0;nextRound(g);assert.equal(g.state.battle.enemies.length,6);assert.equal(g.state.battle.enemies.filter(e=>e.hp>0).length,5);saved(g);
 const f=start('frontline');f.state.battle.enemies[1].hp=0;f.state.battle.frontline.objects=Array.from({length:15},(_,n)=>({id:`wall_${n}`,side:'enemies',lane:n%5,depth:Math.floor(n/5)}));nextRound(f);nextRound(f);assert.equal(f.state.battle.enemies.length,2);f.state.battle.frontline.objects=[];nextRound(f);assert.equal(f.state.battle.enemies.length,3);saved(f);
});

test('invalid schedules reject unbounded, duplicate, unknown, noninitial dependencies and invalid positions',()=>{
 for(const edit of [e=>e.reinforcements=[],e=>e.reinforcements[0].enemy='missing',e=>e.reinforcements[0].enemy='constructor',e=>e.reinforcements[0].afterDefeat='enemy_00',e=>e.reinforcements[0].round=1,e=>e.reinforcements[0].position={x:5,y:0},e=>e.reinforcements[0].afterDefeat='enemy_2',e=>e.reinforcements.push(e.reinforcements[0]),e=>e.reinforcements[0].repeat=true,e=>e.enemies=Array(6).fill('garden_root_shell')]){const d=structuredClone(data);edit(d.encounters.garden_root_guardian);assert.ok(reinforcementDefinitionErrors(d).length);}
});

test('actual 1.30 save migrates without changing plants, progress, purchases or granting central supply',async()=>{
 const fixture=JSON.parse(await fs.readFile(new URL('./fixtures/garden-boss-save-1.30.0.json',import.meta.url))),g=newGame();g.load(JSON.stringify(fixture));const state=structuredClone(g.state);state.contentVersion=fixture.state.contentVersion;assert.deepEqual(state,{...fixture.state,scenarioEdition:'e1'});assert.equal(g.state.expedition.camps.garden_central,undefined);saved(g);
 const bad=structuredClone(fixture);bad.state.dungeons.persistent.region_3.systems.garden.plants.nursery_bed.age=-1;const before=g.save();assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),before);
});

test('root gate cancel/escape do not unlock; victory and central repairs pay once and enable relay and paid roots',()=>{
 const g=ready();g.random=()=>.99;g.teleport('region_3_f10',5,5);inspect(g,'root_gate');drain(g);assert.ok(g.dispatch({type:'choose',id:'leave'}));drain(g);assert.equal(g.state.battle,null);
 g.teleport('region_3_f10',7,1);assert.equal(campPlan(data,g.state,{camp:'garden_central',action:'repair'}).ok,false);
 for(const result of ['escape','win']){g.teleport('region_3_f10',5,5);inspect(g,'root_gate');drain(g);assert.ok(g.dispatch({type:'choose',id:'fight'}));if(result==='win')for(const e of g.state.battle.enemies)e.hp=0;g.finishBattle(result);drain(g);assert.equal(g.state.flags.garden?.prunerWon??false,result==='win');}
 g.teleport('region_3_f10',7,1);inspect(g,'supply_rope');drain(g);const xp=g.state.actors.ada.xp,gems=g.state.expedition.gems;assert.ok(g.dispatch({type:'expedition.action',camp:'garden_central',action:'repair'}));assert.equal(g.state.actors.ada.xp-xp,650);assert.equal(g.state.expedition.gems-gems,70);assert.equal(g.dispatch({type:'expedition.action',camp:'garden_central',action:'repair'}),false);assert.ok(g.dispatch({type:'expedition.action',camp:'garden_central',action:'relay'}));saved(g);
 walk(g,9,1);walk(g,7,1);g.state.actors.ada.hp--;g.state.actors.il.mp--;const hp=g.state.actors.ada.hp,mp=g.state.actors.il.mp;assert.ok(g.dispatch({type:'expedition.action',camp:'garden_central',action:'draw'}));assert.equal(g.state.actors.ada.hp,hp);assert.equal(g.state.actors.il.mp,mp);
 g.returnTown();goTownLocation(g,data.game.world.townRoot);assert.ok(g.dispatch({type:'checkpoint.travel',camp:'garden_central'}));assert.deepEqual([g.state.location.map,g.state.location.x,g.state.location.y],['region_3_f10',7,1]);saved(g);
});

for(const mode of ['classic','grid','frontline'])test(`${mode}: purchased roots cost 180 gems/8 MP, cap two targets, block movement or reduce accuracy for this round`,()=>{
 const g=ready();g.returnTown();goTownLocation(g,data.expedition.skillShopLocation);assert.ok(g.dispatch({type:'job.change',actor:'il',job:'druid'}));g.give('exp_t1_staff',1);assert.ok(g.dispatch({type:'equip',actor:'il',item:'exp_t1_staff'}));g.state.expedition.gems=500;
 assert.equal(skillPurchasePlan(data,g.state,'il','exp_root_bind',1).ok,false);g.state.expedition.camps.garden_central={supply:true,relay:false};enableOil(data,g.state);assert.ok(g.dispatch({type:'skill.buy',actor:'il',skill:'exp_root_bind',level:1}));assert.equal(g.state.expedition.gems,320);assert.equal(g.dispatch({type:'skill.buy',actor:'il',skill:'exp_root_bind',level:1}),false);assert.equal(g.skills('sera').includes('exp_root_bind'),false);
 const encounter=g.data.encounters.garden_root_guardian;encounter.enemies.push('garden_nectar_bee');encounter.enemyPositions=[{x:2,y:1},{x:2,y:2},{x:3,y:1}];encounter.frontlinePositions=[{lane:2,depth:1},{lane:2,depth:0},{lane:3,depth:1}];
 g.startBattle(encounter.id,{}, {battleMode:mode,manualTurns:true});g.random=()=>.5;
 while(activeActor(g)!=='il')assert.ok(g.dispatch({type:'battle.step'}));
 if(mode==='grid'){g.state.battle.grid.positions['enemy:enemy_0']={x:2,y:1};g.state.battle.grid.positions['enemy:enemy_1']={x:2,y:2};g.state.battle.grid.positions['enemy:enemy_2']={x:3,y:1};}
 const card=projectBattleSkills(g,'il').find(s=>s.id==='exp_root_bind'),choices=card.choices??Object.entries(card.availability).map(([id,v])=>({id,...v}));
 const choice=choices.find(c=>c.enabled&&battleSkillPlan(g,'il','exp_root_bind',c.id).targets.length===2);assert.ok(choice);
 const mp=g.state.actors.il.mp;assert.ok(g.dispatch({type:'battle',action:'skill',skill:'exp_root_bind',target:choice.id}));assert.equal(g.state.actors.il.mp,mp-8);
 const b=g.state.battle;assert.equal(b.buffs.filter(x=>x.id==='exp_rooted').length,2);saved(g);
 for(const e of g.state.battle.enemies.filter(e=>g.state.battle.buffs.some(b=>b.target==='enemy:'+e.instance))){assert.equal(buffAccuracy(data,g.state.battle,e,1),mode==='classic'?.9:1);if(mode==='grid')assert.match(gridMovePlan(g.state,e,{x:3,y:1},data).reason,/根留め/);if(mode==='frontline')assert.match(frontlineMovePlan(g.state,e,{depth:2},data).reason,/根留め/);}
 if(mode==='classic'){const e=g.state.battle.enemies[0],a=g.state.actors.ada,hp=a.hp;g.random=()=>.95;applySkill(g,e,a,data.skills.attack,'attack',true);assert.equal(a.hp,hp);}
 tickBuffs(g.state.battle,data);tickBuffs(g.state.battle,data,'after_advance');assert.equal(g.state.battle.buffs.length,0);assert.equal(buffAccuracy(data,g.state.battle,g.state.battle.enemies[0],1),1);saved(g);
});


test('Frontline root blocks the next automatic advance once, then releases without moving into a bound survivor',()=>{
 const g=start('frontline'),b=g.state.battle;b.enemies[1].hp=0;g.data.encounters.garden_root_guardian.reinforcements[0].round=10;
 // Enemy-source binding fixture exercises the same movement clock as S15.
 g.data.skills.garden_prune.selfEffects=[{type:'buff',buff:'exp_rooted'}];
 b.buffs.push({id:'exp_rooted',target:'enemy:enemy_0',sourceEnemy:'enemy_0',sourceSkill:'garden_prune',remaining:1});
 nextRound(g);assert.equal(g.state.battle.frontline.positions['enemy:enemy_0'].depth,1);assert.equal(g.state.battle.buffs.length,0);saved(g);
 g.data.skills.garden_prune.selfEffects=[];nextRound(g);assert.equal(g.state.battle.frontline.positions['enemy:enemy_0'].depth,0);saved(g);
});
