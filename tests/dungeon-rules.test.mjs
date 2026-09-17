import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {data,newGame,drain,fight,exploreSpot} from './helpers.mjs';
import {finishJourney} from './structure-routes.mjs';
import {GameEngine} from '../src/core/engine.js';
import {restoreGame} from '../src/application/restore.js';
import {projectGame} from '../src/application/projection.js';
import {dungeonEncounter,dungeonFloodLevel} from '../src/core/dungeons.js';
import {fireContext,fireEnvironment} from '../src/core/systems/fire-network.js';
import {battleSkillPlan,activeActor} from '../src/core/battle.js';
import {wetAfterSkill,wetResistance} from '../src/core/wet.js';
import {validateSave} from '../src/core/save.js';
import {gearErrors} from '../src/core/equipment.js';
const action=(g,system,action,target,extra={})=>g.dispatch({type:'dungeon.action',system,action,target,...extra});
const choose=(g,...ids)=>{for(const id of ids){assert.ok(g.dispatch({type:'choose',id}),id);drain(g);finishJourney(g);}};
const enter=region=>{const g=newGame();g.dispatch({type:'travel',region});return g;};
const tickAt=level=>data.dungeons.region_1.systems.water.phases.slice(0,data.dungeons.region_1.systems.water.phases.findIndex(p=>p.level===level)).reduce((n,p)=>n+p.duration,0);
const setLevel=(g,level)=>{g.state.dungeons.active.systems.water.elapsed=tickAt(level);};
const roundtrip=g=>{const s=g.save();assert.deepEqual(validateSave(JSON.parse(s),g.data),[]);g.load(s);assert.equal(g.save(),s);};
const escape=g=>{g.random=()=>0;assert.ok(g.dispatch({type:'battle',action:'escape'}));drain(g);};
for(const ending of ['informed','compromise'])test(`q001 ${ending}: fire rules, empty oil, fear, rescue and every save boundary agree`,()=>{
 const g=newGame();g.accept('q001');exploreSpot(g,data.quests.q001.locations[0]);
 assert.match(g.state.log.join('\n'),/くらがり除け/);assert.equal(g.state.stories.q001.values.rookieAt,'entry');
 for(const id of ['talk','inspect','follow']){choose(g,id);roundtrip(g);assert.equal(g.state.stories.q001.values.rookieAt,'entry');}
 const lamp=data.maps.kagaribi_f1.objects.find(o=>o.id==='q001_last_lamp');assert.equal(g.objectState(lamp),'low');
 assert.equal(fireEnvironment(fireContext(data,g.state)).protected,true);choose(g,'support');roundtrip(g);
 assert.equal(g.state.objects['kagaribi_f1/q001_last_lamp'],'extinguished');assert.equal(fireContext(data,g.state).run.portable.lit,false);assert.equal(fireEnvironment(fireContext(data,g.state)).protected,false);
 assert.equal(g.state.stories.q001.values.darkness,'attacking');fight(g);roundtrip(g);
 const v=g.state.stories.q001.values;assert.equal(v.afraid,true);assert.equal(v.steppedForward,true);assert.equal(v.rookieAt,'dark');assert.equal(v.oldOil+v.newOil+v.oilUsed,2);assert.equal(fireEnvironment(fireContext(data,g.state)).protected,true);
 choose(g,'home','report','pause');roundtrip(g);g.run(data.quests.q001.model.entryScript);drain(g);choose(g,ending==='informed'?'repair':'rest');roundtrip(g);assert.equal(g.state.quests.q001.outcome,ending);assert.equal(g.state.mode,'town');
 const gold=g.state.gold;g.run(data.quests.q001.model.entryScript);drain(g);assert.equal(g.state.gold,gold);
});
test('q001 oil-less wall cannot ignite by attempting to transfer flame and object states are individual',()=>{
 const g=newGame();g.accept('q001');g.dispatch({type:'travel',dungeon:'kagaribi'});g.teleport('kagaribi_f1',8,1,'east');const e=data.quests.q001.events.find(e=>e.id==='q001_empty_west');g.run(e.script);drain(g);assert.match(g.state.log.at(-1),/油切れ/);assert.equal(g.objectState(g.map().objects.find(o=>o.id===e.id)),'empty');assert.equal(g.objectState(g.map().objects.find(o=>o.id==='q001_last_lamp')),'low');roundtrip(g);
});
test('2D flooding is floor-wide, has ten internal levels and exactly three visual bands',()=>{
 const g=enter(1);
 for(let level=1;level<=9;level++){setLevel(g,level);const vm=projectGame(g).dungeon,depth=level<=3?1:level<=6?2:3;for(const row of vm.cells)for(const c of row)if(!c.wall)assert.equal(c.waterDepth,depth);assert.equal(g.walkable(g.map(),2,1),level<6);roundtrip(g);}
});
test('a rising tide strands rather than teleports at six, allows waiting, and drowns at ten',()=>{
 const g=enter(1);g.teleport('region_1_f1',3,1,'south');g.state.dungeons.active.systems.water.elapsed=tickAt(6)-1;const loc=structuredClone(g.state.location),events=structuredClone(g.state.events);assert.ok(action(g,'water','wait'));assert.equal(dungeonFloodLevel(data,g.state),6);assert.deepEqual(g.state.location,loc);assert.deepEqual(g.state.events,events);assert.equal(g.dispatch({type:'move',direction:'forward'}),false);roundtrip(g);
 g.state.dungeons.active.systems.water.elapsed=tickAt(10)-1;assert.ok(action(g,'water','wait'));assert.equal(g.state.mode,'town');assert.ok(g.state.members.every(id=>g.state.actors[id].hp>0));roundtrip(g);
});
test('gate drainage covers one floor, persists, and both floors share the saved clock',()=>{
 const g=enter(1);setLevel(g,6);assert.ok(action(g,'water','close','upper_gate'));assert.equal(dungeonFloodLevel(data,g.state),0);assert.ok(g.walkable(g.map(),3,3));assert.equal(g.walkable(data.maps.region_1_f2,1,1),false);const elapsed=g.state.dungeons.active.systems.water.elapsed;assert.equal(action(g,'water','close','upper_gate'),false);assert.equal(g.state.dungeons.active.systems.water.elapsed,elapsed);roundtrip(g);g.returnTown();g.dispatch({type:'travel',region:1});assert.equal(g.state.dungeons.active.systems.water.elapsed,0);assert.equal(g.state.dungeons.persistent.region_1.systems.water.controls.upper_gate,false);
});
test('diving item and skill protect the entire party through level ten and spend only once',()=>{
 for(const method of ['item','skill']){const g=newGame();if(method==='skill')g.changeJob('il','druid');else g.give('diving_kit',1);g.dispatch({type:'travel',region:1});const mp=g.state.actors.il.mp;
  assert.ok(g.dispatch(method==='skill'?{type:'job.action',actor:'il',ability:'water_breath'}:{type:'item',actor:'ada',item:'diving_kit'}));assert.equal(g.state.actors.il.mp,mp-(method==='skill'?4:0));setLevel(g,10);assert.ok(action(g,'water','wait'));assert.equal(g.state.mode,'dungeon');assert.ok(g.dispatch({type:'move',direction:'forward'}));roundtrip(g);const before=g.save();assert.equal(action(g,'water','protect',null,{item:'diving_kit'}),false);assert.equal(g.state.inventory.diving_kit,JSON.parse(before).state.inventory.diving_kit);g.returnTown();g.dispatch({type:'travel',region:1});assert.equal(g.state.dungeons.active.systems.water.protected,false);
 }
});
test('wet penalties, recoil, fire prohibition and dry-land recovery share actual immersion state',()=>{
 const g=enter(1),dry=g.stats('ada');setLevel(g,4);action(g,'water','wait');assert.ok(g.state.members.every(id=>g.state.actors[id].statuses.includes('wet')));assert.ok(g.stats('ada').agi<dry.agi);assert.ok(g.stats('ada').str<dry.str);assert.equal(wetResistance(g.state.actors.il,'ice'),1.5);
 const hp=g.state.actors.il.hp;wetAfterSkill(g,g.state.actors.il,data.skills.lightning);assert.ok(g.state.actors.il.hp<hp);assert.ok(g.state.actors.il.statuses.includes('wet'));assert.equal(g.jobAction('il','dry_clothes'),false);
 setLevel(g,7);g.startBattle('water_giant',{win:[],escape:[],lose:[]});assert.equal(battleSkillPlan(g,'il','fire','enemy_0').ok,false);escape(g);g.returnTown();assert.ok(g.state.actors.il.statuses.includes('wet'));assert.ok(g.jobAction('il','dry_clothes'));assert.ok(g.state.members.every(id=>!g.state.actors[id].statuses.includes('wet')));roundtrip(g);
});
test('flood depth selects increasingly strong fish and modifies fire/water damage',async()=>{
 const {dungeonDamageScale}=await import('../src/core/dungeons.js');const g=enter(1);
 for(const [level,id] of [[1,'water_small'],[4,'water_predator'],[7,'water_giant']]){setLevel(g,level);assert.equal(dungeonEncounter(data,g.state).encounter,id);assert.ok(dungeonDamageScale(data,g.state,'water')>1);assert.ok(dungeonDamageScale(data,g.state,'fire')<1);}
 assert.ok(data.enemies.water_giant.stats.hp>data.enemies.water_predator.stats.hp);assert.ok(data.enemies.water_predator.stats.hp>data.enemies.water_darter.stats.hp);
});
test('same-name equipment copies retain separate salt when swapped, bagged, saved and washed',()=>{
 const g=newGame();g.give('iron_sword',2);g.give('hand_axe',1);g.equip('ada','iron_sword');const old=g.state.gear.equipped.ada.weapon;g.dispatch({type:'travel',region:2});for(let n=0;n<4;n++){g.startBattle('roaming_2',{win:[],escape:[],lose:[]});escape(g);}assert.equal(g.state.gear.items[old].salt,4);g.equip('ada','hand_axe');g.equip('ada','iron_sword');const fresh=g.state.gear.equipped.ada.weapon;assert.notEqual(old,fresh);assert.equal(g.state.gear.items[fresh].salt,0);assert.equal(g.state.gear.items[old].salt,4);roundtrip(g);
 g.teleport('region_2_f1',3,1,'east');assert.ok(g.dispatch({type:'move',direction:'forward'}));assert.ok(Object.values(g.state.gear.items).every(c=>c.salt===0));roundtrip(g);
});
test('salt eater appears at the threshold, consumes one physical copy, and loss persists after exit',()=>{
 const g=newGame();g.give('iron_sword',2);g.equip('ada','iron_sword');const target=g.state.gear.equipped.ada.weapon;g.dispatch({type:'travel',region:2});g.state.gear.items[target].salt=4;assert.equal(dungeonEncounter(data,g.state).encounter,'salt_eater_feeding');g.startBattle('salt_eater_feeding',{win:[],escape:[],lose:[]});const saved=g.save();for(let i=0;i<g.state.members.length;i++)assert.ok(g.dispatch({type:'battle',action:'skill',skill:'guard'}));assert.equal(g.state.gear.items[target],undefined);assert.equal(g.state.actors.ada.equipment.weapon,undefined);assert.equal(g.state.inventory.iron_sword,1);roundtrip(g);escape(g);g.returnTown();assert.equal(Object.keys(g.state.gear.items).length,1);assert.deepEqual(gearErrors(data,g.state),[]);roundtrip(g);
});
for(const text of ['{broken','',JSON.stringify({saveVersion:9}),null])test(`invalid save restarts: ${String(text).slice(0,25)}`,()=>{const r=restoreGame(data,text);assert.equal(r.restarted,true);assert.equal(r.engine.state.mode,'town');assert.equal(r.engine.state.vars.completed,undefined);assert.equal(r.engine.state.waiting.type,'text');assert.deepEqual(validateSave(JSON.parse(r.engine.save()),data),[]);});
test('all shipped old save fixtures restart while current text, choice, battle and equipment saves resume',async()=>{
 for(const file of (await fs.readdir(new URL('fixtures/',import.meta.url))).filter(f=>f.startsWith('save-'))){const result=restoreGame(data,await fs.readFile(new URL('fixtures/'+file,import.meta.url),'utf8'));assert.equal(result.restarted,true,file);}
 const g=newGame();g.give('mail',1);g.equip('ada','mail');g.startBattle('roaming_1',{win:[],escape:[],lose:[]});const r=restoreGame(data,g.save());assert.equal(r.restarted,false);assert.equal(r.engine.save(),g.save());
});
